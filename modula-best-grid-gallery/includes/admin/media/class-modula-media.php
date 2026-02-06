<?php

/**
 * Handles media integrations for Modula admin.
 */
class Modula_Media {

	public function modula_enqueue_media() {

		if ( ! is_admin() || ! function_exists( 'get_current_screen' ) ) {
			return;
		}

		// Get the current screen object.
		$screen = get_current_screen();

		// Check if we are on the media upload page.
		if ( ! isset( $screen->base ) || ( 'upload' !== $screen->base && 'media_page_upload' !== $screen->base ) ) {
			return;
		}

		$args = array(
			'post_type'      => 'modula-gallery',
			'posts_per_page' => -1,
			'post_status'    => array( 'publish', 'draft' ),
			'orderby'        => 'ID',
			'order'          => 'DESC',
		);

		$posts = get_posts( $args );

		$data = array(
			'posts'    => array(),
			'l10n'     => array(
				'add_to_gallery' => 'Add to Modula Gallery',
				'ajax_failed'    => 'Failed to add images to gallery: ',
			),
			'nonce'    => wp_create_nonce( 'modula-ajax-save' ),
			'ajax_url' => admin_url( 'admin-ajax.php' ),
		);

		if ( $posts ) {
			foreach ( $posts as $post ) {
				$data['posts'][] = array(
					'id'    => $post->ID,
					'title' => '[ #' . $post->ID . ' ] - ' . ( isset( $post->post_title ) && '' !== $post->post_title ? $post->post_title : __( 'Gallery Without Name', 'modula-best-grid-gallery' ) ),
				);
			}
		}

		wp_enqueue_script( 'modula-media-screen', MODULA_URL . 'assets/js/admin/modula-media.js', array( 'media-views', 'media-editor' ), MODULA_LITE_VERSION, true );

		wp_localize_script( 'modula-media-screen', 'modulaGalleries', $data );
	}

	/**
	 * Filters the maximum image width to be included in a 'srcset' attribute.
	 *
	 * @return int
	 *
	 */
	public function disable_wp_responsive_images() {
		return 1;
	}

	/**
	 * Disables the srcset when lazy loading is enabled.
	 *
	 * @return_flag bool
	 * @since 2.7.5
	 */
	public function disable_lazy_srcset( $return_flag, $image ) {

		if ( preg_match( '/data-source=\"modula\"/i', $image ) ) {
			return false;
		}

		return $return_flag;
	}

	/**
	 * Prevents WP from adding srcsets to modula gallery images if srcsets are disabled.
	 *
	 * @param $settings
	 *
	 * @return void
	 *
	 */
	public function disable_wp_srcset( $settings ) {
		$troubleshoot_opt = get_option( 'modula_troubleshooting_option', array() );
		$disable_srcset   = isset( $troubleshoot_opt['disable_srcset'] ) ? boolval( $troubleshoot_opt['disable_srcset'] ) : false;

		if ( true === apply_filters( 'modula_troubleshooting_disable_srcset', $disable_srcset ) ) {
			add_filter( 'max_srcset_image_width', array( $this, 'disable_wp_responsive_images' ), 999 );
		}

		if ( isset( $settings['lazy_load'] ) && '1' === $settings['lazy_load'] ) {
			add_filter( 'wp_img_tag_add_srcset_and_sizes_attr', array( $this, 'disable_lazy_srcset' ), 999, 4 );
		}
	}

	/**
	 * Allows WP to add srcsets to other content after the gallery was created.
	 *
	 * @return void
	 *
	 */
	public function enable_wp_srcset() {
		remove_filter( 'max_srcset_image_width', array( $this, 'disable_wp_responsive_images' ), 999 );
	}
}
