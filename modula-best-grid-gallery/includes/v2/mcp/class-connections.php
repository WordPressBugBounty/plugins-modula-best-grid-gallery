<?php
/**
 * The site's AI connections, every one acting as the Modula agent:
 * - OAuth connections: one grant each, owned by Oauth_Grants.
 * - Password connections: one Application Password on the Modula agent each. Modula keeps
 *   only the client and kind, keyed by the password UUID; never the password.
 *
 * A connection row has the same shape for every kind, so the list and Disconnect stay
 * generic; Regenerate applies to Password connections only.
 */
namespace Modula\V2\Mcp;

use Modula\V2\Abilities\Agent;

defined( 'ABSPATH' ) || exit;

final class Connections {
	/** Agent user meta: password UUID => array{kind:string,client:string}. */
	public const META = 'modula_mcp_connections';

	/** Connection kinds, as the connections list reports them. */
	public const OAUTH    = 'oauth';
	public const PASSWORD = 'password';

	/** What an OAuth connection may do, chosen on the consent screen and kept on its grant. */
	public const ACCESS_READ_WRITE = 'read-write';
	public const ACCESS_READ_ONLY  = 'read-only';
	public const ACCESS_LEVELS     = array( self::ACCESS_READ_WRITE, self::ACCESS_READ_ONLY );

	/** The kind ticket 05 recorded for Password connections; read as PASSWORD. */
	private const LEGACY_DIRECT = 'direct';

	public static function boot(): void {
		// Also fires when the password is revoked from the agent's profile, so metadata never outlives its password.
		add_action( 'wp_delete_application_password', array( __CLASS__, 'forget' ), 10, 2 );
	}

