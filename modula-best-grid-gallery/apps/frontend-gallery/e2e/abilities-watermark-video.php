<?php
/** Owned real-file checks through native WordPress abilities. */
use Modula\V2\Abilities\Requests;
use Modula\V2\Meta_Sync;
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || $state['run'] !== $run ) { exit( 1 ); }
function modula_wv_assert( $ok, $message ) { if ( ! $ok ) { throw new RuntimeException( $message ); } }
function modula_wv_call( $name, $input ) {
 $ability = wp_get_ability( 'modula/' . $name );
 modula_wv_assert( $ability, 'Missing ability: ' . $name );
 return $ability->execute( $input );
}
try {
 $actor = (int) get_user_by( 'login', $run )->ID;
 wp_set_current_user( $actor );
 $mode = getenv( 'MODULA_E2E_MODE' ); $prefix = $run . '-' . $mode . '-' . $action;
 $catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
 $gallery = (int) $catalog['galleries']['visible']['id'];
 $output = array( 'passed' => true, 'adapter_loaded' => class_exists( '\WP\MCP\Plugin' ) );
 if ( 'lite' === $mode ) {
  foreach ( array( 'read-watermark-state' => array( 'id' => $gallery, 'attachment_id' => 1 ), 'update-gallery-videos' => array( 'id' => $gallery, 'request_id' => $prefix . '-denied', 'revision' => str_repeat( 'a', 64 ), 'video_changes' => array( array( 'action' => 'add', 'item_id' => 'video_template_1', 'attachment_id' => 1 ) ) ) ) as $name => $input ) {
   $result = modula_wv_call( $name, $input ); modula_wv_assert( is_wp_error( $result ) || 'forbidden' === ( $result['status'] ?? '' ), 'Lite must deny ' . $name );
  }
  modula_e2e_output( $output ); return;
 }
 $upload = wp_upload_dir(); $file = $upload['basedir'] . '/' . $run . '/' . $prefix . '.jpg';
 $canvas = imagecreatetruecolor( 3000, 1200 ); imagefill( $canvas, 0, 0, imagecolorallocate( $canvas, 55, 65, 165 ) ); imagejpeg( $canvas, $file, 95 ); imagedestroy( $canvas );
 $attachment = wp_insert_attachment( array( 'post_mime_type' => 'image/jpeg', 'post_title' => 'Shared watermark original', 'post_status' => 'inherit', 'post_author' => $actor, 'meta_input' => array( $marker => $run, '_wp_attachment_image_alt' => 'Preserved watermark alt' ) ), $file );
 wp_update_attachment_metadata( $attachment, wp_generate_attachment_metadata( $attachment, $file ) );
 $original_hash = hash_file( 'sha256', $file );
 $galleries = array();
 for ( $i = 0; $i < 2; $i++ ) {
  $id = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'publish', 'post_title' => $prefix . '-' . $i, 'post_author' => $actor, 'meta_input' => array( '_modula_beta' => '1' ) ) );
  Meta_Sync::apply_new_beta_gallery_create_defaults( $id ); Meta_Sync::persist_merged_gallery_items( $id, array( array( 'id' => $attachment ) ), false );
  $galleries[] = Modula\V2\Abilities\Integration::gallery( get_post( $id ) );
 }
 $id = $galleries[0]['id']; $state['watermark_galleries'][] = $id; update_option( $key, $state, false );
 $read_gallery = static function () use ( $id ) { return modula_wv_call( 'read-gallery', array( 'id' => $id ) ); };
 $read = $read_gallery(); $items = $read['items'];
 $config = array( 'request_id' => $prefix . '-config', 'id' => $id, 'revision' => $read['gallery']['revision'], 'settings' => array( 'watermark' => array( 'enableWatermark' => true, 'customSettingsWatermark' => true, 'watermarkType' => 'text', 'watermarkImage' => 999999999, 'watermarkText' => 'OWNED TEST', 'watermarkTextSize' => 80, 'watermarkOpacity' => 100, 'watermarkEnableBackup' => true, 'watermarkPosition' => 'center' ), 'general' => array( 'type' => 'grid' ), 'performance' => array( 'lazyLoad' => false ) ) );
 $configured = modula_wv_call( 'update-gallery', $config );
 modula_wv_assert( 'succeeded' === ( $configured['status'] ?? '' ), 'Configure watermark: ' . wp_json_encode( $configured ) );
 modula_wv_assert( hash_file( 'sha256', $file ) === $original_hash, 'Settings do not burn bytes.' );
 $state_input = array( 'id' => $id, 'attachment_id' => $attachment );
 $inspect = modula_wv_call( 'read-watermark-state', $state_input );
 modula_wv_assert( ! is_wp_error( $inspect ) && ! $inspect['watermark']['backup'], 'Pure inspection before apply.' );
 $apply = $state_input + array( 'request_id' => $prefix . '-apply', 'revision' => $inspect['watermark']['revision'] );
 $out = modula_wv_call( 'apply-watermark', $apply );
 modula_wv_assert( 'succeeded' === ( $out['status'] ?? '' ), 'Watermark real file apply: ' . wp_json_encode( $out ) );
 modula_wv_assert( $out === modula_wv_call( 'apply-watermark', $apply ), 'Apply replay does not burn twice.' );
 modula_wv_assert( $out['watermark']['sha256'] !== $original_hash && $out['watermark']['backup'], 'Changed bytes and retained original.' );
 modula_wv_assert( $items === $read_gallery()['items'] && 'Preserved watermark alt' === get_post_meta( $attachment, '_wp_attachment_image_alt', true ), 'Shared text and composition preserved.' );
 // Reapply must not overwrite a different file that reused the original name.
 $restore_collision = dirname( wp_get_original_image_path( $attachment ) ) . '/' . basename( get_post_meta( $attachment, 'modula-backup', true ) );
 file_put_contents( $restore_collision, 'owned collision sentinel' );
 $collision = $state_input + array( 'request_id' => $prefix . '-collision', 'revision' => modula_wv_call( 'read-watermark-state', $state_input )['watermark']['revision'] );
 $collision_result = modula_wv_call( 'apply-watermark', $collision );
 modula_wv_assert( 'rejected' === $collision_result['status'] && is_file( $restore_collision ) && 'owned collision sentinel' === file_get_contents( $restore_collision ), 'Reapply preserves an unrelated original destination.' );
 unlink( $restore_collision );
 $stale = $apply; $stale['request_id'] .= '-stale';
 modula_wv_assert( 'conflict' === modula_wv_call( 'apply-watermark', $stale )['status'], 'Stale watermark rejected.' );
 $backup = get_post_meta( $attachment, 'modula-backup', true ); delete_post_meta( $attachment, 'modula-backup' );
 $missing = $state_input + array( 'request_id' => $prefix . '-missing', 'revision' => modula_wv_call( 'read-watermark-state', $state_input )['watermark']['revision'] );
 modula_wv_assert( 'backup_missing' === modula_wv_call( 'remove-watermark', $missing )['code'], 'Missing backup never reports removal success.' );
 update_post_meta( $attachment, 'modula-backup', $backup );
 $remove = $state_input + array( 'request_id' => $prefix . '-remove', 'revision' => modula_wv_call( 'read-watermark-state', $state_input )['watermark']['revision'] );
 $removed = modula_wv_call( 'remove-watermark', $remove );
 modula_wv_assert( 'succeeded' === $removed['status'] && $original_hash === hash_file( 'sha256', wp_get_original_image_path( $attachment ) ), 'Real backup restores original bytes: ' . wp_json_encode( $removed ) );
 modula_wv_assert( $removed === modula_wv_call( 'remove-watermark', $remove ), 'Remove replay never repeats restore.' );
 // Leave a real watermarked attachment for the HTTP/editor/anonymous visitor checks.
 $apply['request_id'] .= '-final'; $apply['revision'] = modula_wv_call( 'read-watermark-state', $state_input )['watermark']['revision'];
 $final = modula_wv_call( 'apply-watermark', $apply ); modula_wv_assert( 'succeeded' === $final['status'], 'Final watermark apply: ' . wp_json_encode( $final ) );
 $denied = static function ( $caps, $cap, $user, $args ) use ( $attachment ) { return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $attachment ? array( 'do_not_allow' ) : $caps; };
 add_filter( 'map_meta_cap', $denied, 10, 4 ); modula_wv_assert( 'forbidden' === modula_wv_call( 'recover-request', array( 'request_id' => $apply['request_id'] ) )['status'], 'Current attachment rights protect recovery.' ); remove_filter( 'map_meta_cap', $denied, 10 );
 // A local video uses the existing owned sample; no provider needed or simulated.
 $video_file = $upload['basedir'] . '/' . $run . '/sample.mp4';
 $video = wp_insert_attachment( array( 'post_mime_type' => 'video/mp4', 'post_title' => 'Owned local video', 'post_status' => 'inherit', 'post_author' => $actor, 'meta_input' => array( $marker => $run ) ), $video_file );
 set_post_thumbnail( $video, $attachment );
 $change = array( 'request_id' => $prefix . '-video', 'id' => $id, 'revision' => $read_gallery()['gallery']['revision'], 'video_changes' => array( array( 'action' => 'add', 'item_id' => 'video_template_9001', 'attachment_id' => $video, 'before_id' => $attachment, 'fields' => array( 'video_title' => 'Owned video title' ) ) ) );
 $added = modula_wv_call( 'update-gallery-videos', $change ); modula_wv_assert( 'succeeded' === ( $added['status'] ?? '' ), 'Local video add: ' . wp_json_encode( $added ) );
 modula_wv_assert( $added === modula_wv_call( 'update-gallery-videos', $change ), 'Video replay keeps one stable item.' );
 $rows = $read_gallery()['items']; modula_wv_assert( array( 'video_template_9001', $attachment ) === array_column( $rows, 'id' ), 'Video order and identities persist.' );
 $change['request_id'] .= '-stale'; modula_wv_assert( 'conflict' === modula_wv_call( 'update-gallery-videos', $change )['status'], 'Video stale write conflicts.' );
 $change['request_id'] .= '-edit'; $change['revision'] = $read_gallery()['gallery']['revision'];
 $change['video_changes'] = array( array( 'action' => 'move', 'item_id' => 'video_template_9001' ), array( 'action' => 'update', 'item_id' => 'video_template_9001', 'fields' => array( 'video_alt' => 'Local video alt', 'loop_video' => 'on' ) ), array( 'action' => 'add', 'item_id' => 'video_template_9002', 'attachment_id' => $video ), array( 'action' => 'remove', 'item_id' => 'video_template_9002' ) );
 modula_wv_assert( 'succeeded' === modula_wv_call( 'update-gallery-videos', $change )['status'], 'Video update/move/remove.' );
 $provider = array( 'request_id' => $prefix . '-unsafe-provider', 'id' => $id, 'revision' => $read_gallery()['gallery']['revision'], 'kind' => 'playlist', 'url' => 'https://example.com/arbitrary.jpg' );
 modula_wv_assert( 'rejected' === modula_wv_call( 'resolve-video-source', $provider )['status'], 'No arbitrary remote downloader.' );
 // Interrupted external effect checkpoint is deliberately uncertain and cannot be replayed.
 $provider['request_id'] .= '-interrupted'; $provider['url'] = 'https://www.youtube.com/playlist?list=PLownedtest';
 Requests::claim( $provider, 'modula/resolve-video-source' ); Requests::context( $provider['request_id'], array( 'started' => time() - 600, 'video' => array( 'phase' => 'provider_query', 'sources' => array(), 'complete' => false ) ) );
 modula_wv_assert( 'uncertain' === modula_wv_call( 'resolve-video-source', $provider )['status'], 'Interrupted provider request never repeats.' );
 // Real provider playlist through the native ability too, with and without MCP installed.
 $playlist_input = array( 'request_id' => $prefix . '-playlist', 'id' => $id, 'revision' => $read_gallery()['gallery']['revision'], 'kind' => 'playlist', 'url' => 'https://www.youtube.com/playlist?list=PL6B3937A5D230E335' );
 $playlist = modula_wv_call( 'resolve-video-source', $playlist_input );
 modula_wv_assert( in_array( $playlist['status'], array( 'succeeded', 'partial' ), true ) && ! empty( $playlist['video']['sources'] ), 'Real public playlist resolution: ' . wp_json_encode( $playlist ) );
 modula_wv_assert( $playlist === modula_wv_call( 'resolve-video-source', $playlist_input ), 'Native provider replay preserves the confirmed result.' );
 $output['playlist_sources'] = count( $playlist['video']['sources'] );
 $bounded_input = $playlist_input; $bounded_input['request_id'] .= '-bounded'; $bounded_input['max_sources'] = 2;
 $bounded = modula_wv_call( 'resolve-video-source', $bounded_input );
 modula_wv_assert( 'partial' === $bounded['status'] && false === $bounded['video']['complete'] && 2 === count( $bounded['video']['sources'] ), 'Real provider cutoff retains exactly two sources and reports incomplete.' );
 modula_wv_assert( $bounded === modula_wv_call( 'resolve-video-source', $bounded_input ), 'Partial provider replay preserves sources without querying again.' );
 $output['partial_playlist'] = $bounded;

 // Fail only metadata confirmation after actual watermark bytes were produced.
 $partial_path = $upload['basedir'] . '/' . $run . '/' . $prefix . '-partial.jpg';
 copy( wp_get_original_image_path( $attachment ), $partial_path );
 $partial_attachment = wp_insert_attachment( array( 'post_mime_type' => 'image/jpeg', 'post_title' => 'Partial watermark fixture', 'post_status' => 'inherit', 'post_author' => $actor, 'meta_input' => array( $marker => $run ) ), $partial_path );
 wp_update_attachment_metadata( $partial_attachment, wp_generate_attachment_metadata( $partial_attachment, $partial_path ) );
 $partial_gallery = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'draft', 'post_author' => $actor, 'post_title' => $prefix . '-partial-gallery', 'meta_input' => array( '_modula_beta' => '1' ) ) );
 Meta_Sync::apply_new_beta_gallery_create_defaults( $partial_gallery ); Meta_Sync::persist_merged_gallery_items( $partial_gallery, array( array( 'id' => $partial_attachment ) ), false );
 $state['watermark_galleries'][] = $partial_gallery; update_option( $key, $state, false );
 $partial_config = $config; $partial_config['id'] = $partial_gallery; $partial_config['request_id'] .= '-partial'; $partial_config['revision'] = modula_wv_call( 'read-gallery', array( 'id' => $partial_gallery ) )['gallery']['revision'];
 modula_wv_assert( 'succeeded' === modula_wv_call( 'update-gallery', $partial_config )['status'], 'Partial fixture settings.' );
 $partial_input = array( 'id' => $partial_gallery, 'attachment_id' => $partial_attachment );
 $partial_input += array( 'request_id' => $prefix . '-partial-effect', 'revision' => modula_wv_call( 'read-watermark-state', $partial_input )['watermark']['revision'] );
 $fail_metadata = static function ( $metadata, $attachment_id ) use ( $partial_attachment ) { return $attachment_id === $partial_attachment ? array() : $metadata; };
 add_filter( 'wp_generate_attachment_metadata', $fail_metadata, PHP_INT_MAX, 2 );
 $partial = modula_wv_call( 'apply-watermark', $partial_input ); remove_filter( 'wp_generate_attachment_metadata', $fail_metadata, PHP_INT_MAX );
 modula_wv_assert( 'uncertain' === $partial['status'] && 'changed' === $partial['watermark']['original'] && $partial['watermark']['backup'], 'Partial bytes and retained backup identified: ' . wp_json_encode( $partial ) );
 modula_wv_assert( $partial === modula_wv_call( 'apply-watermark', $partial_input ), 'Uncertain file effect cannot retry itself.' );
 $output['partial_effect'] = $partial['watermark'];
 $page = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $prefix . '-public', 'post_content' => '[modula id="' . $id . '"][modula id="' . $galleries[1]['id'] . '"]' ) );
 $output += array( 'galleries' => $galleries, 'attachment_id' => $attachment, 'video_id' => $video, 'page' => get_permalink( $page ), 'watermark' => $final['watermark'], 'watermark_request' => $apply['request_id'], 'original_sha256' => $original_hash );
 modula_e2e_output( $output );
} catch ( Throwable $error ) { WP_CLI::error( $error->getMessage() ); }
