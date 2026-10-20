<?php
/** The official WordPress MCP Adapter plugin, as Modula's Direct MCP connections depend on it. */
namespace Modula\V2\Mcp;

defined( 'ABSPATH' ) || exit;

final class Adapter {
	/** Fixed wordpress.org slug; installs never take a slug from input. */
	public const SLUG       = 'mcp-adapter';
	public const SERVER_ID  = 'mcp-adapter-default-server';
	public const MIN_WP     = '6.9';
	public const PLUGIN_URL = 'https://wordpress.org/plugins/mcp-adapter/';

	public const MISSING        = 'missing';
	public const INACTIVE       = 'inactive';
	public const ACTIVE         = 'active';
	public const UNSUPPORTED_WP = 'unsupported-wp';

	/** The Abilities API arrived in WordPress 6.9; the adapter cannot run without it. */
	public static function state(): string {
		if ( ! function_exists( 'wp_register_ability' ) ) {
			return self::UNSUPPORTED_WP;
		}
		if ( class_exists( '\WP\MCP\Core\McpAdapter' ) ) {
			return self::ACTIVE;
		}
		return self::plugin_file() ? self::INACTIVE : self::MISSING;
	}

	/** @return \WP\MCP\Core\McpServer|null */
	public static function default_server() {
		if ( ! class_exists( '\WP\MCP\Core\McpAdapter' ) ) {
			return null;
		}
		return \WP\MCP\Core\McpAdapter::instance()->get_server( self::SERVER_ID );
	}

	/** The default server's endpoint; before activation, the adapter's default route. */
	public static function endpoint(): string {
		$server = self::default_server();
		return rest_url( ltrim( $server ? self::server_route( $server ) : '/mcp/' . self::SERVER_ID, '/' ) );
	}

	/**
	 * REST route of an adapter server, such as /mcp/mcp-adapter-default-server.
	 *
	 * @param \WP\MCP\Core\McpServer $server Adapter server.
	 */
	public static function server_route( $server ): string {
		return self::route( $server->get_server_route_namespace(), $server->get_server_route() );
	}

	/** REST route of a server's namespace and route, as the adapter registers it. */
	public static function route( string $route_namespace, string $route ): string {
		return '/' . trim( $route_namespace, '/' ) . '/' . trim( $route, '/' );
	}

	/** The REST route being served; authentication and rest_api_init run before the request object reaches any filter. */
	public static function requested_route(): string {
		global $wp;
		return (string) ( $wp->query_vars['rest_route'] ?? '' );
	}

	/**
	 * The method of a single JSON-RPC message, or null for batches and malformed messages.
	 * The method is unchecked client input.
	 *
	 * @param mixed $message Decoded JSON-RPC body; a batch decodes to a list.
	 */
	public static function message_method( $message ): ?string {
		if ( ! $message instanceof \stdClass ) {
			return null;
		}
		$method = $message->method ?? null;
		return is_string( $method ) ? $method : null;
	}

	/**
	 * The tool a single JSON-RPC tools/call names, or null for other methods, batches and malformed
	 * messages. The name is unchecked client input.
	 *
	 * @param mixed $message Decoded JSON-RPC body; a batch decodes to a list.
	 */
	public static function called_tool( $message ): ?string {
		if ( 'tools/call' !== self::message_method( $message ) ) {
			return null;
		}
		$name = $message->params->name ?? null;
		return is_string( $name ) ? $name : null;
	}

	/** Whether a REST route is the default server's MCP endpoint. */
	public static function is_default_server_route( string $route ): bool {
		$server = self::default_server();
		return $server && untrailingslashit( $route ) === self::server_route( $server );
	}

	/** Installed plugin file, such as mcp-adapter/mcp-adapter.php, or null. */
	public static function plugin_file(): ?string {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		foreach ( array_keys( get_plugins() ) as $file ) {
			if ( self::SLUG === dirname( $file ) ) {
				return $file;
			}
		}
		return null;
	}

	/**
	 * Installs the adapter from wordpress.org when missing, then activates it.
	 *
	 * @return true|\WP_Error
	 */
	public static function install_and_activate() {
		if ( self::MISSING === self::state() ) {
			$installed = self::install();
			if ( is_wp_error( $installed ) ) {
				return $installed;
			}
		}
		return self::activate();
	}

	/** @return true|\WP_Error */
	public static function activate() {
		if ( self::ACTIVE === self::state() ) {
			return true;
		}
		$file = self::plugin_file();
		if ( ! $file ) {
			return new \WP_Error( 'modula_mcp_adapter_missing', __( 'The MCP Adapter plugin is not installed.', 'modula-best-grid-gallery' ), array( 'status' => 404 ) );
		}
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		$result = activate_plugin( $file );
		if ( is_wp_error( $result ) ) {
			return new \WP_Error( 'modula_mcp_adapter_activation_failed', $result->get_error_message(), array( 'status' => 500 ) );
		}
		return true;
	}

	/** @return true|\WP_Error */
	private static function install() {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/misc.php';
		require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
		// The adapter has no latest-stable archive on wordpress.org; ask for its download link, as core does.
		$info = plugins_api(
			'plugin_information',
			array(
				'slug'   => self::SLUG,
				'fields' => array( 'sections' => false ),
			)
		);
		if ( is_wp_error( $info ) ) {
			return new \WP_Error( 'modula_mcp_adapter_install_failed', $info->get_error_message(), array( 'status' => 502 ) );
		}
		if ( empty( $info->download_link ) || ! is_string( $info->download_link ) ) {
			return new \WP_Error( 'modula_mcp_adapter_install_failed', __( 'wordpress.org did not return a download for the MCP Adapter.', 'modula-best-grid-gallery' ), array( 'status' => 502 ) );
		}
		$skin     = new \WP_Ajax_Upgrader_Skin();
		$upgrader = new \Plugin_Upgrader( $skin );
		$result   = $upgrader->install( $info->download_link );
		wp_clean_plugins_cache();
		if ( true === $result && self::plugin_file() ) {
			return true;
		}
		// The skin collects filesystem and download errors that a false result hides.
		$error  = is_wp_error( $result ) ? $result : $skin->get_errors();
		$reason = is_wp_error( $error ) && $error->has_errors() ? $error->get_error_message() : __( 'The MCP Adapter could not be installed.', 'modula-best-grid-gallery' );
		return new \WP_Error( 'modula_mcp_adapter_install_failed', $reason, array( 'status' => 500 ) );
	}
}
