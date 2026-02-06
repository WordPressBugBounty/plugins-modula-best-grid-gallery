<?php
require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-extensions-base.php';
require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-settings-sanitizer.php';
require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-insights-base.php';

class Modula_Rest_Api {

	private $namespace = 'modula-best-grid-gallery/v1';
	private $settings  = null;

	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );

		Modula_Extensions_Base::get_instance();

		$this->settings = Modula_Settings::get_instance();

		if ( class_exists( 'Modula_Migrator_Detector' ) ) {
			require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-migrator-rest.php';
			new Modula_Migrator_Rest();
		}
	}

	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/general-settings',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_settings' ),
				'permission_callback' => array( $this, 'settings_permissions_check' ),
			)
		);
		register_rest_route(
			$this->namespace,
			'/general-settings',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'update_settings' ),
				'permission_callback' => array( $this, 'settings_permissions_check' ),
			)
		);
		register_rest_route(
			$this->namespace,
			'/general-settings-tabs',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_tabs' ),
				'permission_callback' => array( $this, 'settings_permissions_check' ),
			)
		);

		register_rest_route(
			$this->namespace,
			'/video/youtube',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'youtube_action' ),
				'permission_callback' => array( $this, 'settings_permissions_check' ),
			)
		);

		register_rest_route(
			$this->namespace,
			'/video/vimeo',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'vimeo_action' ),
				'permission_callback' => array( $this, 'settings_permissions_check' ),
			)
		);

		register_rest_route(
			$this->namespace,
			'/license',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'license_action' ),
				'permission_callback' => array( $this, 'settings_permissions_check' ),
			)
		);

		register_rest_route(
			$this->namespace,
			'/extensions',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_extensions' ),
				'permission_callback' => array( $this, 'settings_permissions_check' ),
			)
		);

		register_rest_route(
			$this->namespace,
			'/insights',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_insights' ),
				'permission_callback' => array( $this, 'settings_permissions_check' ),
			)
		);

		register_rest_route(
			$this->namespace,
			'/menu',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_menu' ),
				'permission_callback' => array( $this, 'settings_permissions_check' ),
			)
		);
	}

	public function get_settings() {
		return new \WP_REST_Response( $this->settings->get_settings(), 200 );
	}

	public function update_settings( $request ) {
		$settings = $request->get_json_params();

		if ( empty( $settings ) || ! is_array( $settings ) ) {
			return new \WP_REST_Response( 'No settings to save.', 400 );
		}

		$sanitization_schema = $this->settings->settings_sanitization();
		$sanitizer           = Modula_Settings_Sanitizer::get_instance();

		$sanitized_settings = array();

		foreach ( $settings as $option => $value ) {
			if ( ! isset( $sanitization_schema[ $option ] ) || ! is_array( $sanitization_schema[ $option ] ) ) {
				continue;
			}

			$value = $this->sanitize_setting_value( $value, $sanitization_schema[ $option ], $sanitizer );

			update_option( $option, $value );

			do_action( 'modula_settings_api_update_' . $option, $value );

			$sanitized_settings[ $option ] = $value;
		}

		return new \WP_REST_Response( $sanitized_settings, 200 );
	}

	public function get_tabs() {
		return new \WP_REST_Response( $this->settings->get_tabs(), 200 );
	}

	public function youtube_action( $request ) {
		$data = $request->get_json_params();

		if ( empty( $data ) || empty( $data['action'] ) ) {
			return new \WP_REST_Response( 'No action to take.', 400 );
		}

		if ( class_exists( 'Modula_Pro\Extensions\Video\Admin\Google_Auth' ) ) {
			$youtube_oauth = Modula_Pro\Extensions\Video\Admin\Google_Auth::get_instance();
			if ( 'refresh' === $data['action'] ) {
				$youtube_oauth->refresh_token( false );
			} elseif ( 'disconnect' === $data['action'] ) {
				delete_option( Modula_Pro\Extensions\Video\Admin\Google_Auth::$access_token );
				delete_option( Modula_Pro\Extensions\Video\Admin\Google_Auth::$refresh_token );
				delete_option( Modula_Pro\Extensions\Video\Admin\Google_Auth::$expiry_date );
			}
		}

		return new \WP_REST_Response( true, 200 );
	}

	public function vimeo_action( $request ) {
		$data = $request->get_json_params();

		if ( empty( $data ) || empty( $data['action'] ) ) {
			return new \WP_REST_Response( 'No action to take.', 400 );
		}

		if ( class_exists( 'Modula_Pro\Extensions\Video\Admin\Vimeo_Auth' ) ) {
			Modula_Pro\Extensions\Video\Admin\Vimeo_Auth::get_instance();
			if ( 'disconnect' === $data['action'] ) {
				delete_option( Modula_Pro\Extensions\Video\Admin\Vimeo_Auth::$access_token );
			}
		}

		return new \WP_REST_Response( true, 200 );
	}

	public function settings_permissions_check() {

		// Check if the user has the capability to manage options
		return current_user_can( 'manage_options' );
	}

	public function license_action( $request ) {
		$body        = $request->get_json_params();
		$license_key = isset( $body['license_key'] ) ? $body['license_key'] : '';
		$action      = isset( $body['action'] ) ? $body['action'] : '';
		$saved       = get_option( 'modula_pro_license_key', '' );
		if ( empty( $license_key ) && empty( $saved ) ) {
			return new \WP_REST_Response(
				array(
					'message' => 'no_license_key',
					'status'  => 'error',
				),
				200
			);
		}

		if ( ! class_exists( 'Modula_Pro\Extensions\Licensing' ) ) {
			return new \WP_REST_Response( 'Modula Pro is not installed.', 400 );
		}

		$license = Modula_Pro\Extensions\Licensing::get_instance();

		if ( 'activate' === $action ) {
			return new \WP_REST_Response( $license->activate_license( $license_key ), 200 );
		}

		if ( 'deactivate' === $action ) {
			return new \WP_REST_Response( $license->deactivate_license( $license_key ), 200 );
		}

		return new \WP_REST_Response( $license->check_license(), 200 );
	}

	public function get_extensions() {
		$instance = class_exists( 'Modula_Pro\Extensions\Extensions' )
			? Modula_Pro\Extensions\Extensions::get_instance()
			: Modula_Extensions_Base::get_instance();

		return new \WP_REST_Response( $instance->get_extensions(), 200 );
	}

	public function get_insights() {
		$extensions_instance = class_exists( 'Modula_Pro\Extensions\Extensions' )
			? Modula_Pro\Extensions\Extensions::get_instance()
			: Modula_Extensions_Base::get_instance();

		$insights_instance = Modula_Insights_Base::get_instance();

		// Get extensions data first to populate extension info
		$extensions_instance->get_extensions();

		return new \WP_REST_Response( $insights_instance->get_insights( $extensions_instance ), 200 );
	}

	/**
	 * Sanitize settings payload based on provided sanitization schema.
	 *
	 * @param mixed                    $value   Value to sanitize.
	 * @param array|string             $schema  Sanitization schema for the value.
	 * @param Modula_Settings_Sanitizer $sanitizer Sanitizer instance.
	 *
	 * @return mixed
	 */
	private function sanitize_setting_value( $value, $schema, $sanitizer ) {
		if ( is_array( $value ) && $this->is_associative_array( $schema ) ) {
			$sanitized = array();

			foreach ( $value as $key => $sub_value ) {
				if ( isset( $schema[ $key ] ) ) {
					$sanitized[ $key ] = $this->sanitize_setting_value( $sub_value, $schema[ $key ], $sanitizer );
				} else {
					$sanitized[ $key ] = $sub_value;
				}
			}

			return $sanitized;
		}

		if ( ! is_array( $value ) && is_array( $schema ) ) {
			$is_numeric_indexed = array_keys( $schema ) === range( 0, count( $schema ) - 1 );

			if ( $is_numeric_indexed && isset( $schema[0] ) && is_string( $schema[0] ) ) {
				return $this->run_sanitizer( $schema[0], $value, $sanitizer );
			}

			if ( ! $is_numeric_indexed && 1 === count( $schema ) ) {
				$sanitizer_key = array_keys( $schema )[0];
				$args          = $schema[ $sanitizer_key ];

				return $this->run_sanitizer( $sanitizer_key, $value, $sanitizer, $args );
			}
		}

		return $value;
	}

	/**
	 * Run a sanitizer method or custom handler based on schema.
	 *
	 * @param string                   $sanitizer_key Sanitizer key.
	 * @param mixed                    $value         Value to sanitize.
	 * @param Modula_Settings_Sanitizer $sanitizer     Sanitizer instance.
	 * @param mixed                    $args          Optional args for sanitizer (used for enum).
	 *
	 * @return mixed
	 */
	private function run_sanitizer( $sanitizer_key, $value, $sanitizer, $args = array() ) {
		if ( 'enum' === $sanitizer_key && is_array( $args ) && ! empty( $args ) ) {
			return in_array( $value, $args, true ) ? $value : reset( $args );
		}

		if ( method_exists( $sanitizer, $sanitizer_key ) ) {
			return $sanitizer->$sanitizer_key( $value );
		}

		return $value;
	}

	/**
	 * Check if an array is associative.
	 *
	 * @param array $unknown_array Array to check.
	 *
	 * @return bool
	 */
	private function is_associative_array( $unknown_array ) {
		if ( ! is_array( $unknown_array ) || array() === $unknown_array ) {
			return false;
		}

		return array_keys( $unknown_array ) !== range( 0, count( $unknown_array ) - 1 );
	}

	public function get_menu() {
		// Get extensions instance to check which extensions are active
		$extensions_instance = class_exists( 'Modula_Pro\Extensions\Extensions' )
			? Modula_Pro\Extensions\Extensions::get_instance()
			: Modula_Extensions_Base::get_instance();

		// Check which extensions are active
		$image_proofing_active = $extensions_instance->extension_enabled( 'modula-image-proofing' );
		$defaults_active       = $extensions_instance->extension_enabled( 'modula-defaults' );
		$albums_active         = $extensions_instance->extension_enabled( 'modula-albums' );
		$image_license_active  = post_type_exists( 'modula-image-license' );

		// Build menu items - Extensions page is always current since this is called from there
		$menu_items = array();

		// Welcome
		$menu_items[] = array(
			'title' => 'Welcome',
			'url'   => admin_url( 'edit.php?post_type=modula-gallery&page=wpchill-dashboard' ),
			'class' => 'wp-first-item',
		);

		// Galleries
		$menu_items[] = array(
			'title' => 'Galleries',
			'url'   => admin_url( 'edit.php?post_type=modula-gallery' ),
			'class' => '',
		);

		// Proofing - requires image-proofing extension
		if ( $image_proofing_active ) {
			$menu_items[] = array(
				'title' => 'Proofing',
				'url'   => admin_url( 'edit.php?post_status=all&gallery_type=image-proofing&post_type=modula-gallery' ),
				'class' => '',
			);
		}

		// Defaults (for galleries) - requires defaults extension
		if ( $defaults_active ) {
			$menu_items[] = array(
				'title' => 'Defaults',
				'url'   => admin_url( 'edit.php?post_type=modula-defaults' ),
				'class' => '',
			);
		}

		// Albums - requires albums extension
		if ( $albums_active ) {
			$menu_items[] = array(
				'title' => 'Albums',
				'url'   => admin_url( 'edit.php?post_type=modula-album' ),
				'class' => '',
			);

			// Defaults (for albums) - requires albums AND defaults extensions
			if ( $defaults_active ) {
				$menu_items[] = array(
					'title' => 'Defaults',
					'url'   => admin_url( 'edit.php?post_type=defaults-albums' ),
					'class' => '',
				);
			}
		}

		// Image Licenses - requires image-license extension
		if ( $image_license_active ) {
			$menu_items[] = array(
				'title' => 'Image Licenses',
				'url'   => admin_url( 'edit.php?post_type=modula-image-license' ),
				'class' => '',
			);
		}

		// Settings
		$menu_items[] = array(
			'title' => 'Settings',
			'url'   => admin_url( 'edit.php?post_type=modula-gallery&page=modula' ),
			'class' => '',
		);

		// Extensions - always current since this is called from Extensions page
		$menu_items[] = array(
			'title' => 'Extensions',
			'url'   => admin_url( 'edit.php?post_type=modula-gallery&page=modula-addons' ),
			'class' => 'current',
		);

		// Menu is always open since Extensions is current
		$menu_open_class = 'wp-has-submenu wp-has-current-submenu wp-menu-open';
		$menu_li_class   = $menu_open_class . ' menu-top menu-icon-modula-gallery';
		$menu_a_class    = $menu_open_class . ' menu-top menu-icon-modula-gallery';

		// Get plugin icon URL
		$icon_url = MODULA_URL . 'assets/images/modula.png';

		// Build the HTML
		$html  = '<li class="' . esc_attr( $menu_li_class ) . '" id="menu-posts-modula-gallery">';
		$html .= '<a href="' . esc_url( admin_url( 'admin.php?page=wpchill-dashboard' ) ) . '" class="' . esc_attr( $menu_a_class ) . '">';
		$html .= '<div class="wp-menu-image dashicons-before" aria-hidden="true">';
		$html .= '<img src="' . esc_url( $icon_url ) . '" alt="">';
		$html .= '</div>';
		$html .= '<div class="wp-menu-name">Modula</div>';
		$html .= '</a>';
		$html .= '<ul class="wp-submenu wp-submenu-wrap">';
		$html .= '<li class="wp-submenu-head" aria-hidden="true">Modula</li>';

		foreach ( $menu_items as $item ) {
			$li_class     = ! empty( $item['class'] ) ? $item['class'] : '';
			$a_class      = ! empty( $item['class'] ) && strpos( $item['class'], 'current' ) !== false ? 'current' : '';
			$aria_current = ( strpos( $item['class'], 'current' ) !== false ) ? ' aria-current="page"' : '';

			$html .= '<li' . ( ! empty( $li_class ) ? ' class="' . esc_attr( $li_class ) . '"' : '' ) . '>';
			$html .= '<a href="' . esc_url( $item['url'] ) . '"' . ( ! empty( $a_class ) ? ' class="' . esc_attr( $a_class ) . '"' : '' ) . $aria_current . '>';
			$html .= esc_html( $item['title'] );
			$html .= '</a>';
			$html .= '</li>';
		}

		$html .= '</ul>';
		$html .= '</li>';

		return new \WP_REST_Response( array( 'html' => $html ), 200 );
	}
}
