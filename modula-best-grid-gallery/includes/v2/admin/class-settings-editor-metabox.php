<?php

/**
 * Experimental React settings editor: dedicated metabox and assets.
 *
 * Gated by {@see 'modula_enable_modern_settings_editor'} (second argument: gallery post ID).
 *
 * @package Modula
 */

namespace Modula\V2\Admin;

defined( 'ABSPATH' ) || exit;

/**
 * Class Settings_Editor_Metabox
 */
class Settings_Editor_Metabox {


	public const META_BOX_ID = 'modula-settings-editor-v2';

	/**
	 * Extension slug => [ 'available' => bool, 'enabled' => bool ] for Pro plan vs toggle state (Extensions::get_extensions).
	 *
	 * @return array<string, array<string, bool>>
	 */
	public static function get_extension_entitlements_for_editor() {
		$instance = class_exists( '\Modula_Pro\Extensions\Extensions' )
			? \Modula_Pro\Extensions\Extensions::get_instance()
			: \Modula_Extensions_Base::get_instance();
		if ( ! is_object( $instance ) || ! method_exists( $instance, 'get_extensions' ) ) {
			return array();
		}
		$extensions = $instance->get_extensions();
		if ( ! is_array( $extensions ) ) {
			return array();
		}
		$out = array();
		foreach ( $extensions as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			if ( ! empty( $row['is_divider'] ) ) {
				continue;
			}
			$slug = isset( $row['slug'] ) ? (string) $row['slug'] : '';
			if ( '' === $slug || 0 === strpos( $slug, 'divider-' ) ) {
				continue;
			}
			$out[ $slug ] = array(
				'available' => ! empty( $row['available'] ),
				'enabled'   => ! empty( $row['enabled'] ),
			);
		}
		/**
		 * Filter extension plan/toggle flags exposed to the v2 settings editor (e.g. gallery type gates).
		 *
		 * @param array<string, array<string, bool>> $out Slug => [ available, enabled ].
		 */
		return apply_filters( 'modula_settings_editor_extension_entitlements', $out );
	}

	/**
	 * Shortcode rows for the gallery takeover sidebar and gallery listing (embed + Pro extras via filter).
	 *
	 * @param int $post_id Gallery post ID.
	 * @return list<array{id:string,label:string,code:string,description:string}>
	 */
	public static function get_gallery_shortcode_rows_for_editor( $post_id ) {
		$post_id = (int) $post_id;
		if ( $post_id <= 0 ) {
			return array();
		}
		$post = get_post( $post_id );
		if ( ! $post || 'modula-gallery' !== $post->post_type ) {
			return array();
		}

		$main_description = sprintf(
			// translators: %1$s and %2$s: HTML underline wrappers around “post or a page”.
			__( 'You can use this to display your newly created gallery inside a %1$s post or a page %2$s.', 'modula-best-grid-gallery' ),
			'<u>',
			'</u>'
		);

		$rows   = array();
		$rows[] = array(
			'id'          => 'modula',
			'label'       => __( 'Embed gallery', 'modula-best-grid-gallery' ),
			'code'        => '[modula id="' . $post_id . '"]',
			'description' => wp_kses_post( $main_description ),
		);

		$extra = apply_filters( 'modula_admin_aditional_shortcodes_dropdown', array(), $post );
		if ( is_array( $extra ) ) {
			foreach ( $extra as $key => $item ) {
				if ( ! is_array( $item ) || empty( $item['code'] ) ) {
					continue;
				}
				$desc   = isset( $item['description'] ) ? (string) $item['description'] : '';
				$rows[] = array(
					'id'          => (string) $key,
					'label'       => self::shortcode_row_label_for_key( (string) $key ),
					'code'        => (string) $item['code'],
					'description' => wp_kses_post( $desc ),
				);
			}
		}

		return $rows;
	}

	/**
	 * @param string $key Filter array key (e.g. modula_link).
	 */
	private static function shortcode_row_label_for_key( $key ) {
		switch ( $key ) {
			case 'modula_link':
				return __( 'Link or image trigger', 'modula-best-grid-gallery' );
			case 'modula_download':
				return __( 'Download button', 'modula-best-grid-gallery' );
			case 'standalone_permalink':
				return __( 'Permalink', 'modula-best-grid-gallery' );
			default:
				$clean = str_replace( array( '_', '-' ), ' ', $key );
				return ucwords( trim( $clean ) );
		}
	}

