<?php
/**
 * OAuth connections: authorization codes, grants and their tokens (ADR 0044).
 *
 * Only SHA-256 hashes of codes and tokens are stored. Tokens read `<grant id>.<secret>`:
 * the id finds the grant, the secret's hash proves it. A grant holds one access token
 * (about an hour) and one refresh token (about 30 days, renewed on each refresh); each
 * refresh replaces both. Every grant acts as the Modula agent; its approver is recorded,
 * never acted as, and the grant ends when the approver can no longer approve connections.
 *
 * Each grant is its own option, so writes to one grant never overwrite another. A code or
 * a refresh token is also its own row, and deleting that row is the claim: of two
 * concurrent requests presenting it, only one deletes it.
 */
namespace Modula\V2\Mcp;

use Modula\V2\Abilities\Agent;

defined( 'ABSPATH' ) || exit;

final class Oauth_Grants {
	/** The flows the token endpoint serves, as the server metadata and registrations advertise them. */
	public const GRANT_TYPES = array( 'authorization_code', 'refresh_token' );

	/**
	 * Option per grant: array{client_id:string,approver:int,access:string,created:int,token_hash:string,
	 * token_expires:int,refresh_hash:string,refresh_expires:int}. `access` is a Connections::ACCESS_*
	 * value; grants made before it existed have none and are read & write.
	 */
	public const GRANT_PREFIX = 'modula_mcp_oauth_grant_';

	/** Option per live refresh token, named by its hash; the value is the grant id. */
	public const REFRESH_PREFIX = 'modula_mcp_oauth_refresh_';

	/**
	 * Grant id => last-used time. Kept apart from the grants, so recording a call never
	 * writes back a grant whose tokens a concurrent refresh just replaced.
	 */
	public const LAST_USED_OPTION = 'modula_mcp_oauth_last_used';

	public const CODE_TTL    = 10 * MINUTE_IN_SECONDS;
	public const TOKEN_TTL   = HOUR_IN_SECONDS;
	public const REFRESH_TTL = 30 * DAY_IN_SECONDS;

	/** Codes live in transients keyed by their hash, so they expire without a sweep. */
	private const CODE_PREFIX = 'modula_mcp_oauth_code_';

	/** Last-used is a date for the connections list; recording it more often only costs writes. */
	private const LAST_USED_PRECISION = MINUTE_IN_SECONDS;

	/**
	 * Issues a single-use authorization code bound to the request, its approver and the access they chose.
	 *
	 * @param array{client_id:string,redirect_uri:string,code_challenge:string} $request  Validated authorization request.
	 * @param int                                                                $approver Administrator who approved it.
	 * @param string                                                             $access   Validated Connections::ACCESS_* value.
	 * @return string|\WP_Error
	 */
	public static function issue_code( array $request, int $approver, string $access ) {
		$code   = bin2hex( random_bytes( 32 ) );
		$issued = array(
			'client_id'      => $request['client_id'],
			'redirect_uri'   => $request['redirect_uri'],
			'code_challenge' => $request['code_challenge'],
			'approver'       => $approver,
			'access'         => $access,
			'expires'        => time() + self::CODE_TTL,
		);
		if ( ! set_transient( self::CODE_PREFIX . self::hash( $code ), $issued, self::CODE_TTL ) ) {
			return new \WP_Error( 'modula_mcp_oauth_code_failed', __( 'The approval could not be saved. Try connecting again.', 'modula-best-grid-gallery' ) );
		}
		return $code;
	}

	/**
	 * Exchanges a code for tokens. The code is spent whatever the outcome.
	 *
	 * @param string $client_id    Client presenting the code.
	 * @param string $code         Authorization code.
	 * @param string $redirect_uri Redirect URI the code was issued for.
	 * @param string $verifier     PKCE code verifier.
	 * @return array{access_token:string,token_type:string,expires_in:int,refresh_token:string}|\WP_Error Error codes are OAuth error codes.
	 */
	public static function exchange_code( string $client_id, string $code, string $redirect_uri, string $verifier ) {
		$issued = self::claim_code( $code );
		if ( null === $issued ) {
			return self::invalid_grant( __( 'The authorization code is invalid, expired or already used.', 'modula-best-grid-gallery' ) );
		}
		if ( ! self::code_matches( $issued, $client_id, $redirect_uri, $verifier ) ) {
			return self::invalid_grant( __( 'The authorization code does not match this client, redirect URI or code verifier.', 'modula-best-grid-gallery' ) );
		}
		if ( ! self::can_approve( $issued['approver'] ) ) {
			return self::invalid_grant( self::approver_lost_message() );
		}
		// Approval ensured the agent moments ago; its absence now is a site fault, not the client's.
		if ( ! Agent::user_id() ) {
			return self::agent_missing( 'server_error', 500 );
		}
		return self::create_grant( $client_id, $issued['approver'], self::access_of( $issued ) );
	}

