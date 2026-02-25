<?php

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Detects third-party gallery data to determine if a Modula migrator plugin is needed.
 *
 * @since 2.2.7
 */
class Modula_Migrator_Detector {

	/**
	 * Holds the class object.
	 *
	 * @since 2.2.7
	 * @var Modula_Migrator_Detector
	 */
	public static $instance;

	/**
	 * Whitelist of Modula migrator plugin slugs (WordPress.org) and their plugin file paths.
	 *
	 * @since 2.2.7
	 * @var array
	 */
	private static $migrator_whitelist = array(
		'modula-envira-migrator'              => 'modula-envira-migrator/modula-envira-migrator.php',
		'modula-final-tiles-migrator'         => 'modula-final-tiles-migrator/modula-final-tiles-migrator.php',
		'modula-foo-migrator'                 => 'modula-foo-migrator/migrate-away-from-foogallery.php',
		'modula-nextgen-migrator'             => 'modula-nextgen-migrator/modula-nextgen-migrator.php',
		'modula-photoblocks-gallery-migrator' => 'modula-photoblocks-gallery-migrator/modula-photoblocks-gallery-migrator.php',
	);

	/**
	 * Map of migrator slug to source key and label for detection.
	 *
	 * @since 2.2.7
	 * @var array
	 */
	private static $source_map = array(
		'modula-envira-migrator'              => array(
			'label' => 'Envira Gallery',
		),
		'modula-final-tiles-migrator'         => array(
			'label' => 'Final Tiles Gallery',
		),
		'modula-foo-migrator'                 => array(
			'label' => 'FooGallery',
		),
		'modula-nextgen-migrator'             => array(
			'label' => 'NextGEN Gallery',
		),
		'modula-photoblocks-gallery-migrator' => array(
			'label' => 'Photoblocks Gallery',
		),
	);

	/**
	 * Cache key for computed migrator needs.
	 *
	 * @since 2.15.0
	 * @var string
	 */
	private static $needed_migrators_cache_key = 'modula_needed_migrators';

	/**
	 * Cache TTL for computed migrator needs.
	 *
	 * @since 2.15.0
	 * @var int
	 */
	private static $needed_migrators_cache_ttl = DAY_IN_SECONDS;

	/**
	 * Constructor. Registers filter and admin hook for migrator notification.
	 *
	 * @since 2.2.7
	 */
	public function __construct() {
		if ( is_admin() ) {
			add_action( 'admin_init', array( $this, 'maybe_add_migrator_notification' ), 20 );
			add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_migrator_notification_script' ), 21 );

			// Invalidate cached detection when plugins change.
			add_action( 'activated_plugin', array( $this, 'invalidate_needed_migrators_cache' ) );
			add_action( 'deactivated_plugin', array( $this, 'invalidate_needed_migrators_cache' ) );
		}
	}

	/**
	 * Get the instance.
	 *
	 * @since 2.2.7
	 * @return Modula_Migrator_Detector
	 */
	public static function get_instance() {
		if ( ! isset( self::$instance ) || ! ( self::$instance instanceof Modula_Migrator_Detector ) ) {
			self::$instance = new Modula_Migrator_Detector();
		}
		return self::$instance;
	}

	/**
	 * Get whitelist of allowed migrator slugs (for install) and plugin paths (for activate/deactivate).
	 *
	 * @since 2.2.7
	 * @return array{ slugs: string[], paths: string[] }
	 */
	public static function get_whitelist() {
		return array(
			'slugs' => array_keys( self::$migrator_whitelist ),
			'paths' => array_values( self::$migrator_whitelist ),
		);
	}

	/**
	 * Check if a plugin slug is in the migrator whitelist.
	 *
	 * @since 2.2.7
	 * @param string $slug WordPress.org plugin slug.
	 * @return bool
	 */
	public static function is_allowed_slug( $slug ) {
		return isset( self::$migrator_whitelist[ $slug ] );
	}

	/**
	 * Check if a plugin path is in the migrator whitelist.
	 *
	 * @since 2.2.7
	 * @param string $path Plugin file path relative to wp-content/plugins.
	 * @return bool
	 */
	public static function is_allowed_path( $path ) {
		return in_array( $path, self::$migrator_whitelist, true );
	}

	/**
	 * Get plugin path for a migrator slug.
	 *
	 * @since 2.2.7
	 * @param string $slug WordPress.org plugin slug.
	 * @return string|null Plugin path or null if not in whitelist.
	 */
	public static function get_plugin_path( $slug ) {
		return isset( self::$migrator_whitelist[ $slug ] ) ? self::$migrator_whitelist[ $slug ] : null;
	}

