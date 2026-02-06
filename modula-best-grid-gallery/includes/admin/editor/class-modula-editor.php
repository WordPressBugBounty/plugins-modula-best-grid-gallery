<?php

/**
 * Handles TinyMCE integration for Modula shortcode insertion.
 */
class Modula_Editor {

	/**
	 * @param array $buttons
	 *
	 * @return array
	 */
	public function editor_button( $buttons ) {
		array_push( $buttons, 'separator', 'modula_shortcode_editor' );

		return $buttons;
	}

	/**
	 * @param array $plugin_array
	 *
	 * @return array
	 */
	public function register_editor_plugin( $plugin_array ) {
		$plugin_array['modula_shortcode_editor'] = MODULA_URL . 'assets/js/admin/editor-plugin.js';

		return $plugin_array;
	}

	/**
	 * Add nonce for TinyMCE editor plugin
	 */
	public function add_editor_nonce() {
		$screen = get_current_screen();
		// Only add nonce on post edit screens where TinyMCE is available
		if ( ! $screen || ! in_array( $screen->base, array( 'post', 'page' ), true ) ) {
			return;
		}
		?>
		<script type="text/javascript">
			var modulaEditorNonce = '<?php echo esc_js( wp_create_nonce( 'modula-ajax-save' ) ); ?>';
		</script>
		<?php
	}

	/**
	 * Display galleries selection.
	 */
	public function modula_shortcode_editor() {
		// Check user capability
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'modula-best-grid-gallery' ) );
		}

		// Verify nonce
		$nonce = '';
		if ( isset( $_REQUEST['nonce'] ) ) {
			$nonce = sanitize_text_field( wp_unslash( $_REQUEST['nonce'] ) );
		}

		if ( ! wp_verify_nonce( $nonce, 'modula-ajax-save' ) ) {
			wp_die( esc_html__( 'Security check failed.', 'modula-best-grid-gallery' ) );
		}

		$css_path  = MODULA_URL . 'assets/css/admin/edit.css';
		$admin_url = admin_url();
		$galleries = Modula_Helper::get_galleries();
		include 'tinymce-galleries.php';
		wp_die();
	}
}