	/**
	 * Rotates a grant's tokens. The old refresh token and access token stop working.
	 *
	 * @param string $client_id     Client presenting the token.
	 * @param string $refresh_token Refresh token.
	 * @return array{access_token:string,token_type:string,expires_in:int,refresh_token:string}|\WP_Error Error codes are OAuth error codes.
	 */
	public static function refresh( string $client_id, string $refresh_token ) {
		$found = self::find_by_token( $refresh_token, 'refresh_hash' );
		if ( null === $found || ! self::is_refreshable_by( $found['grant'], $client_id ) ) {
			return self::invalid_grant( __( 'The refresh token is invalid, expired or already used.', 'modula-best-grid-gallery' ) );
		}
		if ( ! self::can_approve( $found['grant']['approver'] ) ) {
			self::revoke( $found['id'] );
			return self::invalid_grant( self::approver_lost_message() );
		}
		// invalid_grant, unlike at code exchange: the client should sign in again, which recreates the agent.
		if ( ! Agent::user_id() ) {
			return self::agent_missing( 'invalid_grant', 400 );
		}
		if ( ! delete_option( self::REFRESH_PREFIX . $found['grant']['refresh_hash'] ) || ! self::find_grant( $found['id'] ) ) {
			return self::invalid_grant( __( 'The refresh token is invalid, expired or already used.', 'modula-best-grid-gallery' ) );
		}
		// A revoke landing between the check above and this write could still be undone; the window is one request's write.
		$rotated = self::with_new_tokens( $found['grant'] );
		if ( ! self::store_tokens( $found['id'], $rotated['grant'] ) ) {
			return new \WP_Error( 'server_error', __( 'The connection could not be renewed.', 'modula-best-grid-gallery' ), array( 'status' => 500 ) );
		}
		return self::token_response( $found['id'], $rotated['secrets'] );
	}

	/**
	 * RFC 7009: ends the grant an access or refresh token belongs to, when it belongs to
	 * this client. Unknown tokens are not an error; the endpoint answers the same way.
	 *
	 * @param string $client_id Client asking for the revocation.
	 * @param string $token     Access or refresh token.
	 * @return bool False only when a matching grant could not be removed.
	 */
	public static function revoke_token( string $client_id, string $token ): bool {
		$found = self::find_by_token( $token, 'token_hash' ) ?? self::find_by_token( $token, 'refresh_hash' );
		if ( null === $found || $found['grant']['client_id'] !== $client_id ) {
			return true;
		}
		if ( ! self::revoke( $found['id'] ) ) {
			return false;
		}
		// The client disconnected itself; the connections list loses the row without anyone clicking Disconnect.
		Activity::record( Activity::DISCONNECT, Connections::describe_grant( $client_id ) );
		return true;
	}

	/**
	 * Removes a grant and its refresh row; its tokens stop working at once. An unknown grant
	 * counts as removed. Callers that revoke over a lost approver ignore a failure: the grant
	 * still fails the approver check on every use, and prune retries.
	 *
	 * @param string $id Grant id.
	 */
	public static function revoke( string $id ): bool {
		$grant = self::find_grant( $id );
		if ( null === $grant ) {
			return true;
		}
		delete_option( self::REFRESH_PREFIX . $grant['refresh_hash'] );
		if ( ! delete_option( self::GRANT_PREFIX . $id ) ) {
			return false;
		}
		self::prune_last_used( array_flip( self::grant_ids() ) );
		return true;
	}

	/**
	 * The user an access token acts as, always the Modula agent, with its grant's id, client and access.
	 *
	 * @param string $token Access token from the Bearer header.
	 * @return array{user:int,grant:string,client:string,access:string}|\WP_Error
	 */
	public static function authenticate( string $token ) {
		$found = self::find_by_token( $token, 'token_hash' );
		if ( null === $found || $found['grant']['token_expires'] < time() ) {
			return new \WP_Error( 'modula_mcp_oauth_token_invalid', __( 'The access token is invalid or expired.', 'modula-best-grid-gallery' ) );
		}
		if ( ! self::can_approve( $found['grant']['approver'] ) ) {
			self::revoke( $found['id'] );
			return new \WP_Error( 'modula_mcp_oauth_approver_lost', self::approver_lost_message() );
		}
		$agent = Agent::user_id();
		if ( ! $agent ) {
			return self::agent_missing( 'modula_mcp_oauth_agent_missing', 401 );
		}
		self::record_use( $found['id'] );
		return array(
			'user'   => $agent,
			'grant'  => $found['id'],
			'client' => $found['grant']['client_id'],
			'access' => self::access_of( $found['grant'] ),
		);
	}

