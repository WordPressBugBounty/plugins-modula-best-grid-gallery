<?php
/** Source-aware Beta bound galleries, with explicit creation and exclusions. */
namespace Modula\V2\Abilities;

use Modula\Bound_Gallery\Bound_Gallery;
use Modula\V2\Meta_Sync;
use WPChill\Folders\Mutation_Lock;
use WPChill\Folders\Rest\Folders_Controller;
use WPChill\Folders\Rest\Connections_Controller;
use WPChill\Folders\Rest\Source_Groups_Controller;
use WPChill\Folders\Storage\S3_Compatible_Source_Group_List_Adapter;

defined( 'ABSPATH' ) || exit;
final class Bound {
	public const SOURCE  = 'modula/read-bind-target';
	public const READ    = 'modula/read-bound-gallery';
	public const CREATE  = 'modula/create-bound-gallery';
	public const EXCLUDE = 'modula/update-bound-exclusions';
	public static function mutations(): array {
		return array( self::CREATE, self::EXCLUDE ); }
	public static function callbacks(): array {
		return array(
			self::SOURCE  => array( self::class, 'source' ),
			self::READ    => array( self::class, 'read' ),
			self::CREATE  => array( self::class, 'create' ),
			self::EXCLUDE => array( self::class, 'exclude' ),
		); }
	public static function available(): bool {
		return Media_Folders::can_manage() && class_exists( Bound_Gallery::class ) && Bound_Gallery::is_entitled() && class_exists( Mutation_Lock::class ); }
	private static function target_schema(): array {
		return Contract::object(
			array(
				'type'          => array(
					'type' => 'string',
					'enum' => array( 'media_folder', 'remote_prefix' ),
				),
				'folder_id'     => array(
					'type'    => 'integer',
					'minimum' => 1,
				),
				'connection_id' => array(
					'type'      => 'string',
					'maxLength' => 100,
				),
				'prefix'        => array(
					'type'      => 'string',
					'minLength' => 1,
					'maxLength' => 1024,
				),
			),
			array( 'type' )
		);
	}
	public static function definitions(): array {
		$id   = array(
			'type'    => 'integer',
			'minimum' => 1,
		);
		$ids  = array(
			'type'        => 'array',
			'maxItems'    => 1000,
			'uniqueItems' => true,
			'items'       => $id,
		);
		$defs = array(
			self::SOURCE  => array( 'target' => self::target_schema() ),
			self::CREATE  => array(
				'request_id' => Contract::request_id_schema(),
				'revision'   => Contract::revision_schema(),
				'target'     => self::target_schema(),
				'title'      => array(
					'type'      => 'string',
					'minLength' => 1,
					'maxLength' => 200,
				),
				'status'     => array(
					'type' => 'string',
					'enum' => array( 'draft', 'publish' ),
				),
			),
			self::READ    => array( 'id' => $id ),
			self::EXCLUDE => array(
				'request_id'     => Contract::request_id_schema(),
				'revision'       => Contract::revision_schema(),
				'id'             => $id,
				'action'         => array(
					'type' => 'string',
					'enum' => array( 'hide', 'restore' ),
				),
				'attachment_ids' => array(
					'minItems' => 1,
					'maxItems' => 100,
				) + $ids,
			),
		);
		foreach ( $defs as $name => $props ) {
			$output = Contract::outcome_schema();
			if ( self::SOURCE === $name ) {
				$output = Contract::object(
					array(
						'schema_version'  => array( 'type' => 'string' ),
						'revision'        => Contract::revision_schema(),
						'attachment_ids'  => $ids,
						'unknown_objects' => array( 'type' => 'integer' ),
					),
					array( 'schema_version', 'revision', 'attachment_ids', 'unknown_objects' )
				); }
			if ( self::READ === $name ) {
				$output = Contract::object(
					array(
						'schema_version' => array( 'type' => 'string' ),
						'revision'       => Contract::revision_schema(),
						'gallery'        => Contract::gallery_schema(),
						'target'         => self::target_schema(),
						'exclusions'     => $ids,
						'items'          => array(
							'type'  => 'array',
							'items' => Contract::item_schema(),
						),
					),
					array( 'schema_version', 'revision', 'gallery', 'target', 'exclusions', 'items' )
				); }
			$defs[ $name ] = array(
				'label'         => str_replace( '-', ' ', substr( $name, 7 ) ),
				'description'   => 'Compatible Pro bound galleries. Direct source only, at most 1000 entries. Media folder target requires folder_id; remote_prefix requires connection_id and non-root trailing-slash prefix. Pure source/gallery reads never ingest. Explicit creation ingests missing direct remote images and requires draft/publish intent. Hide/restore 1–100 source image IDs preserves all gallery-local rows, layout, media text and bytes. Source-aware revisions include organizer membership, provider mapping and live prefix listing. No rebinding or unbinding. Thirty-day recovery; inaccessible source/media refused.',
				'input_schema'  => Contract::object( $props, array_keys( $props ) ),
				'output_schema' => $output,
			);
		}
		return $defs;
	}
	/** Pure source inspection; no repairs or ingestion. */
	private static function inspect( array $target, bool $lock = false ): array {
		if ( ! self::available() ) {
			throw new \DomainException( 'current_permission_denied' ); }
		$org     = Revision::organization( $lock );
		$ids     = array();
		$keys    = array();
		$unknown = array();
		if ( 'media_folder' === $target['type'] ) {
			if ( empty( $target['folder_id'] ) || isset( $target['connection_id'] ) || isset( $target['prefix'] ) || ! Folders_Controller::service()->find( $target['folder_id'] ) ) {
				throw new \DomainException( 'source_unavailable' ); }
			$ids = Bound_Gallery::direct_attachment_ids( $target['folder_id'] );
		} else {
			$prefix = $target['prefix'] ?? '';
			if ( ! Storage::available() || isset( $target['folder_id'] ) || '' === $prefix || '/' === $prefix[0] || '/' !== substr( $prefix, -1 ) || preg_match( '/[\x00-\x1f\\\\]/', $prefix ) || false !== strpos( $prefix, '..' ) ) {
				throw new \DomainException( 'invalid_prefix' ); }
			$conn = Connections_Controller::service()->find( $target['connection_id'] ?? '' );
			if ( ! $conn ) {
				throw new \DomainException( 'source_unavailable' ); }
			$cursor  = '';
			$seen    = array();
			$pages   = 0;
			$adapter = new S3_Compatible_Source_Group_List_Adapter( $conn );
			do {
				$page = $adapter->list_page( $prefix, $cursor, 100 );
				if ( is_wp_error( $page ) ) {
					throw new \DomainException( 'source_read_failed' ); }
				foreach ( \WPChill\Folders\Storage\WordPress_Image_Size_Key::omit_from_children( $page['entries'] ) as $entry ) {
					if ( 'object' !== $entry['kind'] ) {
						continue; }
					$keys[] = $entry['key'];
					$id     = Source_Groups_Controller::provider_maps()->find_attachment_id( $target['connection_id'], $entry['key'] );
					if ( $id ) {
						$ids[] = (int) $id;
					} else {
						$unknown[] = $entry['key']; }
				}
				$cursor = $page['next_cursor'];
				if ( ++$pages > 100 ) {
					throw new \DomainException( 'source_scan_limit_exceeded' ); }
				if ( count( $keys ) > 1000 || ( $cursor && isset( $seen[ $cursor ] ) ) ) {
					throw new \DomainException( 'source_limit_exceeded' ); }
				$seen[ $cursor ] = true;
			} while ( $cursor );
		}
		if ( count( $ids ) > 1000 || ! Creation::can_use_attachments( $ids ) ) {
			throw new \DomainException( 'source_media_unavailable' ); }
		$states = array();
		foreach ( $ids as $id ) {
			$states[] = Revision::document( $id, $lock ); }
		if ( ! hash_equals( $org, Revision::organization( $lock ) ) ) {
			throw new \DomainException( 'source_changed' ); }
		return array(
			'ids'      => $ids,
			'unknown'  => $unknown,
			'revision' => hash( 'sha256', wp_json_encode( array( $target, $org, $keys, $ids, $states ) ) ),
		);
	}
	public static function source( array $input ) {
		try {
			$source = self::inspect( $input['target'] );
			return array(
				'schema_version'  => Contract::VERSION,
				'revision'        => $source['revision'],
				'attachment_ids'  => $source['ids'],
				'unknown_objects' => count( $source['unknown'] ),
			); } catch ( \Throwable $error ) {
			return new \WP_Error( 'modula_source_unavailable', 'Source is unavailable, inaccessible, changed or exceeds the bounded catalog.' ); }
	}
	private static function target( int $id ): array {
		if ( ! Integration::can_read_post( $id ) || ! Bound_Gallery::is_bound( $id ) || 'trash' === get_post_status( $id ) ) {
			throw new \DomainException( 'unsupported_target' ); }
		$type  = get_post_meta( $id, Bound_Gallery::META_TARGET_TYPE, true );
		$value = get_post_meta( $id, Bound_Gallery::META_TARGET_ID, true );
		if ( 'media_folder' === $type ) {
			return array(
				'type'      => $type,
				'folder_id' => (int) $value,
			); }
		$parsed = Bound_Gallery::parse_remote_prefix_target( $value );
		if ( ! $parsed ) {
			throw new \DomainException( 'source_unavailable' ); }
		return array( 'type' => 'remote_prefix' ) + $parsed;
	}
	private static function revision( int $id, array $source, bool $lock = false ): string {
		return hash( 'sha256', Revision::state( $id, $lock ) . $source['revision'] ); }
	public static function read( array $input ) {
		try {
			$id       = $input['id'];
			$target   = self::target( $id );
			$source   = self::inspect( $target );
			$revision = self::revision( $id, $source );
			$items    = Bound_Gallery::apply_derived_catalog( $id, Meta_Sync::get_images_v2( $id ) );
			foreach ( $items as &$item ) {
				$item['itemKind'] = \Modula\V2\Images\Adapter::get_item_kind( $item );
				$item             = Contract::project( $item, Contract::item_schema() );
			} unset( $item );
			if ( ! hash_equals( $revision, self::revision( $id, self::inspect( $target ) ) ) ) {
				throw new \DomainException( 'source_changed' ); }
			return array(
				'schema_version' => Contract::VERSION,
				'revision'       => $revision,
				'gallery'        => Contract::project( Integration::gallery( get_post( $id ) ), Contract::gallery_schema() ),
				'target'         => $target,
				'exclusions'     => Bound_Gallery::get_exclusions( $id ),
				'items'          => $items,
			);
		} catch ( \Throwable $error ) {
			return new \WP_Error( 'modula_bound_unavailable', 'Current bound gallery and source access required; retry inspection if the source changed.' ); }
	}
	public static function can_recover( array $record ): bool {
		if ( ! self::available() || ( self::CREATE === $record['operation'] && ! Creation::can_create( $record['publication'] ) ) || ( $record['target'] && ! Integration::can_read_post( $record['target'] ) ) ) {
			return false; }
		try {
			if ( isset( $record['bind_target'] ) ) {
				self::inspect( $record['bind_target'] );
			} return true;
		} catch ( \Throwable $error ) {
			return false; }
	}
	public static function create( array $input ): array {
		return self::execute( $input, self::CREATE ); }
	public static function exclude( array $input ): array {
		return self::execute( $input, self::EXCLUDE ); }
	private static function execute( array $input, string $operation ): array {
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$out    = static function ( $status, $code = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, '', $operation );
		};
		$create = self::CREATE === $operation;
		if ( ! self::available() || ( $create ? ! Creation::can_create( $input['status'] ) : ! Update::can_update( $input['id'] ) ) ) {
			return $out( 'forbidden', 'current_permission_denied' ); }
		if ( $create && '' === trim( sanitize_text_field( $input['title'] ) ) ) {
			return $out( 'rejected', 'invalid_title' ); }
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		try {
			$result = Mutation_Lock::run(
				'storage',
				static function () use ( $input, $operation, $create, $out ) {
					$active = false;
					try {
						Revision::begin();
						$active   = true;
						$target   = $create ? $input['target'] : self::target( $input['id'] );
						$source   = self::inspect( $target, true );
						$revision = $create ? $source['revision'] : self::revision( $input['id'], $source, true );
						if ( ! hash_equals( $input['revision'], $revision ) ) {
							throw new \DomainException( 'stale_revision' ); }
						Requests::context( $input['request_id'], array( 'bind_target' => $target ) );
						$id = $input['id'] ?? 0;
						if ( $create ) {
							foreach ( $source['unknown'] as $key ) {
								$ingest = Source_Groups_Controller::ingest_service()->ingest( $target['connection_id'], $key );
								if ( is_wp_error( $ingest ) ) {
									throw new \RuntimeException( 'Ingest unconfirmed.' ); }
								$source['ids'][] = (int) $ingest['attachment_id'];
							}
							if ( ! Creation::can_use_attachments( $source['ids'] ) ) {
								throw new \DomainException( 'source_media_unavailable' ); }
							$id = wp_insert_post(
								wp_slash(
									array(
										'post_type'   => 'modula-gallery',
										'post_status' => 'draft',
										'post_title'  => sanitize_text_field( $input['title'] ),
										'post_author' => get_current_user_id(),
										'meta_input'  => array(
											'_modula_beta' => 1,
											Bound_Gallery::META_TARGET_TYPE => $target['type'],
											Bound_Gallery::META_TARGET_ID => 'media_folder' === $target['type'] ? (string) $target['folder_id'] : Bound_Gallery::remote_prefix_target_id( $target['connection_id'], $target['prefix'] ),
										),
									)
								),
								true
							);
							if ( is_wp_error( $id ) || ! $id || ! Requests::target( $input['request_id'], $id ) ) {
								throw new \RuntimeException( 'Target unconfirmed.' ); }
							Meta_Sync::apply_new_beta_gallery_create_defaults( $id );
							$rows = Bound_Gallery::apply_derived_catalog( $id, array() );
							if ( is_wp_error( Meta_Sync::persist_merged_gallery_items( $id, $rows, false ) ) ) {
								throw new \RuntimeException( 'Catalog unconfirmed.' ); }
							if ( ! self::available() || ! Creation::can_create( $input['status'] ) || ! Creation::can_use_attachments( $source['ids'] ) ) {
								throw new \DomainException( 'current_permission_denied' ); }
							if ( 'publish' === $input['status'] ) {
								wp_update_post(
									array(
										'ID'          => $id,
										'post_status' => 'publish',
									),
									true
								); }
							if ( get_post_status( $id ) !== $input['status'] ) {
								throw new \RuntimeException( 'Publication unconfirmed.' ); }
						} else {
							if ( array_diff( $input['attachment_ids'], array_unique( array_merge( $source['ids'], Bound_Gallery::get_exclusions( $id ) ) ) ) || ! Creation::can_use_attachments( $input['attachment_ids'] ) ) {
								throw new \DomainException( 'invalid_source_members' ); }
							foreach ( $input['attachment_ids'] as $attachment_id ) {
								if ( 'hide' === $input['action'] ) {
									Bound_Gallery::exclude_attachment( $id, $attachment_id );
								} else {
														Bound_Gallery::restore_attachment( $id, $attachment_id ); }
							}
							$excluded = Bound_Gallery::get_exclusions( $id );
							if ( 'hide' === $input['action'] ? array_diff( $input['attachment_ids'], $excluded ) : array_intersect( $input['attachment_ids'], $excluded ) ) {
								throw new \RuntimeException( 'Exclusions unconfirmed.' ); }
						}
						$after_source = self::inspect( $target, true );
						if ( ! $create && ! hash_equals( $source['revision'], $after_source['revision'] ) ) {
							throw new \DomainException( 'stale_revision' ); }
						$response = Requests::finish(
							$input['request_id'],
							$out( 'succeeded' ) + array(
								'gallery'  => Integration::gallery( get_post( $id ) ),
								'revision' => self::revision( $id, $after_source, true ),
							)
						);
						Revision::end( true );
						$active = false;
						return $response;
					} catch ( \Throwable $error ) {
						if ( $active ) {
							Revision::end( false ); }
						wp_cache_delete( 'wpchill_folders_storage_maps', 'options' );
						wp_cache_delete( 'alloptions', 'options' );
						wp_cache_delete( 'notoptions', 'options' );
						if ( isset( $id ) && is_int( $id ) && $id ) {
							clean_post_cache( $id ); }
						$code = $error instanceof \DomainException ? $error->getMessage() : 'bound_effect_unconfirmed';
						return Requests::finish( $input['request_id'], $out( 'stale_revision' === $code ? 'conflict' : ( $error instanceof \DomainException ? 'rejected' : 'uncertain' ), $code ) );
					}
				}
			);
			return is_wp_error( $result ) ? Requests::finish( $input['request_id'], $out( 'rejected', 'operation_busy' ) ) : $result;
		} catch ( \Throwable $error ) {
			return $out( 'uncertain', 'bound_effect_unconfirmed' ); }
	}
}
