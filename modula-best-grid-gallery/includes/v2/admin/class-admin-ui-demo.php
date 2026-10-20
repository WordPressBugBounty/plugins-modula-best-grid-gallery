<?php
/**
 * Internal admin-ui demo page (ADR 0046).
 *
 * Shows every admin-ui control in every state so the maintainer can approve
 * the design language before screens adopt it. Registered only when
 * SCRIPT_DEBUG is on, as a hidden page with no menu entry.
 *
 * @package Modula
 */

namespace Modula\V2\Admin;

defined( 'ABSPATH' ) || exit;

/**
 * Class Admin_Ui_Demo
 */
class Admin_Ui_Demo {

	const PAGE_SLUG = 'modula-admin-ui-demo';

	/**
	 * Build output, relative to the plugin root. Release zips exclude it.
	 */
	const ASSET_DIR = 'assets/js/admin/admin-ui-demo';

	/**
	 * Hook suffix returned when the page is registered.
	 *
	 * @var string
	 */
	private static $hook_suffix = '';

	/**
	 * @return void
	 */
	public static function init() {
		if ( ! is_admin() || ! self::is_enabled() ) {
			return;
		}

		add_action( 'admin_menu', array( __CLASS__, 'register_page' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
	}

	/**
	 * The demo is a development aid, so it exists only on SCRIPT_DEBUG sites.
	 *
	 * @return bool
	 */
	private static function is_enabled() {
		return defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG;
	}

	/**
	 * Registers the page without a menu entry (empty parent slug).
	 *
	 * @return void
	 */
	public static function register_page() {
		$hook_suffix = add_submenu_page(
			'',
			__( 'Admin UI demo', 'modula-best-grid-gallery' ),
			__( 'Admin UI demo', 'modula-best-grid-gallery' ),
			'manage_options',
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);

		self::$hook_suffix = is_string( $hook_suffix ) ? $hook_suffix : '';

		if ( '' !== self::$hook_suffix ) {
			add_action( 'load-' . self::$hook_suffix, array( __CLASS__, 'set_page_title' ) );
		}
	}

	/**
	 * A page without a menu parent has no title for get_admin_page_title(),
	 * and admin-header.php passes that null to strip_tags() (deprecated on
	 * PHP 8.1+). Set the global it reads before the header renders.
	 *
	 * @return void
	 */
	public static function set_page_title() {
		global $title;

		$title = __( 'Admin UI demo', 'modula-best-grid-gallery' ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- WordPress reads $title for the admin header; hidden pages leave it null.
	}

	/**
	 * The demo bundle is built locally only, so a SCRIPT_DEBUG site running a
	 * release zip has the page but not the assets.
	 *
	 * @return bool
	 */
	private static function is_built() {
		return file_exists( MODULA_PATH . self::ASSET_DIR . '/index.asset.php' )
			&& file_exists( MODULA_PATH . self::ASSET_DIR . '/index.css' );
	}

	/**
	 * @return void
	 */
	public static function render_page() {
		if ( ! self::is_built() ) {
			printf(
				'<div class="wrap"><div class="notice notice-warning"><p>%s</p></div></div>',
				esc_html__( 'The admin UI demo is not built. Run npm run build:admin-ui-demo in the plugin folder.', 'modula-best-grid-gallery' )
			);
			return;
		}

		echo '<div class="wrap"><div id="modula-admin-ui-demo"></div></div>';
	}

	/**
	 * @param string $hook_suffix Current admin page hook suffix.
	 * @return void
	 */
	public static function enqueue( $hook_suffix ) {
		if ( '' === self::$hook_suffix || self::$hook_suffix !== $hook_suffix ) {
			return;
		}

		if ( ! self::is_built() ) {
			return;
		}

		$scripts = \Modula\Scripts::get_instance();
		$scripts->load_js_asset( 'modula-admin-ui-demo', self::ASSET_DIR );
		$scripts->load_css_asset( 'modula-admin-ui-demo', self::ASSET_DIR );
	}
}
