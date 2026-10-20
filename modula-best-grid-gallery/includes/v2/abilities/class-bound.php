<?php
/** Source-aware Beta bound galleries, with explicit creation and exclusions. */
namespace Modula\V2\Abilities;

use Modula\Bound_Gallery\Bound_Gallery;
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

	/** Outcome results the Pro executor sets; Contract::outcome() adds the target gallery too. */
	private const RESULTS = array( 'gallery' );
	public static function mutations(): array {
		return array( self::CREATE, self::EXCLUDE );
	}
	/** @return array<int,string> */
	public static function names(): array {
		return array( self::SOURCE, self::READ, self::CREATE, self::EXCLUDE );
	}
	/**
	 * Signature contract for the Pro bound-gallery executor. Lite checks it without constructing Pro.
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
		return isset( $methods[ $name ] ) && Pro_Dependency::methods( '\Modula_Pro\Abilities\Bound_Executor', $methods[ $name ] );
	}

	public static function can_invoke( $input = array() ): bool {
		return Media_Folders::can_manage() || Integration::can_discover();
	}
	public static function services_ready(): bool {
		return class_exists( Bound_Gallery::class ) && class_exists( Mutation_Lock::class ) && Folders_Dependency::available();
	}
	public static function entitled(): bool {
		return class_exists( Bound_Gallery::class ) && Bound_Gallery::is_entitled();
	}
	public static function callbacks(): array {
		return Bound_Explanation::callbacks_for( self::names() );
	}
	/** Additional host requirements; inspection never initializes services or changes entitlement. */
	public static function blockers( string $name, array $snapshot ): array {
		$blockers = array();
		if ( ! self::services_ready() ) {
			$blockers[] = Availability::blocker( 'dependency_unavailable', 'folders', 'configure_service', __( 'Restore the Folders library or complete its tables before using this operation.', 'modula-best-grid-gallery' ) );
		}
		if ( 'compatible' === $snapshot['pro_state'] && self::services_ready() && ! self::entitled() ) {
			$blockers[] = Availability::blocker( 'configuration_required', 'modula-pro', 'configure_service', __( 'Bound galleries require the current Compatible Pro host entitlement.', 'modula-best-grid-gallery' ) );
		}
		return $blockers;
	}

	public static function abilities(): array {
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'permission'     => array( self::class, 'can_invoke' ),
				// Services and entitlement are explained by blockers(); discovery still hides gallery-only editors.
				'available'      => array( Media_Folders::class, 'can_manage' ),
				'requires_pro'   => true,
				'blockers'       => array( self::class, 'blockers' ),
				'executor_ready' => array( self::class, 'executor_ready' ),
				'dependency'     => 'folders',
			)
		);
	}
	/** Pure remote lookup also authorizes retained history after entitlement loss. */
	private static function remote_membership( array $target ): array {
		$ids     = array();
		$keys    = array();
		$unknown = array();
		$prefix  = $target['prefix'] ?? '';
		if ( ! self::remote_services_ready() || isset( $target['folder_id'] ) || '' === $prefix || '/' === $prefix[0] || '/' !== substr( $prefix, -1 ) || preg_match( '/[\x00-\x1f\\\\]/', $prefix ) || false !== strpos( $prefix, '..' ) ) {
			throw new \DomainException( 'invalid_prefix' );
		}
		$conn = Connections_Controller::service()->find( $target['connection_id'] ?? '' );
		if ( ! $conn ) {
			throw new \DomainException( 'source_unavailable' );
		}
		$cursor  = '';
		$seen    = array();
		$pages   = 0;
		$adapter = new S3_Compatible_Source_Group_List_Adapter( $conn );
		do {
			$page = $adapter->list_page( $prefix, $cursor, 100 );
			if ( is_wp_error( $page ) ) {
				throw new \DomainException( 'source_read_failed' );
			}
			$members = self::page_members( $target['connection_id'], $page['entries'] );
			$ids     = array_merge( $ids, $members['ids'] );
			$keys    = array_merge( $keys, $members['keys'] );
			$unknown = array_merge( $unknown, $members['unknown'] );
			$cursor  = $page['next_cursor'];
			if ( ++$pages > 100 ) {
				throw new \DomainException( 'source_scan_limit_exceeded' );
			}
			if ( count( $keys ) > 1000 || ( $cursor && isset( $seen[ $cursor ] ) ) ) {
				throw new \DomainException( 'source_limit_exceeded' );
			}
			$seen[ $cursor ] = true;
		} while ( $cursor );
		return array(
			'ids'     => $ids,
			'keys'    => $keys,
			'unknown' => $unknown,
		);
	}

	private static function remote_services_ready(): bool {
		return Media_Folders::can_manage()
			&& Folders_Dependency::available( 'usage' )
			&& class_exists( Connections_Controller::class )
			&& class_exists( Source_Groups_Controller::class )
			&& method_exists( S3_Compatible_Source_Group_List_Adapter::class, 'list_page' );
	}

	/** Project one provider page to attachment identities without ingestion. */
	private static function page_members( string $connection_id, array $entries ): array {
		$members = array(
			'ids'     => array(),
			'keys'    => array(),
			'unknown' => array(),
		);
		$maps    = Source_Groups_Controller::provider_maps();
		foreach ( \WPChill\Folders\Storage\WordPress_Image_Size_Key::omit_from_children( $entries ) as $entry ) {
			if ( 'object' !== $entry['kind'] ) {
				continue;
			}
			$members['keys'][] = $entry['key'];
			$id                = $maps->find_attachment_id( $connection_id, $entry['key'] );
			if ( $id ) {
				$members['ids'][] = (int) $id;
				continue;
			}
			$members['unknown'][] = $entry['key'];
		}
		return $members;
	}

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
			$output = Contract::outcome( $name, self::RESULTS );
			if ( self::SOURCE === $name ) {
				$output = Contract::admitting(
					Contract::object(
						array(
							'schema_version'  => array( 'type' => 'string' ),
							'revision'        => Contract::revision_schema(),
							'attachment_ids'  => $ids,
							'unknown_objects' => array( 'type' => 'integer' ),
						),
						array( 'schema_version', 'revision', 'attachment_ids', 'unknown_objects' )
					)
				);
			}
			if ( self::READ === $name ) {
				$output = Contract::admitting(
					Contract::object(
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
					)
				);
			}
			$defs[ $name ] = array(
				'label'         => str_replace( '-', ' ', substr( $name, 7 ) ),
				'description'   => 'Compatible Pro bound galleries. Direct source only, at most 1000 entries. Media folder target requires folder_id; remote_prefix requires connection_id and non-root trailing-slash prefix. Pure source/gallery reads never ingest. Explicit creation ingests missing direct remote images and requires draft/publish intent. Hide/restore 1–100 source image IDs preserves all gallery-local rows, layout, media text and bytes. Source-aware revisions include organizer membership, provider mapping and live prefix listing. No rebinding or unbinding. Thirty-day recovery; inaccessible source/media refused.',
				'input_schema'  => Contract::object( $props, array_keys( $props ) ),
				'output_schema' => $output,
			);
		}
		return $defs;
	}
	/**
	 * Source membership without the commercial gate. Recovery uses this so absent Pro does not hide an authorized result.
	 *
	 * @param array<string,mixed> $target
	 * @return array{ids:array<int,int>,unknown:array<int,string>,revision:string}
	 */
	public static function source_membership( array $target, bool $lock = false ): array {
		$org     = Revision::organization( $lock );
		$ids     = array();
		$keys    = array();
		$unknown = array();
		if ( 'media_folder' === $target['type'] ) {
			if ( empty( $target['folder_id'] ) || isset( $target['connection_id'] ) || isset( $target['prefix'] ) || ! Folders_Controller::service()->find( $target['folder_id'] ) ) {
				throw new \DomainException( 'source_unavailable' );
			}
			$ids = Bound_Gallery::direct_attachment_ids( $target['folder_id'] );
		} else {
			$remote  = self::remote_membership( $target );
			$ids     = $remote['ids'];
			$keys    = $remote['keys'];
			$unknown = $remote['unknown'];
		}
		if ( count( $ids ) > 1000 || ! Creation::can_use_attachments( $ids ) ) {
			throw new \DomainException( 'source_media_unavailable' );
		}
		$states = array();
		foreach ( $ids as $id ) {
			$states[] = Revision::document( $id, $lock );
		}
		if ( ! hash_equals( $org, Revision::organization( $lock ) ) ) {
			throw new \DomainException( 'source_changed' );
		}
		return array(
			'ids'      => $ids,
			'unknown'  => $unknown,
			'revision' => hash( 'sha256', wp_json_encode( array( $target, $org, $keys, $ids, $states ) ) ),
		);
	}

	public static function target( int $id ): array {
		if ( ! Integration::can_read_post( $id ) || ! Bound_Gallery::is_bound( $id ) || 'trash' === get_post_status( $id ) ) {
			throw new \DomainException( 'unsupported_target' );
		}
		$type  = get_post_meta( $id, Bound_Gallery::META_TARGET_TYPE, true );
		$value = get_post_meta( $id, Bound_Gallery::META_TARGET_ID, true );
		if ( 'media_folder' === $type ) {
			return array(
				'type'      => $type,
				'folder_id' => (int) $value,
			);
		}
		$parsed = Bound_Gallery::parse_remote_prefix_target( $value );
		if ( ! $parsed ) {
			throw new \DomainException( 'source_unavailable' );
		}
		return array( 'type' => 'remote_prefix' ) + $parsed;
	}

	public static function can_recover( array $record ): bool {
		if ( ! Media_Folders::can_manage() || ! self::services_ready() ) {
			return false;
		}
		$operation = isset( $record['operation'] ) && is_string( $record['operation'] ) ? $record['operation'] : '';
		if ( self::CREATE === $operation && ! Creation::can_create( self::publication_status( $record ) ) ) {
			return false;
		}
		$target_id = isset( $record['target'] ) ? (int) $record['target'] : 0;
		if ( $target_id && ! Integration::can_read_post( $target_id ) ) {
			return false;
		}
		if ( ! isset( $record['bind_target'] ) || ! is_array( $record['bind_target'] ) ) {
			return false;
		}
		try {
			self::source_membership( $record['bind_target'] );
			return true;
		} catch ( \Throwable $error ) {
			return false;
		}
	}
	/**
	 * Commercial blockers only after gallery and source admission. Unauthorized calls do not receive an upgrade remedy.
	 *
	 * @param array<string,mixed> $input
	 * @return array<int,array<string,mixed>>
	 */
	public static function explain_blockers( string $name, array $input ): array {
		if ( ! self::actor_admitted( $name, $input ) ) {
			return array( self::permission_blocker() );
		}
		return Availability::blockers( $name );
	}
	/**
	 * @param array<string,mixed> $input
	 */
	private static function actor_admitted( string $name, array $input ): bool {
		$services_ready = self::services_ready();
		$actor_allowed  = Media_Folders::can_manage() || ( ! $services_ready && Integration::can_discover() && current_user_can( 'upload_files' ) );
		if ( ! $actor_allowed ) {
			return false;
		}
		if ( self::CREATE === $name && ! Creation::can_create( self::publication_status( $input ) ) ) {
			return false;
		}
		if ( self::CREATE === $name || self::SOURCE === $name ) {
			return ! $services_ready || self::source_attempt_allowed( $input );
		}
		$id = isset( $input['id'] ) ? (int) $input['id'] : 0;
		if ( $id < 1 || ! Integration::can_read_post( $id ) ) {
			return false;
		}
		if ( self::EXCLUDE === $name && ! Update::can_update( $id ) ) {
			return false;
		}
		return ! $services_ready || self::saved_target_allowed( $id );
	}
	/**
	 * @param array<string,mixed> $record
	 */
	private static function publication_status( array $record ): string {
		if ( isset( $record['publication'] ) && is_string( $record['publication'] ) ) {
			return $record['publication'];
		}
		if ( isset( $record['status'] ) && is_string( $record['status'] ) ) {
			return $record['status'];
		}
		return '';
	}
	/**
	 * @param array<string,mixed> $input
	 */
	private static function source_attempt_allowed( array $input ): bool {
		$target = isset( $input['target'] ) && is_array( $input['target'] ) ? $input['target'] : array();
		$type   = isset( $target['type'] ) && is_string( $target['type'] ) ? $target['type'] : '';
		if ( 'media_folder' === $type ) {
			return self::folder_attempt_allowed( $target );
		}
		if ( 'remote_prefix' === $type ) {
			return self::prefix_attempt_allowed( $target );
		}
		return false;
	}
	/**
	 * @param array<string,mixed> $target
	 */
	private static function folder_attempt_allowed( array $target ): bool {
		$folder_id = isset( $target['folder_id'] ) ? (int) $target['folder_id'] : 0;
		if ( $folder_id < 1 || isset( $target['connection_id'] ) || isset( $target['prefix'] ) || ! class_exists( Folders_Controller::class ) ) {
			return false;
		}
		if ( ! Folders_Controller::service()->find( $folder_id ) ) {
			return false;
		}
		return Creation::can_use_attachments( Bound_Gallery::direct_attachment_ids( $folder_id ) );
	}
	/**
	 * Local connection lookup only. Prefix listing stays on the open gate so a blocked call does not touch the provider.
	 *
	 * @param array<string,mixed> $target
	 */
	private static function prefix_attempt_allowed( array $target ): bool {
		$connection_id = isset( $target['connection_id'] ) && is_string( $target['connection_id'] ) ? $target['connection_id'] : '';
		if ( '' === $connection_id || isset( $target['folder_id'] ) || ! class_exists( Connections_Controller::class ) ) {
			return false;
		}
		return (bool) Connections_Controller::service()->find( $connection_id );
	}
	private static function saved_target_allowed( int $id ): bool {
		try {
			$target = self::target( $id );
		} catch ( \Throwable $error ) {
			return false;
		}
		return self::source_attempt_allowed( array( 'target' => $target ) );
	}
	/** @return array<string,mixed> */
	private static function permission_blocker(): array {
		return array(
			'reason'  => 'permission_denied',
			'feature' => 'bound-gallery',
			'remedy'  => array(
				'action'      => 'contact_administrator',
				'explanation' => __( 'Current gallery and source permissions are required. An upgrade does not grant this access.', 'modula-best-grid-gallery' ),
			),
		);
	}
}
