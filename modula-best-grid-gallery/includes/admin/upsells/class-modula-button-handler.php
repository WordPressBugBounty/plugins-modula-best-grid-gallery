<?php
/**
 * Handles upsell buttons in the media selection area
 *
 * @since 2.13.0
 */
class Modula_Button_Handler extends Modula_Upsell_Base {

	/**
	 * Constructor
	 */
	public function __construct() {
		parent::__construct();
		$this->register_button_hooks();
	}

	/**
	 * Register button-related hooks
	 */
	private function register_button_hooks() {
		// Add New button upsells.
		add_action( 'modula_gallery_media_select_option', array( $this, 'add_new_button_instagram_upsells' ), 80, 1 );
		add_action( 'modula_gallery_media_select_option', array( $this, 'add_new_button_video_upsells' ), 100, 1 );
		add_action( 'modula_gallery_media_select_option', array( $this, 'add_new_button_content_galleries_upsells' ), 60, 1 );
		// Add bulk editor upsell.
		add_action( 'modula_gallery_media_button', array( $this, 'bulk_editor_upsell' ), 15, 1 );
	}

	/**
	 * Add upsells to the Add New image button when editing a gallery
	 *
	 * @since 2.11.0
	 */
	public function add_new_button_instagram_upsells() {
		if ( $this->extensions->is_upgradable_addon( 'modula-instagram' ) ) {
			echo '<li id="modula-instagram-upsell">' . esc_html__( 'Instagram', 'modula-best-grid-gallery' ) . '</li>';
		}
	}

	/**
	 * Add upsells to the Add New image button when editing a gallery
	 *
	 * @since 2.11.0
	 */
	public function add_new_button_video_upsells() {
		if ( $this->extensions->is_upgradable_addon( 'modula-video' ) ) {
			echo '<li id="modula-video-upsell">' . esc_html__( 'Video', 'modula-best-grid-gallery' ) . '</li>';
			echo '<li id="modula-video-playlist-upsell">' . esc_html__( 'Video Playlist', 'modula-best-grid-gallery' ) . '</li>';
		}
	}

	/**
	 * Add upsells to the Add New image button when editing a gallery
	 *
	 * @since 2.11.0
	 */
	public function add_new_button_content_galleries_upsells() {
		if ( $this->extensions->is_upgradable_addon( 'modula-content-galleries' ) ) {
			echo '<li id="modula-content-galleries-upsell">' . esc_html__( 'Content Galleries', 'modula-best-grid-gallery' ) . '</li>';
		}
	}

	/**
	 * Add upsells to the Add New image button when editing a gallery
	 *
	 * @since 2.10.0
	 */
	public function bulk_editor_upsell() {
		if ( ! $this->extensions->is_upgradable_addon( 'modula' ) ) {
			return;
		}
		echo '<div id="modula-pro-bulk-editor-upsell" data-gallery-id="' . esc_attr( get_the_ID() ) . '"><a href="#" class="button modula-pro-bulk-editor-button">' . esc_html__( 'Bulk Editor', 'modula-best-grid-gallery' ) . '</a></div>';
	}
}
