<?php
/** Real local original/derivative lifecycle, using owned files only. */
$lifecycle_call = static function ( $operation, $id, $suffix ) use ( $prefix ) {
	$read = modula_media_call( 'read-attachment', array( 'id' => $id ) );
	return modula_media_call(
		$operation,
		array(
			'id'         => $id,
			'revision'   => $read['attachment']['revision'],
			'request_id' => $prefix . '-life-' . $suffix,
		)
	);
};
$blocked        = $lifecycle_call( 'delete-attachment', $attachment, 'in-use' );
modula_media_assert( 'rejected' === $blocked['status'] && 'attachment_in_use' === $blocked['code'] && is_file( $file ) && get_post( $attachment ), 'Known gallery/content usage preserves object and bytes.' );
$life_create = static function ( $suffix ) use ( $prefix, $run, $marker, $actor, $file, $uploads ) {
	$path = $uploads['basedir'] . '/' . $run . '/' . $prefix . '-life-' . $suffix . '.jpg';
	modula_media_assert( copy( $file, $path ), 'Copy owned lifecycle original.' );
	$id = wp_insert_attachment(
		array(
			'post_mime_type' => 'image/jpeg',
			'post_title'     => $prefix . '-life-' . $suffix,
			'post_author'    => $actor->ID,
			'meta_input'     => array( $marker => $run ),
		),
		$path
	);
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $path ) );
	return array(
		'id'   => $id,
		'file' => $path,
	);
};
$life        = $life_create( 'native' );
$deny_life   = static function ( $caps, $cap, $user_id, $args ) use ( $life ) {
	return 'delete_post' === $cap && (int) ( $args[0] ?? 0 ) === $life['id'] ? array( 'do_not_allow' ) : $caps;
};
add_filter( 'map_meta_cap', $deny_life, 10, 4 );
$denied_life = $lifecycle_call( 'delete-attachment', $life['id'], 'denied' );
modula_media_assert( 'forbidden' === $denied_life['status'] && is_file( $life['file'] ), 'Object delete permission is required before bytes.' );
remove_filter( 'map_meta_cap', $deny_life );
// Hidden references still block deletion without exposing their identities.
$hidden_gallery = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'private',
		'post_title'  => $prefix . '-hidden-reference',
	)
);
update_post_meta( $hidden_gallery, 'modula-images', array( array( 'id' => $life['id'] ) ) );
$hide_gallery = static function ( $caps, $cap, $user_id, $args ) use ( $hidden_gallery ) {
	return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $hidden_gallery ? array( 'do_not_allow' ) : $caps;
};
add_filter( 'map_meta_cap', $hide_gallery, 10, 4 );
$hidden_result = $lifecycle_call( 'delete-attachment', $life['id'], 'hidden' );
modula_media_assert( 'attachment_in_use' === $hidden_result['code'] && ! isset( $hidden_result['usages'] ), 'Hidden gallery usage blocks deletion without disclosure.' );
remove_filter( 'map_meta_cap', $hide_gallery );
wp_delete_post( $hidden_gallery, true );
$life_hash = hash_file( 'sha256', $life['file'] );
$trash     = $lifecycle_call( 'trash-attachment', $life['id'], 'trash' );
if ( MEDIA_TRASH && EMPTY_TRASH_DAYS ) {
	modula_media_assert( 'succeeded' === $trash['status'] && 'trash' === get_post_status( $life['id'] ), 'Supported WordPress media trash is reversible.' );
	$restore = $lifecycle_call( 'restore-attachment', $life['id'], 'restore' );
	modula_media_assert( 'succeeded' === $restore['status'] && 'trash' !== get_post_status( $life['id'] ), 'Restore returns attachment to Media Library.' );
} else {
	modula_media_assert( 'rejected' === $trash['status'] && 'media_trash_disabled' === $trash['code'] && get_post( $life['id'] ), 'Disabled media trash never falls through to permanent deletion.' );
}
modula_media_assert( $life_hash === hash_file( 'sha256', $life['file'] ), 'Trash/restore preserves original bytes.' );
$refuse = static function ( $check, $post ) use ( $life ) {
	return $post->ID === $life['id'] ? false : $check;
};
add_filter( 'pre_delete_attachment', $refuse, 99, 2 );
$refused = $lifecycle_call( 'delete-attachment', $life['id'], 'refuse' );
remove_filter( 'pre_delete_attachment', $refuse, 99 );
modula_media_assert( 'rejected' === $refused['status'] && is_file( $life['file'] ) && get_post( $life['id'] ), 'WordPress service refusal preserves object and bytes.' );
$stale = modula_media_call( 'read-attachment', array( 'id' => $life['id'] ) )['attachment']['revision'];
wp_update_post(
	array(
		'ID'         => $life['id'],
		'post_title' => $prefix . '-later-library',
	)
);
$stale_result = modula_media_call(
	'delete-attachment',
	array(
		'id'         => $life['id'],
		'revision'   => $stale,
		'request_id' => $prefix . '-life-stale',
	)
);
modula_media_assert( 'conflict' === $stale_result['status'] && is_file( $life['file'] ), 'Stale lifecycle revision preserves bytes.' );
$delete_input = array(
	'id'         => $life['id'],
	'revision'   => modula_media_call( 'read-attachment', array( 'id' => $life['id'] ) )['attachment']['revision'],
	'request_id' => $prefix . '-life-delete',
);
$meta         = wp_get_attachment_metadata( $life['id'] );
$deleted      = modula_media_call( 'delete-attachment', $delete_input );
modula_media_assert( 'succeeded' === $deleted['status'] && ! get_post( $life['id'] ) && ! file_exists( $life['file'] ), 'Eligible local attachment and original are deleted: ' . wp_json_encode( $deleted ) );
foreach ( $meta['sizes'] ?? array() as $size ) {
	modula_media_assert( ! file_exists( dirname( $life['file'] ) . '/' . $size['file'] ), 'Known derivative deleted.' ); }