	/**
	 * Live grants for the connections list: no hashes, no secrets. Grants that already
	 * ended, but that prune has not removed yet, are left out.
	 *
	 * @return array<string,array{client_id:string,approver:int,access:string,created:int,last_used:int|null}> Keyed by grant id.
	 */
	public static function live(): array {
		$last_used = self::last_used();
		$live      = array();
		foreach ( self::grant_ids() as $id ) {
			$grant = self::find_grant( $id );
			if ( self::has_ended( $grant ) ) {
				continue;
			}
			$live[ $id ] = array(
				'client_id' => $grant['client_id'],
				'approver'  => $grant['approver'],
				'access'    => self::access_of( $grant ),
				'created'   => $grant['created'],
				'last_used' => isset( $last_used[ $id ] ) ? (int) $last_used[ $id ] : null,
			);
		}
		return $live;
	}

	/**
	 * Ends grants whose refresh token expired or whose approver can no longer approve,
	 * and drops refresh rows and last-used dates left without a grant.
	 * Runs with WordPress's daily expired-transient cleanup, which also removes stale codes.
	 * Failed deletions are left for the next run.
	 */
	public static function prune(): void {
		$live = array();
		foreach ( self::grant_ids() as $id ) {
			$grant = self::find_grant( $id );
			if ( self::has_ended( $grant ) ) {
				self::revoke( $id );
				continue;
			}
			$live[ $id ] = $grant['refresh_hash'];
		}
		foreach ( self::option_names( self::REFRESH_PREFIX ) as $name ) {
			$hash = substr( $name, strlen( self::REFRESH_PREFIX ) );
			if ( ! in_array( $hash, $live, true ) ) {
				delete_option( $name );
			}
		}
		self::prune_last_used( $live );
	}

	/**
	 * Deletes every grant, refresh token, pending code and last-used date, for uninstall.
	 * With a persistent object cache, codes never reach the options table and are not listed;
	 * they expire within CODE_TTL and cannot be exchanged once their grant data is gone.
	 */
	public static function delete_all(): void {
		foreach ( array_merge( self::option_names( self::GRANT_PREFIX ), self::option_names( self::REFRESH_PREFIX ) ) as $name ) {
			delete_option( $name );
		}
		foreach ( self::option_names( '_transient_' . self::CODE_PREFIX ) as $name ) {
			delete_transient( substr( $name, strlen( '_transient_' ) ) );
		}
		delete_option( self::LAST_USED_OPTION );
	}

	/**
	 * The grant a token belongs to, when its secret hashes to the given field; expiry is the caller's.
	 *
	 * @param string $token Access or refresh token.
	 * @param string $field `token_hash` for access tokens, `refresh_hash` for refresh tokens.
	 * @return array{id:string,grant:array}|null
	 */
	private static function find_by_token( string $token, string $field ): ?array {
		if ( 1 !== preg_match( '/^([a-f0-9]{16})\.([a-f0-9]{64})$/', $token, $parts ) ) {
			return null;
		}
		$grant = self::find_grant( $parts[1] );
		if ( null === $grant || ! hash_equals( (string) ( $grant[ $field ] ?? '' ), self::hash( $parts[2] ) ) ) {
			return null;
		}
		return array(
			'id'    => $parts[1],
			'grant' => $grant,
		);
	}

	/**
	 * Whether this client may refresh the grant now.
	 *
	 * @param array{client_id:string,refresh_expires:int} $grant     Grant the refresh token belongs to.
	 * @param string                                      $client_id Client presenting the token.
	 */
	private static function is_refreshable_by( array $grant, string $client_id ): bool {
		return $grant['client_id'] === $client_id && $grant['refresh_expires'] >= time();
	}

	/**
	 * A code's or grant's access; those made before access existed are read & write.
	 *
	 * @param array<string,mixed> $record Issued code or grant.
	 */
	private static function access_of( array $record ): string {
		$access = $record['access'] ?? null;
		return in_array( $access, Connections::ACCESS_LEVELS, true ) ? $access : Connections::ACCESS_READ_WRITE;
	}

