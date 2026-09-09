<?php
/**
 * Modula v2 autoloader.
 * PSR-4-like: Modula\V2\* → includes/v2/, class name → class-{lowercase}.php
 *
 * @package Modula
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

spl_autoload_register(
	function ( $class_name ) {
		$prefix = 'Modula\\V2\\';
		$len    = strlen( $prefix );

		if ( strncmp( $prefix, $class_name, $len ) !== 0 ) {
			return;
		}

		$relative_class = substr( $class_name, $len );
		$path           = str_replace( '\\', DIRECTORY_SEPARATOR, $relative_class );
		$path_lower     = strtolower( $path );
		// WordPress file convention: class-meta-sync.php not class-meta_sync.php.
		$path_lower     = str_replace( '_', '-', $path_lower );
		$base_path      = MODULA_PATH . 'includes/v2' . DIRECTORY_SEPARATOR;
		$dir            = dirname( $path_lower );
		$basename       = basename( $path_lower );

		$file = $base_path . ( '.' === $dir ? '' : $dir . DIRECTORY_SEPARATOR ) . 'class-' . $basename . '.php';

		if ( file_exists( $file ) ) {
			require_once $file;
		}
	}
);
