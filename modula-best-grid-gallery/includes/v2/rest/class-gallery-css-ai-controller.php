<?php
/**
 * REST: AI-assisted custom CSS generation for a gallery.
 *
 * @package Modula
 */

namespace Modula\V2\Rest;

use Modula\V2\Ai\Gallery_Css_Context;

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

		$gallery_context = Gallery_Css_Context::build( $gallery_id, $settings );
		$capabilities    = array(
			'isPro' => modula_is_compatible_pro(),
		);

		$response = wp_remote_post(
			trailingslashit( MODULA_AI_ENDPOINT ) . 'gallery-css-contract/generate',
			array(
				'headers' => array(
					'Content-Type' => 'application/json',
				),
				'body'    => wp_json_encode(
					array(
						'userPrompt'     => $prompt,
						'galleryContext' => $gallery_context,
						'capabilities'   => $capabilities,
					)
				),
				'timeout' => 60,
			)
		);

		if ( is_wp_error( $response ) ) {
			return new \WP_Error(
				'modula_css_ai_request_failed',
				$response->get_error_message(),
				array( 'status' => 502 )
			);
		}

		$status = (int) wp_remote_retrieve_response_code( $response );
		$body   = wp_remote_retrieve_body( $response );
		$data   = json_decode( $body, true );

		if ( $status < 200 || $status >= 300 ) {
			$message = __( 'Custom CSS generation failed.', 'modula-best-grid-gallery' );
			if ( is_array( $data ) && ! empty( $data['message'] ) ) {
				$message = (string) $data['message'];
			} elseif ( is_array( $data ) && ! empty( $data['error'] ) ) {
				$message = (string) $data['error'];
			}

			return new \WP_Error(
				'modula_css_ai_upstream_error',
				$message,
				array(
					'status' => $status > 0 ? $status : 502,
					'data'   => $data,
				)
			);
		}

		if ( ! is_array( $data ) ) {
			return new \WP_Error(
				'modula_css_ai_invalid_response',
				__( 'Invalid response from CSS generation service.', 'modula-best-grid-gallery' ),
				array( 'status' => 502 )
			);
		}

		$code = isset( $data['code'] ) ? trim( (string) $data['code'] ) : '';
		if ( '' !== $code ) {
			$data['code'] = self::sanitize_generated_css( $code );
		}

		return rest_ensure_response( $data );
	}

	/**
	 * Strip obviously unsafe CSS constructs before returning to the editor.
	 *
	 * @param string $css Generated CSS.
	 * @return string
	 */
	private static function sanitize_generated_css( $css ) {
		$patterns = array(
			'/@import\b[^;]+;?/i',
			'/expression\s*\([^)]*\)/i',
			'/javascript\s*:/i',
			'/behavior\s*:\s*[^;]+;?/i',
			'/<\s*script\b[^>]*>.*?<\s*\/\s*script\s*>/is',
		);

		$clean = (string) $css;
		foreach ( $patterns as $pattern ) {
			$clean = preg_replace( $pattern, '', $clean );
		}

		return trim( $clean );
	}
}