	/**
	 * A deleted user, or one without `manage_options`, can no longer stand behind a connection.
	 *
	 * @param int $approver Administrator recorded on the grant or code.
	 */
	private static function can_approve( int $approver ): bool {
		return user_can( $approver, 'manage_options' );
	}

	/**
	 * A grant that is gone, whose refresh token expired or whose approver can no longer approve.
	 *
	 * @param array{refresh_expires:int,approver:int}|null $grant Stored grant.
	 */
	private static function has_ended( ?array $grant ): bool {
		return null === $grant || $grant['refresh_expires'] < time() || ! self::can_approve( $grant['approver'] );
	}

	/** Shown to the client when the approver's loss ends a connection. */
	private static function approver_lost_message(): string {
		return __( 'The administrator who approved this connection can no longer approve it. Connect again.', 'modula-best-grid-gallery' );
	}

	/**
	 * @param string $code   OAuth error code.
	 * @param int    $status HTTP status.
	 */
	private static function agent_missing( string $code, int $status ): \WP_Error {
		return new \WP_Error( $code, __( 'The Modula agent no longer exists. Connect again.', 'modula-best-grid-gallery' ), array( 'status' => $status ) );
	}

	/**
	 * Removes the code so no other request can use it; null when it is unknown, taken or expired.
	 *
	 * @param string $code Authorization code.
	 * @return array{client_id:string,redirect_uri:string,code_challenge:string,approver:int,access?:string,expires:int}|null
	 */
	private static function claim_code( string $code ): ?array {
		if ( 1 !== preg_match( '/^[a-f0-9]{64}$/', $code ) ) {
			return null;
		}
		$key    = self::CODE_PREFIX . self::hash( $code );
		$issued = get_transient( $key );
		if ( ! is_array( $issued ) || ! delete_transient( $key ) || $issued['expires'] < time() ) {
			return null;
		}
		return $issued;
	}

