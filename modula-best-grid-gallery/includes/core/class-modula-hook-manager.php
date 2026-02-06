<?php

/**
 * Hook manager for Modula plugin.
 *
 * Responsible for registering all WordPress hooks (actions and filters).
 *
 * @since 2.0.0
 */
class Modula_Hook_Manager {

	/**
	 * Register admin-specific hooks.
	 *
	 * @since 2.0.0
	 * @param Modula_Service_Container $services Service container instance.
	 * @param Modula_Admin_Utils       $admin_utils Admin utilities instance.
	 * @param Modula_I18n             $i18n Internationalization instance.
	 * @return void
	 */
	public function register_admin_hooks( Modula_Service_Container $services, Modula_Admin_Utils $admin_utils, Modula_I18n $i18n ): void {
		$admin_assets = $services->get_admin_assets();
		$editor       = $services->get_editor();
		add_action( 'admin_head', array( $admin_assets, 'output_wp_css_variables' ), 5 );
		add_action( 'admin_enqueue_scripts', array( $admin_assets, 'admin_scripts' ), 20 );
		add_action( 'admin_enqueue_scripts', array( $admin_assets, 'general_settings_page_scripts' ) );
		add_action( 'admin_enqueue_scripts', array( $admin_assets, 'extensions_scripts' ) );
		add_action( 'admin_enqueue_scripts', array( $admin_assets, 'insights_scripts' ) );

		add_action( 'admin_menu', array( $admin_utils, 'dashboard_start' ), 20 );

		add_action( 'init', array( $i18n, 'set_locale' ) );

		// SiteOrigin Widget
		add_action( 'widgets_init', array( $admin_utils, 'load_widget' ) );

		// Classic editor button for Modula Gallery
		add_filter( 'mce_buttons', array( $editor, 'editor_button' ) );
		add_filter( 'mce_external_plugins', array( $editor, 'register_editor_plugin' ) );
		add_action( 'wp_ajax_modula_shortcode_editor', array( $editor, 'modula_shortcode_editor' ) );
		add_action( 'admin_print_scripts', array( $editor, 'add_editor_nonce' ) );

		// Initiate modula cpts
		new Modula_CPT();

		if ( get_option( 'use_modula_ai', 0 ) ) {
			new Modula\Gallery_Listing_Output();
		}
	}

	/**
	 * Register public-facing hooks.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function register_public_hooks(): void {
		new Modula_Rest_Api();
		new Modula_Image_Sitemaps();
	}

	/**
	 * Register gallery-specific hooks.
	 *
	 * Media helpers reused both in admin and frontend.
	 * Gallery 'srcset' management.
	 *
	 * @since 2.0.0
	 * @param Modula_Service_Container $services Service container instance.
	 * @return void
	 */
	public function register_gallery_hooks( Modula_Service_Container $services ): void {
		$media = $services->get_media();

		add_action( 'modula_before_gallery', array( $media, 'disable_wp_srcset' ) );
		add_action( 'modula_after_gallery', array( $media, 'enable_wp_srcset' ) );

		add_action( 'admin_enqueue_scripts', array( $media, 'modula_enqueue_media' ) );
		add_action( 'wp_enqueue_media', array( $media, 'modula_enqueue_media' ) );
	}

	/**
	 * Register hooks needed early in the WP lifecycle.
	 *
	 * @since 2.0.0
	 * @param Modula $modula Main Modula instance.
	 * @return void
	 */
	public function register_boot_hooks( Modula $modula ): void {
		add_action( 'divi_extensions_init', array( $modula, 'initialize_divi_extension' ) );
		add_action( 'plugins_loaded', array( $modula, 'start_early_hooks' ) );
	}
}
