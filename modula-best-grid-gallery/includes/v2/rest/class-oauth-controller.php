<?php
/**
 * Public OAuth endpoints of the site's authorization server (ADR 0044): client registration
 * (RFC 7591), the token endpoint and revocation (RFC 7009). They answer in OAuth's error
 * shape, not WordPress's.
 */
namespace Modula\V2\Rest;

use Modula\V2\Mcp\Oauth;
use Modula\V2\Mcp\Oauth_Clients;
use Modula\V2\Mcp\Oauth_Grants;
use Modula\V2\Mcp\Rate_Limit;

defined( 'ABSPATH' ) || exit;

final class Oauth_Controller {
	const NAMESPACE = Settings_Controller::NAMESPACE;
	const REGISTER  = '/oauth/register';
	const TOKEN     = '/oauth/token';
	const REVOKE    = '/oauth/revoke';

	/** Token and revocation requests per IP per minute; clients refresh about once an hour. */
	private const TOKEN_REQUESTS_PER_MINUTE = 30;

	public static function init(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function url( string $route ): string {
		return rest_url( self::NAMESPACE . $route );
	}

	/** Without OAuth on this site, or with connections turned off, the endpoints do not exist. */
	public static function register_routes(): void {
		if ( Oauth::unavailable() ) {
			return;
		}
		// All three endpoints are public by design: clients call them without a WordPress login.
		$routes = array(
			self::REGISTER => 'register_client',
			self::TOKEN    => 'token',
			self::REVOKE   => 'revoke',
		);
		foreach ( $routes as $route => $callback ) {
			register_rest_route(
				self::NAMESPACE,
				$route,
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, $callback ),
					'permission_callback' => '__return_true',
				)
			);
		}
	}

	/** @param \WP_REST_Request $request JSON client metadata. */
	public static function register_client( $request ): \WP_REST_Response {
		$registered = Oauth_Clients::register( $request->get_json_params(), Rate_Limit::client_ip() );
		return self::respond( $registered, 201 );
	}

	/** @param \WP_REST_Request $request Form-encoded token request. */
	public static function token( $request ): \WP_REST_Response {
		if ( ! self::admit_token_request() ) {
			return self::respond( self::rate_limited() );
		}
		$fields = self::string_params( $request->get_body_params(), array( 'grant_type', 'client_id', 'code', 'redirect_uri', 'code_verifier', 'refresh_token', 'resource' ) );
		if ( null === $fields || '' === $fields['client_id'] ) {
			return self::respond( self::invalid_request( __( 'client_id is required.', 'modula-best-grid-gallery' ) ) );
		}
		if ( ! Oauth_Clients::can_request_tokens( $fields['client_id'] ) ) {
			return self::respond( new \WP_Error( 'invalid_client', __( 'Unknown client.', 'modula-best-grid-gallery' ), array( 'status' => 401 ) ) );
		}
		if ( '' !== $fields['resource'] && ! Oauth::is_resource( $fields['resource'] ) ) {
			return self::respond( new \WP_Error( 'invalid_target', __( 'The resource is not this site’s MCP endpoint.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) ) );
		}
		switch ( $fields['grant_type'] ) {
			case 'authorization_code':
				return self::respond( self::exchange_code( $fields ) );
			case 'refresh_token':
				return self::respond( self::refresh( $fields ) );
			default:
				/* translators: %s: comma-separated OAuth grant types */
				return self::respond( new \WP_Error( 'unsupported_grant_type', sprintf( __( 'Supported grant types: %s.', 'modula-best-grid-gallery' ), implode( ', ', Oauth_Grants::GRANT_TYPES ) ), array( 'status' => 400 ) ) );
		}
	}

	/**
	 * RFC 7009: answers 200 whether or not the token was known, so it reveals nothing.
	 *
	 * @param \WP_REST_Request $request Form-encoded revocation request.
	 */
	public static function revoke( $request ): \WP_REST_Response {
		if ( ! self::admit_token_request() ) {
			return self::respond( self::rate_limited() );
		}
		$fields = self::string_params( $request->get_body_params(), array( 'token', 'client_id' ) );
		if ( null === $fields || '' === $fields['token'] ) {
			return self::respond( self::invalid_request( __( 'token is required.', 'modula-best-grid-gallery' ) ) );
		}
		if ( ! Oauth_Grants::revoke_token( $fields['client_id'], $fields['token'] ) ) {
			return self::respond( new \WP_Error( 'temporarily_unavailable', __( 'The connection could not be revoked. Try again.', 'modula-best-grid-gallery' ), array( 'status' => 503 ) ) );
		}
		return self::respond( array() );
	}

	/**
	 * @param array<string,string> $fields Token request parameters.
	 * @return array<string,mixed>|\WP_Error
	 */
	private static function exchange_code( array $fields ) {
		if ( '' === $fields['code'] || '' === $fields['code_verifier'] ) {
			return self::invalid_request( __( 'code and code_verifier are required.', 'modula-best-grid-gallery' ) );
		}
		return Oauth_Grants::exchange_code( $fields['client_id'], $fields['code'], $fields['redirect_uri'], $fields['code_verifier'] );
	}

	/**
	 * @param array<string,string> $fields Token request parameters.
	 * @return array<string,mixed>|\WP_Error
	 */
	private static function refresh( array $fields ) {
		if ( '' === $fields['refresh_token'] ) {
			return self::invalid_request( __( 'refresh_token is required.', 'modula-best-grid-gallery' ) );
		}
		return Oauth_Grants::refresh( $fields['client_id'], $fields['refresh_token'] );
	}

	/** Token and revocation requests share one bucket per IP. */
	private static function admit_token_request(): bool {
		return Rate_Limit::admit( 'token|' . Rate_Limit::client_ip(), self::TOKEN_REQUESTS_PER_MINUTE, MINUTE_IN_SECONDS );
	}

	/** Not an RFC 6749 error code; clients act on the 429 status. */
	private static function rate_limited(): \WP_Error {
		return new \WP_Error( 'too_many_requests', __( 'Too many requests. Try again in a minute.', 'modula-best-grid-gallery' ), array( 'status' => 429 ) );
	}

	/** @param string $message What is missing or malformed. */
	private static function invalid_request( string $message ): \WP_Error {
		return new \WP_Error( 'invalid_request', $message, array( 'status' => 400 ) );
	}

	/**
	 * Named body parameters as strings, missing ones empty; null when one is not a string.
	 *
	 * @param array<string,mixed> $params Body parameters.
	 * @param string[]            $names  Parameters to read.
	 * @return array<string,string>|null
	 */
	private static function string_params( array $params, array $names ): ?array {
		$fields = array();
		foreach ( $names as $name ) {
			$value = $params[ $name ] ?? '';
			if ( ! is_string( $value ) ) {
				return null;
			}
			$fields[ $name ] = $value;
		}
		return $fields;
	}

	/**
	 * Projects a result into an OAuth response; tokens and registrations are never cached.
	 *
	 * @param array<string,mixed>|\WP_Error $result Response body, or an error whose code is an OAuth error code.
	 * @param int                           $status Status of a successful result.
	 */
	private static function respond( $result, int $status = 200 ): \WP_REST_Response {
		if ( is_wp_error( $result ) ) {
			$status = (int) ( $result->get_error_data()['status'] ?? 400 );
			$result = array(
				'error'             => $result->get_error_code(),
				'error_description' => $result->get_error_message(),
			);
		}
		$response = new \WP_REST_Response( $result, $status );
		$response->header( 'Cache-Control', 'no-store' );
		$response->header( 'Pragma', 'no-cache' );
		return $response;
	}
}
