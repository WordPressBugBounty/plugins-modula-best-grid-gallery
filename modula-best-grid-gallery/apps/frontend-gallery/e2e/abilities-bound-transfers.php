<?php
/** Extends the owned storage fixture at native ability and real provider seams. */
use Modula\V2\Abilities\Revision;
use Modula\Bound_Gallery\Bound_Gallery;
use WPChill\Folders\Rest\Folders_Controller;
use WPChill\Folders\Rest\Folder_Transfers_Controller;
use WPChill\Folders\Storage\Folder_Transfer_State;

$probe = modula_storage_call( 'read-bind-target', array( 'target' => array( 'type' => 'media_folder', 'folder_id' => 1 ) ) );
if ( 'lite' === getenv( 'MODULA_E2E_MODE' ) ) {
	modula_storage_assert( is_wp_error( $probe ), 'Bound operations require Compatible Pro.' );
	modula_storage_assert( is_wp_error( modula_storage_call( 'read-folder-transfer', array( 'job_id' => '00000000-0000-0000-0000-000000000000' ) ) ), 'Transfers require Compatible Pro.' );
	return;
}
$folder = Folders_Controller::service()->create( array( 'name' => $prefix . '-bound' ) );
$folder_id = (int) $folder['id'];
$target = array( 'type' => 'media_folder', 'folder_id' => $folder_id );
$source_input = array( 'target' => $target );
$transfer_ids = array();
for ( $j = 0; $j < 2; ++$j ) {
	$tfile = $uploads['basedir'] . '/' . $run . '/' . $prefix . '-transfer-' . $j . '.jpg';
	$canvas = imagecreatetruecolor( 20, 20 ); imagefill( $canvas, 0, 0, imagecolorallocate( $canvas, 80, 120, 160 ) ); imagejpeg( $canvas, $tfile ); imagedestroy( $canvas );
	$tid = wp_insert_attachment( array( 'post_mime_type' => 'image/jpeg', 'post_title' => 'Bound shared title', 'meta_input' => array( $marker => $run ) ), $tfile );
	wp_update_attachment_metadata( $tid, wp_generate_attachment_metadata( $tid, $tfile ) );
	$transfer_ids[] = $tid;
}
Folders_Controller::membership_service()->assign( array( 'folder_id' => $folder_id, 'object_id' => $transfer_ids[0], 'object_type' => 'attachment' ) );
$source_read = modula_storage_call( 'read-bind-target', $source_input );
modula_storage_assert( array( $transfer_ids[0] ) === $source_read['attachment_ids'], 'Direct source read.' );
$bound_input = array( 'request_id' => $prefix . '-bound-create', 'revision' => $source_read['revision'], 'target' => $target, 'title' => $prefix . '-bound-gallery', 'status' => 'publish' );
$bound = modula_storage_call( 'create-bound-gallery', $bound_input );
modula_storage_assert( 'succeeded' === ( $bound['status'] ?? '' ), 'Bound creation: ' . wp_json_encode( $bound ) );
$bound_id = $bound['gallery']['id'];
modula_storage_assert( $bound === modula_storage_call( 'create-bound-gallery', $bound_input ), 'Bound creation replay.' );
$bound_read = modula_storage_call( 'read-bound-gallery', array( 'id' => $bound_id ) );
modula_storage_assert( array( $transfer_ids[0] ) === array_column( $bound_read['items'], 'id' ), 'Derived bound read.' );
$hide = array( 'request_id' => $prefix . '-hide-stale', 'id' => $bound_id, 'revision' => $bound_read['revision'], 'action' => 'hide', 'attachment_ids' => array( $transfer_ids[0] ) );
Folders_Controller::membership_service()->assign( array( 'folder_id' => $folder_id, 'object_id' => $transfer_ids[1], 'object_type' => 'attachment' ) );
modula_storage_assert( 'conflict' === modula_storage_call( 'update-bound-exclusions', $hide )['status'], 'Membership-only source change rejects stale exclusion.' );
$bound_read = modula_storage_call( 'read-bound-gallery', array( 'id' => $bound_id ) );
modula_storage_assert( $transfer_ids === array_column( $bound_read['items'], 'id' ), 'Later source attachment appears without gallery save.' );
$stored = get_post_meta( $bound_id ); $text = get_post( $transfer_ids[0] )->post_title;
$hide['request_id'] = $prefix . '-hide'; $hide['revision'] = $bound_read['revision'];
$hidden = modula_storage_call( 'update-bound-exclusions', $hide );
modula_storage_assert( 'succeeded' === $hidden['status'] && $hidden === modula_storage_call( 'update-bound-exclusions', $hide ), 'Hide and replay.' );
$hidden_read = modula_storage_call( 'read-bound-gallery', array( 'id' => $bound_id ) );
modula_storage_assert( array( $transfer_ids[1] ) === array_column( $hidden_read['items'], 'id' ), 'Hidden member absent only from gallery.' );
$hide['request_id'] = $prefix . '-restore'; $hide['revision'] = $hidden_read['revision']; $hide['action'] = 'restore';
modula_storage_assert( 'succeeded' === modula_storage_call( 'update-bound-exclusions', $hide )['status'], 'Restore source member.' );
modula_storage_assert( $stored === get_post_meta( $bound_id ) && $text === get_post( $transfer_ids[0] )->post_title, 'Exclusions preserve stored layout and attachment text.' );

