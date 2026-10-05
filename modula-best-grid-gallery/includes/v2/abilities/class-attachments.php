<?php
/** Explicit shared attachment text and read-only, permission-filtered media inspection. */
namespace Modula\V2\Abilities;

use WPChill\Folders\Memberships\Wpdb_Membership_Repository;
use WPChill\Folders\Rest\Folders_Controller;
use WPChill\Folders\Usage\Usage_Service;
use Modula\V2\Meta_Sync;
use Modula\V2\Beta_Settings;
defined( 'ABSPATH' ) || exit;
final class Attachments {
	public const UPDATE = 'modula/update-attachment-text';
	public static function callbacks(): array {
		return array(
			'modula/list-attachments'      => array( __CLASS__, 'listing' ),
			'modula/read-attachment'       => array( __CLASS__, 'read' ),
			'modula/read-attachment-usage' => array( __CLASS__, 'usage' ),
			self::UPDATE                   => array( __CLASS__, 'update' ),
		);
	}
	public static function can_read( int $id ): bool {
		return Media_Folders::can_manage() && 'attachment' === get_post_type( $id ) && current_user_can( 'edit_post', $id ) && current_user_can( 'read_post', $id );
	}
	public static function text_schema( bool $input = true ): array {
		$schema = Contract::object(
			array(
				'title'       => array(
					'type'      => 'string',
					'maxLength' => 200,
				),
				'description' => array(
					'type'      => 'string',
					'maxLength' => 65536,
				),
				'caption'     => array(
					'type'      => 'string',
					'maxLength' => 65536,
				),
				'alt'         => array(
					'type'      => 'string',
					'maxLength' => 2000,
				),
			)
		);
		if ( ! $input ) {
			foreach ( $schema['properties'] as &$field ) {
				unset( $field['maxLength'] );
			}
			unset( $field );
		}
		return $schema;
	}
	public static function summary_schema(): array {
		return Contract::object(
			array(
				'id'          => array( 'type' => 'integer' ),
				'object_type' => array(
					'type' => 'string',
					'enum' => array( 'attachment' ),
				),
				'status'      => array( 'type' => 'string' ),
				'mime_type'   => array( 'type' => 'string' ),
				'text'        => self::text_schema( false ),
				'revision'    => Contract::revision_schema(),
				'folder_id'   => array( 'type' => 'integer' ),
			),
			array( 'id', 'object_type', 'status', 'mime_type', 'text', 'revision', 'folder_id' )
		);
	}
	public static function definitions(): array {
		$id    = array(
			'id' => array(
				'type'    => 'integer',
				'minimum' => 1,
			),
		);
		$usage = Contract::object(
			array(
				'id'          => array( 'type' => 'integer' ),
				'object_type' => array( 'type' => 'string' ),
				'title'       => array( 'type' => 'string' ),
				'context'     => array( 'type' => 'string' ),
			),
			array( 'id', 'object_type', 'title', 'context' )
		);
		return array(
			'modula/list-attachments'      => array(
				'label'         => 'List accessible attachments',
				'description'   => 'Search accessible Media Library attachments, 1–100 per page. folder_id 0 means Uncategorized; direct membership only, enumerate descendants separately only when requested. Omission means all and is appropriate only for an explicitly requested whole-library selection. Page completely, retain image MIME types outside trash, deduplicate and freeze IDs before individual revision-bound visual reads/text writes. Report incomplete enumeration; do not silently expand scope. Attachment is the supported foldable object type. No file paths, provider secrets or internal metadata are exposed.',
				'input_schema'  => Contract::object(
					Contract::pagination() + array(
						'search'    => array(
							'type'      => 'string',
							'maxLength' => 200,
						),
						'folder_id' => array(
							'type'    => 'integer',
							'minimum' => 0,
						),
					)
				),
				'output_schema' => Contract::object(
					Contract::page_output() + array(
						'attachments' => array(
							'type'  => 'array',
							'items' => self::summary_schema(),
						),
					),
					array( 'schema_version', 'attachments', 'page', 'per_page', 'total', 'total_pages' )
				),
			),
			'modula/read-attachment'       => array(
				'label'         => 'Read attachment text',
				'description'   => 'Read shared title, description, caption and alt plus a revision detecting ordinary Media Library/editor changes. This read never repairs attachment metadata.',
				'input_schema'  => Contract::object( $id, array( 'id' ) ),
				'output_schema' => Contract::object(
					array(
						'schema_version' => array( 'type' => 'string' ),
						'attachment'     => self::summary_schema(),
					),
					array( 'schema_version', 'attachment' )
				),
			),
			'modula/read-attachment-usage' => array(
				'label'         => 'Read known attachment usage',
				'description'   => 'Read indexed post/page content and featured-image uses plus Modula gallery references including local bound membership and known provider maps, filtered by current access, 1–100 per page. Unknown theme/widget/plugin/external references are not covered. No metadata repair or referring-object mutation.',
				'input_schema'  => Contract::object( $id + Contract::pagination(), array( 'id' ) ),
				'output_schema' => Contract::object(
					Contract::page_output() + array(
						'scope'  => array( 'type' => 'string' ),
						'usages' => array(
							'type'  => 'array',
							'items' => $usage,
						),
					),
					array( 'schema_version', 'scope', 'usages', 'page', 'per_page', 'total', 'total_pages' )
				),
			),
			self::UPDATE                   => array(
				'label'         => 'Update shared attachment text',
				'description'   => 'Explicit shared change to requested title, description, caption and alt only. Empty strings clear text. Preserves file bytes and gallery composition. Visual workflows must supply visual_revision from read-attachment-image-context after inspecting its revision-bound pixels; omitted visual_revision preserves compatibility for nonvisual clients. Requires current attachment permission, revision and recoverable request identity; replay returns the retained result without overwriting later edits.',
				'input_schema'  => Contract::object(
					$id + array(
						'request_id'      => Contract::request_id_schema(),
						'revision'        => Contract::revision_schema(),
						'visual_revision' => Contract::revision_schema(),
						'text'            => self::text_schema() + array( 'minProperties' => 1 ),
					),
					array( 'id', 'request_id', 'revision', 'text' )
				),
				'output_schema' => Contract::outcome_schema(),
			),
		);
	}
	private static function text( int $id ): array {
		$post = get_post( $id );
		return array(
			'title'       => $post->post_title,
			'description' => $post->post_content,
			'caption'     => $post->post_excerpt,
			'alt'         => (string) get_post_meta( $id, '_wp_attachment_image_alt', true ),
		);
	}
	public static function summary( int $id ): array {
		$revision = Revision::document( $id );
		$post     = get_post( $id );
		$map      = ( new Wpdb_Membership_Repository() )->folder_map_for_type( 'attachment' );
		$folder   = isset( $map[ $id ] ) ? Folders_Controller::service()->find( (int) $map[ $id ] ) : null;
		return array(
			'id'          => $id,
			'object_type' => 'attachment',
			'status'      => $post->post_status,
			'mime_type'   => $post->post_mime_type,
			'text'        => self::text( $id ),
			'revision'    => $revision,
			'folder_id'   => Media_Folders::accessible( $folder ) ? (int) $folder['id'] : 0,
		);
	}
	public static function read( array $input ) {
		if ( ! self::can_read( $input['id'] ) ) {
			return new \WP_Error( 'modula_forbidden', 'An accessible attachment is required.' );
		}
		$summary = self::summary( $input['id'] );
		if ( ! hash_equals( $summary['revision'], Revision::document( $input['id'] ) ) || ! self::can_read( $input['id'] ) ) {
			return new \WP_Error( 'modula_read_conflict', 'Attachment changed during inspection. Read again.' );
		}
		return array(
			'schema_version' => Contract::VERSION,
			'attachment'     => $summary,
		);
	}
	public static function listing( array $input ) {
		if ( ! Media_Folders::can_manage() ) {
			return new \WP_Error( 'modula_forbidden', 'Current media permission is required.' );
		}
		if ( ! empty( $input['folder_id'] ) && ! Media_Folders::accessible( Folders_Controller::service()->find( $input['folder_id'] ) ) ) {
			return new \WP_Error( 'modula_forbidden', 'An accessible folder is required.' );
		}
		$ids  = array();
		$page = 1;
		$map  = ( new Wpdb_Membership_Repository() )->folder_map_for_type( 'attachment' );
		do {
			$query = new \WP_Query(
				array(
					'post_type'      => 'attachment',
					'post_status'    => array( 'inherit', 'publish', 'private', 'trash' ),
					'posts_per_page' => 200,
					'paged'          => $page++,
					'fields'         => 'ids',
					'orderby'        => 'ID',
					'order'          => 'ASC',
					's'              => $input['search'] ?? '',
					'no_found_rows'  => true,
				)
			);
			foreach ( $query->posts as $id ) {
				if ( self::can_read( $id ) && ( ! isset( $input['folder_id'] ) || (int) ( $map[ $id ] ?? 0 ) === $input['folder_id'] ) ) {
					$ids[] = $id;
				}
			}
		} while ( 200 === count( $query->posts ) );
		$result = Media_Folders::page( $input, $ids, 'attachments' );
		$rows   = array();
		foreach ( $result['attachments'] as $id ) {
			$read = self::read( array( 'id' => $id ) );
			if ( is_wp_error( $read ) ) {
				return $read;
			}
			$rows[] = $read['attachment'];
		}
		$result['attachments'] = $rows;
		return $result;
	}
	public static function usage( array $input ) {
		if ( ! Folders_Dependency::available( 'usage' ) ) {
			return new \WP_Error( 'modula_forbidden', 'Attachment usage is unavailable.', array( 'status' => 403 ) );
		}
		$id = $input['id'];
		if ( ! self::can_read( $id ) ) {
			return new \WP_Error( 'modula_forbidden', 'An accessible attachment is required.' );
		}
		$rows = array();
		foreach ( Usage_Service::service()->list_for_attachment( $id ) as $row ) {
			$post = get_post( $row['post_id'] );
			if ( $post && current_user_can( 'edit_post', $post->ID ) && current_user_can( 'read_post', $post->ID ) ) {
				$rows[] = array(
					'id'          => $post->ID,
					'object_type' => $post->post_type,
					'title'       => $post->post_title,
					'context'     => $row['context'],
				);
			}
		}
		$page = 1;
		do {
			$query = new \WP_Query(
				array(
					'post_type'      => 'modula-gallery',
					'post_status'    => array_keys( get_post_stati() ),
					'posts_per_page' => 200,
					'paged'          => $page++,
					'fields'         => 'ids',
					'orderby'        => 'ID',
					'order'          => 'ASC',
					'no_found_rows'  => true,
				)
			);
			foreach ( $query->posts as $gallery_id ) {
				if ( ! Integration::can_read_post( $gallery_id ) ) {
					continue;
				}
				$items = Beta_Settings::is_beta_gallery( $gallery_id ) ? Meta_Sync::get_images_v2( $gallery_id ) : get_post_meta( $gallery_id, 'modula-images', true );
				if ( \Modula\Bound_Gallery\Bound_Gallery::references_attachment( $gallery_id, $id, is_array( $items ) ? $items : array() ) ) {
					$rows[] = array(
						'id'          => $gallery_id,
						'object_type' => 'modula-gallery',
						'title'       => get_post( $gallery_id )->post_title,
						'context'     => 'gallery_item',
					);
				}
			}
		} while ( 200 === count( $query->posts ) );
		usort(
			$rows,
			static function ( $a, $b ) {
				return array( $a['id'], $a['context'] ) <=> array( $b['id'], $b['context'] );
			}
		);
		return Media_Folders::page( $input, $rows, 'usages' ) + array( 'scope' => 'Known indexed post/page content and featured images, and Modula gallery references including local bound membership and known provider maps. Remote objects are not refreshed. Unknown theme, widget, plugin and external references are not covered.' );
	}
	public static function update( array $input ): array {
		$existing = Requests::existing( $input, self::UPDATE );
		if ( null !== $existing ) {
			return $existing;
		}
		$out = static function ( $status, $code = '', $message = '' ) use ( $input ) {
			return Requests::outcome( $input['request_id'], $status, $code, $message, self::UPDATE );
		};
		$id  = $input['id'];
		if ( ! self::can_read( $id ) ) {
			return $out( 'forbidden', 'current_permission_denied', 'Current attachment permission is required.' );
		}
		$text = array();
		foreach ( $input['text'] as $key => $value ) {
			$text[ $key ] = in_array( $key, array( 'title', 'alt' ), true ) ? sanitize_text_field( $value ) : wp_kses_post( $value );
		}
		$existing = Requests::claim( $input, self::UPDATE );
		if ( null !== $existing ) {
			return $existing;
		}
		$transaction = false;
		try {
			Revision::begin();
			$transaction = true;
			if ( ! hash_equals( Revision::document( $id, true ), $input['revision'] ) ) {
				Revision::end( false );
				$transaction = false;
				return Requests::finish( $input['request_id'], $out( 'conflict', 'stale_revision', 'Read current attachment text and reconcile before using a new identity.' ) );
			}
			if ( ! self::can_read( $id ) || 'trash' === get_post_status( $id ) ) {
				Revision::end( false );
				$transaction = false;
				return Requests::finish( $input['request_id'], $out( 'rejected', 'unsupported_target', 'An accessible attachment outside trash is required.' ) );
			}
			if ( isset( $input['visual_revision'] ) ) {
				$visual = Attachment_Image::visual_revision( $id );
				if ( is_wp_error( $visual ) || ! hash_equals( $visual, $input['visual_revision'] ) ) {
					Revision::end( false );
					$transaction = false;
					return Requests::finish( $input['request_id'], $out( 'conflict', 'stale_visual_revision', 'Image source changed or is unavailable. Read context and inspect again before saving.' ) );
				}
			}
			$post = array( 'ID' => $id );
			foreach ( array(
				'title'       => 'post_title',
				'description' => 'post_content',
				'caption'     => 'post_excerpt',
			) as $key => $field ) {
				if ( array_key_exists( $key, $text ) ) {
					$post[ $field ] = $text[ $key ];
				}
			}
			if ( count( $post ) > 1 && is_wp_error( wp_update_post( wp_slash( $post ), true ) ) ) {
				throw new \RuntimeException( 'Text save failed.' );
			}
			if ( array_key_exists( 'alt', $text ) ) {
				update_post_meta( $id, '_wp_attachment_image_alt', wp_slash( $text['alt'] ) );
			}
			Revision::clear_cache();
			$saved = self::text( $id );
			foreach ( $text as $key => $value ) {
				if ( $saved[ $key ] !== $value ) {
					throw new \RuntimeException( 'Text confirmation failed.' );
				}
			}
			if ( isset( $input['visual_revision'] ) ) {
				$visual = Attachment_Image::visual_revision( $id );
				if ( is_wp_error( $visual ) || ! hash_equals( $visual, $input['visual_revision'] ) ) {
					Revision::end( false );
					$transaction = false;
					return Requests::finish( $input['request_id'], $out( 'conflict', 'stale_visual_revision', 'Image source changed or is unavailable. Read context and inspect again before saving.' ) );
				}
			}
			$response               = $out( 'succeeded' );
			$response['attachment'] = self::summary( $id );
			$response               = Requests::finish( $input['request_id'], $response );
			Revision::end( true );
			$transaction = false;
			return $response;
		} catch ( \Throwable $error ) {
			if ( $transaction ) {
				Revision::end( false );
			}
			return Requests::finish( $input['request_id'], $out( 'uncertain', 'attachment_update_unconfirmed', 'Text save could not be confirmed. Recover this identity before taking further action.' ) );
		}
	}
}
