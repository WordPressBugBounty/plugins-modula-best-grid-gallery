<?php
/** Storage descriptors, availability and authorized retained-result inspection. Pro owns execution. */
namespace Modula\V2\Abilities;

use WPChill\Folders\Mutation_Lock;
use WPChill\Folders\Rest\Connections_Controller;
use WPChill\Folders\Storage\S3_Compatible_Source_Group_List_Adapter;
defined( 'ABSPATH' ) || exit;
final class Storage {
	public const LISTING  = 'modula/list-storage-connections';
	public const BROWSE   = 'modula/browse-storage';
	public const INGEST   = 'modula/ingest-storage-object';
	public const DELETE   = 'modula/delete-storage-object';
	public const UNINGEST = 'modula/uningest-storage-object';

	/** Outcome results the Pro executor sets; delete shares the uningest schema. */
	private const RESULTS = array( 'storage' );

	/** @return array<int,string> */
	public static function names(): array {
		return array_merge( array( self::LISTING, self::BROWSE ), self::mutations() );
	}

	public static function entitled(): bool {
		return Folders_Dependency::loaded() && \WPChill\Folders\Plugin::instance()->config()->storage();
	}

	public static function can_invoke( $input = array() ): bool {
		return Media_Folders::can_manage() || Integration::can_discover();
	}

	/**
	 * Signature contract for the Pro storage executor, including its owned operation table.
	 *
	 * @return array<string,array<string,int>>
	 */
	public static function executor_methods(): array {
		return array_fill_keys(
			self::names(),
			array(
				'run'        => 2,
				'operations' => 0,
			)
		);
	}

	/** Inspect the executor signature without constructing a service. */
	public static function executor_ready( string $name ): bool {
		$methods = self::executor_methods();
		return isset( $methods[ $name ] ) && Pro_Dependency::methods( '\Modula_Pro\Abilities\Storage_Executor', $methods[ $name ] );
	}

	public static function mutations(): array {
		return array( self::INGEST, self::UNINGEST, self::DELETE ); }
	public static function available(): bool {
		return Media_Folders::can_manage() && Folders_Dependency::available( 'usage' ) && class_exists( Connections_Controller::class ) && class_exists( Mutation_Lock::class ) && method_exists( S3_Compatible_Source_Group_List_Adapter::class, 'list_page' ) && method_exists( '\WPChill\Folders\Storage\S3_Compatible_Object_Store', 'head' ) && self::entitled();
	}
	public static function callbacks(): array {
		return Storage_Explanation::callbacks_for( self::names() ); }
	/** Additional host requirements; inspection never initializes services or changes entitlement. */
	public static function blockers( string $name, array $snapshot ): array {
		$blockers = array();
		if ( ! Folders_Dependency::available( 'usage' ) ) {
			$blockers[] = Availability::blocker( 'dependency_unavailable', 'folders', 'configure_service', __( 'Restore the Folders library or complete its tables before using this operation.', 'modula-best-grid-gallery' ) );
		}
		if ( 'compatible' === $snapshot['pro_state'] && Folders_Dependency::available( 'usage' ) && ! self::entitled() ) {
			$blockers[] = Availability::blocker( 'configuration_required', 'folders', 'configure_service', __( 'Storage entitlement is required for connection inspection, ingest and guarded cloud deletion.', 'modula-best-grid-gallery' ) );
		}
		return $blockers;
	}

	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'permission'     => array( self::class, 'can_invoke' ),
				'available'      => array( self::class, 'available' ),
				'requires_pro'   => true,
				'blockers'       => array( self::class, 'blockers' ),
				'executor_ready' => array( self::class, 'executor_ready' ),
				'dependency'     => 'folders',
			),
			array(
				self::UNINGEST => array( 'destructive' => true ),
				self::DELETE   => array( 'destructive' => true ),
			)
		);
	}
	public static function result_schema(): array {
		return Contract::object(
			array(
				'attachment_id'  => array( 'type' => 'integer' ),
				'phase'          => array( 'type' => 'string' ),
				'representation' => array( 'type' => 'string' ),
				'mapping'        => array( 'type' => 'string' ),
				'remote_bytes'   => array( 'type' => 'string' ),
				'remote_deleted' => array(
					'type'    => 'integer',
					'minimum' => 0,
				),
				'remote_total'   => array(
					'type'    => 'integer',
					'minimum' => 0,
				),
			),
			array( 'attachment_id', 'phase', 'representation', 'mapping', 'remote_bytes' )
		);
	}
	public static function definitions(): array {
		$string                = array(
			'type'      => 'string',
			'maxLength' => 1024,
		);
		$connection            = array(
			'type'      => 'string',
			'minLength' => 1,
			'maxLength' => 100,
			'pattern'   => '^[A-Za-z0-9-]+$',
		);
		$entry                 = Contract::object(
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
		$common                = array(
			'schema_version' => array( 'type' => 'string' ),
			'revision'       => Contract::revision_schema(),
		);
		$names                 = array(
			self::LISTING  => array(
				'input_schema'  => Contract::object( Contract::pagination() ) + array( 'default' => array() ),
				'output_schema' => Contract::admitting(
					Contract::object(
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
					)
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
				'output_schema' => Contract::admitting(
					Contract::object(
						$common + array(
							'entries'     => array(
								'type'  => 'array',
								'items' => $entry,
							),
							'next_cursor' => array( 'type' => 'string' ),
						),
						array( 'schema_version', 'revision', 'entries', 'next_cursor' )
					)
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
				'output_schema' => Contract::outcome( self::INGEST, self::RESULTS ),
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
				'output_schema' => Contract::outcome( self::UNINGEST, self::RESULTS ),
			),
		);
		$names[ self::DELETE ] = $names[ self::UNINGEST ];
		$names[ self::DELETE ]['input_schema']['properties']['connection_id'] = $connection;
		$names[ self::DELETE ]['input_schema']['properties']['key']           = $string + array( 'minLength' => 1 );
		$names[ self::DELETE ]['input_schema']['required']                    = array_merge( $names[ self::DELETE ]['input_schema']['required'], array( 'connection_id', 'key' ) );
		foreach ( $names as $name => &$definition ) {
			$definition['label']       = str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name );
			$definition['description'] = 'Existing entitled storage only; current upload/organizer rights. Read-only connections expose id/name, never credentials, bucket, endpoint or signed URLs. Browse uses provider pagination, 1–100 entries, opaque next_cursor; errors are explicit. Reads never ingest or reconfigure. Ingest requires the current listing/browse organization revision and reuses an existing authorized mapping; no folder assignment. Uningest requires read-attachment revision plus listing/browse storage_revision, delete permission and no known usage; removes only the WordPress representation, preserving remote and local bytes. Active transfers refused. Mutations retain phases and IDs for 30 days; replay/uncertainty never repeats effects.';
		}
		$names[ self::DELETE ]['description'] = 'Explicit guarded cloud delete of one ingested attachment and its original/generated remote objects. Requires exact connection_id/key, read-attachment revision, storage_revision, current read/edit/delete/upload/organizer permissions and no known usage or active transfer. Actual WordPress refusal occurs before any provider DELETE. Local files are preserved. Each failed or uncertain phase reports retained representation/mapping/remote state. Same request never repeats effects; recover for 30 days.';
		return $names;
	}
	public static function can_recover( array $record ): bool {
		if ( ! Media_Folders::can_manage() ) {
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
}
