<?php
/**
 * Content page admin screen: mount, redirect from CPT list, enqueue.
 *
 * @package Modula
 */

namespace Modula\V2\Admin;

defined( 'ABSPATH' ) || exit;

use Modula\V2\Rest\Content_Page_Controller;

/**
 * Class Content_Page_Admin
 *
 * Formerly Gallery_Listing_Admin, still aliased (see Loader::load()). The
 * `modula-gallery-listing` script handle, the `modulaGalleryListing` global,
 * the `modula-gallery-listing-root` mount and the `modula_gallery_listing_*`
 * hooks keep their listing names: Pro depends on them (ADR 0055).
 */
class Content_Page_Admin {

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
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'hide_notification_bubble' ), 20 );
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
			self::listing_capability(),
			Content_Page_Controller::PAGE_SLUG,
			array( __CLASS__, 'render_page' ),
			1
		);
	}

	/**
	 * Capability that opens the listing for the current user.
	 *
	 * add_submenu_page() takes one capability, so this is the edit cap of the
	 * first type the user can list. When they can list none, the gallery edit
	 * cap keeps the page closed. Album-only roles cannot open the gallery CPT
	 * parent, so WordPress links the Modula menu to its first open submenu,
	 * this listing (see reorder_modula_submenu()).
	 *
	 * @return string
	 */
	private static function listing_capability() {
		$post_types = Content_Page_Controller::listable_post_types();
		$post_type  = $post_types ? $post_types[0] : 'modula-gallery';
		$object     = get_post_type_object( $post_type );
		return $object ? $object->cap->edit_posts : 'edit_posts';
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
			array( Content_Page_Controller::PAGE_SLUG )
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
		$config['listUrl'] = Content_Page_Controller::admin_url();
		return $config;
	}

	/**
	 * The Presets or Licenses content section: Pro's existing list screen for
	 * that post type, and its count. Without the post type (Pro, or its
	 * extension, is off) or the right to edit it, there is no screen: an empty
	 * URL and 0.
	 *
	 * @param string $post_type Pro post type behind the section.
	 * @return array{url: string, count: int}
	 */
	private static function pro_section_screen( $post_type ) {
		$object = get_post_type_object( $post_type );
		if ( ! $object || ! current_user_can( $object->cap->edit_posts ) ) {
			return array(
				'url'   => '',
				'count' => 0,
			);
		}

		$counts = wp_count_posts( $post_type );
		$total  = 0;
		foreach ( Content_Page_Controller::LIVE_STATUSES as $status ) {
			$total += isset( $counts->$status ) ? (int) $counts->$status : 0;
		}
		return array(
			'url'   => admin_url( 'edit.php?post_type=' . $post_type ),
			'count' => $total,
		);
	}

	/**
	 * Hides the floating WPChill bubble on the content page: its header bell
	 * shows the same notifications. Runs after WPChill enqueues the bubble.
	 *
	 * @param string $hook_suffix Current admin hook.
	 * @return void
	 */
	public static function hide_notification_bubble( $hook_suffix ) {
		if ( ! self::is_content_page_hook( $hook_suffix ) ) {
			return;
		}
		\Modula_Admin_Assets::dequeue_wpchill_notification_bubble();
	}

	/**
	 * @param string $hook_suffix Current admin hook.
	 * @return bool Whether it is the content page.
	 */
	private static function is_content_page_hook( $hook_suffix ) {
		return 'modula-gallery_page_' . Content_Page_Controller::PAGE_SLUG === $hook_suffix;
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
		// Only users who can edit the requested type; edit.php denies the rest itself.
		if ( ! in_array( $post_type, Content_Page_Controller::listable_post_types(), true ) ) {
			return;
		}
		wp_safe_redirect( Content_Page_Controller::admin_url() );
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
		if ( $screen && 'modula-gallery_page_' . Content_Page_Controller::PAGE_SLUG === $screen->id ) {
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
		if ( $screen && 'modula-gallery_page_' . Content_Page_Controller::PAGE_SLUG === $screen->id ) {
			return Content_Page_Controller::PAGE_SLUG;
		}
		return $submenu_file;
	}

	/**
	 * @return void
	 */
	public static function render_page() {
		if ( ! Content_Page_Controller::listable_post_types() ) {
			wp_die( esc_html__( 'You are not allowed to list galleries.', 'modula-best-grid-gallery' ) );
		}
		echo '<div class="wrap modula-content-page-wrap">';
		echo '<div id="modula-gallery-listing-root"></div>';
		echo '</div>';
	}

	/**
	 * @param string $hook_suffix Current admin hook.
	 * @return void
	 */
	public static function enqueue( $hook_suffix ) {
		if ( ! self::is_content_page_hook( $hook_suffix ) ) {
			return;
		}

		// Pro's preset and image license post types (Defaults, Image Licensing).
		$presets  = self::pro_section_screen( 'modula-defaults' );
		$licenses = self::pro_section_screen( 'modula-image-license' );

		$scripts = \Modula\Scripts::get_instance();
		$scripts->load_js_asset(
			'modula-gallery-listing',
			'assets/js/admin/content-page'
		);
		// The page draws on admin-ui only; Pro's Bulk Editor enqueues wp-components itself.
		$scripts->load_css_asset(
			'modula-gallery-listing',
			'assets/js/admin/content-page'
		);

		/**
		 * Filters the gallery listing bootstrap.
		 *
		 * New from preset keys, filled by Pro Defaults (Lite only reads them):
		 * - `galleryPresets`: list of `{ id: int, title: string, summary?: string, classicEditor?: bool }`.
		 *   Empty keeps the plain New gallery editor choice (no arrows, no footer line).
		 *   `classicEditor: false` leaves the preset out of the classic list (its layout,
		 *   e.g. Freeform, has no classic equivalent); missing means true.
		 * - `defaultGalleryPresetId`: usable Default preset ID, 0 for none.
		 *
		 * Filled by Compatible Pro (Lite keeps no list of its own):
		 * - `proOnlyGalleryTypes`: gallery type slugs that need Pro or a Pro extension. While the
		 *   license is expired or in renewal grace, those galleries get the PRO expired badge and
		 *   the license expired banner counts them.
		 *
		 * @param array<string, mixed> $config Listing bootstrap.
		 */
		wp_localize_script(
			'modula-gallery-listing',
			'modulaGalleryListing',
			apply_filters(
				'modula_gallery_listing_config',
				array(
					'nonce'                 => wp_create_nonce( 'wp_rest' ),
					'listUrl'               => Content_Page_Controller::admin_url(),
					'logoUrl'               => MODULA_URL . 'assets/images/modula-site-icon.png',
					'newGalleryUrl'         => admin_url( 'post-new.php?post_type=modula-gallery' ),
					'postNewUrl'            => admin_url( 'post-new.php?post_type=modula-gallery' ),
					'editorChoiceQueryArg'  => Beta_Gallery_Admin::QUERY_ARG,
					'presetQueryArg'        => Beta_Gallery_Admin::PRESET_QUERY_ARG,
					'galleryPresets'        => array(),
					'defaultGalleryPresetId' => 0,
					'settingsUrl'           => admin_url( 'edit.php?post_type=modula-gallery&page=modula&section=galleries' ),
					'createGalleryNonce'    => wp_create_nonce( Beta_Gallery_Admin::CREATE_CHOICE_NONCE_ACTIONS['modula-gallery'] ),
					'createAlbumNonce'      => wp_create_nonce( Beta_Gallery_Admin::CREATE_CHOICE_NONCE_ACTIONS['modula-album'] ),
					'editorChoiceHeroUrl'   => MODULA_URL . 'assets/images/admin/beta-editor-choice-hero.png',
					'hasAlbums'             => post_type_exists( 'modula-album' ),
					'canCreateAlbum'        => self::can_create_album(),
					'newAlbumUrl'           => self::can_create_album() ? admin_url( 'post-new.php?post_type=modula-album' ) : '',
					'isPro'                 => modula_is_compatible_pro(),
					'canUseBulkEditor'      => false,
					'canUseApplyPreset'     => false,
					'albumTakeoverAvailable' => false,
					'extensionEntitlements' => Settings_Editor_Metabox::get_extension_entitlements_for_editor(),
					'upgradeUrl'            => defined( 'MODULA_PRO_STORE_UPGRADE_URL' ) ? MODULA_PRO_STORE_UPGRADE_URL : 'https://wp-modula.com/pricing',
					// The gallery editor's source: the license card's state, renewal grace included.
					'licenseState'          => class_exists( 'Modula_License_Card' ) ? \Modula_License_Card::current_state() : 'none',
					'proOnlyGalleryTypes'   => array(),
					'standaloneUpsellUrl'   => 'https://wp-modula.com/pricing/?utm_source=modula-lite&utm_medium=listing&utm_campaign=modula-standalone&utm_content=v3',
					'extensionsAdminUrl'    => admin_url( 'edit.php?post_type=modula-gallery&page=modula-addons' ),
					'presetsUrl'            => $presets['url'],
					'presetsCount'          => $presets['count'],
					'licensesUrl'           => $licenses['url'],
					'licensesCount'         => $licenses['count'],
					'sectionImagesUrl'      => MODULA_URL . 'assets/images/admin/content-sections/',
				)
			)
		);

		\Modula_Admin_Assets::add_notifications_icon( 'modula-gallery-listing', 'modulaContentPageNotifications' );

		do_action( 'modula_gallery_listing_enqueue' );
	}
}
