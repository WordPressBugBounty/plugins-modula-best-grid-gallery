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
	 * Early paint: read appearance from localStorage before the React bundle loads.
	 *
	 * Sets resolved `data-modula-se-appearance` on `<html>` so `gallery-takeover-admin.css`
	 * can paint the mount in light/dark without waiting for JS chunks. Missing storage
	 * is treated as system and resolved with `prefers-color-scheme`.
	 *
	 * @return void
	 */
	public static function print_appearance_boot_script() {
		if ( ! self::should_use_takeover() ) {
			return;
		}

		$key = 'modula-settings-editor-appearance';
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON-encoded string key.
		$json_key = wp_json_encode( $key );
		echo '<script>(function(){function r(){try{if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches){return"dark";}}catch(e2){}return"light";}try{var k=' . $json_key . ';var a=localStorage.getItem(k);if(a!=="dark"&&a!=="light"&&a!=="system"){a="system";}var v=a==="system"?r():a;document.documentElement.setAttribute("data-modula-se-appearance",v);}catch(e){document.documentElement.setAttribute("data-modula-se-appearance",r());}})();</script>' . "\n";
	}

	/**
	 * Fixed root for the React settings app (avoids nesting inside metabox markup).
	 *
	 * Includes an HTML/CSS boot shell so slow networks do not flash a blank white page
	 * before the settings-editor bundle downloads and mounts. On phones and tablets
	 * a desktop-only notice is shown instead of the spinner (see gallery-takeover-admin.css).
	 *
	 * @return void
	 */
	public static function render_root() {
		if ( ! self::should_use_takeover() ) {
			return;
		}

		$label = esc_html__( 'Loading editor…', 'modula-best-grid-gallery' );

		echo '<div id="modula-gallery-takeover-root" class="modula-gallery-takeover__mount modula-settings-editor-mount" data-appearance="light">';
		self::render_desktop_only_notice();
		echo '<div class="modula-settings-editor__boot" role="status" aria-live="polite" aria-busy="true">';
		echo '<span class="modula-settings-editor__boot-spinner" aria-hidden="true"></span>';
		echo '<span class="modula-settings-editor__boot-label">' . $label . '</span>';
		echo '</div>';
		echo '</div>';

		// Sync mount attribute from the early <html> flag (set in admin_head).
		echo '<script>(function(){var r=document.getElementById("modula-gallery-takeover-root");var a=document.documentElement.getAttribute("data-modula-se-appearance");if(r&&(a==="dark"||a==="light")){r.setAttribute("data-appearance",a);}})();</script>' . "\n";
	}

	/**
	 * Pre-React desktop-only notice (phones / tablets). Hidden on desktop via CSS.
	 *
	 * @return void
	 */
	private static function render_desktop_only_notice() {
		$back_url = \Modula\V2\Rest\Listing_Controller::admin_url();
		$title_id = 'modula-desktop-only-title';

		echo '<div class="modula-gallery-takeover__desktop-only" role="region" aria-labelledby="' . esc_attr( $title_id ) . '">';
		echo '<div class="modula-gallery-takeover__desktop-only-inner">';
		echo '<span class="modula-gallery-takeover__desktop-only-icon" aria-hidden="true">';
		echo '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M20.2 5.8H3.8c-.4 0-.8.4-.8.8v9.6c0 .4.4.8.8.8H11v1.2H8.5v1.2h7V18.2H13v-1.2h7.2c.4 0 .8-.4.8-.8V6.6c0-.4-.4-.8-.8-.8zm-.6 9.6H4.4V7.2h15.2v8.2z"/></svg>';
		echo '</span>';
		echo '<h1 id="' . esc_attr( $title_id ) . '" class="modula-gallery-takeover__desktop-only-title">';
		echo esc_html__( 'Desktop only', 'modula-best-grid-gallery' );
		echo '</h1>';
		echo '<p class="modula-gallery-takeover__desktop-only-body">';
		echo esc_html__(
			'The gallery editor is a desktop experience. Open this page on a computer to continue.',
			'modula-best-grid-gallery'
		);
		echo '</p>';
		echo '<a class="modula-gallery-takeover__desktop-only-back" href="' . esc_url( $back_url ) . '">';
		echo esc_html__( 'Back', 'modula-best-grid-gallery' );
		echo '</a>';
		echo '</div>';
		echo '</div>';
	}

	/**
	 * Enqueue CSS that hides WP admin chrome while takeover is active.
	 *
	 * @param object $scripts \Modula_Scripts instance.
	 * @return void
	 */
	public static function enqueue_takeover_styles( $scripts ) {
		$scripts->load_css_asset(
			'modula-gallery-takeover-admin',
			'assets/css/admin',
			array(),
			'gallery-takeover-admin'
		);
	}
}