	/**
	 * Creates a Password connection and returns its one-time payload.
	 *
	 * @param string $client Client id from Clients.
	 * @return array{id:string,client:string,endpoint:string,username:string,password:string,config:array{format:string,content:string,app:string,locations:array<string,string>,note:string}}|\WP_Error
	 */
	public static function create( string $client ) {
		if ( ! Clients::exists( $client ) ) {
			return new \WP_Error( 'modula_mcp_unknown_client', __( 'Unknown MCP client.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) );
		}
		if ( ! Clients::has_fallback( $client ) ) {
			return new \WP_Error( 'modula_mcp_no_password_connection', __( 'This MCP client connects only by signing in; it has no password connection.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) );
		}
		$unmet = self::forbidden() ?? self::site_unmet();
		if ( $unmet ) {
			return $unmet;
		}
		$agent = Agent::ensure();
		if ( is_wp_error( $agent ) ) {
			return $agent;
		}
		$payload    = self::issue( $agent, $client );
		$connection = is_wp_error( $payload ) ? null : self::describe_password( $payload['id'] );
		if ( $connection ) {
			Activity::record( Activity::CONNECT, $connection );
		}
		return $payload;
	}

	/**
	 * Every connection of the site, newest first. Never a secret.
	 *
	 * - `client` is the canonical client id of a Password connection; empty for OAuth connections
	 *   and for passwords added to the agent outside Modula.
	 * - `approver` and `access` apply to OAuth connections; null otherwise.
	 *
	 * @return array<int,array{id:string,kind:string,client:string,label:string,approver:string|null,access:string|null,created:int,last_used:int|null,can_regenerate:bool}>
	 */
	public static function all(): array {
		$rows = array_merge( self::oauth_rows(), self::password_rows() );
		usort(
			$rows,
			static function ( $a, $b ) {
				return $b['created'] <=> $a['created'];
			}
		);
		return $rows;
	}

	/**
	 * Ends one connection at once; the others keep working. The Modula agent stays, even
	 * after the last connection, so content it authored keeps a valid author.
	 *
	 * @param string $id Connection id from the list.
	 * @return true|\WP_Error
	 */
	public static function disconnect( string $id ) {
		$forbidden = self::forbidden();
		if ( $forbidden ) {
			return $forbidden;
		}
		$connection = self::find( $id );
		if ( null === $connection ) {
			return self::unknown_connection();
		}
		if ( ! self::revoke( $connection ) ) {
			return new \WP_Error( 'modula_mcp_disconnect_failed', __( 'The connection could not be disconnected. Try again.', 'modula-best-grid-gallery' ), array( 'status' => 500 ) );
		}
		Activity::record( Activity::DISCONNECT, $connection );
		return true;
	}

	/**
	 * Replaces a Password connection's password and returns the new one-time payload.
	 * The old password stops working before the new one is issued.
	 *
	 * @param string $id Connection id from the list.
	 * @return array{id:string,client:string,endpoint:string,username:string,password:string,config:array{format:string,content:string,app:string,locations:array<string,string>,note:string}}|\WP_Error
	 */
	public static function regenerate( string $id ) {
		$forbidden = self::forbidden();
		if ( $forbidden ) {
			return $forbidden;
		}
		$connection = self::find( $id );
		if ( null === $connection ) {
			return self::unknown_connection();
		}
		if ( ! $connection['can_regenerate'] ) {
			return new \WP_Error( 'modula_mcp_not_regenerable', __( 'Only password connections created from this panel can be regenerated. An OAuth connection reconnects by signing in again from the client.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) );
		}
		$unmet = self::site_unmet();
		if ( $unmet ) {
			return $unmet;
		}
		$agent = Agent::user_id();
		if ( ! self::delete_password( $agent, $id ) ) {
			return new \WP_Error( 'modula_mcp_regenerate_failed', __( 'The old password could not be revoked, so nothing changed. Try again.', 'modula-best-grid-gallery' ), array( 'status' => 500 ) );
		}
		$payload = self::issue( $agent, $connection['client'] );
		if ( is_wp_error( $payload ) ) {
			return new \WP_Error(
				'modula_mcp_regenerate_failed',
				/* translators: %s: why the new password could not be created */
				sprintf( __( 'The old password is already revoked, but a new one could not be created: %s Create a new password connection for this client.', 'modula-best-grid-gallery' ), $payload->get_error_message() ),
				array(
					'status' => 500,
					'cause'  => $payload->get_error_code(),
				)
			);
		}
		Activity::record( Activity::REGENERATE, $connection );
		return $payload;
	}

	/**
	 * Drops the metadata of a deleted agent password, from Modula or from the agent's profile.
	 * A failed write leaves only metadata that no listed password refers to.
	 *
	 * @param int                $user_id User whose password was deleted.
	 * @param array{uuid:string} $item    Deleted Application Password.
	 */
	public static function forget( $user_id, $item ): void {
		if ( ! Agent::is_agent( (int) $user_id ) || ! isset( $item['uuid'] ) ) {
			return;
		}
		$connections = self::recorded( (int) $user_id );
		if ( ! isset( $connections[ $item['uuid'] ] ) ) {
			return;
		}
		unset( $connections[ $item['uuid'] ] );
		update_user_meta( (int) $user_id, self::META, $connections );
	}

	/** What the site still lacks for a connection, checked before any write; null when ready. */
	public static function site_unmet(): ?\WP_Error {
		$server = self::server_unmet();
		if ( $server ) {
			return $server;
		}
		$passwords = Requirements::application_passwords();
		if ( ! $passwords['available'] ) {
			return new \WP_Error(
				'modula_mcp_passwords_unavailable',
				__( 'Application Passwords are not available on this site.', 'modula-best-grid-gallery' ),
				array(
					'status' => 409,
					'reason' => $passwords['reason'],
				)
			);
		}
		// Client configs quote the endpoint for shells; refuse one a shell would expand.
		if ( preg_match( '/["$`\\\\%!]/', Adapter::endpoint() ) ) {
			return new \WP_Error( 'modula_mcp_endpoint_unsupported', __( 'The site address contains characters MCP client configs cannot carry.', 'modula-best-grid-gallery' ), array( 'status' => 409 ) );
		}
		return null;
	}

	/** What every kind of connection needs: a single site with the MCP Adapter active; null when ready. */
	public static function server_unmet(): ?\WP_Error {
		if ( is_multisite() ) {
			return new \WP_Error( 'modula_mcp_multisite', __( 'MCP connections are not supported on multisite yet.', 'modula-best-grid-gallery' ), array( 'status' => 409 ) );
		}
		return self::adapter_unmet();
	}

	/**
	 * Issues a Password connection's Application Password and records its client.
	 *
	 * @param int    $agent  Modula agent user ID.
	 * @param string $client Client id with a fallback.
	 * @return array{id:string,client:string,endpoint:string,username:string,password:string,config:array{format:string,content:string,app:string,locations:array<string,string>,note:string}}|\WP_Error
	 */
	private static function issue( int $agent, string $client ) {
		$name   = sprintf(
			/* translators: 1: MCP client name, 2: creation date */
			__( 'Modula MCP: %1$s, %2$s', 'modula-best-grid-gallery' ),
			Clients::label( $client ),
			wp_date( 'Y-m-d H:i' )
		);
		$issued = \WP_Application_Passwords::create_new_application_password( $agent, array( 'name' => $name ) );
		if ( is_wp_error( $issued ) ) {
			return new \WP_Error(
				'modula_mcp_password_failed',
				$issued->get_error_message(),
				array(
					'status' => 500,
					'cause'  => $issued->get_error_code(),
				)
			);
		}
		list( $password, $item ) = $issued;
		if ( ! self::record( $agent, $item['uuid'], $client ) ) {
			return self::revoke_unrecorded( $agent, $item['uuid'] );
		}
		$credential = array(
			'endpoint' => Adapter::endpoint(),
			'username' => Agent::LOGIN,
			'password' => $password,
		);
		return array(
			'id'     => $item['uuid'],
			'client' => $client,
			'config' => Clients::config( $client, $credential ),
		) + $credential;
	}

	/** Defense in depth behind the REST permission check. */
	private static function forbidden(): ?\WP_Error {
		if ( current_user_can( 'manage_options' ) ) {
			return null;
		}
		return new \WP_Error( 'rest_forbidden', __( 'Sorry, you are not allowed to manage MCP connections.', 'modula-best-grid-gallery' ), array( 'status' => 403 ) );
	}

	/** Refuses ids that are not this site's connections: other users' passwords, other sites' grants, anything else. */
	private static function unknown_connection(): \WP_Error {
		return new \WP_Error( 'modula_mcp_unknown_connection', __( 'This connection does not exist. It may already be disconnected.', 'modula-best-grid-gallery' ), array( 'status' => 404 ) );
	}

	/**
	 * The listed connection with this id; only listed connections can be acted on.
	 *
	 * @param string $id Connection id.
	 * @return array{id:string,kind:string,client:string,label:string,approver:string|null,access:string|null,created:int,last_used:int|null,can_regenerate:bool}|null
	 */
	private static function find( string $id ): ?array {
		foreach ( self::all() as $connection ) {
			if ( $connection['id'] === $id ) {
				return $connection;
			}
		}
		return null;
	}

	/**
	 * Ends a connection the way its kind requires.
	 *
	 * @param array{id:string,kind:string} $connection Listed connection.
	 */
	private static function revoke( array $connection ): bool {
		switch ( $connection['kind'] ) {
			case self::OAUTH:
				return Oauth_Grants::revoke( $connection['id'] );
			case self::PASSWORD:
				return self::delete_password( Agent::user_id(), $connection['id'] );
			default:
				// A kind without a case here cannot be ended yet; gateway connections add theirs in Phase 2 (ticket 12).
				return false;
		}
	}

	/** Deletes an agent password; forget() drops its metadata. */
	private static function delete_password( int $agent, string $uuid ): bool {
		return true === \WP_Application_Passwords::delete_application_password( $agent, $uuid );
	}

	/** @return array<int,array<string,mixed>> One row per live OAuth grant. */
	private static function oauth_rows(): array {
		$rows = array();
		foreach ( Oauth_Grants::live() as $id => $grant ) {
			// live() already dropped grants whose approver is gone; the fallback only guards a race.
			$approver = get_userdata( $grant['approver'] );
			$rows[]   = self::describe_grant( $grant['client_id'] ) + array(
				'id'             => (string) $id,
				'client'         => '',
				'approver'       => $approver ? $approver->display_name : '',
				'access'         => $grant['access'],
				'created'        => $grant['created'],
				'last_used'      => $grant['last_used'],
				'can_regenerate' => false,
			);
		}
		return $rows;
	}

	/**
	 * The label and kind of an OAuth connection, from its client; reads no other connection.
	 *
	 * @param string $client_id Client the grant is for.
	 * @return array{label:string,kind:string}
	 */
	public static function describe_grant( string $client_id ): array {
		return array(
			'label' => Oauth_Clients::name( $client_id ),
			'kind'  => self::OAUTH,
		);
	}

	/**
	 * The label and kind of the agent password with this UUID; reads no other connection.
	 *
	 * @param string $uuid Application Password UUID.
	 * @return array{label:string,kind:string}|null Null when it is not an agent password.
	 */
	public static function describe_password( string $uuid ): ?array {
		$agent = Agent::user_id();
		$item  = $agent ? \WP_Application_Passwords::get_user_application_password( $agent, $uuid ) : null;
		if ( ! $item ) {
			return null;
		}
		$row = self::password_row( $item, self::recorded( $agent ) );
		return array(
			'label' => $row['label'],
			'kind'  => $row['kind'],
		);
	}

	/**
	 * One row per Application Password on the agent, joined with its metadata. A password
	 * added outside Modula is listed too, under its own name, since it can act as the agent.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private static function password_rows(): array {
		$agent = Agent::user_id();
		if ( ! $agent ) {
			return array();
		}
		$recorded = self::recorded( $agent );
		$rows     = array();
		foreach ( \WP_Application_Passwords::get_user_application_passwords( $agent ) as $item ) {
			$rows[] = self::password_row( $item, $recorded );
		}
		return $rows;
	}

	/**
	 * One agent password as a connection row.
	 *
	 * @param array{uuid:string,name:string,created:int,last_used:int|null} $item     Application Password.
	 * @param array<string,array{kind:string,client:string}>               $recorded Password UUID => metadata.
	 * @return array{id:string,kind:string,client:string,label:string,approver:null,access:null,created:int,last_used:int|null,can_regenerate:bool}
	 */
	private static function password_row( array $item, array $recorded ): array {
		$record = $recorded[ $item['uuid'] ] ?? array();
		$client = (string) ( $record['client'] ?? '' );
		$kind   = self::kind_of( $record );
		return array(
			'id'             => $item['uuid'],
			'kind'           => $kind,
			'client'         => $client,
			'label'          => Clients::exists( $client ) ? Clients::label( $client ) : $item['name'],
			'approver'       => null,
			'access'         => null,
			'created'        => (int) $item['created'],
			'last_used'      => isset( $item['last_used'] ) ? (int) $item['last_used'] : null,
			'can_regenerate' => self::PASSWORD === $kind && Clients::has_fallback( $client ),
		);
	}

	/**
	 * The kind of an agent password; one without metadata acts like a Password connection.
	 *
	 * @param array{kind?:string} $record Recorded metadata, or empty.
	 */
	private static function kind_of( array $record ): string {
		$kind = $record['kind'] ?? self::PASSWORD;
		return self::LEGACY_DIRECT === $kind ? self::PASSWORD : $kind;
	}

	/** @return array<string,array{kind:string,client:string}> Password UUID => metadata. */
	private static function recorded( int $agent ): array {
		$connections = get_user_meta( $agent, self::META, true );
		return is_array( $connections ) ? $connections : array();
	}

	/** An unrecorded password would be listed without its client and could not be regenerated; revoke it. */
	private static function revoke_unrecorded( int $agent, string $uuid ): \WP_Error {
		$revoked = \WP_Application_Passwords::delete_application_password( $agent, $uuid );
		if ( true !== $revoked ) {
			return new \WP_Error( 'modula_mcp_record_failed', __( 'The connection could not be saved, and its password could not be revoked. Revoke it from the Modula agent’s WordPress profile.', 'modula-best-grid-gallery' ), array( 'status' => 500 ) );
		}
		return new \WP_Error( 'modula_mcp_record_failed', __( 'The connection could not be saved.', 'modula-best-grid-gallery' ), array( 'status' => 500 ) );
	}

	/** One error code per adapter state, so the panel can say what to fix. */
	private static function adapter_unmet(): ?\WP_Error {
		switch ( Adapter::state() ) {
			case Adapter::ACTIVE:
				return null;
			case Adapter::INACTIVE:
				return new \WP_Error( 'modula_mcp_adapter_inactive', __( 'Activate the MCP Adapter plugin first.', 'modula-best-grid-gallery' ), array( 'status' => 409 ) );
			case Adapter::MISSING:
				return new \WP_Error( 'modula_mcp_adapter_missing', __( 'Install and activate the MCP Adapter plugin first.', 'modula-best-grid-gallery' ), array( 'status' => 409 ) );
			default:
				return new \WP_Error( 'modula_mcp_unsupported_wp', __( 'MCP connections need a newer version of WordPress.', 'modula-best-grid-gallery' ), array( 'status' => 409 ) );
		}
	}

	private static function record( int $agent, string $uuid, string $client ): bool {
		$connections          = self::recorded( $agent );
		$connections[ $uuid ] = array(
			'kind'   => self::PASSWORD,
			'client' => $client,
		);
		return (bool) update_user_meta( $agent, self::META, $connections );
	}
}
