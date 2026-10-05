<?php
/** Native abilities checks owned by the shared local WordPress fixture run. */
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! isset( $state['run'] ) || $state['run'] !== getenv( 'MODULA_E2E_RUN' ) ) {
	exit( 1 );
}
function modula_e2e_ability_assert( $condition, $message ) {
	if ( ! $condition ) {
		WP_CLI::error( $message );
	}
}
$users = get_users( array( 'meta_key' => $marker, 'meta_value' => $run, 'fields' => 'ID' ) );
wp_set_current_user( $users[0] );
$ability = wp_get_ability( 'modula/discover' );
modula_e2e_ability_assert( $ability instanceof WP_Ability, 'Native Modula discovery must be registered.' );
global $wpdb;
// Capture this invocation's writes rather than racing unrelated background cron
// against a whole-site option snapshot. Query values are never retained.
$writes = array();
$capture_writes = static function ( $query ) use ( &$writes ) {
	if ( preg_match( '/^\s*(INSERT|UPDATE|DELETE|REPLACE|ALTER|CREATE|DROP)\b/i', $query, $match ) ) {
		$writes[] = strtoupper( $match[1] );
	}
	return $query;
};
add_filter( 'query', $capture_writes );
$result = $ability->execute( array( 'page' => 1, 'per_page' => 100 ) );
remove_filter( 'query', $capture_writes );
modula_e2e_ability_assert( ! is_wp_error( $result ), 'Native discovery must execute and validate its output.' );
modula_e2e_ability_assert( empty( $writes ), 'Discovery must not perform database writes.' );
$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$id = modula_e2e_insert( array(
	'post_type' => 'modula-gallery', 'post_status' => 'draft',
	'post_title' => 'abilities pure read ' . getenv( 'MODULA_E2E_MODE' ),
	'post_author' => $users[0], 'post_password' => 'ability-secret-gate',
	'meta_input' => array( '_modula_beta' => 1 ),
) );
\Modula\V2\Meta_Sync::ensure_default_settings( $id );
\Modula\V2\Meta_Sync::persist_merged_gallery_items( $id, array(
	array( 'id' => $catalog['attachments'][0]['id'], 'filters' => 'Do not repair' ),
	array( 'id' => $catalog['attachments'][1]['id'] ),
), false );
// Raw stored state deliberately needs ordinary-reader filter repair. Abilities
// must neither repair it nor expose unknown/secret schema fields.
$settings = \Modula\V2\Meta_Sync::get_settings_v2( $id, false );
$settings['filters']['filters'] = array( '' );
$settings['passwordProtect'] = array( 'enablePassword' => true, 'password' => 'ability-secret-gate' );
$settings['general']['unknownPrivateKey'] = 'ability-secret-unknown';
$settings['unknownProvider'] = array( 'api_key' => 'ability-secret-provider' );
$wpdb->update( $wpdb->postmeta, array( 'meta_value' => wp_json_encode( $settings ) ), array( 'post_id' => $id, 'meta_key' => 'modula_settings_v2' ) );
wp_cache_delete( $id, 'post_meta' );
$before = get_post_meta( $id );
$syncs = did_action( 'modula_gallery_settings_v2_updated' );
$page_one = $ability->execute( array( 'page' => 1, 'per_page' => 1 ) );
$page_two = $ability->execute( array( 'page' => 2, 'per_page' => 1 ) );
modula_e2e_ability_assert( ! is_wp_error( $page_one ) && ! is_wp_error( $page_two ) && 1 === count( $page_one['operations'] ) && $page_one['operations'][0]['name'] !== $page_two['operations'][0]['name'], 'Discovery must page its operation contracts.' );
modula_e2e_ability_assert( ( 'pro' === getenv( 'MODULA_E2E_MODE' ) ) === $result['features']['compatible_pro'] && 'stored' === $result['features']['license_source'], 'Discovery must report actual mode and stored licensing provenance.' );
$reader = wp_get_ability( 'modula/read-gallery' );
modula_e2e_ability_assert( $reader instanceof WP_Ability, 'Native Beta read must be registered.' );
$read = $reader->execute( array( 'id' => $id, 'page' => 1, 'per_page' => 1 ) );
modula_e2e_ability_assert( ! is_wp_error( $read ), 'Native Beta read must validate its output.' );
modula_e2e_ability_assert( $before === get_post_meta( $id ) && $syncs === did_action( 'modula_gallery_settings_v2_updated' ) && 'draft' === get_post_status( $id ), 'Ability reads must preserve stored metadata, synchronization count and draft status.' );
modula_e2e_ability_assert( false === strpos( wp_json_encode( $read ), 'ability-secret' ), 'Read must omit passwords and unknown private fields.' );
modula_e2e_ability_assert( 1 === count( $read['items'] ) && 2 === $read['total'], 'Item read must use documented pagination.' );
$attachment_id = $catalog['attachments'][0]['id'];
$deny_attachment = static function ( $caps, $cap, $user_id, $args ) use ( $attachment_id ) {
	if ( 'edit_post' === $cap && isset( $args[0] ) && $attachment_id === (int) $args[0] ) {
		return array( 'do_not_allow' );
	}
	return $caps;
};
add_filter( 'map_meta_cap', $deny_attachment, 100, 4 );
$permitted_items = $reader->execute( array( 'id' => $id ) );
remove_filter( 'map_meta_cap', $deny_attachment, 100 );
modula_e2e_ability_assert( ! is_wp_error( $permitted_items ) && 1 === $permitted_items['total'] && $attachment_id !== $permitted_items['items'][0]['id'], 'Unreadable attachments must not leak through item pages or totals.' );
$second = $reader->execute( array( 'id' => $id, 'page' => 2, 'per_page' => 1 ) );
modula_e2e_ability_assert( ! is_wp_error( $second ) && $read['items'][0]['id'] !== $second['items'][0]['id'], 'Read pages must preserve distinct item identities.' );
$missing_id = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'auto-draft', 'post_title' => 'abilities missing settings', 'post_author' => $users[0], 'meta_input' => array( '_modula_beta' => 1 ) ) );
delete_post_meta( $missing_id, 'modula_settings_v2' );
$missing_before = get_post_meta( $missing_id );
$missing_read = $reader->execute( array( 'id' => $missing_id ) );
modula_e2e_ability_assert( ! is_wp_error( $missing_read ) && $missing_before === get_post_meta( $missing_id ) && 'auto-draft' === get_post_status( $missing_id ), 'Ability read must not backfill missing settings or promote an auto-draft.' );
$classic = $reader->execute( array( 'id' => $catalog['galleries']['classic']['id'] ) );
modula_e2e_ability_assert( is_wp_error( $classic ), 'Classic target must not be readable through Beta abilities.' );
$invalid = $reader->execute( array( 'id' => $id, 'per_page' => 101 ) );
modula_e2e_ability_assert( is_wp_error( $invalid ), 'Out-of-bounds input must be rejected by native validation.' );
$lister = wp_get_ability( 'modula/list-galleries' );
$list = $lister->execute( array( 'per_page' => 1, 'status' => 'draft', 'search' => 'abilities pure read ' . getenv( 'MODULA_E2E_MODE' ) ) );
modula_e2e_ability_assert( ! is_wp_error( $list ) && 1 === count( $list['galleries'] ) && $id === $list['galleries'][0]['id'], 'Native list must find the actor-accessible draft.' );
// A supported object-capability customization immediately changes execution.
$deny_target = static function ( $caps, $cap, $user_id, $args ) use ( $id ) {
	if ( 'edit_post' === $cap && isset( $args[0] ) && $id === (int) $args[0] ) {
		return array( 'do_not_allow' );
	}
	return $caps;
};
add_filter( 'map_meta_cap', $deny_target, 100, 4 );
$denied = $reader->execute( array( 'id' => $id ) );
$hidden = $lister->execute( array( 'search' => 'abilities pure read ' . getenv( 'MODULA_E2E_MODE' ) ) );
remove_filter( 'map_meta_cap', $deny_target, 100 );
modula_e2e_ability_assert( is_wp_error( $denied ) && ! is_wp_error( $hidden ) && empty( $hidden['galleries'] ), 'Current object capabilities must deny reads and remove list rows.' );
$subscriber = wp_insert_user( array( 'user_login' => $run . '-' . getenv( 'MODULA_E2E_MODE' ), 'user_pass' => wp_generate_password( 32, true, true ), 'user_email' => $run . '-' . getenv( 'MODULA_E2E_MODE' ) . '@example.invalid', 'role' => 'subscriber', 'meta_input' => array( $marker => $run ) ) );
modula_e2e_ability_assert( ! is_wp_error( $subscriber ), 'Could not create the owned restricted actor.' );
wp_set_current_user( $subscriber );
$restricted = $reader->execute( array( 'id' => $catalog['galleries']['privateAccess']['id'] ) );
modula_e2e_ability_assert( is_wp_error( $restricted ), 'An authenticated subscriber must not read a private gallery.' );
wp_set_current_user( $users[0] );
modula_e2e_ability_assert( wp_delete_user( $subscriber ), 'Could not remove the owned restricted actor.' );
wp_set_current_user( 0 );
$anonymous = $ability->execute( array() );
modula_e2e_ability_assert( is_wp_error( $anonymous ), 'Anonymous discovery must be denied.' );
wp_set_current_user( $users[0] );
modula_e2e_output( array( 'native' => $result, 'read' => $read, 'id' => $id, 'list' => $list, 'pure_read' => true, 'denied_current_capability' => true, 'denied_subscriber' => true ) );
