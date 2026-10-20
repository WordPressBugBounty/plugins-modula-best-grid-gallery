<?php
require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-extensions-base.php';
require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-extension-states.php';
require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-password-protected-posts.php';
require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-license-card.php';
require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-settings-sanitizer.php';
require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-insights-base.php';

class Modula_Rest_Api {

	private $namespace = 'modula-best-grid-gallery/v1';
	private $settings  = null;

	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_filter( 'rest_request_after_callbacks', array( $this, 'prevent_response_caching' ), 10, 3 );

		Modula_Extensions_Base::get_instance();

		$this->settings = Modula_Settings::get_instance();

		if ( class_exists( 'Modula_Migrator_Detector' ) ) {
			require_once MODULA_PATH . 'includes/admin/rest-api/class-modula-migrator-rest.php';
			new Modula_Migrator_Rest();
		}
	}

	/**
	 * Exclude this namespace's routes from page caching plugins (stale admin state otherwise).
	 *
	 * @param \WP_REST_Response|\WP_Error $response Result to send to the client.
	 * @param array                       $handler  Route handler used for the request.
	 * @param \WP_REST_Request            $request  Request used to generate the response.
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function prevent_response_caching( $response, $handler, $request ) {
		if ( 0 !== strpos( $request->get_route(), '/' . $this->namespace ) ) {
			return $response;
		}

		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true );
		}

		return $response;
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
				'args'                => array(
					// `tabs`: main tabs and subtabs (current page);
					// `groups`: settings groups → sections → cards (redesign).
					'shape' => array(
						'type'              => 'string',
						'enum'              => array( 'tabs', 'groups' ),
						'default'           => 'tabs',
						'validate_callback' => 'rest_validate_request_arg',
					),
				),
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
				'args'                => array(
					'action'      => array(
						'required'          => true,
						'type'              => 'string',
						'enum'              => Modula_License_Card::ACTIONS,
						'validate_callback' => 'rest_validate_request_arg',
					),
					// Only `activate` reads it; deactivate and check use the saved key.
					'license_key' => array(
						'type'              => 'string',
						'default'           => '',
						'validate_callback' => 'rest_validate_request_arg',
					),
				),
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
			'/password-protected',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_password_protected' ),
				'permission_callback' => array( $this, 'settings_permissions_check' ),
			)
		);

		register_rest_route(
			$this->namespace,
			'/debug-log',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'debug_log_action' ),
				'permission_callback' => array( 'Modula_Debug_Log_Rest', 'permissions_check' ),
				'args'                => array(
					'action' => array(
						'required'          => true,
						'type'              => 'string',
						'enum'              => array( 'enable', 'disable', 'clear' ),
						'sanitize_callback' => 'sanitize_key',
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/debug-log/download',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'debug_log_download' ),
				'permission_callback' => array( 'Modula_Debug_Log_Rest', 'permissions_check' ),
			)
		);
	}

	public function get_settings() {
		return new \WP_REST_Response( $this->settings->get_settings(), 200 );
	}

	public function update_settings( $request ) {
		$settings = $request->get_json_params();

		if ( empty( $settings ) || ! is_array( $settings ) ) {
			Modula_Debug_Log::log_failure(
				Modula_Debug_Log::CHANNEL_SETTINGS_REST,
				'general-settings save rejected: empty body',
				array(
					'route'      => '/modula-best-grid-gallery/v1/general-settings',
					'error_code' => 'empty_body',
					'status'     => 400,
				)
			);
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

			/**
			 * Filter a general-settings option value after schema sanitize, before it is stored.
			 *
			 * @param mixed  $value  Sanitized option value.
			 * @param string $option Option name.
			 */
			$value = apply_filters( 'modula_settings_api_pre_update_' . $option, $value, $option );
			if ( is_wp_error( $value ) ) { return $value; }

			// Diagnostics already persisted through its serialized service in the pre-update hook.
			// A second write here could overwrite a newer command after that lock is released.
			if ( Modula_Debug_Log::OPTION_KEY !== $option ) {
				update_option( $option, $value );
			}

			do_action( 'modula_settings_api_update_' . $option, $value );

			$sanitized_settings[ $option ] = $value;
		}

		return new \WP_REST_Response( $sanitized_settings, 200 );
	}

	/**
	 * Settings tabs, or with `shape=groups` the settings groups → sections →
	 * cards projected from them.
	 *
	 * @param \WP_REST_Request $request Request; `shape` is validated by the route.
	 * @return \WP_REST_Response
	 */
	public function get_tabs( $request ) {
		$tabs = $this->settings->get_tabs();

		if ( 'groups' === $request->get_param( 'shape' ) ) {
			return new \WP_REST_Response( Modula_Settings_Sections::project( $tabs ), 200 );
		}

		return new \WP_REST_Response( $tabs, 200 );
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

	/**
	 * Diagnostics: enable / disable / clear Modula Debug Log.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function debug_log_action( $request ) {
		$action = $request->get_param( 'action' );
		if ( empty( $action ) ) {
			$data   = $request->get_json_params();
			$action = is_array( $data ) && isset( $data['action'] ) ? $data['action'] : '';
		}
		return Modula_Debug_Log_Rest::handle_action( $action );
	}

	/**
	 * Diagnostics: download Modula Debug Log payload.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function debug_log_download( $request ) {
		unset( $request );
		return Modula_Debug_Log_Rest::handle_download();
	}

	/**
	 * License card actions: activate a key, deactivate or check the saved key.
	 * The response is the license projected for the browser, never the full
	 * key (Modula_License_Card::run()).
	 *
	 * @param \WP_REST_Request $request Request; `action` and `license_key` are validated by the route.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function license_action( $request ) {
		$license = Modula_License_Card::handle( $request->get_param( 'action' ), $request->get_param( 'license_key' ) );

		if ( is_wp_error( $license ) ) {
			return $license;
		}

		return new \WP_REST_Response( $license, 200 );
	}

	/**
	 * The extension catalog grouped by plan, each extension with its state on
	 * this site and the plans it can upgrade to (Modula_Extension_Catalog::groups()).
	 *
	 * @return \WP_REST_Response
	 */
	public function get_extensions() {
		$groups = Modula_Extension_Catalog::groups( Modula_Extension_States::for_site(), Modula_License_Card::current_state() );

		return new \WP_REST_Response( $groups, 200 );
	}

	/**
	 * How many galleries and albums have a password: what turning Password
	 * Protect off would remove, for the Extensions page's confirmation.
	 *
	 * @return \WP_REST_Response|\WP_Error `{ count: int }`, or the query failure.
	 */
	public function get_password_protected() {
		$count = Modula_Password_Protected_Posts::count();

		if ( is_wp_error( $count ) ) {
			return $count;
		}

		return new \WP_REST_Response( array( 'count' => $count ), 200 );
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
}
