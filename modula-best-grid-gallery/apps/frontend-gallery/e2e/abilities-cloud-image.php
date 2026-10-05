<?php
/** Owned provider image requesting private ACL; anonymous access is recorded separately. */
$private_key = $remote_prefix . 'private-visual.jpg';
$state['storage_objects'][] = array( 'connection_id' => $connection_id, 'key' => $private_key );
update_option( $key, $state, false );
$url = \WPChill\Folders\Storage\S3_Compatible_Request::public_object_url( $connection, $private_key );
$parts = wp_parse_url( $url );
$host = $parts['host'] . ( isset( $parts['port'] ) ? ':' . $parts['port'] : '' );
$body = file_get_contents( $source );
$signed = \WPChill\Folders\Storage\S3_Compatible_Request::sign( 'PUT', $host, $parts['path'], array(), $connection['access_key'], $connection['secret_key'], $connection['region'], $body, array( 'x-amz-acl' => 'private' ) );
$put = wp_remote_request( $url, array( 'method' => 'PUT', 'headers' => $signed['headers'], 'body' => $body, 'timeout' => 20, 'redirection' => 0 ) );
modula_storage_assert( ! is_wp_error( $put ) && 200 === wp_remote_retrieve_response_code( $put ), 'Owned private provider PUT succeeds.' );
$public = wp_remote_get( $url, array( 'timeout' => 15, 'redirection' => 0 ) );
$anonymous_status = is_wp_error( $public ) ? 0 : wp_remote_retrieve_response_code( $public );
$private_verified = in_array( $anonymous_status, array( 401, 403, 404 ), true );
modula_storage_assert( $anonymous_status > 0, 'Anonymous provider probe must complete; HTTP status is recorded.' );
$private_id = wp_insert_attachment( array( 'post_title' => 'Private shared image', 'post_status' => 'inherit', 'post_mime_type' => 'image/jpeg', 'meta_input' => array( $marker => $run ) ) );
update_post_meta( $private_id, '_wp_attached_file', $run . '/private-visual.jpg' );
$maps = new \WPChill\Folders\Storage\Option_Provider_Map_Repository();
$maps->save( $private_id, array( 'connection_id' => $connection_id, 'bucket' => $connection['bucket'], 'key' => $private_key ) );
$meta = get_post_meta( $private_id );
$temp = glob( sys_get_temp_dir() . '/modula-visual-*' );
$ai_calls = 0;
$watch = static function ( $pre, $args, $request_url ) use ( &$ai_calls, $host ) {
	if ( wp_parse_url( $request_url, PHP_URL_HOST ) !== explode( ':', $host )[0] ) {
		++$ai_calls;
		return new WP_Error( 'unexpected_provider', 'Unexpected provider call.' );
	}
	return $pre;
};
add_filter( 'pre_http_request', $watch, 10, 3 );
try {
	$context = modula_storage_call( 'read-attachment-image-context', array( 'id' => $private_id ) );
	modula_storage_assert( ! is_wp_error( $context ), 'Real private cloud context succeeds: ' . wp_json_encode( $context ) );
	$visual_input = array_intersect_key( $context, array_flip( array( 'id', 'revision', 'visual_revision' ) ) );
	$image = modula_storage_call( 'read-attachment-image', $visual_input );
	modula_storage_assert( ! is_wp_error( $image ) && getimagesizefromstring( base64_decode( $image['data'] ) )[0] === 800, 'Private native image delivers whole pixels without a local original.' );
	modula_storage_assert( $meta === get_post_meta( $private_id ) && $body === $store->get( $connection, $private_key ), 'Visual reads leave attachment and real provider bytes unchanged.' );
	// Controlled provider faults exercise bounds before GET and safe failure results.
	foreach ( array( 'unknown', 'oversized', 'unversioned', 'timeout', 'denied', 'missing', 'changed', 'truncated' ) as $fault ) {
		$gets = 0;
		$inject = static function ( $pre, $args, $request_url ) use ( $url, $fault, &$gets ) {
			if ( $url !== $request_url ) { return $pre; }
			$method = $args['method'];
			if ( 'GET' === $method ) { ++$gets; }
			if ( 'timeout' === $fault ) { return new WP_Error( 'timeout', 'SECRET provider endpoint' ); }
			if ( in_array( $fault, array( 'denied', 'missing' ), true ) ) { return array( 'response' => array( 'code' => 'missing' === $fault ? 404 : 403 ), 'headers' => array(), 'body' => 'SECRET' ); }
			$headers = array( 'content-length' => '100', 'etag' => '"fixture"' );
			if ( 'unknown' === $fault ) { unset( $headers['content-length'] ); }
			if ( 'unversioned' === $fault ) { unset( $headers['etag'] ); }
			if ( 'oversized' === $fault ) { $headers['content-length'] = '8388609'; }
			return array( 'response' => array( 'code' => 'GET' === $method && 'changed' === $fault ? 412 : 200 ), 'headers' => $headers, 'body' => '' );
		};
		add_filter( 'pre_http_request', $inject, 20, 3 );
		try {
			$failed = modula_storage_call( 'read-attachment-image-context', array( 'id' => $private_id ) );
			modula_storage_assert( is_wp_error( $failed ) && false === strpos( wp_json_encode( $failed ), 'SECRET' ), 'Provider fault classified without secrets: ' . $fault );
			$failed_write = modula_storage_call( 'update-attachment-text', $visual_input + array( 'request_id' => $prefix . '-cloud-fault-' . $fault, 'text' => array( 'alt' => 'Must not save' ) ) );
			modula_storage_assert( 'conflict' === $failed_write['status'] && '' === modula_storage_call( 'read-attachment', array( 'id' => $private_id ) )['attachment']['text']['alt'], 'Unavailable provider refuses the visual write without changing shared text.' );
			if ( in_array( $fault, array( 'unknown', 'oversized', 'unversioned' ), true ) ) { modula_storage_assert( 0 === $gets, 'Unbounded or unversioned source refused before GET.' ); }
		} finally { remove_filter( 'pre_http_request', $inject, 20 ); }
	}
	$changed_map = $maps->find_by_attachment( $private_id );
	$maps->save( $private_id, array_merge( $changed_map, array( 'key' => $remote_prefix . 'second.jpg' ) ) );
	$stale = modula_storage_call( 'update-attachment-text', $visual_input + array( 'request_id' => $prefix . '-cloud-map-conflict', 'text' => array( 'alt' => 'Must not save' ) ) );
	modula_storage_assert( 'conflict' === $stale['status'], 'Mapping change to identical bytes rejects the stale proposal.' );
	$maps->delete( $private_id );
	$maps->save( $private_id, $changed_map );
	// Replace only the owned private key, keeping its ACL private.
	$replacement = file_get_contents( $new_source );
	$replace_headers = \WPChill\Folders\Storage\S3_Compatible_Request::sign( 'PUT', $host, $parts['path'], array(), $connection['access_key'], $connection['secret_key'], $connection['region'], $replacement, array( 'x-amz-acl' => 'private' ) );
	$replaced = wp_remote_request( $url, array( 'method' => 'PUT', 'headers' => $replace_headers['headers'], 'body' => $replacement, 'timeout' => 20 ) );
	modula_storage_assert( ! is_wp_error( $replaced ) && 200 === wp_remote_retrieve_response_code( $replaced ), 'Owned provider source replaced for conflict proof.' );
	$stale = modula_storage_call( 'update-attachment-text', $visual_input + array( 'request_id' => $prefix . '-cloud-source-conflict', 'text' => array( 'alt' => 'Must not save' ) ) );
	modula_storage_assert( 'conflict' === $stale['status'] && '' === modula_storage_call( 'read-attachment', array( 'id' => $private_id ) )['attachment']['text']['alt'], 'Real object replacement refuses stale visual write and preserves text.' );
	$context = modula_storage_call( 'read-attachment-image-context', array( 'id' => $private_id ) );
	$visual_input = array_intersect_key( $context, array_flip( array( 'id', 'revision', 'visual_revision' ) ) );
	modula_storage_assert( ! is_wp_error( modula_storage_call( 'read-attachment-image', $visual_input ) ), 'Inspect replaced private pixels.' );
	$saved = modula_storage_call( 'update-attachment-text', $visual_input + array( 'request_id' => $prefix . '-cloud-write', 'text' => array( 'alt' => 'Private cloud native alt' ) ) );
	modula_storage_assert( 'succeeded' === $saved['status'], 'Private shared text saves through the existing writer.' );
	modula_storage_assert( $saved === modula_storage_call( 'recover-request', array( 'request_id' => $prefix . '-cloud-write' ) ), 'Private write is recoverable.' );
	modula_storage_assert( $temp === glob( sys_get_temp_dir() . '/modula-visual-*' ) && 0 === $ai_calls && ! get_post_meta( $private_id, '_modula_ai_report', true ), 'Cloud cleanup and zero AI calls/reports.' );
} finally { remove_filter( 'pre_http_request', $watch, 10 ); }
$private_galleries = array();
foreach ( array( 0, 1 ) as $index ) {
	$gallery = modula_storage_call( 'create-gallery', array( 'request_id' => $prefix . '-private-gallery-' . $index, 'title' => 'Private cloud text', 'status' => 'publish', 'attachment_ids' => array( $private_id ) ) );
	modula_storage_assert( 'succeeded' === $gallery['status'], 'Cloud sharing gallery created: ' . wp_json_encode( $gallery ) );
	$private_galleries[] = $gallery['gallery']['id'];
}
$private_page = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $prefix . '-private-visual', 'post_content' => '[modula id="' . $private_galleries[0] . '"][modula id="' . $private_galleries[1] . '"]' ) );
$output['cloud_image'] = array( 'id' => $private_id, 'galleries' => $private_galleries, 'page' => get_permalink( $private_page ), 'private_verified' => $private_verified, 'anonymous_status' => $anonymous_status, 'ai_calls' => $ai_calls, 'configured_connections' => count( $listing['connections'] ), 'passed' => true );
