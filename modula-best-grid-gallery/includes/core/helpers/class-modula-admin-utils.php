<?php

/**
 * Admin utilities for Modula plugin.
 *
 * Handles admin-specific utility methods like dashboard initialization,
 * widget registration, and metabox management.
 *
 * @since 2.0.0
 */
class Modula_Admin_Utils {

	/**
	 * Initialize dashboard and register menu items.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function dashboard_start(): void {
		$links = array(
			'partners'      => 'https://wp-modula.com/parteners.json',
			'documentation' => 'https://wp-modula.com/kb/',
			'pricing'       => 'https://wp-modula.com/pricing/?utm_source=modula-lite&utm_medium=dashboard-page&utm_campaign=upsell',
			'extensions'    => admin_url( 'edit.php?post_type=modula-gallery&page=modula-addons' ),
			'lite_vs_pro'   => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=link&utm_campaign=upsell&utm_term=lite-vs-pro',
			'support'       => 'https://wordpress.org/support/plugin/modula-best-grid-gallery/',
			'fbcommunity'   => 'https://www.facebook.com/groups/wpmodula/',
			'changelog'     => 'https://wp-modula.com/changelog/?utm_source=modula-lite&utm_medium=link&utm_campaign=settings&utm_term=changelog',
		);

		new Modula_Dashboard(
			MODULA_FILE,
			'modula-gallery',
			MODULA_URL . 'assets/images/dashboard/',
			$links,
			'modula_page_header'
		);
	}

	/**
	 * Register and load the widget.
	 *
	 * @since 2.0.0
	 * @return void
	 */
	public function load_widget(): void {
		register_widget( 'Modula_Widget' );
	}

	/**
	 * Check if we are on the Modula admin page.
	 *
	 * @since 2.11.0
	 * @return bool True if on a Modula admin page, false otherwise.
	 */
	public function is_modula_admin_page(): bool {
		$screen = get_current_screen();

		if ( false !== strpos( $screen->id, 'modula-gallery' ) || false !== strpos( $screen->id, 'modula-albums' ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Prevent reorder of normal metaboxes.
	 *
	 * @since 2.11.2
	 * @param array|false $order Metabox order array.
	 * @return array Metabox order array with enforced order.
	 */
	public function metabox_prevent_sorting( $order ): array {
		if ( ! is_array( $order ) ) {
			$order = array();
		}

		$order['normal'] = 'modula-albums-upsell,modula-preview-gallery,modula-settings,slugdiv';
		return $order;
	}

	/**
	 * Prevent closing of normal metaboxes.
	 *
	 * @since 2.11.2
	 * @param array|false $closed Array of closed metabox IDs.
	 * @return array Filtered array of closed metabox IDs.
	 */
	public function metabox_prevent_closing( $closed ): array {
		if ( ! is_array( $closed ) ) {
			$closed = array();
		}
		$should_be_open = array( 'modula-albums-upsell', 'modula-settings' );

		return array_filter(
			$closed,
			function ( $val ) use ( $should_be_open ) {
				return ! in_array( $val, $should_be_open, true );
			}
		);
	}
}
