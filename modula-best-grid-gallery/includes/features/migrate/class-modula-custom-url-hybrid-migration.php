<?php
/**
 * Opt-in migration: Fancybox galleries with Custom URLs → hybrid Image click.
 *
 * Shared by the admin notice (Fix links) and Settings → Diagnostics.
 *
 * @package Modula
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Modula_Custom_Url_Hybrid_Migration
 */
class Modula_Custom_Url_Hybrid_Migration {

	/**
	 * Notification option key (WPChill Notifications).
	 *
	 * @var string
	 */
	const NOTICE_KEY = 'modula-custom-url-hybrid-migrate';

	/**
	 * Transient cache for eligible gallery count.
	 *
	 * @var string
	 */
	const COUNT_CACHE_KEY = 'modula_custom_url_hybrid_eligible_count';

	/**
	 * Cache TTL for eligible count.
	 *
	 * @var int
	 */
	const COUNT_CACHE_TTL = HOUR_IN_SECONDS;

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	const REST_NAMESPACE = 'modula-best-grid-gallery/v1';

	/**
	 * Singleton.
	 *
	 * @var Modula_Custom_Url_Hybrid_Migration|null
	 */
	private static $instance = null;

	/**
	 * @return Modula_Custom_Url_Hybrid_Migration
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		// Settings tabs load over REST where is_admin() is false — keep this filter always on.
		add_filter( 'modula_diagnostics_settings_tab', array( $this, 'filter_diagnostics_tab' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );

		if ( is_admin() ) {
			add_action( 'admin_init', array( $this, 'maybe_add_notice' ), 25 );
			add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_notice_script' ), 22 );
		}
	}

	/**
	 * Capability gate for migrate / Diagnostics actions.
	 *
	 * @return bool
	 */
	public static function permissions_check() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public function register_rest_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/custom-url-hybrid-migrate',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'rest_migrate' ),
				'permission_callback' => array( __CLASS__, 'permissions_check' ),
			)
		);
	}

	/**
	 * REST: run migration for all eligible galleries.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public function rest_migrate() {
		if ( ! self::permissions_check() ) {
			return new WP_Error(
				'modula_custom_url_hybrid_forbidden',
				__( 'Sorry, you are not allowed to migrate gallery Image click settings.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		$result = $this->migrate_all_eligible();

		// Clear the notice option only (not a permanent block). Dismiss alone permanently hides.
		if ( class_exists( 'WPChill_Notifications' ) ) {
			WPChill_Notifications::remove_notification( self::NOTICE_KEY );
		}

		return new WP_REST_Response(
			array(
				'ok'        => true,
				'migrated'  => $result['migrated'],
				'skipped'   => $result['skipped'],
				'eligible'  => $result['eligible'],
				'remaining' => $this->count_eligible_galleries( true ),
			),
			200
		);
	}

	/**
	 * Count galleries eligible for hybrid migration.
	 *
	 * @param bool $bust_cache When true, recompute and refresh cache.
	 * @return int
	 */
	public function count_eligible_galleries( $bust_cache = false ) {
		if ( ! $bust_cache ) {
			$cached = get_transient( self::COUNT_CACHE_KEY );
			if ( false !== $cached && is_numeric( $cached ) ) {
				return (int) $cached;
			}
		}

		$count = count( $this->get_eligible_gallery_ids() );
		set_transient( self::COUNT_CACHE_KEY, $count, self::COUNT_CACHE_TTL );

		return $count;
	}

	/**
	 * Gallery post IDs that are eligible.
	 *
	 * @return int[]
	 */
	public function get_eligible_gallery_ids() {
		$ids = get_posts(
			array(
				'post_type'              => 'modula-gallery',
				'post_status'            => array( 'publish', 'draft', 'private', 'pending', 'future' ),
				'posts_per_page'         => -1,
				'fields'                 => 'ids',
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
				// Classic galleries keep the familiar Fancybox + Custom URL redirect; migrate Beta only.
				'meta_query'             => array(
					array(
						'key'   => '_modula_beta',
						'value' => '1',
					),
				),
			)
		);

		if ( ! is_array( $ids ) || empty( $ids ) ) {
			return array();
		}

		$eligible = array();
		foreach ( $ids as $post_id ) {
			$post_id = absint( $post_id );
			if ( $post_id && $this->gallery_is_eligible( $post_id ) ) {
				$eligible[] = $post_id;
			}
		}

		return $eligible;
	}

	/**
	 * Whether a gallery post is eligible.
	 *
	 * @param int $post_id Gallery ID.
	 * @return bool
	 */
	public function gallery_is_eligible( $post_id ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || 'modula-gallery' !== get_post_type( $post_id ) ) {
			return false;
		}

		$is_beta = class_exists( '\Modula\V2\Beta_Settings' )
			&& \Modula\V2\Beta_Settings::is_beta_gallery( $post_id );
		if ( ! $is_beta ) {
			return false;
		}

		$settings = get_post_meta( $post_id, 'modula-settings', true );
		$images   = get_post_meta( $post_id, 'modula-images', true );

		return modula_custom_url_hybrid_gallery_is_eligible( $settings, $images, true );
	}

	/**
	 * Apply hybrid Image click to one gallery when eligible.
	 *
	 * @param int $post_id Gallery ID.
	 * @return bool True when settings were written.
	 */
	public function apply_to_gallery( $post_id ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || 'modula-gallery' !== get_post_type( $post_id ) ) {
			return false;
		}

		if ( ! $this->gallery_is_eligible( $post_id ) ) {
			return false;
		}

		$settings = get_post_meta( $post_id, 'modula-settings', true );

		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		$settings = modula_custom_url_hybrid_apply_flat_settings( $settings );
		update_post_meta( $post_id, 'modula-settings', $settings );
		$this->sync_v2_lightbox_if_present( $post_id );

		return true;
	}

	/**
	 * Migrate every currently eligible gallery.
	 *
	 * @return array{eligible:int,migrated:int,skipped:int}
	 */
	public function migrate_all_eligible() {
		$ids      = $this->get_eligible_gallery_ids();
		$migrated = 0;
		$skipped  = 0;

		foreach ( $ids as $post_id ) {
			if ( $this->apply_to_gallery( $post_id ) ) {
				++$migrated;
			} else {
				++$skipped;
			}
		}

		delete_transient( self::COUNT_CACHE_KEY );

		return array(
			'eligible' => count( $ids ),
			'migrated' => $migrated,
			'skipped'  => $skipped,
		);
	}

	/**
	 * When modula_settings_v2 exists, set lightbox.lightbox to hybrid.
	 *
	 * Flat update normally triggers Meta_Sync; this keeps v2 aligned when that
	 * path does not run, and is a no-op when v2 meta is absent.
	 *
	 * @param int $post_id Gallery ID.
	 * @return void
	 */
	private function sync_v2_lightbox_if_present( $post_id ) {
		$raw = get_post_meta( $post_id, 'modula_settings_v2', true );
		if ( '' === $raw || false === $raw || null === $raw ) {
			return;
		}

		if ( is_string( $raw ) ) {
			$v2 = json_decode( $raw, true );
		} elseif ( is_array( $raw ) ) {
			$v2 = $raw;
		} else {
			return;
		}

		if ( ! is_array( $v2 ) || empty( $v2 ) ) {
			return;
		}

		if ( ! isset( $v2['lightbox'] ) || ! is_array( $v2['lightbox'] ) ) {
			$v2['lightbox'] = array();
		}
		$v2['lightbox']['lightbox'] = 'lightbox-prefer-url';

		$json = wp_json_encode( $v2, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		update_post_meta( $post_id, 'modula_settings_v2', false !== $json ? $json : $raw );
	}

	/**
	 * Permanently block and remove the admin notice.
	 *
	 * @return void
	 */
	public function dismiss_notice_permanently() {
		if ( class_exists( 'WPChill_Notifications' ) ) {
			WPChill_Notifications::get_instance()->clear_notification( self::NOTICE_KEY, true );
		}
	}

	/**
	 * Show notice when eligible galleries exist and notice is not permanently dismissed.
	 *
	 * @return void
	 */
	public function maybe_add_notice() {
		if ( ! $this->is_modula_admin_request() ) {
			return;
		}

		if ( ! self::permissions_check() ) {
			return;
		}

		if ( ! class_exists( 'Modula_Notifications' ) ) {
			return;
		}

		$count = $this->count_eligible_galleries( true );
		if ( $count < 1 ) {
			if ( class_exists( 'WPChill_Notifications' ) ) {
				WPChill_Notifications::remove_notification( self::NOTICE_KEY );
			}
			return;
		}

		/* translators: %d: number of Beta galleries */
		$message = sprintf(
			_n(
				'%d Beta gallery still uses Open in lightbox with Custom URLs, so those tiles may open the lightbox instead of navigating. Fix links switches them to “Lightbox, or link when set” (hybrid). Classic galleries are left on their familiar Fancybox + Custom URL redirect.',
				'%d Beta galleries still use Open in lightbox with Custom URLs, so those tiles may open the lightbox instead of navigating. Fix links switches them to “Lightbox, or link when set” (hybrid). Classic galleries are left on their familiar Fancybox + Custom URL redirect.',
				$count,
				'modula-best-grid-gallery'
			),
			$count
		);

		$notice = array(
			'title'       => __( 'Custom URL tile links after Modula 3.0', 'modula-best-grid-gallery' ),
			'message'     => $message,
			'status'      => 'warning',
			'dismissible' => false,
			'source'      => array(
				'slug' => 'modula',
				'name' => 'Modula',
			),
			'actions'     => array(
				array(
					'label'    => __( 'Fix links', 'modula-best-grid-gallery' ),
					'callback' => 'modulaCustomUrlHybridFixLinks',
					'variant'  => 'primary',
				),
				array(
					'label'     => __( 'Dismiss', 'modula-best-grid-gallery' ),
					'dismiss'   => true,
					'permanent' => true,
				),
			),
		);

		Modula_Notifications::add_notification( self::NOTICE_KEY, $notice );
	}

	/**
	 * Enqueue Fix links callback for the notification action.
	 *
	 * @return void
	 */
	public function enqueue_notice_script() {
		if ( ! self::permissions_check() ) {
			return;
		}

		$screen = get_current_screen();
		if ( ! $screen ) {
			return;
		}

		$allowed    = array( 'modula-gallery', 'modula-albums', 'dlm_download', 'wpm-testimonial' );
		$allowed    = apply_filters( 'wpchill_notifications_allowed_screens', $allowed );
		$is_allowed = false;
		foreach ( $allowed as $s ) {
			if ( false !== strpos( $screen->id, $s ) ) {
				$is_allowed = true;
				break;
			}
		}
		if ( ! $is_allowed ) {
			return;
		}

		$inline = "window.modulaCustomUrlHybridFixLinks=function(action,id){if(!window.wp||!wp.apiFetch){return;}wp.apiFetch({path:'/modula-best-grid-gallery/v1/custom-url-hybrid-migrate',method:'POST',data:{}}).then(function(){window.location.reload();}).catch(function(){});};";

		wp_register_script( 'modula-custom-url-hybrid-notice', false, array( 'wp-api-fetch' ), MODULA_LITE_VERSION, true );
		wp_enqueue_script( 'modula-custom-url-hybrid-notice' );
		wp_add_inline_script( 'modula-custom-url-hybrid-notice', $inline );
	}

	/**
	 * Prepend Custom URL hybrid migration controls to Diagnostics.
	 *
	 * @param array $config Diagnostics tab config.
	 * @return array
	 */
	public function filter_diagnostics_tab( $config ) {
		if ( ! is_array( $config ) ) {
			$config = array();
		}

		$count  = $this->count_eligible_galleries( true );
		$fields = isset( $config['fields'] ) && is_array( $config['fields'] ) ? $config['fields'] : array();

		/* translators: %d: number of Beta galleries */
		$status_text = sprintf(
			_n(
				'%d Beta gallery is Fancybox-first with at least one Custom URL and can be switched to “Lightbox, or link when set”.',
				'%d Beta galleries are Fancybox-first with at least one Custom URL and can be switched to “Lightbox, or link when set”.',
				$count,
				'modula-best-grid-gallery'
			),
			$count
		);

		$hybrid_fields = array(
			array(
				'type'        => 'paragraph',
				'name'        => 'modula_custom_url_hybrid_intro',
				'label'       => esc_html__( 'Custom URL tile links', 'modula-best-grid-gallery' ),
				'description' => esc_html__( 'Beta galleries that still use Open in lightbox with Custom URLs can lose clickable tile links after Modula 3.0. This tool sets Image click behavior to “Lightbox, or link when set” (hybrid) for those Beta galleries only. Classic galleries keep the familiar Fancybox + Custom URL tile redirect and are not changed. It does not run automatically on upgrade.', 'modula-best-grid-gallery' ),
			),
			array(
				'type'        => 'paragraph',
				'name'        => 'modula_custom_url_hybrid_status',
				'label'       => esc_html__( 'Eligible galleries', 'modula-best-grid-gallery' ),
				'description' => esc_html( $status_text ),
			),
			array(
				'type'           => 'button',
				'text'           => esc_html__( 'Fix Custom URL links', 'modula-best-grid-gallery' ),
				'loadingText'    => esc_html__( 'Fixing…', 'modula-best-grid-gallery' ),
				'successMessage' => esc_html__( 'Eligible galleries updated to hybrid Image click.', 'modula-best-grid-gallery' ),
				'errorMessage'   => esc_html__( 'Could not migrate Custom URL galleries.', 'modula-best-grid-gallery' ),
				'variant'        => 'secondary',
				'disabled'       => $count < 1,
				'reload'         => true,
				'api'            => array(
					'path'   => '/modula-best-grid-gallery/v1/custom-url-hybrid-migrate',
					'method' => 'POST',
					'data'   => array(),
				),
			),
		);

		$config['fields'] = array_merge( $hybrid_fields, $fields );

		return $config;
	}

	/**
	 * Whether this is a Modula admin screen where the notice should be considered.
	 *
	 * @return bool
	 */
	private function is_modula_admin_request() {
		if ( ! is_admin() ) {
			return false;
		}

		if ( wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return false;
		}

		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$page      = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( 'modula-gallery' === $post_type ) {
			return true;
		}

		if ( in_array( $page, array( 'modula', 'modula-addons', 'wpchill-dashboard' ), true ) ) {
			return true;
		}

		return false;
	}
}

Modula_Custom_Url_Hybrid_Migration::get_instance();