// Unknown remote keys are not ingested by reads; explicit creation ingests them.
$size_key = $remote_prefix . 'original-150x150.jpg';
$state['storage_objects'][] = array( 'connection_id' => $connection_id, 'key' => $size_key ); update_option( $key, $state, false );
modula_storage_assert( true === $store->put( $connection, $size_key, file_get_contents( $source ), 'image/jpeg' ), 'Owned image-size sibling uploaded.' );
$remote_target = array( 'type' => 'remote_prefix', 'connection_id' => $connection_id, 'prefix' => $remote_prefix );
$remote_source = modula_storage_call( 'read-bind-target', array( 'target' => $remote_target ) );
modula_storage_assert( 2 === $remote_source['unknown_objects'] && array() === $remote_source['attachment_ids'], 'Remote source read never ingests and ignores generated size siblings.' );
$remote_bound = modula_storage_call( 'create-bound-gallery', array( 'request_id' => $prefix . '-remote-bound', 'revision' => $remote_source['revision'], 'target' => $remote_target, 'title' => $prefix . '-remote-bound', 'status' => 'draft' ) );
modula_storage_assert( 'succeeded' === ( $remote_bound['status'] ?? '' ), 'Explicit remote bound creation: ' . wp_json_encode( $remote_bound ) );
$remote_read = modula_storage_call( 'read-bound-gallery', array( 'id' => $remote_bound['gallery']['id'] ) );
modula_storage_assert( 2 === count( $remote_read['items'] ), 'Remote bound derives both direct objects.' );
// Release fixture references so the preceding storage HTTP journey can reuse its object.
wp_delete_post( $remote_bound['gallery']['id'], true );
foreach ( $remote_read['items'] as $remote_item ) {
	\WPChill\Folders\Rest\Source_Groups_Controller::provider_maps()->delete( $remote_item['id'] ); wp_delete_attachment( $remote_item['id'], true );
}

