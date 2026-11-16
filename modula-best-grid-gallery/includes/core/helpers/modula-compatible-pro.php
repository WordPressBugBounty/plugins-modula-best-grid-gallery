<?php
/**
 * Compatible Pro: Lite treats Modula Pro as Pro only at version 3.0.0 or newer.
 *
 * The new editors (explicit Save, ADR 0059) have a higher floor for the Pro
 * code that extends them: an older Pro writes the gallery from inside the
 * editor on its own. Below it Pro stays Compatible Pro everywhere else (paid
 * gallery types, the visitor frontend); only its gallery-editor extensions do
 * not load, and the editor asks to update Pro (spec decision 29).
 *
 * @package Modula
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

defined( 'MODULA_COMPATIBLE_PRO_MIN_VERSION' ) || define( 'MODULA_COMPATIBLE_PRO_MIN_VERSION', '3.0.0' );
defined( 'MODULA_EDITOR_PRO_MIN_VERSION' ) || define( 'MODULA_EDITOR_PRO_MIN_VERSION', '3.0.24' );

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
 * Whether Modula Pro is active below the new editors' floor: its
 * gallery-editor extensions do not load in the new gallery editor.
 *
 * @return bool
 */
function modula_has_editor_incompatible_pro() {
	return defined( 'MODULA_PRO_VERSION' )
		&& ! ( modula_is_compatible_pro_version( MODULA_PRO_VERSION )
			&& version_compare( trim( (string) MODULA_PRO_VERSION ), MODULA_EDITOR_PRO_MIN_VERSION, '>=' ) );
}

/**
 * Admin notice copy when Pro is installed below the Compatible Pro floor.
 *
 * @param string $lite_version     Installed Lite version.
 * @param string $pro_version      Installed Pro version.
 * @param string $plugins_url      plugins.php URL.
 * @param string $required_version Pro version required (the Compatible Pro floor by default).
 * @return string
 */
function modula_incompatible_pro_notice_message( $lite_version, $pro_version, $plugins_url, $required_version = MODULA_COMPATIBLE_PRO_MIN_VERSION ) {
	return sprintf(
		/* translators: 1: Modula version, 2: installed Modula Pro version, 3: required Modula Pro version, 4: plugins screen URL */
		__( 'Modula %1$s requires Modula Pro %3$s or newer. You have Modula Pro %2$s. Please <a href="%4$s">update Modula Pro</a>.', 'modula-best-grid-gallery' ),
		esc_html( (string) $lite_version ),
		esc_html( (string) $pro_version ),
		esc_html( (string) $required_version ),
		esc_url( $plugins_url )
	);
}

/**
 * The update prompt the new gallery editor shows while Pro is below the
 * editors' floor (the site-wide prompt's copy, naming that floor).
 *
 * @param string $lite_version Installed Lite version.
 * @param string $plugins_url  plugins.php URL.
 * @return string Empty when Pro may extend the editor (or is not active).
 */
function modula_editor_pro_update_notice( $lite_version, $plugins_url ) {
	if ( ! modula_has_editor_incompatible_pro() ) {
		return '';
	}
	return modula_incompatible_pro_notice_message( $lite_version, MODULA_PRO_VERSION, $plugins_url, MODULA_EDITOR_PRO_MIN_VERSION );
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
