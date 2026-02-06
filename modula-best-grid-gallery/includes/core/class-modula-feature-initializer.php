<?php

/**
 * Feature initializer for Modula plugin.
 *
 * Responsible for initializing plugin features like telemetry, offers, and compatibility checks.
 *
 * @since 2.0.0
 */
class Modula_Feature_Initializer {

	/**
	 * Initialize telemetry integration.
	 *
	 * @since 2.12.20
	 * @return void
	 */
	public function init_telemetry(): void {
		new Modula_Telemetry_Integration();
	}

	/**
	 * Check for compatibility issues.
	 *
	 * @since 2.11.0
	 * @return void
	 */
	public function check_compatibility(): void {
		if ( ! is_admin() || ! class_exists( 'Modula\Ai_Compatibility' ) ) {
			return;
		}

		new Modula\Ai_Compatibility();
	}
}
