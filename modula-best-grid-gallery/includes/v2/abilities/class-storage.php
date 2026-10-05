<?php
/** Existing storage connections: pure catalog reads and explicit WordPress representations. */
namespace Modula\V2\Abilities;

use WPChill\Folders\Mutation_Lock;
use WPChill\Folders\Rest\Connections_Controller;
use WPChill\Folders\Rest\Source_Groups_Controller;
use WPChill\Folders\Rest\Folders_Controller;
use WPChill\Folders\Storage\S3_Compatible_Source_Group_List_Adapter;
use WPChill\Folders\Storage\Option_Provider_Map_Repository;
use WPChill\Folders\Storage\Cloud_Delete_Service;
use WPChill\Folders\Storage\Folder_Transfer_State;
defined( 'ABSPATH' ) || exit;
final class Storage {
	public const LISTING  = 'modula/list-storage-connections';
	public const BROWSE   = 'modula/browse-storage';
	public const INGEST   = 'modula/ingest-storage-object';
	public const DELETE = 'modula/delete-storage-object';
	public const UNINGEST = 'modula/uningest-storage-object';
	public static function mutations(): array {
		return array( self::INGEST, self::UNINGEST, self::DELETE ); }
	public static function available(): bool {
		return Media_Folders::can_manage() && Folders_Dependency::available( 'usage' ) && class_exists( Connections_Controller::class ) && class_exists( Mutation_Lock::class ) && method_exists( S3_Compatible_Source_Group_List_Adapter::class, 'list_page' ) && method_exists( '\WPChill\Folders\Storage\S3_Compatible_Object_Store', 'head' ) && \WPChill\Folders\Plugin::instance()->config()->storage();
	}
	public static function callbacks(): array {
		return array(
			self::LISTING  => array( self::class, 'listing' ),
			self::BROWSE   => array( self::class, 'browse' ),
			self::INGEST   => array( self::class, 'ingest' ),
			self::UNINGEST => array( self::class, 'uningest' ),
			self::DELETE => array( self::class, 'delete' ),
		); }
	public static function result_schema(): array {
		return Contract::object(
			array(
				'attachment_id'  => array( 'type' => 'integer' ),
				'phase'          => array( 'type' => 'string' ),
				'representation' => array( 'type' => 'string' ),
				'mapping'        => array( 'type' => 'string' ),
				'remote_bytes'   => array( 'type' => 'string' ),
				'remote_deleted' => array( 'type' => 'integer', 'minimum' => 0 ),
				'remote_total' => array( 'type' => 'integer', 'minimum' => 0 ),
			),
			array( 'attachment_id', 'phase', 'representation', 'mapping', 'remote_bytes' )
		);
	}
	public static function definitions(): array {
		$string     = array(
			'type'      => 'string',
			'maxLength' => 1024,
		);
		$connection = array(
			'type'      => 'string',
			'minLength' => 1,
			'maxLength' => 100,
			'pattern'   => '^[A-Za-z0-9-]+$',
		);
		$entry      = Contract::object(
			array(
				'key'           => $string,
				'name'          => $string,
				'kind'          => array(
					'type' => 'string',
					'enum' => array( 'prefix', 'object' ),
				),
				'attachment_id' => array( 'type' => 'integer' ),
			),
			array( 'key', 'name', 'kind', 'attachment_id' )
		);
		$common     = array(
			'schema_version' => array( 'type' => 'string' ),
			'revision'       => Contract::revision_schema(),
		);
		$names      = array(
			self::LISTING  => array(
				'input_schema'  => Contract::object( Contract::pagination() ) + array( 'default' => array() ),
				'output_schema' => Contract::object(
					Contract::page_output() + $common + array(
						'connections' => array(
							'type'  => 'array',
							'items' => Contract::object(
								array(
									'id'   => $connection,
									'name' => $string,
								),
								array( 'id', 'name' )
							),
						),
					),
					array( 'schema_version', 'revision', 'page', 'per_page', 'total', 'total_pages', 'connections' )
				),
			),
			self::BROWSE   => array(
				'input_schema'  => Contract::object(
					array(
						'connection_id' => $connection,
						'prefix'        => $string,
						'cursor'        => array(
							'type'      => 'string',
							'maxLength' => 4096,
						),
						'per_page'      => array(
							'type'    => 'integer',
							'minimum' => 1,
							'maximum' => 100,
						),
					),
					array( 'connection_id' )
				),
				'output_schema' => Contract::object(
					$common + array(
						'entries'     => array(
							'type'  => 'array',
							'items' => $entry,
						),
						'next_cursor' => array( 'type' => 'string' ),
					),
					array( 'schema_version', 'revision', 'entries', 'next_cursor' )
				),
			),
			self::INGEST   => array(
				'input_schema'  => Contract::object(
					array(
						'request_id'    => Contract::request_id_schema(),
						'revision'      => Contract::revision_schema(),
						'connection_id' => $connection,
						'key'           => $string + array( 'minLength' => 1 ),
					),
					array( 'request_id', 'revision', 'connection_id', 'key' )
				),
				'output_schema' => Contract::outcome_schema(),
			),
			self::UNINGEST => array(
				'input_schema'  => Contract::object(
					array(
						'request_id'       => Contract::request_id_schema(),
						'id'               => array(
							'type'    => 'integer',
							'minimum' => 1,
						),
						'revision'         => Contract::revision_schema(),
						'storage_revision' => Contract::revision_schema(),
					),
					array( 'request_id', 'id', 'revision', 'storage_revision' )
				),
				'output_schema' => Contract::outcome_schema(),
			),
		);
		$names[ self::DELETE ] = $names[ self::UNINGEST ];
		$names[ self::DELETE ]['input_schema']['properties']['connection_id'] = $connection;
		$names[ self::DELETE ]['input_schema']['properties']['key'] = $string + array( 'minLength' => 1 );
		$names[ self::DELETE ]['input_schema']['required'] = array_merge( $names[ self::DELETE ]['input_schema']['required'], array( 'connection_id', 'key' ) );
		foreach ( $names as $name => &$definition ) {
			$definition['label']       = str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name );
			$definition['description'] = 'Existing entitled storage only; current upload/organizer rights. Read-only connections expose id/name, never credentials, bucket, endpoint or signed URLs. Browse uses provider pagination, 1–100 entries, opaque next_cursor; errors are explicit. Reads never ingest or reconfigure. Ingest requires the current listing/browse organization revision and reuses an existing authorized mapping; no folder assignment. Uningest requires read-attachment revision plus listing/browse storage_revision, delete permission and no known usage; removes only the WordPress representation, preserving remote and local bytes. Active transfers refused. Mutations retain phases and IDs for 30 days; replay/uncertainty never repeats effects.';
		}
		$names[ self::DELETE ]['description'] = 'Explicit guarded cloud delete of one ingested attachment and its original/generated remote objects. Requires exact connection_id/key, read-attachment revision, storage_revision, current read/edit/delete/upload/organizer permissions and no known usage or active transfer. Actual WordPress refusal occurs before any provider DELETE. Local files are preserved. Each failed or uncertain phase reports retained representation/mapping/remote state. Same request never repeats effects; recover for 30 days.';
		return $names;
	}
	public static function listing( array $input ) {
		if ( ! self::available() ) {
			return new \WP_Error( 'modula_forbidden', 'Storage unavailable.' ); }
		$rows = array();
		foreach ( Connections_Controller::service()->list_all() as $row ) {
			$rows[] = array(
				'id'   => (string) $row['id'],
				'name' => (string) ( $row['name'] ?? $row['id'] ),
			); }
		return Media_Folders::page( $input, $rows, 'connections' ) + array( 'revision' => Revision::organization() );
	}
	public static function browse( array $input ) {
		if ( ! self::available() ) {
			return new \WP_Error( 'modula_forbidden', 'Storage unavailable.' ); }
		$connection = Connections_Controller::service()->find( $input['connection_id'] );
		if ( ! $connection ) {
			return new \WP_Error( 'modula_storage_unavailable', 'Storage connection unavailable.' ); }
		$revision = Revision::organization();
		$result   = ( new S3_Compatible_Source_Group_List_Adapter( $connection ) )->list_page( $input['prefix'] ?? '', $input['cursor'] ?? '', $input['per_page'] ?? 20 );
		if ( is_wp_error( $result ) ) {
			return new \WP_Error( 'modula_storage_read_failed', 'Remote listing could not be confirmed. No representation was changed.' ); }
		$maps = new Option_Provider_Map_Repository();
		foreach ( $result['entries'] as &$row ) {
			unset( $row['ingested'] );
			$id                   = 'object' === $row['kind'] ? $maps->find_attachment_id( $input['connection_id'], $row['key'] ) : 0;
			$row['attachment_id'] = $id && Attachments::can_read( $id ) ? (int) $id : 0;
		}
		if ( ! hash_equals( $revision, Revision::organization() ) ) {
			return new \WP_Error( 'modula_read_conflict', 'Storage changed during inspection.' ); }
		return array(
			'schema_version' => Contract::VERSION,
			'revision'       => $revision,
		) + $result;
	}
	public static function can_recover( array $record ): bool {
		if ( ! self::available() ) {
			return false; }
		$id = (int) ( $record['storage']['attachment_id'] ?? $record['target'] );
		if ( ! $id ) {
			return true; }
		if ( get_post( $id ) ) {
			return Attachments::can_read( $id ) && ( ! in_array( $record['operation'], array( self::UNINGEST, self::DELETE ), true ) || current_user_can( 'delete_post', $id ) ); }
		if ( ! in_array( $record['operation'], array( self::UNINGEST, self::DELETE ), true ) || empty( $record['required_caps'] ) ) {
			return false; }
		foreach ( $record['required_caps'] as $cap ) {
			if ( ! current_user_can( $cap ) ) {
				return false; }
		}
		return true;
	}
	public static function ingest( array $input ): array {
		return self::execute( $input, self::INGEST ); }
	public static function uningest( array $input ): array {
		return self::execute( $input, self::UNINGEST ); }
	public static function delete( array $input ): array {
		return self::execute( $input, self::DELETE ); }
	private static function execute( array $input, string $operation ): array {
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$out    = static function ( $status, $code = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, $code ? 'Inspect retained phases and representation before a new request.' : '', $operation );
		};
		$remove = in_array( $operation, array( self::UNINGEST, self::DELETE ), true );
		if ( ! self::available() || ( $remove && ( ! Attachments::can_read( $input['id'] ) || ! current_user_can( 'delete_post', $input['id'] ) ) ) ) {
			return $out( 'forbidden', 'current_permission_denied' ); }
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$progress = array(
			'attachment_id'  => $input['id'] ?? 0,
			'phase'          => 'validation',
			'representation' => 'uncertain',
			'mapping'        => 'uncertain',
			'remote_bytes'   => self::DELETE === $operation ? 'uncertain' : 'unchanged',
		);
		try {
			Requests::context(
				$input['request_id'],
				array(
					'storage'       => $progress,
					'required_caps' => ! $remove ? array() : ( self::DELETE === $operation ? array_values( array_unique( array_merge( map_meta_cap( 'read_post', get_current_user_id(), $input['id'] ), map_meta_cap( 'edit_post', get_current_user_id(), $input['id'] ), map_meta_cap( 'delete_post', get_current_user_id(), $input['id'] ) ) ) ) : map_meta_cap( 'delete_post', get_current_user_id(), $input['id'] ) ),
				)
			);
			$locked_result = Mutation_Lock::run(
				'storage',
				static function () use ( $input, $operation, $remove, $out, &$progress ) {
					$active  = false;
					$capture = null;
					try {
						Revision::begin();
						$active = true;
						$progress['remote_bytes'] = 'unchanged';
						Revision::attachment_usage();
						if ( ! hash_equals( Revision::organization( true ), $remove ? $input['storage_revision'] : $input['revision'] ) || ( $remove && ! hash_equals( Revision::document( $input['id'], true ), $input['revision'] ) ) ) {
							throw new \DomainException( 'stale_revision' ); }
						if ( ! self::available() || ( $remove && ( ! Attachments::can_read( $input['id'] ) || ! current_user_can( 'delete_post', $input['id'] ) ) ) ) {
							throw new \DomainException( 'current_permission_denied' ); }
						if ( ( new Folder_Transfer_State() )->has_active() ) {
							throw new \DomainException( 'transfer_active' ); }
						$maps = new Option_Provider_Map_Repository();
						if ( $remove ) {
							$map = $maps->find_by_attachment( $input['id'] );
							if ( ! $map ) {
								throw new \DomainException( 'not_ingested' ); }
							if ( Attachment_Lifecycle::used( $input['id'] ) ) {
								throw new \DomainException( 'attachment_in_use' ); }
							if ( self::DELETE === $operation ) {
								if ( $map['connection_id'] !== $input['connection_id'] || $map['key'] !== $input['key'] ) { throw new \DomainException( 'storage_target_mismatch' ); }
								$result = ( new Cloud_Delete_Service( $maps, Folders_Controller::membership_service(), new \WPChill\Folders\Storage\S3_Compatible_Object_Store(), Connections_Controller::service() ) )->delete_from_bucket( $input['id'], static function ( $phase ) use ( &$progress, &$active, $input ) {
									$progress = array_merge( $progress, $phase );
									Requests::context( $input['request_id'], array( 'storage' => $progress ) );
									// Commit WordPress's successful deletion and the first remote
									// checkpoint together, before any irreversible provider call.
									// Subsequent progress is autocommitted and survives process death.
									if ( $active && 'remote' === $phase['phase'] ) { Revision::end( true ); $active = false; }
								} );
								if ( is_wp_error( $result ) ) {
									if ( 'unchanged' === $progress['remote_bytes'] ) { throw new \DomainException( 'cloud_delete_refused' ); }
									throw new \RuntimeException( 'Cloud effects unconfirmed.' );
								}
							} else {
								$progress['phase'] = 'uningest';
								$result = ( new Cloud_Delete_Service( $maps, Folders_Controller::membership_service() ) )->uningest( $input['id'] );
								if ( is_wp_error( $result ) ) { throw new \DomainException( 'uningest_refused' ); }
							}
							if ( is_wp_error( $result ) || get_post( $input['id'] ) || $maps->find_by_attachment( $input['id'] ) || $maps->find_attachment_id( $map['connection_id'], $map['key'] ) ) { throw new \RuntimeException( 'Representation removal unconfirmed.' ); }
							$progress['representation'] = 'removed';
							$progress['mapping']        = 'removed';
						} else {
							$key = $input['key'];
							if ( '/' === substr( $key, -1 ) || false !== strpos( $key, '..' ) || false !== strpos( $key, '\\' ) || '/' === $key[0] || preg_match( '/[\x00-\x1f]/', $key ) ) {
								throw new \DomainException( 'invalid_object_key' ); }
							$connection = Connections_Controller::service()->find( $input['connection_id'] );
							if ( ! $connection ) {
								throw new \DomainException( 'connection_unavailable' ); }
							$id = $maps->find_attachment_id( $input['connection_id'], $key );
							if ( $id && ! Attachments::can_read( $id ) ) {
								throw new \DomainException( 'current_permission_denied' ); }
							// Provider HEAD verifies existence without downloading or modifying the object.
							$remote = ( new \WPChill\Folders\Storage\S3_Compatible_Object_Store() )->head( $connection, $key );
							if ( is_wp_error( $remote ) ) {
								throw new \DomainException( 'remote_object_unconfirmed' ); }
							$progress['phase'] = 'ingest';
							$capture           = static function ( $id ) use ( &$progress ) {
								$progress['attachment_id'] = (int) $id;
							};
							add_action( 'add_attachment', $capture, -999 );
							$result = Source_Groups_Controller::ingest_service()->ingest( $input['connection_id'], $key );
							remove_action( 'add_attachment', $capture, -999 );
							$capture = null;
							if ( is_wp_error( $result ) ) {
								throw new \RuntimeException( 'Ingest unconfirmed.' ); }
							$progress['attachment_id'] = (int) $result['attachment_id'];
							if ( (int) $maps->find_attachment_id( $input['connection_id'], $key ) !== $progress['attachment_id'] || ! get_post( $progress['attachment_id'] ) ) {
								throw new \RuntimeException( 'Mapping unconfirmed.' ); }
							$progress['representation'] = $id ? 'reused' : 'created';
							$progress['mapping']        = 'present';
						}
						$progress['phase'] = 'completed';
						// Retain identities in the same commit as the representation and mapping.
						Requests::context( $input['request_id'], array( 'storage' => $progress ) );
						$response = Requests::finish( $input['request_id'], $out( 'succeeded' ) + array( 'storage' => $progress ) );
						if ( $active ) { Revision::end( true ); }
						$active = false;
						return $response;
					} catch ( \Throwable $error ) {
						if ( $capture ) {
							remove_action( 'add_attachment', $capture, -999 ); }
						if ( $active ) {
							Revision::end( false ); }
						wp_cache_delete( 'wpchill_folders_storage_maps', 'options' );
						wp_cache_delete( 'alloptions', 'options' );
						wp_cache_delete( 'notoptions', 'options' );
						$id = $progress['attachment_id'];
						if ( $id ) {
							clean_post_cache( $id ); }
						$progress['representation'] = $id && get_post( $id ) ? 'retained' : 'absent';
						$progress['mapping']        = $id && ( new Option_Provider_Map_Repository() )->find_by_attachment( $id ) ? 'present' : ( ! empty( $map ) && ( new Option_Provider_Map_Repository() )->find_attachment_id( $map['connection_id'], $map['key'] ) ? 'index_retained' : 'absent' );
						$code                       = $error instanceof \DomainException ? $error->getMessage() : 'storage_effect_unconfirmed';
						return Requests::finish( $input['request_id'], $out( 'stale_revision' === $code ? 'conflict' : ( $error instanceof \DomainException ? 'rejected' : 'uncertain' ), $code ) + array( 'storage' => $progress ) );
					}
				}
			);
			return is_wp_error( $locked_result ) ? Requests::finish( $input['request_id'], $out( 'rejected', 'operation_busy' ) ) : $locked_result;
		} catch ( \Throwable $error ) {
			return Requests::finish( $input['request_id'], $out( 'uncertain', 'storage_effect_unconfirmed' ) + array( 'storage' => $progress ) ); }
	}
}
