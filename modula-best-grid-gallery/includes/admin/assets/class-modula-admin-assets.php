<?php

use Modula\Ai\Optimizer\Optimizer;

/**
 * Handles admin scripts and styles for Modula.
 */
class Modula_Admin_Assets {

	/**
	 * @var Modula_Media_Compat
	 */
	private $compat;

	/**
	 * Constructor
	 */
	public function __construct() {
		$this->compat = new Modula_Media_Compat();
		// Allow other mime types to be uploaded
		add_filter( 'upload_mimes', array( $this->compat, 'modula_upload_mime_types' ) );
		add_filter( 'file_is_displayable_image', array( $this->compat, 'modula_webp_display' ), 10, 2 );
	}

	/* Enqueue Admin Scripts */
	public function admin_scripts( $hook ) {

		global $id, $post;

		// Get current screen.
		$screen = get_current_screen();

		// Set the post_id
		$post_id = isset( $post->ID ) ? $post->ID : (int) $id;

		$suffix = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? '' : '.min';

		$modula_helper = array(
			'items'        => array(),
			'settings'     => array(),
			'strings'      => array(
				'limitExceeded' => '',
			),
			'id'           => $post_id,
			'_wpnonce'     => wp_create_nonce( 'modula-ajax-save' ),
			'ajax_url'     => admin_url( 'admin-ajax.php' ),
			'admin_url'    => admin_url(),
			'settings_url' => admin_url( 'edit.php?post_type=modula-gallery&page=modula&tab=optimization' ),
		);

		$allowed_post_types = apply_filters( 'modula_enqueue_for_post_types', array( 'modula-gallery' ) );

		if ( 'post-new.php' === $hook || 'post.php' === $hook ) {

			// Check if is modula custom post type
			if ( ! in_array( $screen->post_type, $allowed_post_types, true ) ) {
				return;
			}

			if ( apply_filters( 'modula_disable_drag_cpt_box', true ) ) {

				//returns modula CPT metaboxes to the default position.
				add_filter( 'get_user_option_meta-box-order_modula-gallery', array( $this, 'metabox_prevent_sorting' ) );
				add_filter( 'get_user_option_closedpostboxes_modula-gallery', array( $this, 'metabox_prevent_closing' ) );
				add_filter( 'admin_body_class', array( $this->compat, 'no_drag_classes' ), 15, 1 );
			}

			/*
			CPT Styles & Scripts */
			// Media Scripts
			wp_enqueue_media(
				array(
					'post' => $post_id,
				)
			);

			// Get all items from current gallery.
			$images = get_post_meta( $post_id, 'modula-images', true );

			if ( is_array( $images ) && ! empty( $images ) ) {
				foreach ( $images as $image ) {
					if ( ! is_numeric( $image['id'] ) || 'attachment' !== get_post_type( $image['id'] ) ) {
						continue;
					}

					$attachment = wp_prepare_attachment_for_js( $image['id'] );
					$image_url  = wp_get_attachment_image_src( $image['id'], 'large' );
					$image_full = wp_get_attachment_image_src( $image['id'], 'full' );

					$image['full']            = $image_full[0];
					$image['thumbnail']       = $image_url[0];
					$image['orientation']     = ( isset( $attachment['orientation'] ) ) ? $attachment['orientation'] : '';
					$image['alt']             = get_post_meta( $image['id'], '_wp_attachment_image_alt', true );
					$image['title']           = get_the_title( $image['id'] );
					$image['caption']         = get_post_field( 'post_excerpt', $image['id'] );
					$image['description']     = get_post_field( 'post_excerpt', $image['id'] );
					$image['report']          = get_post_meta( $image['id'], Optimizer::REPORT, true );
					$modula_helper['items'][] = apply_filters( 'modula_image_properties', $image );
				}
			}

			// Get current gallery settings.
			$settings = get_post_meta( $post_id, 'modula-settings', true );
			$settings = apply_filters( 'modula_backbone_settings', $settings );

			if ( is_array( $settings ) ) {
				$modula_helper['settings'] = wp_parse_args( $settings, Modula_CPT_Fields_Helper::get_defaults() );
			} else {
				$modula_helper['settings'] = Modula_CPT_Fields_Helper::get_defaults();
			}

			wp_enqueue_style( 'wp-color-picker' );
			// Enqueue Code Editor for Custom CSS
			wp_enqueue_code_editor( array( 'type' => 'text/css' ) );
			wp_enqueue_style( 'modula-jquery-ui', MODULA_URL . 'assets/css/admin/jquery-ui' . $suffix . '.css', null, MODULA_LITE_VERSION );
			wp_enqueue_style( 'modula-cpt-style', MODULA_URL . 'assets/css/admin/modula-cpt' . $suffix . '.css', null, MODULA_LITE_VERSION );
			wp_enqueue_style( 'modula-pro-effects', MODULA_URL . 'assets/css/admin/effects' . $suffix . '.css', null, MODULA_LITE_VERSION );
			wp_enqueue_script( 'modula-resize-senzor', MODULA_URL . 'assets/js/admin/resizesensor' . $suffix . '.js', array( 'jquery' ), MODULA_LITE_VERSION, true );
			wp_enqueue_script(
				'modula-packery',
				MODULA_URL . 'assets/js/admin/packery' . $suffix . '.js',
				array(
					'jquery',
					'jquery-ui-core',
					'jquery-ui-widget',
					'jquery-ui-droppable',
					'jquery-ui-resizable',
					'jquery-ui-draggable',
				),
				MODULA_LITE_VERSION,
				true
			);
			wp_enqueue_script(
				'modula-settings',
				MODULA_URL . 'assets/js/admin/wp-modula-settings' . $suffix . '.js',
				array(
					'jquery',
					'jquery-ui-slider',
					'wp-color-picker',
					'jquery-ui-sortable',
				),
				MODULA_LITE_VERSION,
				true
			);
			wp_enqueue_script( 'modula-pro-tilt', MODULA_URL . 'assets/js/admin/modula-pro-tilt' . $suffix . '.js', array( 'jquery' ), MODULA_LITE_VERSION, true );
			wp_enqueue_editor();
			wp_enqueue_script( 'modula-save', MODULA_URL . 'assets/js/admin/wp-modula-save' . $suffix . '.js', array(), MODULA_LITE_VERSION, true );
			wp_enqueue_script( 'modula-items', MODULA_URL . 'assets/js/admin/wp-modula-items' . $suffix . '.js', array(), MODULA_LITE_VERSION, true );
			wp_enqueue_script( 'modula-modal', MODULA_URL . 'assets/js/admin/wp-modula-modal' . $suffix . '.js', array(), MODULA_LITE_VERSION, true );
			wp_enqueue_script( 'modula-upload', MODULA_URL . 'assets/js/admin/wp-modula-upload' . $suffix . '.js', array(), MODULA_LITE_VERSION, true );
			wp_enqueue_script( 'modula-gallery', MODULA_URL . 'assets/js/admin/wp-modula-gallery' . $suffix . '.js', array(), MODULA_LITE_VERSION, true );
			wp_enqueue_script( 'modula-conditions', MODULA_URL . 'assets/js/admin/wp-modula-conditions' . $suffix . '.js', array( 'modula-modal' ), MODULA_LITE_VERSION, true );

			do_action( 'modula_scripts_before_wp_modula' );

			wp_enqueue_script( 'modula', MODULA_URL . 'assets/js/admin/wp-modula' . $suffix . '.js', array(), MODULA_LITE_VERSION, true );
			$modula_helper = apply_filters( 'modula_helper_properties', $modula_helper );
			wp_localize_script( 'modula', 'modulaHelper', $modula_helper );
			do_action( 'modula_scripts_after_wp_modula' );
		} elseif ( 'modula-gallery_page_modula' === $hook ) {
			// Check if is modula custom post type
			if ( 'modula-gallery' !== $screen->post_type ) {
				return;
			}

			wp_enqueue_style( 'modula-welcome-style', MODULA_URL . 'assets/css/admin/welcome' . $suffix . '.css', null, MODULA_LITE_VERSION );
		} elseif ( 'modula-gallery_page_modula-addons' === $hook ) {
			// Check if is modula custom post type
			if ( 'modula-gallery' !== $screen->post_type ) {
				return;
			}

			wp_enqueue_style( 'modula-notices-style', MODULA_URL . 'assets/css/admin/modula-notices' . $suffix . '.css', null, MODULA_LITE_VERSION );
		} else {
			wp_enqueue_style( 'modula-header-style', MODULA_URL . 'assets/css/admin/modula-header' . $suffix . '.css', null, MODULA_LITE_VERSION );
			wp_enqueue_style( 'modula-notices-style', MODULA_URL . 'assets/css/admin/modula-notices' . $suffix . '.css', null, MODULA_LITE_VERSION );
		}

		wp_enqueue_script( 'modula-edit-screen', MODULA_URL . 'assets/js/admin/modula-edit' . $suffix . '.js', array(), MODULA_LITE_VERSION, true );
		wp_localize_script( 'modula-edit-screen', 'modulaHelper', $modula_helper );
		wp_enqueue_style( 'modula-notices-style', MODULA_URL . 'assets/css/admin/modula-notices' . $suffix . '.css', null, MODULA_LITE_VERSION );
		wp_enqueue_style( 'modula-edit-style', MODULA_URL . 'assets/css/admin/edit' . $suffix . '.css', null, MODULA_LITE_VERSION );
	}

