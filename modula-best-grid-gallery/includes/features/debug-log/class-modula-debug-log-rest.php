<?php
/**
 * REST adapter for Modula Debug Log (Diagnostics Download / Clear / enable side-effects).
 *
 * @package Modula
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Modula_Debug_Log_Rest
 */
class Modula_Debug_Log_Rest {

	/**
	 * Capability gate for Diagnostics actions.
	 *
	 * @return bool
	 */
	public static function permissions_check() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Handle enable | disable | clear.
	 *
	 * @param string $action Action name.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function handle_action( $action ) {
		if ( ! self::permissions_check() ) {
			return new WP_Error(
				'modula_debug_log_forbidden',
				__( 'Sorry, you are not allowed to manage Modula Debug Log.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		$action = sanitize_key( (string) $action );
		$log    = Modula_Debug_Log::get_instance();

		switch ( $action ) {
			case 'enable':
				$log->enable();
				break;
			case 'disable':
				$log->disable();
				break;
			case 'clear':
				$log->clear();
				break;
			default:
				return new WP_Error(
					'modula_debug_log_bad_action',
					__( 'Unknown Modula Debug Log action.', 'modula-best-grid-gallery' ),
					array( 'status' => 400 )
				);
		}

		return new WP_REST_Response(
			array(
				'ok'     => true,
				'action' => $action,
				'status' => $log->get_status(),
			),
			200
		);
	}

	/**
	 * Stream download payload as an attachment response.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function handle_download() {
		if ( ! self::permissions_check() ) {
			return new WP_Error(
				'modula_debug_log_forbidden',
				__( 'Sorry, you are not allowed to download Modula Debug Log.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		$payload = Modula_Debug_Log::get_instance()->get_download_payload();
		if ( null === $payload ) {
			return new WP_Error(
				'modula_debug_log_empty',
				__( 'Modula Debug Log is empty.', 'modula-best-grid-gallery' ),
				array( 'status' => 404 )
			);
		}

		$response = new WP_REST_Response( $payload, 200 );
		$response->header( 'Content-Disposition', 'attachment; filename="' . $payload['filename'] . '"' );

		return $response;
	}
}
