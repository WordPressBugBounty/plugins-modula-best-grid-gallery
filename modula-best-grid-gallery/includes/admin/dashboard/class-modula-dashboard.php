<?php

/**
 * The Getting Started page (Getting Started, About us and Partners views).
 *
 * Registers the submenu page and loads the React app that draws it, with the
 * data the app can't hold itself.
 *
 * @since      2.0.0
 */
class Modula_Dashboard {

	private $menu_slug;
	private $plugin_file;
	private $plugin_cpt;
	private $plugin_link;
	private $readme_parser;

	public function __construct( $plugin_file, $plugin_cpt, $links ) {

		$this->plugin_file   = $plugin_file;
		$this->plugin_cpt    = $plugin_cpt;
		$this->plugin_link   = $links;
		$this->readme_parser = new Modula_Readme_Parser( MODULA_PATH . 'readme.txt' );

		$this->menu_slug = 'wpchill-dashboard';

		// After WPChill enqueues its bubble (priority 10), which the app's bell replaces.
		add_action( 'admin_enqueue_scripts', array( $this, 'getting_started_scripts' ), 20 );

		add_filter( 'admin_menu', array( $this, 'add_dashboard_menu_item' ), 99, 1 );

		// Clear all notices
		add_action( 'in_admin_header', array( $this, 'clear_admin_notices' ), 99 );

		add_action( 'admin_init', array( $this, 'redirect_to_list_or_dash' ) );
	}

	/**
	 * Adds dashboard to addon's admin menu
	 *
	 * @return void
	 *
	 * @since 2.7.5
	 */
	public function add_dashboard_menu_item() {
		add_submenu_page(
			'edit.php?post_type=' . $this->plugin_cpt,
			esc_html__( 'Getting Started', 'modula-best-grid-gallery' ),
			esc_html__( 'Getting Started', 'modula-best-grid-gallery' ),
			'manage_options',
			$this->menu_slug,
			array(
				$this,
				'dashboard_view',
			),
			0
		);
	}

	public function clear_admin_notices() {

		if ( $this->is_dashboard() ) {
			remove_all_actions( 'user_admin_notices' );
			remove_all_actions( 'admin_notices' );
		}
	}

	/**
	 * The view the dashboard page shows, from its `tab` query value. A missing
	 * or unknown value shows Getting Started.
	 *
	 * @return string 'general' (Getting Started), 'about' or 'partners'.
	 */
	private function current_view() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only choice of what to show.
		$tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : '';

		if ( in_array( $tab, array( 'about', 'partners' ), true ) ) {
			return $tab;
		}

