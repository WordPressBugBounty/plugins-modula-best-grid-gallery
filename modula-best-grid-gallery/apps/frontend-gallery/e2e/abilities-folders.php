<?php
/** Native dependency matrix; invoked only through the shared locked fixture runner. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ( $state['run'] ?? '' ) !== getenv( 'MODULA_E2E_RUN' ) ) { exit( 1 ); }
$actor = get_user_by( 'login', $run );
wp_set_current_user( $actor->ID );
$profile = getenv( 'MODULA_E2E_FOLDERS' ) ?: 'available';
function modula_folders_assert( $ok, $message ) {
	if ( ! $ok ) { WP_CLI::error( $message ); }
}
function modula_folders_call( $name, $input = array() ) {
	$ability = wp_get_ability( 'modula/' . $name );
	modula_folders_assert( $ability instanceof WP_Ability, 'Registered: ' . $name );
	return $ability->execute( $input );
}
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$id = $catalog['attachments'][0]['id'];
if ( getenv( 'MODULA_E2E_FOLDERS_PREPARE' ) ) {
	$request = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '-interrupted-batch';
	$revision = modula_folders_call( 'list-favorites' )['revision'];
	$input = array( 'request_id' => $request, 'targets' => array(
		array( 'operation' => 'modula/remove-favorite', 'id' => $id, 'revision' => $revision ),
		array( 'operation' => 'modula/add-favorite', 'id' => $catalog['attachments'][1]['id'], 'revision' => $revision ),
	) );
	$interrupt = static function ( $identity, $index ) use ( $request ) {
		if ( $request === $identity && 0 === $index ) { throw new RuntimeException( 'Owned interruption after a committed target.' ); }
	};
	add_action( 'modula_abilities_batch_target_finished', $interrupt, 10, 2 );
	try { $result = modula_folders_call( 'update-media-batch', $input ); }
	finally { remove_action( 'modula_abilities_batch_target_finished', $interrupt, 10 ); }
	modula_folders_assert( 'succeeded' === $result['targets'][0]['status'] && 'pending' === $result['targets'][1]['status'], 'Interrupted batch retains success and pending target.' );
	modula_e2e_output( array( 'input' => $input, 'result' => $result ) );
	return;
}
if ( 'absent' === $profile ) {
	modula_folders_assert( ! class_exists( '\WPChill\Folders\Folders\Folder_Color' ) && ! class_exists( '\WPChill\Folders\Plugin' ), 'Library classes are actually absent in this WordPress process.' );
} elseif ( 'uninitialized' === $profile ) {
	modula_folders_assert( class_exists( '\WPChill\Folders\Plugin' ) && ! \WPChill\Folders\Plugin::is_loaded(), 'Classes loaded without initialization.' );
}
$discovery = modula_folders_call( 'discover', array( 'per_page' => 100 ) );
modula_folders_assert( ! is_wp_error( $discovery ), 'Native discovery validates.' );
$status = array_column( $discovery['operations'], 'status', 'name' );
$available = in_array( $profile, array( 'available', 'missing-usage' ), true );
modula_folders_assert( ( $available ? 'available' : 'unavailable' ) === $status['modula/list-media-folders'], 'Discovery reports technical availability.' );
modula_folders_assert( ( $available && 'pro' === getenv( 'MODULA_E2E_MODE' ) ? 'available' : 'unavailable' ) === $status['modula/list-collections'], 'Collections retain entitlement gate.' );
modula_folders_assert( ( $available ? 'available' : 'unavailable' ) === $status['modula/list-favorites'], 'Free favorites retain availability.' );
$prefix = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '-' . $profile;
$created = modula_folders_call( 'create-gallery', array( 'request_id' => $prefix . '-native', 'title' => $prefix, 'status' => 'draft', 'attachment_ids' => array( $id ) ) );
modula_folders_assert( 'succeeded' === ( $created['status'] ?? '' ), 'Independent native creation: ' . wp_json_encode( $created ) );
$read = modula_folders_call( 'read-gallery', array( 'id' => $created['gallery']['id'] ) );
modula_folders_assert( ! is_wp_error( $read ) && $read['gallery']['id'] === $created['gallery']['id'], 'Independent native read.' );
foreach ( array( 'list-albums', 'list-gallery-presets', 'list-album-presets' ) as $name ) {
	$result = modula_folders_call( $name );
	modula_folders_assert( 'available' !== $status['modula/' . $name] || ! is_wp_error( $result ), 'Independent availability: ' . $name );
}
$folders = modula_folders_call( 'list-media-folders' );
modula_folders_assert( $available ? ! is_wp_error( $folders ) : is_wp_error( $folders ), 'Native dependent access is controlled.' );
if ( 'available' !== $profile ) {
	$deleted = modula_folders_call( 'delete-attachment', array( 'request_id' => $prefix . '-delete', 'id' => $id, 'revision' => str_repeat( '0', 64 ) ) );
	modula_folders_assert( is_wp_error( $deleted ) && get_post( $id ), 'Unavailable dependency/index cannot authorize deletion.' );
	modula_folders_assert( 'unavailable' === $status['modula/read-attachment-usage'], 'Usage discovery unavailable.' );
}
if ( 'available' === $profile && ( ! defined( 'MEDIA_TRASH' ) || ! MEDIA_TRASH ) ) {
	$trash = modula_folders_call( 'trash-attachment', array( 'request_id' => $prefix . '-trash-off', 'id' => $id, 'revision' => str_repeat( '0', 64 ) ) );
	modula_folders_assert( 'rejected' === ( $trash['status'] ?? '' ) && 'media_trash_disabled' === $trash['code'], 'Existing native trash-disabled outcome is preserved.' );
}
$recovery = array();
foreach ( array( 'folder', 'batch', 'interrupted-batch' ) as $kind ) {
	$request = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . ( 'interrupted-batch' === $kind ? '-' : '-retained-' ) . $kind;
	$result = modula_folders_call( 'recover-request', array( 'request_id' => $request ) );
	$recovery[ $kind ] = $result;
	if ( ! $available ) {
		modula_folders_assert( 'forbidden' === ( 'folder' !== $kind ? ( $result['targets'][0]['status'] ?? '' ) : ( $result['status'] ?? '' ) ), 'Dependency loss safely hides retained ' . $kind );
	}
}
modula_e2e_output( array( 'profile' => $profile, 'gallery_id' => $created['gallery']['id'], 'operations' => $status, 'recovery' => $recovery, 'class_loaded' => class_exists( '\WPChill\Folders\Plugin' ) ) );
