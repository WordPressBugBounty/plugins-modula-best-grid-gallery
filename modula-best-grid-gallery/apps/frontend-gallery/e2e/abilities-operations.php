<?php
/** Server intake and Diagnostics through the approved native ability boundary. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || $state['run'] !== $run ) { exit( 1 ); }
wp_set_current_user( get_user_by( 'login', $run )->ID );
function modula_ops_assert( $ok, $message ) { if ( ! $ok ) { throw new RuntimeException( $message ); } }
function modula_ops_call( $name, $input = array() ) {
 $abilities = wp_get_abilities();
 modula_ops_assert( isset( $abilities['modula/' . $name] ), 'Missing ability: ' . $name );
 return $abilities['modula/' . $name]->execute( $input );
}
try {
$prefix = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '-ops-' . ( 'abilities-operations-native-only' === $action ? 'native' : 'adapter' );
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$original = get_attached_file( $catalog['attachments'][0]['id'] );
$uploads = wp_upload_dir(); $root = $uploads['basedir'] . '/' . $run;
if ( 'abilities-operations-http-prepare' === $action ) {
 $source = $root . '/' . $prefix . '-http.jpg'; copy( $original, $source );
 $value = get_option( 'modula_debug_log', null );
 if ( ! isset( $state['ability_site_options']['modula_debug_log'] ) ) { $state['ability_site_options']['modula_debug_log'] = array( 'exists' => null !== $value, 'value' => $value ); update_option( $key, $state, false ); }
 modula_e2e_output( array( 'path' => basename( $source ) ) ); return;
}
if ( 'abilities-operations-http-inspect' === $action ) {
 $debug_root = $root . '/operations-debug';
 add_filter( 'upload_dir', static function ( $data ) use ( $debug_root ) { $data['basedir'] = $debug_root; $data['error'] = false; return $data; } );
 $log = \Modula_Debug_Log::get_instance(); $before = $log->get_status();
 $log->write( 'error', 'settings.rest', 'token=HTTP-secret path=/private/test', array( 'token' => 'HTTP-secret' ) );
 modula_e2e_output( array( 'status' => $before, 'after' => $log->get_status() ) ); return;
}
$root_filter = static function () use ( $root ) { return $root; };
add_filter( 'modula_gallery_upload_default_dir', $root_filter );
$owned = array();
try {
 $browse = modula_ops_call( 'browse-server-folder', array( 'per_page' => 100 ) );
 modula_ops_assert( ! is_wp_error( $browse ) && $browse['total'] > 0, 'Authorized root browsable.' );
 modula_ops_assert( false === strpos( wp_json_encode( $browse ), $uploads['basedir'] ), 'Browse never discloses absolute paths.' );
 foreach ( array( '../', '/etc', 'one/../../', 'one\\two' ) as $path ) { modula_ops_assert( is_wp_error( modula_ops_call( 'browse-server-folder', array( 'path' => $path ) ) ), 'Traversal/absolute path refused.' ); }
 $link = $root . '/' . $prefix . '-link'; $owned[] = $link; symlink( dirname( $root ), $link );
 modula_ops_assert( is_wp_error( modula_ops_call( 'browse-server-folder', array( 'path' => basename( $link ) ) ) ), 'Symlink escape refused.' );
 $source = $root . '/' . $prefix . '.jpg'; $owned[] = $source; copy( $original, $source );
 $input = array( 'request_id' => $prefix . '-keep', 'root' => $browse['root'], 'paths' => array( basename( $source ) ), 'delete_after_import' => false );
 $import = modula_ops_call( 'import-server-files', $input );
 modula_ops_assert( 'succeeded' === ( $import['status'] ?? '' ), 'Server image imports: ' . wp_json_encode( $import ) );
 $id = $import['intake']['attachment_ids'][0];
 modula_ops_assert( is_file( get_attached_file( $id ) ) && is_file( $source ) && 'retained' === $import['intake']['objects'][0]['source_status'], 'Imported bytes and explicitly retained source exist.' );
 modula_ops_assert( $import === modula_ops_call( 'import-server-files', $input ), 'Import replay preserves identity.' );
 $mapped = $input; $mapped['request_id'] .= '-mapped'; $mapped['paths'] = array( substr( $original, strlen( $root ) + 1 ) ); $mapped['delete_after_import'] = true;
 $mapped_refusal = modula_ops_call( 'import-server-files', $mapped );
 modula_ops_assert( 'registered_source_preserved' === $mapped_refusal['code'] && is_file( $original ), 'Registered original remains intact even when actor can delete its attachment.' );
 $mapped['request_id'] .= '-copy'; $mapped['delete_after_import'] = false;
 modula_ops_assert( 'succeeded' === modula_ops_call( 'import-server-files', $mapped )['status'] && is_file( $original ), 'Authorized mapped source can still be copied.' );
 $deny_source = static function ( $caps, $cap, $user, $args ) use ( $catalog ) { return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $catalog['attachments'][0]['id'] ? array( 'do_not_allow' ) : $caps; };
 add_filter( 'map_meta_cap', $deny_source, 10, 4 );
 $mapped['request_id'] .= '-denied';
 modula_ops_assert( 'source_permission_denied' === modula_ops_call( 'import-server-files', $mapped )['code'], 'Attachment-mapped source copy needs current edit permission.' );
 remove_filter( 'map_meta_cap', $deny_source, 10 );
 $bad = $input; $bad['request_id'] .= '-bad'; $bad['paths'][] = '../outside.jpg';
 modula_ops_assert( 'rejected' === modula_ops_call( 'import-server-files', $bad )['status'] && is_file( $source ), 'Whole selection validated before effects.' );
 $bad = $input; $bad['request_id'] .= '-missing-delete'; unset( $bad['delete_after_import'] );
 modula_ops_assert( 'rejected' === modula_ops_call( 'import-server-files', $bad )['status'], 'Deletion choice must be explicit.' );
 $gallery = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'draft', 'post_title' => $prefix, 'meta_input' => array( '_modula_beta' => '1' ) ) );
 \Modula\V2\Meta_Sync::apply_new_beta_gallery_create_defaults( $gallery );
 $delete = $input; $delete['request_id'] .= '-delete'; $delete['delete_after_import'] = true; $delete['id'] = $gallery; $delete['revision'] = modula_ops_call( 'read-gallery', array( 'id' => $gallery ) )['gallery']['revision'];
 $removed = modula_ops_call( 'import-server-files', $delete );
 modula_ops_assert( 'succeeded' === $removed['status'] && ! file_exists( $source ) && 'deleted' === $removed['intake']['objects'][0]['source_status'], 'Explicit deletion confirmed after import.' );
 modula_ops_assert( 1 === modula_ops_call( 'read-gallery', array( 'id' => $gallery ) )['total'], 'Existing composition contract receives imported attachment.' );
 copy( $original, $source );
 modula_ops_assert( $removed === modula_ops_call( 'import-server-files', $delete ) && is_file( $source ), 'Replay cannot remove a newly recreated source.' );
 // A failed source removal leaves the imported attachment recoverable, without retrying deletion.
 $block_delete = static function ( $file ) use ( $source ) { return $file === $source ? '' : $file; };
 add_filter( 'wp_delete_file', $block_delete );
 $partial = $input; $partial['request_id'] .= '-partial'; $partial['delete_after_import'] = true;
 $retained = modula_ops_call( 'import-server-files', $partial );
 remove_filter( 'wp_delete_file', $block_delete );
 modula_ops_assert( 'partial' === $retained['status'] && 'delete_failed' === $retained['intake']['objects'][0]['source_status'] && is_file( $source ), 'Deletion failure reports retained source and attachment.' );
 modula_ops_assert( $retained === modula_ops_call( 'recover-request', array( 'request_id' => $partial['request_id'] ) ) && $retained === modula_ops_call( 'import-server-files', $partial ), 'Recovery and replay never repeat failed deletion.' );
 // A metadata interruption leaves the original source and identifies every pending file.
 $second = $root . '/' . $prefix . '-second.jpg'; $owned[] = $second; copy( $original, $second );
 $interrupt = static function () { throw new RuntimeException( 'Controlled metadata interruption with private-token' ); };
 add_filter( 'wp_generate_attachment_metadata', $interrupt );
 $uncertain_input = $input; $uncertain_input['request_id'] .= '-interrupted'; $uncertain_input['paths'][] = basename( $second ); $uncertain_input['delete_after_import'] = true;
 $uncertain = modula_ops_call( 'import-server-files', $uncertain_input );
 remove_filter( 'wp_generate_attachment_metadata', $interrupt );
 modula_ops_assert( 'uncertain' === $uncertain['status'] && 1 === count( $uncertain['intake']['attachment_ids'] ) && 'not_started' === $uncertain['intake']['objects'][1]['status'] && is_file( $source ) && is_file( $second ), 'Interrupted import retains source and pending identities.' );
 modula_ops_assert( false === strpos( wp_json_encode( $uncertain ), 'private-token' ), 'Errors never expose raw exceptions.' );
 $deny_upload = static function ( $caps ) { $caps['upload_files'] = false; return $caps; };
 add_filter( 'user_has_cap', $deny_upload );
 modula_ops_assert( is_wp_error( modula_ops_call( 'browse-server-folder' ) ) && 'forbidden' === modula_ops_call( 'recover-request', array( 'request_id' => $input['request_id'] ) )['status'], 'Browse and recovery recheck current permissions.' );
 remove_filter( 'user_has_cap', $deny_upload );
} finally {
 remove_filter( 'modula_gallery_upload_default_dir', $root_filter );
 foreach ( $owned as $path ) { if ( is_file( $path ) || is_link( $path ) ) { unlink( $path ); } }
}
// Diagnostics uses the real service with test-owned storage, never either user's log.
$log_option = get_option( 'modula_debug_log', null );
if ( ! isset( $state['ability_site_options']['modula_debug_log'] ) ) {
 $state['ability_site_options']['modula_debug_log'] = array( 'exists' => null !== $log_option, 'value' => $log_option );
 update_option( $key, $state, false );
}
$debug_root = $root . '/operations-debug';
$debug_uploads = static function ( $data ) use ( $debug_root ) { $data['basedir'] = $debug_root; $data['error'] = false; return $data; };
add_filter( 'upload_dir', $debug_uploads );
$log = \Modula_Debug_Log::get_instance();
try {
 $directory_before = is_dir( $debug_root );
 $initial = modula_ops_call( 'read-diagnostics' );
 modula_ops_assert( ! is_wp_error( $initial ) && $directory_before === is_dir( $debug_root ), 'Diagnostics reads never create storage.' );
 $enable = array( 'request_id' => $prefix . '-enable', 'revision' => $initial['revision'] );
 $enabled = modula_ops_call( 'enable-debug-log', $enable );
 modula_ops_assert( 'succeeded' === $enabled['status'] && $log->get_status()['active'], 'Existing admin service confirms collection enabled.' );
 $log->write( 'error', 'settings.rest', 'password=fixture-secret /private/customer', array( 'token' => 'fixture-token', 'post_id' => 123 ) );
 $log->write( 'error', 'gallery.persist', 'Authorization: Bearer private-token' );
 $raw_before = $log->get_download_payload()['body'];
 $entries = modula_ops_call( 'read-debug-log', array( 'per_page' => 1 ) );
 modula_ops_assert( 2 === $entries['total'] && 1 === count( $entries['entries'] ) && $entries['entries'][0]['redacted'], 'Bounded log projection is paginated.' );
 $second_page = modula_ops_call( 'read-debug-log', array( 'page' => 2, 'per_page' => 1, 'revision' => $entries['revision'] ) );
 modula_ops_assert( 'gallery.persist' === $second_page['entries'][0]['channel'], 'Pagination retains known diagnostic channel.' );
 modula_ops_assert( false === strpos( wp_json_encode( array( $entries, $second_page, $enabled ) ), 'private-token' ) && false === strpos( wp_json_encode( $entries ), 'fixture-secret' ) && $raw_before === $log->get_download_payload()['body'], 'Read redaction never returns or rewrites sensitive history.' );
 modula_ops_assert( $enabled === modula_ops_call( 'enable-debug-log', $enable ), 'Replay never extends the collection window.' );
 $stale = array( 'request_id' => $prefix . '-clear-stale', 'revision' => $enabled['diagnostics']['revision'] );
 modula_ops_assert( 'conflict' === modula_ops_call( 'clear-debug-log', $stale )['status'] && $raw_before === $log->get_download_payload()['body'], 'New log entry invalidates stale clear.' );
 $invalid = array( 'request_id' => $prefix . '-invalid', 'revision' => $entries['revision'], 'unknown' => true );
 modula_ops_assert( 'rejected' === modula_ops_call( 'clear-debug-log', $invalid )['status'] && $raw_before === $log->get_download_payload()['body'], 'Invalid input cannot clear log.' );
 $deny = static function ( $caps ) { $caps['manage_options'] = false; return $caps; };
 add_filter( 'user_has_cap', $deny );
 modula_ops_assert( current_user_can( 'edit_posts' ) && is_wp_error( modula_ops_call( 'read-diagnostics' ) ) && is_wp_error( modula_ops_call( 'read-debug-log' ) ), 'Gallery editor cannot access Diagnostics.' );
 modula_ops_assert( 'forbidden' === modula_ops_call( 'recover-request', array( 'request_id' => $enable['request_id'] ) )['status'], 'Diagnostics recovery checks current admin permission.' );
 remove_filter( 'user_has_cap', $deny );
 // Simulate an ability winning immediately after the ordinary Diagnostics Save service call.
 $race = static function ( $value ) use ( $prefix ) {
  $state_now = modula_ops_call( 'read-diagnostics' );
  $result = modula_ops_call( 'disable-debug-log', array( 'request_id' => $prefix . '-admin-race', 'revision' => $state_now['revision'] ) );
  modula_ops_assert( 'succeeded' === $result['status'], 'Interleaved ability disable succeeds.' );
  return $value;
 };
 add_filter( 'modula_settings_api_pre_update_modula_debug_log', $race, 20 );
 $admin_request = new WP_REST_Request( 'POST', '/modula-best-grid-gallery/v1/general-settings' );
 $admin_request->set_header( 'content-type', 'application/json' ); $admin_request->set_body( wp_json_encode( array( 'modula_debug_log' => array( 'enabled' => true ) ) ) );
 $admin_response = rest_do_request( $admin_request );
 remove_filter( 'modula_settings_api_pre_update_modula_debug_log', $race, 20 );
 modula_ops_assert( 200 === $admin_response->get_status() && ! $log->get_status()['enabled'], 'Ordinary admin save cannot repeat an obsolete service write after an ability wins.' );
 // Lock refusal remains a controlled admin error and never a PHP fatal.
 $lock_busy = static function ( $sql ) { return false !== strpos( $sql, 'SELECT GET_LOCK(' ) ? 'SELECT 0' : $sql; };
 add_filter( 'query', $lock_busy );
 $busy = \Modula_Debug_Log_Rest::handle_action( 'enable' );
 remove_filter( 'query', $lock_busy );
 modula_ops_assert( is_wp_error( $busy ) && ! $log->get_status()['enabled'], 'Busy admin command returns an explicit error without changing state.' );
 $disable = array( 'request_id' => $prefix . '-disable', 'revision' => modula_ops_call( 'read-diagnostics' )['revision'] );
 modula_ops_assert( 'succeeded' === modula_ops_call( 'disable-debug-log', $disable )['status'] && ! $log->get_status()['active'] && $raw_before === $log->get_download_payload()['body'], 'Disable preserves history in the existing admin service.' );
 $clear = array( 'request_id' => $prefix . '-clear', 'revision' => modula_ops_call( 'read-diagnostics' )['revision'] );
 $cleared = modula_ops_call( 'clear-debug-log', $clear );
 modula_ops_assert( 'succeeded' === $cleared['status'] && ! $log->get_status()['has_file'] && ! $log->get_status()['active'], 'Explicit clear removes only the owned log and preserves enablement.' );
 $log->enable(); $log->write( 'error', 'settings.rest', 'New event after clear' );
 modula_ops_assert( $cleared === modula_ops_call( 'clear-debug-log', $clear ) && $log->get_status()['has_file'], 'Clear replay cannot remove later entries.' );
 modula_ops_assert( $cleared === modula_ops_call( 'recover-request', array( 'request_id' => $clear['request_id'] ) ), 'Recovered command contains only safe status.' );
} finally {
 remove_filter( 'upload_dir', $debug_uploads );
 if ( null === $log_option ) { delete_option( 'modula_debug_log' ); } else { update_option( 'modula_debug_log', $log_option ); }
 foreach ( array( 'modula/debug/modula-debug.jsonl', 'modula/debug/index.php', 'modula/debug/.htaccess' ) as $name ) { if ( is_file( $debug_root . '/' . $name ) ) { unlink( $debug_root . '/' . $name ); } }
 foreach ( array( '/modula/debug', '/modula', '' ) as $suffix ) { if ( is_dir( $debug_root . $suffix ) ) { rmdir( $debug_root . $suffix ); } }
}
modula_e2e_output( array( 'adapter_loaded' => class_exists( '\WP\MCP\Core\McpAdapter' ), 'import' => $import, 'removed' => $removed, 'partial' => $retained, 'uncertain' => $uncertain ) );

} catch ( Throwable $error ) { WP_CLI::error( $error->getMessage() ); }
