<?php
/**
 * Compatible Pro: Lite treats Modula Pro as Pro only at version 3.0.0 or newer.
 *
 * @package Modula
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

defined( 'MODULA_COMPATIBLE_PRO_MIN_VERSION' ) || define( 'MODULA_COMPATIBLE_PRO_MIN_VERSION', '3.0.0' );

/**
 * Whether a Pro version string is Compatible Pro.
 *
 * @param mixed $pro_version Version string (typically MODULA_PRO_VERSION).
 * @return bool
 */
function modula_is_compatible_pro_version( $pro_version ) {
	if ( ! is_scalar( $pro_version ) ) {
		return false;
	}

	$pro_version = trim( (string) $pro_version );
	if ( '' === $pro_version ) {
		return false;
	}

	return version_compare( $pro_version, MODULA_COMPATIBLE_PRO_MIN_VERSION, '>=' );
}

/**
 * Whether Compatible Pro is active.
 *
 * @return bool
 */
function modula_is_compatible_pro() {
	return defined( 'MODULA_PRO_VERSION' ) && modula_is_compatible_pro_version( MODULA_PRO_VERSION );
}

/**
 * Whether Modula Pro is active below the Compatible Pro floor.
 *
 * @return bool
 */
function modula_has_incompatible_pro() {
	return defined( 'MODULA_PRO_VERSION' ) && ! modula_is_compatible_pro_version( MODULA_PRO_VERSION );
}

/**
 * Admin notice copy when Pro is installed below the Compatible Pro floor.
 *
 * @param string $lite_version Installed Lite version.
 * @param string $pro_version  Installed Pro version.
 * @param string $plugins_url  plugins.php URL.
 * @return string
 */
function modula_incompatible_pro_notice_message( $lite_version, $pro_version, $plugins_url ) {
	return sprintf(
		/* translators: 1: Modula version, 2: installed Modula Pro version, 3: required Modula Pro version, 4: plugins screen URL */
		__( 'Modula %1$s requires Modula Pro %3$s or newer. You have Modula Pro %2$s. Please <a href="%4$s">update Modula Pro</a>.', 'modula-best-grid-gallery' ),
		esc_html( (string) $lite_version ),
		esc_html( (string) $pro_version ),
		esc_html( MODULA_COMPATIBLE_PRO_MIN_VERSION ),
		esc_url( $plugins_url )
	);
}

/**
 * Site-wide error notice: update Modula Pro. Not dismissible.
 *
 * @return void
 */
function modula_incompatible_pro_admin_notice() {
	if ( ! modula_has_incompatible_pro() ) {
		return;
	}

	if ( ! current_user_can( 'update_plugins' ) && ! current_user_can( 'activate_plugins' ) ) {
		return;
	}

	$lite_version = defined( 'MODULA_LITE_VERSION' ) ? MODULA_LITE_VERSION : '';
	$pro_version  = defined( 'MODULA_PRO_VERSION' ) ? MODULA_PRO_VERSION : '';
	$message      = modula_incompatible_pro_notice_message( $lite_version, $pro_version, admin_url( 'plugins.php' ) );

	if ( function_exists( 'wp_admin_notice' ) ) {
		wp_admin_notice(
			$message,
			array(
				'type'        => 'error',
				'dismissible' => false,
			)
		);
		return;
	}

	echo '<div class="notice notice-error"><p>' . wp_kses_post( $message ) . '</p></div>';
}
