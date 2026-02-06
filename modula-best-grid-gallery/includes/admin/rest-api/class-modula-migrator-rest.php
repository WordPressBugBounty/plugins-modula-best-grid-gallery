<?php

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * REST API for Modula migrator plugin install, activate, and deactivate.
 *
 * Only allows whitelisted migrator plugins. Requires install_plugins / activate_plugins.
 *
 * @since 2.2.7
 */
class Modula_Migrator_Rest {

	/**
	 * REST namespace.
	 *
	 * @since 2.2.7
	 * @var string
	 */
	private $namespace = 'modula-best-grid-gallery/v1';

	/**
	 * Constructor. Registers REST routes.
	 *
	 * @since 2.2.7
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register REST routes for migrator install, activate, deactivate.
	 *
	 * @since 2.2.7
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/migrator/install',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'install_plugin' ),
				'permission_callback' => array( $this, 'install_permission_check' ),
				'args'                => array(
					'plugin_slug' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => array( $this, 'validate_plugin_slug' ),
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/migrator/activate',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'activate_plugin' ),
				'permission_callback' => array( $this, 'activate_permission_check' ),
				'args'                => array(
					'plugin' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => array( $this, 'validate_plugin_path' ),
					),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			'/migrator/deactivate',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'deactivate_plugin' ),
				'permission_callback' => array( $this, 'activate_permission_check' ),
				'args'                => array(
					'plugin' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => array( $this, 'validate_plugin_path' ),
					),
				),
			)
		);
	}

	/**
	 * Permission check for install. Requires install_plugins.
	 *
	 * @since 2.2.7
	 * @return bool|\WP_Error
	 */
	public function install_permission_check() {
		if ( ! current_user_can( 'install_plugins' ) ) {
			return new \WP_Error( 'rest_forbidden', __( 'Sorry, you are not allowed to install plugins.', 'modula-best-grid-gallery' ), array( 'status' => 403 ) );
		}
		return true;
	}

	/**
	 * Permission check for activate/deactivate. Requires activate_plugins.
	 *
	 * @since 2.2.7
	 * @return bool|\WP_Error
	 */
	public function activate_permission_check() {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return new \WP_Error( 'rest_forbidden', __( 'Sorry, you are not allowed to activate plugins.', 'modula-best-grid-gallery' ), array( 'status' => 403 ) );
		}
		return true;
	}

	/**
	 * Validate plugin_slug is in the migrator whitelist.
	 *
	 * @since 2.2.7
	 * @param string          $value   Slug value.
	 * @param \WP_REST_Request $request Request object.
	 * @param string          $param   Parameter name.
	 * @return true|\WP_Error
	 */
	public function validate_plugin_slug( $value, $request, $param ) {
		if ( Modula_Migrator_Detector::is_allowed_slug( $value ) ) {
			return true;
		}
		return new \WP_Error( 'invalid_slug', __( 'Plugin slug is not allowed.', 'modula-best-grid-gallery' ) );
	}

	/**
	 * Validate plugin path is in the migrator whitelist.
	 *
	 * @since 2.2.7
	 * @param string          $value   Path value.
	 * @param \WP_REST_Request $request Request object.
	 * @param string          $param   Parameter name.
	 * @return true|\WP_Error
	 */
	public function validate_plugin_path( $value, $request, $param ) {
		if ( Modula_Migrator_Detector::is_allowed_path( $value ) ) {
			return true;
		}
		return new \WP_Error( 'invalid_path', __( 'Plugin path is not allowed.', 'modula-best-grid-gallery' ) );
	}

	/**
	 * Install a migrator plugin from WordPress.org.
	 *
	 * @since 2.2.7
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function install_plugin( $request ) {
		$plugin_slug = $request->get_param( 'plugin_slug' );
		if ( ! Modula_Migrator_Detector::is_allowed_slug( $plugin_slug ) ) {
			return new \WP_Error( 'invalid_slug', __( 'Plugin slug is not allowed.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) );
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
		require_once ABSPATH . 'wp-admin/includes/misc.php';

		$plugin_path = Modula_Migrator_Detector::get_plugin_path( $plugin_slug );
		if ( ! $plugin_path ) {
			return new \WP_Error( 'invalid_slug', __( 'Plugin slug is not allowed.', 'modula-best-grid-gallery' ), array( 'status' => 400 ) );
		}

		// If already installed, return success with plugin_path so client can activate.
		if ( file_exists( WP_PLUGIN_DIR . '/' . $plugin_path ) ) {
			return new \WP_REST_Response(
				array(
					'success'     => true,
					'message'     => __( 'Plugin is already installed.', 'modula-best-grid-gallery' ),
					'plugin_path' => $plugin_path,
				),
				200
			);
		}

		$download_url = 'https://downloads.wordpress.org/plugin/' . $plugin_slug . '.latest-stable.zip';

		$upgrader = new \Plugin_Upgrader( new \Automatic_Upgrader_Skin() );
		$result   = $upgrader->install( $download_url );

		if ( is_wp_error( $result ) ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'message' => $result->get_error_message(),
				),
				200
			);
		}

		if ( ! $result ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'message' => __( 'Installation failed.', 'modula-best-grid-gallery' ),
				),
				200
			);
		}

		return new \WP_REST_Response(
			array(
				'success'     => true,
				'message'     => __( 'Plugin installed.', 'modula-best-grid-gallery' ),
				'plugin_path' => $plugin_path,
			),
			200
		);
	}

	/**
	 * Activate a migrator plugin.
	 *
	 * @since 2.2.7
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function activate_plugin( $request ) {
		$plugin = $request->get_param( 'plugin' );
		if ( ! function_exists( 'activate_plugin' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$result = activate_plugin( $plugin );
		if ( is_wp_error( $result ) ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'message' => $result->get_error_message(),
				),
				200
			);
		}
		return new \WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'Plugin activated.', 'modula-best-grid-gallery' ),
			),
			200
		);
	}

	/**
	 * Deactivate a migrator plugin.
	 *
	 * @since 2.2.7
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response
	 */
	public function deactivate_plugin( $request ) {
		$plugin = $request->get_param( 'plugin' );
		if ( ! function_exists( 'deactivate_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		deactivate_plugins( $plugin );
		return new \WP_REST_Response(
			array(
				'success' => true,
				'message' => __( 'Plugin deactivated.', 'modula-best-grid-gallery' ),
			),
			200
		);
	}
}
