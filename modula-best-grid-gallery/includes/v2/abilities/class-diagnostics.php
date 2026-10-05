<?php
/** Bounded, secret-safe access to the existing Diagnostics service. */
namespace Modula\V2\Abilities;
defined( 'ABSPATH' ) || exit;
final class Diagnostics {
	public const READ = 'modula/read-diagnostics';
	public const LOG = 'modula/read-debug-log';
	public const ENABLE = 'modula/enable-debug-log';
	public const DISABLE = 'modula/disable-debug-log';
	public const CLEAR = 'modula/clear-debug-log';
	public static function mutations(): array { return array( self::ENABLE, self::DISABLE, self::CLEAR ); }
	public static function callbacks(): array {
		return array( self::READ => array( self::class, 'read' ), self::LOG => array( self::class, 'entries' ), self::ENABLE => array( self::class, 'enable' ), self::DISABLE => array( self::class, 'disable' ), self::CLEAR => array( self::class, 'clear' ) );
	}
	public static function can_manage(): bool { return get_current_user_id() && current_user_can( 'manage_options' ); }
	public static function status_schema(): array {
		return Contract::object( array( 'schema_version' => array( 'type' => 'string' ), 'revision' => Contract::revision_schema(), 'active' => array( 'type' => 'boolean' ), 'enabled' => array( 'type' => 'boolean' ), 'expires_at' => array( 'type' => 'integer' ), 'size' => array( 'type' => 'integer' ), 'has_file' => array( 'type' => 'boolean' ) ), array( 'schema_version', 'revision', 'active', 'enabled', 'expires_at', 'size', 'has_file' ) );
	}
	public static function definitions(): array {
		$input = Contract::object( array( 'request_id' => Contract::request_id_schema(), 'revision' => Contract::revision_schema() ), array( 'request_id', 'revision' ) );
		$entry = Contract::object( array( 'timestamp' => array( 'type' => 'string' ), 'level' => array( 'type' => 'string' ), 'channel' => array( 'type' => 'string' ), 'message' => array( 'type' => 'string' ), 'redacted' => array( 'type' => 'boolean' ) ), array( 'timestamp', 'level', 'channel', 'message', 'redacted' ) );
		$definitions = array(
		self::READ => array( 'label' => 'Read Diagnostics status', 'description' => 'manage_options required. Read only the existing Modula Debug Log enablement, expiry, size, presence and revision. No provider refresh, storage creation or settings repair. This is not WordPress debug.log.', 'input_schema' => Contract::object( array( 'scope' => array( 'type' => 'string', 'enum' => array( 'status' ) ) ) ) + array( 'default' => array() ), 'output_schema' => self::status_schema() ),
		self::LOG => array( 'label' => 'Read redacted Modula Debug Log', 'description' => 'Read a bounded, redacted projection of the existing authenticated Diagnostics download. At most 2 MiB scanned, 1–100 entries per page; revision required after page 1 and rejected if changed. Only known channel, level and valid timestamp are retained. Arbitrary messages and all context are replaced with fixed channel summaries; malformed entries omitted. Never returns raw download bytes, paths, identifiers, credentials or provider data. No writes.', 'input_schema' => Contract::object( array( 'page' => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 100000 ), 'per_page' => array( 'type' => 'integer', 'minimum' => 1, 'maximum' => 100 ), 'revision' => Contract::revision_schema() ) ) + array( 'default' => array() ), 'output_schema' => Contract::object( array( 'schema_version' => array( 'type' => 'string' ), 'revision' => Contract::revision_schema(), 'page' => array( 'type' => 'integer' ), 'total' => array( 'type' => 'integer' ), 'entries' => array( 'type' => 'array', 'items' => $entry ) ), array( 'schema_version', 'revision', 'page', 'total', 'entries' ) ) ),
		);
		foreach ( array( self::ENABLE => 'Enable collection for the existing seven-day window and create protected log storage.', self::DISABLE => 'Disable collection while preserving the log file.', self::CLEAR => 'Permanently clear the existing Modula Debug Log file without changing collection state.' ) as $name => $effect ) {
			$definitions[ $name ] = array( 'label' => str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name ), 'description' => $effect . ' Explicit manage_options action against the current Diagnostics revision; serialized with existing admin and log writers. Same request recovers its 30-day outcome without repeating the effect. No WordPress debug.log changes.', 'input_schema' => $input, 'output_schema' => Contract::outcome_schema() );
		}
		return $definitions;
	}
	/** The bounded snapshot is read while all service writers are excluded. */
	private static function snapshot(): array {
		$service = \Modula_Debug_Log::get_instance();
		$body = $service->get_download_payload( \Modula_Debug_Log::MAX_BYTES )['body'] ?? '';
		$status = $service->get_status();
		$revision = hash_hmac( 'sha256', wp_json_encode( $status ) . ':' . $body, wp_salt( 'auth' ) );
		return array( array( 'schema_version' => Contract::VERSION, 'revision' => $revision ) + $status, $body );
	}
	public static function read( array $input ) {
		if ( ! self::can_manage() ) { return new \WP_Error( 'modula_forbidden', 'Current Diagnostics permissions are required.' ); }
		try { return \Modula_Debug_Log::get_instance()->with_lock( static function () { return self::snapshot()[0]; } ); }
		catch ( \Throwable $error ) { return new \WP_Error( 'diagnostics_unavailable', 'Diagnostics could not be inspected within its limits.' ); }
	}
	public static function entries( array $input ) {
		if ( ! self::can_manage() ) { return new \WP_Error( 'modula_forbidden', 'Current Diagnostics permissions are required.' ); }
		try {
			list( $status, $body ) = \Modula_Debug_Log::get_instance()->with_lock( static function () { return self::snapshot(); } );
			$page = $input['page'] ?? 1; $size = $input['per_page'] ?? 20;
			if ( $page > 1 && ! isset( $input['revision'] ) || isset( $input['revision'] ) && ! hash_equals( $status['revision'], $input['revision'] ) ) { return new \WP_Error( 'stale_revision', 'Read the current log revision before continuing.' ); }
			$channels = array( 'settings.rest' => 'Settings request failure.', 'gallery.persist' => 'Gallery persistence failure.', 'album.persist' => 'Album persistence failure.', 'shortcode.bootstrap' => 'Shortcode initialization failure.' );
			$entries = array();
			foreach ( explode( "\n", $body ) as $line ) {
				$entry = json_decode( $line, true, 8 );
				if ( ! is_array( $entry ) || ! is_string( $entry['channel'] ?? null ) || ! isset( $channels[ $entry['channel'] ] ) || ! in_array( $entry['level'] ?? null, array( 'error', 'warning', 'critical', 'notice' ), true ) || ! is_string( $entry['ts'] ?? null ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/D', $entry['ts'] ) ) { continue; }
				$entries[] = array( 'timestamp' => $entry['ts'], 'channel' => $entry['channel'], 'level' => $entry['level'], 'message' => $channels[ $entry['channel'] ], 'redacted' => true );
			}
			return array( 'schema_version' => Contract::VERSION, 'revision' => $status['revision'], 'page' => $page, 'total' => count( $entries ), 'entries' => array_slice( $entries, ( $page - 1 ) * $size, $size ) );
		} catch ( \Throwable $error ) { return new \WP_Error( 'diagnostics_unavailable', 'The log could not be inspected within its limits.' ); }
	}
	public static function enable( array $input ): array { return self::command( $input, self::ENABLE, 'enable' ); }
	public static function disable( array $input ): array { return self::command( $input, self::DISABLE, 'disable' ); }
	public static function clear( array $input ): array { return self::command( $input, self::CLEAR, 'clear' ); }
	private static function command( array $input, string $operation, string $action ): array {
		$out = static function ( $status, $code = '', $message = '' ) use ( $input, $operation ) { return Requests::outcome( $input['request_id'], $status, $code, $message, $operation ); };
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) { return $existing; }
		if ( ! self::can_manage() ) { return $out( 'forbidden', 'current_permission_denied', 'Current Diagnostics permissions are required.' ); }
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) { return $existing; }
		try {
			return \Modula_Debug_Log::get_instance()->with_lock( static function () use ( $input, $action, $out ) {
				if ( ! self::can_manage() ) { return Requests::finish( $input['request_id'], $out( 'forbidden', 'current_permission_denied', 'Current Diagnostics permissions are required.' ) ); }
				if ( ! hash_equals( self::snapshot()[0]['revision'], $input['revision'] ) ) { return Requests::finish( $input['request_id'], $out( 'conflict', 'stale_revision', 'Diagnostics changed; read and reconcile before a new action.' ) ); }
				if ( ! \Modula_Debug_Log::get_instance()->$action() ) { throw new \RuntimeException( 'Diagnostics command unavailable.' ); }
				$status = self::snapshot()[0];
				if ( 'enable' === $action && ! $status['active'] || 'disable' === $action && $status['enabled'] || 'clear' === $action && $status['size'] > 0 ) { throw new \RuntimeException( 'Effect not confirmed.' ); }
				$result = $out( 'succeeded' ); $result['diagnostics'] = $status;
				return Requests::finish( $input['request_id'], $result );
			} );
		} catch ( \Throwable $error ) { return Requests::finish( $input['request_id'], $out( 'uncertain', 'diagnostics_unconfirmed', 'Diagnostics could not be confirmed. Recover and inspect before a new action.' ) ); }
	}
}