	/**
	 * PKCE S256 (RFC 7636): the verifier hashes to the challenge the approval was bound to.
	 *
	 * @param array{client_id:string,redirect_uri:string,code_challenge:string} $issued       Claimed code.
	 * @param string                                                            $client_id    Client presenting the code.
	 * @param string                                                            $redirect_uri Redirect URI presented.
	 * @param string                                                            $verifier     PKCE code verifier.
	 */
	private static function code_matches( array $issued, string $client_id, string $redirect_uri, string $verifier ): bool {
		if ( $issued['client_id'] !== $client_id || $issued['redirect_uri'] !== $redirect_uri ) {
			return false;
		}
		if ( 1 !== preg_match( '/^[A-Za-z0-9._~-]{43,128}$/', $verifier ) ) {
			return false;
		}
		$challenge = rtrim( strtr( base64_encode( hash( 'sha256', $verifier, true ) ), '+/', '-_' ), '=' ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- PKCE requires base64url.
		return hash_equals( $issued['code_challenge'], $challenge );
	}

	/**
	 * @param string $client_id Client the grant is for.
	 * @param int    $approver  Administrator who approved it.
	 * @param string $access    Connections::ACCESS_* value they chose; refreshes keep it.
	 * @return array{access_token:string,token_type:string,expires_in:int,refresh_token:string}|\WP_Error
	 */
	private static function create_grant( string $client_id, int $approver, string $access ) {
		$id      = bin2hex( random_bytes( 8 ) );
		$rotated = self::with_new_tokens(
			array(
				'client_id' => $client_id,
				'approver'  => $approver,
				'access'    => $access,
				'created'   => time(),
			)
		);
		// The client first: a grant whose client could still expire would outlive its client.
		if ( ! Oauth_Clients::mark_connected( $client_id ) || ! self::store_tokens( $id, $rotated['grant'] ) ) {
			return new \WP_Error( 'server_error', __( 'The connection could not be saved.', 'modula-best-grid-gallery' ), array( 'status' => 500 ) );
		}
		Activity::record( Activity::CONNECT, Connections::describe_grant( $client_id ) );
		return self::token_response( $id, $rotated['secrets'] );
	}

	/**
	 * Saves a grant with new tokens, then the row that lets its refresh token be claimed.
	 * A grant saved without that row is removed again, so no refresh token is left unusable.
	 *
	 * @param string              $id    Grant id.
	 * @param array<string,mixed> $grant Grant with its new token hashes.
	 */
	private static function store_tokens( string $id, array $grant ): bool {
		if ( ! update_option( self::GRANT_PREFIX . $id, $grant, false ) ) {
			return false;
		}
		if ( add_option( self::REFRESH_PREFIX . $grant['refresh_hash'], $id, '', false ) ) {
			return true;
		}
		delete_option( self::GRANT_PREFIX . $id );
		return false;
	}

	/**
	 * A grant with fresh access and refresh tokens; only their hashes go into the grant.
	 * The refresh token's lifetime restarts too, so a connection in use does not expire.
	 *
	 * @param array<string,mixed> $grant Grant to issue tokens for.
	 * @return array{grant:array<string,mixed>,secrets:array{access:string,refresh:string}}
	 */
	private static function with_new_tokens( array $grant ): array {
		$secrets = array(
			'access'  => bin2hex( random_bytes( 32 ) ),
			'refresh' => bin2hex( random_bytes( 32 ) ),
		);
		$grant   = array(
			'token_hash'      => self::hash( $secrets['access'] ),
			'token_expires'   => time() + self::TOKEN_TTL,
			'refresh_hash'    => self::hash( $secrets['refresh'] ),
			'refresh_expires' => time() + self::REFRESH_TTL,
		) + $grant;
		return array(
			'grant'   => $grant,
			'secrets' => $secrets,
		);
	}

	/**
	 * @param string                              $id      Grant id.
	 * @param array{access:string,refresh:string} $secrets Plain secrets, returned once and never stored.
	 * @return array{access_token:string,token_type:string,expires_in:int,refresh_token:string}
	 */
	private static function token_response( string $id, array $secrets ): array {
		return array(
			'access_token'  => $id . '.' . $secrets['access'],
			'token_type'    => 'Bearer',
			'expires_in'    => self::TOKEN_TTL,
			'refresh_token' => $id . '.' . $secrets['refresh'],
		);
	}

	/**
	 * Best effort by design: a failed write only leaves an older last-used date,
	 * and refusing an authenticated call over it would be worse.
	 *
	 * @param string $id Grant id.
	 */
	private static function record_use( string $id ): void {
		$last_used = self::last_used();
		if ( time() - (int) ( $last_used[ $id ] ?? 0 ) < self::LAST_USED_PRECISION ) {
			return;
		}
		$last_used[ $id ] = time();
		update_option( self::LAST_USED_OPTION, $last_used, false );
	}

	/**
	 * Drops last-used dates of grants that no longer exist; a failed write is retried by prune.
	 *
	 * @param array<string,mixed> $live Live grants, keyed by id.
	 */
	private static function prune_last_used( array $live ): void {
		$last_used = self::last_used();
		$kept      = array_intersect_key( $last_used, $live );
		if ( count( $kept ) !== count( $last_used ) ) {
			update_option( self::LAST_USED_OPTION, $kept, false );
		}
	}

	/** @return array<string,int> Grant id => last-used time. */
	private static function last_used(): array {
		$last_used = get_option( self::LAST_USED_OPTION, array() );
		return is_array( $last_used ) ? $last_used : array();
	}

	/**
	 * @param string $id Grant id.
	 * @return array{client_id:string,approver:int,created:int,token_hash:string,token_expires:int,refresh_hash:string,refresh_expires:int}|null
	 */
	private static function find_grant( string $id ): ?array {
		$grant = get_option( self::GRANT_PREFIX . $id );
		return is_array( $grant ) ? $grant : null;
	}

	/** @return string[] Ids of every stored grant. */
	private static function grant_ids(): array {
		return array_map(
			static function ( $name ) {
				return substr( $name, strlen( self::GRANT_PREFIX ) );
			},
			self::option_names( self::GRANT_PREFIX )
		);
	}

	/**
	 * Names of the options with a prefix. WordPress has no API to list options.
	 *
	 * @param string $prefix Option name prefix.
	 * @return string[]
	 */
	private static function option_names( string $prefix ): array {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Options cannot be listed through the Options API; prune runs daily.
		return $wpdb->get_col( $wpdb->prepare( "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s", $wpdb->esc_like( $prefix ) . '%' ) );
	}

	/** @param string $message Why the grant was refused. */
	private static function invalid_grant( string $message ): \WP_Error {
		return new \WP_Error( 'invalid_grant', $message, array( 'status' => 400 ) );
	}

	/** @param string $value Code or token secret. */
	private static function hash( string $value ): string {
		return hash( 'sha256', $value );
	}
}
