<?php
/** Recoverable folder transfers through the library-owned queue. */
namespace Modula\V2\Abilities;

use WPChill\Folders\Mutation_Lock;
use WPChill\Folders\Rest\Folder_Transfers_Controller;
use WPChill\Folders\Storage\Folder_Transfer_State;

defined( 'ABSPATH' ) || exit;
final class Transfers {
	public const LIBRARY = 'modula/start-library-offload';
	public const START  = 'modula/start-folder-transfer';
	public const READ   = 'modula/read-folder-transfer';
	public const CANCEL = 'modula/cancel-folder-transfer';
	public static function mutations(): array {
		return array( self::START, self::LIBRARY, self::CANCEL ); }
	public static function callbacks(): array {
		return array(
			self::START  => array( self::class, 'start' ),
			self::LIBRARY => array( self::class, 'library' ),
			self::READ   => array( self::class, 'read' ),
			self::CANCEL => array( self::class, 'cancel' ),
		); }
	public static function available(): bool {
		return Storage::available() && method_exists( Folder_Transfer_State::class, 'retained' ); }
	public static function result_schema(): array {
		$props = array();
		foreach ( array( 'id', 'type', 'connection_id', 'status', 'code' ) as $key ) {
			$props[ $key ] = array( 'type' => 'string' ); }
		foreach ( array( 'processed', 'failed', 'skipped', 'total', 'remaining', 'expires_at' ) as $key ) {
			$props[ $key ] = array( 'type' => 'integer' ); }
		$props['folder_id'] = array( 'type' => array( 'integer', 'null' ) );
		$props['locked']    = array( 'type' => 'boolean' );
		$props['results']   = array(
			'type'  => 'array',
			'items' => Contract::object(
				array(
					'attachment_id' => array( 'type' => 'integer' ),
					'status'        => array( 'type' => 'string' ),
					'code'          => array( 'type' => 'string' ),
				),
				array( 'attachment_id', 'status', 'code' )
			),
		);
		return Contract::object( $props, array_keys( $props ) );
	}
	public static function definitions(): array {
		$job  = array(
			'type'    => 'string',
			'pattern' => '^[a-f0-9-]{36}$',
		);
		$defs = array(
			self::LIBRARY => array(
				'request_id' => Contract::request_id_schema(),
				'revision' => Contract::revision_schema(),
				'connection_id' => array( 'type' => 'string', 'minLength' => 1, 'maxLength' => 100 ),
				'scope' => array( 'type' => 'string', 'enum' => array( 'entire_library' ) ),
			),
			self::START  => array(
				'request_id'    => Contract::request_id_schema(),
				'revision'      => Contract::revision_schema(),
				'folder_id'     => array(
					'type'    => 'integer',
					'minimum' => 1,
				),
				'direction'     => array(
					'type' => 'string',
					'enum' => array( 'offload', 'onload' ),
				),
				'connection_id' => array(
					'type'      => 'string',
					'maxLength' => 100,
				),
			),
			self::READ   => array( 'job_id' => $job ),
			self::CANCEL => array(
				'request_id' => Contract::request_id_schema(),
				'job_id'     => $job,
			),
		);
		foreach ( $defs as $name => $props ) {
			$required = array_keys( $props );
			if ( self::START === $name ) {
				$required = array_diff( $required, array( 'connection_id' ) ); }
			$defs[ $name ] = array(
				'label'         => str_replace( '-', ' ', substr( $name, 7 ) ),
				'description'   => 'Explicit folder offload/onload or library offload with required scope=entire_library (all inherit attachments with a file path, including already mapped skips); library copies bytes only and preserves folder residence. No implicit selection expansion; revision from list-storage-connections. Offload requires connection_id; onload infers it and refuses connection_id. One site-wide queue shared with UI. Stable job_id, actor/current media permissions, per-item results, cancellation without rollback, terminal retention 30 days. Interrupted effects never auto-retry. No credentials or raw provider errors.',
				'input_schema'  => Contract::object( $props, array_values( $required ) ),
				'output_schema' => self::READ === $name ? Contract::object(
					array(
						'schema_version' => array( 'type' => 'string' ),
						'transfer'       => self::result_schema(),
					),
					array( 'schema_version', 'transfer' )
				) : Contract::outcome_schema(),
			);
		}
		return $defs;
	}
	public static function authorized( string $id ): bool {
		if ( ! self::available() ) {
			return false; }
		$row = ( new Folder_Transfer_State() )->retained( $id );
		if ( ! $row || (int) ( $row['actor_id'] ?? 0 ) !== get_current_user_id() ) {
			return false; }
		foreach ( $row['members'] ?? array() as $member ) {
			$id = (int) $member['attachment_id'];
			if ( ! current_user_can( 'edit_post', $id ) || ! current_user_can( 'read_post', $id ) || ( 'folder_onload' === $row['type'] && ! current_user_can( 'delete_post', $id ) ) ) {
				return false; }
		}
		return true;
	}
	public static function read( array $input ) {
		if ( ! self::authorized( $input['job_id'] ) ) {
			return new \WP_Error( 'modula_forbidden', 'Current transfer and media permissions required.' ); }
		$job = Folder_Transfers_Controller::service()->retained_status( $input['job_id'] );
		return is_wp_error( $job ) ? $job : array(
			'schema_version' => Contract::VERSION,
			'transfer'       => $job,
		);
	}
	public static function can_recover( array $record ): bool {
		return self::available() && ( empty( $record['job_id'] ) || self::authorized( $record['job_id'] ) ); }
	public static function recover( string $request, array $record ): array {
		if ( ! self::can_recover( $record ) ) {
			return Requests::outcome( $request, 'forbidden', 'current_permission_denied', '', $record['operation'] ); }
		$job = isset( $record['job_id'] ) ? Folder_Transfers_Controller::service()->retained_status( $record['job_id'] ) : null;
		if ( ! $job || is_wp_error( $job ) ) {
			return Requests::outcome( $request, 'uncertain', 'transfer_admission_unconfirmed', '', $record['operation'] ); }
		$status = array(
			'done'         => $job['failed'] ? 'partial' : 'succeeded',
			'cancelled'    => 'partial',
			'expired'      => 'expired',
			'running'      => 'in_progress',
			'initializing' => 'uncertain',
			'uncertain'    => 'uncertain',
		)[ $job['status'] ] ?? 'uncertain';
		return Requests::outcome( $request, $status, '', 'Cancellation is not rollback. Inspect per-item results and remaining work.', $record['operation'] ) + array( 'transfer' => $job );
	}
	public static function start( array $input ): array {
		return self::enqueue( $input, self::START );
	}
	public static function library( array $input ): array {
		return self::enqueue( $input, self::LIBRARY );
	}
	private static function enqueue( array $input, string $operation ): array {
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$out = static function ( $status, $code = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, '', $operation );
		};
		if ( ! self::available() ) {
			return $out( 'forbidden', 'current_permission_denied' ); }
		if ( self::LIBRARY !== $operation && ( ( 'offload' === $input['direction'] && empty( $input['connection_id'] ) ) || ( 'onload' === $input['direction'] && isset( $input['connection_id'] ) ) ) ) {
			return $out( 'rejected', 'invalid_connection' ); }
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		try {
			$result = Mutation_Lock::run(
				'storage',
				static function () use ( $input, $operation, $out ) {
					$active = false;
					try {
						Revision::begin();
						$active = true;
						if ( ! hash_equals( $input['revision'], Revision::organization( true ) ) ) {
							throw new \DomainException( 'stale_revision' ); }
						if ( ! self::available() ) {
							throw new \DomainException( 'current_permission_denied' ); }
						$job_id = wp_generate_uuid4();
						Requests::context( $input['request_id'], array( 'job_id' => $job_id ) );
						$service = Folder_Transfers_Controller::service();
						$job     = self::LIBRARY === $operation ? $service->enqueue_library( $input['connection_id'], array( 'id' => $job_id ) ) : ( 'offload' === $input['direction'] ? $service->enqueue_folder_offload( $input['folder_id'], $input['connection_id'], array( 'id' => $job_id ) ) : $service->enqueue_folder_onload( $input['folder_id'], array( 'id' => $job_id ) ) );
						if ( is_wp_error( $job ) ) {
							throw new \DomainException( $job->get_error_code() ); }
						if ( ! self::authorized( $job_id ) ) {
							throw new \DomainException( 'current_permission_denied' ); }
						Revision::end( true );
						$active = false;
						return self::recover( $input['request_id'], Requests::record( $input['request_id'] ) );
					} catch ( \Throwable $error ) {
						if ( $active ) {
							Revision::end( false ); }
						foreach ( array( 'wpchill_folders_folder_transfer', 'alloptions', 'notoptions' ) as $key ) {
							wp_cache_delete( $key, 'options' ); }
						$code = $error instanceof \DomainException ? $error->getMessage() : 'transfer_admission_unconfirmed';
						return Requests::finish( $input['request_id'], $out( 'stale_revision' === $code ? 'conflict' : ( $error instanceof \DomainException ? 'rejected' : 'uncertain' ), $code ) );
					}
				}
			);
			return is_wp_error( $result ) ? Requests::finish( $input['request_id'], $out( 'rejected', 'operation_busy' ) ) : $result;
		} catch ( \Throwable $error ) {
			return $out( 'uncertain', 'transfer_admission_unconfirmed' ); }
	}
	public static function cancel( array $input ): array {
		$existing = Requests::existing( $input, self::CANCEL );
		if ( null !== $existing ) {
			return $existing; }
		$out = static function ( $status, $code = '' ) use ( $input ) {
			return Requests::outcome( $input['request_id'], $status, $code, '', self::CANCEL );
		};
		if ( ! self::authorized( $input['job_id'] ) ) {
			return $out( 'forbidden', 'current_permission_denied' ); }
		$existing = Requests::claim( $input, self::CANCEL );
		if ( null !== $existing ) {
			return $existing; }
		try {
			Requests::context( $input['request_id'], array( 'job_id' => $input['job_id'] ) );
			$result = Mutation_Lock::run(
				'storage',
				static function () use ( $input ) {
					if ( ! self::authorized( $input['job_id'] ) ) {
						return new \WP_Error( 'current_permission_denied' ); }
					$service = Folder_Transfers_Controller::service();
					$job     = $service->retained_status( $input['job_id'] );
					$active  = ( new Folder_Transfer_State() )->get();
					return $active && $active['id'] === $input['job_id'] ? $service->cancel( $input['job_id'] ) : $job;
				}
			);
			return Requests::finish( $input['request_id'], is_wp_error( $result ) ? $out( 'rejected', 'cancel_unconfirmed' ) : $out( 'succeeded' ) + array( 'transfer' => $result ) );
		} catch ( \Throwable $error ) {
			return $out( 'uncertain', 'cancel_unconfirmed' ); }
	}
}