	/**
	 * Hook admin UI for the settings editor.
	 *
	 * @return void
	 */
	public static function init() {
		if ( ! is_admin() ) {
			return;
		}

		// After core Modula metaboxes (Gallery, Settings) so this sits below classic Settings.
		add_action( 'add_meta_boxes_modula-gallery', array( __CLASS__, 'register_metabox' ), 12 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_scripts' ), 20 );
		add_action( 'current_screen', array( __CLASS__, 'redirect_post_new_to_edit_screen' ) );
	}

	/**
	 * Use post.php?post=ID on new galleries so refresh does not spawn another auto-draft.
	 *
	 * WordPress creates an auto-draft on post-new.php but leaves the URL without `post=`;
	 * reloading post-new.php creates a second gallery. Gutenberg uses the same stable edit URL.
	 *
	 * @param \WP_Screen $screen Current admin screen.
	 * @return void
	 */
	public static function redirect_post_new_to_edit_screen( $screen ) {
		if ( ! apply_filters( 'modula_enable_modern_settings_editor', false, \Modula\V2\Beta_Settings::current_gallery_id() ) ) {
			return;
		}

		if ( ! $screen instanceof \WP_Screen ) {
			return;
		}

		if ( 'post' !== $screen->base || 'add' !== $screen->action || 'modula-gallery' !== $screen->post_type ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- admin screen routing only.
		if ( isset( $_GET['post'] ) && (int) $_GET['post'] > 0 ) {
			return;
		}

		global $post;
		if ( ! $post || empty( $post->ID ) || 'modula-gallery' !== $post->post_type ) {
			return;
		}

		$post_id = (int) $post->ID;

		$redirect = add_query_arg(
			array(
				'post'   => $post_id,
				'action' => 'edit',
			),
			admin_url( 'post.php' )
		);

		/**
		 * Filter redirect when opening Add New gallery (auto-draft → stable edit URL).
		 *
		 * @param string $redirect  Target URL.
		 * @param int    $post_id   Auto-draft gallery post ID.
		 */
		$redirect = apply_filters( 'modula_settings_editor_post_new_redirect_url', $redirect, $post_id );

		wp_safe_redirect( $redirect );
		exit;
	}

	/**
	 * @return void
	 */
	public static function register_metabox() {
		if ( ! apply_filters( 'modula_enable_modern_settings_editor', false, \Modula\V2\Beta_Settings::current_gallery_id() ) ) {
			return;
		}

		if ( Gallery_Takeover_Admin::should_use_takeover() ) {
			return;
		}

		add_meta_box(
			self::META_BOX_ID,
			__( 'Gallery settings (v2 preview)', 'modula-best-grid-gallery' ),
			array( __CLASS__, 'render_metabox' ),
			'modula-gallery',
			'normal',
			'high'
		);
	}

	/**
	 * @return void
	 */
	public static function render_metabox() {
		echo '<div id="modula-settings-editor-root" class="modula-settings-editor-mount"></div>';
	}

	/**
	 * @param string $hook_suffix Current admin page filename.
	 * @return void
	 */
	public static function enqueue_scripts( $hook_suffix = '' ) {
		if ( ! apply_filters( 'modula_enable_modern_settings_editor', false, \Modula\V2\Beta_Settings::current_gallery_id() ) ) {
			return;
		}

		if ( 'post.php' !== $hook_suffix && 'post-new.php' !== $hook_suffix ) {
			return;
		}

		$screen = get_current_screen();
		if ( ! $screen || 'post' !== $screen->base || 'modula-gallery' !== $screen->post_type ) {
			return;
		}

		global $post;
		$post_id = isset( $post->ID ) ? (int) $post->ID : 0;

		$scripts = \Modula\Scripts::get_instance();

		wp_enqueue_media(
			array(
				'post' => $post_id > 0 ? get_post( $post_id ) : null,
			)
		);

		// Image metadata modal: caption uses `wp.oldEditor` (TinyMCE + Quicktags), same as Pro bulk editor.
		wp_enqueue_editor();

		wp_enqueue_script( 'password-strength-meter' );

		$scripts->load_js_asset(
			'modula-gallery-settings-editor',
			'assets/js/admin/gallery-editor',
			array(
				'wp-components',
				'media-upload',
				'jquery',
				'backbone',
				'editor',
				'password-strength-meter',
			)
		);

		wp_set_script_translations(
			'modula-gallery-settings-editor',
			'modula-best-grid-gallery',
			MODULA_PATH . 'languages'
		);

		// Use the same version hash as the JS bundle (index.asset.php) so CSS cache
		// busts on every webpack build; MODULA_LITE_VERSION alone stays stale until release.
		$settings_editor_asset_path = MODULA_PATH . 'assets/js/admin/gallery-editor/index.asset.php';
		$settings_editor_style_ver  = MODULA_LITE_VERSION;
		if ( file_exists( $settings_editor_asset_path ) ) {
			$settings_editor_asset = require $settings_editor_asset_path;
			if ( is_array( $settings_editor_asset ) && ! empty( $settings_editor_asset['version'] ) ) {
				$settings_editor_style_ver = $settings_editor_asset['version'];
			}
		}

		wp_enqueue_style(
			'modula-gallery-settings-editor',
			MODULA_URL . 'assets/js/admin/gallery-editor/index.css',
			array( 'wp-components' ),
			$settings_editor_style_ver
		);

		\Modula_Frontend_Adapter::enqueue_content_block_font_stylesheets_for_presets(
			array_keys( \Modula_Frontend_Adapter::content_block_google_font_registry() )
		);

		if ( Gallery_Takeover_Admin::should_use_takeover() ) {
			Gallery_Takeover_Admin::enqueue_takeover_styles( $scripts );
		}

		// Live preview mounts gallery-shared layouts; needs loader shell + full layout CSS.
		$gallery_loader_css_rel = 'assets/css/front/modula-gallery.css';
		$gallery_loader_css     = MODULA_PATH . $gallery_loader_css_rel;
		if ( file_exists( $gallery_loader_css ) ) {
			wp_enqueue_style(
				'modula-gallery-preview-loader',
				MODULA_URL . $gallery_loader_css_rel,
				array(),
				(string) filemtime( $gallery_loader_css )
			);
			if ( class_exists( '\Modula\V2\Modern_Gallery' ) ) {
				\Modula\V2\Modern_Gallery::attach_gallery_chrome_inline_style( 'modula-gallery-preview-loader' );
			}
		}

		$gallery_preview_css_rel = 'assets/css/front/modula-gallery-bootstrap.modula-gallery.css';
		$gallery_preview_css     = MODULA_PATH . $gallery_preview_css_rel;
		if ( ! file_exists( $gallery_preview_css ) ) {
			$gallery_preview_css_rel = 'assets/css/front/modula-gallery.css';
			$gallery_preview_css     = MODULA_PATH . $gallery_preview_css_rel;
		}
		if ( file_exists( $gallery_preview_css ) ) {
			wp_enqueue_style(
				'modula-gallery-preview-front',
				MODULA_URL . $gallery_preview_css_rel,
				array( 'modula-gallery-preview-loader' ),
				(string) filemtime( $gallery_preview_css )
			);
			if ( class_exists( '\Modula\V2\Modern_Gallery' ) ) {
				\Modula\V2\Modern_Gallery::attach_gallery_chrome_inline_style( 'modula-gallery-preview-front' );
			}
		}

		$grid_image_labels = array_merge(
			array(
				'default' => esc_html__( 'Default', 'modula-best-grid-gallery' ),
			),
			\Modula_Helper::get_image_sizes( true )
		);

		// Slider: same WP sizes as grid + Custom (matches Pro `slider_image_size` === 'custom' + dimensions/crop).
		$slider_image_size_labels = array_merge(
			$grid_image_labels,
			array(
				'custom' => esc_html__( 'Custom dimensions', 'modula-best-grid-gallery' ),
			)
		);

		// Thumbnail strip: Auto + WP sizes + Custom (Pro: `slider_syncing_nav_size` === 'custom' uses nav dimensions/crop).
		$slider_syncing_nav_size_labels = array_merge(
			array(
				'auto' => esc_html__( 'Auto', 'modula-best-grid-gallery' ),
			),
			\Modula_Helper::get_image_sizes( true ),
			array(
				'custom' => esc_html__( 'Custom dimensions', 'modula-best-grid-gallery' ),
			)
		);

		$takeover = Gallery_Takeover_Admin::should_use_takeover();

		$form_ui       = \Modula\V2\Settings\Settings_Editor_Presenter::get_form_ui_for_localize();
		$group_upsells = \Modula\V2\Settings\Settings_Editor_Presenter::get_group_upsells_for_localize();

		$extensions_instance    = class_exists( '\Modula_Pro\Extensions\Extensions' )
			? \Modula_Pro\Extensions\Extensions::get_instance()
			: \Modula_Extensions_Base::get_instance();
		$active_extension_slugs = array();
		if ( is_object( $extensions_instance ) && method_exists( $extensions_instance, 'get_active_extensions' ) ) {
			$raw_active = $extensions_instance->get_active_extensions();
			if ( is_array( $raw_active ) ) {
				$active_extension_slugs = array_values( $raw_active );
			}
		}
		/**
		 * Filter active Modula extension slugs passed to the v2 settings editor (gated fields, e.g. gallery type).
		 *
		 * @param string[] $active_extension_slugs Slugs from Extensions::get_active_extensions().
		 */
		$active_extension_slugs = apply_filters( 'modula_settings_editor_active_extensions', $active_extension_slugs );

		$extension_entitlements = self::get_extension_entitlements_for_editor();

		$uploads           = wp_upload_dir();
		$folder_browse_src = isset( $uploads['basedir'] ) ? $uploads['basedir'] : '';
		/**
		 * Default server path for the folder-import browser (matches {@see Modula_Gallery_Upload::$default_dir}).
		 *
		 * @param string $folder_browse_src `wp_upload_dir()['basedir']`.
		 */
		$folder_browse_root = (string) apply_filters( 'modula_gallery_upload_default_dir', $folder_browse_src );

		$post_status      = $post_id ? get_post_status( $post_id ) : '';
		$status_object    = $post_status ? get_post_status_object( $post_status ) : null;
		$post_type_object = get_post_type_object( 'modula-gallery' );

		$post_status_choices = array();
		$status_slugs        = array( 'publish', 'draft', 'pending', 'private' );
		foreach ( $status_slugs as $slug ) {
			$obj = get_post_status_object( $slug );
			if ( ! is_object( $obj ) || empty( $obj->label ) ) {
				continue;
			}
			$post_status_choices[] = array(
				'value' => $slug,
				'label' => $obj->label,
			);
		}
		/**
		 * Filter status options shown in the takeover title bar status dropdown.
		 *
		 * @param array<int, array{value: string, label: string}> $post_status_choices Rows for the React editor.
		 * @param int                                             $post_id            Current gallery post ID.
		 */
		$post_status_choices = apply_filters( 'modula_settings_editor_post_status_choices', $post_status_choices, $post_id );

		$show_rest_debug = ( defined( 'WP_DEBUG' ) && WP_DEBUG && current_user_can( 'manage_options' ) );
		/**
		 * Whether the metabox settings editor shows the collapsible raw REST payload block (debug aid).
		 *
		 * @param bool $show_rest_debug Default: true when {@see WP_DEBUG} and user can `manage_options`.
		 */
		$show_rest_debug = (bool) apply_filters( 'modula_settings_editor_show_rest_debug', $show_rest_debug );

		$locked_for_proofing = false;
		if ( $post_id > 0 ) {
			$locked_for_proofing = (bool) get_post_meta( $post_id, '_modula_locked_for_proofing', true );
		}

		$image_proofing_extension_active = in_array( 'modula-image-proofing', $active_extension_slugs, true );
		if ( isset( $extension_entitlements['modula-image-proofing'] ) && is_array( $extension_entitlements['modula-image-proofing'] ) ) {
			$ent                             = $extension_entitlements['modula-image-proofing'];
			$image_proofing_extension_active = $image_proofing_extension_active
				&& ! empty( $ent['available'] )
				&& ! empty( $ent['enabled'] );
		}

		$licensing_global_raw = get_option( 'modula_image_licensing_option', false );
		if ( ! is_array( $licensing_global_raw ) ) {
			$licensing_legacy     = get_option( 'modula_image_licensing_option ', false );
			$licensing_global_raw = is_array( $licensing_legacy ) ? $licensing_legacy : array();
		}

		$editor_config = array(
			'galleryId'                    => $post_id,
			'nonce'                        => wp_create_nonce( 'wp_rest' ),
			'isPro'                        => modula_is_compatible_pro(),
			'activeExtensionSlugs'         => $active_extension_slugs,
			'extensionEntitlements'        => $extension_entitlements,
			'upgradeUrl'                   => defined( 'MODULA_PRO_STORE_UPGRADE_URL' ) ? MODULA_PRO_STORE_UPGRADE_URL : 'https://wp-modula.com/pricing',
			'extensionsAdminUrl'           => admin_url( 'edit.php?post_type=modula-gallery&page=modula-addons' ),
			'gridImageSizes'               => $grid_image_labels,
			'sliderImageSizes'             => $slider_image_size_labels,
			'sliderSyncingNavSizes'        => $slider_syncing_nav_size_labels,
			'imageSizeDimensions'          => \Modula_Helper::get_image_sizes( false ),
			'takeover'                     => $takeover,
			'listUrl'                      => \Modula\V2\Rest\Listing_Controller::admin_url(),
			'adminUrl'                     => admin_url( 'index.php' ),
			'postTitle'                    => $post_id ? get_the_title( $post_id ) : '',
			'postStatus'                   => $post_status,
			'postStatusLabel'              => ( $status_object && ! empty( $status_object->label ) ) ? $status_object->label : $post_status,
			'postStatusChoices'            => $post_status_choices,
			'canEditGalleryStatus'         => (bool) ( $post_id && current_user_can( 'edit_post', $post_id ) ),
			'postTypeSingular'             => ( $post_type_object && ! empty( $post_type_object->labels->singular_name ) ) ? $post_type_object->labels->singular_name : __( 'Gallery', 'modula-best-grid-gallery' ),
			'modulaDocsBaseUrl'            => 'https://wp-modula.com/kb/',
			'pluginUrl'                    => MODULA_URL,
			'pluginVersion'                => MODULA_LITE_VERSION,
			'formUi'                       => $form_ui,
			'groupUpsells'                 => $group_upsells,
			'folderBrowseRoot'             => $folder_browse_root,
			'showRestDebug'                => $show_rest_debug,
			'galleryShortcodes'            => array(
				'rows' => self::get_gallery_shortcode_rows_for_editor( $post_id ),
			),
			'lockedForProofing'            => $locked_for_proofing,
			'imageProofingExtensionActive' => $image_proofing_extension_active,
			'imageProofingRestNamespace'   => 'modula-image-proofing/v1',
			'lightboxShareButtons'         => \Modula_Helper::render_lightbox_share_template(),
			'hoverBuilderEntitlements'     => array(
				'freePresetCount'     => 5,
				'customizeTabEnabled' => modula_is_compatible_pro(),
			),
			'addNewEntitlements'           => array(
				'folderImport' => modula_is_compatible_pro(),
				'zipImport'    => modula_is_compatible_pro(),
			),
			'galleryDefaults'              => array(
				'restNamespace'  => '',
				'presetCount'    => 0,
				'manageUrl'      => admin_url( 'edit.php?post_type=modula-defaults' ),
				'featureEnabled' => false,
			),
			'licensingGlobal'              => array(
				'author'  => isset( $licensing_global_raw['image_licensing_author'] ) ? (string) $licensing_global_raw['image_licensing_author'] : '',
				'company' => isset( $licensing_global_raw['image_licensing_company'] ) ? (string) $licensing_global_raw['image_licensing_company'] : '',
			),
			'imageLicensingSettingsUrl'    => admin_url( 'edit.php?post_type=modula-gallery&page=modula&tab=image_licensing' ),
		);

		/**
		 * Filter bootstrap data passed to the v2 settings editor script.
		 *
		 * @param array<string, mixed> $editor_config Localized config for `modulaSettingsEditor`.
		 * @param int                  $post_id       Current gallery post ID.
		 */
		$editor_config = apply_filters( 'modula_settings_editor_config', $editor_config, $post_id );

		wp_localize_script(
			'modula-gallery-settings-editor',
			'modulaSettingsEditor',
			$editor_config
		);

		/**
		 * Fires after the v2 gallery settings editor scripts are enqueued.
		 *
		 * @param int $post_id Current gallery post ID.
		 */
		do_action( 'modula_gallery_settings_editor_enqueue', $post_id );
	}
}
