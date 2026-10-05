<?php
/** Recoverable organizer operations. The Folders library remains host-independent. */
namespace Modula\V2\Abilities;

use WPChill\Folders\Plugin;
use WPChill\Folders\Rest\Folders_Controller;
use WPChill\Folders\Rest\Memberships_Controller;
use WPChill\Folders\Rest\Status_Controller;
use WPChill\Folders\Memberships\Wpdb_Membership_Repository;
use WPChill\Folders\Storage\Folder_Transfer_State;
defined( 'ABSPATH' ) || exit;
final class Media_Folders {
	public static function can_manage(): bool {
		return get_current_user_id() && Folders_Dependency::available() && true === Status_Controller::can_view_status();
	}
	public static function mutations(): array {
		return array( 'modula/create-media-folder', 'modula/update-media-folder', 'modula/delete-media-folder', 'modula/assign-media-folder' );
	}
	public static function callbacks(): array {
		$out = array( 'modula/list-media-folders' => array( __CLASS__, 'listing' ) );
		foreach ( self::mutations() as $name ) {
			$out[ $name ] = array( __CLASS__, str_replace( array( 'modula/', '-media-folder' ), '', $name ) );
		}
		return $out;
	}
	public static function folder_schema(): array {
		return Contract::object(
			array(
				'id'         => array( 'type' => 'integer' ),
				'name'       => array( 'type' => 'string' ),
				'parent_id'  => array( 'type' => 'integer' ),
				'menu_order' => array( 'type' => 'integer' ),
				'residence'  => array(
					'type' => 'string',
					'enum' => array( 'local', 'storage' ),
				),
			),
			array( 'id', 'name', 'parent_id', 'menu_order', 'residence' )
		);
	}
	public static function definitions(): array {
		$id     = array(
			'type'    => 'integer',
			'minimum' => 1,
		);
		$base   = array(
			'request_id' => Contract::request_id_schema(),
			'revision'   => Contract::revision_schema(),
		);
		$fields = array(
			'name'       => array(
				'type'      => 'string',
				'minLength' => 1,
				'maxLength' => 191,
			),
			'parent_id'  => array(
				'type'    => 'integer',
				'minimum' => 0,
			),
			'menu_order' => array(
				'type'    => 'integer',
				'minimum' => -2147483648,
				'maximum' => 2147483647,
			),
		);
		$out    = array(
			'modula/list-media-folders' => array(
				'label'         => 'List media folders',
				'description'   => 'Search organizer folders by name, 1–100 per page. Includes a site organization revision for mutations, including creation. Parent 0 is root; residence is local or storage. Basic folders are available in Lite.',
				'input_schema'  => Contract::object(
					Contract::pagination() + array(
						'search' => array(
							'type'      => 'string',
							'maxLength' => 200,
						),
					)
				),
				'output_schema' => Contract::object(
					Contract::page_output() + array(
						'revision' => Contract::revision_schema(),
						'folders'  => array(
							'type'  => 'array',
							'items' => self::folder_schema(),
						),
					),
					array( 'schema_version', 'revision', 'folders', 'page', 'per_page', 'total', 'total_pages' )
				),
			),
		);
		foreach ( self::mutations() as $name ) {
			$properties = $base;
			$required   = array_keys( $base );
			if ( 'modula/create-media-folder' === $name ) {
				$properties += $fields;
				$required[]  = 'name';
			} else {
				$properties['id'] = $id;
				$required[]       = 'id';
			}
			if ( 'modula/update-media-folder' === $name ) {
				$properties['changes'] = Contract::object( $fields ) + array( 'minProperties' => 1 );
				$required[]            = 'changes';
			}
			if ( 'modula/assign-media-folder' === $name ) {
				$properties['folder_id']   = array(
					'type'    => 'integer',
					'minimum' => 0,
				);
				$properties['object_type'] = array(
					'type' => 'string',
					'enum' => array( 'attachment' ),
				);
				$required[]                = 'folder_id';
				$required[]                = 'object_type';
			}
			$out[ $name ] = array(
				'label'         => str_replace( array( 'modula/', '-' ), array( '', ' ' ), $name ),
				'description'   => 'Organizer mutation with current permissions, organization revision and 30-day request recovery. Delete removes the subtree and assignments only, never objects or bytes. Assign supports attachment IDs; folder_id 0 clears media folder location (Uncategorized). Storage assignments that require byte transfer belong to storage operations.',
				'input_schema'  => Contract::object( $properties, $required ),
				'output_schema' => Contract::outcome_schema(),
			);
		}
		return $out;
	}
	public static function page( array $input, array $rows, string $key ): array {
		$page = $input['page'] ?? 1;
		$size = $input['per_page'] ?? 20;
		return array(
			'schema_version' => Contract::VERSION,
			'page'           => $page,
			'per_page'       => $size,
			'total'          => count( $rows ),
			'total_pages'    => (int) ceil( count( $rows ) / $size ),
			$key             => array_slice( $rows, ( $page - 1 ) * $size, $size ),
		);
	}
	public static function summary( array $row ): array {
		return array(
			'id'         => (int) $row['id'],
			'name'       => (string) $row['name'],
			'parent_id'  => (int) $row['parent_id'],
			'menu_order' => (int) $row['menu_order'],
			'residence'  => empty( $row['connection_id'] ) ? 'local' : 'storage',
		);
	}
	public static function accessible( ?array $row ): bool {
		return $row && ( empty( $row['owner_user_id'] ) || (int) $row['owner_user_id'] === get_current_user_id() ) && ( empty( $row['connection_id'] ) || Plugin::instance()->config()->storage() );
	}
	public static function listing( array $input ) {
		if ( ! self::can_manage() ) {
			return new \WP_Error( 'modula_forbidden', 'Current organizer permission is required.' );
		}
		$revision = Revision::organization();
		$rows     = array();
		foreach ( Folders_Controller::service()->list_flat() as $row ) {
			if ( self::accessible( $row ) && ( empty( $input['search'] ) || false !== stripos( $row['name'], $input['search'] ) ) ) {
				$rows[] = self::summary( $row );
			}
		}
		if ( ! hash_equals( $revision, Revision::organization() ) ) {
			return new \WP_Error( 'modula_read_conflict', 'Organization changed during inspection. Read again.' );
		}
		return self::page( $input, $rows, 'folders' ) + array( 'revision' => $revision );
	}
	public static function create( array $input ): array {
		return self::mutate( $input, 'modula/create-media-folder' );
	}
	public static function update( array $input ): array {
		return self::mutate( $input, 'modula/update-media-folder' );
	}
	public static function delete( array $input ): array {
		return self::mutate( $input, 'modula/delete-media-folder' );
	}
	public static function assign( array $input ): array {
		return self::mutate( $input, 'modula/assign-media-folder' );
	}
	public static function can_recover( array $record ): bool {
		if ( ! self::can_manage() ) {
			return false;
		}
		foreach ( $record['media_ids'] ?? array() as $id ) {
			if ( ! Attachments::can_read( $id ) ) {
				return false;
			}
		}
		foreach ( $record['folder_ids'] ?? array() as $id ) {
			$row = Folders_Controller::service()->find( $id );
			if ( $row && ! self::accessible( $row ) ) {
				return false;
			}
		}
		return empty( $record['storage_required'] ) || Plugin::instance()->config()->storage();
	}
	private static function mutate( array $input, string $operation ): array {
		$existing = Requests::existing( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		$out = static function ( $status, $code = '', $message = '' ) use ( $input, $operation ) {
			return Requests::outcome( $input['request_id'], $status, $code, $message, $operation );
		};
		if ( ! self::can_manage() ) {
			return $out( 'forbidden', 'current_permission_denied', 'Current organizer permission is required.' );
		}
		$existing = Requests::claim( $input, $operation );
		if ( null !== $existing ) {
			return $existing;
		}
		$transaction = false;
		try {
			Revision::begin();
			$transaction = true;
			if ( ! hash_equals( Revision::organization( true ), $input['revision'] ) ) {
				Revision::end( false );
				$transaction = false;
				return Requests::finish( $input['request_id'], $out( 'conflict', 'stale_revision', 'Read organization again and reconcile before using a new request identity.' ) );
			}
			$service          = Folders_Controller::service();
			$fields           = $input['changes'] ?? $input;
			$folder_ids       = array();
			$media_ids        = array();
			$storage_required = false;
			$error            = null;
			if ( ! self::can_manage() ) {
				$error = new \WP_Error( 'current_permission_denied', 'Organizer access changed.' );
			}
			$target = null;
			if ( in_array( $operation, array( 'modula/update-media-folder', 'modula/delete-media-folder' ), true ) ) {
				$target = $service->find( $input['id'] );
				if ( ! self::accessible( $target ) ) {
					$error = new \WP_Error( 'inaccessible_folder', 'An accessible existing folder is required.' );
				} else {
					$folder_ids[]     = $input['id'];
					$storage_required = ! empty( $target['connection_id'] );
				}
			}
			if ( ! empty( $fields['parent_id'] ) ) {
				$parent = $service->find( $fields['parent_id'] );
				if ( ! self::accessible( $parent ) ) {
					$error = new \WP_Error( 'inaccessible_parent', 'An accessible existing parent is required.' );
				} else {
					$folder_ids[]     = $fields['parent_id'];
					$storage_required = $storage_required || ! empty( $parent['connection_id'] );
					if ( $target && ( (string) $target['connection_id'] !== (string) $parent['connection_id'] || ( ! empty( $target['connection_id'] ) && (int) $target['parent_id'] !== $fields['parent_id'] ) ) ) {
						$error = new \WP_Error( 'storage_transfer_required', 'Changing storage hierarchy requires explicit storage operations.' );
					}
				}
			} elseif ( $target && ! empty( $target['connection_id'] ) && isset( $fields['parent_id'] ) && (int) $target['parent_id'] !== $fields['parent_id'] ) {
				$error = new \WP_Error( 'storage_transfer_required', 'Changing storage hierarchy requires explicit storage operations.' );
			}
			$members = new Wpdb_Membership_Repository();
			if ( 'modula/delete-media-folder' === $operation && $target ) {
				// Deletion clears every descendant's membership; authorize the entire affected subtree.
				$subtree = $service->subtree_ids( $input['id'] );
				foreach ( $subtree as $folder_id ) {
					$row = $service->find( $folder_id );
					if ( ! self::accessible( $row ) ) {
						$error = new \WP_Error( 'inaccessible_folder', 'Every descendant must be accessible.' );
					}
					$storage_required = $storage_required || ! empty( $row['connection_id'] );
				}
				global $wpdb;
				$ids  = implode( ',', array_map( 'absint', $subtree ) );
				$rows = $wpdb->get_results( "SELECT object_id,object_type FROM {$wpdb->prefix}wpchill_folder_memberships WHERE folder_id IN ($ids)", ARRAY_A );
				foreach ( $rows as $row ) {
					if ( 'attachment' !== $row['object_type'] || ! Attachments::can_read( (int) $row['object_id'] ) ) {
						$error = new \WP_Error( 'inaccessible_member', 'Every affected member must be an accessible attachment.' );
					}
					$media_ids[] = (int) $row['object_id'];
				}
				$folder_ids = array_merge( $folder_ids, $subtree );
			}
			if ( 'modula/assign-media-folder' === $operation ) {
				$media_ids[] = $input['id'];
				$map         = $members->folder_map_for_type( 'attachment' );
				foreach ( array_filter( array( $input['folder_id'], $map[ $input['id'] ] ?? 0 ) ) as $folder_id ) {
					$row = $service->find( $folder_id );
					if ( ! self::accessible( $row ) ) {
						$error = new \WP_Error( 'inaccessible_folder', 'Source and destination folders must be accessible.' );
					} elseif ( ! empty( $row['connection_id'] ) ) {
						$error = new \WP_Error( 'storage_transfer_required', 'Storage residence assignments require the explicit storage operation.' );
					}
					$folder_ids[] = (int) $folder_id;
				}
			}
			if ( $media_ids ) {
				Revision::lock_attachments( $media_ids );
			}
			foreach ( $media_ids as $media_id ) {
				if ( ! Attachments::can_read( $media_id ) ) {
					$error = new \WP_Error( 'inaccessible_member', 'Every affected attachment must be accessible.' );
				}
			}
			$transfer = new Folder_Transfer_State();
			wp_cache_delete( Folder_Transfer_State::OPTION_KEY, 'options' );
			foreach ( $folder_ids as $folder_id ) {
				if ( $transfer->is_folder_locked( $folder_id ) ) {
					$error = new \WP_Error( 'folder_locked', 'A folder transfer is running.' );
				}
			}
			if ( isset( $fields['name'] ) ) {
				$fields['name'] = sanitize_text_field( $fields['name'] );
				if ( '' === trim( $fields['name'] ) ) {
					$error = new \WP_Error( 'invalid_name', 'A visible folder name is required.' );
				}
			}
			Requests::context(
				$input['request_id'],
				array(
					'folder_ids'       => array_values( array_unique( $folder_ids ) ),
					'media_ids'        => array_values( array_unique( $media_ids ) ),
					'storage_required' => $storage_required,
				)
			);
			$result = $error;
			if ( ! $error ) {
				if ( 'modula/create-media-folder' === $operation ) {
					$result = $service->create( array_intersect_key( $fields, array_flip( array( 'name', 'parent_id', 'menu_order' ) ) ) );
				} elseif ( 'modula/update-media-folder' === $operation ) {
					$result = $service->update( $input['id'], $fields );
				} elseif ( 'modula/delete-media-folder' === $operation ) {
					$result = $service->delete( $input['id'] );
				} else {
					$assignment = array(
						'object_id'   => $input['id'],
						'object_type' => 'attachment',
						'folder_id'   => $input['folder_id'],
					);
					$result     = $input['folder_id'] ? Memberships_Controller::service()->assign( $assignment ) : Memberships_Controller::service()->unassign( $assignment );
				}
			}
			if ( is_wp_error( $result ) ) {
				Revision::end( false );
				$transaction = false;
				return Requests::finish( $input['request_id'], $out( 'rejected', $result->get_error_code(), $result->get_error_message() ) );
			}
			$response = $out( 'succeeded' );
			if ( 'modula/delete-media-folder' === $operation ) {
				$response['deleted_id'] = $input['id'];
			} elseif ( 'modula/assign-media-folder' === $operation ) {
				$response['membership'] = array(
					'object_id'   => $input['id'],
					'object_type' => 'attachment',
					'folder_id'   => (int) $result['folder_id'],
				);
			} else {
				$response['folder'] = self::summary( $result );
				$folder_ids[]       = $result['id'];
				Requests::context( $input['request_id'], array( 'folder_ids' => array_values( array_unique( $folder_ids ) ) ) );
			}
			$response['revision'] = Revision::organization();
			$response             = Requests::finish( $input['request_id'], $response );
			Revision::end( true );
			$transaction = false;
			return $response;
		} catch ( \Throwable $error ) {
			if ( $transaction ) {
				Revision::end( false );
			}
			return Requests::finish( $input['request_id'], $out( 'uncertain', 'organization_unconfirmed', 'Organization save could not be confirmed. Recover this identity before taking further action.' ) );
		}
	}
}
