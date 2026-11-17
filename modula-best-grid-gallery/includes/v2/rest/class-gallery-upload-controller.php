<?php
/**
 * REST endpoints for server-side folder import (browser) and related upload helpers.
 * Replaces legacy admin-ajax handlers from Modula_Gallery_Upload.
 *
 * @package Modula
 */

namespace Modula\V2\Rest;

defined( 'ABSPATH' ) || exit;

/**
 * Class Gallery_Upload_Controller
 */
class Gallery_Upload_Controller {

	const NAMESPACE = Settings_Controller::NAMESPACE;

	/** Attachment ids one item-rows request may ask for; the editor sends larger picks in batches. */
	const MAX_ITEM_ROW_IDS = 50;

	/**
	 * Register REST routes.
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Shared gallery ID args.
	 *
	 * @return array
	 */
	private static function gallery_id_args() {
		return array(
			'id' => array(
				'required'          => true,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'validate_callback' => function ( $param ) {
					return $param > 0;
				},
			),
		);
	}

	/**
	 * Args of the item-rows route. The layout is the editor's working one, which
	 * may not be saved yet; each key left out falls back to the stored settings.
	 *
	 * @return array
	 */
	private static function item_rows_args() {
		return array_merge(
			self::gallery_id_args(),
			array(
				'ids'     => array(
					'required' => true,
					'type'     => 'array',
					'minItems' => 1,
					'maxItems' => self::MAX_ITEM_ROW_IDS,
					'items'    => array(
						'type'    => 'integer',
						'minimum' => 1,
					),
				),
				'type'    => array(
					'type'              => 'string',
					'validate_callback' => array( __CLASS__, 'is_registered_gallery_type' ),
				),
				'columns' => array(
					'type'    => 'integer',
					'minimum' => 1,
					'maximum' => 12,
				),
			)
		);
	}

	/**
	 * `type` of the item-rows route: one of the registered gallery types. The
	 * settings schema owns the list (Pro's types included); it is read when
	 * the route is called, not on every REST request.
	 *
	 * @param mixed $type Request value.
	 * @return bool
	 */
	public static function is_registered_gallery_type( $type ) {
		$types = \Modula\V2\Settings\Registry::get_schema()['general']['type']['enum'] ?? array();
		return is_string( $type ) && in_array( $type, (array) $types, true );
	}

	/**
	 * Promote auto-draft → publish (or draft if the user cannot publish) and seed defaults before mutating gallery data.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return int|\WP_Error Gallery post ID.
	 */
	private static function prepare_gallery_write( $request ) {
		$id     = (int) $request['id'];
		$title  = '';
		$params = $request->get_json_params();
		if ( is_array( $params ) && isset( $params['postTitle'] ) && is_string( $params['postTitle'] ) ) {
			$title = $params['postTitle'];
		}

		return \Modula\V2\Gallery_Post::ensure_persistable( $id, $title );
	}

	/**
	 * @param int                  $gallery_id Gallery post ID.
	 * @param array<string, mixed> $payload    Response body.
	 * @return \WP_REST_Response
	 */
	private static function write_response( $gallery_id, array $payload ) {
		if ( isset( $payload['image'] ) && is_array( $payload['image'] ) ) {
			$payload['image'] = self::hydrate_image_row_src( $payload['image'] );
		}
		return new \WP_REST_Response(
			array_merge( $payload, \Modula\V2\Gallery_Post::rest_response_meta( $gallery_id ) ),
			200
		);
	}

	/**
	 * Attach a live src for the editor response without persisting a gallery item file URL.
	 *
	 * @param array<string, mixed> $row Catalog row.
	 * @return array<string, mixed>
	 */
	private static function hydrate_image_row_src( array $row ) {
		unset( $row['url'] );
		$id = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
		if ( $id < 1 || ! function_exists( 'wp_get_attachment_image_url' ) ) {
			return $row;
		}
		$src = wp_get_attachment_image_url( $id, 'full' );
		if ( is_string( $src ) && '' !== $src ) {
			$row['src']       = $src;
			$row['thumbnail'] = $src;
		}
		return $row;
	}