		return 'general';
	}

	/**
	 * Prints the Getting Started app's mount point; the app draws every view.
	 *
	 * @return void
	 */
	public function dashboard_view() {
		echo '<div id="modula-getting-started"></div>';
	}

	/**
	 * Check if dashboard page
	 *
	 * @param $return
	 *
	 * @return bool|mixed
	 * @since 2.5.3
	 */

	public function is_dashboard() {

		if ( isset( $_GET['page'] ) && 'wpchill-dashboard' === $_GET['page'] ) {
			return true;
		}

		return false;
	}

	/**
	 * Loads the Getting Started app with the data it can't hold itself, and
	 * removes the floating WPChill bubble, which the app's header bell
	 * replaces.
	 *
	 * @return void
	 */
	public function getting_started_scripts() {
		if ( ! $this->is_dashboard() ) {
			return;
		}

		$scripts = Modula\Scripts::get_instance();
		$scripts->load_js_asset( 'modula-getting-started', 'assets/js/admin/getting-started' );
		$scripts->load_css_asset( 'modula-getting-started', 'assets/js/admin/getting-started' );

		Modula_Admin_Assets::add_notifications_icon( 'modula-getting-started', 'modulaGettingStartedNotifications' );

		wp_add_inline_script(
			'modula-getting-started',
			'window.modulaGettingStarted = ' . wp_json_encode( $this->getting_started_data() ) . ';',
			'before'
		);

		Modula_Admin_Assets::dequeue_wpchill_notification_bubble();
	}

	/**
	 * The Getting Started app's data.
	 *
	 * @return array{
	 *     view: string,
	 *     links: array<string, string>,
	 *     useCases: array<int, array{question: string, answer: string}>,
	 *     partners?: array<int, array<string, mixed>>|null
	 * } The view to show (see current_view()); where the cards and the help
	 *   box lead (keyed by documentation, settings, galleries, extensions,
	 *   supportForum and aboutUs); the common use cases; and, on Partners
	 *   only, the partner plugins (see partners()).
	 */
	private function getting_started_data() {
		$links = array(
			'documentation' => $this->plugin_link['documentation'],
			'settings'      => admin_url( 'edit.php?post_type=' . $this->plugin_cpt . '&page=modula' ),
			'galleries'     => admin_url( 'edit.php?post_type=' . $this->plugin_cpt ),
			'extensions'    => $this->plugin_link['extensions'],
			'supportForum'  => $this->plugin_link['support'],
			'aboutUs'       => 'https://wpchill.com/about/',
		);

		$data = array(
			'view'     => $this->current_view(),
			'links'    => array_map( 'esc_url_raw', $links ),
			'useCases' => $this->common_use_cases(),
		);

		// Only Partners pays for the remote list.
		if ( 'partners' === $data['view'] ) {
			$data['partners'] = $this->partners();
		}

		return $data;
	}

	/**
	 * The partner plugins, as the Partners view shows them.
	 *
	 * @return array<int, array{
	 *     name: string,
	 *     version: string,
	 *     description: string,
	 *     image: string,
	 *     url: string,
	 *     active: bool
	 * }>|null The partners in the remote list's order, or null when the list
	 *   can't be loaded (nothing cached and the request failed) or has no
	 *   usable entry, so the view shows a notice, not an empty grid. `version`
	 *   and `url` are empty strings when the list gives none; `image` falls
	 *   back to the default image.
	 */
	private function partners() {
		$partner_list = $this->partner_list();

		if ( null === $partner_list ) {
			return null;
		}

		$partners = array();

		foreach ( $partner_list as $partner ) {
			if ( ! $this->is_valid_partner( $partner ) ) {
				continue;
			}

			$partners[] = $this->partner_entry( $partner );
		}

		return $partners ? $partners : null;
	}

	/**
	 * The remote partner list, cached for a week in `wpchill_all_partners`.
	 * A failed request isn't cached, so the next visit tries again.
	 *
	 * @return array|null The decoded list, or null when it can't be loaded.
	 */
	private function partner_list() {
		$cached = get_transient( 'wpchill_all_partners' );

		if ( is_array( $cached ) && $cached ) {
			return $cached;
		}

		$response = wp_remote_get( $this->plugin_link['partners'] );

		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return null;
		}

		$partner_list = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ! is_array( $partner_list ) || ! $partner_list ) {
			return null;
		}

		set_transient( 'wpchill_all_partners', $partner_list, 7 * DAY_IN_SECONDS );

		return $partner_list;
	}

	/**
	 * Whether a remote list entry has what a partner card needs: a name and
	 * a slug (the plugin path derives from it when the entry has none).
	 *
	 * @param mixed $partner One entry of the remote list.
	 * @return bool
	 */
	private function is_valid_partner( $partner ) {
		return is_array( $partner )
			&& ! empty( $partner['name'] ) && is_string( $partner['name'] )
			&& ! empty( $partner['slug'] ) && is_string( $partner['slug'] );
	}

	/**
	 * One partner card's data. Text is plain and URLs are escaped, because
	 * the list comes from a remote site.
	 *
	 * @param array $partner A valid entry of the remote list.
	 * @return array See partners().
	 */
	private function partner_entry( $partner ) {
		$path = ! empty( $partner['path'] ) && is_string( $partner['path'] ) ? $partner['path'] : $partner['slug'] . '/' . $partner['slug'] . '.php';

		// Escaping drops an unsafe address, which then also gets the default.
		$image = isset( $partner['image'] ) && is_string( $partner['image'] ) ? esc_url_raw( $partner['image'] ) : '';
		if ( '' === $image ) {
			$image = esc_url_raw( plugin_dir_url( $this->plugin_file ) . 'assets/images/dashboard/blog-default.png' );
		}

		return array(
			'name'        => wp_strip_all_tags( $partner['name'] ),
			'version'     => isset( $partner['version'] ) && is_scalar( $partner['version'] ) ? sanitize_text_field( (string) $partner['version'] ) : '',
			'description' => isset( $partner['description'] ) && is_string( $partner['description'] ) ? wp_strip_all_tags( $partner['description'] ) : '',
			'image'       => $image,
			'url'         => ! empty( $partner['url'] ) && is_string( $partner['url'] ) ? esc_url_raw( $partner['url'] ) : '',
			'active'      => $this->is_partner_active( $path ),
		);
	}

	/**
	 * Whether a partner plugin is active on this site.
	 *
	 * @param string $plugin_path Plugin file relative to the plugins folder.
	 * @return bool
	 */
	private function is_partner_active( $plugin_path ) {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		return is_plugin_active( $plugin_path );
	}

	/**
	 * The common use cases: the readme FAQ as parsed by the readme parser,
	 * one question / answer pair each. The answers are HTML (links,
	 * emphasis), sanitized here because the app prints them as markup.
	 *
	 * @return array<int, array{question: string, answer: string}>
	 */
	private function common_use_cases() {
		$use_cases = array();

		foreach ( $this->readme_parser->faq as $question => $answer ) {
			$use_cases[] = array(
				'question' => wp_strip_all_tags( (string) $question ),
				'answer'   => wp_kses_post( $answer ),
			);
		}

		return $use_cases;
	}

	public function redirect_to_list_or_dash() {
		if ( $this->is_dashboard() && ! isset( $_GET['post_type'] ) ) {
			$url_to_galleries = add_query_arg(
				array(
					'post_type' => 'modula-gallery',
				),
				admin_url( 'edit.php' )
			);
			wp_redirect( $url_to_galleries );
			die();
		}
	}
}
