<?php
/**
 * OAuth access tokens on the MCP endpoint (ADR 0044).
 *
 * On the adapter's default MCP route only, a valid Bearer token authenticates the request
 * as the Modula agent, so Agent_Access contains it like any agent credential, and limits it
 * to reads when its grant is read-only. On every other route a Bearer token authenticates
 * nothing. A 401 from the MCP route carries the challenge that leads clients to the
 * protected-resource metadata.
 */
namespace Modula\V2\Mcp;

use Modula\V2\Abilities\Agent_Access;

defined( 'ABSPATH' ) || exit;

final class Bearer_Auth {
	private const INVALID_TOKEN = 'modula_mcp_invalid_token';

	public static function boot(): void {
		// After Application Passwords (90) and before the cookie nonce check (100).
		add_filter( 'rest_authentication_errors', array( self::class, 'authenticate' ), 95 );
		add_filter( 'rest_post_dispatch', array( self::class, 'challenge' ), 10, 3 );
		add_filter( 'rest_exposed_cors_headers', array( self::class, 'expose_challenge' ) );
	}

	/**
	 * Browser-based clients can read the challenge only when CORS exposes it.
	 *
	 * @param string[] $headers Response headers exposed to CORS requests.
	 * @return string[]
	 */
	public static function expose_challenge( $headers ) {
		$headers[] = 'WWW-Authenticate';
		return $headers;
	}

	/**
	 * @param \WP_Error|true|null $result Authentication decided so far; null when undecided.
	 * @return \WP_Error|true|null
	 */
	public static function authenticate( $result ) {
		if ( null !== $result ) {
			return $result;
		}
		$token = self::bearer_token();
		if ( null === $token || ! self::is_oauth_route( Adapter::requested_route() ) ) {
			return $result;
		}
		// While connections are off: a 403 with the reason, not a 401, so the client keeps its tokens.
		$off = Connection_Switch::unmet();
		if ( $off ) {
			return $off;
		}
		$grant = Oauth_Grants::authenticate( $token );
		if ( is_wp_error( $grant ) ) {
			return new \WP_Error( self::INVALID_TOKEN, $grant->get_error_message(), array( 'status' => 401 ) );
		}
		if ( Connections::ACCESS_READ_ONLY === $grant['access'] ) {
			Agent_Access::restrict_to_reads();
		}
		Activity::attribute_to( Connections::describe_grant( $grant['client'] ) );
		wp_set_current_user( $grant['user'] );
		return true;
	}

	/**
	 * Adds the RFC 9728 challenge to a 401 from the MCP route.
	 *
	 * @param \WP_HTTP_Response $response Response to send.
	 * @param \WP_REST_Server   $server   Server answering.
	 * @param \WP_REST_Request  $request  Request answered.
	 * @return \WP_HTTP_Response
	 */
	public static function challenge( $response, $server, $request ) {
		if ( 401 !== $response->get_status() || ! self::is_oauth_route( $request->get_route() ) ) {
			return $response;
		}
		$data  = $response->get_data();
		$error = self::INVALID_TOKEN === ( $data['code'] ?? null ) ? 'error="invalid_token", ' : '';
		$response->header( 'WWW-Authenticate', sprintf( 'Bearer %sresource_metadata="%s"', $error, Oauth::protected_resource_metadata_url() ) );
		return $response;
	}

	/** The MCP route, on a site that supports OAuth: the only place a Bearer token counts, even while connections are off. */
	private static function is_oauth_route( string $route ): bool {
		return Adapter::is_default_server_route( $route ) && null === Oauth::unmet();
	}

	/** The Bearer credential, or null when the request carries none in a usable form. */
	private static function bearer_token(): ?string {
		$header = '';
		foreach ( array( 'HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION' ) as $key ) {
			if ( isset( $_SERVER[ $key ] ) ) {
				$header = sanitize_text_field( wp_unslash( $_SERVER[ $key ] ) );
				break;
			}
		}
		return preg_match( '/^Bearer\s+([A-Za-z0-9._~-]+)$/i', $header, $matches ) ? $matches[1] : null;
	}
}
