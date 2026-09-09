<?php
/**
 * Host wiring: register organizer row actions and handle create / Lite upsell.
 *
 * @package Modula
 */

namespace Modula\Bound_Gallery;

defined( 'ABSPATH' ) || exit;

/**
 * Class Host
 */
final class Host {

	/**
	 * @return void
	 */
	public static function init() {
		if ( function_exists( 'add_action' ) ) {
			add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
			add_action( 'wp_enqueue_media', array( __CLASS__, 'enqueue_media_assets' ) );
			add_action( 'wp_ajax_modula_bound_gallery_create_from_media_folder', array( __CLASS__, 'ajax_create_from_media_folder' ) );
			add_action( 'wp_ajax_modula_bound_gallery_create_from_remote_prefix', array( __CLASS__, 'ajax_create_from_remote_prefix' ) );
			add_action( 'wp_ajax_modula_bound_gallery_restore_exclusion', array( __CLASS__, 'ajax_restore_exclusion' ) );
		}

		if ( function_exists( 'add_filter' ) ) {
			add_filter( 'modula_settings_editor_config', array( __CLASS__, 'filter_settings_editor_config' ), 10, 2 );
		}

		if ( function_exists( 'did_action' ) && did_action( 'init' ) ) {
			self::register_row_action();
			return;
		}

		if ( function_exists( 'add_action' ) ) {
			add_action( 'init', array( __CLASS__, 'register_row_action' ) );
			return;
		}

		self::register_row_action();
	}

	/**
	 * Attach compact bind summary for the gallery editor badge / Hide gates.
	 *
	 * @param array<string, mixed> $editor_config Localized editor config.
	 * @param int                  $post_id       Gallery post ID.
	 * @return array<string, mixed>
	 */
	public static function filter_settings_editor_config( $editor_config, $post_id = 0 ) {
		if ( ! is_array( $editor_config ) ) {
			$editor_config = array();
		}

		$post_id = absint( $post_id );
		if ( $post_id < 1 && isset( $editor_config['galleryId'] ) ) {
			$post_id = absint( $editor_config['galleryId'] );
		}

		$summary = $post_id > 0 ? Bound_Gallery::get_bind_summary( $post_id ) : null;
		if ( null === $summary ) {
			$editor_config['boundGallery'] = null;
			return $editor_config;
		}

		$editor_config['boundGallery'] = $summary;
		if ( function_exists( 'admin_url' ) ) {
			$editor_config['ajaxUrl'] = admin_url( 'admin-ajax.php' );
		}
		if ( function_exists( 'wp_create_nonce' ) ) {
			$editor_config['boundGalleryRestoreNonce'] = wp_create_nonce( 'modula_bound_gallery_restore' );
		}
		return $editor_config;
	}

	/**
	 * Register Create bound gallery on media_folder and remote_prefix action slots.
	 *
	 * @return bool
	 */
	public static function register_row_action() {
		if ( ! function_exists( 'wpchill_folders_register_row_action' ) ) {
			return false;
		}

		$action = array(
			'id'    => Bound_Gallery::ACTION_ID,
			'label' => __( 'Create bound gallery', 'modula-best-grid-gallery' ),
		);

		$media  = wpchill_folders_register_row_action( 'media_folder', $action );
		$prefix = wpchill_folders_register_row_action( 'remote_prefix', $action );

		return $media || $prefix;
	}

	/**
	 * @param string $hook Admin page hook.
	 * @return void
	 */
	public static function enqueue( $hook ) {
		if ( 'upload.php' !== $hook ) {
			return;
		}

		self::enqueue_assets();
	}

	/**
	 * Media modal pickers also show the organizer tree.
	 *
	 * @return void
	 */
	public static function enqueue_media_assets() {
		if ( function_exists( 'is_admin' ) && ! is_admin() ) {
			return;
		}

		self::enqueue_assets();
	}

	/**
	 * @return void
	 */
	private static function enqueue_assets() {
		if ( ! current_user_can( 'upload_files' ) ) {
			return;
		}

		$script_rel = 'assets/js/admin/bound-gallery-media-folder.js';
		$script_abs = MODULA_PATH . $script_rel;
		if ( ! is_readable( $script_abs ) ) {
			return;
		}

		$handle = 'modula-bound-gallery-media-folder';
		wp_enqueue_script(
			$handle,
			MODULA_URL . $script_rel,
			array( 'jquery' ),
			defined( 'MODULA_LITE_VERSION' ) ? MODULA_LITE_VERSION : '1.0.0',
			true
		);

		wp_localize_script(
			$handle,
			'modulaBoundGallery',
			array(
				'actionId' => Bound_Gallery::ACTION_ID,
				'isPro'    => Bound_Gallery::is_entitled(),
				'ajaxUrl'  => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( 'modula_bound_gallery_create' ),
			)
		);
	}

