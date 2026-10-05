<?php
/** Image composition through the installed native ability. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! isset( $state['run'] ) || $state['run'] !== getenv( 'MODULA_E2E_RUN' ) ) { exit( 1 ); }
function modula_composition_assert( $ok, $message ) { if ( ! $ok ) { WP_CLI::error( $message ); } }
$users = get_users( array( 'meta_key' => $marker, 'meta_value' => $run, 'fields' => 'ID' ) );
wp_set_current_user( $users[0] );
$mode = getenv( 'MODULA_E2E_MODE' );
$prefix = $run . '-' . $mode . '-composition-' . ( 'abilities-composition-native-only' === $action ? 'native-' : '' );
$ability = wp_get_ability( 'modula/update-gallery-images' );
modula_composition_assert( $ability instanceof WP_Ability, 'Native update-gallery-images must be registered.' );
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$id = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'publish', 'post_title' => $prefix, 'post_author' => $users[0], 'meta_input' => array( '_modula_beta' => '1' ) ) );
\Modula\V2\Meta_Sync::apply_new_beta_gallery_create_defaults( $id );
\Modula\V2\Settings\Writer::patch( $id, array( 'general' => array( 'type' => 'custom-grid', 'shuffle' => false ), 'lightbox' => array( 'lightbox' => 'external-url' ) ) );
$ids = array_column( $catalog['attachments'], 'id' );
$rows = array(
 array( 'itemKind' => 'content_block', 'embeddedId' => 'composition-block', 'blockTitle' => 'Preserved block', 'blockBodyHtml' => '<p>Unchanged body</p>', 'width' => 2, 'height' => 2, 'gridX' => 0, 'gridY' => 0 ),
 array( 'id' => $ids[0], 'width' => 2, 'height' => 2, 'gridX' => 4, 'gridY' => 0 ),
 array( 'id' => $ids[1], 'link' => '', 'target' => 0, 'width' => 2, 'height' => 2 ),
 array( 'itemKind' => 'shortcode', 'embeddedId' => 'composition-shortcode', 'shortcodeRaw' => '[caption]Retained shortcode[/caption]', 'width' => 2, 'height' => 2, 'gridX' => 8, 'gridY' => 0 ),
 array( 'id' => $ids[2], 'width' => 2, 'height' => 2, 'gridX' => 10, 'gridY' => 0 ),
);
\Modula\V2\Meta_Sync::persist_merged_gallery_items( $id, $rows, false );
// Keep sparse image rows: rendering must supply the attachment link without PHP warnings.
$classical = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'publish', 'post_title' => $prefix . 'sparse-classic', 'post_author' => $users[0], 'meta_input' => array( 'modula-images' => array( $rows[1], $rows[4] ), 'modula-settings' => get_post_meta( $id, 'modula-settings', true ) ) ) );
$link_warnings = array();
set_error_handler( static function ( $severity, $message, $file ) use ( &$link_warnings ) {
 if ( E_WARNING === $severity && 'Undefined array key "link"' === $message && 'modula-helper-functions.php' === basename( $file ) ) {
  $link_warnings[] = $message;
  return true;
 }
 return false;
} );
try {
 foreach ( array( $id, $classical ) as $render_id ) {
  $html = do_shortcode( '[modula id="' . $render_id . '"]' );
  modula_composition_assert( '' !== $html, 'Sparse Beta and classic shortcode output must render.' );
 }
 foreach ( array( 'external-url', 'attachment-page' ) as $click_mode ) {
  foreach ( array( array(), array( 'link' => null ), array( 'link' => '' ), array( 'link' => 'https://example.invalid/composition', 'target' => 1 ) ) as $link_fields ) {
   $link_data = modula_check_lightboxes_and_links( array(), array_merge( array( 'id' => $ids[0] ), $link_fields ), array( 'lightbox' => $click_mode ) );
   $expected_href = ! empty( $link_fields['link'] ) ? $link_fields['link'] : get_attachment_link( $ids[0] );
   modula_composition_assert( $expected_href === $link_data['link_attributes']['href'], 'Missing, null and empty links use the attachment fallback; explicit links are preserved.' );
   if ( ! empty( $link_fields['target'] ) ) { modula_composition_assert( '_blank' === $link_data['link_attributes']['target'], 'Custom link target is preserved.' ); }
  }
 }
} finally {
 restore_error_handler();
}
modula_composition_assert( array() === $link_warnings, 'Sparse image rendering must not emit undefined link warnings: ' . count( $link_warnings ) );
$page_id = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $prefix . 'page', 'post_content' => '[modula id="' . $id . '"]' ) );
$reference = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'publish', 'post_title' => $prefix . 'shared', 'post_author' => $users[0], 'meta_input' => array( '_modula_beta' => '1' ) ) );
\Modula\V2\Meta_Sync::apply_new_beta_gallery_create_defaults( $reference );
\Modula\V2\Meta_Sync::persist_merged_gallery_items( $reference, array( array( 'id' => $ids[0] ), array( 'id' => $ids[1] ) ), false );
$reference_page = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $prefix . 'reference', 'post_content' => '[modula id="' . $reference . '"]' ) );
$shared_before = array();
foreach ( array_slice( $ids, 0, 3 ) as $media_id ) {
 $shared_before[ $media_id ] = array( get_post( $media_id, ARRAY_A ), get_post_meta( $media_id, '_wp_attachment_image_alt', true ), hash_file( 'sha256', get_attached_file( $media_id ) ) );
}
$read = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
$attachment = $catalog['attachments'][6]['id'];
$input = array( 'request_id' => $prefix . 'add', 'id' => $id, 'revision' => $read['gallery']['revision'], 'changes' => array( array( 'action' => 'add', 'id' => $attachment ) ) );
$out = $ability->execute( $input );
modula_composition_assert( ! is_wp_error( $out ) && 'succeeded' === $out['status'], 'Native add must succeed: ' . wp_json_encode( $out ) );
$after = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
modula_composition_assert( array_merge( array_column( $read['items'], 'id' ), array( $attachment ) ) === array_column( $after['items'], 'id' ), 'Add appends one image while preserving existing order.' );
modula_composition_assert( $out === $ability->execute( $input ), 'Replay must retain the original outcome.' );
$patch = array( 'request_id' => $prefix . 'patch', 'id' => $id, 'revision' => $after['gallery']['revision'], 'changes' => array(
 array( 'action' => 'update', 'id' => $ids[0], 'fields' => array( 'width' => 4, 'height' => 2, 'gridX' => 4, 'gridY' => 0, 'gridLocked' => 1 ) ),
 array( 'action' => 'remove', 'id' => $ids[1] ),
 array( 'action' => 'update', 'id' => $attachment, 'fields' => array( 'width' => 2, 'height' => 2, 'gridX' => 2, 'gridY' => 0 ) ),
 array( 'action' => 'move', 'id' => $attachment, 'before_id' => $ids[0] ),
) );
$patched = $ability->execute( $patch );
modula_composition_assert( 'succeeded' === ( $patched['status'] ?? '' ), 'Whole composition patch must succeed: ' . wp_json_encode( $patched ) );
$final = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
modula_composition_assert( array( $read['items'][0]['id'], $attachment, $ids[0], $read['items'][3]['id'], $ids[2] ) === array_column( $final['items'], 'id' ), 'Patch keeps mixed rows in order and removes only the selected image.' );
modula_composition_assert( 4 === $final['items'][2]['width'] && 4 === $final['items'][2]['gridX'], 'Custom-grid placement must survive the public read.' );
modula_composition_assert( $read['items'][0] === $final['items'][0] && $read['items'][3] === $final['items'][3], 'Untargeted embedded rows stay unchanged.' );
modula_composition_assert( $out === $ability->execute( $input ), 'Replaying add after a later patch must not change composition.' );
modula_composition_assert( wp_json_encode( $final ) === wp_json_encode( wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) ) ), 'Replay does not re-add or reorder.' );
// A valid first change plus an invalid later one must leave the entire target intact.
$before = wp_json_encode( $final );
$invalid = array(
 array( array( 'action' => 'remove', 'id' => $ids[2] ), array( 'action' => 'update', 'id' => $ids[0], 'fields' => array( 'gridX' => 10, 'width' => 4 ) ) ),
 array( array( 'action' => 'update', 'id' => $ids[0], 'fields' => array( 'width' => 1 ) ) ),
 array( array( 'action' => 'update', 'id' => $ids[0], 'fields' => array( 'gridX' => 2 ) ) ),
 array( array( 'action' => 'update', 'id' => $ids[0], 'fields' => array( 'width' => '4' ) ) ),
 array( array( 'action' => 'update', 'id' => $ids[0], 'fields' => array( 'title' => 'Do not write shared title' ) ) ),
 array( array( 'action' => 'add', 'id' => $ids[0] ) ),
 array( array( 'action' => 'update', 'id' => $ids[0], 'fields' => array( 'focal_x' => 0.25 ) ) ),
 array( array( 'action' => 'move', 'id' => $ids[0], 'before_id' => $ids[0] ) ),
 array( array( 'action' => 'move', 'id' => $ids[0], 'fields' => array( 'width' => 3 ) ) ),
 array( array( 'action' => 'remove', 'id' => $ids[1] ) ),
 array( array( 'action' => 'update', 'id' => $ids[0], 'fields' => array( 'link' => 'javascript:alert(1)' ) ) ),
);
foreach ( $invalid as $index => $changes ) {
 $bad = array_merge( $patch, array( 'request_id' => $prefix . 'invalid-' . $index, 'revision' => $final['gallery']['revision'], 'changes' => $changes ) );
 $rejected = $ability->execute( $bad );
 modula_composition_assert( 'rejected' === ( $rejected['status'] ?? '' ), 'Invalid proposal must reject: ' . wp_json_encode( $rejected ) );
 modula_composition_assert( $before === wp_json_encode( wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) ) ), 'Invalid proposal must not write any gallery state.' );
}
foreach ( $shared_before as $media_id => $expected ) {
 modula_composition_assert( $expected === array( get_post( $media_id, ARRAY_A ), get_post_meta( $media_id, '_wp_attachment_image_alt', true ), hash_file( 'sha256', get_attached_file( $media_id ) ) ), 'Shared title/content/caption/alt and attachment bytes must remain unchanged, including the removed member.' );
}
$changed = $input; $changed['changes'][0]['id'] = $ids[7];
modula_composition_assert( 'request_payload_mismatch' === $ability->execute( $changed )['code'], 'Changed request payload cannot replay.' );
$stale = array_merge( $patch, array( 'request_id' => $prefix . 'stale' ) );
modula_composition_assert( 'stale_revision' === $ability->execute( $stale )['code'], 'Old composition revision must conflict.' );
$alt = get_post_meta( $ids[0], '_wp_attachment_image_alt', true );
update_post_meta( $ids[0], '_wp_attachment_image_alt', 'Owned changed attachment' );
$media_stale = array_merge( $patch, array( 'request_id' => $prefix . 'media-stale', 'revision' => $final['gallery']['revision'] ) );
modula_composition_assert( 'stale_revision' === $ability->execute( $media_stale )['code'], 'A shared attachment writer invalidates the read revision.' );
update_post_meta( $ids[0], '_wp_attachment_image_alt', $alt );
foreach ( array( $id, $attachment ) as $denied_id ) {
 $deny = static function ( $caps, $cap, $user, $args ) use ( $denied_id ) { return 'edit_post' === $cap && isset( $args[0] ) && $denied_id === (int) $args[0] ? array( 'do_not_allow' ) : $caps; };
 add_filter( 'map_meta_cap', $deny, 10, 4 );
 modula_composition_assert( 'forbidden' === $ability->execute( $input )['status'] && 'forbidden' === wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $input['request_id'] ) )['status'], 'Replay and recovery require current gallery and media capabilities.' );
 remove_filter( 'map_meta_cap', $deny );
}
update_post_meta( $id, '_modula_bind_target_type', 'folder' );
$bound = array_merge( $patch, array( 'request_id' => $prefix . 'bound' ) );
modula_composition_assert( 'unsupported_bound_target' === $ability->execute( $bound )['code'], 'Bound mutations cannot enter ordinary image composition.' );
delete_post_meta( $id, '_modula_bind_target_type' );
$classic = array_merge( $patch, array( 'request_id' => $prefix . 'classic', 'id' => $catalog['galleries']['classic']['id'] ) );
modula_composition_assert( 'unsupported_target' === $ability->execute( $classic )['code'], 'Classic composition cannot be mutated.' );
$fresh = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
$link_patch = array( 'request_id' => $prefix . 'link', 'id' => $id, 'revision' => $fresh['gallery']['revision'], 'changes' => array( array( 'action' => 'update', 'id' => $attachment, 'fields' => array( 'link' => 'https://example.invalid/composition', 'target' => 1 ) ) ) );
$link_result = $ability->execute( $link_patch );
modula_composition_assert( 'succeeded' === $link_result['status'], 'Image link target uses the editor integer flag: ' . wp_json_encode( $link_result ) );
$linked = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
modula_composition_assert( 1 === $linked['items'][1]['target'], 'Read exposes the saved link target flag.' );
$final = $linked;
$sparse_id = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'draft', 'post_title' => $prefix . 'sparse', 'post_author' => $users[0], 'meta_input' => array( '_modula_beta' => '1', 'modula-settings' => array( 'type' => 'custom-grid', 'opaque' => 'keep' ) ) ) );
$sparse_rows = array( array( 'id' => $ids[0], 'filters' => 'Preserved filter' ) );
\Modula\V2\Meta_Sync::persist_merged_gallery_items( $sparse_id, $sparse_rows, false );
\Modula\V2\Meta_Sync::with_canonical_gallery_write( $sparse_id, static function () use ( $sparse_id, $sparse_rows ) {
 update_post_meta( $sparse_id, 'modula-images', $sparse_rows );
 update_post_meta( $sparse_id, 'modula-settings', array( 'type' => 'custom-grid', 'filters' => array(), 'opaque' => 'keep' ) );
 delete_post_meta( $sparse_id, 'modula_settings_v2' );
} );
$flat_before = get_post_meta( $sparse_id, 'modula-settings', true );
$grouped_before = get_post_meta( $sparse_id, 'modula_settings_v2', true );
$sparse = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $sparse_id ) );
$sparse_added = $ability->execute( array( 'request_id' => $prefix . 'sparse', 'id' => $sparse_id, 'revision' => $sparse['gallery']['revision'], 'changes' => array( array( 'action' => 'add', 'id' => $attachment ) ) ) );
modula_composition_assert( 'succeeded' === $sparse_added['status'], 'Image add supports sparse existing Beta galleries.' );
modula_composition_assert( $grouped_before === get_post_meta( $sparse_id, 'modula_settings_v2', true ) && $flat_before === get_post_meta( $sparse_id, 'modula-settings', true ), 'Image preparation must not repair or replace unrelated gallery settings.' );
if ( 'abilities-composition-native-only' === $action ) { modula_composition_assert( ! class_exists( '\WP\MCP\Core\McpAdapter' ), 'MCP must be absent.' ); }
modula_e2e_output( array( 'input' => $input, 'outcome' => $out, 'final' => $final, 'page' => get_permalink( $page_id ), 'reference_id' => $reference, 'reference_page' => get_permalink( $reference_page ), 'shared' => $shared_before, 'fallback_links' => array( get_attachment_link( $ids[0] ), get_attachment_link( $ids[2] ) ), 'adapter_loaded' => class_exists( '\WP\MCP\Core\McpAdapter' ) ) );