	/**
	 * Get list of migrators that are needed (site has galleries from that source).
	 *
	 * @since 2.2.7
	 * @return array Migrator slug => array( 'count' => int, 'label' => string )
	 */
	public function get_needed_migrators() {
		$needed = array();

		// Envira: post type 'envira'.
		$envira_count = $this->count_posts_by_type( 'envira' );
		if ( $envira_count > 0 ) {
			$needed['modula-envira-migrator'] = array(
				'count' => $envira_count,
				'label' => self::$source_map['modula-envira-migrator']['label'],
			);
		}

		// FooGallery: post type 'foogallery'.
		$foo_count = $this->count_posts_by_type( 'foogallery' );
		if ( $foo_count > 0 ) {
			$needed['modula-foo-migrator'] = array(
				'count' => $foo_count,
				'label' => self::$source_map['modula-foo-migrator']['label'],
			);
		}

		// NextGEN: table wp_ngg_gallery.
		$nextgen_count = $this->count_nextgen_galleries();
		if ( $nextgen_count > 0 ) {
			$needed['modula-nextgen-migrator'] = array(
				'count' => $nextgen_count,
				'label' => self::$source_map['modula-nextgen-migrator']['label'],
			);
		}

		// Final Tiles: post type 'finaltilesgallery' (common for Final Tiles Grid Gallery).
		$final_tiles_count = $this->count_posts_by_type( 'finaltilesgallery' );
		if ( $final_tiles_count > 0 ) {
			$needed['modula-final-tiles-migrator'] = array(
				'count' => $final_tiles_count,
				'label' => self::$source_map['modula-final-tiles-migrator']['label'],
			);
		}

		// Photoblocks: check for shortcode usage in post content (Gallery PhotoBlocks uses shortcodes).
		$photoblocks_count = $this->count_photoblocks_galleries();
		if ( $photoblocks_count > 0 ) {
			$needed['modula-photoblocks-gallery-migrator'] = array(
				'count' => $photoblocks_count,
				'label' => self::$source_map['modula-photoblocks-gallery-migrator']['label'],
			);
		}

		return $needed;
	}

	/**
	 * Count published posts for a post type.
	 *
	 * @since 2.2.7
	 * @param string $post_type Post type name.
	 * @return int
	 */
	private function count_posts_by_type( $post_type ) {
		if ( ! post_type_exists( $post_type ) ) {
			return 0;
		}
		$count = wp_count_posts( $post_type );
		return isset( $count->publish ) ? (int) $count->publish : 0;
	}

