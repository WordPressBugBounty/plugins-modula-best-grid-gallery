<?php
/** Included by the existing owned album native journey. */
$life = static function ( $verb, $album, $suffix, $status = null ) use ( $abilities, $prefix ) {
 $read = $abilities['modula/read-album-lifecycle']->execute( array( 'id' => $album ) );
 modula_album_assert( ! is_wp_error( $read ), 'Read lifecycle including trash.' );
 $input = array( 'request_id' => $prefix . '-life-' . $suffix, 'id' => $album, 'revision' => $read['revision'] );
 if ( null !== $status ) { $input['status'] = $status; }
 $out = $abilities['modula/' . $verb . '-album']->execute( $input );
 return array( $input, $out );
};
$source = $make_album( 'lifecycle-source' ); $nested = $make_album( 'lifecycle-child' ); $parent = $make_album( 'lifecycle-parent' );
modula_album_assert( 'succeeded' === $set_members( $source, array( array( 'id' => $nested, 'itemType' => 'modula-album' ), array( 'id' => $member_id, 'itemType' => 'modula-gallery' ) ), 'life-members' )['status'], 'Lifecycle members can be composed.' );

modula_album_assert( 'succeeded' === $set_members( $parent, array( array( 'id' => $source, 'itemType' => 'modula-album' ) ), 'life-parent' )['status'], 'Lifecycle parent composed.' );
$source_members = $abilities['modula/read-album-members']->execute( array( 'id' => $source ) )['members'];
list( $duplicate_input, $duplicate ) = $life( 'duplicate', $source, 'duplicate', 'draft' );
modula_album_assert( 'succeeded' === $duplicate['status'], 'Duplicate album succeeds: ' . wp_json_encode( $duplicate ) );
$copy = $duplicate['album']['id'];
modula_album_assert( $source_members === $abilities['modula/read-album-members']->execute( array( 'id' => $copy ) )['members'] && (int) get_post( $nested )->post_parent === $source && 0 === (int) get_post( $copy )->post_parent, 'Copy preserves members without stealing hierarchy.' );
modula_album_assert( $duplicate === $abilities['modula/duplicate-album']->execute( $duplicate_input ), 'Duplicate replay returns identical copy.' );
$stale = $duplicate_input; $stale['request_id'] .= '-stale';
modula_album_assert( 'conflict' === $abilities['modula/duplicate-album']->execute( $stale )['status'], 'Changed graph refuses stale lifecycle.' );
list( $trash_input, $trashed ) = $life( 'trash', $source, 'trash' );
modula_album_assert( 'succeeded' === $trashed['status'] && 'trash' === get_post_status( $source ) && (int) get_post( $nested )->post_parent === $source, 'Trash preserves child parentage.' );
modula_album_assert( array( $source ) === array_column( $abilities['modula/read-album-members']->execute( array( 'id' => $parent ) )['members'], 'id' ), 'Trash preserves parent membership.' );
list( $restore_input, $restored ) = $life( 'restore', $source, 'restore', 'publish' );
modula_album_assert( 'succeeded' === $restored['status'] && 'publish' === get_post_status( $source ), 'Explicit published restore succeeds.' );
$deny_child = static function ( $caps, $cap, $user, $args ) use ( $nested ) { return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $nested ? array( 'do_not_allow' ) : $caps; };
add_filter( 'map_meta_cap', $deny_child, 10, 4 );
list( , $denied_delete ) = $life( 'delete', $source, 'denied-child' );
remove_filter( 'map_meta_cap', $deny_child );
modula_album_assert( 'rejected' === $denied_delete['status'] && get_post( $source ) && (int) get_post( $nested )->post_parent === $source, 'Inaccessible child prevents partial deletion.' );
// A classic parent must never be pruned implicitly.
update_post_meta( $classic, 'modula-album-galleries', array( array( 'id' => $source, 'itemType' => 'modula-album' ) ) );
list( , $classic_denial ) = $life( 'delete', $source, 'classic-parent' );
modula_album_assert( 'rejected' === $classic_denial['status'] && get_post( $source ), 'Classic affected parent refuses deletion.' );
update_post_meta( $classic, 'modula-album-galleries', array() );
list( $delete_input, $deleted ) = $life( 'delete', $source, 'delete' );
modula_album_assert( 'succeeded' === $deleted['status'] && ! get_post( $source ) && get_post( $member_id ) && get_post( $nested ) && 0 === (int) get_post( $nested )->post_parent, 'Delete detaches Beta child and preserves member objects.' );
modula_album_assert( array() === $abilities['modula/read-album-members']->execute( array( 'id' => $parent ) )['members'], 'Deleted album pruned from its parent.' );
modula_album_assert( $deleted === $abilities['modula/delete-album']->execute( $delete_input ), 'Missing target replays retained deletion.' );
add_filter( 'map_meta_cap', $deny_child, 10, 4 );
modula_album_assert( 'forbidden' === $abilities['modula/recover-request']->execute( array( 'request_id' => $delete_input['request_id'] ) )['status'], 'Deleted outcome rechecks affected child access.' );
remove_filter( 'map_meta_cap', $deny_child );
// Duplicate preserves existing classic references, but cannot activate unavailable layouts.
$classic_members = array( $classic_row );
update_post_meta( $copy, 'modula_album_members_v2', wp_json_encode( array( 'members' => $classic_members ) ) );
update_post_meta( $copy, 'modula-album-galleries', $classic_members );
$classic_state = get_post( $classic )->to_array();
list( , $classic_copy ) = $life( 'duplicate', $copy, 'classic-copy', 'draft' );
modula_album_assert( 'succeeded' === $classic_copy['status'] && $classic_state === get_post( $classic )->to_array() && array_column( $abilities['modula/read-album-members']->execute( array( 'id' => $classic_copy['album']['id'] ) )['members'], 'id' ) === array( $classic ), 'Duplicate preserves classic reference without reparenting: ' . wp_json_encode( $classic_copy ) );
$slider_change = $abilities['modula/update-album']->execute( array( 'request_id' => $prefix . '-life-slider-source', 'id' => $copy, 'revision' => $abilities['modula/read-album']->execute( array( 'id' => $copy ) )['album']['revision'], 'settings' => array( 'general' => array( 'albumType' => 'slider' ) ) ) );
modula_album_assert( 'succeeded' === $slider_change['status'], 'Prepare source using enabled slider.' );
$active_extensions = get_option( 'modula_pro_active_extensions', array() );
$deny_slider = static function () use ( $active_extensions ) { return array_diff( $active_extensions, array( 'modula-slider' ) ); };
add_filter( 'pre_option_modula_pro_active_extensions', $deny_slider );
list( , $blocked_copy ) = $life( 'duplicate', $copy, 'disabled-slider', 'draft' );
remove_filter( 'pre_option_modula_pro_active_extensions', $deny_slider );
modula_album_assert( 'rejected' === $blocked_copy['status'] && ! isset( $blocked_copy['album'] ), 'Disabled slider refuses duplicate before creating a copy.' );

// Older Beta documents may carry only flat settings. Inspection must not repair them.
delete_post_meta( $copy, 'modula_album_settings_v2' );
add_filter( 'pre_option_modula_pro_active_extensions', $deny_slider );
list( , $blocked_flat_copy ) = $life( 'duplicate', $copy, 'disabled-flat-slider', 'draft' );
remove_filter( 'pre_option_modula_pro_active_extensions', $deny_slider );
modula_album_assert( 'rejected' === $blocked_flat_copy['status'] && ! metadata_exists( 'post', $copy, 'modula_album_settings_v2' ), 'Flat-only unavailable source refuses copying without read repair.' );
