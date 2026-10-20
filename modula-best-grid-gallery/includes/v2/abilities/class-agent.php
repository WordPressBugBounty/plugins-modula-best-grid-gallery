<?php
/** The Modula agent: one dedicated user per site that MCP connections authenticate as. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Agent {
	public const ROLE   = 'modula_agent';
	public const LOGIN  = 'modula-agent';
	public const OPTION = 'modula_agent_user_id';

	/**
	 * The role holds only `read`, which the adapter's transport permission requires.
	 * Everything else is granted per Modula tool call by Agent_Access.
	 */
	private const ROLE_CAPS = array( 'read' => true );

	/**
	 * Creates the Modula agent and its role, or reuses them.
	 *
	 * The one way to obtain the agent, for every flow that issues it a credential.
	 * It also restores the role's capabilities when someone has widened them.
	 *
	 * @return int|\WP_Error Agent user ID, or why the agent cannot exist on this site.
	 */
	public static function ensure() {
		if ( is_multisite() ) {
			return new \WP_Error( 'modula_agent_multisite', __( 'The Modula agent is not available on multisite.', 'modula-best-grid-gallery' ) );
		}
		self::ensure_role();
		$user_id = self::user_id();
		if ( $user_id ) {
			return $user_id;
		}
		$user_id = self::adopt_or_create();
		if ( is_wp_error( $user_id ) ) {
			return $user_id;
		}
		update_option( self::OPTION, $user_id, true );
		return $user_id;
	}

	/** The current agent's user ID, or 0 when no valid agent exists. */
	public static function user_id(): int {
		$user_id = (int) get_option( self::OPTION, 0 );
		return $user_id && self::has_role( get_userdata( $user_id ) ) ? $user_id : 0;
	}

	public static function is_agent( int $user_id ): bool {
		return $user_id > 0 && self::user_id() === $user_id;
	}

	/**
	 * Deletes the agent, with its Application Passwords, and its role, so no credential issued
	 * to it outlives Modula. Its posts and attachments go to the heir.
	 *
	 * Without an heir, deleting the agent would delete its content, so when it cannot be deleted
	 * it stays with its Application Passwords revoked, and a reinstall adopts it.
	 *
	 * @param int $heir User who receives the agent's content; 0 when there is none.
	 * @return bool False when the agent had to stay.
	 */
	public static function remove( int $heir ): bool {
		$agent = self::existing();
		if ( $agent && ! self::delete_to( $agent, $heir ) ) {
			\WP_Application_Passwords::delete_all_application_passwords( $agent->ID );
			return false;
		}
		remove_role( self::ROLE );
		delete_option( self::OPTION );
		return true;
	}

	private static function ensure_role(): void {
		$role = get_role( self::ROLE );
		if ( ! $role ) {
			add_role( self::ROLE, __( 'Modula agent', 'modula-best-grid-gallery' ), self::ROLE_CAPS );
			return;
		}
		foreach ( array_keys( $role->capabilities ) as $capability ) {
			if ( ! isset( self::ROLE_CAPS[ $capability ] ) ) {
				$role->remove_cap( $capability );
			}
		}
		foreach ( self::ROLE_CAPS as $capability => $granted ) {
			$role->add_cap( $capability, $granted );
		}
	}

	/**
	 * The agent, from its option or, when the option was lost, by login; null when there is none.
	 * A user who has since gained another role is someone's account and is never treated as the agent.
	 */
	private static function existing(): ?\WP_User {
		$by_option = get_userdata( self::user_id() );
		if ( self::is_sole_agent( $by_option ) ) {
			return $by_option;
		}
		$by_login = get_user_by( 'login', self::LOGIN );
		return self::is_sole_agent( $by_login ) ? $by_login : null;
	}

	/**
	 * Deletes the agent, handing its posts and attachments to the heir.
	 *
	 * @param \WP_User $agent The agent.
	 * @param int      $heir  User who receives the agent's content; 0 when there is none.
	 */
	private static function delete_to( \WP_User $agent, int $heir ): bool {
		if ( $heir <= 0 || $heir === $agent->ID ) {
			return false;
		}
		require_once ABSPATH . 'wp-admin/includes/user.php';
		return wp_delete_user( $agent->ID, $heir );
	}

	/** @return int|\WP_Error */
	private static function adopt_or_create() {
		$existing = get_user_by( 'login', self::LOGIN );
		// A lost option leaves the agent in place; never take over another account.
		if ( $existing && ! self::is_sole_agent( $existing ) ) {
			return new \WP_Error( 'modula_agent_login_taken', __( 'A user named modula-agent already exists and is not the Modula agent.', 'modula-best-grid-gallery' ) );
		}
		if ( $existing ) {
			return (int) $existing->ID;
		}
		$user_id = wp_insert_user(
			array(
				'user_login'   => self::LOGIN,
				'user_pass'    => wp_generate_password( 64, true, true ),
				'display_name' => __( 'Modula agent', 'modula-best-grid-gallery' ),
				'role'         => self::ROLE,
			)
		);
		if ( is_wp_error( $user_id ) ) {
			return new \WP_Error( 'modula_agent_create_failed', $user_id->get_error_message(), array( 'cause' => $user_id->get_error_code() ) );
		}
		return (int) $user_id;
	}

	/** @param \WP_User|false $user */
	private static function has_role( $user ): bool {
		return $user instanceof \WP_User && in_array( self::ROLE, (array) $user->roles, true );
	}

	/**
	 * Whether a user holds the agent role and nothing else, as only the agent Modula created does.
	 *
	 * @param \WP_User|false $user
	 */
	private static function is_sole_agent( $user ): bool {
		return self::has_role( $user ) && 1 === count( $user->roles );
	}
}
