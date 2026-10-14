<?php
/** Optional WordPress Abilities API integration; MCP remains a separate transport. */
namespace Modula\V2\Abilities;

use Modula\V2\Beta_Settings;
use Modula\V2\Freeform_Catalog;
use Modula\V2\Meta_Sync;
use Modula\V2\Images\Adapter;

defined( 'ABSPATH' ) || exit;

final class Integration {
	public const DISCOVER       = 'modula/discover';
	public const LIST_GALLERIES = 'modula/list-galleries';
	public const READ_GALLERY   = 'modula/read-gallery';

	public static function init(): void {
		if ( ! function_exists( 'wp_register_ability' ) || ! function_exists( 'wp_register_ability_category' ) || ! function_exists( 'wp_get_ability' ) ) {
			return;
		}
		Attachment_Image::init();
		Galleries::boot();
		Intake::boot();
		Media::boot();
		Album_Explanation::boot();
		Preset_Explanation::boot();
		Intake_Explanation::boot();
		Collection_Explanation::boot();
		Storage_Explanation::boot();
		Transfer_Explanation::boot();
		Bound_Explanation::boot();
		Video_Explanation::boot();
		Instagram_Explanation::boot();
		Watermark_Explanation::boot();
		Proofing_Explanation::boot();
		Site_Settings::boot();
		Input_Context::boot();
		Site_Explanation::boot();
		add_action( 'modula_abilities_cleanup', array( Requests::class, 'cleanup' ) );
		add_action( 'wp_abilities_api_categories_init', array( __CLASS__, 'register_category' ) );
		add_action( 'wp_abilities_api_init', array( __CLASS__, 'register_abilities' ) );
	}

	public static function abilities(): array {
		return array(
			self::DISCOVER       => array(
				'execute' => array( self::class, 'discover' ),
			),
			self::LIST_GALLERIES => array(
				'execute' => array( self::class, 'list_galleries' ),
			),
			self::READ_GALLERY   => array(
				'execute'    => array( self::class, 'read_gallery' ),
				'permission' => array( self::class, 'can_read_gallery' ),
			),
		);
	}

	/** @return array<int,class-string> */
	private static function owners(): array {
		return array(
			self::class,
			Batch::class,
			Embedded::class,
			Composition::class,
			Update::class,
			Creation::class,
			Requests::class,
			Lifecycle::class,
			Proofing_Email::class,
			Proofing_Selections::class,
			Proofing::class,
			Proofing_Clients::class,
			Instagram::class,
			Watermark::class,
			Video::class,
			Transfers::class,
			Bound::class,
			Storage::class,
			Replacement::class,
			Diagnostics::class,
			Intake::class,
			Site_Settings::class,
			Attachment_Lifecycle::class,
			Collections::class,
			Attachment_Image::class,
			Attachments::class,
			Media_Folders::class,
			Album_Lifecycle::class,
			Album_Members::class,
			Albums::class,
			Presets::class,
			Album_Presets::class,
		);
	}

	/**
	 * @return array<string,array{execute:callable,permission:?callable,gates:array<int,callable>,destructive:bool,outcome:bool}>
	 */
	private static function table(): array {
		static $table = null;
		if ( is_array( $table ) ) {
			return $table;
		}
		$table = Operation_Table::collect( self::owners() );
		return $table;
	}

	/**
	 * @return array<string,mixed>
	 */
	public static function operation( string $name ): array {
		return self::table()[ $name ] ?? array();
	}

	public static function callback_map(): array {
		$callbacks = array();
		foreach ( self::table() as $name => $row ) {
			$callbacks[ $name ] = $row['execute'];
		}
		return $callbacks;
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
		$callbacks = Providers::callbacks();
		$table     = self::table();
		foreach ( Contract::definitions() as $name => $definition ) {
			if ( ! isset( $callbacks[ $name ] ) ) {
				continue;
			}
			$row                               = isset( $table[ $name ] ) ? $table[ $name ] : array();
			$readonly                          = ! Contract::is_mutation( $name );
			$definition['category']            = 'modula';
			$definition['execute_callback']    = $callbacks[ $name ];
			$definition['permission_callback'] = isset( $row['permission'] ) ? $row['permission'] : array( self::class, 'can_discover' );
			if ( ! $readonly || ! empty( $row['outcome'] ) || Catalog::requires_compatible_pro( $name ) ) {
				$definition['ability_class'] = Outcome_Ability::class;
			}
			$definition['meta'] = array(
				'mcp'          => array(
					'public' => Folders_Dependency::operation_available( $name ),
					'type'   => 'tool',
				),
				'annotations'  => array(
					'readonly'    => $readonly,
					'destructive' => ! empty( $row['destructive'] ),
					'idempotent'  => true,
				),
				'show_in_rest' => true,
			);
			wp_register_ability( $name, $definition );
		}
	}

