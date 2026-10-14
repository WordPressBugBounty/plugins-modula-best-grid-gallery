<?php
/**
 * Full-screen takeover for the Modula gallery CPT when the modern settings editor is enabled.
 *
 * Hides default WP admin chrome and renders the React app in a fixed root (see admin_footer).
 *
 * Disable via: `add_filter( 'modula_gallery_takeover_ui', '__return_false' );`
 *
 * @package Modula
 */

namespace Modula\V2\Admin;

defined( 'ABSPATH' ) || exit;

/**
 * Class Gallery_Takeover_Admin
 */
class Gallery_Takeover_Admin {

	/**
	 * Register hooks (body class + mount node).
	 *
	 * @return void
	 */
	public static function init() {
		add_filter( 'admin_body_class', array( __CLASS__, 'filter_body_class' ) );
		add_action( 'add_meta_boxes', array( __CLASS__, 'remove_legacy_gallery_metabox' ), 99 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'register_pro_extension_script_dependencies' ), 15 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'dequeue_legacy_gallery_scripts' ), 100 );
		add_action( 'admin_head', array( __CLASS__, 'print_appearance_boot_script' ), 1 );
		add_action( 'admin_footer', array( __CLASS__, 'render_root' ), 5 );
	}

	/**
	 * Remove the classic Gallery metabox (Backbone grid, Plupload, Add New list). Takeover is React-only.
	 *
	 * @return void
	 */
	public static function remove_legacy_gallery_metabox() {
		if ( ! self::should_use_takeover() ) {
			return;
		}
		remove_meta_box( 'modula-preview-gallery', 'modula-gallery', 'normal' );
		// Shortcode UI is rendered in the React sidebar (under Customizations).
		remove_meta_box( 'modula-shortcode', 'modula-gallery', 'side' );
	}

	/**
	 * Register script handles Pro extensions depend on (conditions) without loading the legacy metabox stack.
	 *
	 * Legacy handles are dequeued later; Pro extensions still enqueue condition scripts on gallery edit.
	 *
	 * @param string $hook_suffix Current admin screen hook.
	 * @return void
	 */
	public static function register_pro_extension_script_dependencies( $hook_suffix ) {
		if ( ! self::should_use_takeover() ) {
			return;
		}
		if ( 'post.php' !== $hook_suffix && 'post-new.php' !== $hook_suffix ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'modula-gallery' !== $screen->post_type ) {
			return;
		}

		if ( function_exists( 'modula_pro_ensure_condition_scripts_registered' ) ) {
			modula_pro_ensure_condition_scripts_registered();
			return;
		}

		if ( wp_script_is( 'modula-conditions', 'registered' ) || ! defined( 'MODULA_URL' ) || ! defined( 'MODULA_LITE_VERSION' ) ) {
			return;
		}

		$suffix = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? '' : '.min';
		wp_register_script(
			'modula-conditions',
			MODULA_URL . 'assets/js/admin/wp-modula-conditions' . $suffix . '.js',
			array( 'jquery' ),
			MODULA_LITE_VERSION,
			true
		);
	}

	/**
	 * Do not load scripts that initialize against removed gallery DOM (#modula-uploader-*, grid preview).
	 *
	 * @param string $hook_suffix Current admin screen hook.
	 * @return void
	 */
	public static function dequeue_legacy_gallery_scripts( $hook_suffix ) {
		if ( ! self::should_use_takeover() ) {
			return;
		}
		if ( 'post.php' !== $hook_suffix && 'post-new.php' !== $hook_suffix ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'modula-gallery' !== $screen->post_type ) {
			return;
		}
		$handles = apply_filters(
			'modula_takeover_dequeue_legacy_gallery_scripts',
			array(
				'modula',
				'modula-items',
				'modula-save',
				'modula-modal',
				'modula-upload',
				'modula-gallery',
				'modula-conditions',
				'modula-gallery-upload',
				'modula-progress',
				'modula-pro-upload',
				'modula-pro-items',
				'wp-modula-pro',
				'modula-watermark-script',
			)
		);
		foreach ( $handles as $handle ) {
			wp_dequeue_script( $handle );
		}
	}

	/**
	 * Whether the full-screen takeover UI should load on this request.
	 *
	 * @return bool
	 */
	public static function should_use_takeover() {
		if ( ! apply_filters( 'modula_enable_modern_settings_editor', false, \Modula\V2\Beta_Settings::current_gallery_id() ) ) {
			return false;
		}

		if ( ! apply_filters( 'modula_gallery_takeover_ui', true ) ) {
			return false;
		}

		return self::is_modula_gallery_edit_screen();
	}

	/**
	 * Gallery edit / add screen (post type modula-gallery).
	 *
	 * @return bool
	 */
	private static function is_modula_gallery_edit_screen() {
		if ( ! is_admin() ) {
			return false;
		}

		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

		return $screen
			&& 'post' === $screen->base
			&& 'modula-gallery' === $screen->post_type;
	}

	/**
	 * @param string $classes Space-separated body classes.
	 * @return string
	 */
	public static function filter_body_class( $classes ) {
		if ( self::should_use_takeover() ) {
			$classes .= ' modula-gallery-takeover';
		}

		return $classes;
	}

	/**
	 * Early paint: resolve the editor appearance before the React bundle loads.
	 *
	 * @return void
	 */
	public static function print_appearance_boot_script() {
		if ( ! self::should_use_takeover() ) {
			return;
		}

		Takeover_Boot_Shell::print_appearance_script();
	}

	/**
	 * Fixed root for the React settings app (avoids nesting inside metabox markup).
	 *
	 * Paints the shared boot shell so slow networks do not flash a blank white page
	 * before the settings-editor bundle downloads and mounts.
	 *
	 * @return void
	 */
	public static function render_root() {
		if ( ! self::should_use_takeover() ) {
			return;
		}

		Takeover_Boot_Shell::render_mount(
			array(
				'id'              => 'modula-gallery-takeover-root',
				'class'           => 'modula-gallery-takeover__mount modula-settings-editor-mount',
				'back_url'        => \Modula\V2\Rest\Listing_Controller::admin_url(),
				'desktop_message' => __( 'The gallery editor is a desktop experience. Open this page on a computer to continue.', 'modula-best-grid-gallery' ),
			)
		);
	}

	/**
	 * Enqueue CSS that hides WP admin chrome while takeover is active.
	 *
	 * @param object $scripts \Modula_Scripts instance.
	 * @return void
	 */
	public static function enqueue_takeover_styles( $scripts ) {
		Takeover_Boot_Shell::enqueue_styles();
		$scripts->load_css_asset(
			'modula-gallery-takeover-admin',
			'assets/css/admin',
			array( Takeover_Boot_Shell::STYLE_HANDLE ),
			'gallery-takeover-admin'
		);
	}
}
