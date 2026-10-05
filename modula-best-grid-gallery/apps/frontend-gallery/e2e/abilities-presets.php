<?php
/** Gallery presets through the same native interface and fixture lifecycle. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! isset( $state['run'] ) || $state['run'] !== getenv( 'MODULA_E2E_RUN' ) ) { exit( 1 ); }
$users = get_users( array( 'meta_key' => $marker, 'meta_value' => $run, 'fields' => 'ID' ) ); wp_set_current_user( $users[0] );
function modula_preset_assert( $ok, $message ) { if ( ! $ok ) { WP_CLI::error( $message ); } }
$abilities = wp_get_abilities();
modula_preset_assert( isset( $abilities['modula/create-gallery-preset'] ), 'Native create-gallery-preset must be registered.' );

$prefix = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '-' . $action;
$input = array( 'request_id' => $prefix . '-create', 'title' => 'Native gallery preset', 'status' => 'publish', 'settings' => array( 'layout' => array( 'gutter' => 31 ), 'style' => array( 'customCss' => '.e2e-preset::before { content: "\\2605"; }' ) ), 'sorting' => 'manual' );
$out = $abilities['modula/create-gallery-preset']->execute( $input );
if ( 'lite' === getenv( 'MODULA_E2E_MODE' ) ) {
 modula_preset_assert( 'forbidden' === $out['status'], 'Lite refuses unavailable Presets.' );
 modula_e2e_output( array( 'unavailable' => $out, 'adapter_loaded' => class_exists( '\\WP\\MCP\\Core\\McpAdapter' ) ) ); return;
}
modula_preset_assert( 'succeeded' === $out['status'], 'Create preset: ' . wp_json_encode( $out ) );
$id = $out['preset']['id']; update_post_meta( $id, $marker, $run );
modula_preset_assert( $out === $abilities['modula/create-gallery-preset']->execute( $input ), 'Preset creation deduplicates.' );
$read = $abilities['modula/read-gallery-preset']->execute( array( 'id' => $id ) );
modula_preset_assert( 31 === $read['preset']['settings']['layout']['gutter'], 'Preset read returns saved configuration.' );
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$targets = array();
foreach ( array( 'one', 'two', 'three' ) as $name ) {
 $gallery = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'publish', 'post_title' => 'Preset target ' . $name, 'meta_input' => array( '_modula_beta' => '1' ) ) );
 \Modula\V2\Meta_Sync::apply_new_beta_gallery_create_defaults( $gallery );
 \Modula\V2\Meta_Sync::persist_merged_gallery_items( $gallery, array( array( 'id' => $catalog['attachments'][0]['id'] ) ), false );
 $targets[] = array( 'id' => $gallery, 'revision' => $abilities['modula/read-gallery']->execute( array( 'id' => $gallery ) )['gallery']['revision'] );
}
$before = $abilities['modula/read-gallery']->execute( array( 'id' => $targets[0]['id'] ) );
$apply = array( 'request_id' => $prefix . '-apply', 'preset_id' => $id, 'preset_revision' => $read['preset']['revision'] ) + $targets[0];
$applied = $abilities['modula/apply-gallery-preset']->execute( $apply );
modula_preset_assert( 'succeeded' === $applied['status'], 'Apply preset: ' . wp_json_encode( $applied ) );
$after = $abilities['modula/read-gallery']->execute( array( 'id' => $targets[0]['id'] ) );
modula_preset_assert( $before['items'] === $after['items'] && 31 === $after['gallery']['settings']['layout']['gutter'], 'Application preserves membership and attachment text.' );
modula_preset_assert( $input['settings']['style']['customCss'] === get_post_meta( $targets[0]['id'], 'modula-settings', true )['style'], 'Applied CSS escapes match the stored canonical preset and legacy rendering carrier.' );
modula_preset_assert( $applied === $abilities['modula/apply-gallery-preset']->execute( $apply ), 'Application replays without rewriting.' );
$update = array( 'request_id' => $prefix . '-update', 'id' => $id, 'revision' => $read['preset']['revision'], 'title' => 'Updated preset', 'settings' => array( 'layout' => array( 'gutter' => 32 ) ), 'sorting' => 'titleAZ' );
$updated = $abilities['modula/update-gallery-preset']->execute( $update );
modula_preset_assert( 'succeeded' === $updated['status'], 'Update preset: ' . wp_json_encode( $updated ) );
$stale = $apply; $stale['request_id'] .= '-stale'; $stale['revision'] = $after['gallery']['revision'];
modula_preset_assert( 'conflict' === $abilities['modula/apply-gallery-preset']->execute( $stale )['status'], 'Changed source is refused even when target revision is current.' );
$read = $abilities['modula/read-gallery-preset']->execute( array( 'id' => $id ) );
foreach ( $targets as &$target ) { $target['revision'] = $abilities['modula/read-gallery']->execute( array( 'id' => $target['id'] ) )['gallery']['revision']; } unset( $target );
$targets[1]['revision'] = str_repeat( '0', 64 );
$batch = array( 'request_id' => $prefix . '-batch', 'preset_id' => $id, 'preset_revision' => $read['preset']['revision'], 'targets' => $targets );
$batched = $abilities['modula/apply-gallery-presets']->execute( $batch );
modula_preset_assert( 'partial' === $batched['status'] && array( 'succeeded', 'conflict', 'succeeded' ) === array_column( $batched['targets'], 'status' ), 'Batch has individual outcomes: ' . wp_json_encode( $batched ) );
modula_preset_assert( $batched === $abilities['modula/recover-request']->execute( array( 'request_id' => $batch['request_id'] ) ), 'Batch recovery returns per-target outcomes.' );
// Interrupt at the real committed-target boundary, then change the source before resuming.
$resume = $batch; $resume['request_id'] .= '-resume';
foreach ( $resume['targets'] as &$target ) { $target['revision'] = $abilities['modula/read-gallery']->execute( array( 'id' => $target['id'] ) )['gallery']['revision']; } unset( $target );
$interrupt = static function ( $request, $index ) use ( $resume ) { if ( $request === $resume['request_id'] && 0 === $index ) { throw new RuntimeException( 'Controlled preset batch interruption.' ); } };
add_action( 'modula_abilities_batch_target_finished', $interrupt, 10, 2 );
$progress = $abilities['modula/apply-gallery-presets']->execute( $resume );
remove_action( 'modula_abilities_batch_target_finished', $interrupt );
modula_preset_assert( array( 'succeeded', 'pending', 'pending' ) === array_column( $progress['targets'], 'status' ), 'Interrupted preset batch retains committed and pending results.' );
$target_read = $abilities['modula/read-gallery']->execute( array( 'id' => $targets[0]['id'] ) );
$human = $abilities['modula/update-gallery']->execute( array( 'request_id' => $prefix . '-human', 'id' => $targets[0]['id'], 'revision' => $target_read['gallery']['revision'], 'settings' => array( 'layout' => array( 'gutter' => 46 ) ) ) );
modula_preset_assert( 'succeeded' === $human['status'], 'Later gallery edit succeeds.' );
wp_update_post( array( 'ID' => $id, 'post_title' => 'Source edited during interruption' ) );
$resumed = $abilities['modula/apply-gallery-presets']->execute( $resume );
modula_preset_assert( array( 'succeeded', 'conflict', 'conflict' ) === array_column( $resumed['targets'], 'status' ) && 46 === $abilities['modula/read-gallery']->execute( array( 'id' => $targets[0]['id'] ) )['gallery']['settings']['layout']['gutter'], 'Resume never repeats successes or applies a changed source unnoticed.' );
$retry = $resume; $retry['request_id'] .= '-retry'; $retry['targets'] = array_slice( $retry['targets'], 1 );
$retry['preset_revision'] = $abilities['modula/read-gallery-preset']->execute( array( 'id' => $id ) )['preset']['revision'];
modula_preset_assert( 'succeeded' === $abilities['modula/apply-gallery-presets']->execute( $retry )['status'], 'Explicit retry applies only refused targets with the current source revision.' );
$denied = static function ( $caps, $cap, $user, $args ) use ( $id ) { return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $id ? array( 'do_not_allow' ) : $caps; };
add_filter( 'map_meta_cap', $denied, 10, 4 );
$protected = $abilities['modula/recover-request']->execute( array( 'request_id' => $apply['request_id'] ) );
modula_preset_assert( 'forbidden' === $protected['status'] && ! isset( $protected['gallery'] ), 'Source permission revocation redacts application recovery.' );
remove_filter( 'map_meta_cap', $denied );
$classic = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'draft', 'post_title' => 'Classic preset target' ) );
$classic_input = $apply; $classic_input['request_id'] .= '-classic'; $classic_input['id'] = $classic;
modula_preset_assert( 'rejected' === $abilities['modula/apply-gallery-preset']->execute( $classic_input )['status'], 'Classic target cannot be converted by application.' );
// A saved preset carrying an unavailable active field is refused, never silently stripped.
$raw = get_post_meta( $id, 'modula_settings_v2', true );
$unavailable = json_decode( $raw, true ); $unavailable['unknownExtension'] = array( 'enabled' => true );
update_post_meta( $id, 'modula_settings_v2', wp_slash( wp_json_encode( $unavailable ) ) );
$bad = $apply; $bad['request_id'] .= '-unavailable'; $bad['preset_revision'] = $abilities['modula/read-gallery-preset']->execute( array( 'id' => $id ) )['preset']['revision']; $bad['revision'] = $abilities['modula/read-gallery']->execute( array( 'id' => $bad['id'] ) )['gallery']['revision'];
modula_preset_assert( 'rejected' === $abilities['modula/apply-gallery-preset']->execute( $bad )['status'], 'Unavailable preset configuration is rejected before target changes.' );
update_post_meta( $id, 'modula_settings_v2', wp_slash( $raw ) );
$delete_input = $input; $delete_input['request_id'] .= '-disposable';
$disposable = $abilities['modula/create-gallery-preset']->execute( $delete_input );
$delete = array( 'request_id' => $prefix . '-delete', 'id' => $disposable['preset']['id'], 'revision' => $disposable['preset']['revision'] );
$deleted = $abilities['modula/delete-gallery-preset']->execute( $delete );
modula_preset_assert( 'succeeded' === $deleted['status'] && $deleted === $abilities['modula/delete-gallery-preset']->execute( $delete ), 'Permanent deletion remains recoverable after the object is gone.' );
$page = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Preset target public', 'post_content' => '[modula id="' . $targets[0]['id'] . '"]' ) );
modula_e2e_output( array( 'input' => $input, 'outcome' => $out, 'targets' => $targets, 'page' => get_permalink( $page ), 'adapter_loaded' => class_exists( '\\WP\\MCP\\Core\\McpAdapter' ) ) );
