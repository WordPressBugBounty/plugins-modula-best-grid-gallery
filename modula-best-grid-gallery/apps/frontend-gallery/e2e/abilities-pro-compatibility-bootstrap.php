<?php
/** Request-scoped package substitution, installed/removed by the owned Local runner. */
defined( 'ABSPATH' ) || exit;
$lock = get_option( 'modula_wordpress_e2e_lock' );
$token = defined( 'WP_CLI' ) && WP_CLI ? getenv( 'MODULA_E2E_RUN' ) : ( $_SERVER['HTTP_X_MODULA_E2E_RUN'] ?? '' );
$profile = defined( 'WP_CLI' ) && WP_CLI ? getenv( 'MODULA_E2E_PRO_PROFILE' ) : ( $_SERVER['HTTP_X_MODULA_E2E_PRO_PROFILE'] ?? '' );
if ( is_array( $lock ) && $token === $lock['run'] && isset( $lock['pro_compatibility_root'] ) && in_array( $profile, array( 'old', 'missing-extensions', 'missing-licensing', 'missing-cache', 'missing-writer', 'missing-uploader', 'missing-watermark', 'below-floor', 'required-argument' ), true ) ) {
	$package = $lock['pro_compatibility_root'] . '/packages/' . $profile . '/Modula.php';
	if ( is_file( $package ) ) {
		add_filter( 'option_active_plugins', static function ( $plugins ) use ( $lock ) { return array_values( array_diff( $plugins, array( $lock['plugins']['pro'] ) ) ); } );
		// Same plugin main and hooks as the real package, before plugins_loaded.
		if ( 'below-floor' === $profile ) { define( 'MODULA_PRO_VERSION', '2.9.99' ); }
		require $package;
	}
}
unset( $lock, $token, $profile, $package );