$transfer_service = Folder_Transfers_Controller::service();
modula_storage_assert( ! ( new Folder_Transfer_State() )->has_active(), 'No unrelated transfer may be active.' );
foreach ( $transfer_ids as $tid ) {
	$state['storage_objects'][] = array( 'connection_id' => $connection_id, 'key' => $folder['slug'] . '/' . basename( get_attached_file( $tid, true ) ) );
}
update_option( $key, $state, false );
$transfer_bytes = array_map( static function ( $tid ) { return file_get_contents( get_attached_file( $tid, true ) ); }, $transfer_ids );
$hashes = array_map( static function ( $tid ) { return hash_file( 'sha256', get_attached_file( $tid, true ) ); }, $transfer_ids );
$start = array( 'request_id' => $prefix . '-offload', 'revision' => Revision::organization(), 'folder_id' => $folder_id, 'direction' => 'offload', 'connection_id' => $connection_id );
$job = modula_storage_call( 'start-folder-transfer', $start );
modula_storage_assert( 'in_progress' === ( $job['status'] ?? '' ), 'Offload admission: ' . wp_json_encode( $job ) );
$job_id = $job['transfer']['id'];
modula_storage_assert( $job_id === modula_storage_call( 'start-folder-transfer', $start )['transfer']['id'], 'Replay keeps job identity.' );
$busy = $transfer_service->enqueue_folder_onload( $folder_id );
modula_storage_assert( is_wp_error( $busy ) && 'wpchill_folders_transfer_busy' === $busy->get_error_code(), 'UI service and abilities share admission.' );
$partial_transfer = $transfer_service->process_next_batch( 1 );
modula_storage_assert( 1 === $partial_transfer['processed'], 'Real provider first-item progress.' );
$cancel_input = array( 'request_id' => $prefix . '-cancel', 'job_id' => $job_id );
$cancelled_transfer = modula_storage_call( 'cancel-folder-transfer', $cancel_input );
modula_storage_assert( 'cancelled' === $cancelled_transfer['transfer']['status'] && 1 === $cancelled_transfer['transfer']['processed'] && 1 === $cancelled_transfer['transfer']['remaining'], 'Cancellation retains completed and remaining members.' );
modula_storage_assert( $cancelled_transfer === modula_storage_call( 'cancel-folder-transfer', $cancel_input ), 'Cancel replay.' );
$recovered = modula_storage_call( 'recover-request', array( 'request_id' => $start['request_id'] ) );
modula_storage_assert( 'partial' === $recovered['status'] && $job_id === $recovered['transfer']['id'], 'Recovery after cancellation uses original request.' );
$start['request_id'] .= '-remaining'; $start['revision'] = Revision::organization();
$again_transfer = modula_storage_call( 'start-folder-transfer', $start );
modula_storage_assert( 'in_progress' === $again_transfer['status'], 'Explicit new operation retries remaining work.' );
$transfer_service->process_next_batch();
$finished = modula_storage_call( 'read-folder-transfer', array( 'job_id' => $again_transfer['transfer']['id'] ) )['transfer'];
modula_storage_assert( 'done' === $finished['status'] && 1 === $finished['skipped'] && 1 === $finished['processed'], 'Terminal retained per-item skip/success.' );
foreach ( $transfer_ids as $j => $tid ) {
	$map = \WPChill\Folders\Rest\Source_Groups_Controller::provider_maps()->find_by_attachment( $tid );
	modula_storage_assert( $map && $hashes[$j] === hash( 'sha256', $store->get( $connection, $map['key'] ) ) && ! is_file( get_attached_file( $tid, true ) ), 'Offload verified remote bytes, map and local absence.' );
}
$onload = array( 'request_id' => $prefix . '-onload', 'revision' => Revision::organization(), 'folder_id' => $folder_id, 'direction' => 'onload' );
$onloaded = modula_storage_call( 'start-folder-transfer', $onload );
modula_storage_assert( 'in_progress' === $onloaded['status'], 'Onload admitted: ' . wp_json_encode( $onloaded ) );
// A real remote source replacement after admission must fail the conditional GET.
$changed_map = \WPChill\Folders\Rest\Source_Groups_Controller::provider_maps()->find_by_attachment( $transfer_ids[0] );
modula_storage_assert( true === $store->put( $connection, $changed_map['key'], file_get_contents( $source ), 'image/jpeg' ), 'Owned remote source changed after queue admission.' );
$source_conflict = $transfer_service->process_next_batch();
modula_storage_assert( 'uncertain' === $source_conflict['status'] && 'remote_revision_conflict_inspect_effects' === $source_conflict['results'][0]['code'], 'Conditional source read detects provider change.' );
modula_storage_assert( true === $store->put( $connection, $changed_map['key'], $transfer_bytes[0], 'image/jpeg' ), 'Restore only test-owned remote source.' );
$collision_file = $uploads['path'] . '/' . basename( $changed_map['key'] );
modula_storage_assert( ! file_exists( $collision_file ), 'Owned collision filename must be unused.' );
$state['transfer_local_files'][] = $collision_file; update_option( $key, $state, false );
file_put_contents( $collision_file, 'Unrelated local destination sentinel' );
$onload['request_id'] .= '-local-conflict'; $onload['revision'] = Revision::organization();
$local_job = modula_storage_call( 'start-folder-transfer', $onload );
modula_storage_assert( 'in_progress' === $local_job['status'], 'Local conflict job admitted.' );
$local_conflict = $transfer_service->process_next_batch();
modula_storage_assert( 'uncertain' === $local_conflict['status'] && 'local_destination_conflict' === $local_conflict['results'][0]['code'] && 'Unrelated local destination sentinel' === file_get_contents( $collision_file ), 'Atomic local reservation preserves colliding bytes.' );
unlink( $collision_file );
$onload['request_id'] .= '-reconciled'; $onload['revision'] = Revision::organization();
$onloaded = modula_storage_call( 'start-folder-transfer', $onload );
modula_storage_assert( 'in_progress' === $onloaded['status'], 'Reconciled onload admitted.' );
$transfer_service->process_next_batch();
$done = modula_storage_call( 'recover-request', array( 'request_id' => $onload['request_id'] ) );
modula_storage_assert( 'succeeded' === $done['status'] && 2 === $done['transfer']['processed'], 'Onload terminal recovery.' );
foreach ( $transfer_ids as $j => $tid ) { modula_storage_assert( $hashes[$j] === hash_file( 'sha256', get_attached_file( $tid, true ) ) && null === \WPChill\Folders\Rest\Source_Groups_Controller::provider_maps()->find_by_attachment( $tid ), 'Onload restores exact local bytes and removes mapping.' ); }
// An object created in the destination while queued must never be overwritten.
$start['request_id'] = $prefix . '-destination-conflict'; $start['revision'] = Revision::organization();
$destination_job = modula_storage_call( 'start-folder-transfer', $start );
modula_storage_assert( 'in_progress' === $destination_job['status'], 'Destination conflict job admitted.' );
$destination_key = $folder['slug'] . '/' . basename( get_attached_file( $transfer_ids[0], true ) );
modula_storage_assert( true === $store->put( $connection, $destination_key, file_get_contents( $source ), 'image/jpeg' ), 'Owned destination inserted after admission.' );
$destination_conflict = $transfer_service->process_next_batch();
modula_storage_assert( 'uncertain' === $destination_conflict['status'] && 'remote_revision_conflict_inspect_effects' === $destination_conflict['results'][0]['code'], 'Conditional destination PUT refuses an intervening object.' );
modula_storage_assert( hash_file( 'sha256', $source ) === hash( 'sha256', $store->get( $connection, $destination_key ) ), 'Intervening destination bytes preserved.' );
$store->delete( $connection, $destination_key );
$onload['request_id'] = $prefix . '-residence-only'; $onload['revision'] = Revision::organization();
modula_storage_assert( 'succeeded' === modula_storage_call( 'start-folder-transfer', $onload )['status'], 'Explicit reconciliation returns empty remote residence to local.' );


