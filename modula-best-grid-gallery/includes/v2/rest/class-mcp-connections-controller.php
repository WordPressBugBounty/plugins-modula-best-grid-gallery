<?php
/** Admin routes behind the MCP Connections panel on the AI settings tab. */
namespace Modula\V2\Rest;

use Modula\V2\Mcp\Activity;
use Modula\V2\Mcp\Adapter;
use Modula\V2\Mcp\Clients;
use Modula\V2\Mcp\Connection_Switch;
use Modula\V2\Mcp\Connections;
use Modula\V2\Mcp\Requirements;

defined( 'ABSPATH' ) || exit;

final class Mcp_Connections_Controller {
	const NAMESPACE = Settings_Controller::NAMESPACE;
	const BASE      = '/mcp-connections';

	/** OAuth grant ids are hex; Application Password ids are UUIDs. Connections decides which exist. */
	const ID_PATTERN = '[a-f0-9-]{16,36}';

	public static function init(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			self::BASE . '/status',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'status' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			self::BASE . '/adapter/install',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'install_adapter' ),
				'permission_callback' => array( __CLASS__, 'can_install' ),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			self::BASE . '/adapter/activate',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'activate_adapter' ),
				'permission_callback' => array( __CLASS__, 'can_activate' ),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			self::BASE . '/connections',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'list_connections' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
				),
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'create_connection' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'args'                => array(
						'client' => array(
							'required' => true,
							'type'     => 'string',
							'enum'     => Clients::fallback_ids(),
						),
					),
				),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			self::BASE . '/connections/(?P<id>' . self::ID_PATTERN . ')',
			array(
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => array( __CLASS__, 'disconnect' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			self::BASE . '/connections/(?P<id>' . self::ID_PATTERN . ')/regenerate',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'regenerate' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			self::BASE . '/switch',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'set_switch' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => array(
					'enabled' => array(
						'required' => true,
						'type'     => 'boolean',
					),
				),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			self::BASE . '/activity',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'activity' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
				),
				array(
					'methods'             => \WP_REST_Server::DELETABLE,
					'callback'            => array( __CLASS__, 'clear_activity' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
				),
			)
		);
	}

	/**
	 * Turns Allow AI clients to connect on or off.
	 *
	 * @param \WP_REST_Request $request Request with `enabled`.
	 * @return \WP_REST_Response|\WP_Error Fresh status, since OAuth availability follows the switch.
	 */
	public static function set_switch( $request ) {
		$set = Connection_Switch::set( (bool) $request->get_param( 'enabled' ) );
		return is_wp_error( $set ) ? $set : self::status();
	}

	/** Recent tool calls and connection events, newest first; never arguments or secrets. */
	public static function activity(): \WP_REST_Response {
		return rest_ensure_response( Activity::rows() );
	}

	/**
	 * Empties the activity log.
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function clear_activity() {
		if ( ! Activity::delete_all() ) {
			return new \WP_Error( 'modula_mcp_activity_clear_failed', __( 'The activity could not be cleared. Try again.', 'modula-best-grid-gallery' ), array( 'status' => 500 ) );
		}
		return rest_ensure_response( array() );
	}

	/** Every connection, of every kind; never a secret. */
	public static function list_connections(): \WP_REST_Response {
		return rest_ensure_response( Connections::all() );
	}

	/**
	 * @param \WP_REST_Request $request Request with the connection id.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function disconnect( $request ) {
		$id           = (string) $request->get_param( 'id' );
		$disconnected = Connections::disconnect( $id );
		if ( is_wp_error( $disconnected ) ) {
			return $disconnected;
		}
		return rest_ensure_response(
			array(
				'disconnected' => true,
				'id'           => $id,
			)
		);
	}

	/**
	 * Replaces a Password connection's password; the response is the only time the new one is shown.
	 *
	 * @param \WP_REST_Request $request Request with the connection id.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function regenerate( $request ) {
		return self::one_time( Connections::regenerate( (string) $request->get_param( 'id' ) ) );
	}

	/**
	 * Creates a connection; the response is the only time its password is shown.
	 *
	 * @param \WP_REST_Request $request Request with the client id.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function create_connection( $request ) {
		return self::one_time( Connections::create( (string) $request->get_param( 'client' ) ) );
	}

	/**
	 * Administrators only, from the admin screen: a REST nonce is required even when
	 * another authentication method, such as an Application Password, identified the user.
	 *
	 * @param \WP_REST_Request $request Request being authorized.
	 * @return true|\WP_Error
	 */
	public static function can_manage( $request ) {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new \WP_Error( 'rest_forbidden', __( 'Sorry, you are not allowed to manage MCP connections.', 'modula-best-grid-gallery' ), array( 'status' => rest_authorization_required_code() ) );
		}
		if ( ! wp_verify_nonce( (string) $request->get_header( 'X-WP-Nonce' ), 'wp_rest' ) ) {
			return new \WP_Error( 'rest_cookie_invalid_nonce', __( 'Cookie check failed.', 'modula-best-grid-gallery' ), array( 'status' => 403 ) );
		}
		return true;
	}

	/**
	 * @param \WP_REST_Request $request Request being authorized.
	 * @return true|\WP_Error
	 */
	public static function can_install( $request ) {
		// Installing also activates, so both capabilities apply.
		return self::can_change_plugins( $request, array( 'install_plugins', 'activate_plugins' ) );
	}

	/**
	 * @param \WP_REST_Request $request Request being authorized.
	 * @return true|\WP_Error
	 */
	public static function can_activate( $request ) {
		return self::can_change_plugins( $request, array( 'activate_plugins' ) );
	}

	public static function status(): \WP_REST_Response {
		return rest_ensure_response( Requirements::status() );
	}

	/** @return \WP_REST_Response|\WP_Error Fresh status, so the panel updates without a reload. */
	public static function install_adapter() {
		$unsupported = self::unsupported();
		if ( $unsupported ) {
			return $unsupported;
		}
		$result = Adapter::install_and_activate();
		return is_wp_error( $result ) ? $result : self::status();
	}

	/** @return \WP_REST_Response|\WP_Error Fresh status, so the panel updates without a reload. */
	public static function activate_adapter() {
		$unsupported = self::unsupported();
		if ( $unsupported ) {
			return $unsupported;
		}
		$result = Adapter::activate();
		return is_wp_error( $result ) ? $result : self::status();
	}

	/**
	 * A response carrying a password, which no cache may keep.
	 *
	 * @param array<string,mixed>|\WP_Error $payload One-time connection payload.
	 * @return \WP_REST_Response|\WP_Error
	 */
	private static function one_time( $payload ) {
		if ( is_wp_error( $payload ) ) {
			return $payload;
		}
		$response = new \WP_REST_Response( $payload, 201 );
		$response->header( 'Cache-Control', 'no-store' );
		return $response;
	}

	/** Not available on multisite yet; the adapter cannot run before WordPress 6.9. */
	private static function unsupported(): ?\WP_Error {
		if ( ! is_multisite() && Adapter::UNSUPPORTED_WP !== Adapter::state() ) {
			return null;
		}
		return new \WP_Error( 'modula_mcp_unsupported', __( 'MCP connections are not supported on this site.', 'modula-best-grid-gallery' ), array( 'status' => 409 ) );
	}

	/**
	 * @param \WP_REST_Request $request      Request being authorized.
	 * @param string[]         $capabilities Plugin capabilities the action needs, all of them.
	 * @return true|\WP_Error
	 */
	private static function can_change_plugins( $request, array $capabilities ) {
		$allowed = self::can_manage( $request );
		if ( true !== $allowed ) {
			return $allowed;
		}
		foreach ( $capabilities as $capability ) {
			if ( ! current_user_can( $capability ) ) {
				return new \WP_Error( 'rest_forbidden', __( 'Sorry, you are not allowed to manage plugins.', 'modula-best-grid-gallery' ), array( 'status' => 403 ) );
			}
		}
		return true;
	}
}
