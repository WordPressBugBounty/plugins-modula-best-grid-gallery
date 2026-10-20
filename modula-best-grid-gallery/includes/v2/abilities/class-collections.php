<?php
/** Collections and site-wide favorites reuse the organizer's services and access model. */
namespace Modula\V2\Abilities;

use WPChill\Folders\Plugin;
use WPChill\Folders\Rest\Favorites_Controller;

defined( 'ABSPATH' ) || exit;
final class Collections {
	public const LISTING       = 'modula/list-collections';
	public const MEMBERS       = 'modula/list-collection-members';
	public const FAVORITES     = 'modula/list-favorites';
	public const CREATE        = 'modula/create-collection';
	public const UPDATE        = 'modula/update-collection';
	public const ADD_MEMBER    = 'modula/add-collection-member';
	public const REMOVE_MEMBER = 'modula/remove-collection-member';
	public const STAR          = 'modula/add-favorite';
	public const UNSTAR        = 'modula/remove-favorite';
	public const DELETE        = 'modula/delete-collection';

	/** Outcome results the writes set, here and as media batch targets; member and favorite writes set none. */
	public const RESULTS = array( 'collection', 'deleted_id' );

	public static function entitled(): bool {
		return Folders_Dependency::loaded() && Plugin::instance()->config()->folders();
	}

	public static function can_invoke( $input = array() ): bool {
		return Media_Folders::can_manage() || Integration::can_discover();
	}

	/** Current media rights are independent of commercial availability. */
	public static function explain_blockers( string $name, array $input ): array {
		$services_ready = Folders_Dependency::available( 'collections' );
		$actor_allowed  = Media_Folders::can_manage() || ( ! $services_ready && Integration::can_discover() && current_user_can( 'upload_files' ) );
		$member         = in_array( $name, array( self::ADD_MEMBER, self::REMOVE_MEMBER ), true );
		if ( ! $actor_allowed || ( $services_ready && $member && ! Attachments::can_read( (int) ( $input['id'] ?? 0 ) ) ) ) {
			return array( Availability::blocker( 'permission_denied', 'collections', 'contact_administrator', __( 'Current organizer and attachment permissions are required. An upgrade does not grant access.', 'modula-best-grid-gallery' ) ) );
		}
		return Availability::blockers( $name );
	}

	public static function available( string $operation ): bool {
		return in_array( $operation, self::names(), true ) && Media_Folders::can_manage() && Folders_Dependency::available( 'collections' ) && ( in_array( $operation, self::free_names(), true ) || self::entitled() );
	}

	/** @return array<int,string> */
	public static function names(): array {
		return array_merge( array( self::LISTING, self::MEMBERS, self::FAVORITES ), self::mutations() );
	}

	/** @return array<int,string> */
	public static function premium(): array {
		return array_values(
			array_filter(
				self::names(),
				static function ( $name ) {
					return false === strpos( $name, 'favorite' );
				}
			)
		);
	}

	/** @return array<int,string> */
	public static function free_names(): array {
		return array_values(
			array_filter(
				self::names(),
				static function ( $name ) {
					return false !== strpos( $name, 'favorite' );
				}
			)
		);
	}

	/**
	 * Signature contract for the Pro collection executor. Lite checks it without constructing Pro.
	 *
	 * @return array<string,array<string,int>>
	 */
	public static function executor_methods(): array {
		return array_fill_keys(
			self::premium(),
			array(
				'run'        => 2,
				'operations' => 0,
			)
		);
	}

	/** Inspect the executor signature without constructing a service. */
	public static function executor_ready( string $name ): bool {
		$methods = self::executor_methods();
		return isset( $methods[ $name ] ) && Pro_Dependency::methods( '\Modula_Pro\Abilities\Collection_Executor', $methods[ $name ] );
	}

