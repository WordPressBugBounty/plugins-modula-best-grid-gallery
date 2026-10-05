<?php
/** Public native site administration/intake contracts on owned Local fixtures. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || $state['run'] !== getenv( 'MODULA_E2E_RUN' ) ) { exit( 1 ); }
$actor = get_user_by( 'login', $run );
wp_set_current_user( $actor->ID );
function modula_admin_assert( $ok, $message ) { if ( ! $ok ) { WP_CLI::error( $message ); } }
function modula_admin_call( $name, $input = array() ) {
 $ability = wp_get_ability( 'modula/' . $name );
 modula_admin_assert( null !== $ability, 'Native ability exists: ' . $name );
 return $ability->execute( $input );
}
$prefix = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '-admin-' . ( 'abilities-administration-native-only' === $action ? 'native' : 'adapter' );
// Save original options before any fixture or HTTP mutation, including crash cleanup.
foreach ( array( 'modula_watermark', 'modula_image_licensing_option', 'modula_pro_active_extensions', 'modula_pro_current_plan', 'modula_pro_license_data' ) as $option ) {
 if ( ! isset( $state['ability_site_options'][ $option ] ) ) {
  $value = get_option( $option, null );
  $state['ability_site_options'][ $option ] = array( 'exists' => null !== $value, 'value' => $value );
 }
}
update_option( $key, $state, false );
update_option( 'modula_image_licensing_option', array( 'image_licensing_author' => 'Original', 'image_licensing_company' => 'Preserve company', 'private_integration_token' => 'fixture-secret' ) );
update_option( 'modula_watermark', array( 'watermark_enable_backup' => 1, 'watermark_margin' => '10', 'watermark_image' => '0' ) );
$network = 0;
$deny_network = static function () use ( &$network ) { ++$network; return new WP_Error( 'unexpected_network', 'Read must not refresh providers.' ); };
add_filter( 'pre_http_request', $deny_network );
$read = modula_admin_call( 'read-site-settings' );
remove_filter( 'pre_http_request', $deny_network );
modula_admin_assert( ! is_wp_error( $read ), is_wp_error( $read ) ? $read->get_error_message() : 'read' );
modula_admin_assert( 0 === $network && false === strpos( wp_json_encode( $read ), 'fixture-secret' ), 'Pure reads never refresh or expose unknown secret fields.' );
modula_admin_assert( true === $read['settings']['modula_watermark']['watermark_enable_backup'] && 10 === $read['settings']['modula_watermark']['watermark_margin'], 'Legacy numeric and boolean representations remain visible without repair.' );
modula_admin_assert( '10' === get_option( 'modula_watermark' )['watermark_margin'], 'Read normalization does not write.' );
$input = array( 'request_id' => $prefix . '-patch', 'revision' => $read['revision'], 'settings' => array( 'modula_image_licensing_option' => array( 'image_licensing_author' => 'Native author' ) ) );
$patch = modula_admin_call( 'update-site-settings', $input );
modula_admin_assert( 'succeeded' === ( $patch['status'] ?? '' ), 'Global patch succeeds: ' . wp_json_encode( $patch ) );
modula_admin_assert( $patch === modula_admin_call( 'update-site-settings', $input ), 'Global patch replay is exact.' );
$saved = get_option( 'modula_image_licensing_option' );
modula_admin_assert( 'Native author' === $saved['image_licensing_author'] && 'Preserve company' === $saved['image_licensing_company'] && 'fixture-secret' === $saved['private_integration_token'], 'Sparse patch preserves omitted and secret configuration.' );
$stale = $input; $stale['request_id'] .= '-stale';
modula_admin_assert( 'conflict' === modula_admin_call( 'update-site-settings', $stale )['status'], 'Stale global revision cannot overwrite.' );
$invalid = $input; $invalid['request_id'] .= '-secret'; $invalid['settings']['modula_pro_license_key'] = 'not-accepted';
modula_admin_assert( 'rejected' === modula_admin_call( 'update-site-settings', $invalid )['status'], 'Credentials rejected before admission.' );
modula_admin_assert( null === \Modula\V2\Abilities\Requests::record( $invalid['request_id'] ), 'Invalid secrets never enter request records.' );
$deny = static function ( $caps ) { $caps['manage_options'] = false; return $caps; };
add_filter( 'user_has_cap', $deny );
modula_admin_assert( current_user_can( 'edit_posts' ), 'Denied actor can still edit galleries.' );
modula_admin_assert( is_wp_error( modula_admin_call( 'read-site-settings' ) ), 'Gallery editing does not authorize global reads.' );
modula_admin_assert( 'forbidden' === modula_admin_call( 'recover-request', array( 'request_id' => $input['request_id'] ) )['status'], 'Recovery rechecks global access.' );
remove_filter( 'user_has_cap', $deny );
if ( 'pro' === getenv( 'MODULA_E2E_MODE' ) ) {
 $extensions = \Modula_Pro\Extensions\Extensions::get_instance();
 $active = get_option( 'modula_pro_active_extensions' );
 update_option( 'modula_pro_active_extensions', array_values( array_diff( (array) $active, array( 'modula-standalone' ) ) ) );
 $unavailable = array( 'request_id' => $prefix . '-standalone-disabled', 'revision' => modula_admin_call( 'read-site-settings' )['revision'], 'settings' => array( 'modula_standalone' => array( 'gallery' => array( 'enable_rewrite' => 'enabled' ) ) ) );
 modula_admin_assert( 'rejected' === modula_admin_call( 'update-site-settings', $unavailable )['status'], 'Disabled Standalone cannot be configured through abilities.' );
 $plan = get_option( 'modula_pro_current_plan' );
 update_option( 'modula_pro_current_plan', 'starter' );
 update_option( 'modula_pro_active_extensions', array( 'modula-standalone' ) );
 $unavailable['request_id'] .= '-entitlement'; $unavailable['revision'] = modula_admin_call( 'read-site-settings' )['revision'];
 modula_admin_assert( 'rejected' === modula_admin_call( 'update-site-settings', $unavailable )['status'], 'Standalone needs entitlement even when marked enabled.' );
 update_option( 'modula_pro_current_plan', $plan ); update_option( 'modula_pro_active_extensions', $active );
 $slug = 'modula-albums';
 $before = $extensions->get_read_only_extension_status()[ $slug ];
 $switch = array( 'request_id' => $prefix . '-disable', 'revision' => modula_admin_call( 'read-site-settings' )['revision'], 'extension' => $slug, 'enabled' => false );
 $disabled = modula_admin_call( 'set-extension', $switch );
 modula_admin_assert( 'succeeded' === $disabled['status'], 'Explicit deactivation succeeds: ' . wp_json_encode( $disabled ) );
 modula_admin_assert( ! \Modula\V2\Abilities\Albums::available(), 'Next native execution sees disabled Albums.' );
 modula_admin_assert( $disabled === modula_admin_call( 'set-extension', $switch ), 'Replay never repeats activation hooks.' );
 $switch['request_id'] .= '-restore'; $switch['revision'] = modula_admin_call( 'read-site-settings' )['revision']; $switch['enabled'] = $before['enabled'];
 modula_admin_assert( 'succeeded' === modula_admin_call( 'set-extension', $switch )['status'], 'Restore prior extension state.' );
}
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$bytes = base64_encode( file_get_contents( get_attached_file( $catalog['attachments'][0]['id'] ) ) );
$upload = array( 'request_id' => $prefix . '-upload', 'filename' => $prefix . '.jpg', 'content_base64' => $bytes );
$uploaded = modula_admin_call( 'upload-image', $upload );
modula_admin_assert( 'succeeded' === ( $uploaded['status'] ?? '' ), 'WordPress upload imports a new attachment.' );

modula_admin_assert( $uploaded === modula_admin_call( 'upload-image', $upload ), 'Upload replay retains the attachment identity.' );
$record = \Modula\V2\Abilities\Requests::record( $upload['request_id'] );
modula_admin_assert( false === strpos( wp_json_encode( $record ), substr( $bytes, 0, 100 ) ), 'Media bytes never enter the journal.' );
$changed = $upload; $changed['filename'] = 'different.jpg';
modula_admin_assert( 'request_payload_mismatch' === modula_admin_call( 'upload-image', $changed )['code'], 'Different upload payload cannot reuse the identity.' );
$invalid = $upload; $invalid['request_id'] .= '-invalid'; $invalid['content_base64'] = base64_encode( '<?php unsafe();' );
modula_admin_assert( 'rejected' === modula_admin_call( 'upload-image', $invalid )['status'], 'Spoofed image MIME is rejected.' );
$deny_upload = static function ( $caps ) { $caps['upload_files'] = false; return $caps; };
add_filter( 'user_has_cap', $deny_upload );
modula_admin_assert( is_wp_error( modula_admin_call( 'upload-image', $upload ) ), 'Upload permission is independently enforced.' );
modula_admin_assert( 'forbidden' === modula_admin_call( 'recover-request', array( 'request_id' => $upload['request_id'] ) )['status'], 'Intake recovery rechecks upload access.' );
remove_filter( 'user_has_cap', $deny_upload );
$gallery = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'publish', 'post_title' => $prefix . ' intake', 'meta_input' => array( '_modula_beta' => '1' ) ) );
\Modula\V2\Meta_Sync::apply_new_beta_gallery_create_defaults( $gallery );
\Modula\V2\Meta_Sync::persist_merged_gallery_items( $gallery, array( array( 'id' => $uploaded['intake']['attachment_ids'][0] ) ), false );
$gallery_read = static function () use ( $gallery ) { return modula_admin_call( 'read-gallery', array( 'id' => $gallery ) ); };
$archive_path = wp_tempnam( $prefix . '.zip' );
function modula_admin_zip( $path, $entries ) {
 $zip = new ZipArchive(); $zip->open( $path, ZipArchive::CREATE | ZipArchive::OVERWRITE );
 foreach ( $entries as $name => $bytes ) { $zip->addFromString( $name, $bytes ); }
 $zip->close(); return base64_encode( file_get_contents( $path ) );
}
try {
 $archive = array( 'request_id' => $prefix . '-zip', 'filename' => $prefix . '.zip', 'content_base64' => modula_admin_zip( $archive_path, array( 'one.jpg' => base64_decode( $bytes ), 'nested/two.jpg' => base64_decode( $bytes ) ) ), 'id' => $gallery, 'revision' => $gallery_read()['gallery']['revision'] );
 $zip_result = modula_admin_call( 'import-zip', $archive );
 modula_admin_assert( 'succeeded' === $zip_result['status'] && 2 === count( $zip_result['intake']['attachment_ids'] ), 'ZIP imports and appends two real images: ' . wp_json_encode( $zip_result ) );
 modula_admin_assert( $zip_result === modula_admin_call( 'import-zip', $archive ) && 3 === $gallery_read()['total'], 'Archive replay duplicates neither attachments nor gallery items.' );
 foreach ( array( 'traversal' => array( '../escape.jpg' => base64_decode( $bytes ) ), 'non-image' => array( 'good.jpg' => base64_decode( $bytes ), 'bad.php' => '<?php' ), 'bomb' => array( 'large.jpg' => str_repeat( 'a', 1000000 ) ) ) as $case => $entries ) {
  $bad = $archive; unset( $bad['id'], $bad['revision'] ); $bad['request_id'] .= '-' . $case; $bad['content_base64'] = modula_admin_zip( $archive_path, $entries );
  modula_admin_assert( 'rejected' === modula_admin_call( 'import-zip', $bad )['status'], 'Invalid ZIP rejected before media writes: ' . $case );
  modula_admin_assert( null === \Modula\V2\Abilities\Requests::record( $bad['request_id'] ), 'Invalid archive never admitted.' );
 }
 // Produce a real gallery conflict after import, before composition, without substituting either save.
 $partial = $upload; $partial['request_id'] .= '-partial'; $partial['id'] = $gallery; $partial['revision'] = $gallery_read()['gallery']['revision'];
 $edit_during_import = static function () use ( $gallery ) { wp_update_post( array( 'ID' => $gallery, 'post_title' => 'Human changed during import' ) ); };
 add_action( 'add_attachment', $edit_during_import, 20 );
 $retained = modula_admin_call( 'upload-image', $partial );
 remove_action( 'add_attachment', $edit_during_import, 20 );
 modula_admin_assert( 'partial' === $retained['status'] && 'composition' === $retained['intake']['phase'] && 'conflict' === $retained['intake']['composition_status'], 'Later gallery conflict retains the successful upload.' );
 modula_admin_assert( $retained === modula_admin_call( 'recover-request', array( 'request_id' => $partial['request_id'] ) ) && $retained === modula_admin_call( 'upload-image', $partial ), 'Partial recovery and replay preserve IDs and failed phase.' );
 modula_admin_assert( 3 === $gallery_read()['total'], 'Conflict never overwrites gallery composition.' );
 // WordPress can move bytes before attachment insertion fails. The request owns that orphan.
 $moved_file = '';
 $observe_upload = static function ( $data, $context ) use ( &$moved_file ) { if ( 'sideload' === $context ) { $moved_file = $data['file'] ?? ''; } return $data; };
 $reject_insert = static function ( $empty, $post ) { return 'attachment' === ( $post['post_type'] ?? '' ) ? true : $empty; };
 add_filter( 'wp_handle_upload', $observe_upload, 20, 2 ); add_filter( 'wp_insert_post_empty_content', $reject_insert, 10, 2 );
 $failed_insert = $upload; $failed_insert['request_id'] .= '-insert-failure';
 $insertion = modula_admin_call( 'upload-image', $failed_insert );
 remove_filter( 'wp_handle_upload', $observe_upload, 20 ); remove_filter( 'wp_insert_post_empty_content', $reject_insert, 10 );
 $orphan_remains = $moved_file && file_exists( $moved_file );
 if ( $orphan_remains ) { wp_delete_file( $moved_file ); } // Own test bytes only, including the red phase.
 modula_admin_assert( 'rejected' === $insertion['status'] && $moved_file && ! $orphan_remains, 'Failed insertion removes only its newly uploaded orphan file.' );
 // A row can exist before add_attachment fires: preserve bytes on an uncertain early hook.
 $early_id = 0; $early_file = '';
 $early_failure = static function ( $file, $id ) use ( &$early_id, &$early_file ) { $early_id = $id; $early_file = $file; throw new RuntimeException( 'Controlled post-insert file metadata failure.' ); };
 add_filter( 'update_attached_file', $early_failure, 10, 2 );
 $early_input = $upload; $early_input['request_id'] .= '-early';
 $early = modula_admin_call( 'upload-image', $early_input );
 remove_filter( 'update_attached_file', $early_failure, 10 );
 if ( $early_id ) { update_post_meta( $early_id, $marker, $run ); update_attached_file( $early_id, $early_file ); }
 modula_admin_assert( 'uncertain' === $early['status'] && $early_id && get_post( $early_id ) && is_file( $early_file ), 'A post-insert hook failure must not delete the attachment bytes.' );
 modula_admin_assert( 'retained_file' === $early['intake']['objects'][0]['code'] && wp_basename( $early_file ) === $early['intake']['objects'][0]['filename'], 'Early uncertain outcomes retain a safe artifact name.' );
 modula_admin_assert( $early === modula_admin_call( 'recover-request', array( 'request_id' => $early_input['request_id'] ) ), 'Early uncertain artifacts survive recovery.' );
 // Fatal-boundary equivalent: interrupt metadata after attachment insertion, then recover identity.
 $interrupted = $upload; $interrupted['request_id'] .= '-interrupted';
 $failure = static function () { throw new RuntimeException( 'Controlled metadata failure.' ); };
 add_filter( 'wp_generate_attachment_metadata', $failure );
 $uncertain = modula_admin_call( 'upload-image', $interrupted );
 remove_filter( 'wp_generate_attachment_metadata', $failure );
 modula_admin_assert( 'uncertain' === $uncertain['status'] && 1 === count( $uncertain['intake']['attachment_ids'] ), 'Metadata interruption retains the inserted attachment identity.' );
 modula_admin_assert( $uncertain === modula_admin_call( 'recover-request', array( 'request_id' => $interrupted['request_id'] ) ), 'Interrupted intake recovery returns retained IDs.' );
 // Share only test fixture bytes with the browser test, never put bytes in request outcomes.
 file_put_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/' . getenv( 'MODULA_E2E_MODE' ) . '/intake-image.txt', $bytes );
 file_put_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/' . getenv( 'MODULA_E2E_MODE' ) . '/intake-zip.txt', $archive['content_base64'] );
} finally { wp_delete_file( $archive_path ); }
$page = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $prefix . ' intake page', 'post_content' => '[modula id="' . $gallery . '"]' ) );
modula_e2e_output( array( 'adapter_loaded' => class_exists( '\WP\MCP\Core\McpAdapter' ), 'settings' => $patch, 'gallery' => $gallery_read()['gallery'], 'page' => get_permalink( $page ), 'upload' => $uploaded, 'zip' => $zip_result, 'partial' => $retained, 'uncertain' => $uncertain, 'native_checks' => array( 'read without network', 'closed projection', 'sparse update', 'replay', 'stale revision', 'secret refusal', 'permission and recovery checks', 'extension state', 'WordPress upload', 'nested ZIP', 'invalid archives', 'composition conflict', 'metadata interruption' ) ) );