	/**
	 * Count NextGEN galleries (table ngg_gallery).
	 *
	 * @since 2.2.7
	 * @return int
	 */
	private function count_nextgen_galleries() {
		global $wpdb;
		$table = $wpdb->prefix . 'ngg_gallery';
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$exists = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) );
		if ( $exists !== $table ) {
			return 0;
		}
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$result = $wpdb->get_var( "SELECT COUNT(*) FROM `{$table}`" );
		return null !== $result ? (int) $result : 0;
	}

	/**
	 * Count Photoblocks galleries (shortcode in post content or option-based).
	 *
	 * @since 2.2.7
	 * @return int
	 */
	private function count_photoblocks_galleries() {
		global $wpdb;
		// Gallery PhotoBlocks often uses [photoblocks id=N] or similar shortcode.
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$count = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(DISTINCT ID) FROM {$wpdb->posts} WHERE post_status IN ('publish','draft') AND (post_content LIKE %s OR post_content LIKE %s)",
				'%[photoblocks %',
				'%[gallery photoblocks%'
			)
		);
		if ( $count !== null && (int) $count > 0 ) {
			return (int) $count;
		}
		// Fallback: check for option-based gallery list if plugin stores IDs in option.
		$option = get_option( 'photoblocks_galleries', array() );
		if ( is_array( $option ) && ! empty( $option ) ) {
			return count( $option );
		}
		return 0;
	}

	/**
	 * Invalidate the migrator detection cache.
	 *
	 * @since 2.15.0
	 * @return void
	 */
	public function invalidate_needed_migrators_cache() {
		delete_transient( self::$needed_migrators_cache_key );
	}

	/**
	 * Determine if current request is a Modula admin request where notification checks are relevant.
	 *
	 * @since 2.15.0
	 * @return bool
	 */
	private function is_modula_admin_request() {
		if ( ! is_admin() ) {
			return false;
		}

		if ( wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return false;
		}

		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : '';
		$page      = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';

		if ( 'modula-gallery' === $post_type ) {
			return true;
		}

		if ( in_array( $page, array( 'modula', 'modula-addons', 'wpchill-dashboard' ), true ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Get cached needed migrators and refresh cache when missing.
	 *
	 * @since 2.15.0
	 * @return array
	 */
	private function get_cached_needed_migrators() {
		$needed = get_transient( self::$needed_migrators_cache_key );

		if ( false !== $needed && is_array( $needed ) ) {
			return $needed;
		}

		$needed = $this->get_needed_migrators();
		set_transient( self::$needed_migrators_cache_key, $needed, self::$needed_migrators_cache_ttl );

		return $needed;
	}

	/**
	 * Add a notification when migrator need is detected and at least one migrator is not active.
	 *
	 * @since 2.2.7
	 * @return void
	 */
	public function maybe_add_migrator_notification() {
		if ( ! $this->is_modula_admin_request() ) {
			return;
		}

		if ( ! current_user_can( 'install_plugins' ) ) {
			return;
		}
		if ( ! class_exists( 'Modula_Notifications' ) ) {
			return;
		}
		$needed = $this->get_cached_needed_migrators();
		if ( empty( $needed ) ) {
			return;
		}
		// Check if at least one needed migrator is not active.
		$first_slug   = null;
		$has_inactive = false;
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$first_label = null;
		$first_count = 0;

		foreach ( $needed as $slug => $data ) {
			$path = self::get_plugin_path( $slug );
			if ( $path && ! is_plugin_active( $path ) ) {
				$has_inactive = true;
				if ( $first_slug === null ) {
					$first_slug  = $slug;
					$first_label = $data['label'];
					$first_count = $data['count'];
				}
			}
		}
		if ( ! $has_inactive || null === $first_slug ) {
			if ( class_exists( 'WPChill_Notifications' ) ) {
				WPChill_Notifications::remove_notification( 'modula-migrator-galleries-found' );
			}
			return;
		}
		$migrate_url = admin_url( 'edit.php?post_type=modula-gallery&page=modula&tab=migrate' );
		$parts       = array();
		foreach ( $needed as $slug => $data ) {
			$parts[] = sprintf(
				/* translators: 1: count, 2: source label */
				_n( '%2$s (%1$d gallery)', '%2$s (%1$d galleries)', $data['count'], 'modula-best-grid-gallery' ),
				$data['count'],
				$data['label']
			);
		}
		$message = sprintf(
			/* translators: %s: list of source (count) e.g. Envira Gallery (5), FooGallery (3) */
			__( 'You have galleries from %s. Install the Modula migrator to import them into Modula.', 'modula-best-grid-gallery' ),
			implode( ', ', $parts )
		);
		$install_status = null;
		if ( function_exists( 'get_plugins' ) ) {
			$all_plugins    = get_plugins();
			$path           = self::get_plugin_path( $first_slug );
			$install_status = ( $path && isset( $all_plugins[ $path ] ) ) ? 'activate' : 'install';
		}
		$action_label = 'install' === $install_status
			? __( 'Install & go to Migrate', 'modula-best-grid-gallery' )
			: __( 'Activate & go to Migrate', 'modula-best-grid-gallery' );
		$notice       = array(
			'title'   => __( 'Galleries from another plugin detected', 'modula-best-grid-gallery' ),
			'message' => $message,
			'status'  => 'info',
			'source'  => array(
				'slug' => 'modula',
				'name' => 'Modula',
			),
			'actions' => array(
				array(
					'label'    => $action_label,
					'callback' => 'modulaMigratorInstallActivateAndRedirect',
					'data'     => array(
						'slug'        => $first_slug,
						'migrate_url' => $migrate_url,
					),
				),
			),
		);
		Modula_Notifications::add_notification( 'modula-migrator-galleries-found', $notice );
	}

	/**
	 * Enqueue script that exposes modulaMigratorInstallActivateAndRedirect on window (for notification action).
	 *
	 * @since 2.2.7
	 * @return void
	 */
	public function enqueue_migrator_notification_script() {
		$screen = get_current_screen();
		if ( ! $screen ) {
			return;
		}
		$allowed    = array( 'modula-gallery', 'modula-albums', 'dlm_download', 'wpm-testimonial' );
		$allowed    = apply_filters( 'wpchill_notifications_allowed_screens', $allowed );
		$is_allowed = false;
		foreach ( $allowed as $s ) {
			if ( strpos( $screen->id, $s ) !== false ) {
				$is_allowed = true;
				break;
			}
		}
		if ( ! $is_allowed || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$migrate_url = admin_url( 'edit.php?post_type=modula-gallery&page=modula&tab=migrate' );
		$inline      = sprintf(
			"window.modulaMigratorInstallActivateAndRedirect=function(action,id){var d=action.data||{};var slug=d.slug;var url=d.migrate_url||%s;if(!slug)return;wp.apiFetch({path:'/modula-best-grid-gallery/v1/migrator/install',method:'POST',data:{plugin_slug:slug}}).then(function(r){if(r.success&&r.plugin_path){return wp.apiFetch({path:'/modula-best-grid-gallery/v1/migrator/activate',method:'POST',data:{plugin:r.plugin_path}});}return r;}).then(function(r){if(r&&r.success&&url){window.location.href=url;}});};",
			wp_json_encode( $migrate_url )
		);
		wp_register_script( 'modula-migrator-notification', false, array( 'wp-api-fetch' ), MODULA_LITE_VERSION, array() );
		wp_enqueue_script( 'modula-migrator-notification' );
		wp_add_inline_script( 'modula-migrator-notification', $inline );
	}
}
