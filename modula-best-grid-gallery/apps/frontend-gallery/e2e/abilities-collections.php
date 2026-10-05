<?php
/** Native collections and favorites on owned media. */
$favorites = modula_media_call( 'list-favorites', array() );
modula_media_assert( isset( $favorites['revision'] ), 'Favorites discovery supplies a revision.' );
$collection_revision = static function () {
	return modula_media_call( 'list-favorites', array() )['revision'];
};
$star                = array(
	'request_id' => $prefix . '-star',
	'id'         => $attachment,
	'revision'   => $collection_revision(),
);
$starred             = modula_media_call( 'add-favorite', $star );
modula_media_assert( 'succeeded' === $starred['status'], 'Favorite save succeeds: ' . wp_json_encode( $starred ) );
modula_media_assert( $starred === modula_media_call( 'add-favorite', $star ), 'Favorite replay is stable.' );
modula_media_assert( in_array( $attachment, array_column( modula_media_call( 'list-favorites', array( 'per_page' => 100 ) )['attachments'], 'id' ), true ), 'Saved favorite is discoverable.' );
$unstar = array(
	'request_id' => $prefix . '-unstar',
	'id'         => $attachment,
	'revision'   => $collection_revision(),
);
modula_media_assert( 'succeeded' === modula_media_call( 'remove-favorite', $unstar )['status'], 'Favorite removal succeeds.' );
$stale_star                = $star;
$stale_star['request_id'] .= '-stale';
// A real organizer change must invalidate a previous snapshot.
\WPChill\Folders\Rest\Favorites_Controller::service()->star( array( 'object_id' => $attachment ) );
modula_media_assert( 'conflict' === modula_media_call( 'add-favorite', $stale_star )['status'], 'Ordinary favorite writes invalidate revisions.' );
\WPChill\Folders\Rest\Favorites_Controller::service()->unstar( array( 'object_id' => $attachment ) );
if ( ! \WPChill\Folders\Plugin::instance()->config()->folders() ) {
	modula_media_assert( is_wp_error( modula_media_call( 'list-collections', array() ) ), 'Lite collections respect the existing entitlement.' );
} else {
	$create             = array(
		'request_id' => $prefix . '-collection',
		'name'       => $prefix . '-collection',
		'color'      => '#d63638',
		'revision'   => $collection_revision(),
	);
	$created_collection = modula_media_call( 'create-collection', $create );
	modula_media_assert( 'succeeded' === $created_collection['status'], 'Collection creation succeeds: ' . wp_json_encode( $created_collection ) );
	$collection_id = $created_collection['collection']['id'];
	modula_media_assert( $created_collection === modula_media_call( 'create-collection', $create ), 'Collection replay preserves identity.' );
	$add   = array(
		'request_id'    => $prefix . '-label',
		'id'            => $attachment,
		'collection_id' => $collection_id,
		'revision'      => $collection_revision(),
	);
	$added = modula_media_call( 'add-collection-member', $add );
	modula_media_assert( 'succeeded' === $added['status'] && $added === modula_media_call( 'add-collection-member', $add ), 'Collection label is recoverable.' );
	$members = modula_media_call(
		'list-collection-members',
		array(
			'id'       => $collection_id,
			'per_page' => 1,
		)
	);
	modula_media_assert( 1 === $members['total'] && $attachment === $members['attachments'][0]['id'], 'Collection members paginate with existing identities.' );
	$deny_member = static function ( $caps, $cap, $user_id, $args ) use ( $attachment ) {
		return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $attachment ? array( 'do_not_allow' ) : $caps;
	};
	add_filter( 'map_meta_cap', $deny_member, 10, 4 );
	modula_media_assert( 0 === modula_media_call( 'list-collection-members', array( 'id' => $collection_id ) )['total'], 'Inaccessible collection members and counts remain hidden.' );
	$denied_delete = modula_media_call(
		'delete-collection',
		array(
			'request_id' => $prefix . '-denied-delete',
			'id'         => $collection_id,
			'revision'   => $collection_revision(),
		)
	);
	modula_media_assert( 'rejected' === $denied_delete['status'], 'Collection delete authorizes every affected member.' );
	$denied_recovery = modula_media_call( 'recover-request', array( 'request_id' => $add['request_id'] ) );
	modula_media_assert( 'forbidden' === $denied_recovery['status'], 'Recovery rechecks current member access.' );
	remove_filter( 'map_meta_cap', $deny_member );
	$rename = modula_media_call(
		'update-collection',
		array(
			'request_id' => $prefix . '-collection-rename',
			'id'         => $collection_id,
			'changes'    => array( 'name' => $prefix . '-renamed-collection' ),
			'revision'   => $collection_revision(),
		)
	);
	modula_media_assert( 'succeeded' === $rename['status'], 'Collection rename persists.' );
	$remove = modula_media_call(
		'remove-collection-member',
		array(
			'request_id'    => $prefix . '-unlabel',
			'id'            => $attachment,
			'collection_id' => $collection_id,
			'revision'      => $collection_revision(),
		)
	);
	modula_media_assert( 'succeeded' === $remove['status'] && 0 === modula_media_call( 'list-collection-members', array( 'id' => $collection_id ) )['total'], 'Member removal preserves attachment.' );
	$delete_collection  = array(
		'request_id' => $prefix . '-collection-delete',
		'id'         => $collection_id,
		'revision'   => $collection_revision(),
	);
	$deleted_collection = modula_media_call( 'delete-collection', $delete_collection );
	modula_media_assert( 'succeeded' === $deleted_collection['status'] && $deleted_collection === modula_media_call( 'delete-collection', $delete_collection ), 'Deleted collection remains recoverable.' );
}
modula_media_assert( hash_file( 'sha256', $file ) === $hash, 'Collections and favorites preserve bytes.' );
$collection_batch = array(
	'request_id' => $prefix . '-media-batch',
	'targets'    => array(
		array(
			'id'        => $attachment,
			'operation' => 'modula/add-favorite',
			'revision'  => $collection_revision(),
		),
		array(
			'id'        => 2147483647,
			'operation' => 'modula/remove-favorite',
			'revision'  => $collection_revision(),
		),
	),
);
$collection_batch['targets'][] = array( 'id' => 2147483646, 'operation' => 'modula/add-favorite', 'revision' => $collection_revision(), 'unexpected' => true );
$batch_result     = modula_media_call( 'update-media-batch', $collection_batch );
modula_media_assert( 'partial' === $batch_result['status'] && 'succeeded' === $batch_result['targets'][0]['status'] && 'forbidden' === $batch_result['targets'][1]['status'] && 'invalid_input' === $batch_result['targets'][2]['code'], 'Media batch retains per-target outcomes: ' . wp_json_encode( $batch_result ) );
modula_media_assert( $batch_result === modula_media_call( 'update-media-batch', $collection_batch ), 'Media batch replay does not repeat successes.' );
\WPChill\Folders\Rest\Favorites_Controller::service()->unstar( array( 'object_id' => $attachment ) );

$deny_media = static function ( $caps, $cap ) {
	return 'upload_files' === $cap ? array( 'do_not_allow' ) : $caps;
};
add_filter( 'map_meta_cap', $deny_media, 10, 2 );
modula_media_assert( is_wp_error( modula_media_call( 'list-favorites', array() ) ), 'Actor without media permission cannot inspect site favorites.' );
remove_filter( 'map_meta_cap', $deny_media );
