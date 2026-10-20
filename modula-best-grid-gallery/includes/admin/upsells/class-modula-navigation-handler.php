<?php
/**
 * Handles navigation and menu-related upsells
 *
 * @since 2.13.0
 */
class Modula_Navigation_Handler extends Modula_Upsell_Base {

	/**
	 * Constructor
	 */
	public function __construct() {
		parent::__construct();
		$this->register_navigation_hooks();
	}

	/**
	 * Register navigation-related hooks
	 */
	private function register_navigation_hooks() {
		// Settings and Upgrade to PRO plugin action links
		add_filter( 'plugin_action_links_' . MODULA_FILE, array( $this, 'filter_action_links' ), 60 );

		if ( $this->extensions->is_upgradable_addon( 'modula-whitelabel' ) ) {
			add_filter( 'modula_admin_page_tabs', array( $this, 'add_whitelabel_tab' ), 140 );
		}
	}

	/**
	 * Add the Settings and Upgrade to PRO plugin action links
	 *
	 * The row reads Upgrade to Premium, Settings, then core's Deactivate: Settings goes
	 * in first so that Upgrade lands in front of it.
	 *
	 * @param array $links Existing plugin action links.
	 * @return array Modified links array.
	 * @since 2.6.0
	 */
	public function filter_action_links( $links ) {
		$links = $this->add_settings_action_link( $links );

		return $this->add_upgrade_action_link( $links );
	}

	/**
	 * Put the Upgrade to PRO link in front of the row's links, unless no upgrade is available
	 *
	 * @param array $links Existing plugin action links.
	 * @return array Links with the upgrade link first, when it applies.
	 */
	private function add_upgrade_action_link( $links ) {
		$upgrade = apply_filters(
			'modula_upgrade_plugin_action',
			array(
				'upgrade_available' => true,
				'link'              => '<a  target="_blank" class="modula-lite-vs-pro" href="https://wp-modula.com/pricing/?utm_source=modula-lite&utm_medium=plugin_settings&utm_campaign=upsell">' . esc_html__( 'Upgrade to Premium', 'modula-best-grid-gallery' ) . '</a>',
			)
		);

		if ( ! $upgrade['upgrade_available'] ) {
			return $links;
		}

		array_unshift( $links, $upgrade['link'] );

		return $links;
	}

	/**
	 * Put the Settings link, which opens Modula Settings, in front of the row's links
	 *
	 * @param array $links Existing plugin action links.
	 * @return array Links with Settings first, for users who can manage Modula settings.
	 */
	private function add_settings_action_link( $links ) {
		// Same capability as the Settings submenu page.
		if ( ! current_user_can( 'manage_options' ) ) {
			return $links;
		}

		$settings = '<a href="' . esc_url( admin_url( 'edit.php?post_type=modula-gallery&page=modula' ) ) . '">' . esc_html__( 'Settings', 'modula-best-grid-gallery' ) . '</a>';

		return array( 'settings' => $settings ) + $links;
	}

	/**
	 * Add whitelabel tab
	 *
	 * @param array $tabs Existing tabs array.
	 * @return array Modified tabs array.
	 */
	public function add_whitelabel_tab( $tabs ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-whitelabel' ) ) {
			return $tabs;
		}

		$tabs['whitelabel'] = array(
			'label'    => esc_html__( 'Whitelabel', 'modula-best-grid-gallery' ),
			'priority' => 130,
			'badge'    => 'PRO',
		);

		return $tabs;
	}
}