	public function general_settings_page_scripts() {
		$screen = get_current_screen();

		if ( 'modula-gallery' !== $screen->post_type ) {
			return;
		}

		if ( 'modula-gallery_page_modula' !== $screen->base ) {
			return;
		}

		wp_enqueue_media();

		$scripts = Modula\Scripts::get_instance();

		$scripts->load_js_asset(
			'modula-settings',
			'assets/js/admin/general-settings',
		);

		$scripts->load_css_asset(
			'modula-settings',
			'assets/js/admin/general-settings',
			array( 'wp-components' )
		);

		wp_add_inline_script(
			'modula-settings',
			'const modulaUrl = ' . wp_json_encode( MODULA_URL ),
			'before'
		);
	}

	public function extensions_scripts() {
		$screen = get_current_screen();
		if ( 'modula-gallery' !== $screen->post_type ) {
			return;
		}

		if ( 'modula-gallery_page_modula-addons' !== $screen->base ) {
			return;
		}

		$scripts = Modula\Scripts::get_instance();
		$scripts->load_js_asset(
			'modula-extensions',
			'assets/js/admin/extensions',
		);

		$scripts->load_css_asset(
			'modula-extensions',
			'assets/js/admin/extensions',
			array( 'wp-components' )
		);

		wp_localize_script(
			'modula-extensions',
			'extensionsStrings',
			array(
				'proExists' => defined( 'MODULA_PRO_VERSION' ),
				'offer'     => apply_filters( 'modula_extensions_offer', new \stdClass() ),
			),
			'before'
		);
	}

