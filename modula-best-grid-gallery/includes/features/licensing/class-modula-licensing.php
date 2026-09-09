<?php

/**
 * Class Modula_Licensing
 * Used to display the image licensing under each gallery.
 *
 * @since 2.7.5
 */
class Modula_Licensing {

	public $ld_json = array();

	/**
	 * Contructor
	 *
	 * @since 2.7.5
	 */
	public function __construct() {

		add_action( 'modula_after_gallery', array( $this, 'display_licensing_license' ) );
		add_action( 'modula_shortcode_after_item', array( $this, 'generate_licensing_ld_json' ), 10, 2 );
		add_action( 'modula_v2_shortcode_after_item', array( $this, 'generate_licensing_ld_json' ), 10, 2 );
		add_action( 'wp_footer', array( $this, 'display_licensing_ld_json' ), 10 );
	}

	/**
	 * Global image licensing option (author/company defaults).
	 *
	 * @return array<string, mixed>|false
	 */
	private function get_global_licensing_options() {
		$options = get_option( 'modula_image_licensing_option', false );
		if ( false === $options || ! is_array( $options ) ) {
			// Legacy typo key — read if present, do not write.
			$legacy = get_option( 'modula_image_licensing_option ', false );
			if ( is_array( $legacy ) ) {
				return $legacy;
			}
		}
		return is_array( $options ) ? $options : false;
	}


	/**
	 * Display the image licensing license under each gallery
	 *
	 * @param array $settings The gallery settings.
	 *
	 * @return void
	 * @since 2.7.5
	 */
	public function display_licensing_license( $settings ) {
		if ( class_exists( '\Modula\V2\Modern_Gallery' ) ) {
			$post_id = isset( $settings['gallery_id'] ) ? \Modula\V2\Modern_Gallery::gallery_post_id_from_flat( $settings ) : 0;
			if ( \Modula\V2\Modern_Gallery::is_modern_stack_enabled( $post_id ) ) {
				return;
			}
		}

		$image_attrib_options = $this->get_global_licensing_options();
		$html                 = apply_filters( 'modula_display_licensing_box', false, $image_attrib_options, $settings );

		if ( false === $html ) {
			if ( $image_attrib_options && isset( $image_attrib_options['display_with_description'] ) && $image_attrib_options['display_with_description'] && isset( $image_attrib_options['image_licensing'] ) && 'none' !== $image_attrib_options['image_licensing'] ) {
				$html = Modula_Helper::render_license_box( $image_attrib_options['image_licensing'] );
			}
		}
		if ( ! empty( $html ) ) {
			echo wp_kses_post( $html );
		}
	}

	/**
	 * Generate the image licensing ld+json
	 *
	 * @param array $settings The gallery settings.
	 * @param array $item     The gallery item.
	 *
	 * @return void
	 * @since 2.7.5
	 */
	public function generate_licensing_ld_json( $settings, $item ) {

		$image_attrib_options = $this->get_global_licensing_options();
		/**
		 * Hook used for adding custom image licensing ld+json
		 *
		 * @hook  modula_display_licensing_json
		 * @since 2.7.5
		 */
		$json = apply_filters( 'modula_display_licensing_json', false, $image_attrib_options, $settings, $item );

		if ( ! $json ) {
			if ( $image_attrib_options && isset( $image_attrib_options['image_licensing'] ) && 'none' !== $image_attrib_options['image_licensing'] ) {
				$json = Modula_Helper::render_ia_item_ld_json( $image_attrib_options, $item['img_attributes']['data-full'] );
			}
		}

		// Check and see if the $json is not empty. If filter not used and "none" is selected for $image_attrib_options['image_licensing'] then $json will be empty.
		if ( ! empty( $json ) ) {
			$this->ld_json[] = $json;
		}
	}

	/**
	 * Display the image licensing ld+json in the footer.
	 *
	 * Output is hooked to wp_footer so the script is printed in the page footer.
	 *
	 * @return void
	 * @since 2.7.5
	 */
	public function display_licensing_ld_json() {

		if ( empty( $this->ld_json ) ) {
			return;
		}
		$json = wp_json_encode( $this->ld_json, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES );
		if ( false === $json ) {
			return;
		}
		printf(
			"<script type=\"application/ld+json\">\n%s\n</script>\n",
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON-encoded data for ld+json script.
			$json
		);
	}
}

new Modula_Licensing();
