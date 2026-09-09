<?php
/**
 * Thin Modula host bootstrap for wpchill-folders (outside the copy unit).
 *
 * @package Modula
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Host config for the portable media-folder library.
 *
 * Lite does not set storage entitlement; Modula Pro bootstrap does.
 *
 * @return array
 */
function modula_wpchill_folders_host_config() {
	return array(
		'text_domain'  => 'modula-best-grid-gallery',
		'capability'   => 'upload_files',
		'asset_url'    => MODULA_URL . 'wpchill-folders/build/',
		'asset_path'   => MODULA_PATH . 'wpchill-folders/build/',
		'object_types' => array( 'attachment' ),
	);
}

/**
 * Load and init the portable media-folder library.
 *
 * @return void
 */
function modula_bootstrap_wpchill_folders() {
	$entry = MODULA_PATH . 'wpchill-folders/wpchill-folders.php';
	if ( ! is_readable( $entry ) ) {
		return;
	}

	require_once $entry;

	if ( ! function_exists( 'wpchill_folders_init' ) ) {
		return;
	}

	if ( function_exists( 'did_action' ) && did_action( 'plugins_loaded' ) ) {
		modula_init_wpchill_folders();
		return;
	}

	if ( function_exists( 'add_action' ) ) {
		add_action( 'plugins_loaded', 'modula_init_wpchill_folders', 10 );
		return;
	}

	modula_init_wpchill_folders();
}

/**
 * Call wpchill_folders_init() with the Lite host config (storage omitted / off).
 *
 * @return void
 */
function modula_init_wpchill_folders() {
	if ( ! function_exists( 'wpchill_folders_init' ) ) {
		return;
	}

	wpchill_folders_init( modula_wpchill_folders_host_config() );
}

modula_bootstrap_wpchill_folders();
