<?php
/**
 * REST: AI-assisted custom CSS generation for a gallery.
 *
 * @package Modula
 */

namespace Modula\V2\Rest;

defined( 'ABSPATH' ) || exit;

/**
 * Class Gallery_Css_Ai_Controller
 */
class Gallery_Css_Ai_Controller {

	const NAMESPACE = Settings_Controller::NAMESPACE;

	/**
	 * Register REST routes.
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Register routes.
	 */
	public static function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/gallery/(?P<id>\d+)/generate-custom-css',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'generate_custom_css' ),
				'permission_callback' => array( Settings_Controller::class, 'check_gallery_edit' ),
				'args'                => array(
					'id'         => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return $param > 0;
						},
					),
					'userPrompt' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_textarea_field',
					),
				),
			)
		);
	}

	/**
	 * Proxy custom CSS generation to wpchill AI service.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function generate_custom_css( $request ) {
		$gallery_id = (int) $request['id'];
		$prompt     = trim( (string) $request->get_param( 'userPrompt' ) );

		if ( '' === $prompt ) {
			return new \WP_Error(
				'modula_css_ai_empty_prompt',
				__( 'Please describe the CSS changes you want.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		$settings = \Modula\V2\Meta_Sync::get_settings_v2( $gallery_id );
		if ( ! is_array( $settings ) ) {
			$settings = array();
		}

		return rest_ensure_response( \Modula\V2\Ai\Gallery_Css_Generator::generate( $gallery_id, $prompt, $settings ) );
	}
}