	public static function can_recover(): bool {
		return Proofing_Clients::can_manage() || self::can_discover() || Media_Folders::can_manage() || Site_Settings::can_manage() || Intake::can_upload();
	}

	/** Dynamic CPT primitive follows Roles customizations instead of assuming a role name. */
	public static function can_discover( $input = array() ): bool {
		if ( ! get_current_user_id() ) {
			return false;
		}
		if ( Site_Settings::can_manage() ) {
			return true;
		}
		$types = array( 'modula-gallery' );
		if ( Albums::available() ) {
			$types[] = 'modula-album';
		}
		if ( Album_Presets::available() ) {
			$types[] = 'defaults-albums';
		}
		if ( Presets::available() ) {
			$types[] = 'modula-defaults';
		}
		foreach ( $types as $name ) {
			$type = get_post_type_object( $name );
			if ( $type && current_user_can( $type->cap->edit_posts ) ) {
				return true;
			}
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

	/** Pure inspection of stored feature state; no editor bootstrap or license checks. */
	private static function features(): array {
		return Feature_Snapshot::inspect();
	}

	public static function currently_executable( string $name ): bool {
		$row = self::operation( $name );
		if ( ! $row || ! Providers::executable( $name ) || ! wp_get_ability( $name ) || Availability::blockers( $name ) ) {
			return false;
		}
		foreach ( $row['gates'] ?? array() as $gate ) {
			if ( ! $gate( $name ) ) {
				return false;
			}
		}
		return true;
	}

	public static function discover( array $input ) {
		if ( ! self::can_discover() ) {
			return self::denied();
		}
		$operations = array();
		foreach ( Contract::definitions() as $name => $definition ) {
			$executable   = self::currently_executable( $name );
			$operations[] = array(
				'name'          => $name,
				'status'        => $executable ? 'available' : 'unavailable',
				'description'   => $definition['description'],
				'readonly'      => ! Contract::is_mutation( $name ),
				'input_schema'  => $definition['input_schema'],
				'output_schema' => $definition['output_schema'],
			) + Catalog::describe( $name, $executable );
		}
		// Classic editing stays excluded. It is not a registered ability and not a placeholder family.
		$operations[]                = array(
			'name'        => 'classic-mutations',
			'status'      => 'unavailable',
			'description' => 'Classic editing and automatic conversion are outside this integration.',
			'readonly'    => false,
		);
		$page                        = self::page( $input, count( $operations ) );
		$page['capability_protocol'] = Providers::PROTOCOL;
		return $page + array(
			'operations'       => array_slice( $operations, ( $page['page'] - 1 ) * $page['per_page'], $page['per_page'] ),
			'features'         => self::features(),
			'inventory'        => Catalog::inventory(),
			'gallery_settings' => Settings_Contract::projection(),
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
		$catalog  = array_filter( Meta_Sync::get_images_v2( $id ), 'is_array' );
		foreach ( Freeform_Catalog::identify( $catalog ) as $row ) {
			$item = self::project_item( $row, $schema );
			if ( null !== $item ) {
				$items[] = $item;
			}
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

	/**
	 * @param array<string,mixed> $row
	 * @param array<string,mixed> $schema
	 * @return array<string,mixed>|null
	 */
	private static function project_item( array $row, array $schema ) {
		$kind = Adapter::get_item_kind( $row );
		if ( 'image' === $kind && ! Adapter::is_video_template_row( $row ) ) {
			$attachment_id = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
			if ( ! $attachment_id || 'attachment' !== get_post_type( $attachment_id ) || ! current_user_can( 'edit_post', $attachment_id ) ) {
				return null;
			}
			$row['id'] = $attachment_id;
		}
		$row['itemKind'] = $kind;
		foreach ( array( 'blockBackgroundImageId', 'afterAttachmentId' ) as $reference ) {
			$reference_id = isset( $row[ $reference ] ) ? (int) $row[ $reference ] : 0;
			if ( $reference_id && ( 'attachment' !== get_post_type( $reference_id ) || ! current_user_can( 'edit_post', $reference_id ) ) ) {
				unset( $row[ $reference ] );
			}
		}
		if ( ! isset( $row['id'] ) || ( ! is_int( $row['id'] ) && ! is_string( $row['id'] ) ) ) {
			return null;
		}
		return Contract::project( $row, $schema );
	}
}
