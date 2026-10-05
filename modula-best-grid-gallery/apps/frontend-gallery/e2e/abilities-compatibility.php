<?php
/**
 * Isolated component compatibility probe. Never loads wp-config.php or a database.
 *
 * This uses actual supplied WordPress source for hooks, ability registration and
 * schema validation. It does not establish installed-site compatibility or
 * authenticated permission behavior; those belong to the shared site journey.
 */

$core = rtrim( $argv[1], '/\\' ) . '/';
$mode = $argv[2];
$repo = dirname( __DIR__, 3 ) . '/';
define( 'ABSPATH', $core );
define( 'WPINC', 'wp-includes' );
define( 'WP_DEBUG', false );
define( 'MODULA_PATH', $repo );
define( 'MODULA_LITE_VERSION', '3.0.12' );
define( 'MODULA_CPT_NAME', 'modula-gallery' );

// Context substitute only: no translation subsystem or DB.
function __( $text, $domain = 'default' ) {
	return $text; }

foreach ( array( 'version.php', 'compat.php', 'utf8.php', 'load.php', 'plugin.php', 'functions.php', 'formatting.php', 'shortcodes.php', 'class-wp-error.php', 'rest-api.php' ) as $file ) {
	require $core . WPINC . '/' . $file;
}
add_filter(
	'pre_option_blog_charset',
	function () {
		return 'UTF-8';
	}
);
function compatibility_assert( $condition, $message ) {
	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
}
compatibility_assert( '6.9' === $wp_version, 'Expected official WordPress 6.9 source.' );

if ( 'native' === $mode ) {
	foreach ( array( 'class-wp-ability.php', 'class-wp-abilities-registry.php', 'class-wp-ability-category.php', 'class-wp-ability-categories-registry.php' ) as $file ) {
		require $core . WPINC . '/abilities-api/' . $file;
	}
	require $core . WPINC . '/abilities-api.php';
} else {
	compatibility_assert( 'absent' === $mode, 'Unknown compatibility mode.' );
	compatibility_assert( ! function_exists( 'wp_register_ability' ), 'Abilities API must be absent in this fresh process.' );
}

require $repo . 'includes/public/shortcode/class-modula-item-data-processor.php';
require $repo . 'includes/v2/bootstrap.php';

// The migration needs a real DB. The shared-site suite owns its lifecycle.
remove_action( 'init', array( 'Modula\\V2\\Beta_Settings', 'maybe_migrate' ), 1 );
do_action( 'init' );
compatibility_assert( shortcode_exists( 'modula' ) && shortcode_exists( 'Modula' ), 'Ordinary Modula shortcode registration survived boot.' );
compatibility_assert( false !== has_action( 'rest_api_init', array( 'Modula\\V2\\Rest\\Settings_Controller', 'register_routes' ) ), 'Ordinary gallery REST registration survived boot.' );
compatibility_assert( false !== has_action( 'save_post_modula-gallery', array( 'Modula\\V2\\Meta_Sync', 'on_save_gallery' ) ), 'Ordinary gallery save hook survived boot.' );
compatibility_assert( false !== has_filter( 'modula_use_modern_shortcode', array( 'Modula\\V2\\Beta_Settings', 'filter_modern_shortcode' ) ), 'Beta routing survived boot.' );

$checks = array( 'v2_boot', 'ordinary_shortcode_registration', 'ordinary_rest_hook', 'ordinary_save_hook', 'beta_routing_hook' );
if ( 'absent' === $mode ) {
	compatibility_assert( false === has_action( 'wp_abilities_api_init' ), 'Absent API must not register ability initialization.' );
	compatibility_assert( false === has_action( 'wp_abilities_api_categories_init' ), 'Absent API must not register category initialization.' );
	$checks[] = 'api_absent_no_ability_hooks';
} else {
	compatibility_assert( ! defined( 'MODULA_PRO_VERSION' ), 'This probe boots Lite without Pro.' );
	$modula = array_values(
		array_filter(
			array_keys( wp_get_abilities() ),
			static function ( $name ) {
				return 0 === strpos( $name, 'modula/' );
			}
		)
	);
	compatibility_assert( array() === $modula, 'Lite without Pro 3.0.12 does not register Modula abilities.' );
	compatibility_assert( false === has_action( 'wp_abilities_api_init', array( 'Modula\\V2\\Abilities\\Integration', 'register_abilities' ) ), 'Lite without Pro does not hook ability registration.' );
	$checks[] = 'lite_without_pro_leaves_abilities_inactive';
}

echo json_encode(
	array(
		'mode'                => $mode,
		'core_source_version' => $wp_version,
		'php'                 => PHP_VERSION,
		'checks'              => $checks,
		'database_loaded'     => false,
		'limits'              => array( 'Component boot only; wp-config.php and database are never loaded.', 'Translation and UTF-8 charset context are supplied; this is a non-admin request.', 'Database migration callback is skipped.', 'No installed WordPress 6.9 site, MCP transport, successful gallery read or authenticated actor is proven by this probe.' ),
	)
);