	/**
	 * AJAX: Pro creates the gallery and returns the editor URL.
	 *
	 * @return void
	 */
	public static function ajax_create_from_media_folder() {
		check_ajax_referer( 'modula_bound_gallery_create', 'nonce' );

		if ( ! Bound_Gallery::is_entitled() ) {
			self::send_pro_required();
		}

		$folder_id = isset( $_POST['folder_id'] ) ? absint( wp_unslash( $_POST['folder_id'] ) ) : 0;
		self::send_create_result( Bound_Gallery::create_from_media_folder( $folder_id ) );
	}

	/**
	 * AJAX: Pro ingests missing direct keys and creates or opens the bound gallery.
	 *
	 * @return void
	 */
	public static function ajax_create_from_remote_prefix() {
		check_ajax_referer( 'modula_bound_gallery_create', 'nonce' );

		if ( ! Bound_Gallery::is_entitled() ) {
			self::send_pro_required();
		}

		$target_id = isset( $_POST['target_id'] ) ? sanitize_text_field( wp_unslash( $_POST['target_id'] ) ) : '';
		$parsed    = Bound_Gallery::parse_remote_prefix_target( $target_id );
		if ( null === $parsed ) {
			wp_send_json_error(
				array(
					'code'    => 'modula_bound_gallery_invalid_prefix',
					'message' => __( 'A remote prefix is required.', 'modula-best-grid-gallery' ),
				),
				400
			);
		}

		self::send_create_result(
			Bound_Gallery::create_from_remote_prefix( $parsed['connection_id'], $parsed['prefix'] )
		);
	}

	/**
	 * @return void
	 */
	private static function send_pro_required() {
		wp_send_json_error(
			array(
				'code'    => 'modula_bound_gallery_pro_required',
				'message' => __( 'Creating a bound gallery requires Modula Pro.', 'modula-best-grid-gallery' ),
				'upsell'  => true,
			),
			403
		);
	}

	/**
	 * @param int|\WP_Error $result Create result.
	 * @return void
	 */
	private static function send_create_result( $result ) {
		if ( is_wp_error( $result ) ) {
			$data   = $result->get_error_data();
			$status = ( is_array( $data ) && isset( $data['status'] ) ) ? (int) $data['status'] : 500;
			if ( $status < 400 ) {
				$status = 500;
			}
			wp_send_json_error(
				array(
					'code'    => $result->get_error_code(),
					'message' => $result->get_error_message(),
				),
				$status
			);
		}

		$edit_url = get_edit_post_link( (int) $result, 'raw' );
		wp_send_json_success(
			array(
				'id'      => (int) $result,
				'editUrl' => $edit_url ? $edit_url : '',
			)
		);
	}

	/**
	 * AJAX: Pro clears one bound-gallery exclusion (Restore).
	 *
	 * @return void
	 */
	public static function ajax_restore_exclusion() {
		check_ajax_referer( 'modula_bound_gallery_restore', 'nonce' );

		if ( ! Bound_Gallery::is_entitled() ) {
			self::send_pro_required();
		}

		$gallery_id    = isset( $_POST['gallery_id'] ) ? absint( wp_unslash( $_POST['gallery_id'] ) ) : 0;
		$attachment_id = isset( $_POST['attachment_id'] ) ? absint( wp_unslash( $_POST['attachment_id'] ) ) : 0;

		if ( $gallery_id < 1 || ! current_user_can( 'edit_post', $gallery_id ) ) {
			wp_send_json_error(
				array(
					'code'    => 'modula_bound_gallery_forbidden',
					'message' => __( 'You are not allowed to edit this gallery.', 'modula-best-grid-gallery' ),
				),
				403
			);
		}

		if ( ! Bound_Gallery::is_bound( $gallery_id ) ) {
			wp_send_json_error(
				array(
					'code'    => 'modula_bound_gallery_not_bound',
					'message' => __( 'This gallery is not bound.', 'modula-best-grid-gallery' ),
				),
				400
			);
		}

		if ( ! Bound_Gallery::restore_attachment( $gallery_id, $attachment_id ) ) {
			wp_send_json_error(
				array(
					'code'    => 'modula_bound_gallery_restore_failed',
					'message' => __( 'Could not restore that attachment.', 'modula-best-grid-gallery' ),
				),
				400
			);
		}

		wp_send_json_success(
			array(
				'galleryId'    => $gallery_id,
				'attachmentId' => $attachment_id,
				'hiddenItems'  => Bound_Gallery::get_hidden_from_gallery_items( $gallery_id ),
			)
		);
	}
}