	public static function mutations(): array {
		return array( self::CREATE, self::UPDATE, self::DELETE, self::ADD_MEMBER, self::REMOVE_MEMBER, self::STAR, self::UNSTAR );
	}
	public static function callbacks(): array {
		$out = array();
		foreach ( self::free_names() as $name ) {
			$out[ $name ] = static function ( $input ) use ( $name ) {
				if ( in_array( $name, self::mutations(), true ) ) {
					return self::mutate( $input, $name );
				}
				return self::listing( $input, $name );
			};
		}
		return $out + Collection_Explanation::callbacks_for( self::premium() );
	}
	/** Additional host requirements; inspection never initializes services or changes entitlement. */
	public static function blockers( string $name, array $snapshot ): array {
		$blockers = array();
		if ( ! Folders_Dependency::available( 'collections' ) ) {
			$blockers[] = Availability::blocker( 'dependency_unavailable', 'folders', 'configure_service', __( 'Restore the Folders library or complete its tables before using this operation.', 'modula-best-grid-gallery' ) );
		}
		if ( 'compatible' === $snapshot['pro_state'] && Folders_Dependency::loaded() && ! self::entitled() ) {
			$blockers[] = Availability::blocker( 'configuration_required', 'folders', 'configure_service', __( 'Folders entitlement is required for collections. Favorites and ordinary media folders stay available without that entitlement.', 'modula-best-grid-gallery' ) );
		}
		return $blockers;
	}

	public static function abilities(): array {
		$by_name = array(
			self::DELETE => array( 'destructive' => true ),
		);
		foreach ( self::premium() as $name ) {
			$by_name[ $name ] = array_merge(
				array(
					'requires_pro'   => true,
					'blockers'       => array( self::class, 'blockers' ),
					'executor_ready' => array( self::class, 'executor_ready' ),
					'permission'     => array( self::class, 'can_invoke' ),
				),
				isset( $by_name[ $name ] ) ? $by_name[ $name ] : array()
			);
		}
		return Operation_Table::from_callbacks(
			self::callbacks(),
			array(
				'permission'            => array( self::class, 'available' ),
				'available'             => array( self::class, 'available' ),
				'permission_needs_name' => true,
				'dependency'            => 'folders',
				'mcp_public'            => array( Folders_Dependency::class, 'mcp_collections' ),
			),
			$by_name
		);
	}
	public static function collection_schema(): array {
		return Contract::object(
			array(
				'id'    => array( 'type' => 'integer' ),
				'name'  => array( 'type' => 'string' ),
				'color' => array( 'type' => 'string' ),
			),
			array( 'id', 'name', 'color' )
		);
	}
	public static function definitions(): array {
		$id     = array(
			'type'    => 'integer',
			'minimum' => 1,
		);
		$fields = array(
			'name'  => array(
				'type'      => 'string',
				'minLength' => 1,
				'maxLength' => 191,
			),
			'color' => array(
				'type' => 'string',
			),
		);
		if ( Folders_Dependency::available( 'collections' ) ) {
			$fields['color']['enum'] = \WPChill\Folders\Folders\Folder_Color::palette();
		}
		$out = array();
		foreach ( array_keys( self::callbacks() ) as $name ) {
			$write    = in_array( $name, self::mutations(), true );
			$props    = $write ? array(
				'request_id' => Contract::request_id_schema(),
				'revision'   => Contract::revision_schema(),
			) : Contract::pagination();
			$required = $write ? array_keys( $props ) : array();
			if ( ! in_array( $name, array( self::LISTING, self::FAVORITES, self::CREATE ), true ) ) {
				$props['id'] = $id;
				$required[]  = 'id';
			}
			if ( self::CREATE === $name ) {
				$props     += $fields;
				$required[] = 'name';
			}
			if ( self::UPDATE === $name ) {
				$props['changes'] = Contract::object( $fields ) + array( 'minProperties' => 1 );
				$required[]       = 'changes';
			}
			if ( in_array( $name, array( self::ADD_MEMBER, self::REMOVE_MEMBER ), true ) ) {
				$props['collection_id'] = $id;
				$required[]             = 'collection_id';
			}
			$key  = self::LISTING === $name ? 'collections' : 'attachments';
			$page = Contract::object(
				Contract::page_output() + array(
					'revision' => Contract::revision_schema(),
					$key       => array(
						'type'  => 'array',
						'items' => 'collections' === $key ? self::collection_schema() : Attachments::summary_schema(),
					),
				),
				array( 'schema_version', 'revision', $key, 'page', 'per_page', 'total', 'total_pages' )
			);
			if ( $write ) {
				$output = Contract::outcome( $name, self::RESULTS );
			} elseif ( in_array( $name, self::premium(), true ) ) {
				$output = Contract::admitting( $page );
			} else {
				$output = $page;
			}
			$out[ $name ] = array(
				'label'         => ucwords( str_replace( '-', ' ', substr( $name, 7 ) ) ),
				'description'   => 'Existing organizer collections (Folders entitlement required) and site-wide favorites (media permission required). Attachment IDs only; member writes use id as attachment and collection_id as collection. No user_id override. No residence, shared text or file changes. Reads paginate 1–100 accessible objects. Writes require the revision from the corresponding list and an actor-scoped recoverable request_id. Delete removes only labels, authorizing all affected members.',
				'input_schema'  => Contract::object( $props, $required ),
				'output_schema' => $output,
			);
		}
		return $out;
	}
	/** Legacy entry point retained for free Favorites only. Paid reads are Pro-owned. */
	public static function listing( array $input, string $operation ) {
		if ( self::FAVORITES !== $operation || ! self::available( $operation ) ) {
			return new \WP_Error( 'modula_forbidden', 'Current organizer permission and feature access are required.' );
		}
		$revision = Revision::collections();
		$ids      = Favorites_Controller::service()->repository()->object_ids( 'attachment' );
		$ids      = array_values( array_filter( $ids, array( Attachments::class, 'can_read' ) ) );
		sort( $ids );
		$result                = Media_Folders::page( $input, $ids, 'attachments' );
		$result['attachments'] = array_map( array( Attachments::class, 'summary' ), $result['attachments'] );
		if ( ! hash_equals( $revision, Revision::collections() ) ) {
			return new \WP_Error( 'modula_read_conflict', 'Organization changed during inspection. Read again.' );
		}
		return $result + array( 'revision' => $revision );
	}