	public function insights_scripts() {
		$screen = get_current_screen();
		if ( 'modula-gallery' !== $screen->post_type ) {
			return;
		}

		if ( 'modula-gallery_page_modula-insights' !== $screen->base ) {
			return;
		}

		$scripts = Modula\Scripts::get_instance();
		$scripts->load_js_asset(
			'modula-insights',
			'assets/js/admin/insights',
		);

		$scripts->load_css_asset(
			'modula-insights',
			'assets/js/admin/insights',
			array( 'wp-components' )
		);

		wp_localize_script(
			'modula-insights',
			'insightsStrings',
			array(
				'proExists' => defined( 'MODULA_PRO_VERSION' ),
				'offer'     => apply_filters( 'modula_extensions_offer', new \stdClass() ),
			),
			'before'
		);
	}

	/**
	 * Prevent sorting of CPT metaboxes.
	 *
	 * @return array
	 */
	public function metabox_prevent_sorting() {
		$normal = array(
			'modula_metabox_gallery',
			'modula_metabox_columns',
			'modula_metabox_social',
			'modula_metabox_general',
			'modula_metabox_general_new',
			'modula_metabox_filter',
		);

		return array(
			'side'      => '',
			'advanced'  => '',
			'normal'    => implode( ',', $normal ),
			'after_cpt' => '',
		);
	}

