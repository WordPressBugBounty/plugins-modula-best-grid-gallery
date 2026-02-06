<?php

/**
 * Dependency loader for Modula plugin.
 *
 * Responsible for loading all plugin dependencies organized by category.
 * Uses configuration-based loading for better maintainability.
 *
 * @since 2.0.0
 */
class Modula_Dependency_Loader {

	/**
	 * Dependency configuration.
	 *
	 * Maps dependency categories to their file paths (relative to includes/).
	 *
	 * @since 2.0.0
	 * @var array
	 */
	private $dependencies = array(
		'core'              => array(
			'libraries/class-modula-template-loader.php',
			'core/helpers/class-modula-helper.php',
			'admin/media/class-modula-image.php',
			'core/assets/class-modula-script-manager.php',
			'public/helpers/modula-helper-functions.php',
			'features/troubleshoot/class-modula-troubleshooting.php',
			'features/grid/class-modula-grid.php',
			'core/assets/class-modula-scripts.php',
		),
		'admin'             => array(
			'admin/cpt/class-modula-cpt.php',
			'admin/class-modula-upsells.php',
			'admin/class-modula-admin.php',
			'admin/notifications/class-modula-notifications.php',
			'admin/wpchill/class-wpchill-notifications.php',
			'admin/wpchill/class-wpchill-remote-upsells.php',
			'admin/wpchill/class-wpchill-about-us.php',
			'admin/listing/class-gallery-listing-output.php',
			'admin/rest-api/class-modula-rest-api.php',
			'admin/settings/class-modula-settings.php',
			'admin/assets/class-modula-admin-assets.php',
			'admin/media/class-modula-media.php',
			'admin/editor/class-modula-editor.php',
		),
		'public'            => array(
			'public/shortcode/class-modula-shortcode.php',
			'public/meta/class-modula-meta.php',
			'features/gutenberg/class-modula-gutenberg.php',
			'features/seo/class-modula-image-sitemaps.php',
		),
		'compatibility'     => array(
			'core/compatibility/class-modula-compatibility.php',
			'core/compatibility/class-modula-media-compat.php',
			'core/compatibility/class-modula-backward-compatibility.php',
			'core/compatibility/class-ai-compatibility.php',
		),
		'third_party'       => array(
			'features/third-party-builders/elementor/class-modula-elementor-check.php',
			'features/third-party-builders/modula-beaver-block/class-modula-beaver.php',
			'features/widget/class-modula-widget.php',
			'features/duplicator/class-modula-duplicator.php',
		),
		'features'          => array(
			'features/licensing/class-modula-licensing.php',
			'features/ai/class-client.php',
			'features/migrate/class-modula-migrator-detector.php',
			'features/migrate/class-modula-importer.php',
			'features/telemetry/wpchill-telemetry-loader.php',
			'features/telemetry/class-modula-telemetry-integration.php',
		),
		'admin_conditional' => array(
			'admin/importer/class-modula-readme-parser.php',
			'admin/importer/class-modula-importer-exporter.php',
			'libraries/class-modula-review.php',
			'uninstall/class-modula-uninstall.php',
			'features/migrate/class-modula-ajax-migrator.php',
			'admin/helpers/class-modula-admin-helpers.php',
			'admin/debug/class-modula-debug.php',
			'admin/onboarding/class-modula-onboarding.php',
			'admin/dashboard/class-modula-dashboard.php',
			'admin/helpers/class-modula-gallery-upload.php',
		),
	);

	/**
	 * Load all plugin dependencies.
	 *
	 * Organizes dependency loading into logical categories for better maintainability.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function load_all(): void {
		$this->load_core_dependencies();
		$this->load_admin_dependencies();
		$this->load_public_dependencies();
		$this->load_compatibility_dependencies();
		$this->load_third_party_dependencies();
		$this->load_feature_modules();

		if ( is_admin() ) {
			$this->load_conditional_admin_dependencies();
		}
	}

	/**
	 * Load core dependencies required for basic plugin functionality.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function load_core_dependencies(): void {
		$this->load_category( 'core' );
	}

	/**
	 * Load admin-specific dependencies.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function load_admin_dependencies(): void {
		$this->load_category( 'admin' );
	}

	/**
	 * Load public-facing dependencies.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function load_public_dependencies(): void {
		$this->load_category( 'public' );
	}

	/**
	 * Load compatibility dependencies for other plugins and themes.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function load_compatibility_dependencies(): void {
		$this->load_category( 'compatibility' );
	}

	/**
	 * Load third-party builder integrations.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function load_third_party_dependencies(): void {
		$this->load_category( 'third_party' );
	}

	/**
	 * Load feature modules (AI, licensing, telemetry, etc.).
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function load_feature_modules(): void {
		$this->load_category( 'features' );
	}

	/**
	 * Load admin-only dependencies that are conditionally required.
	 *
	 * These dependencies are only loaded when in the admin area.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function load_conditional_admin_dependencies(): void {
		$this->load_category( 'admin_conditional' );
	}

	/**
	 * Load dependencies for a specific category.
	 *
	 * @since 2.0.0
	 * @param string $category Category name from $dependencies array.
	 * @return void
	 */
	private function load_category( string $category ): void {
		if ( ! isset( $this->dependencies[ $category ] ) ) {
			return;
		}

		foreach ( $this->dependencies[ $category ] as $file ) {
			$this->load_file( $file );
		}
	}

	/**
	 * Load a single file.
	 *
	 * @since 2.0.0
	 * @param string $file Relative file path from includes/ directory.
	 * @return void
	 */
	private function load_file( string $file ): void {
		$full_path = MODULA_PATH . 'includes/' . $file;

		if ( file_exists( $full_path ) ) {
			require_once $full_path;
		} elseif ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// Log missing file in debug mode only.
			error_log( sprintf( 'Modula: Missing dependency file: %s', $full_path ) );
		}
	}

	/**
	 * Add dependency programmatically.
	 *
	 * Useful for extensions/addons to register additional dependencies.
	 *
	 * @since 2.0.0
	 * @param string $category Category name.
	 * @param string $file     File path relative to includes/.
	 * @return void
	 */
	public function add_dependency( string $category, string $file ): void {
		if ( ! isset( $this->dependencies[ $category ] ) ) {
			$this->dependencies[ $category ] = array();
		}

		$this->dependencies[ $category ][] = $file;
	}
}
