<?php
/**
 * Handles all AJAX modal upgrade requests
 *
 * @since 2.13.0
 */
class Modula_Modal_Handler extends Modula_Upsell_Base {

	/**
	 * Modal template mapping
	 *
	 * @var array
	 */
	private $modal_templates = array(
		'albums'            => 'modula-modal-albums-upgrade.php',
		'bulk-editor'       => 'modula-modal-bulk-editor-upgrade.php',
		'albums-defaults'   => 'modula-modal-albums-defaults-upgrade.php',
		'gallery-defaults'  => 'modula-modal-gallery-defaults-upgrade.php',
		'image-licensing'   => 'modula-modal-image-licensing-upgrade.php',
		'image-proofing'    => 'modula-modal-image-proofing-upgrade.php',
		'content-galleries' => 'modula-modal-content-galleries-upgrade.php',
		'instagram'         => 'modula-modal-instagram-upgrade.php',
		'video'             => 'modula-modal-video-upgrade.php',
	);

	/**
	 * Addon to modal mapping for upgrade checks
	 *
	 * @var array
	 */
	private $addon_mapping = array(
		'albums'            => 'modula-albums',
		'bulk-editor'       => 'modula',
		'albums-defaults'   => 'modula-defaults',
		'gallery-defaults'  => 'modula-defaults',
		'image-licensing'   => 'modula-image-licensing',
		'image-proofing'    => 'modula-image-proofing',
		'content-galleries' => 'modula-content-galleries',
		'instagram'         => 'modula-instagram',
		'video'             => 'modula-video',
	);

	/**
	 * Constructor
	 */
	public function __construct() {
		parent::__construct();
		$this->register_ajax_handlers();
	}

	/**
	 * Register all AJAX handlers for modals
	 */
	private function register_ajax_handlers() {
		// Modula albums modal
		add_action( 'wp_ajax_modula_modal-albums_upgrade', array( $this, 'get_modal_albums_upgrade' ) );
		add_action( 'wp_ajax_modula_modal-bulk-editor_upgrade', array( $this, 'get_modal_bulk_editor_upgrade' ) );

		// Albums Defaults modal
		add_action( 'wp_ajax_modula_modal-albums-defaults_upgrade', array( $this, 'get_modal_albums_defaults_upgrade' ) );

		// Gallery Defaults modal
		add_action( 'wp_ajax_modula_modal-gallery-defaults_upgrade', array( $this, 'get_modal_gallery_defaults_upgrade' ) );

		// Modula licenses modal
		add_action( 'wp_ajax_modula_modal-image-licensing_upgrade', array( $this, 'get_modal_licenses_upgrade' ) );

		// Modula image proofing modal
		add_action( 'wp_ajax_modula_modal-image-proofing_upgrade', array( $this, 'get_modal_proofing_upgrade' ) );

		// Modula Content Galleries modal
		add_action( 'wp_ajax_modula_modal-content-galleries_upgrade', array( $this, 'get_modal_content_galleries_upgrade' ) );

		// Modula Instagram modal
		add_action( 'wp_ajax_modula_modal-instagram_upgrade', array( $this, 'get_modal_instagram_upgrade' ) );

		// Modula Video modal
		add_action( 'wp_ajax_modula_modal-video_upgrade', array( $this, 'get_modal_video_upgrade' ) );
	}

	/**
	 * Show the albums modal to upgrade
	 *
	 * @since 2.3.0
	 */
	public function get_modal_albums_upgrade() {
		$this->render_modal( 'albums' );
	}

	/**
	 * Show the bulk editor modal to upgrade
	 *
	 * @since 2.9.3
	 */
	public function get_modal_bulk_editor_upgrade() {
		$this->render_modal( 'bulk-editor' );
	}

	/**
	 * Show the albums defaults modal to upgrade
	 *
	 * @since 2.3.0
	 */
	public function get_modal_albums_defaults_upgrade() {
		$this->render_modal( 'albums-defaults' );
	}

	/**
	 * Show the gallery defaults modal to upgrade
	 *
	 * @since 2.3.0
	 */
	public function get_modal_gallery_defaults_upgrade() {
		$this->render_modal( 'gallery-defaults' );
	}

	/**
	 * Show the licenses modal to upgrade
	 *
	 * @since 2.7.91
	 */
	public function get_modal_licenses_upgrade() {
		$this->render_modal( 'image-licensing' );
	}

	/**
	 * Show the image proofing modal to upgrade
	 *
	 * @since 2.11.10
	 */
	public function get_modal_proofing_upgrade() {
		$this->render_modal( 'image-proofing' );
	}

	/**
	 * Show the Content Galleries modal to upgrade
	 *
	 * @since 2.12.10
	 */
	public function get_modal_content_galleries_upgrade() {
		$this->render_modal( 'content-galleries' );
	}

	/**
	 * Show the Instagram modal to upgrade
	 *
	 * @since 2.12.10
	 */
	public function get_modal_instagram_upgrade() {
		$this->render_modal( 'instagram' );
	}

	/**
	 * Show the Video modal to upgrade
	 *
	 * @since 2.12.10
	 */
	public function get_modal_video_upgrade() {
		$this->render_modal( 'video' );
	}

	/**
	 * Render a modal template
	 *
	 * @param string $modal_key The modal key identifier.
	 */
	private function render_modal( $modal_key ) {
		if ( ! isset( $this->modal_templates[ $modal_key ] ) ) {
			wp_die();
		}

		$addon = isset( $this->addon_mapping[ $modal_key ] ) ? $this->addon_mapping[ $modal_key ] : '';

		if ( $addon && ! $this->extensions->is_upgradable_addon( $addon ) ) {
			wp_die();
		}

		$template_file = MODULA_PATH . '/includes/admin/templates/modal/' . $this->modal_templates[ $modal_key ];

		if ( file_exists( $template_file ) ) {
			require $template_file;
		}

		wp_die();
	}
}
