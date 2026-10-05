<?php
/** Mixed-item authoring through the installed native ability. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! isset( $state['run'] ) || $state['run'] !== getenv( 'MODULA_E2E_RUN' ) ) { exit( 1 ); }
function modula_embedded_assert( $ok, $message ) { if ( ! $ok ) { WP_CLI::error( $message ); } }
$users = get_users( array( 'meta_key' => $marker, 'meta_value' => $run, 'fields' => 'ID' ) );
wp_set_current_user( $users[0] );
$mode = getenv( 'MODULA_E2E_MODE' );
$prefix = $run . '-' . $mode . '-embedded-' . ( 'abilities-embedded-native-only' === $action ? 'native-' : '' );
$ability = wp_get_abilities()['modula/update-gallery-items'] ?? null;
modula_embedded_assert( $ability instanceof WP_Ability, 'Native update-gallery-items must be registered.' );
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$id = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'publish', 'post_title' => $prefix, 'post_author' => $users[0], 'meta_input' => array( '_modula_beta' => '1' ) ) );
\Modula\V2\Meta_Sync::apply_new_beta_gallery_create_defaults( $id );
\Modula\V2\Settings\Writer::patch( $id, array( 'general' => array( 'type' => 'custom-grid', 'shuffle' => false ) ) );
$ids = array_column( $catalog['attachments'], 'id' );
\Modula\V2\Meta_Sync::persist_merged_gallery_items( $id, array( array( 'id' => $ids[0], 'width' => 2, 'height' => 2, 'gridX' => 0, 'gridY' => 0 ) ), false );
$shared_before = array( get_post( $ids[0], ARRAY_A ), get_post_meta( $ids[0], '_wp_attachment_image_alt', true ), hash_file( 'sha256', get_attached_file( $ids[0] ) ) );
$read = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
$input = array( 'request_id' => $prefix . 'add', 'id' => $id, 'revision' => $read['gallery']['revision'], 'item_changes' => array( array( 'action' => 'add', 'id' => 'block-one', 'kind' => 'content_block', 'fields' => array( 'title' => 'Native block', 'blockBodyHtml' => '<p>Native body</p>', 'gridX' => 2, 'gridY' => 0 ) ) ) );
$out = $ability->execute( $input );
modula_embedded_assert( 'succeeded' === ( $out['status'] ?? '' ), 'Native content block add succeeds in Lite/Pro: ' . wp_json_encode( $out ) );
$after = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
modula_embedded_assert( array( $ids[0], 'block-one' ) === array_column( $after['items'], 'id' ) && 'Native body' === strip_tags( $after['items'][1]['blockBodyHtml'] ), 'Read returns stable mixed identities and authored body.' );
$patch = array( 'request_id' => $prefix . 'mixed', 'id' => $id, 'revision' => $after['gallery']['revision'], 'item_changes' => array(
 array( 'action' => 'add', 'id' => 'shortcode-one', 'kind' => 'shortcode', 'before_id' => 'block-one', 'fields' => array( 'shortcodeRaw' => '[caption width="120"]Shortcode body[/caption]', 'width' => 2, 'height' => 2, 'gridX' => 6, 'gridY' => 0 ) ),
 array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'title' => '<b>Updated block</b>', 'blockBodyHtml' => '<p>Updated body <em>safe</em><script>alert(1)</script></p>', 'blockPaddingPreset' => 'generous', 'blockTextColor' => '#123456', 'blockBackgroundColor' => 'rgba(12, 34, 56, 0.5)', 'blockFontPreset' => 'serif' ) ),
 array( 'action' => 'move', 'id' => $ids[0], 'before_id' => 'shortcode-one' ),
 array( 'action' => 'add', 'id' => 'remove-me', 'kind' => 'content_block' ),
 array( 'action' => 'remove', 'id' => 'remove-me' ),
 array( 'action' => 'move', 'id' => 'block-one', 'before_id' => $ids[0] ),
) );
$patched = $ability->execute( $patch );
modula_embedded_assert( 'succeeded' === ( $patched['status'] ?? '' ), 'Mixed add/update/remove/move succeeds: ' . wp_json_encode( $patched ) );
$final = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
modula_embedded_assert( array( 'block-one', $ids[0], 'shortcode-one' ) === array_column( $final['items'], 'id' ), 'Mixed identities and order are stable.' );
modula_embedded_assert( 'Updated block' === $final['items'][0]['title'] && false === strpos( $final['items'][0]['blockBodyHtml'], '<script' ) && false !== strpos( $final['items'][0]['blockBodyHtml'], '<em>safe</em>' ), 'Existing title/HTML sanitizers apply without rendering.' );
// Every invalid proposal preserves the full target, including a valid earlier step.
$invalid = array(
 array( array( 'action' => 'remove', 'id' => 'block-one' ), array( 'action' => 'add', 'id' => 'video_template_999', 'kind' => 'content_block' ) ),
 array( array( 'action' => 'add', 'id' => 'block-one', 'kind' => 'content_block' ) ),
 array( array( 'action' => 'update', 'id' => 'block-one', 'kind' => 'shortcode', 'fields' => array( 'shortcodeRaw' => '[caption]Bad[/caption]' ) ) ),
 array( array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'shortcodeRaw' => 'wrong kind' ) ) ),
 array( array( 'action' => 'update', 'id' => 'shortcode-one', 'fields' => array( 'title' => 'wrong kind' ) ) ),
 array( array( 'action' => 'update', 'id' => $ids[0], 'fields' => array( 'title' => 'shared text' ) ) ),
 array( array( 'action' => 'remove', 'id' => $ids[0] ) ),
 array( array( 'action' => 'move', 'id' => (string) $ids[0] ) ),
 array( array( 'action' => 'move', 'id' => 'block-one', 'before_id' => 'missing' ) ),
 array( array( 'action' => 'move', 'id' => 'block-one', 'before_id' => 'block-one' ) ),
 array( array( 'action' => 'remove', 'id' => 'missing' ) ),
 array( array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'width' => '4' ) ) ),
 array( array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'width' => 1 ) ) ),
 array( array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'gridX' => 10 ) ) ),
 array( array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'gridX' => 0 ) ) ),
 array( array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'blockBackgroundColor' => 'url(javascript:bad)' ) ) ),
 array( array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'blockPaddingPreset' => 'invalid' ) ) ),
 array( array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'blockBackgroundImageId' => $id ) ) ),
 array( array( 'action' => 'add', 'id' => 'unknown-kind' ) ),
 array( array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'embeddedId' => 'changed' ) ) ),
);
foreach ( $invalid as $n => $changes ) {
 $bad = array_merge( $patch, array( 'request_id' => $prefix . 'invalid-' . $n, 'revision' => $final['gallery']['revision'], 'item_changes' => $changes ) );
 $rejected = $ability->execute( $bad );
 modula_embedded_assert( 'rejected' === ( $rejected['status'] ?? '' ), 'Invalid mixed proposal rejects atomically (' . $n . '): ' . wp_json_encode( $rejected ) );
 modula_embedded_assert( wp_json_encode( $final ) === wp_json_encode( wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) ) ), 'Rejected proposal preserves complete read and revision (' . $n . ').' );
}
modula_embedded_assert( $out === $ability->execute( $input ) && $out === wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $input['request_id'] ) ), 'Original creation replays and recovers after later changes without duplicating identities.' );
$changed = $input; $changed['item_changes'][0]['id'] = 'different-id';
modula_embedded_assert( 'request_payload_mismatch' === $ability->execute( $changed )['code'], 'Same request cannot change its item identity.' );
$stale = array_merge( $patch, array( 'request_id' => $prefix . 'stale' ) );
modula_embedded_assert( 'stale_revision' === $ability->execute( $stale )['code'], 'Old read cannot overwrite current mixed content.' );
$background = $ids[1];
$bg_input = array_merge( $patch, array( 'request_id' => $prefix . 'background', 'revision' => $final['gallery']['revision'], 'item_changes' => array( array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'blockBackgroundImageId' => $background, 'blockBackgroundOverlayOpacity' => 22, 'blockBackgroundSize' => 'contain', 'blockBackgroundPosition' => 'bottom right', 'blockBackgroundRepeat' => 'no-repeat' ) ) ) ) );
$bg = $ability->execute( $bg_input );
modula_embedded_assert( 'succeeded' === $bg['status'], 'Accessible background image and its presentation can be patched.' );
foreach ( array( $id, $background ) as $denied_id ) {
 $deny = static function ( $caps, $cap, $user, $args ) use ( $denied_id ) { return 'edit_post' === $cap && isset( $args[0] ) && $denied_id === (int) $args[0] ? array( 'do_not_allow' ) : $caps; };
 add_filter( 'map_meta_cap', $deny, 10, 4 );
 modula_embedded_assert( 'forbidden' === $ability->execute( $bg_input )['status'] && 'forbidden' === wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $bg_input['request_id'] ) )['status'], 'Replay/recovery recheck current gallery and explicit background permissions.' );
 remove_filter( 'map_meta_cap', $deny );
}
$final = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
$alt = get_post_meta( $background, '_wp_attachment_image_alt', true );
update_post_meta( $background, '_wp_attachment_image_alt', 'Concurrent background edit' );
$stale['request_id'] = $prefix . 'background-stale'; $stale['revision'] = $final['gallery']['revision'];
modula_embedded_assert( 'stale_revision' === $ability->execute( $stale )['code'], 'Background attachment edits invalidate gallery revision.' );
update_post_meta( $background, '_wp_attachment_image_alt', $alt );
$render_calls = 0;
add_shortcode( 'modula_e2e_read_probe', static function () use ( &$render_calls ) { ++$render_calls; return 'Rendered'; } );
$fresh = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
$pure = array_merge( $patch, array( 'request_id' => $prefix . 'pure', 'revision' => $fresh['gallery']['revision'], 'item_changes' => array( array( 'action' => 'update', 'id' => 'shortcode-one', 'fields' => array( 'shortcodeRaw' => '[modula_e2e_read_probe]' ) ), array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'blockBodyHtml' => '<p>[modula_e2e_read_probe]</p>' ) ) ) ) );
modula_embedded_assert( 'succeeded' === $ability->execute( $pure )['status'], 'Shortcode sources can be authored without rendering.' );
$read_pure = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
modula_embedded_assert( 0 === $render_calls && '[modula_e2e_read_probe]' === $read_pure['items'][2]['shortcodeRaw'], 'Mutation and administrative read never execute a shortcode callback.' );
remove_shortcode( 'modula_e2e_read_probe' );
$restore = array_merge( $pure, array( 'request_id' => $prefix . 'restore-content', 'revision' => $read_pure['gallery']['revision'], 'item_changes' => array( array( 'action' => 'update', 'id' => 'shortcode-one', 'fields' => array( 'shortcodeRaw' => '[caption width="120"]Shortcode body[/caption]' ) ), array( 'action' => 'update', 'id' => 'block-one', 'fields' => array( 'blockBodyHtml' => '<p>Final body <em>safe</em></p>' ) ) ) ) );
modula_embedded_assert( 'succeeded' === $ability->execute( $restore )['status'], 'Final authored contents persist.' );
$final = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
$classic = array_merge( $input, array( 'request_id' => $prefix . 'classic', 'id' => $catalog['galleries']['classic']['id'] ) );
modula_embedded_assert( 'unsupported_target' === $ability->execute( $classic )['code'], 'Classic targets remain unsupported.' );
update_post_meta( $id, '_modula_bind_target_type', 'folder' );
$bound = array_merge( $input, array( 'request_id' => $prefix . 'bound' ) );
modula_embedded_assert( 'unsupported_bound_target' === $ability->execute( $bound )['code'], 'Bound targets remain unsupported.' );
delete_post_meta( $id, '_modula_bind_target_type' );
wp_set_current_user( 0 );
modula_embedded_assert( is_wp_error( $ability->execute( $input ) ), 'Unauthenticated actor cannot execute protected writes.' );
wp_set_current_user( $users[0] );
modula_embedded_assert( $shared_before === array( get_post( $ids[0], ARRAY_A ), get_post_meta( $ids[0], '_wp_attachment_image_alt', true ), hash_file( 'sha256', get_attached_file( $ids[0] ) ) ), 'Authored content and ordering preserve shared media text and bytes.' );
// Historical rows can infer their content kind; do not warn, convert or repair them.
$sparse_id = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'draft', 'post_title' => $prefix . 'sparse', 'post_author' => $users[0], 'meta_input' => array( '_modula_beta' => '1' ) ) );
\Modula\V2\Meta_Sync::apply_new_beta_gallery_create_defaults( $sparse_id );
$sparse_rows = array( array( 'id' => 'sparse-block', 'embeddedId' => 'sparse-block', 'title' => 'Before', 'blockBodyHtml' => '<p>Preserved sparse body</p>', 'opaque_future_field' => 'keep', 'width' => 4, 'height' => 2 ) );
\Modula\V2\Meta_Sync::persist_prepared_gallery_items( $sparse_id, $sparse_rows );
$sparse_read = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $sparse_id ) );
$sparse_input = array( 'request_id' => $prefix . 'sparse', 'id' => $sparse_id, 'revision' => $sparse_read['gallery']['revision'], 'item_changes' => array( array( 'action' => 'update', 'id' => 'sparse-block', 'fields' => array( 'title' => 'After' ) ) ) );
$warnings = array();
set_error_handler( static function ( $level, $message ) use ( &$warnings ) { $warnings[] = $message; return true; }, E_WARNING | E_NOTICE );
try { $sparse_result = $ability->execute( $sparse_input ); } finally { restore_error_handler(); }
modula_embedded_assert( array() === $warnings, 'Sparse-row mutation emits no warnings: ' . wp_json_encode( $warnings ) );
modula_embedded_assert( 'succeeded' === $sparse_result['status'], 'Existing inferred content block can be updated.' );
$sparse_rows[0]['title'] = 'After';
modula_embedded_assert( $sparse_rows === \Modula\V2\Meta_Sync::get_images_v2( $sparse_id ), 'Sparse update preserves identity and every omitted/unknown property.' );
$page_id = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $prefix . 'page', 'post_content' => '[modula id="' . $id . '"]' ) );
modula_e2e_output( array( 'adapter_loaded' => class_exists( '\WP\MCP\Core\McpAdapter' ), 'input' => $input, 'outcome' => $out, 'final' => $final, 'shared' => $shared_before, 'page' => get_permalink( $page_id ) ) );