	/**
	 * Register routes.
	 */
	public static function register_routes() {
		if ( ! class_exists( 'Modula_Gallery_Upload', false ) ) {
			// Admin-conditional loader skips this file on REST; endpoints need it on every request.
			require_once MODULA_PATH . 'includes/admin/helpers/class-modula-gallery-upload.php';
		}

		$base      = '/gallery/(?P<id>\d+)/upload';
		$id_args   = self::gallery_id_args();
		$edit_perm = array( Settings_Controller::class, 'check_gallery_edit' );

		register_rest_route(
			self::NAMESPACE,
			$base . '/list-folders',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'list_folders' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/check-paths',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'check_paths' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/check-files',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'check_files' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/import-file',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'import_file' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		// Media Library only: the editor's folder/ZIP import (ADR 0059). The gallery is not written.
		register_rest_route(
			self::NAMESPACE,
			$base . '/import-media-file',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'import_media_file' ),
				'permission_callback' => $edit_perm,
				'args'                => self::import_media_file_args(),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/add-images',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'add_images' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/remove-image-by-index',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'remove_image_by_index' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/replace-image-by-index',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'replace_image_by_index' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/patch-image-by-index',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'patch_image_by_index' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/set-gallery-sorting',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'set_gallery_sorting' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/reorder-images',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'reorder_images' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/apply-sorting-and-order',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'apply_sorting_and_order' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/save-merged-items',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'save_merged_items' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/move-to-caption',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'move_to_caption' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/unzip',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'unzip' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			$base . '/dismiss-errors',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'dismiss_errors' ),
				'permission_callback' => $edit_perm,
				'args'                => $id_args,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/gallery/(?P<id>\d+)/item-rows',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'build_item_rows' ),
				'permission_callback' => array( __CLASS__, 'check_item_rows_permission' ),
				'args'                => self::item_rows_args(),
			)
		);
	}

	/**
	 * Requested attachment ids, without repeats, in request order. The schema
	 * already made each one a positive integer.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return int[]
	 */
	private static function requested_attachment_ids( $request ) {
		return array_values( array_unique( array_map( 'absint', (array) $request['ids'] ) ) );
	}

	/**
	 * Item-rows permission: edit the gallery, upload files (as add-images), and
	 * read every requested attachment. One unusable id refuses the whole request;
	 * missing, non-attachment and unreadable ids share one error, so the answer
	 * does not tell which ids exist.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return true|\WP_Error
	 */
	public static function check_item_rows_permission( $request ) {
		$gallery_allowed = Settings_Controller::check_gallery_edit( $request );
		if ( true !== $gallery_allowed ) {
			return $gallery_allowed;
		}
		if ( ! \Modula_Gallery_Upload::get_instance()->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		foreach ( self::requested_attachment_ids( $request ) as $attachment_id ) {
			if ( ! self::can_use_attachment( $attachment_id ) ) {
				return new \WP_Error(
					'modula_attachment_unavailable',
					__( 'One of the selected files is not available.', 'modula-best-grid-gallery' ),
					array(
						'status' => 403,
						'id'     => $attachment_id,
					)
				);
			}
		}
		return true;
	}

	/**
	 * @param int $attachment_id Attachment ID.
	 * @return bool Whether the current user may put this attachment in a gallery.
	 */
	private static function can_use_attachment( $attachment_id ) {
		return 'attachment' === get_post_type( $attachment_id ) && current_user_can( 'read_post', $attachment_id );
	}

	/**
	 * The layout new rows are built for: the request's working values over the
	 * stored settings, read without repairing them (a repair would write).
	 *
	 * @param \WP_REST_Request $request    Request.
	 * @param int              $gallery_id Gallery post ID.
	 * @return array{type: string, columns: int}
	 */
	private static function requested_tile_layout( $request, $gallery_id ) {
		$layout = \Modula_Gallery_Upload::get_instance()->get_stored_tile_layout( $gallery_id, false );
		if ( is_string( $request['type'] ) && '' !== $request['type'] ) {
			$layout['type'] = $request['type'];
		}
		if ( null !== $request['columns'] ) {
			$layout['columns'] = absint( $request['columns'] );
		}
		return $layout;
	}

	/**
	 * Build the gallery rows for attachments without storing anything (ADR 0059:
	 * an added or replacing image is an unsaved change until the editor save).
	 *
	 * Responds `{ images: { row, item }[] }` in request order: `row` is what
	 * add-images and replace-image-by-index store for the attachment, `item` is
	 * that row as the editor bootstrap shows it. Writes nothing to the gallery
	 * and posts no notification; `modula_image_properties` callbacks run as on
	 * add-images (Pro EXIF may store the lens in the attachment metadata).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function build_item_rows( $request ) {
		$gallery_id = (int) $request['id'];
		$layout     = self::requested_tile_layout( $request, $gallery_id );
		$upload     = \Modula_Gallery_Upload::get_instance();
		$rows       = array();
		foreach ( self::requested_attachment_ids( $request ) as $attachment_id ) {
			$row = $upload->build_attachment_image_row_for_layout( $gallery_id, $attachment_id, $layout );
			if ( is_wp_error( $row ) ) {
				return $row;
			}
			// Storing sanitizes the list once more (empty flags become 0); answer with the stored form.
			$rows[] = $upload->sanitize_modula_image_row( $row );
		}

		$shortcode = new \Modula\V2\Shortcode\Shortcode( false );
		$items     = $shortcode->build_settings_editor_items( $gallery_id, $rows, $layout['type'] );
		$images    = array();
		foreach ( $rows as $index => $row ) {
			if ( empty( $items[ $index ] ) ) {
				return new \WP_Error(
					'modula_attachment_unavailable',
					__( 'One of the selected files cannot be shown in the gallery.', 'modula-best-grid-gallery' ),
					array(
						'status' => 400,
						'id'     => (int) $row['id'],
					)
				);
			}
			$images[] = array(
				'row'  => $row,
				'item' => $items[ $index ],
			);
		}

		return new \WP_REST_Response( array( 'images' => $images ), 200 );
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function list_folders( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$params        = $request->get_json_params();
		$path          = isset( $params['path'] ) ? $params['path'] : '';
		$input_checked = ! empty( $params['input_checked'] );
		$items         = $upload->rest_list_folder_items( $path, $input_checked );
		if ( is_wp_error( $items ) ) {
			return $items;
		}
		return new \WP_REST_Response( array( 'items' => $items ), 200 );
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function check_paths( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$id     = (int) $request['id'];
		$params = $request->get_json_params();
		$paths  = isset( $params['paths'] ) ? $params['paths'] : null;
		$result = $upload->rest_check_paths( $id, $paths );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return new \WP_REST_Response( array( 'folders' => $result ), 200 );
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function check_files( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$params = $request->get_json_params();
		$paths  = isset( $params['paths'] ) ? $params['paths'] : null;
		$result = $upload->rest_check_files( $paths );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return new \WP_REST_Response( array( 'files' => $result ), 200 );
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function import_file( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$prepared = self::prepare_gallery_write( $request );
		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}
		$id     = $prepared;
		$params = $request->get_json_params();
		$file   = isset( $params['file'] ) ? $params['file'] : '';
		$delete = isset( $params['delete_files'] ) ? (bool) $params['delete_files'] : false;
		$result = $upload->rest_import_file( $id, $file, $delete );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return self::write_response( $id, array( 'attachment_id' => $result ) );
	}

	/**
	 * Args of the import-media-file route: one server file under uploads.
	 *
	 * @return array
	 */
	private static function import_media_file_args() {
		return array_merge(
			self::gallery_id_args(),
			array(
				'file'         => array(
					'required'  => true,
					'type'      => 'string',
					'minLength' => 1,
				),
				'delete_files' => array(
					'type'    => 'boolean',
					'default' => false,
				),
			)
		);
	}

	/**
	 * Import one server file into the Media Library for the gallery editor's
	 * folder and ZIP import. Shares the import (rights, path under uploads,
	 * the attachment authorization of ADR 0031) with `import-file`, and touches
	 * no gallery: no promotion of a never-saved gallery, no gallery meta, no
	 * upload-error meta. A failure is the response.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error `{ attachment_id }`.
	 */
	public static function import_media_file( $request ) {
		$attachment_id = \Modula_Gallery_Upload::get_instance()->import_file_to_media_library(
			$request->get_param( 'file' ),
			(bool) $request->get_param( 'delete_files' )
		);
		if ( is_wp_error( $attachment_id ) ) {
			return $attachment_id;
		}
		return new \WP_REST_Response( array( 'attachment_id' => $attachment_id ), 200 );
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function add_images( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$prepared = self::prepare_gallery_write( $request );
		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}
		$id     = $prepared;
		$params = $request->get_json_params();
		$ids    = isset( $params['ids'] ) ? $params['ids'] : array();
		$result = $upload->rest_add_images_payload( $id, $ids );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$upload_pos = isset( $params['upload_position'] ) ? sanitize_text_field( $params['upload_position'] ) : null;
		self::persist_appended_modula_images( $id, $result, $upload_pos );
		return self::write_response( $id, array( 'images' => $result ) );
	}

	/**
	 * Merge new image rows into modula-images (respect upload position). Triggers modula_images_v2 sync.
	 *
	 * @param int               $gallery_id              Gallery post ID.
	 * @param array       $keyed_images Map attachment_id => row (from rest_add_images_payload).
	 * @param string|null $upload_position_override Optional `start`|`end` from editor (unsaved form value).
	 */
	private static function persist_appended_modula_images( $gallery_id, array $keyed_images, $upload_position_override = null ) {
		if ( empty( $keyed_images ) ) {
			return;
		}
		$gallery_id = absint( $gallery_id );
		$existing   = get_post_meta( $gallery_id, 'modula-images', true );
		if ( ! is_array( $existing ) ) {
			$existing = array();
		}

		$position = 'end';
		if ( is_string( $upload_position_override ) && in_array( $upload_position_override, array( 'start', 'end' ), true ) ) {
			$position = $upload_position_override;
		} else {
			$v2 = \Modula\V2\Meta_Sync::get_settings_v2( $gallery_id );
			if ( isset( $v2['general']['uploadPosition'] ) && 'start' === $v2['general']['uploadPosition'] ) {
				$position = 'start';
			} else {
				$flat = get_post_meta( $gallery_id, 'modula-settings', true );
				if ( is_array( $flat ) && isset( $flat['upload_position'] ) ) {
					$up = $flat['upload_position'];
					if ( 'start' === $up || '1' === $up || 1 === $up || true === $up ) {
						$position = 'start';
					}
				}
			}
		}

		$existing_ids = array();
		foreach ( $existing as $row ) {
			if ( isset( $row['id'] ) ) {
				$existing_ids[ (string) absint( $row['id'] ) ] = true;
			}
		}

		$new_rows = array();
		foreach ( $keyed_images as $img_key => $row ) {
			$aid = isset( $row['id'] ) ? absint( $row['id'] ) : absint( $img_key );
			if ( ! $aid || isset( $existing_ids[ (string) $aid ] ) ) {
				continue;
			}
			$new_rows[]                    = $row;
			$existing_ids[ (string) $aid ] = true;
		}

		if ( empty( $new_rows ) ) {
			return;
		}

		if ( 'start' === $position ) {
			$merged = array_merge( $new_rows, $existing );
		} else {
			$merged = array_merge( $existing, $new_rows );
		}

		$upload = \Modula_Gallery_Upload::get_instance();
		$clean  = $upload->sanitize_modula_images_list( $merged );
		update_post_meta( $gallery_id, 'modula-images', $clean );
		\Modula\V2\Meta_Sync::sync_modula_images_v2_from_list( $gallery_id, $clean );
	}

	/**
	 * Load modula-images as a list.
	 *
	 * @param int $gallery_id Post ID.
	 * @return array<int, array<string, mixed>>
	 */
	private static function get_modula_images_list( $gallery_id ) {
		if ( class_exists( '\Modula\Bound_Gallery\Bound_Gallery', false ) ) {
			$rows = \Modula\Bound_Gallery\Bound_Gallery::get_image_rows( $gallery_id );
			return \Modula\V2\Freeform_Catalog::project_identities( (int) $gallery_id, $rows );
		}
		$raw = get_post_meta( $gallery_id, 'modula-images', true );
		return \Modula\V2\Freeform_Catalog::project_identities( (int) $gallery_id, is_array( $raw ) ? $raw : array() );
	}

	/**
	 * Persist full modula-images array (sanitized). Triggers modula_images_v2 via Meta_Sync.
	 *
	 * @param int   $gallery_id Gallery post ID.
	 * @param array $images     Rows.
	 */
	private static function persist_modula_images_list( $gallery_id, array $images ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		$clean  = $upload->sanitize_modula_images_list( $images );
		update_post_meta( $gallery_id, 'modula-images', $clean );
		\Modula\V2\Meta_Sync::sync_modula_images_v2_from_list( $gallery_id, $clean );
	}

	/**
	 * Move the gallery's row-only captions into their empty Media Library Caption (Beta only).
	 *
	 * Skipped attachments do not fail the save, so the outcome is not reported.
	 *
	 * @param int                              $gallery_id Gallery post ID.
	 * @param array<int, array<string, mixed>> $rows       Gallery rows.
	 */
	private static function move_row_only_captions( $gallery_id, array $rows ) {
		\Modula\V2\Legacy_Caption_Move::move_row_only_captions( $gallery_id, $rows, \Modula_Gallery_Upload::get_instance() );
	}

	/**
	 * Remove one image row by index in modula-images (0-based).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function remove_image_by_index( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$prepared = self::prepare_gallery_write( $request );
		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}
		$gallery_id = $prepared;
		$params     = $request->get_json_params();
		$index      = isset( $params['index'] ) ? absint( $params['index'] ) : null;
		if ( null === $index ) {
			return new \WP_Error(
				'modula_bad_index',
				__( 'Invalid image index.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$images = self::get_modula_images_list( $gallery_id );
		if ( $index >= count( $images ) ) {
			return new \WP_Error(
				'modula_bad_index',
				__( 'Invalid image index.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$removed       = isset( $images[ $index ] ) && is_array( $images[ $index ] ) ? $images[ $index ] : array();
		$attachment_id = isset( $removed['id'] ) ? absint( $removed['id'] ) : 0;
		if ( $attachment_id && class_exists( '\Modula\Bound_Gallery\Bound_Gallery', false ) ) {
			\Modula\Bound_Gallery\Bound_Gallery::exclude_attachment( $gallery_id, $attachment_id );
		}
		array_splice( $images, $index, 1 );
		self::persist_modula_images_list( $gallery_id, $images );
		return self::write_response( $gallery_id, array( 'ok' => true ) );
	}

	/**
	 * Replace attachment at index (new row from attachment metadata).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function replace_image_by_index( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$prepared = self::prepare_gallery_write( $request );
		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}
		$gallery_id = $prepared;
		$params     = $request->get_json_params();
		$index      = isset( $params['index'] ) ? absint( $params['index'] ) : null;
		$new_id     = isset( $params['attachment_id'] ) ? absint( $params['attachment_id'] ) : 0;
		if ( null === $index || ! $new_id ) {
			return new \WP_Error(
				'modula_bad_request',
				__( 'Invalid index or attachment.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$images = self::get_modula_images_list( $gallery_id );
		if ( $index >= count( $images ) ) {
			return new \WP_Error(
				'modula_bad_index',
				__( 'Invalid image index.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$row = $upload->rest_build_single_image_row( $gallery_id, $new_id );
		if ( is_wp_error( $row ) ) {
			return $row;
		}
		$images[ $index ] = $row;
		self::persist_modula_images_list( $gallery_id, $images );
		return self::write_response( $gallery_id, array( 'image' => $images[ $index ] ) );
	}

	/**
	 * Merge fields into one modula-images row (e.g. title, alt, description, link).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function patch_image_by_index( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$prepared = self::prepare_gallery_write( $request );
		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}
		$gallery_id = $prepared;
		$params     = $request->get_json_params();
		$index      = isset( $params['index'] ) ? absint( $params['index'] ) : null;
		$fields     = isset( $params['fields'] ) && is_array( $params['fields'] ) ? $params['fields'] : null;
		if ( null === $index || null === $fields ) {
			return new \WP_Error(
				'modula_bad_request',
				__( 'Invalid index or fields.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$images = self::get_modula_images_list( $gallery_id );
		if ( $index >= count( $images ) ) {
			return new \WP_Error(
				'modula_bad_index',
				__( 'Invalid image index.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$current = isset( $images[ $index ] ) && is_array( $images[ $index ] ) ? $images[ $index ] : array();

		$patch_sets_caption  = array_key_exists( 'description', $fields );
		$attachment_id       = isset( $current['id'] ) ? absint( $current['id'] ) : 0;
		$media_keys          = array( 'title', 'alt', 'description' );
		$explicit_clear_keys = array();

		// Title / alt / caption-description live on the attachment; sync there first, then mirror into modula-images.
		if ( $attachment_id && get_post( $attachment_id ) && 'attachment' === get_post_type( $attachment_id ) ) {
			$media_subset = array();
			foreach ( $media_keys as $k ) {
				if ( array_key_exists( $k, $fields ) ) {
					$media_subset[ $k ] = $fields[ $k ];
				}
			}
			if ( ! empty( $media_subset ) ) {
				/**
				 * Filter attachment text fields before they are written in patch-image-by-index.
				 *
				 * @param array $media_subset  Keys among title, alt, description.
				 * @param int   $attachment_id Attachment ID.
				 * @param int   $gallery_id    Gallery post ID.
				 * @param int   $index         modula-images row index.
				 */
				$media_subset = apply_filters(
					'modula_gallery_patch_image_attachment_text_fields',
					$media_subset,
					$attachment_id,
					$gallery_id,
					$index
				);
				$explicit_clear_keys = modula_attachment_text_keys_explicitly_cleared( $media_subset );
				$synced              = $upload->apply_modula_media_fields_to_attachment( $attachment_id, $media_subset );
				if ( is_wp_error( $synced ) ) {
					return $synced;
				}
			}
			foreach ( $media_keys as $k ) {
				unset( $fields[ $k ] );
			}
		}

		$merged = array_merge( $current, $fields );
		if ( isset( $current['id'] ) ) {
			$merged['id'] = $current['id'];
		}
		if ( $attachment_id && get_post( $attachment_id ) && 'attachment' === get_post_type( $attachment_id ) ) {
			$merged = $upload->overlay_modula_row_attachment_text_from_post(
				$merged,
				$attachment_id,
				$explicit_clear_keys
			);
			if ( ! $patch_sets_caption ) {
				// The overlay copied the Caption; while it is empty, a row-only caption stays on the row.
				$merged['description'] = modula_resolve_gallery_item_caption(
					$merged['description'],
					isset( $current['description'] ) ? $current['description'] : ''
				);
			}
		}
		$sanitized = $upload->sanitize_modula_image_row( $merged );
		// Sanitize whitelists every key; missing `id` becomes ''. Restore from the row we merged so the client never gets an empty id (would drop the tile).
		if ( isset( $current['id'] ) && ( ! isset( $sanitized['id'] ) || '' === $sanitized['id'] ) ) {
			$sanitized['id'] = $current['id'];
		}
		$images[ $index ] = $sanitized;
		self::persist_modula_images_list( $gallery_id, $images );

		/*
		 * After every write that can fail. A patch that sets or clears this image's caption
		 * is the only caption write for its attachment, so a duplicate row cannot undo it.
		 */
		$rows_to_move = $patch_sets_caption ? self::rows_without_attachment( $images, $attachment_id ) : $images;
		self::move_row_only_captions( $gallery_id, $rows_to_move );

		return self::write_response( $gallery_id, array( 'image' => $images[ $index ] ) );
	}

	/**
	 * Gallery rows except those of one attachment.
	 *
	 * @param array<int, mixed> $rows          Gallery rows.
	 * @param int               $attachment_id Attachment ID to leave out; 0 leaves every row in.
	 * @return array<int, mixed>
	 */
	private static function rows_without_attachment( array $rows, $attachment_id ) {
		if ( $attachment_id < 1 ) {
			return $rows;
		}

		return array_filter(
			$rows,
			function ( $row ) use ( $attachment_id ) {
				return ! ( is_array( $row ) && isset( $row['id'] ) && absint( $row['id'] ) === $attachment_id );
			}
		);
	}

	/**
	 * Move captions kept only in the Media Library Description into the Media Library Caption.
	 *
	 * Writes attachments only; the gallery rows already hold the caption. Responds with
	 * `{ moved: int[], skipped: { id: int, reason: string }[] }`. Classic galleries are refused.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function move_to_caption( $request ) {
		$gallery_id = (int) $request['id'];
		if ( ! \Modula\V2\Legacy_Caption_Move::applies_to( $gallery_id ) ) {
			return new \WP_Error(
				'modula_not_beta_gallery',
				__( 'Only Beta galleries can move captions to the Media Library Caption.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		$outcome = \Modula\V2\Legacy_Caption_Move::move(
			self::get_modula_images_list( $gallery_id ),
			\Modula_Gallery_Upload::get_instance()
		);

		return new \WP_REST_Response( $outcome, 200 );
	}

	/**
	 * Build reordered `modula-images` rows from an attachment ID sequence (multiset-safe for duplicate IDs).
	 *
	 * @param int   $gallery_id Gallery post ID.
	 * @param array $order      Raw order from JSON (attachment IDs).
	 * @return array<int, array<string, mixed>>|\WP_Error New rows on success.
	 */
	private static function build_reordered_rows_from_order( $gallery_id, array $order ) {
		$images = self::get_modula_images_list( $gallery_id );
		if ( count( $order ) !== count( $images ) ) {
			return new \WP_Error(
				'modula_bad_order',
				__( 'Reorder list length does not match gallery images.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$expected = array();
		foreach ( $images as $row ) {
			$expected[] = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
		}
		$normalized = array();
		foreach ( $order as $raw_id ) {
			$normalized[] = absint( $raw_id );
		}
		$expected_sorted = $expected;
		$got_sorted      = $normalized;
		sort( $expected_sorted, SORT_NUMERIC );
		sort( $got_sorted, SORT_NUMERIC );
		if ( $expected_sorted !== $got_sorted ) {
			return new \WP_Error(
				'modula_bad_order',
				__( 'Reorder list does not match gallery image IDs.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$remaining = $images;
		$new_rows  = array();
		foreach ( $normalized as $want_id ) {
			$found = false;
			foreach ( $remaining as $idx => $row ) {
				$rid = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
				if ( $rid === $want_id ) {
					$new_rows[] = $row;
					unset( $remaining[ $idx ] );
					$remaining = array_values( $remaining );
					$found     = true;
					break;
				}
			}
			if ( ! $found ) {
				return new \WP_Error(
					'modula_bad_order',
					__( 'Could not apply reorder (missing row).', 'modula-best-grid-gallery' ),
					array( 'status' => 400 )
				);
			}
		}
		return $new_rows;
	}

	/**
	 * Atomically persist `modulaSorting` and, when applicable, `modula-images` row order in one request.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function apply_sorting_and_order( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$prepared = self::prepare_gallery_write( $request );
		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}
		$gallery_id = $prepared;
		$params     = $request->get_json_params();
		$sorting    = isset( $params['sorting'] ) ? sanitize_text_field( (string) $params['sorting'] ) : '';
		if ( ! in_array( $sorting, \Modula\V2\Gallery_Sorting::modes(), true ) ) {
			return new \WP_Error(
				'modula_bad_sorting',
				__( 'Invalid gallery sorting mode.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		if ( 'manual' === $sorting ) {
			$order = isset( $params['order'] ) && is_array( $params['order'] ) ? $params['order'] : null;
			if ( null !== $order && array() !== $order ) {
				$new_rows = self::build_reordered_rows_from_order( $gallery_id, $order );
				if ( is_wp_error( $new_rows ) ) {
					return $new_rows;
				}
				self::persist_modula_images_list( $gallery_id, $new_rows );
			}
			update_post_meta( $gallery_id, 'modulaSorting', 'manual' );
			self::move_row_only_captions( $gallery_id, self::get_modula_images_list( $gallery_id ) );
			return self::write_response(
				$gallery_id,
				array(
					'ok'      => true,
					'sorting' => 'manual',
				)
			);
		}

		$order = isset( $params['order'] ) && is_array( $params['order'] ) ? $params['order'] : null;
		if ( null === $order ) {
			return new \WP_Error(
				'modula_bad_request',
				__( 'Order is required for this sorting mode.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$new_rows = self::build_reordered_rows_from_order( $gallery_id, $order );
		if ( is_wp_error( $new_rows ) ) {
			return $new_rows;
		}
		self::persist_modula_images_list( $gallery_id, $new_rows );
		update_post_meta( $gallery_id, 'modulaSorting', $sorting );
		self::move_row_only_captions( $gallery_id, $new_rows );
		return self::write_response(
			$gallery_id,
			array(
				'ok'      => true,
				'sorting' => $sorting,
			)
		);
	}

	/**
	 * Persist gallery sort mode (post meta `modulaSorting`).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function set_gallery_sorting( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$prepared = self::prepare_gallery_write( $request );
		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}
		$gallery_id = $prepared;
		$params     = $request->get_json_params();
		$sorting    = isset( $params['sorting'] ) ? sanitize_text_field( (string) $params['sorting'] ) : '';
		if ( ! in_array( $sorting, \Modula\V2\Gallery_Sorting::modes(), true ) ) {
			return new \WP_Error(
				'modula_bad_sorting',
				__( 'Invalid gallery sorting mode.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		update_post_meta( $gallery_id, 'modulaSorting', $sorting );
		self::move_row_only_captions( $gallery_id, self::get_modula_images_list( $gallery_id ) );
		return self::write_response(
			$gallery_id,
			array(
				'ok'      => true,
				'sorting' => $sorting,
			)
		);
	}

	/**
	 * Reorder `modula-images` rows to match attachment ID sequence (multiset-safe for duplicate IDs).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function reorder_images( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$prepared = self::prepare_gallery_write( $request );
		if ( is_wp_error( $prepared ) ) {
			return $prepared;
		}
		$gallery_id = $prepared;
		$params     = $request->get_json_params();
		$order      = isset( $params['order'] ) && is_array( $params['order'] ) ? $params['order'] : null;
		if ( null === $order ) {
			return new \WP_Error(
				'modula_bad_request',
				__( 'Invalid reorder payload.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$new_rows = self::build_reordered_rows_from_order( $gallery_id, $order );
		if ( is_wp_error( $new_rows ) ) {
			return $new_rows;
		}
		self::persist_modula_images_list( $gallery_id, $new_rows );
		self::move_row_only_captions( $gallery_id, $new_rows );
		return self::write_response( $gallery_id, array( 'ok' => true ) );
	}

	/**
	 * Persist full merged catalog (attachment rows + v2 embedded items). Updates modula-images (images only)
	 * and modula_images_v2 (canonical interleaved order).
	 *
	 * @param \WP_REST_Request $request Request JSON: { items: Array<row> } (raw rows, camelCase allowed for read-only echo).
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function save_merged_items( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			\Modula_Debug_Log::log_failure(
				\Modula_Debug_Log::CHANNEL_GALLERY_PERSIST,
				'gallery items merge save forbidden',
				array(
					'gallery_id' => (int) $request['id'],
					'error_code' => 'modula_forbidden',
				)
			);
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$prepared = self::prepare_gallery_write( $request );
		if ( is_wp_error( $prepared ) ) {
			\Modula_Debug_Log::log_failure(
				\Modula_Debug_Log::CHANNEL_GALLERY_PERSIST,
				'gallery items merge prepare failed',
				array(
					'gallery_id' => (int) $request['id'],
					'error_code' => $prepared->get_error_code(),
				)
			);
			return $prepared;
		}
		$gallery_id = $prepared;
		$params     = $request->get_json_params();
		if ( ! is_array( $params ) || ! isset( $params['items'] ) || ! is_array( $params['items'] ) ) {
			\Modula_Debug_Log::log_failure(
				\Modula_Debug_Log::CHANNEL_GALLERY_PERSIST,
				'gallery items merge save rejected: invalid items',
				array(
					'gallery_id' => (int) $gallery_id,
					'error_code' => 'modula_bad_request',
				)
			);
			return new \WP_Error(
				'modula_bad_request',
				__( 'Invalid items payload.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$result = \Modula\V2\Meta_Sync::persist_merged_gallery_items( $gallery_id, $params['items'], true );
		if ( is_wp_error( $result ) ) {
			\Modula_Debug_Log::log_failure(
				\Modula_Debug_Log::CHANNEL_GALLERY_PERSIST,
				'gallery items merge save failed',
				array(
					'gallery_id' => (int) $gallery_id,
					'error_code' => $result->get_error_code(),
				)
			);
			return $result;
		}
		self::move_row_only_captions( $gallery_id, self::get_modula_images_list( $gallery_id ) );
		return self::write_response( $gallery_id, array( 'ok' => true ) );
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function unzip( $request ) {
		$upload = \Modula_Gallery_Upload::get_instance();
		if ( ! $upload->check_user_upload_rights() ) {
			return new \WP_Error(
				'modula_forbidden',
				__( 'You do not have the rights to upload files.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}
		$params  = $request->get_json_params();
		$file_id = isset( $params['file_id'] ) ? absint( $params['file_id'] ) : 0;
		$result  = $upload->rest_unzip_to_paths( $file_id );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return new \WP_REST_Response( array( 'folders' => $result ), 200 );
	}

	/**
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public static function dismiss_errors( $request ) {
		$id = (int) $request['id'];
		\Modula_Gallery_Upload::get_instance()->rest_dismiss_upload_errors( $id );
		return new \WP_REST_Response( array( 'dismissed' => true ), 200 );
	}
}
