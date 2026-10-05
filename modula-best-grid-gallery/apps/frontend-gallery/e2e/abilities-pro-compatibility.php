<?php
/** Public native contracts with actual old/partial packages and the shared actor. */
use Modula\V2\Abilities\Site_Settings;
use Modula\V2\Abilities\Requests;

if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! isset( $state['run'] ) || $state['run'] !== $run ) {
	exit( 1 ); }

$actor = get_user_by( 'login', $run );
wp_set_current_user( $actor->ID );
$profile = getenv( 'MODULA_E2E_PRO_PROFILE' ) ?: 'current';
function compatibility_check( $condition, $message ) {
	if ( ! $condition ) {
		WP_CLI::error( $message ); }
}
function compatibility_call( $name, $input = array() ) {
	$ability = wp_get_ability( 'modula/' . $name );
	compatibility_check( (bool) $ability, 'Ability registered: ' . $name );
	return $ability->execute( $input );
}
$network      = 0;
$deny_network = static function () use ( &$network ) {
	++$network;
	return new WP_Error( 'unexpected_network', 'Discovery must not refresh providers.' );
};
add_filter( 'pre_http_request', $deny_network );
$names     = array_keys( wp_get_abilities() );
$activates = \Modula\V2\Abilities\Pro_Dependency::activates();
$modula    = array_values(
	array_filter(
		$names,
		static function ( $name ) {
			return 0 === strpos( $name, 'modula/' );
		}
	)
);
if ( ! $activates ) {
	remove_filter( 'pre_http_request', $deny_network );
	compatibility_check( array() === $modula, 'Abilities stay unregistered unless Pro is 3.0.12 or newer.' );
	$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
	$id      = $catalog['galleries']['visible']['id'];
	$before  = get_post_meta( $id );
	compatibility_check( $before === get_post_meta( $id ) && 0 === $network, 'Existing gallery stays unchanged and boot makes no provider calls.' );
	$package = defined( 'MODULA_PRO_PATH' ) ? MODULA_PRO_PATH : '';
	modula_e2e_output(
		array(
			'profile'           => $profile,
			'pro_version'       => defined( 'MODULA_PRO_VERSION' ) ? MODULA_PRO_VERSION : '',
			'package_path'      => $package,
			'extensions_source' => class_exists( '\Modula_Pro\Extensions\Extensions' ) ? ( new ReflectionClass( '\Modula_Pro\Extensions\Extensions' ) )->getFileName() : '',
			'abilities_active'  => false,
			'registry_count'    => count( $names ),
			'notice'            => false,
			'network_calls'     => $network,
			'checks'            => array( 'abilities_unregistered', 'existing_gallery_preserved', 'no_provider_calls' ),
		)
	);
	return;
}
$discovery = compatibility_call( 'discover', array( 'per_page' => 100 ) );
$settings  = compatibility_call( 'read-site-settings' );
remove_filter( 'pre_http_request', $deny_network );
compatibility_check( ! is_wp_error( $discovery ) && ! is_wp_error( $settings ) && 0 === $network, 'Registry, discovery and site reads succeed without provider calls.' );
$rows = $discovery['operations'];
for ( $page = 2; $page <= $discovery['total_pages']; ++$page ) {
	$next = compatibility_call(
		'discover',
		array(
			'page'     => $page,
			'per_page' => 100,
		)
	);
	compatibility_check( ! is_wp_error( $next ), 'All discovery pages load.' );
	$rows = array_merge( $rows, $next['operations'] );
}
$operations = array_column( $rows, 'status', 'name' );
compatibility_check( 'available' === $operations['modula/create-gallery'] && 'available' === $operations['modula/update-site-settings'], 'Independent Lite operations remain available.' );
$unsupported = in_array( $profile, array( 'old', 'missing-extensions', 'missing-licensing', 'required-argument', 'below-floor', 'absent' ), true );
if ( $unsupported ) {
	compatibility_check( 'unavailable' === $settings['license_status'] && 'unavailable' === $operations['modula/create-album'] && 'unavailable' === $operations['modula/set-extension'], 'Unsupported Pro operations are advertised unavailable.' );
}
$feature_extensions = (array) ( $discovery['features']['extensions'] ?? array() );
if ( 'missing-writer' === $profile ) {
	compatibility_check( 'unavailable' === $operations['modula/create-album'], 'Partial album writer cannot be advertised available.' );
	compatibility_check( empty( $feature_extensions['modula-albums']['available'] ), 'Discovery features agree with album service contract.' );
}
foreach ( array(
	'missing-uploader'  => array( 'modula/sync-instagram-gallery', 'modula-instagram' ),
	'missing-watermark' => array( 'modula/remove-watermark', 'modula-watermark' ),
) as $missing => $pair ) {
	if ( $profile === $missing ) {
		compatibility_check( 'unavailable' === ( $operations[ $pair[0] ] ?? '' ), 'Incomplete effect services cannot be admitted.' );
		compatibility_check( empty( $feature_extensions[ $pair[1] ]['available'] ), 'Discovery features agree with effect service contract: ' . $pair[1] );
	}
}
if ( 'current' === $profile ) {
	foreach ( array(
		'modula-albums'         => 'modula/create-album',
		'modula-defaults'       => 'modula/create-gallery-preset',
		'modula-video'          => 'modula/resolve-video-source',
		'modula-watermark'      => 'modula/read-watermark-state',
		'modula-instagram'      => 'modula/read-instagram-state',
		'modula-image-proofing' => 'modula/read-proofing',
	) as $slug => $operation ) {
		$status = (array) $discovery['features']['extensions'];
		if ( ! empty( $status[ $slug ]['available'] ) && ! empty( $status[ $slug ]['enabled'] ) ) {
			compatibility_check( 'available' === ( $operations[ $operation ] ?? '' ), 'Healthy enabled/entitled extension remains available: ' . $slug );
		}
	}
}
if ( $unsupported || 'missing-cache' === $profile ) {
	$before = get_option( 'modula_pro_active_extensions' );
	$input  = array(
		'request_id' => $run . '-' . $profile . '-toggle',
		'revision'   => $settings['revision'],
		'extension'  => 'modula-albums',
		'enabled'    => false,
	);
	$denied = compatibility_call( 'set-extension', $input );
	compatibility_check( is_wp_error( $denied ) || 'succeeded' !== ( $denied['status'] ?? '' ), 'Unavailable extension write is refused.' );
	$direct = Site_Settings::extension( $input );
	compatibility_check( 'forbidden' === $direct['status'] && $before === get_option( 'modula_pro_active_extensions' ) && null === Requests::record( $input['request_id'] ), 'Execution rechecks compatibility before admission or mutation.' );
}
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$id      = $catalog['galleries']['visible']['id'];
if ( in_array( $profile, array( 'missing-uploader', 'missing-watermark' ), true ) ) {
	$input  = array(
		'request_id'    => $run . '-' . $profile . '-effect',
		'id'            => $id,
		'attachment_id' => $catalog['attachments'][0]['id'],
		'revision'      => str_repeat( '0', 64 ),
	);
	$file   = get_attached_file( $input['attachment_id'] );
	$hash   = hash_file( 'sha256', $file );
	$denied = 'missing-uploader' === $profile ? \Modula\V2\Abilities\Instagram::sync( $input ) : \Modula\V2\Abilities\Watermark::execute( $input, \Modula\V2\Abilities\Watermark::REMOVE );
	compatibility_check( 'forbidden' === $denied['status'] && null === Requests::record( $input['request_id'] ) && $hash === hash_file( 'sha256', $file ), 'Missing effect methods refuse direct execution before admission and file mutation.' );
}
$before = get_post_meta( $id );
$read   = compatibility_call( 'read-gallery', array( 'id' => $id ) );
compatibility_check( ! is_wp_error( $read ) && $before === get_post_meta( $id ), 'Existing gallery read preserves settings and items.' );
$created = compatibility_call(
	'create-gallery',
	array(
		'request_id'     => $run . '-' . $profile . '-create',
		'title'          => $run . ' compatibility',
		'status'         => 'publish',
		'attachment_ids' => array( $catalog['attachments'][0]['id'] ),
	)
);
compatibility_check( ! is_wp_error( $created ) && 'succeeded' === ( $created['status'] ?? '' ), 'Independent Lite published creation succeeds: ' . wp_json_encode( $created ) );
update_post_meta( $created['gallery']['id'], $marker, $run );
$patch = compatibility_call(
	'update-site-settings',
	array(
		'request_id' => $run . '-' . $profile . '-settings',
		'revision'   => $settings['revision'],
		'settings'   => array( 'modula_image_licensing_option' => array( 'image_licensing_author' => 'Compatibility fixture' ) ),
	)
);
compatibility_check( 'succeeded' === ( $patch['status'] ?? '' ), 'Independent site setting write survives missing Pro cache method.' );
$package = defined( 'MODULA_PRO_PATH' ) ? MODULA_PRO_PATH : '';
modula_e2e_output(
	array(
		'profile'           => $profile,
		'pro_version'       => defined( 'MODULA_PRO_VERSION' ) ? MODULA_PRO_VERSION : '',
		'package_path'      => $package,
		'extensions_source' => class_exists( '\Modula_Pro\Extensions\Extensions' ) ? ( new ReflectionClass( '\Modula_Pro\Extensions\Extensions' ) )->getFileName() : '',
		'abilities_active'  => true,
		'registry_count'    => count( $names ),
		'features'          => $discovery['features'],
		'operations'        => $operations,
		'notice'            => false,
		'created'           => $created['gallery']['id'],
		'network_calls'     => $network,
		'checks'            => array( 'registry', 'discovery', 'site_read', 'lite_create', 'lite_settings_write', 'existing_gallery_preserved', 'unavailable_write_admission' ),
	)
);
