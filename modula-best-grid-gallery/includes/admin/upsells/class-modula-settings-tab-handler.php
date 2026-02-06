<?php
/**
 * Handles upsells for settings page tabs
 *
 * @since 2.13.0
 */
class Modula_Settings_Tab_Handler extends Modula_Upsell_Base {

	/**
	 * Constructor
	 */
	public function __construct() {
		parent::__construct();
		$this->register_settings_tabs();
	}

	/**
	 * Register all action hooks for settings tab upsells
	 */
	private function register_settings_tabs() {
		add_action( 'modula_admin_tab_imageseo', array( $this, 'imageseo_tab_upsell' ) );
		add_action( 'modula_admin_tab_compression', array( $this, 'render_speedup_tab' ) );
		add_action( 'modula_admin_tab_standalone', array( $this, 'render_albums_tab' ) );
		add_action( 'modula_admin_tab_shortcodes', array( $this, 'render_advanced_shortcodes_tab' ) );
		add_action( 'modula_admin_tab_watermark', array( $this, 'render_watermark_tab' ) );
		add_action( 'modula_admin_tab_roles', array( $this, 'render_roles_tab' ) );
		add_action( 'modula_admin_tab_whitelabel', array( $this, 'render_whitelabel_tab' ) );
		add_action( 'modula_admin_tab_video', array( $this, 'video_settings_tab_upsell' ) );
		add_action( 'modula_admin_tab_instagram', array( $this, 'instagram_settings_tab_upsell' ) );
	}

	/**
	 * Render Image SEO tab upsell
	 */
	public function imageseo_tab_upsell() {
		// This method is referenced but implementation is missing in original class.
		// Placeholder implementation - should be customized based on requirements.
		if ( ! $this->extensions->is_upgradable_addon( 'modula-ai' ) ) {
			return;
		}

		$config = $this->generate_upsell_config(
			esc_html__( 'Modula AI', 'modula-best-grid-gallery' ),
			esc_html__( 'Upgrade to Modula Premium to unlock AI-powered image SEO features.', 'modula-best-grid-gallery' ),
			apply_filters(
				'modula_settings_upsell_buttons',
				array(
					array(
						'href'    => esc_url( $this->free_vs_pro_link ),
						'label'   => esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ),
						'variant' => 'secondary',
					),
					array(
						'href'    => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=imageseo_tab&utm_campaign=modula-ai',
						'label'   => esc_html__( 'Get Premium!', 'modula-best-grid-gallery' ),
						'variant' => 'primary',
					),
				),
				'modula-ai'
			)
		);

