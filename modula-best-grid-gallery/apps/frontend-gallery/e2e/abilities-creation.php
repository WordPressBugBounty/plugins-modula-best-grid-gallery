<?php
/** Native creation/recovery at the approved public seam, owned by the shared run. */
use Modula\V2\Abilities\Requests;
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || $state['run'] !== getenv( 'MODULA_E2E_RUN' ) ) {
	exit( 1 );
}
function modula_creation_assert( $condition, $message ) {
	if ( ! $condition ) {
		WP_CLI::error( $message );
	}
}
$users = get_users( array( 'meta_key' => $marker, 'meta_value' => $run, 'fields' => 'ID' ) );
$actor = (int) $users[0];
wp_set_current_user( $actor );
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
if ( 'abilities-creation-prepare' === $action ) {
	if ( 'pro' === getenv( 'MODULA_E2E_MODE' ) ) {
		$feature = \Modula_Pro\Extensions\Extensions::get_instance()->get_read_only_extension_status()['modula-standalone'];
		modula_creation_assert( $feature['available'] && $feature['enabled'], 'Local Standalone must actually be entitled/enabled for the positive URL journey.' );
		foreach ( array( 'modula_standalone', 'rewrite_rules' ) as $option ) {
			if ( ! isset( $state['ability_site_options'][ $option ] ) ) {
				$value = get_option( $option, null );
				$state['ability_site_options'][ $option ] = array( 'exists' => null !== $value, 'value' => $value );
			}
		}
		update_option( $key, $state, false );
		$settings = \Modula_Pro\Extensions\Standalone\Standalone_Rewrite::merge_settings( get_option( 'modula_standalone', array() ) );
		$settings['gallery']['enable_rewrite'] = 'enabled';
		update_option( 'modula_standalone', $settings );
	}
	modula_e2e_output( array( 'prepared' => true ) );
	return;
}
$creator = wp_get_ability( 'modula/create-gallery' );
$recovery = wp_get_ability( 'modula/recover-request' );
modula_creation_assert( $creator && $recovery, 'Beta creation and request recovery must be registered.' );
$prefix = $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '-';
$suffixes = array( 'draft', 'publish', 'mcp', 'concurrent', 'lost', 'output', 'interrupt', 'active', 'invalid', 'crash', 'http-output' );
update_option( 'modula_e2e_ability_requests_' . $run, array_unique( array_merge( get_option( 'modula_e2e_ability_requests_' . $run, array() ), array_map( static function ( $suffix ) use ( $prefix ) { return $prefix . $suffix; }, $suffixes ) ) ), false );
$input = array( 'request_id' => $prefix . 'draft', 'title' => $prefix . 'draft', 'status' => 'draft', 'attachment_ids' => array_column( array_slice( $catalog['attachments'], 0, 2 ), 'id' ) );
if ( 'abilities-creation-crash' === $action ) {
	if ( 'pro' === getenv( 'MODULA_E2E_MODE' ) ) { flush_rewrite_rules( false ); }
	$input['request_id'] = $prefix . 'crash';
	add_action( 'wp_insert_post', static function ( $id, $post, $update ) use ( $actor ) {
		if ( ! $update && 'modula-gallery' === $post->post_type && $actor === (int) $post->post_author ) {
			modula_e2e_output( array( 'abrupt_exit_after_insert' => true, 'id' => $id ) );
			exit( 0 ); // Real process interruption; no catch, result or automatic rollback.
		}
	}, 999, 3 );
	$creator->execute( $input );
	WP_CLI::error( 'Crash injection did not execute.' );
}
$media_before = array_map( static function ( $id ) { $post = get_post( $id ); return array( $post->post_title, $post->post_content, $post->post_excerpt, get_post_meta( $id, '_wp_attachment_image_alt', true ), get_post_meta( $id, '_wp_attached_file', true ) ); }, $input['attachment_ids'] );
$result = $creator->execute( $input );
modula_creation_assert( ! is_wp_error( $result ) && 'succeeded' === $result['status'], 'Native draft creation must succeed: ' . wp_json_encode( $result ) );
$id = $result['gallery']['id'];
$read = wp_get_ability( 'modula/read-gallery' )->execute( array( 'id' => $id ) );
modula_creation_assert( ! is_wp_error( $read ) && 'draft' === $read['gallery']['status'] && array_column( $read['items'], 'id' ) === $input['attachment_ids'], 'Created draft must be readable with its ordered attachments.' );
modula_creation_assert( $result === $creator->execute( array_reverse( $input, true ) ) && $result === $recovery->execute( array( 'request_id' => $input['request_id'] ) ), 'Identical replay and recovery must return the original result, independent of object key order.' );
if ( 'abilities-creation-native-only' === $action ) {
	modula_creation_assert( ! class_exists( '\WP\MCP\Core\McpAdapter' ), 'Adapter must actually be absent.' );
	modula_e2e_output( array( 'adapter_loaded' => false, 'native' => $result ) );
	return;
}
$changed = $input;
$changed['title'] = 'Different payload';
modula_creation_assert( 'conflict' === $creator->execute( $changed )['status'], 'Changed input under one identity must conflict.' );
$changed = $input;
$changed['attachment_ids'] = array_reverse( $input['attachment_ids'] );
modula_creation_assert( 'conflict' === $creator->execute( $changed )['status'], 'Changed attachment order must conflict.' );
$before = wp_get_ability( 'modula/list-galleries' )->execute( array( 'search' => $prefix ) )['total'];
foreach ( array( array_diff_key( $input, array( 'status' => true ) ), array_merge( $input, array( 'unexpected' => true ) ), array_merge( $input, array( 'attachment_ids' => array( '12' ) ) ), array_merge( $input, array( 'attachment_ids' => '1,2' ) ), array_merge( $input, array( 'attachment_ids' => array( 5 => $input['attachment_ids'][0] ) ) ), array_merge( $input, array( 'attachment_ids' => array_fill( 0, 101, $input['attachment_ids'][0] ) ) ), array_merge( $input, array( 'attachment_ids' => array( $input['attachment_ids'][0], $input['attachment_ids'][0] ) ) ) ) as $invalid ) {
	$invalid['request_id'] = $prefix . 'invalid';
	$rejected = $creator->execute( $invalid );
	modula_creation_assert( ! is_wp_error( $rejected ) && 'rejected' === $rejected['status'] && 'invalid_input' === $rejected['code'] && '' !== $rejected['message'], 'Invalid fields must retain actionable validation detail without effects: ' . wp_json_encode( array( $invalid, $rejected ) ) );
}
$invalid = array_merge( $input, array( 'request_id' => $prefix . 'invalid', 'attachment_ids' => array( $catalog['galleries']['classic']['id'] ) ) );
modula_creation_assert( 'invalid_attachments' === $creator->execute( $invalid )['code'], 'Non-image targets must be rejected.' );
$deny = static function ( $caps, $cap, $user, $args ) use ( $id, $input ) {
	if ( 'edit_post' === $cap && isset( $args[0] ) && in_array( (int) $args[0], array( $id, $input['attachment_ids'][0] ), true ) ) {
		return array( 'do_not_allow' );
	}
	return $caps;
};
add_filter( 'map_meta_cap', $deny, 10, 4 );
modula_creation_assert( 'forbidden' === $recovery->execute( array( 'request_id' => $input['request_id'] ) )['status'] && 'forbidden' === $creator->execute( $input )['status'], 'Replay and recovery must recheck current gallery/attachment access.' );
modula_creation_assert( 'rejected' === $creator->execute( array_merge( $input, array( 'request_id' => $prefix . 'invalid' ) ) )['status'], 'Inaccessible attachments must be rejected before creation.' );
remove_filter( 'map_meta_cap', $deny );
$type = get_post_type_object( 'modula-gallery' );
$deny_publish = static function ( $caps, $cap ) use ( $type ) { return $type->cap->publish_posts === $cap ? array( 'do_not_allow' ) : $caps; };
add_filter( 'map_meta_cap', $deny_publish, 10, 2 );
modula_creation_assert( 'forbidden' === $creator->execute( array_merge( $input, array( 'request_id' => $prefix . 'invalid', 'status' => 'publish' ) ) )['status'], 'Publishing requires the actual CPT publication capability.' );
remove_filter( 'map_meta_cap', $deny_publish );
modula_creation_assert( $before === wp_get_ability( 'modula/list-galleries' )->execute( array( 'search' => $prefix ) )['total'], 'Rejected validation/access attempts must create no galleries.' );
$other = wp_insert_user( array( 'user_login' => $prefix . 'other', 'user_pass' => wp_generate_password( 40, true, true ), 'user_email' => $prefix . 'other@example.invalid', 'role' => 'administrator', 'meta_input' => array( $marker => $run ) ) );
modula_creation_assert( ! is_wp_error( $other ), 'Owned second actor must exist.' );
wp_set_current_user( $other );
modula_creation_assert( 'not_found' === $recovery->execute( array( 'request_id' => $input['request_id'] ) )['status'], 'Another authorized actor cannot recover the first actor result.' );
wp_set_current_user( $actor );
$other_site = static function ( $query ) use ( $actor, $input ) {
	// Exercise the database isolation boundary without reconfiguring the single-site installation.
	return str_replace( hash( 'sha256', get_current_blog_id() . ':' . $actor . ':' . $input['request_id'] ), hash( 'sha256', '999999:' . $actor . ':' . $input['request_id'] ), $query );
};
add_filter( 'query', $other_site );
$site_isolated = $recovery->execute( array( 'request_id' => $input['request_id'] ) );
remove_filter( 'query', $other_site );
modula_creation_assert( 'not_found' === $site_isolated['status'], 'A different site identity cannot retrieve the result.' );
// A duplicate reaches the API during the actual post insertion, before confirmation.
$active_input = array_merge( $input, array( 'request_id' => $prefix . 'active' ) );
$active_seen = null;
$active_hook = static function ( $post_id, $post, $update ) use ( &$active_seen, $creator, $active_input, $actor ) {
	if ( ! $update && 'modula-gallery' === $post->post_type && $actor === (int) $post->post_author ) {
		$active_seen = $creator->execute( $active_input );
	}
};
add_action( 'wp_insert_post', $active_hook, 999, 3 );
$active_done = $creator->execute( $active_input );
remove_action( 'wp_insert_post', $active_hook, 999 );
modula_creation_assert( 'in_progress' === $active_seen['status'] && 'succeeded' === $active_done['status'], 'An active duplicate must not execute twice.' );
$crash_request = $prefix . 'crash';
$crash_active = $recovery->execute( array( 'request_id' => $crash_request ) );
modula_creation_assert( 'in_progress' === $crash_active['status'], 'An abruptly interrupted process must retain its claimed identity.' );
$advance = static function ( $now ) { return $now + 301; };
add_filter( 'modula_abilities_time', $advance );
$crash_uncertain = $recovery->execute( array( 'request_id' => $crash_request ) );
$crash_retry = $creator->execute( array_merge( $input, array( 'request_id' => $crash_request ) ) );
remove_filter( 'modula_abilities_time', $advance );
modula_creation_assert( 'uncertain' === $crash_uncertain['status'] && 'uncertain' === $crash_retry['status'] && '' !== $crash_retry['reconciliation'], 'Interrupted admission cannot become a new request after its active window.' );
$interrupt = static function ( $post_id, $post, $update ) use ( $actor ) {
	if ( ! $update && 'modula-gallery' === $post->post_type && $actor === (int) $post->post_author ) {
		throw new RuntimeException( 'owned test-only interruption' );
	}
};
$interrupted_input = array_merge( $input, array( 'request_id' => $prefix . 'interrupt' ) );
add_action( 'wp_insert_post', $interrupt, 999, 3 );
$interrupted = $creator->execute( $interrupted_input );
remove_action( 'wp_insert_post', $interrupt, 999 );
modula_creation_assert( 'uncertain' === $interrupted['status'] && $interrupted === $creator->execute( $interrupted_input ), 'Interrupted creation must preserve uncertainty and refuse reexecution.' );
$output_input = array_merge( $input, array( 'request_id' => $prefix . 'output' ) );
$output_failure = static function ( $valid, $output, $name ) { return 'modula/create-gallery' === $name ? new WP_Error( 'ability_invalid_output', 'Owned confirmation failure after effect.' ) : $valid; };
add_filter( 'wp_ability_validate_output', $output_failure, 10, 3 );
$output = $creator->execute( $output_input );
remove_filter( 'wp_ability_validate_output', $output_failure );
modula_creation_assert( is_array( $output ) && 'uncertain' === $output['status'] && 'output_validation_failed' === $output['code'] && isset( $output['gallery'] ) && $output === $recovery->execute( array( 'request_id' => $output_input['request_id'] ) ), 'Post-effect output validation failure must retain a recoverable uncertain result.' );
$published_input = array_merge( $input, array( 'request_id' => $prefix . 'publish', 'title' => $prefix . 'publish', 'status' => 'publish' ) );
$published = $creator->execute( $published_input );
modula_creation_assert( 'succeeded' === $published['status'] && 'publish' === $published['gallery']['status'], 'Publication must be explicit and confirmed.' );
$page_id = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $prefix . 'embed', 'post_content' => $published['gallery']['shortcode'] ) );
$draft_page = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $prefix . 'draft embed', 'post_content' => $result['gallery']['shortcode'] ) );
$media_after = array_map( static function ( $id ) { $post = get_post( $id ); return array( $post->post_title, $post->post_content, $post->post_excerpt, get_post_meta( $id, '_wp_attachment_image_alt', true ), get_post_meta( $id, '_wp_attached_file', true ) ); }, $input['attachment_ids'] );
modula_creation_assert( $media_before === $media_after, 'Creation must preserve shared attachment text and file identity.' );
$seconds = $result['expires_at'] - Requests::now();
modula_creation_assert( $seconds >= 2591990 && $seconds <= 2592000, 'Recovery must retain 30 days, not a shorter window.' );
$just_before = static function ( $now ) use ( $result ) { return $result['expires_at'] - 1; };
add_filter( 'modula_abilities_time', $just_before );
modula_creation_assert( $result === $recovery->execute( array( 'request_id' => $input['request_id'] ) ), 'Result must remain recoverable until expiration.' );
remove_filter( 'modula_abilities_time', $just_before );
$expired_clock = static function ( $now ) use ( $result ) { return $result['expires_at']; };
add_filter( 'modula_abilities_time', $expired_clock );
$expired = $recovery->execute( array( 'request_id' => $input['request_id'] ) );
// Delete only this test-owned result, the same boundary as retention cleanup.
$digest = hash( 'sha256', get_current_blog_id() . ':' . $actor . ':' . $input['request_id'] );
$stored_result = get_option( 'modula_ability_result_' . $digest );
delete_option( 'modula_ability_result_' . $digest );
$expired_cleaned = $creator->execute( $input );
remove_filter( 'modula_abilities_time', $expired_clock );
modula_creation_assert( 'expired' === $expired['status'] && 'expired' === $expired_cleaned['status'], 'Expired identity must remain expired after its result is cleaned.' );
// Restore this owned result/clock for the editor and HTTP replay journey.
update_option( 'modula_ability_result_' . $digest, $stored_result, false );
modula_e2e_output( array( 'draft' => $result, 'input' => $input, 'published' => $published, 'page' => get_permalink( $page_id ), 'draft_page' => get_permalink( $draft_page ), 'active' => $active_seen, 'interrupted' => $interrupted, 'crash' => $crash_uncertain, 'output_failure' => $output, 'expired' => $expired_cleaned, 'actor_isolation' => true, 'site_key_isolation_component_only' => true, 'current_permissions' => true ) );
