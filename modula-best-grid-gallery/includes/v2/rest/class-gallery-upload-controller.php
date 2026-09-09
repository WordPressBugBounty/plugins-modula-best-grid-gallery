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
		return new \WP_REST_Response(
			array_merge( $payload, \Modula\V2\Gallery_Post::rest_response_meta( $gallery_id ) ),
			200
		);
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
			return \Modula\Bound_Gallery\Bound_Gallery::get_image_rows( $gallery_id );
		}
		$raw = get_post_meta( $gallery_id, 'modula-images', true );
		return is_array( $raw ) ? $raw : array();
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

		$attachment_id = isset( $current['id'] ) ? absint( $current['id'] ) : 0;
		$media_keys    = array( 'title', 'alt', 'description' );

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
				$synced       = $upload->apply_modula_media_fields_to_attachment( $attachment_id, $media_subset );
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
			$merged = $upload->overlay_modula_row_attachment_text_from_post( $merged, $attachment_id );
		}
		$sanitized = $upload->sanitize_modula_image_row( $merged );
		// Sanitize whitelists every key; missing `id`/`url` become ''. Restore from the row we merged so the client never gets an empty id (would drop the tile).
		if ( isset( $current['id'] ) && ( ! isset( $sanitized['id'] ) || '' === $sanitized['id'] ) ) {
			$sanitized['id'] = $current['id'];
		}
		$sid = isset( $sanitized['id'] ) ? absint( $sanitized['id'] ) : 0;
		if ( $sid && get_post( $sid ) && 'attachment' === get_post_type( $sid ) && ( ! isset( $sanitized['url'] ) || '' === $sanitized['url'] ) ) {
			$full = wp_get_attachment_image_url( $sid, 'full' );
			if ( $full ) {
				$sanitized['url'] = $full;
			}
		}
		$images[ $index ] = $sanitized;
		self::persist_modula_images_list( $gallery_id, $images );

		return self::write_response( $gallery_id, array( 'image' => $images[ $index ] ) );
	}

	/**
	 * Whitelisted `modulaSorting` keys (aligned with Modula Pro gallery sorting metabox).
	 *
	 * @return string[]
	 */
	private static function gallery_sorting_whitelist() {
		return array(
			'manual',
			'dateCreatedNew',
			'dateCreatedOld',
			'dateModifiedFirst',
			'dateModifiedLast',
			'titleAZ',
			'titleZA',
			'random',
		);
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
		if ( ! in_array( $sorting, self::gallery_sorting_whitelist(), true ) ) {
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
		if ( ! in_array( $sorting, self::gallery_sorting_whitelist(), true ) ) {
			return new \WP_Error(
				'modula_bad_sorting',
				__( 'Invalid gallery sorting mode.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		update_post_meta( $gallery_id, 'modulaSorting', $sorting );
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
		if ( ! is_array( $params ) || ! isset( $params['items'] ) || ! is_array( $params['items'] ) ) {
			return new \WP_Error(
				'modula_bad_request',
				__( 'Invalid items payload.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}
		$result = \Modula\V2\Meta_Sync::persist_merged_gallery_items( $gallery_id, $params['items'] );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
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
