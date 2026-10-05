<?php
/** Isolated schema regression: no WordPress bootstrap, site config or debug.log. */
define( 'ABSPATH', __DIR__ . '/' );
define( 'MODULA_PATH', dirname( __DIR__, 3 ) . '/' );
require MODULA_PATH . 'includes/v2/autoload.php';
set_error_handler( static function ( $level, $message ) { throw new RuntimeException( $message ); } );
try {
	$definitions = \Modula\V2\Abilities\Collections::definitions();
	if ( ! isset( $definitions['modula/create-collection'] ) ) {
		throw new RuntimeException( 'Controlled unavailable operations retain their identities.' );
	}
	echo "PASS: collection schemas without Folders classes\n";
} catch ( Throwable $error ) {
	fwrite( STDERR, get_class( $error ) . ': ' . $error->getMessage() . "\n" );
	exit( 1 );
}
