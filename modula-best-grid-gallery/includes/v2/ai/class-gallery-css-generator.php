<?php
/** Shared CSS provider operation. Callers own authorization and persistence. */
namespace Modula\V2\Ai;

defined( 'ABSPATH' ) || exit;
final class Gallery_Css_Generator {
	/** Return a provider proposal; never mutate gallery settings or shared media. */
	public static function generate( int $gallery_id, string $prompt, array $settings ) {
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
			if ( is_array( $data ) && ! empty( $data['message'] ) && is_string( $data['message'] ) ) {
				$message = (string) $data['message'];
			} elseif ( is_array( $data ) && ! empty( $data['error'] ) && is_string( $data['error'] ) ) {
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

		if ( ! array_key_exists( 'code', $data ) || ! is_string( $data['code'] ) ) {
			return new \WP_Error( 'modula_css_ai_invalid_response', __( 'Invalid response from CSS generation service.', 'modula-best-grid-gallery' ), array( 'status' => 502 ) );
		}
		$code = isset( $data['code'] ) ? trim( $data['code'] ) : '';
		if ( '' !== $code ) {
			// The same rule the settings save applies to Custom CSS.
			$data['code'] = trim( \Modula_Helper::sanitize_custom_css( $code ) );
		}

		return $data;
	}
}
