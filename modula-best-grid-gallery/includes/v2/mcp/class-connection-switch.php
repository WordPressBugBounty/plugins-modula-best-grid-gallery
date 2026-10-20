<?php
/**
 * Allow AI clients to connect: one site-wide switch over every Direct MCP connection.
 *
 * Off, the Modula agent is refused (Agent_Access), an OAuth token on the MCP route gets a
 * 403 with the reason (Bearer_Auth), and OAuth is unavailable (Oauth::unavailable), so its
 * endpoints answer 404. A 403 rather than a 401, so clients keep their tokens instead of
 * signing in again. Grants, passwords and the agent are kept, so turning it back on restores
 * every connection. Administrators using the MCP Adapter directly are not affected. On by
 * default: off, a first OAuth connection could not even discover the server.
 */
namespace Modula\V2\Mcp;

defined( 'ABSPATH' ) || exit;

final class Connection_Switch {
	/** '1' or '0'; missing means on. */
	public const OPTION = 'modula_mcp_connections_enabled';

	/** The error code of everything the switch refuses. */
	public const OFF = 'modula_mcp_connections_off';

	public static function is_on(): bool {
		return '0' !== get_option( self::OPTION, '1' );
	}

	/**
	 * Turns connections on or off and logs who did it.
	 *
	 * @param bool $on Whether AI clients may connect.
	 * @return true|\WP_Error
	 */
	public static function set( bool $on ) {
		if ( self::is_on() === $on ) {
			return true;
		}
		// Autoloaded: every REST request by the agent and every OAuth request reads it.
		if ( ! update_option( self::OPTION, $on ? '1' : '0', true ) ) {
			return new \WP_Error( 'modula_mcp_switch_failed', __( 'The setting could not be saved. Try again.', 'modula-best-grid-gallery' ), array( 'status' => 500 ) );
		}
		Activity::record(
			$on ? Activity::TURNED_ON : Activity::TURNED_OFF,
			array(
				'label' => wp_get_current_user()->display_name,
				'kind'  => Activity::ADMINISTRATOR,
			)
		);
		return true;
	}

	/** Why connections are refused now; null while the switch is on. */
	public static function unmet(): ?\WP_Error {
		if ( self::is_on() ) {
			return null;
		}
		return new \WP_Error( self::OFF, __( 'AI connections are turned off on this site. An administrator can turn them back on under Modula → Settings → AI.', 'modula-best-grid-gallery' ), array( 'status' => 403 ) );
	}

	/** Removes the setting, on uninstall. */
	public static function delete(): void {
		delete_option( self::OPTION );
	}
}
