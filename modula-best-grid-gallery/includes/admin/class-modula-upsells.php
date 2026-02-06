<?php
/**
 * Class Modula Upsells
 *
 * Main coordinator class that manages all upsell handlers.
 * This class acts as a facade, delegating responsibilities to specialized handler classes.
 *
 */
class Modula_Upsells {

	/**
	 * Modal handler instance
	 *
	 * @var Modula_Modal_Handler
	 */
	private $modal_handler;

	/**
	 * Tab content handler instance
	 *
	 * @var Modula_Tab_Content_Handler
	 */
	private $tab_content_handler;

	/**
	 * Settings tab handler instance
	 *
	 * @var Modula_Settings_Tab_Handler
	 */
	private $settings_tab_handler;

	/**
	 * Metabox handler instance
	 *
	 * @var Modula_Metabox_Handler
	 */
	private $metabox_handler;

	/**
	 * Navigation handler instance
	 *
	 * @var Modula_Navigation_Handler
	 */
	private $navigation_handler;

	/**
	 * Button handler instance
	 *
	 * @var Modula_Button_Handler
	 */
	private $button_handler;

	/**
	 * Constructor
	 *
	 * Initializes all handler classes and maintains backward compatibility.
	 */
	public function __construct() {
		// Load handler classes
		require_once MODULA_PATH . 'includes/admin/upsells/class-modula-upsell-base.php';
		require_once MODULA_PATH . 'includes/admin/upsells/class-modula-modal-handler.php';
		require_once MODULA_PATH . 'includes/admin/upsells/class-modula-tab-content-handler.php';
		require_once MODULA_PATH . 'includes/admin/upsells/class-modula-settings-tab-handler.php';
		require_once MODULA_PATH . 'includes/admin/upsells/class-modula-metabox-handler.php';
		require_once MODULA_PATH . 'includes/admin/upsells/class-modula-navigation-handler.php';
		require_once MODULA_PATH . 'includes/admin/upsells/class-modula-button-handler.php';

		// Initialize all handlers
		$this->modal_handler        = new Modula_Modal_Handler();
		$this->tab_content_handler  = new Modula_Tab_Content_Handler();
		$this->settings_tab_handler = new Modula_Settings_Tab_Handler();
		$this->metabox_handler      = new Modula_Metabox_Handler();
		$this->navigation_handler   = new Modula_Navigation_Handler();
		$this->button_handler       = new Modula_Button_Handler();
	}

	/**
	 * Get modal handler instance
	 *
	 * @return Modula_Modal_Handler
	 */
	public function get_modal_handler() {
		return $this->modal_handler;
	}

	/**
	 * Get tab content handler instance
	 *
	 * @return Modula_Tab_Content_Handler
	 */
	public function get_tab_content_handler() {
		return $this->tab_content_handler;
	}

	/**
	 * Get settings tab handler instance
	 *
	 * @return Modula_Settings_Tab_Handler
	 */
	public function get_settings_tab_handler() {
		return $this->settings_tab_handler;
	}

	/**
	 * Get metabox handler instance
	 *
	 * @return Modula_Metabox_Handler
	 */
	public function get_metabox_handler() {
		return $this->metabox_handler;
	}

	/**
	 * Get navigation handler instance
	 *
	 * @return Modula_Navigation_Handler
	 */
	public function get_navigation_handler() {
		return $this->navigation_handler;
	}

	/**
	 * Get button handler instance
	 *
	 * @return Modula_Button_Handler
	 */
	public function get_button_handler() {
		return $this->button_handler;
	}

	/**
	 * Generate upsell box HTML
	 *
	 * Delegates to base class method for backward compatibility.
	 *
	 * @param string $title       The upsell title.
	 * @param string $description The upsell description.
	 * @param string $tab         The tab identifier.
	 * @param array  $features    Optional array of features to display.
	 * @return string The generated HTML.
	 */
	public function generate_upsell_box( $title, $description, $tab, $features = array() ) {
		return $this->tab_content_handler->generate_upsell_box( $title, $description, $tab, $features );
	}
}
