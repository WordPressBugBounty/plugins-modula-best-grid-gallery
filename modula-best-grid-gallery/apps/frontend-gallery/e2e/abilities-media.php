<?php
/** Media organization and attachment abilities through the owned native lifecycle. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! isset( $state['run'] ) || $state['run'] !== getenv( 'MODULA_E2E_RUN' ) ) {
	exit( 1 );
}
$actor = get_user_by( 'login', $run );
wp_set_current_user( $actor->ID );
function modula_media_assert( $ok, $message ) {
	if ( ! $ok ) {
		WP_CLI::error( $message );
	}
}
function modula_media_call( $name, $input ) {
	$ability = wp_get_ability( 'modula/' . $name );
	modula_media_assert( null !== $ability, 'Native media ability must exist: ' . $name );
	return $ability->execute( $input );
}
$prefix  = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '-' . $action;
$list    = modula_media_call( 'list-media-folders', array() );
$input   = array(
	'request_id' => $prefix . '-create',
	'revision'   => $list['revision'],
	'name'       => $prefix,
);
$created = modula_media_call( 'create-media-folder', $input );
modula_media_assert( 'succeeded' === ( $created['status'] ?? '' ), 'Folder creation succeeds: ' . wp_json_encode( $created ) );
$id = $created['folder']['id'];
// Mark fixture ownership without changing the library's normal shared-folder policy.
global $wpdb;
$wpdb->update( $wpdb->prefix . 'wpchill_folders', array( 'owner_user_id' => $actor->ID ), array( 'id' => $id ) );
modula_media_assert( $created === modula_media_call( 'create-media-folder', $input ), 'Replay returns the same folder.' );
$listed = modula_media_call(
	'list-media-folders',
	array(
		'search'   => $prefix,
		'per_page' => 1,
	)
);
modula_media_assert( 1 === $listed['total'] && $listed['folders'][0]['id'] === $id, 'Folder name search returns the created identity.' );
$update  = array(
	'request_id' => $prefix . '-rename',
	'id'         => $id,
	'revision'   => $listed['revision'],
	'changes'    => array( 'name' => $prefix . '-renamed' ),
);
$updated = modula_media_call( 'update-media-folder', $update );
modula_media_assert( 'succeeded' === ( $updated['status'] ?? '' ) && $id === $updated['folder']['id'], 'Rename preserves the folder identity: ' . wp_json_encode( $updated ) );
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$uploads = wp_upload_dir();
$file    = $uploads['basedir'] . '/' . $run . '/' . $prefix . '.jpg';
modula_media_assert( copy( get_attached_file( $catalog['attachments'][0]['id'] ), $file ), 'Copy owned media bytes.' );
$attachment = wp_insert_attachment(
	array(
		'post_mime_type' => 'image/jpeg',
		'post_title'     => $prefix,
		'post_author'    => $actor->ID,
		'meta_input'     => array( $marker => $run ),
	),
	$file
);
wp_update_attachment_metadata( $attachment, wp_generate_attachment_metadata( $attachment, $file ) );
$hash  = hash_file( 'sha256', $file );
modula_media_assert( wp_has_ability( 'modula/read-attachment-image-context' ), 'Visual context ability is registered.' );
$visual = modula_media_call( 'read-attachment-image-context', array( 'id' => $attachment ) );
modula_media_assert( ! is_wp_error( $visual ) && $attachment === $visual['id'], 'Visual context identifies the attachment.' );

$visual_checks = require __DIR__ . '/abilities-image-text.php';
$read  = modula_media_call( 'read-attachment', array( 'id' => $attachment ) );
$patch = array(
	'request_id' => $prefix . '-text',
	'id'         => $attachment,
	'revision'   => $read['attachment']['revision'],
	'text'       => array(
		'title' => 'Shared native title',
		'alt'   => 'Shared native alt',
	),
);
$text  = modula_media_call( 'update-attachment-text', $patch );
modula_media_assert( 'succeeded' === ( $text['status'] ?? '' ), 'Attachment text save succeeds.' );
// Editor and Media Library are supported writers; stale callers must not win.
rest_get_server();
$rest = new WP_REST_Request( 'PATCH', '/wpchill-folders/v1/folders/' . $id );
$rest->set_param( 'name', $prefix . '-organizer' );
modula_media_assert( 200 === rest_do_request( $rest )->get_status(), 'Existing organizer saves a renamed folder.' );
$stale                = $update;
$stale['request_id'] .= '-stale';
modula_media_assert( 'conflict' === modula_media_call( 'update-media-folder', $stale )['status'], 'Ordinary organizer edits invalidate revisions.' );
modula_media_assert( $updated === modula_media_call( 'update-media-folder', $update ), 'Replay cannot overwrite later organizer edits.' );
$revision = static function () {
	return modula_media_call( 'list-media-folders', array() )['revision'];
};
$child    = modula_media_call(
	'create-media-folder',
	array(
		'request_id' => $prefix . '-child',
		'name'       => $prefix . '-child',
		'parent_id'  => $id,
		'revision'   => $revision(),
	)
);
modula_media_assert( 'succeeded' === $child['status'], 'Child creation succeeds.' );
$child_id = $child['folder']['id'];
$cycle    = modula_media_call(
	'update-media-folder',
	array(
		'request_id' => $prefix . '-cycle',
		'id'         => $id,
		'revision'   => $revision(),
		'changes'    => array(
			'name'      => $prefix . '-invalid',
			'parent_id' => $child_id,
		),
	)
);
modula_media_assert( 'rejected' === $cycle['status'], 'Cycle rejects the complete patch.' );
$move = modula_media_call(
	'update-media-folder',
	array(
		'request_id' => $prefix . '-move',
		'id'         => $child_id,
		'revision'   => $revision(),
		'changes'    => array( 'parent_id' => 0 ),
	)
);
modula_media_assert( 'succeeded' === $move['status'] && 0 === $move['folder']['parent_id'], 'Move to root persists.' );
$assign   = array(
	'request_id'  => $prefix . '-assign',
	'id'          => $attachment,
	'object_type' => 'attachment',
	'folder_id'   => $id,
	'revision'    => $revision(),
);
$assigned = modula_media_call( 'assign-media-folder', $assign );
modula_media_assert( 'succeeded' === $assigned['status'] && $id === $assigned['membership']['folder_id'], 'Assign accessible attachment.' );
modula_media_assert( 1 === modula_media_call( 'list-attachments', array( 'folder_id' => $id ) )['total'], 'Folder listing finds the assigned member.' );
modula_media_assert( $assigned === modula_media_call( 'assign-media-folder', $assign ), 'Assignment replay does not duplicate membership.' );
$unassign                = $assign;
$unassign['request_id'] .= '-clear';
$unassign['revision']    = $revision();
$unassign['folder_id']   = 0;
modula_media_assert( 0 === modula_media_call( 'assign-media-folder', $unassign )['membership']['folder_id'], 'Explicit unassign returns Uncategorized.' );
$assign['request_id'] .= '-again';
$assign['revision']    = $revision();
modula_media_assert( 'succeeded' === modula_media_call( 'assign-media-folder', $assign )['status'], 'Reassignment succeeds.' );
// Known usage comes from actual saves, including two independent gallery documents.
$galleries = array();
$before    = array();
for ( $index = 0;
$index < 2;
++$index ) {
	$gallery = modula_media_call(
		'create-gallery',
		array(
			'request_id'     => $prefix . '-gallery-' . $index,
			'title'          => $prefix . '-gallery-' . $index,
			'status'         => 'publish',
			'attachment_ids' => array( $attachment ),
		)
	);
	modula_media_assert( 'succeeded' === $gallery['status'], 'Create sharing gallery.' );
	$gallery_id            = $gallery['gallery']['id'];
	$galleries[]           = $gallery['gallery'];
	$before[ $gallery_id ] = get_post_meta( $gallery_id );
}
$page_id    = modula_e2e_insert(
	array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => $prefix . '-visitor',
		'post_content' => '[modula id="' . $galleries[0]['id'] . '"][modula id="' . $galleries[1]['id'] . '"]',
	)
);
$usage_page = modula_e2e_insert(
	array(
		'post_type'    => 'page',
		'post_status'  => 'private',
		'post_title'   => $prefix . '-usage',
		'post_content' => '<img class="wp-image-' . $attachment . '" />',
	)
);
$usage      = modula_media_call(
	'read-attachment-usage',
	array(
		'id'       => $attachment,
		'per_page' => 1,
	)
);
modula_media_assert( 3 === $usage['total'] && 1 === count( $usage['usages'] ) && false !== strpos( $usage['scope'], 'not covered' ), 'Usage pagination declares bounded coverage.' );
$denied = static function ( $caps, $cap, $user, $args ) use ( $usage_page ) {
	return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $usage_page ? array( 'do_not_allow' ) : $caps;
};
add_filter( 'map_meta_cap', $denied, 10, 4 );
modula_media_assert( 2 === modula_media_call( 'read-attachment-usage', array( 'id' => $attachment ) )['total'], 'Protected reference and count are not leaked.' );
remove_filter( 'map_meta_cap', $denied );
// Bound usage follows source membership and exclusions without writing gallery metadata.
$bound        = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'draft',
		'post_title'  => $prefix . '-bound',
		'meta_input'  => array(
			'_modula_beta'             => '1',
			'_modula_bind_target_type' => 'media_folder',
			'_modula_bind_target_id'   => (string) $id,
		),
	)
);
$bound_before = get_post_meta( $bound );
modula_media_assert( 4 === modula_media_call( 'read-attachment-usage', array( 'id' => $attachment ) )['total'], 'New source member is known usage in a bound gallery without stored image rows.' );
modula_media_assert( $bound_before === get_post_meta( $bound ), 'Bound usage does not repair metadata.' );
\Modula\Bound_Gallery\Bound_Gallery::exclude_attachment( $bound, $attachment );
modula_media_assert( 3 === modula_media_call( 'read-attachment-usage', array( 'id' => $attachment ) )['total'], 'Bound exclusions remove displayed usage.' );
\Modula\Bound_Gallery\Bound_Gallery::restore_attachment( $bound, $attachment );
\WPChill\Folders\Rest\Memberships_Controller::service()->unassign( array( 'object_id' => $attachment ) );
modula_media_assert( 3 === modula_media_call( 'read-attachment-usage', array( 'id' => $attachment ) )['total'], 'Departed source members are not reported as bound usage.' );
\WPChill\Folders\Rest\Memberships_Controller::service()->assign(
	array(
		'object_id' => $attachment,
		'folder_id' => $id,
	)
);
wp_delete_post( $bound, true );
// Existing text can exceed new-write limits; unrelated sparse changes still succeed.
wp_update_post(
	array(
		'ID'           => $attachment,
		'post_title'   => str_repeat( 'T', 250 ),
		'post_content' => str_repeat( 'D', 66000 ),
	)
);
update_post_meta( $attachment, '_wp_attachment_image_alt', str_repeat( 'A', 2100 ) );
$long = modula_media_call( 'read-attachment', array( 'id' => $attachment ) );
modula_media_assert( ! is_wp_error( $long ) && 250 === strlen( $long['attachment']['text']['title'] ), 'Read accepts existing long text.' );
$long_patch = modula_media_call(
	'update-attachment-text',
	array(
		'request_id' => $prefix . '-long',
		'id'         => $attachment,
		'revision'   => $long['attachment']['revision'],
		'text'       => array( 'caption' => 'Only caption' ),
	)
);
modula_media_assert( 'succeeded' === $long_patch['status'] && 66000 === strlen( $long_patch['attachment']['text']['description'] ), 'Sparse update preserves oversized unrequested text.' );
$all_text = array(
	'title'       => 'Native shared title',
	'description' => '<p>Native shared description</p>',
	'caption'     => 'Native shared caption',
	'alt'         => 'Native shared alt',
);
$patch    = array(
	'request_id' => $prefix . '-all-text',
	'id'         => $attachment,
	'revision'   => modula_media_call( 'read-attachment', array( 'id' => $attachment ) )['attachment']['revision'],
	'text'       => $all_text,
);
$saved    = modula_media_call( 'update-attachment-text', $patch );
modula_media_assert( 'succeeded' === $saved['status'] && $all_text === $saved['attachment']['text'], 'All four text fields remain distinct.' );
$rest = new WP_REST_Request( 'POST', '/wp/v2/media/' . $attachment );
$rest->set_param( 'title', 'Later library title' );
modula_media_assert( 200 === rest_do_request( $rest )->get_status(), 'Media Library writer succeeds.' );
modula_media_assert( $saved === modula_media_call( 'update-attachment-text', $patch ), 'Text replay recovers the old result without writing again.' );
$stale                = $patch;
$stale['request_id'] .= '-stale';
modula_media_assert( 'conflict' === modula_media_call( 'update-attachment-text', $stale )['status'], 'Media Library changes invalidate the attachment revision.' );
$invalid                    = $patch;
$invalid['request_id']     .= '-invalid';
$invalid['text']['unknown'] = 'no';
modula_media_assert( 'rejected' === modula_media_call( 'update-attachment-text', $invalid )['status'], 'Unknown field rejects the entire text patch.' );
$clear   = array(
	'request_id' => $prefix . '-clear',
	'id'         => $attachment,
	'revision'   => modula_media_call( 'read-attachment', array( 'id' => $attachment ) )['attachment']['revision'],
	'text'       => array( 'caption' => '' ),
);
$cleared = modula_media_call( 'update-attachment-text', $clear );
modula_media_assert( 'succeeded' === $cleared['status'] && '' === $cleared['attachment']['text']['caption'] && 'Later library title' === $cleared['attachment']['text']['title'], 'Explicit clear preserves omitted title.' );
$denied = static function ( $caps, $cap, $user, $args ) use ( $attachment ) {
	return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $attachment ? array( 'do_not_allow' ) : $caps;
};
add_filter( 'map_meta_cap', $denied, 10, 4 );
modula_media_assert( 'forbidden' === modula_media_call( 'recover-request', array( 'request_id' => $patch['request_id'] ) )['status'], 'Revoked attachment access redacts recovery.' );
modula_media_assert( 0 === modula_media_call( 'list-attachments', array( 'folder_id' => $id ) )['total'], 'Inaccessible members are absent from list and total.' );
$delete = array(
	'request_id' => $prefix . '-delete-denied',
	'id'         => $id,
	'revision'   => $revision(),
);
modula_media_assert( 'rejected' === modula_media_call( 'delete-media-folder', $delete )['status'], 'Folder delete refuses inaccessible affected members.' );
remove_filter( 'map_meta_cap', $denied );
$delete['request_id'] .= '-allowed';
$delete['revision']    = $revision();
$deleted               = modula_media_call( 'delete-media-folder', $delete );
modula_media_assert( 'succeeded' === $deleted['status'], 'Folder deletion succeeds.' );
modula_media_assert( $deleted === modula_media_call( 'delete-media-folder', $delete ), 'Deleted folder recovery retains the outcome.' );
modula_media_assert( 0 === modula_media_call( 'read-attachment', array( 'id' => $attachment ) )['attachment']['folder_id'] && $hash === hash_file( 'sha256', $file ), 'Delete clears organization and preserves bytes.' );
foreach ( $before as $gallery_id => $meta ) {
	modula_media_assert( $meta === get_post_meta( $gallery_id ), 'Text and usage leave gallery composition/metadata intact.' );
}
// Owned storage-residence fixture: no provider is contacted and no bytes move.
$wpdb->update(
	$wpdb->prefix . 'wpchill_folders',
	array(
		'connection_id' => 'e2e-connection',
		'remote_prefix' => $prefix . '/',
	),
	array( 'id' => $child_id )
);
$storage = modula_media_call(
	'update-media-folder',
	array(
		'request_id' => $prefix . '-storage',
		'id'         => $child_id,
		'revision'   => $revision(),
		'changes'    => array( 'name' => $prefix . '-storage' ),
	)
);
modula_media_assert( ( 'lite' === getenv( 'MODULA_E2E_MODE' ) ? 'rejected' : 'succeeded' ) === $storage['status'], 'Storage residence requires current host storage entitlement.' );
$storage_assign = modula_media_call(
	'assign-media-folder',
	array(
		'request_id'  => $prefix . '-storage-assign',
		'id'          => $attachment,
		'object_type' => 'attachment',
		'folder_id'   => $child_id,
		'revision'    => $revision(),
	)
);
modula_media_assert( 'rejected' === $storage_assign['status'] && $hash === hash_file( 'sha256', $file ), 'Organization cannot silently trigger offload.' );
$wpdb->update(
	$wpdb->prefix . 'wpchill_folders',
	array(
		'connection_id' => null,
		'remote_prefix' => null,
	),
	array( 'id' => $child_id )
);
$transfer_key                                   = 'wpchill_folders_folder_transfer';
$prior_transfer                                 = get_option( $transfer_key, null );
$state['ability_site_options'][ $transfer_key ] = array(
	'exists' => null !== $prior_transfer,
	'value'  => $prior_transfer,
);
update_option( $key, $state, false );
update_option(
	$transfer_key,
	array(
		'status'            => 'running',
		'locked_folder_ids' => array( $child_id ),
	),
	false
);
$locked = modula_media_call(
	'update-media-folder',
	array(
		'request_id' => $prefix . '-locked',
		'id'         => $child_id,
		'revision'   => $revision(),
		'changes'    => array( 'name' => $prefix . '-locked' ),
	)
);
modula_media_assert( 'rejected' === $locked['status'] && 'folder_locked' === $locked['code'], 'Active transfer locks are respected in both modes.' );
if ( null === $prior_transfer ) {
	delete_option( $transfer_key );
} else {
	update_option( $transfer_key, $prior_transfer, false );
}
wp_set_current_user( 0 );
modula_media_assert( is_wp_error( modula_media_call( 'read-attachment', array( 'id' => $attachment ) ) ), 'Anonymous attachment reads denied.' );
wp_set_current_user( $actor->ID );
require __DIR__ . '/abilities-collections.php';
require __DIR__ . '/abilities-attachment-lifecycle.php';
require __DIR__ . '/abilities-image-selection.php';
modula_e2e_output(
	array(
		'visual_checks' => $visual_checks,
		'selection_checks' => $selection_checks,
		'folder_id'      => $child_id,
		'lifecycle' => $lifecycle_fixture,
		'attachment_id'  => $attachment,
		'galleries'      => $galleries,
		'page'           => get_permalink( $page_id ),
		'adapter_loaded' => class_exists( '\WP\MCP\Core\McpAdapter' ),
	)
);
