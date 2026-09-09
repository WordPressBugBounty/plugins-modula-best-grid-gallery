<?php
/**
 * Gallery listing admin screen: mount, redirect from CPT list, enqueue.
 *
 * @package Modula
 */

namespace Modula\V2\Admin;

defined( 'ABSPATH' ) || exit;

use Modula\V2\Rest\Listing_Controller;

/**
 * Class Gallery_Listing_Admin
 */
class Gallery_Listing_Admin {

	/**
	 * @return void
	 */
	public static function init() {
		if ( ! is_admin() ) {
			return;
		}

		add_action( 'admin_menu', array( __CLASS__, 'register_menu' ), 9 );
		add_action( 'admin_menu', array( __CLASS__, 'remove_default_galleries_submenu' ), 999 );
		add_action( 'admin_menu', array( __CLASS__, 'remove_albums_submenu' ), 999 );
		add_action( 'admin_menu', array( __CLASS__, 'reorder_modula_submenu' ), 1000 );
		add_action( 'load-edit.php', array( __CLASS__, 'redirect_cpt_list' ) );
		add_filter( 'parent_file', array( __CLASS__, 'filter_parent_file' ) );
		add_filter( 'submenu_file', array( __CLASS__, 'filter_submenu_file' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
		add_filter( 'modula_albums_editor_config', array( __CLASS__, 'filter_albums_editor_config' ) );
	}

	/**
	 * @return void
	 */
	public static function register_menu() {
		add_submenu_page(
			'edit.php?post_type=modula-gallery',
			__( 'Galleries', 'modula-best-grid-gallery' ),
			__( 'Galleries', 'modula-best-grid-gallery' ),
			'edit_posts',
			Listing_Controller::PAGE_SLUG,
			array( __CLASS__, 'render_page' ),
			1
		);
	}

	/**
	 * Drop the CPT auto “Galleries” item so only the React listing remains.
	 *
	 * @return void
	 */
	public static function remove_default_galleries_submenu() {
		remove_submenu_page( 'edit.php?post_type=modula-gallery', 'edit.php?post_type=modula-gallery' );
	}

	/**
	 * Drop the Albums CPT list submenu when the mixed listing owns navigation.
	 *
	 * @return void
	 */
	public static function remove_albums_submenu() {
		if ( ! post_type_exists( 'modula-album' ) ) {
			return;
		}
		remove_submenu_page( 'edit.php?post_type=modula-gallery', 'edit.php?post_type=modula-album' );
	}

	/**
	 * Galleries (listing) first, then Gallery presets, Albums, Album presets.
	 * Do not share submenu position 1 with presets.
	 *
	 * @return void
	 */
	public static function reorder_modula_submenu() {
		global $submenu;
		$parent = 'edit.php?post_type=modula-gallery';
		if ( empty( $submenu[ $parent ] ) || ! is_array( $submenu[ $parent ] ) ) {
			return;
		}

		$items  = $submenu[ $parent ];
		$picked = array();

		$listing = self::take_submenu_item(
			$items,
			array( Listing_Controller::PAGE_SLUG )
		);
		if ( $listing ) {
			$picked[] = $listing;
		}

		$gallery_presets = self::take_submenu_item(
			$items,
			array(
				'#gallery-defaults',
				'edit.php?post_type=modula-defaults',
				'modula-defaults',
			)
		);
		if ( $gallery_presets ) {
			$picked[] = $gallery_presets;
		}

		$albums = self::take_submenu_item(
			$items,
			array( '#modula-albums' )
		);
		if ( $albums ) {
			$picked[] = $albums;
		}

		$album_presets = self::take_submenu_item(
			$items,
			array(
				'#albums-defaults',
				'edit.php?post_type=defaults-albums',
				'defaults-albums',
			)
		);
		if ( $album_presets ) {
			$picked[] = $album_presets;
		}

		$submenu[ $parent ] = array_merge( $picked, array_values( $items ) );
	}

	/**
	 * @param array<int|string, array<int, mixed>> $items Submenu rows (by ref).
	 * @param string[]                             $slugs Exact menu_slug matches.
	 * @return array<int, mixed>|null
	 */
	private static function take_submenu_item( &$items, $slugs ) {
		foreach ( $items as $key => $item ) {
			$slug = isset( $item[2] ) ? (string) $item[2] : '';
			if ( in_array( $slug, $slugs, true ) ) {
				unset( $items[ $key ] );
				return $item;
			}
		}
		return null;
	}

	/**
	 * Point albums editor “back to list” at the gallery listing.
	 *
	 * @param array<string, mixed> $config Editor bootstrap.
	 * @return array<string, mixed>
	 */
	public static function filter_albums_editor_config( $config ) {
		if ( ! is_array( $config ) ) {
			return $config;
		}
		$config['listUrl'] = Listing_Controller::admin_url();
		return $config;
	}

	/**
	 * @return bool
	 */
	private static function can_create_album() {
		if ( ! post_type_exists( 'modula-album' ) ) {
			return false;
		}
		$post_type = get_post_type_object( 'modula-album' );
		return $post_type && current_user_can( $post_type->cap->create_posts );
	}

	/**
	 * Redirect the classic CPT list to the gallery listing.
	 *
	 * @return void
	 */
	public static function redirect_cpt_list() {
		if ( ! empty( $_GET['page'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}
		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ! in_array( $post_type, array( 'modula-gallery', 'modula-album' ), true ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}
		wp_safe_redirect( Listing_Controller::admin_url() );
		exit;
	}

	/**
	 * Keep Modula menu open on the listing screen.
	 *
	 * @param string $parent_file Current parent file.
	 * @return string
	 */
	public static function filter_parent_file( $parent_file ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && 'modula-gallery_page_' . Listing_Controller::PAGE_SLUG === $screen->id ) {
			return 'edit.php?post_type=modula-gallery';
		}
		return $parent_file;
	}

	/**
	 * Highlight Galleries when on the listing page.
	 *
	 * @param string $submenu_file Current submenu file.
	 * @return string
	 */
	public static function filter_submenu_file( $submenu_file ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && 'modula-gallery_page_' . Listing_Controller::PAGE_SLUG === $screen->id ) {
			return Listing_Controller::PAGE_SLUG;
		}
		return $submenu_file;
	}

	/**
	 * @return void
	 */
	public static function render_page() {
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( esc_html__( 'You are not allowed to list galleries.', 'modula-best-grid-gallery' ) );
		}
		echo '<div class="wrap modula-gallery-listing-wrap">';
		echo '<div id="modula-gallery-listing-root"></div>';
		echo '</div>';
	}

	/**
	 * @param string $hook_suffix Current admin hook.
	 * @return void
	 */
	public static function enqueue( $hook_suffix ) {
		if ( 'modula-gallery_page_' . Listing_Controller::PAGE_SLUG !== $hook_suffix ) {
			return;
		}

		$scripts = \Modula\Scripts::get_instance();
		$scripts->load_js_asset(
			'modula-gallery-listing',
			'assets/js/admin/gallery-listing'
		);
		$scripts->load_css_asset(
			'modula-gallery-listing',
			'assets/js/admin/gallery-listing',
			array( 'wp-components' )
		);

		wp_localize_script(
			'modula-gallery-listing',
			'modulaGalleryListing',
			array(
				'nonce'                 => wp_create_nonce( 'wp_rest' ),
				'listUrl'               => Listing_Controller::admin_url(),
				'logoUrl'               => MODULA_URL . 'assets/images/modula-site-icon.png',
				'newGalleryUrl'         => admin_url( 'post-new.php?post_type=modula-gallery' ),
				'postNewUrl'            => admin_url( 'post-new.php?post_type=modula-gallery' ),
				'editorChoiceQueryArg'  => Beta_Gallery_Admin::QUERY_ARG,
				'createGalleryNonce'    => wp_create_nonce( 'modula-gallery-create-choice' ),
				'createAlbumNonce'      => wp_create_nonce( 'modula-album-create-choice' ),
				'editorChoiceHeroUrl'   => MODULA_URL . 'assets/images/admin/beta-editor-choice-hero.png',
				'hasAlbums'             => post_type_exists( 'modula-album' ),
				'canCreateAlbum'        => self::can_create_album(),
				'newAlbumUrl'           => self::can_create_album() ? admin_url( 'post-new.php?post_type=modula-album' ) : '',
				'isPro'                 => modula_is_compatible_pro(),
				'extensionEntitlements' => Settings_Editor_Metabox::get_extension_entitlements_for_editor(),
				'upgradeUrl'            => defined( 'MODULA_PRO_STORE_UPGRADE_URL' ) ? MODULA_PRO_STORE_UPGRADE_URL : 'https://wp-modula.com/pricing',
				'standaloneUpsellUrl'   => 'https://wp-modula.com/pricing/?utm_source=modula-lite&utm_medium=listing&utm_campaign=modula-standalone',
				'extensionsAdminUrl'    => admin_url( 'edit.php?post_type=modula-gallery&page=modula-addons' ),
			)
		);
	}
}