		// Output or return config based on how the action is used
		// This may need adjustment based on actual usage
	}

	/**
	 * Render Speedup/Compression tab
	 */
	public function render_speedup_tab() {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-speedup' ) ) {
			return;
		}

		$config = $this->generate_upsell_config(
			esc_html__( 'Modula Performance', 'modula-best-grid-gallery' ),
			esc_html__( 'Upgrade to Modula Premium to unlock image compression and optimization features.', 'modula-best-grid-gallery' ),
			apply_filters(
				'modula_settings_upsell_buttons',
				array(
					array(
						'href'    => esc_url( $this->free_vs_pro_link ),
						'label'   => esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ),
						'variant' => 'secondary',
					),
					array(
						'href'    => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=compression_tab&utm_campaign=modula-speedup',
						'label'   => esc_html__( 'Get Premium!', 'modula-best-grid-gallery' ),
						'variant' => 'primary',
					),
				),
				'modula-speedup'
			)
		);

		// Output or return config based on how the action is used
	}

	/**
	 * Render Albums/Standalone tab
	 */
	public function render_albums_tab() {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-albums' ) ) {
			return;
		}

		$config = $this->generate_upsell_config(
			esc_html__( 'Modula Albums', 'modula-best-grid-gallery' ),
			esc_html__( 'Upgrade to Modula Premium to unlock standalone gallery pages and albums functionality.', 'modula-best-grid-gallery' ),
			apply_filters(
				'modula_settings_upsell_buttons',
				array(
					array(
						'href'    => esc_url( $this->free_vs_pro_link ),
						'label'   => esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ),
						'variant' => 'secondary',
					),
					array(
						'href'    => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=standalone_tab&utm_campaign=modula-albums',
						'label'   => esc_html__( 'Get Premium!', 'modula-best-grid-gallery' ),
						'variant' => 'primary',
					),
				),
				'modula-albums'
			)
		);

		// Output or return config based on how the action is used
	}

	/**
	 * Render Advanced Shortcodes tab
	 */
	public function render_advanced_shortcodes_tab() {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-advanced-shortcodes' ) ) {
			return;
		}

		$config = $this->generate_upsell_config(
			esc_html__( 'Advanced Shortcodes', 'modula-best-grid-gallery' ),
			esc_html__( 'Upgrade to Modula Premium to unlock advanced shortcode functionality.', 'modula-best-grid-gallery' ),
			apply_filters(
				'modula_settings_upsell_buttons',
				array(
					array(
						'href'    => esc_url( $this->free_vs_pro_link ),
						'label'   => esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ),
						'variant' => 'secondary',
					),
					array(
						'href'    => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=shortcodes_tab&utm_campaign=modula-advanced-shortcodes',
						'label'   => esc_html__( 'Get Premium!', 'modula-best-grid-gallery' ),
						'variant' => 'primary',
					),
				),
				'modula-advanced-shortcodes'
			)
		);

		// Output or return config based on how the action is used
	}

	/**
	 * Render Watermark tab
	 */
	public function render_watermark_tab() {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-watermark' ) ) {
			return;
		}

		$config = $this->generate_upsell_config(
			esc_html__( 'Modula Watermark', 'modula-best-grid-gallery' ),
			esc_html__( 'Upgrade to Modula Premium to unlock watermark functionality for your gallery images.', 'modula-best-grid-gallery' ),
			apply_filters(
				'modula_settings_upsell_buttons',
				array(
					array(
						'href'    => esc_url( $this->free_vs_pro_link ),
						'label'   => esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ),
						'variant' => 'secondary',
					),
					array(
						'href'    => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=watermark_tab&utm_campaign=modula-watermark',
						'label'   => esc_html__( 'Get Premium!', 'modula-best-grid-gallery' ),
						'variant' => 'primary',
					),
				),
				'modula-watermark'
			)
		);

		// Output or return config based on how the action is used
	}

	/**
	 * Render Roles tab
	 */
	public function render_roles_tab() {
		// This method uses roles_settings_tab_upsell logic from original class
		if ( ! $this->extensions->is_upgradable_addon( 'modula-roles' ) ) {
			$config = $this->generate_upsell_config(
				esc_html__( 'Modula Roles', 'modula-best-grid-gallery' ),
				esc_html__( 'Granular control over which user roles can add, edit or update galleries on your website. Add permissions to an existing user role or remove them by simply checking a checkbox.', 'modula-best-grid-gallery' ),
				apply_filters(
					'modula_settings_upsell_buttons',
					array(
						array(
							'href'    => esc_url( $this->free_vs_pro_link ),
							'label'   => esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ),
							'variant' => 'secondary',
						),
						array(
							'href'    => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=modula-instagram_tab_upsell-tab&utm_campaign=modula-roles',
							'label'   => esc_html__( 'Get Premium!', 'modula-best-grid-gallery' ),
							'variant' => 'primary',
						),
					),
					'modula-roles'
				)
			);
		} elseif ( ! class_exists( '\Modula_Pro\Extensions\Roles\Roles' ) && ! $this->extensions->is_upgradable_addon( 'modula-roles' ) ) {
			$config = $this->generate_upsell_config(
				esc_html__( 'Modula Roles', 'modula-best-grid-gallery' ),
				sprintf(
					/* translators: %1$s and %2$s are opening and closing anchor tags */
					esc_html__( 'In order to use Modula Roles addon you need to install it from %1$shere%2$s.', 'modula-best-grid-gallery' ),
					'<a href="' . esc_url( admin_url( 'edit.php?post_type=modula-gallery&page=modula-addons' ) ) . '" target="blank">',
					'</a>'
				)
			);
		}

		// Output or return config based on how the action is used
	}

	/**
	 * Render Whitelabel tab
	 */
	public function render_whitelabel_tab() {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-whitelabel' ) ) {
			return;
		}

		$config = $this->generate_upsell_config(
			esc_html__( 'Modula Whitelabel', 'modula-best-grid-gallery' ),
			esc_html__( 'Upgrade to Modula Premium to unlock whitelabel functionality.', 'modula-best-grid-gallery' ),
			apply_filters(
				'modula_settings_upsell_buttons',
				array(
					array(
						'href'    => esc_url( $this->free_vs_pro_link ),
						'label'   => esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ),
						'variant' => 'secondary',
					),
					array(
						'href'    => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=whitelabel_tab&utm_campaign=modula-whitelabel',
						'label'   => esc_html__( 'Get Premium!', 'modula-best-grid-gallery' ),
						'variant' => 'primary',
					),
				),
				'modula-whitelabel'
			)
		);

		// Output or return config based on how the action is used
	}

	/**
	 * Render Video settings tab upsell
	 */
	public function video_settings_tab_upsell() {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-video' ) ) {
			return;
		}

		$config = $this->generate_upsell_config(
			esc_html__( 'Modula Video', 'modula-best-grid-gallery' ),
			esc_html__( 'Upgrade to Modula Premium to unlock video gallery functionality with support for YouTube, Vimeo, and self-hosted videos.', 'modula-best-grid-gallery' ),
			apply_filters(
				'modula_settings_upsell_buttons',
				array(
					array(
						'href'    => esc_url( $this->free_vs_pro_link ),
						'label'   => esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ),
						'variant' => 'secondary',
					),
					array(
						'href'    => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=video_tab&utm_campaign=modula-video',
						'label'   => esc_html__( 'Get Premium!', 'modula-best-grid-gallery' ),
						'variant' => 'primary',
					),
				),
				'modula-video'
			)
		);

		// Output or return config based on how the action is used
	}

	/**
	 * Render Instagram settings tab upsell
	 */
	public function instagram_settings_tab_upsell() {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-instagram' ) ) {
			return;
		}

		$config = $this->generate_upsell_config(
			esc_html__( 'Modula Instagram', 'modula-best-grid-gallery' ),
			esc_html__( 'Upgrade to Modula Premium to unlock Instagram integration and display your Instagram feed in galleries.', 'modula-best-grid-gallery' ),
			apply_filters(
				'modula_settings_upsell_buttons',
				array(
					array(
						'href'    => esc_url( $this->free_vs_pro_link ),
						'label'   => esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ),
						'variant' => 'secondary',
					),
					array(
						'href'    => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=instagram_tab&utm_campaign=modula-instagram',
						'label'   => esc_html__( 'Get Premium!', 'modula-best-grid-gallery' ),
						'variant' => 'primary',
					),
				),
				'modula-instagram'
			)
		);

		// Output or return config based on how the action is used
	}
}
