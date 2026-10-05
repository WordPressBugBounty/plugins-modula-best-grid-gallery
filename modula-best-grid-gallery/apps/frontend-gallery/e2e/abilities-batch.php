<?php
/** Mixed batch outcomes through the real native API. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! isset( $state['run'] ) || $state['run'] !== getenv( 'MODULA_E2E_RUN' ) ) { exit( 1 ); }
function modula_batch_assert( $ok, $message ) { if ( ! $ok ) { WP_CLI::error( $message ); } }
$users = get_users( array( 'meta_key' => $marker, 'meta_value' => $run, 'fields' => 'ID' ) ); wp_set_current_user( $users[0] );
$prefix = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '-' . $action;
$ability = wp_get_abilities()['modula/update-galleries'] ?? null;
modula_batch_assert( $ability instanceof WP_Ability, 'Native update-galleries must be registered.' );
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$targets = array();
foreach ( array( 'saved', 'invalid', 'stale' ) as $name ) {
 $id = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'publish', 'post_title' => $prefix . '-' . $name, 'post_author' => $users[0], 'meta_input' => array( '_modula_beta' => '1' ) ) );
 \Modula\V2\Meta_Sync::apply_new_beta_gallery_create_defaults( $id );
 \Modula\V2\Meta_Sync::persist_merged_gallery_items( $id, array( array( 'id' => $catalog['attachments'][0]['id'] ) ), false );
 $read = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
 $targets[] = array( 'id' => $id, 'revision' => $read['gallery']['revision'], 'settings' => array( 'layout' => array( 'gutter' => 31 ) ) );
}
$targets[1]['settings']['layout']['gutter'] = 'invalid';
wp_update_post( array( 'ID' => $targets[2]['id'], 'post_title' => 'Newer human title' ) );
$input = array( 'request_id' => $prefix . '-mixed', 'targets' => $targets );
$crash_file = getenv( 'MODULA_E2E_RUN_DIR' ) . '/' . getenv( 'MODULA_E2E_MODE' ) . '/batch-interrupted-input.json';
if ( 'abilities-batch-crash' === $action ) {
 foreach ( $input['targets'] as &$target ) { $target['settings']['layout']['gutter'] = 32; $target['revision'] = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $target['id'] ) )['gallery']['revision']; } unset( $target );
 file_put_contents( $crash_file, wp_json_encode( $input ) );
 add_action( 'modula_abilities_batch_target_finished', static function ( $request, $index ) { if ( 0 === $index ) { modula_e2e_output( array( 'interrupted_after' => 1, 'request' => $request ) ); exit( 0 ); } }, 10, 2 );
 $ability->execute( $input ); WP_CLI::error( 'Expected process interruption.' );
}
$out = $ability->execute( $input );
modula_batch_assert( 'partial' === ( $out['status'] ?? '' ) && array( 'succeeded', 'rejected', 'conflict' ) === array_column( $out['targets'], 'status' ), 'Mixed batch retains individual outcomes: ' . wp_json_encode( $out ) );
modula_batch_assert( $out === $ability->execute( $input ) && $out === wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $input['request_id'] ) ), 'Replay and recovery preserve mixed results.' );
$read = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $targets[0]['id'] ) );
modula_batch_assert( 31 === $read['gallery']['settings']['layout']['gutter'], 'Real success survives other failures.' );
$changed = $input; $changed['targets'][0]['settings']['layout']['gutter'] = 77;
modula_batch_assert( 'request_payload_mismatch' === $ability->execute( $changed )['code'], 'Changed batch input cannot reuse an identity.' );
$retry = array( 'request_id' => $prefix . '-retry', 'targets' => array_slice( $targets, 1 ) );
foreach ( $retry['targets'] as &$target ) { $target['revision'] = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $target['id'] ) )['gallery']['revision']; $target['settings']['layout']['gutter'] = 33; } unset( $target );
$retried = $ability->execute( $retry );
modula_batch_assert( 'succeeded' === $retried['status'] && $out === $ability->execute( $input ), 'Deliberate retry saves failed targets under a new identity while preserving prior results.' );
$deny_id = $targets[0]['id'];
$deny = static function ( $caps, $cap, $user, $args ) use ( $deny_id ) { return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $deny_id ? array( 'do_not_allow' ) : $caps; };
add_filter( 'map_meta_cap', $deny, 10, 4 );
$protected = wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $input['request_id'] ) );
modula_batch_assert( 'forbidden' === $protected['targets'][0]['status'] && ! isset( $protected['targets'][0]['gallery'] ) && 'rejected' === $protected['targets'][1]['status'], 'Recovery redacts revoked target independently.' );
remove_filter( 'map_meta_cap', $deny );
if ( 'abilities-batch' === $action ) {
 $interrupted = json_decode( file_get_contents( $crash_file ), true );
 $progress = wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $interrupted['request_id'] ) );
 modula_batch_assert( array( 'succeeded', 'pending', 'pending' ) === array_column( $progress['targets'], 'status' ), 'Process exit preserves the first target and distinguishes pending targets.' );
 \Modula\V2\Settings\Writer::patch( $interrupted['targets'][0]['id'], array( 'layout' => array( 'gutter' => 44 ) ) );
 $resumed = $ability->execute( $interrupted );
 modula_batch_assert( 'succeeded' === $resumed['status'] && 44 === wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $interrupted['targets'][0]['id'] ) )['gallery']['settings']['layout']['gutter'], 'Resumption completes only pending targets and preserves a later edit to completed target.' );
}
$malformed = array( 'request_id' => $prefix . '-invalid-extra-field', 'targets' => array( array_merge( $targets[0], array( 'attachment_ids' => 'not-supported-here' ) ) ) );
$malformed_out = $ability->execute( $malformed );
modula_batch_assert( 'partial' === $malformed_out['status'] && 'rejected' === $malformed_out['targets'][0]['status'] && $malformed_out === $ability->execute( $malformed ), 'Unsupported fields remain a recoverable per-target rejection.' );
$exception_input = array( 'request_id' => $prefix . '-caught-interruption', 'targets' => array() );
foreach ( $targets as $target ) { $target['revision'] = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $target['id'] ) )['gallery']['revision']; $target['settings']['layout']['gutter'] = 35; $exception_input['targets'][] = $target; }
$interrupt = static function ( $request, $index ) use ( $exception_input ) { if ( $request === $exception_input['request_id'] && 0 === $index ) { throw new RuntimeException( 'Controlled batch boundary interruption.' ); } };
add_action( 'modula_abilities_batch_target_finished', $interrupt, 10, 2 );
$caught = $ability->execute( $exception_input );
remove_action( 'modula_abilities_batch_target_finished', $interrupt );
modula_batch_assert( 'in_progress' === $caught['status'] && array( 'succeeded', 'pending', 'pending' ) === array_column( $caught['targets'], 'status' ), 'Caught interruption retains resumable pending targets.' );
modula_batch_assert( 'succeeded' === $ability->execute( $exception_input )['status'], 'Caught interruption resumes unchanged input.' );
$uncertain_input = array( 'request_id' => $prefix . '-uncertain', 'targets' => array() );
foreach ( $targets as $target ) { $target['revision'] = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $target['id'] ) )['gallery']['revision']; $target['metadata'] = array( 'title' => 'Uncertain batch target' ); unset( $target['settings'] ); $uncertain_input['targets'][] = $target; }
$uncertain_id = $targets[0]['id'];
$fail_write = static function ( $post_id ) use ( $uncertain_id ) { if ( (int) $post_id === $uncertain_id ) { throw new RuntimeException( 'Controlled write failure.' ); } };
add_action( 'post_updated', $fail_write );
$uncertain = $ability->execute( $uncertain_input );
remove_action( 'post_updated', $fail_write );
modula_batch_assert( 'partial' === $uncertain['status'] && 'uncertain' === $uncertain['targets'][0]['status'], 'Target uncertainty is preserved separately.' );
$before_retry = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $uncertain_id ) );
$uncertain_replay = $ability->execute( $uncertain_input );
$after_retry = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $uncertain_id ) );
modula_batch_assert( $uncertain === $uncertain_replay && $before_retry == $after_retry, 'An uncertain child is never automatically executed again: ' . wp_json_encode( array( 'out' => $uncertain, 'replay' => $uncertain_replay, 'before' => $before_retry, 'after' => $after_retry ) ) );
$page_id = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Batch gallery page', 'post_content' => '[modula id="' . $targets[0]['id'] . '"]' ) );
modula_e2e_output( array( 'page' => get_permalink( $page_id ), 'input' => $input, 'outcome' => $out, 'adapter_loaded' => class_exists( '\\WP\\MCP\\Core\\McpAdapter' ) ) );
