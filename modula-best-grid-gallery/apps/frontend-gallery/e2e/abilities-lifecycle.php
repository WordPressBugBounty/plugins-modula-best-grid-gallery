<?php
/** Real native lifecycle contract, owned by the shared fixture lifecycle. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! isset( $state['run'] ) || $state['run'] !== getenv( 'MODULA_E2E_RUN' ) ) { exit( 1 ); }
function modula_lifecycle_assert( $ok, $message ) { if ( ! $ok ) { WP_CLI::error( $message ); } }
$users = get_users( array( 'meta_key' => $marker, 'meta_value' => $run, 'fields' => 'ID' ) );
wp_set_current_user( $users[0] );
$prefix = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '-' . $action;
$ability = wp_get_abilities()['modula/duplicate-gallery'] ?? null;
modula_lifecycle_assert( $ability instanceof WP_Ability, 'Native duplicate-gallery must be registered.' );
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$id = $catalog['galleries']['visible']['id'];
$read = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
$input = array( 'request_id' => $prefix . '-copy', 'id' => $id, 'revision' => $read['gallery']['revision'], 'status' => 'draft' );
$out = $ability->execute( $input );
modula_lifecycle_assert( 'succeeded' === ( $out['status'] ?? '' ), 'Duplicate succeeds: ' . wp_json_encode( $out ) );
$copy = $out['gallery']['id'];
update_post_meta( $copy, $marker, $run );
$after = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $copy ) );
modula_lifecycle_assert( 'draft' === $after['gallery']['status'] && $read['items'] === $after['items'] && $read['gallery']['settings'] == $after['gallery']['settings'], 'Draft copy preserves settings and composition: ' . wp_json_encode( array( 'before' => $read, 'after' => $after ) ) );
modula_lifecycle_assert( $out === $ability->execute( $input ), 'Replay returns the same copy.' );
$revoked = false;
$attempted_copy = 0;
$revoke_copy = static function ( $post_id, $post ) use ( &$revoked, &$attempted_copy ) {
 if ( 'modula-gallery' === $post->post_type && 0 === strpos( $post->post_title, 'Copy of ' ) ) { $attempted_copy = $post_id; $revoked = true; }
};
$deny_publication = static function ( $caps ) use ( &$revoked ) { if ( $revoked ) { $caps[ get_post_type_object( 'modula-gallery' )->cap->publish_posts ] = false; } return $caps; };
add_action( 'wp_after_insert_post', $revoke_copy, 10, 2 );
add_filter( 'user_has_cap', $deny_publication );
$revoked_input = $input; $revoked_input['request_id'] .= '-revoked'; $revoked_input['status'] = 'publish';
$revoked_result = $ability->execute( $revoked_input );
remove_action( 'wp_after_insert_post', $revoke_copy );
remove_filter( 'user_has_cap', $deny_publication );
modula_lifecycle_assert( 'forbidden' === $revoked_result['status'] && $attempted_copy && ! get_post( $attempted_copy ), 'Publication revoked by a copy hook prevents publishing, rolls back the copy and redacts the result.' );
modula_lifecycle_assert( 'uncertain' === wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $revoked_input['request_id'] ) )['status'], 'Restored permissions recover the interrupted copy outcome.' );
$hashes = array();
foreach ( $read['items'] as $item ) { if ( is_int( $item['id'] ) ) { $hashes[ $item['id'] ] = hash_file( 'sha256', get_attached_file( $item['id'] ) ); } }
$life = static function ( $name, $suffix, $extra = array() ) use ( $copy, $prefix ) {
 $fresh = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $copy ) );
 $input = array_merge( array( 'id' => $copy, 'request_id' => $prefix . $suffix, 'revision' => $fresh['gallery']['revision'] ), $extra );
 return array( wp_get_ability( 'modula/' . $name . '-gallery' )->execute( $input ), $input );
};
$album = 0;
if ( 'pro' === getenv( 'MODULA_E2E_MODE' ) ) {
 $album = modula_e2e_insert( array( 'post_type' => 'modula-album', 'post_status' => 'publish', 'post_title' => 'Lifecycle album', 'post_author' => $users[0], 'meta_input' => array( 'modula-album-galleries' => array( array( 'id' => -$copy, 'itemType' => '<b>modula-gallery</b>' ) ) ) ) );
 $blocked = $life( 'trash', '-classic-album' );
 modula_lifecycle_assert( 'unsupported_album_reference' === $blocked[0]['code'] && 'draft' === get_post_status( $copy ) && '' === get_post_meta( $album, 'modula_album_members_v2', true ), 'Even normalized malformed classic references are refused without conversion.' );
 update_post_meta( $album, '_modula_beta', 1 );
 $deny_album = static function ( $caps, $cap, $actor, $args ) use ( $album ) { return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $album ? array( 'do_not_allow' ) : $caps; };
 add_filter( 'map_meta_cap', $deny_album, 10, 4 );
 $unauthorized_album = $life( 'trash', '-album-forbidden' );
 remove_filter( 'map_meta_cap', $deny_album );
 modula_lifecycle_assert( 'unsupported_album_reference' === $unauthorized_album[0]['code'] && 'draft' === get_post_status( $copy ), 'Unauthorized affected album prevents lifecycle effects.' );
 $stale_input = $blocked[1]; $stale_input['request_id'] .= '-stale';
 modula_lifecycle_assert( 'conflict' === wp_get_ability( 'modula/trash-gallery' )->execute( $stale_input )['status'], 'Changed album dependency invalidates gallery revision.' );
}
$trash = $life( 'trash', '-trash' );
modula_lifecycle_assert( 'succeeded' === $trash[0]['status'] && 'trash' === $trash[0]['gallery']['status'], 'Trash is reversible: ' . wp_json_encode( $trash[0] ) );
$revoked = false;
$revoke_restore = static function () use ( &$revoked ) { $revoked = true; };
add_action( 'untrashed_post', $revoke_restore );
add_filter( 'user_has_cap', $deny_publication );
$revoked_restore = $life( 'restore', '-restore-revoked', array( 'status' => 'publish' ) );
remove_action( 'untrashed_post', $revoke_restore );
remove_filter( 'user_has_cap', $deny_publication );
modula_lifecycle_assert( 'forbidden' === $revoked_restore[0]['status'] && 'trash' === get_post_status( $copy ), 'Publication revoked by a restore hook preserves the trashed state and redacts the result.' );
modula_lifecycle_assert( 'uncertain' === wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $revoked_restore[1]['request_id'] ) )['status'], 'Restored permissions recover the interrupted restore outcome.' );
$restore = $life( 'restore', '-restore', array( 'status' => 'publish' ) );
modula_lifecycle_assert( 'succeeded' === $restore[0]['status'] && 'publish' === $restore[0]['gallery']['status'], 'Restore requires explicit publication: ' . wp_json_encode( $restore[0] ) );
if ( $album ) {
 $members = \Modula_Pro\Extensions\Albums\V2\Members_Document::get_document( $album );
 modula_lifecycle_assert( ! empty( get_post_meta( $album, 'modula-album-galleries', true ) ), 'Trash and restore retain membership.' );
}
$nested = 0;
if ( $album ) {
 $nested = modula_e2e_insert( array( 'post_type' => 'modula-album', 'post_status' => 'publish', 'post_title' => 'Classic nested preserve', 'post_parent' => 0 ) );
 $doc = array( 'members' => array( array( 'id' => $copy, 'itemType' => 'modula-gallery' ), array( 'id' => $nested, 'itemType' => 'modula-album' ) ) );
 update_post_meta( $album, 'modula_album_members_v2', wp_json_encode( $doc ) );
 wp_trash_post( $album );
}
$delete = $life( 'delete', '-delete' );
if ( $album ) { modula_lifecycle_assert( array( $nested ) === array_column( get_post_meta( $album, 'modula-album-galleries', true ), 'id' ) && 0 === (int) get_post( $nested )->post_parent && '' === get_post_meta( $nested, 'modula_album_members_v2', true ), 'Permanent delete prunes only the gallery and never reparents or initializes a classic nested album.' ); }
modula_lifecycle_assert( 'succeeded' === $delete[0]['status'] && ! get_post( $copy ), 'Permanent deletion succeeds.' );
modula_lifecycle_assert( $delete[0] === wp_get_ability( 'modula/delete-gallery' )->execute( $delete[1] ) && $delete[0] === wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $delete[1]['request_id'] ) ), 'Deleted target recovers and replays without requiring the missing post.' );
foreach ( $hashes as $attachment => $hash ) { modula_lifecycle_assert( get_post( $attachment ) && $hash === hash_file( 'sha256', get_attached_file( $attachment ) ), 'Lifecycle preserves shared attachments and bytes.' ); }
$denied = static function ( $allcaps ) { $type = get_post_type_object( 'modula-gallery' ); $allcaps[ $type->cap->delete_posts ] = false; $allcaps[ $type->cap->delete_published_posts ] = false; return $allcaps; };
add_filter( 'user_has_cap', $denied );
modula_lifecycle_assert( 'forbidden' === wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $delete[1]['request_id'] ) )['status'], 'Deleted outcome rechecks retained primitive permissions.' );
remove_filter( 'user_has_cap', $denied );
$fresh = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
$input['revision'] = $fresh['gallery']['revision']; $input['request_id'] .= '-browser';
$out = $ability->execute( $input );
modula_lifecycle_assert( 'succeeded' === $out['status'], 'Browser fixture copy created.' );
update_post_meta( $out['gallery']['id'], $marker, $run );
$copy = $out['gallery']['id'];
$page_id = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Lifecycle gallery page', 'post_content' => '[modula id="' . $copy . '"]' ) );
$album_id = 0; $album_page = '';
if ( 'pro' === getenv( 'MODULA_E2E_MODE' ) ) {
 $album_id = modula_e2e_insert( array( 'post_type' => 'modula-album', 'post_status' => 'publish', 'post_title' => 'Lifecycle browser album', 'post_author' => $users[0], 'meta_input' => array( '_modula_beta' => 1, 'modula-album-galleries' => array( array( 'id' => $copy, 'itemType' => 'modula-gallery' ) ) ) ) );
 \Modula_Pro\Extensions\Albums\V2\Members_Document::ensure_document_from_classic( $album_id );
 $album_page = get_permalink( modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Lifecycle album page', 'post_content' => '[modula-album id="' . $album_id . '"]' ) ) );
}
modula_e2e_output( array( 'page' => get_permalink( $page_id ), 'album' => $album_id, 'album_page' => $album_page, 'input' => $input, 'outcome' => $out, 'adapter_loaded' => class_exists( '\\WP\\MCP\\Core\\McpAdapter' ) ) );
