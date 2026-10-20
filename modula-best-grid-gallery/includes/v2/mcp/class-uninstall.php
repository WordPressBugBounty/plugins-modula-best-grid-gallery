<?php
/**
 * Removes every MCP credential when Modula is uninstalled: the Modula agent with its
 * Application Passwords and role, every OAuth client, grant and token, the activity log and
 * the Allow AI clients to connect setting.
 *
 * Runs from uninstall.php when the plugin is deleted, and from Modula's own Uninstall
 * form, which cleans up and then only deactivates. Deactivation alone keeps everything.
 */
namespace Modula\V2\Mcp;

use Modula\V2\Abilities\Agent;

defined( 'ABSPATH' ) || exit;

final class Uninstall {
	public static function boot(): void {
		add_action( 'modula_uninstall', array( self::class, 'from_uninstall_form' ) );
	}

	/**
	 * The Uninstall form's AJAX handler checks only its nonce, and this deletes a user.
	 */
	public static function from_uninstall_form(): void {
		if ( ! current_user_can( 'delete_users' ) ) {
			return;
		}
		self::run();
	}

	/**
	 * Deletes the OAuth data first, so no token stays valid while the agent is removed.
	 * Cleans the current site only: on multisite the agent is never created, so no token
	 * issued on another site can act as anyone.
	 *
	 * @return bool False when the agent had to stay, with its Application Passwords revoked.
	 */
	public static function run(): bool {
		Oauth_Grants::delete_all();
		Oauth_Clients::delete_all();
		Activity::delete_all();
		Connection_Switch::delete();
		return Agent::remove( self::heir() );
	}

	/**
	 * Who receives the agent's content: the administrator uninstalling, when known, or else
	 * the first user who can manage options; 0 when the site has none.
	 */
	private static function heir(): int {
		$current = get_current_user_id();
		if ( self::can_inherit( $current ) ) {
			return $current;
		}
		// `capability` needs WordPress 5.9; older versions ignore it, so the result is checked.
		$first = get_users(
			array(
				'capability' => 'manage_options',
				'orderby'    => 'ID',
				'order'      => 'ASC',
				'number'     => 1,
				'fields'     => 'ID',
			)
		);
		$first = $first ? (int) $first[0] : 0;
		return self::can_inherit( $first ) ? $first : 0;
	}

	/** @param int $user_id Candidate heir; 0 for none. */
	private static function can_inherit( int $user_id ): bool {
		return $user_id > 0 && ! Agent::is_agent( $user_id ) && user_can( $user_id, 'manage_options' );
	}
}
