<?php
/** Storage and shared-byte operations at the approved native ability boundary. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || $state['run'] !== $run ) {
	exit( 1 ); }
wp_set_current_user( get_user_by( 'login', $run )->ID );
function modula_storage_assert( $ok, $message ) {
	if ( ! $ok ) {
		throw new RuntimeException( $message ); } }
function modula_storage_call( $name, $input = array() ) {
	$abilities = wp_get_abilities();
	modula_storage_assert( isset( $abilities[ 'modula/' . $name ] ), 'Missing ability: ' . $name );
	return $abilities[ 'modula/' . $name ]->execute( $input );
}
try {
	$catalog    = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
	$prefix     = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '-' . $action;
	$uploads    = wp_upload_dir();
	$source = $uploads['basedir'] . '/' . $run . '/' . $prefix . '-source.jpg';
	$new_source = $uploads['basedir'] . '/' . $run . '/' . $prefix . '-new.jpg';
	foreach ( array( $source => array( 55, 65, 165 ), $new_source => array( 80, 80, 150 ) ) as $synthetic_path => $rgb ) {
		$canvas = imagecreatetruecolor( 800, 600 );
		imagefill( $canvas, 0, 0, imagecolorallocate( $canvas, $rgb[0], $rgb[1], $rgb[2] ) );
		imagejpeg( $canvas, $synthetic_path, 85 ); imagedestroy( $canvas );
	}
	$file       = $uploads['basedir'] . '/' . $run . '/' . $prefix . '.jpg';
	copy( $source, $file );
	$id = wp_insert_attachment(
		array(
			'post_mime_type' => 'image/jpeg',
			'post_title'     => 'Preserved shared title',
			'post_excerpt'   => 'Preserved caption',
			'meta_input'     => array( $marker => $run ),
		),
		$file
	);
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $file ) );
	update_post_meta( $id, '_wp_attachment_image_alt', 'Preserved alt' );
	$read = modula_storage_call( 'read-attachment-file', array( 'id' => $id ) );
	modula_storage_assert( ! is_wp_error( $read ) && isset( $read['file']['revision'] ), 'Read actual file state: ' . wp_json_encode( $read ) );
	$galleries = array();
	for ( $i = 0; $i < 2; $i++ ) {
		$g = modula_e2e_insert(
			array(
				'post_type'   => 'modula-gallery',
				'post_status' => 'publish',
				'post_title'  => $prefix . '-' . $i,
				'meta_input'  => array( '_modula_beta' => '1' ),
			)
		);
		\Modula\V2\Meta_Sync::apply_new_beta_gallery_create_defaults( $g );
		\Modula\V2\Meta_Sync::persist_merged_gallery_items( $g, array( array( 'id' => $id ) ), false );
		$galleries[] = array(
			'id'         => $g,
			'editor_url' => admin_url( 'post.php?post=' . $g . '&action=edit' ),
		);
	}
	$before                    = array_map(
		static function ( $g ) {
			return get_post_meta( $g['id'] );
		},
		$galleries
	);
	$page                      = modula_e2e_insert(
		array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_title'   => $prefix,
			'post_content' => '[modula id="' . $galleries[0]['id'] . '"][modula id="' . $galleries[1]['id'] . '"]',
		)
	);
	$input                     = array(
		'request_id'     => $prefix . '-replace',
		'id'             => $id,
		'revision'       => $read['file']['revision'],
		'filename'       => 'replacement.jpg',
		'content_base64' => base64_encode( file_get_contents( $new_source ) ),
	);
	$invalid                   = $input;
	$invalid['request_id']    .= '-invalid';
	$invalid['content_base64'] = base64_encode( 'invalid image' );
	modula_storage_assert( 'rejected' === modula_storage_call( 'replace-attachment-file', $invalid )['status'] && hash_file( 'sha256', $file ) === hash_file( 'sha256', $source ), 'Invalid bytes refused before replacement.' );
	$saved = modula_storage_call( 'replace-attachment-file', $input );
	modula_storage_assert( ! is_wp_error( $saved ) && 'succeeded' === $saved['status'], 'Replacement: ' . wp_json_encode( $saved ) );
	modula_storage_assert( hash_file( 'sha256', $file ) === hash_file( 'sha256', $new_source ), 'Real original bytes replaced.' );
	modula_storage_assert( 'Preserved shared title' === get_post( $id )->post_title && 'Preserved caption' === get_post( $id )->post_excerpt && 'Preserved alt' === get_post_meta( $id, '_wp_attachment_image_alt', true ), 'Shared text preserved.' );
	modula_storage_assert(
		$before === array_map(
			static function ( $g ) {
				return get_post_meta( $g['id'] );
			},
			$galleries
		),
		'Both gallery documents unchanged.'
	);
	modula_storage_assert( $saved === modula_storage_call( 'replace-attachment-file', $input ), 'Replay returns original result.' );
	$stale                = $input;
	$stale['request_id'] .= '-stale';
	modula_storage_assert( 'conflict' === modula_storage_call( 'replace-attachment-file', $stale )['status'], 'Old file revision conflicts.' );
	$changed = modula_storage_call( 'read-attachment-file', array( 'id' => $id ) );
	\WPChill\Folders\Rest\File_Ops_Controller::ops()->replace(
		array(
			'attachment_id' => $id,
			'contents'      => file_get_contents( $source ),
			'mime'          => 'image/jpeg',
		)
	);
	$stale['request_id'] .= '-ordinary';
	$stale['revision']    = $changed['file']['revision'];
	modula_storage_assert( 'conflict' === modula_storage_call( 'replace-attachment-file', $stale )['status'], 'Ordinary replacement invalidates revision.' );
	modula_storage_assert( $saved === modula_storage_call( 'replace-attachment-file', $input ) && hash_file( 'sha256', $file ) === hash_file( 'sha256', $source ), 'Replay preserves later bytes.' );
	$deny = static function ( $caps, $cap, $user, $args ) use ( $id ) {
		return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $id ? array( 'do_not_allow' ) : $caps;
	};
	add_filter( 'map_meta_cap', $deny, 10, 4 );
	modula_storage_assert( 'forbidden' === modula_storage_call( 'recover-request', array( 'request_id' => $input['request_id'] ) )['status'], 'Recovery rechecks current access.' );
	$denied = $input;
	$denied['request_id'] .= '-denied';
	modula_storage_assert( 'forbidden' === modula_storage_call( 'replace-attachment-file', $denied )['status'] && hash_file( 'sha256', $file ) === hash_file( 'sha256', $source ), 'Missing target permission refuses replacement before bytes.' );
	remove_filter( 'map_meta_cap', $deny, 10 );
	$fault                      = static function () {
		throw new RuntimeException( 'Controlled derivative interruption private-secret' );
	};
	$interrupted                = $input;
	$interrupted['request_id'] .= '-interrupted';
	$interrupted['revision']    = modula_storage_call( 'read-attachment-file', array( 'id' => $id ) )['file']['revision'];
	add_filter( 'wp_generate_attachment_metadata', $fault );
	$partial = modula_storage_call( 'replace-attachment-file', $interrupted );
	remove_filter( 'wp_generate_attachment_metadata', $fault );
	modula_storage_assert( 'uncertain' === $partial['status'] && 'replaced' === $partial['file']['original'] && false === strpos( wp_json_encode( $partial ), 'private-secret' ), 'Interrupted derivatives retain known byte effect without secrets.' );
	modula_storage_assert( $partial === modula_storage_call( 'replace-attachment-file', $interrupted ), 'Uncertain replacement never repeats.' );
	\WPChill\Folders\Rest\File_Ops_Controller::ops()->replace(
		array(
			'attachment_id' => $id,
			'contents'      => file_get_contents( $new_source ),
			'mime'          => 'image/jpeg',
		)
	);

	// A non-throwing image editor failure must not report regenerated derivatives.
	$subsize_fault             = static function () {
		return array();
	};
	$incomplete                = $input;
	$incomplete['request_id'] .= '-subsizes';
	$incomplete['revision']    = modula_storage_call( 'read-attachment-file', array( 'id' => $id ) )['file']['revision'];
	add_filter( 'wp_image_editors', $subsize_fault );
	$missing_sizes = modula_storage_call( 'replace-attachment-file', $incomplete );
	remove_filter( 'wp_image_editors', $subsize_fault );
	modula_storage_assert( 'uncertain' === $missing_sizes['status'], 'Failed subsizes are not reported as regenerated: ' . wp_json_encode( $missing_sizes ) );
	\WPChill\Folders\Rest\File_Ops_Controller::ops()->replace(
		array(
			'attachment_id' => $id,
			'contents'      => file_get_contents( $new_source ),
			'mime'          => 'image/jpeg',
		)
	);
	// Warm a Modula custom crop before HTTP replacement so visitor checks detect stale bytes.
	( new Modula_Image() )->resize_image( wp_get_attachment_url( $id ), 333, 333, true, 'c', null );
	$output  = array(
		'passed'         => true,
		'adapter_loaded' => class_exists( '\WP\MCP\Plugin' ),
		'id'             => $id,
		'galleries'      => $galleries,
		'page'           => get_permalink( $page ),
		'sha256'         => hash_file( 'sha256', $new_source ),
		'url'            => wp_get_attachment_url( $id ),
		'content_base64' => base64_encode( file_get_contents( $source ) ),
	);
	$actor = get_current_user_id();
	wp_set_current_user( 0 );
	modula_storage_assert( is_wp_error( modula_storage_call( 'list-storage-connections', array( 'page' => 1 ) ) ), 'Anonymous storage read denied.' );
	modula_storage_assert( is_wp_error( modula_storage_call( 'read-attachment-file', array( 'id' => $id ) ) ), 'Anonymous shared-file read denied.' );
	wp_set_current_user( $actor );
	$listing = modula_storage_call( 'list-storage-connections', array( 'page' => 1 ) );
	if ( 'lite' === getenv( 'MODULA_E2E_MODE' ) ) {
		modula_storage_assert( is_wp_error( $listing ), 'Storage requires Compatible Pro entitlement.' );
		update_post_meta( $id, '_wpchill_storage', array( 'connection_id' => 'unavailable', 'key' => 'private.jpg', 'bucket' => 'private' ) );
		modula_storage_assert( is_wp_error( modula_storage_call( 'read-attachment-image-context', array( 'id' => $id ) ) ), 'Mapped image cannot bypass storage entitlement using its local copy.' );
		delete_post_meta( $id, '_wpchill_storage' );
	} else {
		modula_storage_assert( ! is_wp_error( $listing ) && count( $listing['connections'] ) > 0, 'Configured storage is required for live integration.' );
		$connection_id = $listing['connections'][0]['id'];
		$connection    = \WPChill\Folders\Rest\Connections_Controller::service()->find( $connection_id );
		// Resolve in CLI: Local's forked macOS FPM resolver can abort before connecting.
		$target = \WPChill\Folders\Storage\S3_Compatible_Request::resolve_target( $connection['endpoint'] ?? '', $connection['bucket'], $connection['region'] );
		$host = wp_parse_url( $target['url'], PHP_URL_HOST );
		$addresses = gethostbynamel( $host );
		modula_storage_assert( ! empty( $addresses ), 'Configured provider DNS must resolve.' );
		$state['storage_dns'][ $host ] = $addresses[0];
		$store         = new \WPChill\Folders\Storage\S3_Compatible_Object_Store();
		$remote_prefix = $run . '/' . $action . '/';
		$remote_key    = $remote_prefix . 'original.jpg';
		// Source is the deterministic solid-color JPEG generated above, never user media.
		foreach ( array( $remote_key, $remote_prefix . 'second.jpg' ) as $object_key ) {
			$state['storage_objects'][] = array(
				'connection_id' => $connection_id,
				'key'           => $object_key,
			);
			update_option( $key, $state, false );
			modula_storage_assert( true === $store->put( $connection, $object_key, file_get_contents( $source ), 'image/jpeg' ), 'Owned live provider PUT must succeed.' );
		}
		$browse_input = array(
			'connection_id' => $connection_id,
			'prefix'        => $remote_prefix,
			'per_page'      => 1,
		);
		global $wpdb;
		$before_reads = array( $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='attachment'" ), get_option( 'wpchill_folders_storage_maps' ), \WPChill\Folders\Rest\Connections_Controller::service()->find( $connection_id ) );
		$browse       = modula_storage_call( 'browse-storage', $browse_input );
		modula_storage_assert( ! is_wp_error( $browse ) && 1 === count( $browse['entries'] ) && '' !== $browse['next_cursor'], 'Live provider first page: ' . wp_json_encode( $browse ) );
		$next = modula_storage_call( 'browse-storage', $browse_input + array( 'cursor' => $browse['next_cursor'] ) );
		modula_storage_assert( 1 === count( $next['entries'] ) && $next['entries'][0]['key'] !== $browse['entries'][0]['key'], 'Live provider continuation.' );
		modula_storage_call( 'list-storage-connections', array( 'page' => 1 ) );
		modula_storage_assert( $before_reads === array( $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='attachment'" ), get_option( 'wpchill_folders_storage_maps' ), \WPChill\Folders\Rest\Connections_Controller::service()->find( $connection_id ) ), 'Catalog reads leave attachments, mappings and connection unchanged.' );
		foreach ( array( 'access_key', 'secret_key', 'endpoint', 'bucket' ) as $field ) {
			modula_storage_assert( false === strpos( wp_json_encode( $browse ) . wp_json_encode( $listing ), '"' . $field . '"' ), 'No provider credentials/config in output.' ); }
		$ingest   = array(
			'request_id'    => $prefix . '-ingest',
			'connection_id' => $connection_id,
			'key'           => $remote_key,
			'revision'      => $browse['revision'],
		);
		$ingested = modula_storage_call( 'ingest-storage-object', $ingest );
		modula_storage_assert( 'succeeded' === $ingested['status'], 'Ingest: ' . wp_json_encode( $ingested ) );
		$remote_id = $ingested['storage']['attachment_id'];
		modula_storage_assert( 'attachment' === get_post_type( $remote_id ) && true === $store->head( $connection, $remote_key ), 'Real attachment and remote original remain.' );
		modula_storage_assert( $ingested === modula_storage_call( 'ingest-storage-object', $ingest ), 'Ingest replay has no duplicate.' );
		$reuse                = $ingest;
		$reuse['request_id'] .= '-mapping';
		$reuse['revision']    = modula_storage_call( 'list-storage-connections', array( 'page' => 1 ) )['revision'];
		$reused               = modula_storage_call( 'ingest-storage-object', $reuse );
		modula_storage_assert( 'succeeded' === $reused['status'] && $remote_id === $reused['storage']['attachment_id'], 'Existing mapping reused.' );
		$cloud_visual = modula_storage_call( 'read-attachment-image-context', array( 'id' => $remote_id ) );
		modula_storage_assert( ! is_wp_error( $cloud_visual ), 'Storage image context succeeds without local original: ' . wp_json_encode( $cloud_visual ) );
		require __DIR__ . '/abilities-cloud-image.php';
		$remove = array(
			'request_id'       => $prefix . '-uningest',
			'id'               => $remote_id,
			'revision'         => modula_storage_call( 'read-attachment', array( 'id' => $remote_id ) )['attachment']['revision'],
			'storage_revision' => modula_storage_call( 'list-storage-connections', array( 'page' => 1 ) )['revision'],
		);
		$block  = modula_e2e_insert(
			array(
				'post_type'   => 'modula-gallery',
				'post_status' => 'draft',
				'post_title'  => $prefix . '-guard',
				'meta_input'  => array( '_modula_beta' => '1' ),
			)
		);
		\Modula\V2\Meta_Sync::apply_new_beta_gallery_create_defaults( $block );
		\Modula\V2\Meta_Sync::persist_merged_gallery_items( $block, array( array( 'id' => $remote_id ) ), false );
		modula_storage_assert( 'attachment_in_use' === modula_storage_call( 'uningest-storage-object', $remove )['code'] && get_post( $remote_id ), 'Known gallery usage refuses uningest.' );
		wp_delete_post( $block, true );
		$remove['request_id'] .= '-unused';
		$removed               = modula_storage_call( 'uningest-storage-object', $remove );
		modula_storage_assert( 'succeeded' === $removed['status'] && ! get_post( $remote_id ) && true === $store->head( $connection, $remote_key ), 'Uningest preserves live remote bytes: ' . wp_json_encode( $removed ) );
		modula_storage_assert( $removed === modula_storage_call( 'uningest-storage-object', $remove ), 'Deletion replay recovers after target disappears.' );

		// A failure after a real provider-map save must roll back both SQL and option caches.
		$fail_map              = static function ( $option ) {
			if ( 'wpchill_folders_storage_maps' === $option ) {
				throw new RuntimeException( 'controlled mapping interruption' );
			} };
		$broken                = $ingest;
		$broken['request_id'] .= '-rollback';
		$broken['revision']    = modula_storage_call( 'list-storage-connections', array( 'page' => 1 ) )['revision'];
		add_action( 'updated_option', $fail_map );
		$uncertain = modula_storage_call( 'ingest-storage-object', $broken );
		remove_action( 'updated_option', $fail_map );
		modula_storage_assert( 'uncertain' === $uncertain['status'], 'Map interruption retained as uncertainty.' );
		modula_storage_assert( null === ( new \WPChill\Folders\Storage\Option_Provider_Map_Repository() )->find_attachment_id( $connection_id, $remote_key ), 'Rolled-back map cache cannot return a nonexistent ID.' );
		modula_storage_assert( $uncertain === modula_storage_call( 'recover-request', array( 'request_id' => $broken['request_id'] ) ), 'Interrupted ingest remains recoverable.' );
		$output['connection_id'] = $connection_id;
		$output['remote_key']    = $remote_key;
		$output['remote_prefix'] = $remote_prefix;
	}
	if ( ! getenv( 'MODULA_E2E_CLOUD_IMAGE_ONLY' ) ) { require __DIR__ . '/abilities-bound-transfers.php'; }
	modula_e2e_output( $output );
} catch ( Throwable $error ) {
	WP_CLI::error( basename( $error->getFile() ) . ':' . $error->getLine() . ' ' . $error->getMessage() ); }