	public static function can_recover( array $record ): bool {
		if ( ! Media_Folders::can_manage() || ! Folders_Dependency::available( 'collections' ) ) {
			return false;
		}
		foreach ( $record['media_ids'] ?? array() as $id ) {
			if ( ! Attachments::can_read( $id ) ) {
				return false;
			}
		}
		return true;
	}

	/** Legacy entry point retained for free Favorites only. */
	public static function mutate( array $input, string $operation ): array {
		if ( ! in_array( $operation, array( self::STAR, self::UNSTAR ), true ) ) {
			return Requests::outcome( $input['request_id'], 'rejected', 'unknown_operation', '', $operation );
		}
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		if ( ! self::available( $operation ) || ! Attachments::can_read( $input['id'] ) ) {
			return Requests::outcome( $input['request_id'], 'forbidden', 'current_permission_denied', 'Current organizer and attachment access are required.', $operation );
		}
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		$active = false;
		try {
			Revision::begin();
			$active = true;
			if ( ! hash_equals( Revision::collections( true ), $input['revision'] ) ) {
				Revision::end( false );
				$active = false;
				return Requests::finish( $input['request_id'], Requests::outcome( $input['request_id'], 'conflict', 'stale_revision', 'Read current collections/favorites and reconcile before a new request.', $operation ) );
			}
			Revision::lock_attachments( array( $input['id'] ) );
			if ( ! self::available( $operation ) || ! Attachments::can_read( $input['id'] ) ) {
				Revision::end( false );
				$active = false;
				return Requests::finish( $input['request_id'], Requests::outcome( $input['request_id'], 'rejected', 'current_permission_denied', 'Organizer or attachment access changed.', $operation ) );
			}
			Requests::context( $input['request_id'], array( 'media_ids' => array( $input['id'] ) ) );
			$saved = self::save_favorite( $input['id'], $operation );
			if ( is_wp_error( $saved ) ) {
				Revision::end( false );
				$active = false;
				return Requests::finish( $input['request_id'], Requests::outcome( $input['request_id'], 'rejected', $saved->get_error_code(), $saved->get_error_message(), $operation ) );
			}
			$response             = Requests::outcome( $input['request_id'], 'succeeded', '', '', $operation );
			$response['revision'] = Revision::collections();
			$response             = Requests::finish( $input['request_id'], $response );
			Revision::end( true );
			$active = false;
			return $response;
		} catch ( \Throwable $error ) {
			if ( $active ) {
				Revision::end( false );
			}
			return Requests::finish( $input['request_id'], Requests::outcome( $input['request_id'], 'uncertain', 'organization_unconfirmed', 'Recover this identity before further action.', $operation ) );
		}
	}

	/** @return \WP_Error|null */
	private static function save_favorite( int $id, string $operation ) {
		$method = self::STAR === $operation ? 'star' : 'unstar';
		$saved  = Favorites_Controller::service()->$method(
			array(
				'object_id'   => $id,
				'object_type' => 'attachment',
			)
		);
		if ( is_wp_error( $saved ) ) {
			return $saved;
		}
		if ( Favorites_Controller::service()->repository()->is_favorite( $id ) !== ( self::STAR === $operation ) ) {
			throw new \RuntimeException( 'Favorite save unconfirmed.' );
		}
		return null;
	}
}
