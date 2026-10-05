<?php
/** Optional WordPress Abilities API integration; MCP remains a separate transport. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;
use Modula\V2\Meta_Sync;
use Modula\V2\Images\Adapter;

defined( 'ABSPATH' ) || exit;

final class Integration {
	public static function init(): void {
		if ( ! Pro_Dependency::activates() ) {
			return;
		}
		if ( ! function_exists( 'wp_register_ability' ) || ! function_exists( 'wp_register_ability_category' ) || ! function_exists( 'wp_get_ability' ) ) {
			return;
		}
		Attachment_Image::init();
		add_action( 'modula_abilities_cleanup', array( Requests::class, 'cleanup' ) );
		add_action( 'wp_abilities_api_categories_init', array( __CLASS__, 'register_category' ) );
		add_action( 'wp_abilities_api_init', array( __CLASS__, 'register_abilities' ) );
	}

	public static function register_category(): void {
		wp_register_ability_category(
			'modula',
			array(
				'label'       => __( 'Modula', 'modula-best-grid-gallery' ),
				'description' => __( 'Discover and administer Beta galleries.', 'modula-best-grid-gallery' ),
			)
		);
	}

	public static function register_abilities(): void {
		$callbacks = array(
			Batch::MEDIA             => array( Batch::class, 'media' ),
			Batch::OPERATION         => array( Batch::class, 'execute' ),
			Embedded::OPERATION      => array( Embedded::class, 'execute' ),
			Composition::OPERATION   => array( Composition::class, 'execute' ),
			'modula/update-gallery'  => array( Update::class, 'execute' ),
			'modula/create-gallery'  => array( Creation::class, 'execute' ),
			'modula/recover-request' => array( Requests::class, 'recover' ),
			'modula/discover'        => 'discover',
			'modula/list-galleries'  => 'list_galleries',
			'modula/read-gallery'    => 'read_gallery',
		);
		$callbacks = array_merge( $callbacks, Proofing_Email::callbacks(), Proofing_Selections::callbacks(), Proofing::callbacks(), Proofing_Clients::callbacks(), Instagram::callbacks(), Watermark::callbacks(), Video::callbacks(), Transfers::callbacks(), Bound::callbacks(), Storage::callbacks(), Replacement::callbacks(), Diagnostics::callbacks(), Intake::callbacks(), Site_Settings::callbacks(), Attachment_Lifecycle::callbacks(), Collections::callbacks(), Attachment_Image::callbacks(), Attachments::callbacks(), Media_Folders::callbacks(), Album_Lifecycle::callbacks(), Album_Members::callbacks(), Albums::callbacks(), Presets::callbacks(), Album_Presets::callbacks() );
		foreach ( Lifecycle::operations() as $name ) {
			$callbacks[ $name ] = array( Lifecycle::class, explode( '-', substr( $name, 7 ) )[0] ); }
		foreach ( Contract::definitions() as $name => $definition ) {
			$definition['category']         = 'modula';
			$definition['execute_callback'] = ( is_array( $callbacks[ $name ] ) || $callbacks[ $name ] instanceof \Closure ) ? $callbacks[ $name ] : array( __CLASS__, $callbacks[ $name ] );
			$readonly                       = ! Contract::is_mutation( $name );
			if ( ! $readonly || 'modula/recover-request' === $name ) {
				$definition['ability_class'] = Outcome_Ability::class;
			}
			$definition['permission_callback'] = array( __CLASS__, 'modula/read-gallery' === $name ? 'can_read_gallery' : 'can_discover' );
			if ( isset( Attachment_Image::callbacks()[ $name ] ) || isset( Attachments::callbacks()[ $name ] ) || isset( Media_Folders::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Media_Folders::class, 'can_manage' ); }
			if ( Batch::MEDIA === $name || isset( Attachment_Lifecycle::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Media_Folders::class, 'can_manage' ); }
			if ( isset( Collections::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = static function () use ( $name ) {
					return Collections::available( $name );
				}; }
			if ( 'modula/read-attachment-usage' === $name ) {
				$definition['permission_callback'] = static function () {
					return Media_Folders::can_manage() && Folders_Dependency::available( 'usage' );
				}; }
			if ( isset( Attachment_Lifecycle::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = static function () use ( $name ) {
					return Media_Folders::can_manage() && Folders_Dependency::available( 'usage' );
				}; }
			if ( isset( Intake::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Intake::class, 'can_upload' ); }
			if ( in_array( $name, array( Server_Import::BROWSE, Server_Import::IMPORT ), true ) ) {
				$definition['permission_callback'] = array( Server_Import::class, 'can_import' ); }
			if ( isset( Site_Settings::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Site_Settings::class, Site_Settings::EXTENSION === $name ? 'can_extend' : 'can_manage' ); }
			if ( isset( Diagnostics::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Diagnostics::class, 'can_manage' ); }
			if ( isset( Transfers::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Transfers::class, 'available' ); }
			if ( isset( Bound::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Bound::class, 'available' ); }
			if ( isset( Storage::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Storage::class, 'available' ); }
			if ( ( isset( Proofing::callbacks()[ $name ] ) || isset( Proofing_Email::callbacks()[ $name ] ) || isset( Proofing_Selections::callbacks()[ $name ] ) ) ) {
				$definition['permission_callback'] = array( Proofing::class, 'available' ); }
			if ( isset( Proofing_Clients::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Proofing_Clients::class, 'can_manage' ); }
			if ( isset( Watermark::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Watermark::class, 'available' ); }
			if ( isset( Instagram::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Instagram::class, 'available' ); }
			if ( isset( Video::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Video::class, 'available' ); }
			if ( isset( Replacement::callbacks()[ $name ] ) ) {
				$definition['permission_callback'] = array( Replacement::class, 'available' ); }
			if ( 'modula/recover-request' === $name ) {
				$definition['permission_callback'] = array( __CLASS__, 'can_recover' ); }
			$definition['meta'] = array(
				'mcp'          => array(
					'public' => Folders_Dependency::operation_available( $name ),
					'type'   => 'tool',
				),
				'annotations'  => array(
					'readonly'    => $readonly,
					'destructive' => in_array( $name, array( Proofing_Selections::DELETE, Proofing::DELETE, Watermark::APPLY, Watermark::REMOVE, Transfers::START, Transfers::LIBRARY, Transfers::CANCEL, Storage::UNINGEST, Storage::DELETE, Replacement::WRITE, Diagnostics::CLEAR, Server_Import::IMPORT, Batch::MEDIA, 'modula/delete-attachment', 'modula/trash-attachment', 'modula/delete-collection', 'modula/delete-media-folder', 'modula/trash-album', 'modula/delete-album', 'modula/trash-gallery', 'modula/delete-gallery', 'modula/delete-gallery-preset', 'modula/delete-album-preset' ), true ),
					'idempotent'  => true,
				),
				'show_in_rest' => true,
			);
			wp_register_ability( $name, $definition );
		}
	}

	public static function can_recover(): bool {
		return Proofing_Clients::can_manage() || self::can_discover() || Media_Folders::can_manage() || Site_Settings::can_manage() || Intake::can_upload(); }
	/** Dynamic CPT primitive follows Roles customizations instead of assuming a role name. */
	public static function can_discover( $input = array() ): bool {
		if ( ! get_current_user_id() ) {
			return false; }
		if ( Site_Settings::can_manage() ) {
			return true; }
		$types = array( 'modula-gallery' );
		if ( Albums::available() ) {
			$types[] = 'modula-album'; }
		if ( Album_Presets::available() ) {
			$types[] = 'defaults-albums'; }
		if ( Presets::available() ) {
			$types[] = 'modula-defaults'; }
		foreach ( $types as $name ) {
			$type = get_post_type_object( $name );
			if ( $type && current_user_can( $type->cap->edit_posts ) ) {
				return true; }
		}
		return false;
	}

	public static function can_read_gallery( $input ): bool {
		$id = is_array( $input ) && isset( $input['id'] ) ? (int) $input['id'] : 0;
		return self::can_discover() && self::can_read_post( $id );
	}

	public static function can_read_post( int $id ): bool {
		$post = get_post( $id );
		return $post && 'modula-gallery' === $post->post_type && current_user_can( 'edit_post', $id ) && ( 'private' !== $post->post_status || current_user_can( 'read_post', $id ) );
	}

	private static function denied(): \WP_Error {
		return new \WP_Error( 'modula_forbidden', __( 'You are not allowed to read this Modula resource.', 'modula-best-grid-gallery' ), array( 'status' => 403 ) );
	}

	private static function page( array $input, int $total ): array {
		$page = isset( $input['page'] ) ? (int) $input['page'] : 1;
		$size = isset( $input['per_page'] ) ? (int) $input['per_page'] : 20;
		return array(
			'schema_version' => Contract::VERSION,
			'page'           => $page,
			'per_page'       => $size,
			'total'          => $total,
			'total_pages'    => (int) ceil( $total / $size ),
		);
	}

	public static function gallery( \WP_Post $post ): array {
		return array(
			'id'         => (int) $post->ID,
			'title'      => (string) $post->post_title,
			'status'     => (string) $post->post_status,
			'editor_url' => admin_url( 'post.php?post=' . $post->ID . '&action=edit' ),
			'shortcode'  => '[modula id="' . $post->ID . '"]',
		);
	}

	/** Pure inspection of the Compatible Pro seam; no editor bootstrap or license checks. */
	private static function features(): array {
		$compatible = function_exists( 'modula_is_compatible_pro' ) && modula_is_compatible_pro();
		$extensions = Pro_Dependency::extensions();
		$status     = Pro_Dependency::license_status();
		return array(
			'lite_version'   => defined( 'MODULA_LITE_VERSION' ) ? (string) MODULA_LITE_VERSION : '',
			'pro_version'    => defined( 'MODULA_PRO_VERSION' ) ? (string) MODULA_PRO_VERSION : '',
			'compatible_pro' => $compatible,
			'license_status' => $status,
			'license_source' => 'stored',
			'extensions'     => empty( $extensions ) ? new \stdClass() : $extensions,
		);
	}

	public static function discover( array $input ) {
		if ( ! self::can_discover() ) {
			return self::denied();
		}
		$operations = array();
		foreach ( Contract::definitions() as $name => $definition ) {
			$ability      = wp_get_ability( $name );
			$operations[] = array(
				'name'          => $name,
				'status'        => $ability && ( ! ( isset( Proofing::callbacks()[ $name ] ) || isset( Proofing_Email::callbacks()[ $name ] ) || isset( Proofing_Selections::callbacks()[ $name ] ) ) || Proofing::available() ) && ( ! isset( Proofing_Clients::callbacks()[ $name ] ) || Proofing_Clients::can_manage() ) && ( ! isset( Instagram::callbacks()[ $name ] ) || Instagram::available() ) && ( ! isset( Watermark::callbacks()[ $name ] ) || Watermark::available() ) && ( ! isset( Video::callbacks()[ $name ] ) || Video::available() ) && ( ! isset( Transfers::callbacks()[ $name ] ) || Transfers::available() ) && ( ! isset( Bound::callbacks()[ $name ] ) || Bound::available() ) && ( ! isset( Storage::callbacks()[ $name ] ) || Storage::available() ) && ( ! isset( Replacement::callbacks()[ $name ] ) || Replacement::available() ) && ( ! isset( Diagnostics::callbacks()[ $name ] ) || Diagnostics::can_manage() ) && ( ! in_array( $name, array( Server_Import::BROWSE, Server_Import::IMPORT ), true ) || Server_Import::can_import() ) && ( ! isset( Intake::callbacks()[ $name ] ) || Intake::can_upload() ) && ( ! isset( Site_Settings::callbacks()[ $name ] ) || ( Site_Settings::EXTENSION === $name ? Site_Settings::can_extend() : Site_Settings::can_manage() ) ) && ( 'modula/read-attachment-usage' !== $name || Folders_Dependency::available( 'usage' ) ) && ( Batch::MEDIA !== $name || Media_Folders::can_manage() ) && ( ! isset( Attachment_Lifecycle::callbacks()[ $name ] ) || Attachment_Lifecycle::available( $name ) ) && ( ! isset( Collections::callbacks()[ $name ] ) || Collections::available( $name ) ) && ( ! isset( Attachment_Image::callbacks()[ $name ] ) && ! isset( Media_Folders::callbacks()[ $name ] ) && ! isset( Attachments::callbacks()[ $name ] ) || Media_Folders::can_manage() ) && ( ! isset( Album_Lifecycle::callbacks()[ $name ] ) || Albums::available() ) && ( ! isset( Album_Members::callbacks()[ $name ] ) || Albums::available() ) && ( ! isset( Album_Presets::callbacks()[ $name ] ) || Album_Presets::available() ) && ( ! isset( Albums::callbacks()[ $name ] ) || Albums::available() ) && ( ! isset( Presets::callbacks()[ $name ] ) || Presets::available() ) ? 'available' : 'unavailable',
				'description'   => $definition['description'],
				'readonly'      => ! Contract::is_mutation( $name ),
				'input_schema'  => $definition['input_schema'],
				'output_schema' => $definition['output_schema'],
			);
		}
		// Semantic families deliberately have no registered or promised future ability name.
		foreach ( array( 'gallery-mutations', 'album-members-and-lifecycle', 'media-organization', 'storage', 'proofing', 'ai', 'site-administration' ) as $family ) {
			$operations[] = array(
				'name'        => $family,
				'status'      => 'planned',
				'description' => 'Planned operation family; no executable ability is registered.',
				'readonly'    => false,
			);
		}
		$operations[] = array(
			'name'        => 'classic-mutations',
			'status'      => 'unavailable',
			'description' => 'Classic editing and automatic conversion are outside this integration.',
			'readonly'    => false,
		);
		$page         = self::page( $input, count( $operations ) );
		return $page + array(
			'operations' => array_slice( $operations, ( $page['page'] - 1 ) * $page['per_page'], $page['per_page'] ),
			'features'   => self::features(),
		);
	}

	public static function list_galleries( array $input ) {
		if ( ! self::can_discover() ) {
			return self::denied();
		}
		$status     = $input['status'] ?? 'any';
		$statuses   = 'any' === $status ? array( 'publish', 'draft', 'pending', 'private', 'future', 'trash' ) : array( $status );
		$accessible = array();
		// Fetch only IDs in bounded database pages; totals never count inaccessible targets.
		$scan_page = 1;
		do {
			$query = new \WP_Query(
				array(
					'post_type'              => 'modula-gallery',
					'post_status'            => $statuses,
					'posts_per_page'         => 200,
					'paged'                  => $scan_page++,
					'fields'                 => 'ids',
					'orderby'                => 'ID',
					'order'                  => 'ASC',
					'no_found_rows'          => true,
					'update_post_meta_cache' => false,
					'update_post_term_cache' => false,
					's'                      => $input['search'] ?? '',
					'meta_key'               => Beta_Settings::META_KEY,
					'meta_value'             => '1',
				)
			);
			foreach ( $query->posts as $id ) {
				if ( self::can_read_post( (int) $id ) && Beta_Settings::is_beta_gallery( $id ) ) {
					$accessible[] = (int) $id;
				}
			}
		} while ( 200 === count( $query->posts ) );
		$page      = self::page( $input, count( $accessible ) );
		$galleries = array();
		foreach ( array_slice( $accessible, ( $page['page'] - 1 ) * $page['per_page'], $page['per_page'] ) as $id ) {
			// Recheck the target immediately before projecting content.
			if ( self::can_read_post( $id ) ) {
				$galleries[] = self::gallery( get_post( $id ) );
			}
		}
		return $page + array( 'galleries' => $galleries );
	}

	public static function read_gallery( array $input ) {
		if ( ! self::can_read_gallery( $input ) ) {
			return self::denied();
		}
		$id = (int) $input['id'];
		if ( ! Beta_Settings::is_beta_gallery( $id ) ) {
			return new \WP_Error( 'modula_classic_unsupported', __( 'This operation supports Beta galleries only.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) );
		}
		$revision = Revision::state( $id );
		$items    = array();
		$schema   = Contract::item_schema();
		foreach ( Meta_Sync::get_images_v2( $id ) as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$kind = Adapter::get_item_kind( $row );
			if ( 'image' === $kind && ! Adapter::is_video_template_row( $row ) ) {
				$attachment_id = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
				if ( ! $attachment_id || 'attachment' !== get_post_type( $attachment_id ) || ! current_user_can( 'edit_post', $attachment_id ) ) {
					continue;
				}
				$row['id'] = $attachment_id;
			}
			$row['itemKind'] = $kind;
			foreach ( array( 'blockBackgroundImageId', 'afterAttachmentId' ) as $reference ) {
				if ( ! empty( $row[ $reference ] ) && ( 'attachment' !== get_post_type( (int) $row[ $reference ] ) || ! current_user_can( 'edit_post', (int) $row[ $reference ] ) ) ) {
					unset( $row[ $reference ] );
				}
			}
			if ( ! isset( $row['id'] ) || ( ! is_int( $row['id'] ) && ! is_string( $row['id'] ) ) ) {
				continue;
			}
			$items[] = Contract::project( $row, $schema );
		}
		$gallery             = self::gallery( get_post( $id ) );
		$gallery['settings'] = Contract::project( Meta_Sync::get_settings_v2( $id, false ), Contract::settings_schema() );
		$gallery['revision'] = Revision::state( $id );
		if ( ! hash_equals( $revision, $gallery['revision'] ) ) {
			return new \WP_Error( 'modula_read_conflict', 'Gallery state changed during inspection. Read again.', array( 'status' => 409 ) );
		}
		$page = self::page( $input, count( $items ) );
		return $page + array(
			'gallery' => $gallery,
			'items'   => array_slice( $items, ( $page['page'] - 1 ) * $page['per_page'], $page['per_page'] ),
		);
	}
}
