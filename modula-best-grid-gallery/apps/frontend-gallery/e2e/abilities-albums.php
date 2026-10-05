<?php
/** Album abilities through the real native API and owned fixture lifecycle. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! isset( $state['run'] ) || $state['run'] !== getenv( 'MODULA_E2E_RUN' ) ) { exit( 1 ); }
$actor = get_user_by( 'login', $run );
wp_set_current_user( $actor->ID );
function modula_album_assert( $ok, $message ) { if ( ! $ok ) { WP_CLI::error( $message ); } }
$abilities = wp_get_abilities();
modula_album_assert( isset( $abilities['modula/duplicate-album'] ), 'Native album lifecycle must be registered.' );
modula_album_assert( isset( $abilities['modula/update-album-members'] ), 'Native album membership operation must be registered.' );
modula_album_assert( isset( $abilities['modula/create-album-preset'] ), 'Native album preset lifecycle must be registered.' );
modula_album_assert( isset( $abilities['modula/create-album'] ), 'Native create-album must be registered.' );
$prefix = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '-' . $action;
$input = array( 'request_id' => $prefix . '-create', 'title' => 'Native album', 'status' => 'draft' );
$out = $abilities['modula/create-album']->execute( $input );
if ( 'lite' === getenv( 'MODULA_E2E_MODE' ) ) {
 modula_album_assert( 'forbidden' === $out['status'] && ! isset( $out['album'] ), 'Lite refuses unavailable Albums without a partial object.' );
 modula_album_assert( 'forbidden' === $abilities['modula/create-album-preset']->execute( array( 'request_id' => $prefix . '-preset-denied', 'title' => 'Denied', 'status' => 'draft', 'sorting' => 'manual', 'settings' => array() ) )['status'], 'Lite refuses album preset creation.' );
 modula_e2e_output( array( 'unavailable' => $out, 'adapter_loaded' => class_exists( '\WP\MCP\Core\McpAdapter' ) ) ); return;
}
$preset_input = array( 'request_id' => $prefix . '-preset', 'title' => 'Native album preset', 'status' => 'publish', 'settings' => array( 'layout' => array( 'gutter' => 23 ) ), 'sorting' => 'manual' );
$preset = $abilities['modula/create-album-preset']->execute( $preset_input );
modula_album_assert( 'succeeded' === ( $preset['status'] ?? '' ), 'Album preset creation succeeds: ' . wp_json_encode( $preset ) );
update_post_meta( $preset['preset']['id'], $marker, $run );
modula_album_assert( $preset === $abilities['modula/create-album-preset']->execute( $preset_input ), 'Album preset replay preserves identity.' );
$preset_read = $abilities['modula/read-album-preset']->execute( array( 'id' => $preset['preset']['id'] ) );
modula_album_assert( 23 === $preset_read['preset']['settings']['layout']['gutter'], 'Album preset read returns saved settings.' );
modula_album_assert( 'succeeded' === ( $out['status'] ?? '' ), 'Create Beta album: ' . wp_json_encode( $out ) );
$id = $out['album']['id']; update_post_meta( $id, $marker, $run );
modula_album_assert( $out === $abilities['modula/create-album']->execute( $input ), 'Creation replay returns original object.' );
$read = $abilities['modula/read-album']->execute( array( 'id' => $id ) );
modula_album_assert( 'draft' === $read['album']['status'] && ! empty( $read['album']['settings'] ), 'Creation defaults and explicit draft survive read.' );
$missing = $input; $missing['request_id'] .= '-missing'; unset( $missing['status'] );
modula_album_assert( 'rejected' === $abilities['modula/create-album']->execute( $missing )['status'], 'Publication intent is mandatory.' );
$changed = $input; $changed['title'] = 'Changed identity';
modula_album_assert( 'request_payload_mismatch' === $abilities['modula/create-album']->execute( $changed )['code'], 'Changed input cannot reuse creation identity.' );
// Seed server-owned sparse configuration; a public PATCH must preserve it.
rest_get_server();
$stored = \Modula_Pro\Extensions\Albums\V2\Meta_Sync::get_settings_v2( $id );
$stored['integrationOwned'] = array( 'retained' => 'keep-this' );
update_post_meta( $id, 'modula_album_settings_v2', wp_slash( wp_json_encode( $stored ) ) );
$read = $abilities['modula/read-album']->execute( array( 'id' => $id ) );
$patch = array( 'request_id' => $prefix . '-patch', 'id' => $id, 'revision' => $read['album']['revision'], 'metadata' => array( 'title' => 'Updated native album', 'status' => 'publish' ), 'settings' => array( 'layout' => array( 'gutter' => 29 ) ) );
$patched = $abilities['modula/update-album']->execute( $patch );
modula_album_assert( 'succeeded' === $patched['status'], 'Album patch succeeds: ' . wp_json_encode( $patched ) );
modula_album_assert( 'keep-this' === ( rest_do_request( '/modula/v2/album/' . $id . '/settings' )->get_data()['integrationOwned']['retained'] ?? '' ), 'Album patch preserves unrequested server configuration.' );
modula_album_assert( 29 === $abilities['modula/read-album']->execute( array( 'id' => $id ) )['album']['settings']['layout']['gutter'], 'Album settings persist through public read.' );
modula_album_assert( $patched === $abilities['modula/recover-request']->execute( array( 'request_id' => $patch['request_id'] ) ), 'Album recovery uses album permissions.' );
$stale = $patch; $stale['request_id'] .= '-stale';
modula_album_assert( 'conflict' === $abilities['modula/update-album']->execute( $stale )['status'], 'Stale album revision is refused.' );
$invalid = $patch; $invalid['request_id'] .= '-invalid'; $invalid['settings']['layout']['gutter'] = 'bad';
modula_album_assert( 'rejected' === $abilities['modula/update-album']->execute( $invalid )['status'], 'Invalid setting rejects complete target.' );
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$protected = $catalog['albums']['betaProtected']['id'];
rest_get_server();
$before = rest_do_request( '/modula/v2/album/' . $protected . '/members' )->get_data();
$before_read = $abilities['modula/read-album']->execute( array( 'id' => $protected ) );
modula_album_assert( false === strpos( wp_json_encode( $before_read ), $catalog['albums']['betaProtected']['password'] ), 'Album read does not reveal password.' );
$protected_patch = array( 'request_id' => $prefix . '-protected', 'id' => $protected, 'revision' => $before_read['album']['revision'], 'metadata' => array( 'title' => 'Protected native album' ), 'settings' => array( 'layout' => array( 'gutter' => 28 ) ) );
$p = $abilities['modula/update-album']->execute( $protected_patch );
modula_album_assert( 'succeeded' === $p['status'], 'Protected patch succeeds: ' . wp_json_encode( $p ) );
modula_album_assert( get_post( $protected )->post_password === $catalog['albums']['betaProtected']['password'] && $before === rest_do_request( '/modula/v2/album/' . $protected . '/members' )->get_data(), 'Metadata/settings preserve password and members.' );
$password_warnings = array();
set_error_handler( static function ( $level, $message ) use ( &$password_warnings ) { if ( E_WARNING === $level ) { $password_warnings[] = $message; return true; } return false; } );
try { $password_form = get_the_password_form( $protected ); } finally { restore_error_handler(); }
modula_album_assert( ! $password_warnings && false !== strpos( $password_form, 'type="password"' ), 'Sparse protected album renders its password form without PHP warnings.' );
$denied = static function ( $caps, $cap, $user, $args ) use ( $protected ) { return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $protected ? array( 'do_not_allow' ) : $caps; };
add_filter( 'map_meta_cap', $denied, 10, 4 );
$recovered = $abilities['modula/recover-request']->execute( array( 'request_id' => $protected_patch['request_id'] ) );
modula_album_assert( 'forbidden' === $recovered['status'] && ! isset( $recovered['album'] ), 'Revoked album access redacts recovery.' );
remove_filter( 'map_meta_cap', $denied );
$classic = modula_e2e_insert( array( 'post_type' => 'modula-album', 'post_status' => 'draft', 'post_title' => 'Classic test album' ) );
modula_album_assert( is_wp_error( $abilities['modula/read-album']->execute( array( 'id' => $classic ) ) ), 'Classic album stays unsupported.' );
$page = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Native album public', 'post_content' => $out['album']['shortcode'] ) );
// Album preset update/delete share revisions, current permissions and durable outcomes.
$preset_id = $preset['preset']['id'];
$preset_update = array( 'request_id' => $prefix . '-preset-update', 'id' => $preset_id, 'revision' => $preset_read['preset']['revision'], 'settings' => array( 'layout' => array( 'gutter' => 31 ) ), 'title' => 'Updated album preset' );
$preset_updated = $abilities['modula/update-album-preset']->execute( $preset_update );
modula_album_assert( 'succeeded' === $preset_updated['status'], 'Preset update succeeds: ' . wp_json_encode( $preset_updated ) );
$stale_preset = $preset_update; $stale_preset['request_id'] .= '-stale';
modula_album_assert( 'conflict' === $abilities['modula/update-album-preset']->execute( $stale_preset )['status'], 'Preset rejects stale revision.' );
$invalid_preset = $preset_update; $invalid_preset['request_id'] .= '-invalid'; $invalid_preset['settings']['layout']['gutter'] = 'wrong';
modula_album_assert( 'rejected' === $abilities['modula/update-album-preset']->execute( $invalid_preset )['status'], 'Invalid preset settings reject entire patch.' );
$chooser = rest_do_request( '/modula-defaults/v1/album-presets' )->get_data()['presets'];
modula_album_assert( in_array( $preset_id, array_column( $chooser, 'id' ), true ), 'Created preset is discoverable by the existing apply flow.' );
$before_members = rest_do_request( '/modula/v2/album/' . $protected . '/members' )->get_data();
modula_album_assert( $before_members === $before, 'Preset CRUD never applies to an existing album.' );
$deny_preset = static function ( $caps, $cap, $user, $args ) use ( $preset_id ) { return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $preset_id ? array( 'do_not_allow' ) : $caps; };
add_filter( 'map_meta_cap', $deny_preset, 10, 4 );
modula_album_assert( 'forbidden' === $abilities['modula/recover-request']->execute( array( 'request_id' => $preset_update['request_id'] ) )['status'], 'Preset recovery rechecks current object access.' );
remove_filter( 'map_meta_cap', $deny_preset );
// Existing explicit apply flow must preserve protection omitted by this new preset.
$apply_request = new WP_REST_Request( 'POST', '/modula-defaults/v1/albums/' . $protected . '/apply/' . $preset_id );
$applied_preset = rest_do_request( $apply_request );
modula_album_assert( 200 === $applied_preset->get_status() && get_post( $protected )->post_password === $catalog['albums']['betaProtected']['password'], 'Applying newly updated layout-only preset preserves album password.' );
$blocked_flat = static function ( $check, $object_id, $meta_key ) use ( $preset_id ) { return $object_id === $preset_id && 'modula-album-settings' === $meta_key ? true : $check; };
add_filter( 'update_post_metadata', $blocked_flat, 10, 3 );
$fault_input = $preset_update; $fault_input['request_id'] .= '-flat-failure'; $fault_input['revision'] = $preset_updated['preset']['revision']; $fault_input['settings']['layout']['gutter'] = 49;
$fault_out = $abilities['modula/update-album-preset']->execute( $fault_input );
remove_filter( 'update_post_metadata', $blocked_flat );
modula_album_assert( 'uncertain' === $fault_out['status'], 'Failed flat carrier confirmation cannot report success.' );
modula_album_assert( 31 === $abilities['modula/read-album-preset']->execute( array( 'id' => $preset_id ) )['preset']['settings']['layout']['gutter'], 'Failed carrier write rolls back both representations.' );
$delete_preset = array( 'request_id' => $prefix . '-preset-delete', 'id' => $preset_id, 'revision' => $preset_updated['preset']['revision'] );
$deleted_preset = $abilities['modula/delete-album-preset']->execute( $delete_preset );
modula_album_assert( 'succeeded' === $deleted_preset['status'] && ! get_post( $preset_id ), 'Preset is permanently deleted.' );
modula_album_assert( $deleted_preset === $abilities['modula/delete-album-preset']->execute( $delete_preset ), 'Deleted preset outcome remains recoverable without another delete.' );

$member_id = $catalog['galleries']['visible']['id'];
$members_read = $abilities['modula/read-album-members']->execute( array( 'id' => $id ) );
modula_album_assert( ! is_wp_error( $members_read ), 'Member read succeeds.' );
$member_input = array( 'request_id' => $prefix . '-members', 'id' => $id, 'revision' => $members_read['revision'], 'members' => array( array( 'id' => $member_id, 'itemType' => 'modula-gallery', 'width' => 3, 'height' => 2, 'gridX' => 0, 'gridY' => 0 ) ) );
$members_out = $abilities['modula/update-album-members']->execute( $member_input );
modula_album_assert( 'succeeded' === $members_out['status'], 'Membership succeeds: ' . wp_json_encode( $members_out ) );
modula_album_assert( $members_out === $abilities['modula/update-album-members']->execute( $member_input ), 'Membership replay does not add duplicates.' );
$public_members = rest_do_request( '/modula/v2/album/' . $id . '/members' )->get_data();
modula_album_assert( 1 === count( $public_members['members'] ) && 3 === $public_members['members'][0]['width'], 'Editor REST sees persisted member layout.' );
$stale_members = $member_input; $stale_members['request_id'] .= '-stale';
modula_album_assert( 'conflict' === $abilities['modula/update-album-members']->execute( $stale_members )['status'], 'Stale member write conflicts.' );
$make_album = static function ( $suffix ) use ( $abilities, $prefix, $marker, $run ) {
 $result = $abilities['modula/create-album']->execute( array( 'request_id' => $prefix . '-' . $suffix, 'title' => $suffix, 'status' => 'draft' ) );
 modula_album_assert( 'succeeded' === $result['status'], 'Create owned nested album.' );
 update_post_meta( $result['album']['id'], $marker, $run ); return $result['album']['id'];
};
$child = $make_album( 'nested-child' ); $other = $make_album( 'previous-parent' );
$set_members = static function ( $album, $rows, $suffix ) use ( $abilities, $prefix ) {
 $read = $abilities['modula/read-album-members']->execute( array( 'id' => $album ) );
 modula_album_assert( ! is_wp_error( $read ), 'Read members for mutation.' );
 return $abilities['modula/update-album-members']->execute( array( 'request_id' => $prefix . '-' . $suffix, 'id' => $album, 'revision' => $read['revision'], 'members' => $rows ) );
};
$child_row = array( 'id' => $child, 'itemType' => 'modula-album' );
modula_album_assert( 'succeeded' === $set_members( $other, array( $child_row ), 'first-parent' )['status'], 'Add nested child.' );
$deny_parent = static function ( $caps, $cap, $user, $args ) use ( $other ) { return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $other ? array( 'do_not_allow' ) : $caps; };
add_filter( 'map_meta_cap', $deny_parent, 10, 4 );
$denied_parent = $set_members( $id, array( $child_row ), 'denied-parent' );
modula_album_assert( 'rejected' === $denied_parent['status'] && (int) get_post( $child )->post_parent === $other, 'Inaccessible previous parent rejects reparenting without effects.' );
remove_filter( 'map_meta_cap', $deny_parent );
$move = $set_members( $id, array( $child_row ), 'move-child' );
modula_album_assert( 'succeeded' === $move['status'] && (int) get_post( $child )->post_parent === $id, 'Authorized Beta child reparenting succeeds.' );
modula_album_assert( array() === $abilities['modula/read-album-members']->execute( array( 'id' => $other ) )['members'], 'Previous parent loses the moved reference.' );
add_filter( 'map_meta_cap', $deny_parent, 10, 4 );
modula_album_assert( 'forbidden' === $abilities['modula/recover-request']->execute( array( 'request_id' => $prefix . '-move-child' ) )['status'], 'Reparent recovery rechecks previous parent.' );
remove_filter( 'map_meta_cap', $deny_parent );
modula_album_assert( 'rejected' === $set_members( $child, array( array( 'id' => $id, 'itemType' => 'modula-album' ) ), 'cycle' )['status'], 'Transitive nested cycle is rejected.' );
// A preserved classic reference is not an authorization to reparent it.
$classic_row = array( 'id' => $classic, 'itemType' => 'modula-album' );
modula_album_assert( 'rejected' === $set_members( $id, array( $classic_row ), 'classic-add' )['status'], 'Classic reparenting is refused.' );
update_post_meta( $id, 'modula_album_members_v2', wp_json_encode( array( 'members' => array( $classic_row ) ) ) );
update_post_meta( $id, 'modula-album-galleries', array( $classic_row ) );
$classic_before = get_post( $classic )->to_array();
modula_album_assert( 'succeeded' === $set_members( $id, array( $classic_row, array( 'id' => $member_id, 'itemType' => 'modula-gallery' ) ), 'keep-classic' )['status'], 'Unchanged classic reference remains usable.' );
modula_album_assert( $classic_before === get_post( $classic )->to_array(), 'Preserving classic reference does not change classic post.' );
modula_album_assert( 'succeeded' === $set_members( $id, array(), 'remove-members' )['status'] && get_post( $member_id ), 'Removing references never deletes member objects.' );


// Cycle detection spans classic membership plus the independent post_parent hierarchy.
update_post_meta( $classic, 'modula-album-galleries', array( array( 'id' => $id, 'itemType' => 'modula-album' ) ) );
update_post_meta( $child, 'modula_album_members_v2', wp_json_encode( array( 'members' => array( $classic_row ) ) ) );
update_post_meta( $child, 'modula-album-galleries', array( $classic_row ) );
modula_album_assert( 'rejected' === $set_members( $id, array( $child_row ), 'mixed-cycle' )['status'], 'Cycle through a classic intermediate node is rejected.' );
// Remove the deliberately seeded invalid edge before the independent preservation check.
update_post_meta( $child, 'modula_album_members_v2', wp_json_encode( array( 'members' => array() ) ) );
update_post_meta( $child, 'modula-album-galleries', array() );
$identity_before = get_post( $id )->to_array();
$settings_before = rest_do_request( '/modula/v2/album/' . $id . '/settings' )->get_data();
modula_album_assert( 'succeeded' === $set_members( $id, array( array( 'id' => $member_id, 'itemType' => 'modula-gallery' ) ), 'final-gallery' )['status'], 'Independent gallery addition still works.' );
modula_album_assert( $identity_before === get_post( $id )->to_array() && $settings_before === rest_do_request( '/modula/v2/album/' . $id . '/settings' )->get_data(), 'Composition preserves album metadata and settings.' );

// A deletion between graph enumeration and document read is a conflict, not a PHP warning.
$vanishing = $make_album( 'vanishing-read' ); $armed = true; $read_warnings = array();
$delete_during_read = static function ( $sql ) use ( $vanishing, &$armed ) {
 if ( $armed && false !== strpos( $sql, 'SELECT * FROM ' ) && preg_match( '/WHERE ID = ' . $vanishing . '(?:\s|$)/', $sql ) ) { $armed = false; wp_delete_post( $vanishing, true ); }
 return $sql;
};
add_filter( 'query', $delete_during_read );
set_error_handler( static function ( $level, $message ) use ( &$read_warnings ) { if ( E_WARNING === $level ) { $read_warnings[] = $message; return true; } return false; } );
try { $vanished_read = $abilities['modula/read-album-members']->execute( array( 'id' => $vanishing ) ); }
finally { restore_error_handler(); remove_filter( 'query', $delete_during_read ); }
modula_album_assert( ! $armed && is_wp_error( $vanished_read ) && 'modula_read_conflict' === $vanished_read->get_error_code() && ! $read_warnings, 'Deletion during member read returns a conflict without warnings.' );
require __DIR__ . '/abilities-album-lifecycle.php';
modula_album_assert( isset( $abilities['modula/apply-album-preset'] ), 'Native album preset application must be registered.' );
require __DIR__ . '/abilities-album-application.php';
modula_e2e_output( array( 'input' => $input, 'outcome' => $out, 'patch' => $patched, 'page' => get_permalink( $page ), 'adapter_loaded' => class_exists( '\WP\MCP\Core\McpAdapter' ) ) );
