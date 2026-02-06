<?php

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 *
 * Acts as the main orchestrator, delegating responsibilities to specialized classes.
 *
 * @since      2.0.0
 */
class Modula {

	// =============================================================================
	// Properties
	// =============================================================================

	/**
	 * Dependency loader instance.
	 *
	 * @var Modula_Dependency_Loader
	 */
	private $dependency_loader;

	/**
	 * Service container instance.
	 *
	 * @var Modula_Service_Container
	 */
	private $services;

	/**
	 * Hook manager instance.
	 *
	 * @var Modula_Hook_Manager
	 */
	private $hook_manager;

	/**
	 * Feature initializer instance.
	 *
	 * @var Modula_Feature_Initializer
	 */
	private $feature_initializer;

	/**
	 * Internationalization instance.
	 *
	 * @var Modula_I18n
	 */
	private $i18n;

	/**
	 * Admin utilities instance.
	 *
	 * @var Modula_Admin_Utils
	 */
	private $admin_utils;

	// =============================================================================
	// Constructor & Initialization
	// =============================================================================

	/**
	 * Define the core functionality of the plugin.
	 *
	 * Load the dependencies, define the locale, and set the hooks for the admin area and
	 * the public-facing side of the site.
	 *
	 * @since    2.0.0
	 */
	public function __construct() {
		// Load core classes first
		$this->load_core_classes();

		// Initialize components
		$this->dependency_loader   = new Modula_Dependency_Loader();
		$this->services            = new Modula_Service_Container();
		$this->hook_manager        = new Modula_Hook_Manager();
		$this->feature_initializer = new Modula_Feature_Initializer();
		$this->i18n                = new Modula_I18n();
		$this->admin_utils         = new Modula_Admin_Utils();

		// Load all dependencies
		$this->dependency_loader->load_all();

		// Setup services
		$this->services->setup_services();

		// Register hooks
		$this->hook_manager->register_admin_hooks( $this->services, $this->admin_utils, $this->i18n );
		$this->hook_manager->register_public_hooks();
		$this->hook_manager->register_gallery_hooks( $this->services );
		$this->hook_manager->register_boot_hooks( $this );

		// Initialize features
		$this->feature_initializer->check_compatibility();
		$this->feature_initializer->init_telemetry();
	}

	/**
	 * Load core classes required for plugin initialization.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	private function load_core_classes(): void {
		require_once MODULA_PATH . 'includes/core/class-modula-dependency-loader.php';
		require_once MODULA_PATH . 'includes/core/class-modula-service-container.php';
		require_once MODULA_PATH . 'includes/core/class-modula-hook-manager.php';
		require_once MODULA_PATH . 'includes/core/class-modula-feature-initializer.php';
		require_once MODULA_PATH . 'includes/core/class-modula-i18n.php';
		require_once MODULA_PATH . 'includes/core/helpers/class-modula-admin-utils.php';
	}

	// =============================================================================
	// Public API Methods (Maintained for Backward Compatibility)
	// =============================================================================

	/**
	 * Initialize early hooks that need to run on plugins_loaded.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function start_early_hooks(): void {
		new Modula\Ai\Client();
		new Modula_Upsells();
	}

	/**
	 * Initialize Divi extension.
	 *
	 * Add Modula Gallery Divi block.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function initialize_divi_extension(): void {
		require_once MODULA_PATH . 'includes/features/third-party-builders/divi-extension/includes/DiviExtension.php';
	}

	/**
	 * Set up plugin locale and text domain.
	 *
	 * Delegates to Modula_I18n instance.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function set_locale(): void {
		$this->i18n->set_locale();
	}

	/**
	 * Initialize dashboard and register menu items.
	 *
	 * Delegates to Modula_Admin_Utils instance.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function dashboard_start(): void {
		$this->admin_utils->dashboard_start();
	}

	/**
	 * Register and load the widget.
	 *
	 * Delegates to Modula_Admin_Utils instance.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function modula_load_widget(): void {
		$this->admin_utils->load_widget();
	}

	/**
	 * Check if we are on the Modula admin page.
	 *
	 * Delegates to Modula_Admin_Utils instance.
	 *
	 * @since 2.11.0
	 * @return bool True if on a Modula admin page, false otherwise.
	 */
	public function is_modula_admin_page(): bool {
		return $this->admin_utils->is_modula_admin_page();
	}

	/**
	 * Prevent reorder of normal metaboxes.
	 *
	 * Delegates to Modula_Admin_Utils instance.
	 *
	 * @since 2.11.2
	 * @param array|false $order Metabox order array.
	 * @return array Metabox order array with enforced order.
	 */
	public function metabox_prevent_sorting( $order ): array {
		return $this->admin_utils->metabox_prevent_sorting( $order );
	}

	/**
	 * Prevent closing of normal metaboxes.
	 *
	 * Delegates to Modula_Admin_Utils instance.
	 *
	 * @since 2.11.2
	 * @param array|false $closed Array of closed metabox IDs.
	 * @return array Filtered array of closed metabox IDs.
	 */
	public function metabox_prevent_closing( $closed ): array {
		return $this->admin_utils->metabox_prevent_closing( $closed );
	}

	/**
	 * Check for compatibility issues.
	 *
	 * Delegates to Modula_Feature_Initializer instance.
	 *
	 * @since 2.11.0
	 * @return void
	 */
	public function compatibility_check(): void {
		$this->feature_initializer->check_compatibility();
	}
}