// Current per-item permissions are rechecked by the worker and recovery.
$start['request_id'] = $prefix . '-revoked-worker'; $start['revision'] = Revision::organization();
$revoked_job = modula_storage_call( 'start-folder-transfer', $start );
modula_storage_assert( 'in_progress' === $revoked_job['status'], 'Permission fixture admitted.' );
$deny_source_read = static function ( $caps, $cap, $user, $args ) use ( $actor, $transfer_ids ) {
	return (int) $user === $actor && 'read_post' === $cap && in_array( (int) ( $args[0] ?? 0 ), $transfer_ids, true ) ? array( 'do_not_allow' ) : $caps;
};
add_filter( 'map_meta_cap', $deny_source_read, 10, 4 );
modula_storage_assert( 'forbidden' === modula_storage_call( 'recover-request', array( 'request_id' => $start['request_id'] ) )['status'], 'Revoked source read blocks job recovery.' );
modula_storage_assert( is_wp_error( modula_storage_call( 'read-bound-gallery', array( 'id' => $bound_id ) ) ), 'Revoked source read blocks bound inspection.' );
$revoked_result = $transfer_service->process_next_batch();
remove_filter( 'map_meta_cap', $deny_source_read, 10 );
modula_storage_assert( 2 === $revoked_result['failed'] && 0 === $revoked_result['processed'] && 'current_permission_denied' === $revoked_result['results'][0]['code'], 'Worker refuses bytes after read permission revocation.' );
$onload['request_id'] = $prefix . '-revoked-residence-reset'; $onload['revision'] = Revision::organization();
modula_storage_assert( 'succeeded' === modula_storage_call( 'start-folder-transfer', $onload )['status'], 'Owned permission fixture residence reconciled.' );


