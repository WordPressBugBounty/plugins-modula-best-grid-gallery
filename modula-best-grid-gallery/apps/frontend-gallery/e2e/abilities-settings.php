<?php
/** Settings ability checks at the approved installed WordPress boundary. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! isset( $state['run'] ) || $state['run'] !== getenv( 'MODULA_E2E_RUN' ) ) { exit( 1 ); }
function modula_settings_assert( $ok, $message ) { if ( ! $ok ) { WP_CLI::error( $message ); } }
$users = get_users( array( 'meta_key' => $marker, 'meta_value' => $run, 'fields' => 'ID' ) );
wp_set_current_user( $users[0] );
$mode = getenv( 'MODULA_E2E_MODE' );
$prefix = $run . '-' . $mode . '-settings-';
$ability = wp_get_ability( 'modula/update-gallery' );
modula_settings_assert( $ability instanceof WP_Ability, 'Native update-gallery must be registered.' );
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$shared_baseline = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $catalog['galleries']['visible']['id'] ) );
$id = $catalog['galleries']['abilitySettings']['id'];
$read = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
$input = array( 'request_id' => $prefix . $action, 'id' => $id, 'revision' => $read['gallery']['revision'], 'metadata' => array( 'title' => $prefix . 'updated', 'status' => 'publish' ), 'settings' => array( 'layout' => array( 'gutter' => 23 ) ) );
$effects = array( 'email' => 0, 'http' => 0 );
$mail_observer = static function ( $pre ) use ( &$effects ) { $effects['email']++; return $pre; };
$http_observer = static function ( $pre ) use ( &$effects ) { $effects['http']++; return $pre; };
add_filter( 'pre_wp_mail', $mail_observer );
add_filter( 'pre_http_request', $http_observer );
$out = $ability->execute( $input );
modula_settings_assert( ! is_wp_error( $out ) && 'succeeded' === $out['status'], 'Native patch must succeed: ' . wp_json_encode( $out ) );
modula_settings_assert( $out === $ability->execute( $input ), 'Replay must return original settings outcome.' );
$after = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
modula_settings_assert( 23 === $after['gallery']['settings']['layout']['gutter'] && $read['items'] === $after['items'], 'Patch must preserve composition and save selected appearance.' );
if ( 'abilities-settings' === $action ) {
 $before = get_post_meta( $id );
 $meta_before = get_post( $id );
 $read_before = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
 foreach ( array(
  array( 'layout' => array( 'gutter' => '12' ) ),
  array( 'layout' => array( 'gutter' => -1 ) ),
  array( 'general' => array( 'type' => 'invented' ), 'layout' => array( 'gutter' => 31 ) ),
  array( 'general' => array( 'height' => array( 200, 300 ) ) ),
  array( 'passwordProtect' => array( 'password' => 'secret-input-must-not-be-retained' ) ),
  array( 'imageProofing' => array( 'enableProofing' => true ) ),
 ) as $index => $invalid ) {
  $bad = array_merge( $input, array( 'request_id' => $prefix . 'invalid-' . $index, 'revision' => $read_before['gallery']['revision'], 'settings' => $invalid ) );
  $response = $ability->execute( $bad );
  modula_settings_assert( is_array( $response ) && 'rejected' === $response['status'], 'Invalid target must be rejected atomically: ' . wp_json_encode( $response ) );
 }
 modula_settings_assert( $before === get_post_meta( $id ) && $meta_before->post_title === get_post( $id )->post_title, 'Invalid patch must write no target state.' );
 $changed = $input; $changed['metadata']['title'] = 'Changed input';
 modula_settings_assert( 'conflict' === $ability->execute( $changed )['status'], 'Changed input under one identity must conflict.' );
 $stale = array_merge( $input, array( 'request_id' => $prefix . 'stale', 'settings' => array( 'layout' => array( 'gutter' => 33 ) ) ) );
 modula_settings_assert( 'stale_revision' === $ability->execute( $stale )['code'], 'Old revision must not overwrite a later write.' );
 $attachment = $catalog['attachments'][0]['id'];
 $current = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
 $alt = get_post_meta( $attachment, '_wp_attachment_image_alt', true );
 update_post_meta( $attachment, '_wp_attachment_image_alt', 'Owned changed shared text' );
 $media_stale = array_merge( $stale, array( 'request_id' => $prefix . 'attachment-stale', 'revision' => $current['gallery']['revision'] ) );
 modula_settings_assert( 'conflict' === $ability->execute( $media_stale )['status'], 'Attachment text changes must invalidate gallery revision.' );
 update_post_meta( $attachment, '_wp_attachment_image_alt', $alt );
 // Real organization/provider repositories change revision without a gallery save.
 $folders = new \WPChill\Folders\Folders\Wpdb_Folder_Repository();
 $memberships = new \WPChill\Folders\Memberships\Wpdb_Membership_Repository();
 $owned_folder = $folders->insert( array( 'name' => $prefix . 'conflict', 'slug' => $prefix . 'conflict', 'owner_user_id' => $users[0] ) );
 modula_settings_assert( ! empty( $owned_folder['id'] ), 'Owned organization fixture must be created.' );
 $current = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
 $memberships->assign( $owned_folder['id'], $attachment );
 $member_stale = array_merge( $stale, array( 'request_id' => $prefix . 'membership-stale', 'revision' => $current['gallery']['revision'] ) );
 modula_settings_assert( 'conflict' === $ability->execute( $member_stale )['status'], 'Ordinary membership writer must invalidate the revision.' );
 $current = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
 $folders->update( $owned_folder['id'], array( 'name' => $prefix . 'renamed' ) );
 $folder_stale = array_merge( $stale, array( 'request_id' => $prefix . 'folder-stale', 'revision' => $current['gallery']['revision'] ) );
 modula_settings_assert( 'conflict' === $ability->execute( $folder_stale )['status'], 'Relevant folder changes must invalidate the revision.' );
 $memberships->clear_for_object( $attachment );
 $map_key = \WPChill\Folders\Storage\Option_Provider_Map_Repository::OPTION_KEY;
 $original_maps = get_option( $map_key, null );
 $state['ability_site_options'][ $map_key ] = array( 'exists' => null !== $original_maps, 'value' => $original_maps );
 update_option( $key, $state, false );
 $current = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
 $maps = new \WPChill\Folders\Storage\Option_Provider_Map_Repository();
 $maps->save( $attachment, array( 'connection_id' => $prefix . 'connection', 'bucket' => 'owned-bucket', 'key' => 'owned-key', 'provider' => 's3' ) );
 $provider_stale = array_merge( $stale, array( 'request_id' => $prefix . 'provider-stale', 'revision' => $current['gallery']['revision'] ) );
 modula_settings_assert( 'conflict' === $ability->execute( $provider_stale )['status'], 'Provider mapping changes must invalidate the revision.' );
 $maps->delete( $attachment );
 if ( null === $original_maps ) { delete_option( $map_key ); } else { update_option( $map_key, $original_maps, false ); }
 $deny = static function ( $caps, $cap, $user, $args ) use ( $id ) { return 'edit_post' === $cap && isset( $args[0] ) && $id === (int) $args[0] ? array( 'do_not_allow' ) : $caps; };
 add_filter( 'map_meta_cap', $deny, 10, 4 );
 modula_settings_assert( 'forbidden' === $ability->execute( $input )['status'] && 'forbidden' === wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $input['request_id'] ) )['status'], 'Replay/recovery must recheck object access.' );
 remove_filter( 'map_meta_cap', $deny );
 $type = get_post_type_object( 'modula-gallery' );
 $deny_publish = static function ( $caps, $cap ) use ( $type ) { return $type->cap->publish_posts === $cap ? array( 'do_not_allow' ) : $caps; };
 add_filter( 'map_meta_cap', $deny_publish, 10, 2 );
 modula_settings_assert( 'forbidden' === $ability->execute( array_merge( $stale, array( 'request_id' => $prefix . 'publication', 'metadata' => array( 'status' => 'publish' ) ) ) )['status'], 'Requested publication follows Roles CPT capabilities.' );
 remove_filter( 'map_meta_cap', $deny_publish );
 $classic = array_merge( $input, array( 'request_id' => $prefix . 'classic', 'id' => $catalog['galleries']['classic']['id'] ) );
 modula_settings_assert( 'unsupported_target' === $ability->execute( $classic )['code'], 'Classic writes must be refused.' );
 // Dormant/unknown values must survive, even though output excludes them.
 $stored = json_decode( get_post_meta( $id, 'modula_settings_v2', true ), true );
 $stored['unregisteredExtension'] = array( 'hidden' => 'preserve-me' );
 $stored['layout']['futureKey'] = 'preserve-me-too';
 $flat_before = get_post_meta( $id, 'modula-settings', true );
 $flat_before['unknownExtensionFlag'] = 'flat-only-preserved';
 update_post_meta( $id, 'modula-settings', $flat_before );
 update_post_meta( $id, 'modula_settings_v2', wp_slash( wp_json_encode( $stored ) ) );
 $fresh = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
 $preserve = array_merge( $input, array( 'request_id' => $prefix . 'preserve', 'revision' => $fresh['gallery']['revision'], 'settings' => array( 'layout' => array( 'gutter' => 24 ) ) ) );
 $saved = $ability->execute( $preserve );
 $raw_after = json_decode( get_post_meta( $id, 'modula_settings_v2', true ), true );
 $expected = $stored; $expected['layout']['gutter'] = 24;
 modula_settings_assert( 'succeeded' === $saved['status'] && $expected === $raw_after, 'Unrequested stored configuration must survive exactly.' );
 modula_settings_assert( 'flat-only-preserved' === get_post_meta( $id, 'modula-settings', true )['unknownExtensionFlag'], 'Flat-only extension settings must survive.' );
 $pro_read = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
 $pro_input = array_merge( $input, array( 'request_id' => $prefix . 'pro', 'revision' => $pro_read['gallery']['revision'], 'settings' => array( 'general' => array( 'type' => 'parallax-masonry' ) ) ) );
 $pro = $ability->execute( $pro_input );
 modula_settings_assert( ( 'pro' === $mode ? 'succeeded' : 'rejected' ) === $pro['status'], 'Value-specific Pro availability must be enforced.' );
 if ( 'pro' === $mode ) {
  $fresh = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
  $original_active = get_option( 'modula_pro_active_extensions', array() );
  $deny_slider = static function ( $value ) use ( $original_active ) { return array_diff( $original_active, array( 'modula-slider' ) ); };
  add_filter( 'pre_option_modula_pro_active_extensions', $deny_slider );
  $blocked = $ability->execute( array_merge( $input, array( 'request_id' => $prefix . 'disabled-extension', 'revision' => $fresh['gallery']['revision'], 'settings' => array( 'general' => array( 'type' => 'slider' ), 'layout' => array( 'gutter' => 99 ) ) ) ) );
  remove_filter( 'pre_option_modula_pro_active_extensions', $deny_slider );
  modula_settings_assert( 'rejected' === $blocked['status'] && 24 === \Modula\V2\Meta_Sync::get_settings_v2( $id, false )['layout']['gutter'], 'Disabled extension must reject the complete target.' );
  $fresh = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
  $filter_rows = \Modula\V2\Meta_Sync::get_images_v2( $id );
  $cleared = $ability->execute( array_merge( $input, array( 'request_id' => $prefix . 'clear-filters', 'revision' => $fresh['gallery']['revision'], 'settings' => array( 'filters' => array( 'filters' => array() ) ) ) ) );
  modula_settings_assert( 'succeeded' === $cleared['status'] && array() === \Modula\V2\Meta_Sync::get_settings_v2( $id )['filters']['filters'] && $filter_rows === \Modula\V2\Meta_Sync::get_images_v2( $id ), 'Explicit filter clear survives editor read without composition changes.' );
  $mismatched_flat = get_post_meta( $id, 'modula-settings', true );
  $mismatched_flat['filters'] = array( 'Portrait' );
  \Modula\V2\Meta_Sync::with_canonical_gallery_write( $id, static function () use ( $id, $mismatched_flat ) { update_post_meta( $id, 'modula-settings', $mismatched_flat ); } );
  $fresh = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
  $clear_again = $ability->execute( array_merge( $input, array( 'request_id' => $prefix . 'clear-flat-mismatch', 'revision' => $fresh['gallery']['revision'], 'settings' => array( 'filters' => array( 'filters' => array() ) ) ) ) );
  modula_settings_assert( 'succeeded' === $clear_again['status'] && array() === get_post_meta( $id, 'modula-settings', true )['filters'] && array() === \Modula\V2\Meta_Sync::get_settings_v2( $id )['filters']['filters'], 'Explicit unchanged grouped values must replace their stale flat counterpart.' );
 } else {
  $fresh = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
  $blocked = $ability->execute( array_merge( $input, array( 'request_id' => $prefix . 'lite-filters', 'revision' => $fresh['gallery']['revision'], 'settings' => array( 'filters' => array( 'filters' => array( 'Forbidden' ) ), 'layout' => array( 'gutter' => 99 ) ) ) ) );
  modula_settings_assert( 'rejected' === $blocked['status'], 'Lite filter upsell is not an editable field.' );
 }
 // A metadata hook that changes publication cannot produce a succeeded outcome.
 $fresh = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
 $rewrite = static function ( $data, $postarr ) use ( $id ) { if ( (int) ( $postarr['ID'] ?? 0 ) === $id ) { $data['post_title'] = 'Test hook replaced requested title'; } return $data; };
 add_filter( 'wp_insert_post_data', $rewrite, 10, 2 );
 $rewritten = $ability->execute( array_merge( $input, array( 'request_id' => $prefix . 'metadata-hook', 'revision' => $fresh['gallery']['revision'], 'metadata' => array( 'title' => 'Requested title' ), 'settings' => array( 'layout' => array( 'gutter' => 71 ) ) ) ) );
 remove_filter( 'wp_insert_post_data', $rewrite );
 modula_settings_assert( 'uncertain' === $rewritten['status'] && 'modula/update-gallery' === $rewritten['operation'] && 24 === \Modula\V2\Meta_Sync::get_settings_v2( $id, false )['layout']['gutter'], 'Unconfirmed metadata must roll back local settings and retain correct operation.' );
 $fresh = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
 $commit_hook = static function ( $data, $postarr ) use ( $id ) { if ( (int) ( $postarr['ID'] ?? 0 ) === $id ) { global $wpdb; $wpdb->query( 'COMMIT' ); } return $data; };
 add_filter( 'wp_insert_post_data', $commit_hook, 10, 2 );
 $interrupted = $ability->execute( array_merge( $input, array( 'request_id' => $prefix . 'transaction-hook', 'revision' => $fresh['gallery']['revision'], 'metadata' => array( 'title' => 'Interrupted title' ), 'settings' => array( 'layout' => array( 'gutter' => 72 ) ) ) ) );
 remove_filter( 'wp_insert_post_data', $commit_hook );
 modula_settings_assert( 'uncertain' === $interrupted['status'] && 24 === \Modula\V2\Meta_Sync::get_settings_v2( $id, false )['layout']['gutter'], 'A hook cannot commit partial settings outside the protected boundary.' );
 // Sparse grouped storage and an existing password must survive unrelated patches.
 $sparse_id = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'draft', 'post_title' => $prefix . 'sparse', 'post_author' => $users[0], 'meta_input' => array( '_modula_beta' => 1 ) ) );
 global $wpdb;
 $wpdb->update( $wpdb->posts, array( 'post_password' => 'owned-preserved-password' ), array( 'ID' => $sparse_id ) );
 update_post_meta( $sparse_id, 'modula-settings', array( 'unknownExtensionFlag' => 'sparse-flat', 'password' => 'owned-preserved-password', 'enable_password' => 1 ) );
 update_post_meta( $sparse_id, 'modula_settings_v2', wp_slash( wp_json_encode( array( 'layout' => array( 'gutter' => 10 ) ) ) ) );
 clean_post_cache( $sparse_id );
 $sparse_read = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $sparse_id ) );
 $sparse_saved = $ability->execute( array( 'request_id' => $prefix . 'sparse-patch', 'id' => $sparse_id, 'revision' => $sparse_read['gallery']['revision'], 'metadata' => array( 'title' => 'Sparse preserved' ), 'settings' => array( 'layout' => array( 'gutter' => 25 ) ) ) );
 modula_settings_assert( 'succeeded' === $sparse_saved['status'] && 'owned-preserved-password' === get_post( $sparse_id )->post_password && 'sparse-flat' === get_post_meta( $sparse_id, 'modula-settings', true )['unknownExtensionFlag'], 'Sparse storage must preserve password and flat extension values.' );
 update_post_meta( $sparse_id, '_modula_bind_target_type', 'folder' );
 $bound_read = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $sparse_id ) );
 $bound_rejected = $ability->execute( array( 'request_id' => $prefix . 'bound-refused', 'id' => $sparse_id, 'revision' => $bound_read['gallery']['revision'], 'metadata' => array( 'title' => 'Bound changed' ) ) );
 modula_settings_assert( 'unsupported_bound_target' === $bound_rejected['code'] && 'Sparse preserved' === get_post( $sparse_id )->post_title, 'Bound targets are deferred without source or metadata side effects.' );
 $another = wp_insert_user( array( 'user_login' => $prefix . 'other', 'user_pass' => wp_generate_password( 32, true, true ), 'user_email' => $prefix . 'other@example.invalid', 'role' => 'administrator', 'meta_input' => array( $marker => $run ) ) );
 modula_settings_assert( ! is_wp_error( $another ), 'Owned second actor must exist.' );
 wp_set_current_user( $another );
 $isolated = wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $input['request_id'] ) );
 wp_set_current_user( $users[0] );
 modula_settings_assert( 'not_found' === $isolated['status'], 'An authorized different actor cannot recover the protected result.' );
 // Restore Masonry for the shared appearance/concurrency browser journeys.
 if ( 'pro' === $mode ) {
  $pro_read = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
  $restored = $ability->execute( array_merge( $input, array( 'request_id' => $prefix . 'restore', 'revision' => $pro_read['gallery']['revision'], 'settings' => array( 'general' => array( 'type' => 'grid' ) ) ) ) );
  modula_settings_assert( 'succeeded' === $restored['status'], 'Restore fixture layout through public ability.' );
 }
}
if ( 'abilities-settings-native-only' === $action ) { modula_settings_assert( ! class_exists( '\WP\MCP\Core\McpAdapter' ), 'MCP must be absent.' ); }
remove_filter( 'pre_wp_mail', $mail_observer );
remove_filter( 'pre_http_request', $http_observer );
modula_settings_assert( array( 'email' => 0, 'http' => 0 ) === $effects, 'Settings mutations must not invoke email or providers.' );
$after = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
modula_e2e_output( array( 'shared_baseline' => $shared_baseline, 'input' => $input, 'outcome' => $out, 'read' => $after, 'hidden_effects' => $effects, 'adapter_loaded' => class_exists( '\WP\MCP\Core\McpAdapter' ) ) );