modula_media_assert( $deleted === modula_media_call( 'delete-attachment', $delete_input ) && $deleted === modula_media_call( 'recover-request', array( 'request_id' => $delete_input['request_id'] ) ), 'Deletion recovery survives missing target.' );
$remote = $life_create( 'mapped' );
update_post_meta(
	$remote['id'],
	'_wpchill_storage',
	array(
		'connection_id' => 'owned-unconnected-provider',
		'key'           => 'fixture.jpg',
	)
);
$remote_result = $lifecycle_call( 'delete-attachment', $remote['id'], 'mapped' );
modula_media_assert( 'rejected' === $remote_result['status'] && 'remote_media_unsupported' === $remote_result['code'] && is_file( $remote['file'] ), 'Mapped attachment cannot invoke remote effects implicitly.' );
delete_post_meta( $remote['id'], '_wpchill_storage' );
// A file service which leaves bytes must yield uncertain even though WordPress removed its row.
$partial      = $life_create( 'file-refused' );
$prevent_file = static function ( $path ) use ( $partial ) {
	return $path === $partial['file'] ? '' : $path;
};
add_filter( 'wp_delete_file', $prevent_file, 99 );
$partial_result = $lifecycle_call( 'delete-attachment', $partial['id'], 'file-refused' );
remove_filter( 'wp_delete_file', $prevent_file, 99 );
modula_media_assert( 'uncertain' === $partial_result['status'] && is_file( $partial['file'] ) && ! get_post( $partial['id'] ), 'Unconfirmed bytes never report success or resurrect missing-file attachment rows.' );
// Outcome persistence failure after bytes are gone must not resurrect a DB row.
$confirmation      = $life_create( 'confirmation-failure' );
$fail_once         = false;
$fail_confirmation = static function ( $sql ) use ( $confirmation, &$fail_once ) {
	if ( ! $fail_once && ! file_exists( $confirmation['file'] ) && false !== strpos( $sql, 'modula_ability_result_' ) && preg_match( '/^(?:INSERT|UPDATE)/i', $sql ) ) {
		$fail_once = true;
		throw new \RuntimeException( 'Owned outcome persistence failure.' ); }
	return $sql;
};
add_filter( 'query', $fail_confirmation, 99 );
$unconfirmed = $lifecycle_call( 'delete-attachment', $confirmation['id'], 'confirmation-failure' );
remove_filter( 'query', $fail_confirmation, 99 );
modula_media_assert( $fail_once && 'uncertain' === $unconfirmed['status'] && ! get_post( $confirmation['id'] ) && ! is_file( $confirmation['file'] ), 'Outcome failure cannot roll back rows after file deletion.' );
modula_media_assert( $unconfirmed === modula_media_call( 'recover-request', array( 'request_id' => $prefix . '-life-confirmation-failure' ) ), 'Unconfirmed deletion is durably recoverable.' );
$lifecycle_fixture = $life_create( 'browser' );