// The public ability must cancel abandoned in-flight checkpoints, not only the service seam.
$abandoned_row = ( new Folder_Transfer_State() )->retained( $done['transfer']['id'] );
$abandoned_row['id'] = wp_generate_uuid4(); $abandoned_row['status'] = 'running'; $abandoned_row['cursor'] = 0; $abandoned_row['in_flight'] = 0; $abandoned_row['processed'] = 0; $abandoned_row['results'] = array(); unset( $abandoned_row['expires_at'] );
( new Folder_Transfer_State() )->save( $abandoned_row );
$abandoned_cancel = modula_storage_call( 'cancel-folder-transfer', array( 'request_id' => $prefix . '-abandoned-cancel', 'job_id' => $abandoned_row['id'] ) );
modula_storage_assert( 'succeeded' === $abandoned_cancel['status'] && 'uncertain' === $abandoned_cancel['transfer']['results'][0]['status'] && ! ( new Folder_Transfer_State() )->has_active(), 'Ability cancellation retains uncertainty and releases active slot.' );

// A generated-size conditional failure must leave canonical file metadata, not a deleted temp path.
$size_folder = Folders_Controller::service()->create( array( 'name' => $prefix . '-size-conflict' ) );
$size_file = $uploads['basedir'] . '/' . $run . '/' . $prefix . '-size-original.jpg'; copy( $source, $size_file );
$size_id = wp_insert_attachment( array( 'post_mime_type' => 'image/jpeg', 'post_title' => $prefix . '-size', 'meta_input' => array( $marker => $run ) ), $size_file );
$size_meta = wp_generate_attachment_metadata( $size_id, $size_file ); wp_update_attachment_metadata( $size_id, $size_meta );
Folders_Controller::membership_service()->assign( array( 'folder_id' => $size_folder['id'], 'object_id' => $size_id, 'object_type' => 'attachment' ) );
$size_original_key = $size_folder['slug'] . '/' . basename( $size_file );
$state['storage_objects'][] = array( 'connection_id' => $connection_id, 'key' => $size_original_key );
foreach ( $size_meta['sizes'] as $size ) { $state['storage_objects'][] = array( 'connection_id' => $connection_id, 'key' => $size_folder['slug'] . '/' . $size['file'] ); }
update_option( $key, $state, false );
$size_job = modula_storage_call( 'start-folder-transfer', array( 'request_id' => $prefix . '-size-failure', 'revision' => Revision::organization(), 'folder_id' => (int) $size_folder['id'], 'direction' => 'offload', 'connection_id' => $connection_id ) );
modula_storage_assert( 'in_progress' === $size_job['status'], 'Generated size job admitted.' );
foreach ( $size_meta['sizes'] as $size ) { modula_storage_assert( true === $store->put( $connection, $size_folder['slug'] . '/' . $size['file'], file_get_contents( $source ), 'image/jpeg' ), 'Owned concurrent derivative fixture.' ); }
$size_conflict = $transfer_service->process_next_batch();
modula_storage_assert( 'uncertain' === $size_conflict['status'] && $size_original_key === get_post_meta( $size_id, '_wp_attached_file', true ) && is_file( $size_file ), 'Conditional derivative conflict preserves canonical metadata and original local bytes.' );

$other = wp_insert_user( array( 'user_login' => $run . '-other-' . substr( md5( $prefix ), 0, 8 ), 'user_pass' => wp_generate_password(), 'role' => 'administrator' ) ); modula_storage_assert( ! is_wp_error( $other ), 'Owned secondary actor created.' ); update_user_meta( $other, $marker, $run );
wp_set_current_user( $other );
modula_storage_assert( is_wp_error( modula_storage_call( 'read-folder-transfer', array( 'job_id' => $job_id ) ) ), 'Job id is not an authorization token for another actor.' );
wp_set_current_user( $actor );
$bound_page = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $prefix . '-bound-page', 'post_content' => '[modula id="' . $bound_id . '"]' ) );
$output['bound'] = array( 'id' => $bound_id, 'target' => $target, 'attachment_ids' => $transfer_ids, 'page_id' => $bound_page, 'page' => get_permalink( $bound_page ), 'editor_url' => admin_url( 'post.php?post=' . $bound_id . '&action=edit' ) );
$output['transfer'] = $done['transfer'];
