<?php
/**
 * The site as the OAuth 2.1 authorization server of its MCP endpoint (ADR 0044).
 * Owns availability, the endpoint URLs and the discovery documents under /.well-known/.
 */
namespace Modula\V2\Mcp;

use Modula\V2\Rest\Oauth_Controller;

defined( 'ABSPATH' ) || exit;

final class Oauth {
	private const PROTECTED_RESOURCE   = '/.well-known/oauth-protected-resource';
	private const AUTHORIZATION_SERVER = '/.well-known/oauth-authorization-server';

	public static function boot(): void {
		add_filter( 'do_parse_request', array( self::class, 'serve_discovery' ), 1 );
		// WordPress schedules this daily cleanup itself, so expired OAuth rows need no cron of their own.
		add_action( 'delete_expired_transients', array( Oauth_Grants::class, 'prune' ) );
		add_action( 'delete_expired_transients', array( Oauth_Clients::class, 'prune' ) );
		Bearer_Auth::boot();
		Consent_Screen::boot();
	}

	/**
	 * What OAuth still lacks on this site; null when clients can sign in.
	 * Like Application Passwords, it needs HTTPS outside a local environment.
	 */
	public static function unmet(): ?\WP_Error {
		$server = Connections::server_unmet();
		if ( $server ) {
			return $server;
		}
		if ( ! is_ssl() && 'local' !== wp_get_environment_type() ) {
			return new \WP_Error( 'modula_mcp_oauth_https_required', __( 'Signing in an AI client needs HTTPS on this site.', 'modula-best-grid-gallery' ), array( 'status' => 409 ) );
		}
		return null;
	}

	/**
	 * Why clients cannot sign in now: what the site lacks first, then the Allow AI clients
	 * to connect switch; null when they can. The endpoints and the consent screen follow it.
	 */
	public static function unavailable(): ?\WP_Error {
		return self::unmet() ?? Connection_Switch::unmet();
	}

	/** The site itself is the authorization server. */
	public static function issuer(): string {
		return untrailingslashit( home_url() );
	}

	/** The protected resource: the adapter's default MCP endpoint. */
	public static function resource(): string {
		return Adapter::endpoint();
	}

	/** Whether a client's `resource` parameter (RFC 8707) names this MCP endpoint. */
	public static function is_resource( string $resource ): bool {
		return untrailingslashit( $resource ) === untrailingslashit( self::resource() );
	}

	/** Where clients find the protected-resource metadata, as the 401 challenge points to it. */
	public static function protected_resource_metadata_url(): string {
		return self::origin( self::resource() ) . self::PROTECTED_RESOURCE . self::path( self::resource() );
	}

	/** @return array<string,mixed> RFC 9728 protected-resource metadata. */
	public static function protected_resource_metadata(): array {
		return array(
			'resource'                 => self::resource(),
			'authorization_servers'    => array( self::issuer() ),
			'bearer_methods_supported' => array( 'header' ),
			'resource_name'            => sprintf(
				/* translators: %s: site title */
				__( 'Modula on %s', 'modula-best-grid-gallery' ),
				wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES )
			),
		);
	}

	/** @return array<string,mixed> RFC 8414 authorization-server metadata. */
	public static function authorization_server_metadata(): array {
		return array(
			'issuer'                                     => self::issuer(),
			'authorization_endpoint'                     => Consent_Screen::url(),
			'token_endpoint'                             => Oauth_Controller::url( Oauth_Controller::TOKEN ),
			'registration_endpoint'                      => Oauth_Controller::url( Oauth_Controller::REGISTER ),
			'revocation_endpoint'                        => Oauth_Controller::url( Oauth_Controller::REVOKE ),
			'response_types_supported'                   => array( 'code' ),
			'grant_types_supported'                      => Oauth_Grants::GRANT_TYPES,
			'code_challenge_methods_supported'           => array( 'S256' ),
			'token_endpoint_auth_methods_supported'      => array( 'none' ),
			'revocation_endpoint_auth_methods_supported' => array( 'none' ),
			'client_id_metadata_document_supported'      => true,
		);
	}

	/**
	 * Answers the discovery paths before WordPress routes the request, so no rewrite rules are needed.
	 *
	 * @param bool $parse Whether WordPress should parse the request.
	 * @return bool
	 */
	public static function serve_discovery( $parse ) {
		$path = self::request_path();
		if ( false === strpos( $path, '/.well-known/' ) ) {
			return $parse;
		}
		$document = self::discovery_documents()[ $path ] ?? null;
		if ( null === $document || self::unavailable() ) {
			return $parse;
		}
		header( 'Access-Control-Allow-Origin: *' );
		wp_send_json( call_user_func( $document ) );
	}

	/**
	 * Request path => document. RFC 8414 and RFC 9728 insert the issuer or resource path
	 * after the well-known segment; some clients append it or probe the bare root instead.
	 *
	 * @return array<string,callable>
	 */
	private static function discovery_documents(): array {
		$server   = array( self::class, 'authorization_server_metadata' );
		$resource = array( self::class, 'protected_resource_metadata' );
		$issuer   = self::path( self::issuer() );
		return array(
			self::PROTECTED_RESOURCE . self::path( self::resource() ) => $resource,
			self::PROTECTED_RESOURCE             => $resource,
			self::AUTHORIZATION_SERVER . $issuer => $server,
			$issuer . self::AUTHORIZATION_SERVER => $server,
		);
	}

	private static function request_path(): string {
		$uri = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
		return self::path( $uri );
	}

	private static function path( string $url ): string {
		return untrailingslashit( (string) wp_parse_url( $url, PHP_URL_PATH ) );
	}

	/** Scheme, host and port of an absolute URL, such as rest_url() returns; empty for anything else. */
	private static function origin( string $url ): string {
		$parts = wp_parse_url( $url );
		if ( ! isset( $parts['scheme'], $parts['host'] ) ) {
			return '';
		}
		$port = isset( $parts['port'] ) ? ':' . $parts['port'] : '';
		return $parts['scheme'] . '://' . $parts['host'] . $port;
	}
}
