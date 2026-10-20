<?php
/** Transfer descriptors, availability and read-only recovery through the library-owned queue. */
namespace Modula\V2\Abilities;

use WPChill\Folders\Rest\Folder_Transfers_Controller;
use WPChill\Folders\Storage\Folder_Transfer_State;

defined( 'ABSPATH' ) || exit;
final class Transfers {
	public const LIBRARY = 'modula/start-library-offload';
	public const START   = 'modula/start-folder-transfer';
	public const READ    = 'modula/read-folder-transfer';
	public const CANCEL  = 'modula/cancel-folder-transfer';

	/** Outcome results the Pro executor sets. */
	private const RESULTS = array( 'transfer' );
	/** @return array<int,string> */
	public static function names(): array {
		return array( self::START, self::LIBRARY, self::READ, self::CANCEL ); }
	public static function mutations(): array {
		return array( self::START, self::LIBRARY, self::CANCEL ); }

	/**
	 * Signature contract for the Pro transfer executor, including its owned operation table.
	 *
	 * @return array<string,array<string,int>>
	 */
	public static function executor_methods(): array {
		return array_fill_keys(
			self::names(),
			array(
				'run'        => 2,
				'operations' => 0,
				// The executor owns its execution check; an older one calls the Lite check that no longer exists.
				'available'  => 0,
			)
		);
	}

	/** Inspect the executor signature without constructing a service. */
	public static function executor_ready( string $name ): bool {
		$methods = self::executor_methods();
		return isset( $methods[ $name ] ) && Pro_Dependency::methods( '\Modula_Pro\Abilities\Transfer_Executor', $methods[ $name ] );
	}

	public static function can_invoke( $input = array() ): bool {
		return Media_Folders::can_manage() || Integration::can_discover(); }
	public static function callbacks(): array {
		return Transfer_Explanation::callbacks_for( self::names() ); }
	/** Additional host requirements; inspection never initializes services or changes entitlement. */
	public static function blockers( string $name, array $snapshot ): array {
		$blockers = array();
		if ( ! self::inspect_ready() ) {
			$blockers[] = Availability::blocker( 'dependency_unavailable', 'folders', 'configure_service', __( 'Restore the Folders library or complete its tables before using this operation.', 'modula-best-grid-gallery' ) );
		}
		if ( 'compatible' === $snapshot['pro_state'] && self::inspect_ready() && ! Storage::entitled() ) {
			$blockers[] = Availability::blocker( 'configuration_required', 'folders', 'configure_service', __( 'Storage entitlement is required for folder offload, onload and library offload.', 'modula-best-grid-gallery' ) );
		}
		return $blockers;
	}

	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'permission'     => array( self::class, 'can_invoke' ),
				// Transfer state readiness is explained by blockers(); storage services and media administration gate discovery.
				'available'      => array( Storage::class, 'available' ),
				'requires_pro'   => true,
				'blockers'       => array( self::class, 'blockers' ),
				'executor_ready' => array( self::class, 'executor_ready' ),
				'dependency'     => 'folders',
			),
			array(
				self::START   => array( 'destructive' => true ),
				self::LIBRARY => array( 'destructive' => true ),
				self::CANCEL  => array( 'destructive' => true ),
			)
		);
	}
	public static function inspect_ready(): bool {
		return Folders_Dependency::available( 'usage' ) && method_exists( Folder_Transfer_State::class, 'retained' ); }
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
				'request_id'    => Contract::request_id_schema(),
				'revision'      => Contract::revision_schema(),
				'connection_id' => array(
					'type'      => 'string',
					'minLength' => 1,
					'maxLength' => 100,
				),
				'scope'         => array(
					'type' => 'string',
					'enum' => array( 'entire_library' ),
				),
			),
			self::START   => array(
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
			self::READ    => array( 'job_id' => $job ),
			self::CANCEL  => array(
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
				'output_schema' => self::READ === $name ? Contract::admitting(
					Contract::object(
						array(
							'schema_version' => array( 'type' => 'string' ),
							'transfer'       => self::result_schema(),
						),
						array( 'schema_version', 'transfer' )
					)
				) : Contract::outcome( $name, self::RESULTS ),
			);
		}
		return $defs;
	}
	public static function authorized( string $id ): bool {
		if ( ! self::inspect_ready() ) {
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
	public static function can_recover( array $record ): bool {
		return Media_Folders::can_manage() && ( empty( $record['job_id'] ) || self::authorized( $record['job_id'] ) ); }
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
}
