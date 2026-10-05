<?php
/** Focused real-provider library offload and guarded cloud delete checks. */
use Modula\V2\Abilities\Revision;
use WPChill\Folders\Rest\Connections_Controller;
use WPChill\Folders\Rest\Folders_Controller;
use WPChill\Folders\Rest\Folder_Transfers_Controller;
use WPChill\Folders\Rest\Cloud_Delete_Controller;
use WPChill\Folders\Storage\Folder_Transfer_State;
use WPChill\Folders\Storage\Option_Provider_Map_Repository;
use WPChill\Folders\Storage\S3_Compatible_Object_Store;
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || $state['run'] !== $run ) { exit( 1 ); }
function modula_cloud_assert( $ok, $message ) { if ( ! $ok ) { throw new RuntimeException( $message ); } }
function modula_cloud_call( $name, $input ) {
	$abilities = wp_get_abilities();
	modula_cloud_assert( isset( $abilities[ 'modula/' . $name ] ), 'Missing ability: ' . $name );
	return $abilities[ 'modula/' . $name ]->execute( $input );
}
try {
	$actor = (int) get_user_by( 'login', $run )->ID;
	wp_set_current_user( $actor );
	$prefix = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '-' . $action;
	$output = array( 'passed' => true, 'adapter_loaded' => class_exists( '\WP\MCP\Plugin' ) );
	$listing = modula_cloud_call( 'list-storage-connections', array( 'page' => 1 ) );
	if ( 'lite' === getenv( 'MODULA_E2E_MODE' ) ) {
		foreach ( array( 'start-library-offload' => array( 'scope' => 'entire_library', 'connection_id' => 'none', 'revision' => str_repeat( 'a', 64 ) ), 'delete-storage-object' => array( 'id' => 1, 'connection_id' => 'none', 'key' => 'none.jpg', 'revision' => str_repeat( 'a', 64 ), 'storage_revision' => str_repeat( 'a', 64 ) ) ) as $name => $input ) {
			$result = modula_cloud_call( $name, $input + array( 'request_id' => $prefix . '-' . $name ) );
			modula_cloud_assert( is_wp_error( $result ) || 'forbidden' === $result['status'], 'Lite storage mutation must be unavailable.' );
		}
		modula_e2e_output( $output ); return;
	}
	modula_cloud_assert( ! is_wp_error( $listing ) && ! empty( $listing['connections'] ), 'A real configured provider is required.' );
	$connection_id = $listing['connections'][0]['id'];
	$connection = Connections_Controller::service()->find( $connection_id );
	$target = \WPChill\Folders\Storage\S3_Compatible_Request::resolve_target( $connection['endpoint'] ?? '', $connection['bucket'], $connection['region'] );
	$host = wp_parse_url( $target['url'], PHP_URL_HOST ); $addresses = gethostbynamel( $host );
	modula_cloud_assert( ! empty( $addresses ), 'Provider DNS resolves.' );
	$state['storage_dns'][ $host ] = $addresses[0];
	$store = new S3_Compatible_Object_Store(); $maps = new Option_Provider_Map_Repository();
	$uploads = wp_upload_dir();
	$make = static function ( $suffix ) use ( &$state, $key, $run, $prefix, $uploads, $marker, $connection_id ) {
		$relative = $run . '/' . $prefix . '-' . $suffix . '.jpg';
		$file = $uploads['basedir'] . '/' . $relative;
		$canvas = imagecreatetruecolor( 20, 20 ); imagefill( $canvas, 0, 0, imagecolorallocate( $canvas, 50, 100, 160 ) ); imagejpeg( $canvas, $file ); imagedestroy( $canvas );
		$id = wp_insert_attachment( array( 'post_mime_type' => 'image/jpeg', 'post_status' => 'inherit', 'post_title' => $prefix . '-' . $suffix, 'meta_input' => array( $marker => $run ) ), $file );
		wp_update_attachment_metadata( $id, array( 'width' => 20, 'height' => 20, 'file' => $relative, 'sizes' => array() ) );
		$state['storage_objects'][] = array( 'connection_id' => $connection_id, 'key' => $relative );
		update_option( $key, $state, false );
		return array( 'id' => $id, 'key' => $relative, 'file' => $file, 'sha256' => hash_file( 'sha256', $file ) );
	};
	$one = $make( 'one' ); $two = $make( 'two' );
	$folder = Folders_Controller::service()->create( array( 'name' => $prefix . '-library' ) );
	Folders_Controller::membership_service()->assign( array( 'folder_id' => $folder['id'], 'object_id' => $one['id'], 'object_type' => 'attachment' ) );
	$state['cloud_library_ids'] = array( $one['id'], $two['id'] ); update_option( $key, $state, false );
	$start = array( 'request_id' => $prefix . '-library', 'scope' => 'entire_library', 'connection_id' => $connection_id, 'revision' => Revision::organization() );
	$bad_scope = $start; unset( $bad_scope['scope'] );
	modula_cloud_assert( 'rejected' === modula_cloud_call( 'start-library-offload', $bad_scope )['status'], 'Explicit library scope required.' );
	$bad_connection = $start; $bad_connection['request_id'] .= '-bad-connection'; $bad_connection['connection_id'] = 'missing';
	modula_cloud_assert( 'rejected' === modula_cloud_call( 'start-library-offload', $bad_connection )['status'], 'Unknown connection refused.' );
	$queued = modula_cloud_call( 'start-library-offload', $start );
	modula_cloud_assert( 'in_progress' === $queued['status'] && 2 === $queued['transfer']['total'] && 'library' === $queued['transfer']['type'], 'Library admission: ' . wp_json_encode( $queued ) );
	modula_cloud_assert( $queued === modula_cloud_call( 'start-library-offload', $start ), 'Active replay reuses job.' );
	$service = Folder_Transfers_Controller::service();
	$busy = $service->enqueue_folder_offload( $folder['id'], $connection_id );
	modula_cloud_assert( is_wp_error( $busy ) && 'wpchill_folders_transfer_busy' === $busy->get_error_code(), 'Folder UI and library ability share queue.' );
	$part = $service->process_next_batch( 1 );
	modula_cloud_assert( 1 === $part['processed'] && $one['sha256'] === hash( 'sha256', $store->get( $connection, $one['key'] ) ), 'Real first library copy.' );
	$cancel = modula_cloud_call( 'cancel-folder-transfer', array( 'request_id' => $prefix . '-cancel', 'job_id' => $queued['transfer']['id'] ) );
	modula_cloud_assert( 1 === $cancel['transfer']['processed'] && 1 === $cancel['transfer']['remaining'], 'Cancellation preserves partial bytes.' );
	modula_cloud_assert( 'partial' === modula_cloud_call( 'recover-request', array( 'request_id' => $start['request_id'] ) )['status'], 'Partial library recovery.' );
	$start['request_id'] .= '-remaining'; $start['revision'] = Revision::organization();
	$next = modula_cloud_call( 'start-library-offload', $start ); $service->process_next_batch();
	$done = modula_cloud_call( 'recover-request', array( 'request_id' => $start['request_id'] ) );
	modula_cloud_assert( 'succeeded' === $done['status'] && 1 === $done['transfer']['processed'] && 1 === $done['transfer']['skipped'], 'Terminal library recovery with skips.' );
	modula_cloud_assert( $done === modula_cloud_call( 'start-library-offload', $start ), 'Terminal replay reuses job.' );
	modula_cloud_assert( $done['transfer']['expires_at'] >= time() + 29 * DAY_IN_SECONDS, 'Terminal result retained thirty days.' );
	modula_cloud_assert( empty( Folders_Controller::service()->find( $folder['id'] )['connection_id'] ), 'Library copy preserves folder residence.' );
	foreach ( array( $one, $two ) as $item ) { modula_cloud_assert( $maps->find_by_attachment( $item['id'] ) && $item['sha256'] === hash( 'sha256', $store->get( $connection, $item['key'] ) ) && ! is_file( $item['file'] ), 'Library bytes and mapping confirmed separately.' ); }
	$output['transfer'] = $done['transfer']; $output['library_request'] = $start['request_id'];
	// A source edit after admission fails without a provider PUT.
	$changed = $make( 'changed' ); $state['cloud_library_ids'] = array( $changed['id'] ); update_option( $key, $state, false );
	$start['request_id'] .= '-changed'; $start['revision'] = Revision::organization();
	$changed_job = modula_cloud_call( 'start-library-offload', $start ); file_put_contents( $changed['file'], 'changed after admission' );
	$failed = $service->process_next_batch();
	modula_cloud_assert( 1 === $failed['failed'] && 'source_changed' === $failed['results'][0]['code'] && 'partial' === modula_cloud_call( 'recover-request', array( 'request_id' => $start['request_id'] ) )['status'], 'Changed source yields per-item failure, never global success.' );
	// Current actor permissions also protect retained results.
	$deny = static function ( $caps, $cap, $user, $args ) use ( $one ) { return 'read_post' === $cap && (int) ( $args[0] ?? 0 ) === $one['id'] ? array( 'do_not_allow' ) : $caps; };
	add_filter( 'map_meta_cap', $deny, 10, 4 );
	modula_cloud_assert( 'forbidden' === modula_cloud_call( 'recover-request', array( 'request_id' => $output['library_request'] ) )['status'], 'Revoked access hides retained library result.' );
	remove_filter( 'map_meta_cap', $deny, 10 );
	// Guard both the existing service and the new ability before the first DELETE.
	$delete_input = static function ( $item, $suffix ) use ( $prefix, $connection_id ) { return array( 'request_id' => $prefix . '-delete-' . $suffix, 'id' => $item['id'], 'connection_id' => $connection_id, 'key' => $item['key'], 'revision' => Revision::document( $item['id'] ), 'storage_revision' => Revision::organization() ); };
	$gallery = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'private', 'post_title' => $prefix . '-usage', 'meta_input' => array( '_modula_beta' => '1', 'modula-images' => array( array( 'id' => $one['id'] ) ) ) ) );
	$before_guard = $delete_input( $one, 'used' );
	modula_cloud_assert( 'attachment_in_use' === modula_cloud_call( 'delete-storage-object', $before_guard )['code'], 'Known private gallery usage blocks ability.' );
	modula_cloud_assert( is_wp_error( Cloud_Delete_Controller::service()->delete_from_bucket( $one['id'] ) ), 'Existing service uses host usage guard.' );
	modula_cloud_assert( get_post( $one['id'] ) && $maps->find_by_attachment( $one['id'] ) && true === $store->head( $connection, $one['key'] ), 'Usage refusal preserves all three resources.' );
	wp_delete_post( $gallery, true );
	$deny_delete = static function ( $caps, $cap, $user, $args ) use ( $one ) { return 'delete_post' === $cap && (int) ( $args[0] ?? 0 ) === $one['id'] ? array( 'do_not_allow' ) : $caps; };
	add_filter( 'map_meta_cap', $deny_delete, 10, 4 );
	modula_cloud_assert( 'forbidden' === modula_cloud_call( 'delete-storage-object', $delete_input( $one, 'denied' ) )['status'] && is_wp_error( Cloud_Delete_Controller::service()->delete_from_bucket( $one['id'] ) ), 'Ability and ordinary service refuse revoked permission.' );
	remove_filter( 'map_meta_cap', $deny_delete, 10 );
	$refuse = static function ( $value, $post ) use ( $one ) { return $post->ID === $one['id'] ? false : $value; };
	add_filter( 'pre_delete_attachment', $refuse, 999, 2 );
	$refused = modula_cloud_call( 'delete-storage-object', $delete_input( $one, 'wordpress-refused' ) );
	modula_cloud_assert( 'rejected' === $refused['status'] && true === $store->head( $connection, $one['key'] ) && get_post( $one['id'] ) && $maps->find_by_attachment( $one['id'] ), 'Actual WordPress refusal precedes remote deletion.' );
	remove_filter( 'pre_delete_attachment', $refuse, 999 );
	$mismatch = $delete_input( $one, 'mismatch' ); $mismatch['key'] .= '-wrong';
	modula_cloud_assert( 'storage_target_mismatch' === modula_cloud_call( 'delete-storage-object', $mismatch )['code'], 'Exact mapped remote target required.' );
	$stale = $delete_input( $one, 'stale' ); wp_update_post( array( 'ID' => $one['id'], 'post_title' => 'Changed title' ) );
	modula_cloud_assert( 'conflict' === modula_cloud_call( 'delete-storage-object', $stale )['status'], 'Ordinary attachment change invalidates delete revision.' );
	$remove = $delete_input( $one, 'success' ); $removed = modula_cloud_call( 'delete-storage-object', $remove );
	modula_cloud_assert( 'succeeded' === $removed['status'] && ! get_post( $one['id'] ) && ! $maps->find_by_attachment( $one['id'] ) && is_wp_error( $store->head( $connection, $one['key'] ) ), 'Cloud delete confirms all resource removals: ' . wp_json_encode( $removed ) );
	modula_cloud_assert( $removed === modula_cloud_call( 'delete-storage-object', $remove ) && $removed === modula_cloud_call( 'recover-request', array( 'request_id' => $remove['request_id'] ) ), 'Replay recovers a deleted target.' );
	$deny_edit_primitive = static function ( $allcaps ) { $allcaps['edit_posts'] = false; $allcaps['edit_others_posts'] = false; return $allcaps; };
	add_filter( 'user_has_cap', $deny_edit_primitive );
	modula_cloud_assert( 'forbidden' === modula_cloud_call( 'recover-request', array( 'request_id' => $remove['request_id'] ) )['status'], 'Deleted-target recovery rechecks original edit primitives, not only delete permissions.' );
	remove_filter( 'user_has_cap', $deny_edit_primitive );
	$output['deleted'] = $removed;
	// A bounded provider fault on a size after the original was really deleted.
	$size_key = dirname( $two['key'] ) . '/size-' . basename( $two['key'] );
	$state['storage_objects'][] = array( 'connection_id' => $connection_id, 'key' => $size_key ); update_option( $key, $state, false );
	modula_cloud_assert( true === $store->put( $connection, $size_key, 'owned size bytes', 'image/jpeg' ), 'Real owned derivative created.' );
	$meta = wp_get_attachment_metadata( $two['id'], true ); $meta['sizes']['thumbnail'] = array( 'file' => basename( $size_key ) ); wp_update_attachment_metadata( $two['id'], $meta );
	$fault = static function ( $pre, $args, $url ) use ( $size_key ) { return 'DELETE' === ( $args['method'] ?? '' ) && false !== strpos( rawurldecode( $url ), $size_key ) ? new WP_Error( 'controlled_failure', 'private provider detail' ) : $pre; };
	add_filter( 'pre_http_request', $fault, 10, 3 );
	$partial_input = $delete_input( $two, 'partial' ); $partial = modula_cloud_call( 'delete-storage-object', $partial_input );
	remove_filter( 'pre_http_request', $fault, 10 );
	modula_cloud_assert( 'uncertain' === $partial['status'] && 1 === $partial['storage']['remote_deleted'] && 2 === $partial['storage']['remote_total'] && 'uncertain' === $partial['storage']['remote_bytes'] && ! get_post( $two['id'] ) && ! $maps->find_by_attachment( $two['id'] ) && $two['id'] === $maps->find_attachment_id( $connection_id, $two['key'] ) && true === $store->head( $connection, $size_key ) && is_wp_error( $store->head( $connection, $two['key'] ) ), 'Partial remote deletion is uncertain; WordPress removal committed, orphan map index and derivative preserved.' );
	modula_cloud_assert( $partial === modula_cloud_call( 'delete-storage-object', $partial_input ) && true === $store->head( $connection, $size_key ), 'Uncertainty never retries remaining remote bytes.' );
	modula_cloud_assert( false === strpos( wp_json_encode( $partial ), 'private provider detail' ), 'Provider details do not leak.' );
	$output['uncertain'] = $partial;
	// Separate intact resources for authenticated HTTP mutations and browser readback.
	$http = $make( 'http-one' ); $http2 = $make( 'http-two' );
	$state['cloud_library_ids'] = array( $http['id'], $http2['id'] ); update_option( $key, $state, false );
	$gallery_id = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'publish', 'post_title' => $prefix . '-library-visitor', 'meta_input' => array( '_modula_beta' => '1' ) ) );
	\Modula\V2\Meta_Sync::apply_new_beta_gallery_create_defaults( $gallery_id );
	\Modula\V2\Meta_Sync::persist_merged_gallery_items( $gallery_id, array( array( 'id' => $http2['id'] ) ), false );
	$page_id = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $prefix . '-visitor', 'post_content' => '[modula id="' . $gallery_id . '"]' ) );
	$output['gallery'] = array( 'id' => $gallery_id, 'editor_url' => admin_url( 'post.php?post=' . $gallery_id . '&action=edit' ), 'page_url' => get_permalink( $page_id ) );
	$crash = $make( 'interrupted' );
	$crash['size_key'] = dirname( $crash['key'] ) . '/size-' . basename( $crash['key'] );
	$state['storage_objects'][] = array( 'connection_id' => $connection_id, 'key' => $crash['size_key'] ); update_option( $key, $state, false );
	foreach ( array( $crash['key'], $crash['size_key'] ) as $remote_key ) { modula_cloud_assert( true === $store->put( $connection, $remote_key, file_get_contents( $crash['file'] ), 'image/jpeg' ), 'Owned interruption fixture uploaded.' ); }
	$maps->save( $crash['id'], array( 'connection_id' => $connection_id, 'bucket' => $connection['bucket'], 'key' => $crash['key'], 'provider' => 's3' ) );
	$meta = wp_get_attachment_metadata( $crash['id'], true ); $meta['sizes']['thumbnail'] = array( 'file' => basename( $crash['size_key'] ) ); wp_update_attachment_metadata( $crash['id'], $meta );
	$output['crash_item'] = $crash;
	$output['transfer'] = $failed;
	$output['http_items'] = array( $http, $http2 ); $output['connection_id'] = $connection_id;
	$output['folder_id'] = (int) $folder['id'];
	wp_set_current_user( 0 );
	modula_cloud_assert( is_wp_error( modula_cloud_call( 'read-folder-transfer', array( 'job_id' => $failed['id'] ) ) ), 'Anonymous job read denied.' );
	wp_set_current_user( $actor );
	modula_e2e_output( $output );
} catch ( Throwable $error ) { WP_CLI::error( basename( $error->getFile() ) . ':' . $error->getLine() . ' ' . $error->getMessage() ); }