	/**
	 * Prevent closing of CPT metaboxes.
	 *
	 * @return array
	 */
	public function metabox_prevent_closing() {
		return array();
	}

	/**
	 * Output standard WordPress CSS variables for plugin compatibility.
	 * These variables ensure the plugin works on any WordPress installation.
	 *
	 * @return void
	 */
	public function output_wp_css_variables() {
		$screen = get_current_screen();
		if ( ! $screen ) {
			return;
		}

		$is_modula_page = false;

		if ( isset( $screen->post_type ) && 'modula-gallery' === $screen->post_type ) {
			$is_modula_page = true;
		}

		if ( false !== strpos( $screen->id, 'modula-gallery' ) ||
			false !== strpos( $screen->id, 'modula-addons' ) ||
			false !== strpos( $screen->id, 'modula-insights' ) ||
			false !== strpos( $screen->id, 'wpchill-dashboard' ) ) {
			$is_modula_page = true;
		}

		if ( ! $is_modula_page ) {
			return;
		}

		$admin_theme_color = get_user_option( 'admin_color' );
		$wp_admin_color    = '#2271b1';

		if ( function_exists( 'wp_admin_css_color' ) ) {
			global $_wp_admin_css_colors;
			if ( isset( $_wp_admin_css_colors[ $admin_theme_color ] ) ) {
				$wp_admin_color = $_wp_admin_css_colors[ $admin_theme_color ]->colors[0];
			}
		}

		$accent_color = 'var(--wp-admin-theme-color, ' . $wp_admin_color . ')';
		$accent_hover = 'var(--wp-admin-theme-color-darker-10, ' . $wp_admin_color . ')';

		$css = '
		<style id="modula-wp-styles-inline-css">
			:root {
				/* Container widths - standard WordPress admin widths */
				--theme-normal-container-max-width: 1290px;
				--theme-narrow-container-max-width: 750px;
				--theme-wide-offset: 130px;
				
				/* Spacing - standard WordPress admin spacing */
				--theme-content-spacing: 1.5em;
				
				/* Accent colors - use WordPress admin theme color */
				--ui-accent-color: ' . $accent_color . ';
				--ui-accent-hover-color: ' . $accent_hover . ';
				
				/* Palette colors - standard WordPress admin colors */
				--theme-palette-color-1: ' . $accent_color . ';
				--theme-palette-color-2: ' . $accent_hover . ';
				--theme-palette-color-3: #2c3338;
				--theme-palette-color-4: #1d2327;
				--theme-palette-color-5: #c3c4c7;
				--theme-palette-color-6: #f0f0f1;
				--theme-palette-color-7: #f6f7f7;
				--theme-palette-color-8: #ffffff;
				
				/* Text and link colors - standard WordPress admin */
				--theme-text-color: #2c3338;
				--theme-link-initial-color: ' . $accent_color . ';
				--theme-link-hover-color: ' . $accent_hover . ';
				
				/* Border colors - standard WordPress admin borders */
				--theme-border-color: #c3c4c7;
				
				/* Headings - standard WordPress admin */
				--theme-headings-color: #1d2327;
				
				/* Form fields - standard WordPress admin */
				--theme-form-field-border-initial-color: #8c8f94;
				--theme-form-field-border-focus-color: ' . $accent_color . ';
				
				/* Buttons - standard WordPress admin */
				--theme-button-text-initial-color: #ffffff;
				--theme-button-text-hover-color: #ffffff;
				--theme-button-background-initial-color: ' . $accent_color . ';
				--theme-button-background-hover-color: ' . $accent_hover . ';
				
				/* Quantity arrows */
				--quantity-arrows-initial-color: var(--theme-text-color);
			}
		</style>';

		echo $css;
	}
}
