<?php
/** Collections and site-wide favorites reuse the organizer's services and access model. */
namespace Modula\V2\Abilities;

use WPChill\Folders\Plugin;
use WPChill\Folders\Rest\Collections_Controller;
use WPChill\Folders\Rest\Favorites_Controller;

defined( 'ABSPATH' ) || exit;
final class Collections {
	public static function available( string $operation ): bool {
		return Media_Folders::can_manage() && Folders_Dependency::available( 'collections' ) && ( false !== strpos( $operation, 'favorite' ) || Plugin::instance()->config()->folders() );
	}
	public static function mutations(): array {
		return array( 'modula/create-collection', 'modula/update-collection', 'modula/delete-collection', 'modula/add-collection-member', 'modula/remove-collection-member', 'modula/add-favorite', 'modula/remove-favorite' );
	}
	public static function callbacks(): array {
		$out = array();
		foreach ( array_merge( array( 'modula/list-collections', 'modula/list-collection-members', 'modula/list-favorites' ), self::mutations() ) as $name ) {
			$out[ $name ] = static function ( $input ) use ( $name ) {
				return in_array( $name, self::mutations(), true ) ? self::mutate( $input, $name ) : self::listing( $input, $name );
			};
		}
		return $out;
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
		$out    = array();
		foreach ( array_keys( self::callbacks() ) as $name ) {
			$write    = in_array( $name, self::mutations(), true );
			$props    = $write ? array(
				'request_id' => Contract::request_id_schema(),
				'revision'   => Contract::revision_schema(),
			) : Contract::pagination();
			$required = $write ? array_keys( $props ) : array();
			if ( ! in_array( $name, array( 'modula/list-collections', 'modula/list-favorites', 'modula/create-collection' ), true ) ) {
				$props['id'] = $id;
				$required[]  = 'id'; }
			if ( 'modula/create-collection' === $name ) {
				$props     += $fields;
				$required[] = 'name'; }
			if ( 'modula/update-collection' === $name ) {
				$props['changes'] = Contract::object( $fields ) + array( 'minProperties' => 1 );
				$required[]       = 'changes'; }
			if ( in_array( $name, array( 'modula/add-collection-member', 'modula/remove-collection-member' ), true ) ) {
				$props['collection_id'] = $id;
				$required[]             = 'collection_id'; }
			$key          = 'modula/list-collections' === $name ? 'collections' : 'attachments';
			$output       = $write ? Contract::outcome_schema() : Contract::object(
				Contract::page_output() + array(
					'revision' => Contract::revision_schema(),
					$key       => array(
						'type'  => 'array',
						'items' => 'collections' === $key ? self::collection_schema() : Attachments::summary_schema(),
					),
				),
				array( 'schema_version', 'revision', $key, 'page', 'per_page', 'total', 'total_pages' )
			);
			$out[ $name ] = array(
				'label'         => ucwords( str_replace( '-', ' ', substr( $name, 7 ) ) ),
				'description'   => 'Existing organizer collections (Folders entitlement required) and site-wide favorites (media permission required). Attachment IDs only; member writes use id as attachment and collection_id as collection. No user_id override. No residence, shared text or file changes. Reads paginate 1–100 accessible objects. Writes require the revision from the corresponding list and an actor-scoped recoverable request_id. Delete removes only labels, authorizing all affected members.',
				'input_schema'  => Contract::object( $props, $required ),
				'output_schema' => $output,
			);
		}
		return $out;
	}
	private static function summary( array $row ): array {
		return array_intersect_key( $row, array_flip( array( 'id', 'name', 'color' ) ) ); }
	public static function listing( array $input, string $operation ) {
		if ( ! self::available( $operation ) ) {
			return new \WP_Error( 'modula_forbidden', 'Current organizer permission and feature access are required.' ); }
		$revision = Revision::collections();
		if ( 'modula/list-collections' === $operation ) {
			$result = Media_Folders::page( $input, array_map( array( __CLASS__, 'summary' ), Collections_Controller::service()->list_all() ), 'collections' );
		} else {
			if ( 'modula/list-collection-members' === $operation && ! Collections_Controller::service()->find( $input['id'] ) ) {
				return new \WP_Error( 'modula_not_found', 'Collection not found.' ); }
			$ids = 'modula/list-favorites' === $operation ? Favorites_Controller::service()->repository()->object_ids( 'attachment' ) : Collections_Controller::service()->object_ids( $input['id'] );
			$ids = array_values( array_filter( $ids, array( Attachments::class, 'can_read' ) ) );
			sort( $ids );
			$result                = Media_Folders::page( $input, $ids, 'attachments' );
			$result['attachments'] = array_map( array( Attachments::class, 'summary' ), $result['attachments'] );
		}
		if ( ! hash_equals( $revision, Revision::collections() ) ) {
			return new \WP_Error( 'modula_read_conflict', 'Organization changed during inspection. Read again.' ); }
		return $result + array( 'revision' => $revision );
	}
	public static function can_recover( array $record ): bool {
		if ( ! self::available( $record['operation'] ) ) {
			return false; }
		foreach ( $record['media_ids'] ?? array() as $id ) {
			if ( ! Attachments::can_read( $id ) ) {
				return false; }
		}
		return true;
	}
	public static function mutate( array $input, string $operation ): array {
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$out = static function ( $status, $code = '', $message = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, $message, $operation );
		};
		if ( ! self::available( $operation ) ) {
			return $out( 'forbidden', 'current_permission_denied', 'Current organizer permission and feature access are required.' ); }
		if ( ( false !== strpos( $operation, 'favorite' ) || false !== strpos( $operation, '-member' ) ) && ! Attachments::can_read( (int) $input['id'] ) ) {
			return $out( 'forbidden', 'current_permission_denied', 'Current attachment access is required.' );
		}
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing; }
		$active = false;
		try {
			Revision::begin();
			$active = true;
			if ( ! hash_equals( Revision::collections( true ), $input['revision'] ) ) {
				Revision::end( false );
				$active = false;
				return Requests::finish( $input['request_id'], $out( 'conflict', 'stale_revision', 'Read current collections/favorites and reconcile before a new request.' ) );
			}
			$service       = Collections_Controller::service();
			$favorite      = false !== strpos( $operation, 'favorite' );
			$member        = false !== strpos( $operation, '-member' );
			$id            = (int) ( $input['id'] ?? 0 );
			$collection_id = $member ? $input['collection_id'] : $id;
			$error         = null;
			$ids           = $favorite || $member ? array( $id ) : array();
			if ( 'modula/delete-collection' === $operation ) {
				global $wpdb;
				$rows = $wpdb->get_results( $wpdb->prepare( "SELECT object_id,object_type FROM {$wpdb->prefix}wpchill_collection_labels WHERE collection_id = %d", $id ), ARRAY_A );
				foreach ( $rows as $row ) {
					if ( 'attachment' !== $row['object_type'] ) {
						$error = new \WP_Error( 'unsupported_member', 'All affected members must be accessible attachments.' ); }
					$ids[] = (int) $row['object_id'];
				}
			}
			if ( $ids ) {
				Revision::lock_attachments( $ids ); }
			foreach ( $ids as $media_id ) {
				if ( ! Attachments::can_read( $media_id ) ) {
					$error = new \WP_Error( 'inaccessible_member', 'All affected members must be accessible attachments.' ); }
			}
			if ( ! self::available( $operation ) ) {
				$error = new \WP_Error( 'current_permission_denied', 'Organizer access changed.' ); }
			if ( ! $favorite && 'modula/create-collection' !== $operation && ! $service->find( $collection_id ) ) {
				$error = new \WP_Error( 'collection_not_found', 'Collection not found.' ); }
			$fields = array_intersect_key( $input['changes'] ?? $input, array_flip( array( 'name', 'color' ) ) );
			if ( isset( $fields['name'] ) ) {
				$fields['name'] = sanitize_text_field( $fields['name'] ); }
			if ( isset( $fields['name'] ) && '' === trim( $fields['name'] ) ) {
				$error = new \WP_Error( 'invalid_name', 'A visible collection name is required.' ); }
			Requests::context( $input['request_id'], array( 'media_ids' => $ids ) );
			$result = $error;
			if ( ! $error ) {
				if ( $favorite ) {
					$method = 'modula/add-favorite' === $operation ? 'star' : 'unstar';
					$result = Favorites_Controller::service()->$method(
						array(
							'object_id'   => $id,
							'object_type' => 'attachment',
						)
					);
					if ( Favorites_Controller::service()->repository()->is_favorite( $id ) !== ( 'star' === $method ) ) {
						throw new \RuntimeException( 'Favorite save unconfirmed.' ); }
				} elseif ( $member ) {
					$method = 'modula/add-collection-member' === $operation ? 'label' : 'unlabel';
					$result = $service->$method(
						array(
							'collection_id' => $collection_id,
							'object_id'     => $id,
							'object_type'   => 'attachment',
						)
					);
					if ( ! is_wp_error( $result ) && in_array( $id, $service->object_ids( $collection_id ), true ) !== ( 'label' === $method ) ) {
						throw new \RuntimeException( 'Member save unconfirmed.' ); }
				} elseif ( 'modula/create-collection' === $operation ) {
					$result = $service->create( $fields );
				} elseif ( 'modula/update-collection' === $operation ) {
					$result = $service->update( $id, $fields );
				} else {
					$result = $service->delete( $id ); }
			}
			if ( is_wp_error( $result ) ) {
				Revision::end( false );
				$active = false;
				return Requests::finish( $input['request_id'], $out( 'rejected', $result->get_error_code(), $result->get_error_message() ) );
			}
			$response = $out( 'succeeded' );
			if ( ! $member && ! $favorite ) {
				if ( 'modula/delete-collection' === $operation ) {
					if ( $service->find( $id ) ) {
						throw new \RuntimeException( 'Delete unconfirmed.' ); }
					$response['deleted_id'] = $id;
				} else {
					$saved = $service->find( (int) $result['id'] );
					foreach ( $fields as $key => $value ) {
						if ( ! $saved || strtolower( $saved[ $key ] ) !== strtolower( $value ) ) {
							throw new \RuntimeException( 'Collection save unconfirmed.' ); }
					}
					$response['collection'] = self::summary( $saved );
				}
			}
			$response['revision'] = Revision::collections();
			$response             = Requests::finish( $input['request_id'], $response );
			Revision::end( true );
			$active = false;
			return $response;
		} catch ( \Throwable $error ) {
			if ( $active ) {
				Revision::end( false ); }
			return Requests::finish( $input['request_id'], $out( 'uncertain', 'organization_unconfirmed', 'Recover this identity before further action.' ) );
		}
	}
}
