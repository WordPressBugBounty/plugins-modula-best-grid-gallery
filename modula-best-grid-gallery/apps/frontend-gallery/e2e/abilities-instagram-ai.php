<?php
/** Native public abilities with owned cache fixtures, never simulated live provider success. */
use Modula\V2\Abilities\Requests;
use Modula\V2\Meta_Sync;
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || $state['run'] !== $run ) {
	exit( 1 ); }
function modula_ia_assert( $ok, $message ) {
	if ( ! $ok ) {
		throw new RuntimeException( $message ); } }
function modula_ia_call( $name, $input ) {
	$ability = wp_get_ability( 'modula/' . $name );
	modula_ia_assert( $ability, 'Missing ability: ' . $name );
	return $ability->execute( $input );
}
try {
	$actor = (int) get_user_by( 'login', $run )->ID;
	wp_set_current_user( $actor );
	$mode   = getenv( 'MODULA_E2E_MODE' );
	$prefix = $run . '-' . $mode . '-' . $action;
	$upload = wp_upload_dir();
	$file   = $upload['basedir'] . '/' . $run . '/' . $prefix . '.jpg';
	$canvas = imagecreatetruecolor( 50, 40 );
	imagefill( $canvas, 0, 0, imagecolorallocate( $canvas, 50, 150, 70 ) );
	imagejpeg( $canvas, $file );
	imagedestroy( $canvas );
	$attachment = wp_insert_attachment(
		array(
			'post_mime_type' => 'image/jpeg',
			'post_title'     => 'Original shared title',
			'post_status'    => 'inherit',
			'post_author'    => $actor,
			'meta_input'     => array(
				$marker                    => $run,
				'_wp_attachment_image_alt' => 'Original shared alt',
				'_modula_ai_report'        => array(
					'title'   => 'Cached proposed title',
					'altText' => 'Cached proposed alt',
					'secret'  => 'DO-NOT-EXPOSE',
				),
			),
		),
		$file
	);
	wp_update_attachment_metadata( $attachment, wp_generate_attachment_metadata( $attachment, $file ) );
	$galleries = array();
	for ( $i = 0; $i < 2; ++$i ) {
		$id = modula_e2e_insert(
			array(
				'post_type'   => 'modula-gallery',
				'post_status' => 'publish',
				'post_author' => $actor,
				'post_title'  => $prefix . '-' . $i,
				'meta_input'  => array( '_modula_beta' => '1' ),
			)
		);
		Meta_Sync::apply_new_beta_gallery_create_defaults( $id );
		Meta_Sync::persist_merged_gallery_items( $id, array( array( 'id' => $attachment ) ), false );
		$galleries[] = Modula\V2\Abilities\Integration::gallery( get_post( $id ) );
	}
	$id           = $galleries[0]['id'];
	$reads        = 0;
	$deny_network = static function () use ( &$reads ) {
		++$reads;
		return new WP_Error( 'owned_network_refusal', 'DO-NOT-EXPOSE' );
	};
	add_filter( 'pre_http_request', $deny_network );
	$report_writes = 0;
	$observe_report = static function ( $check, $object_id, $meta_key ) use ( $attachment, &$report_writes ) {
		if ( $attachment === (int) $object_id && '_modula_ai_report' === $meta_key ) { ++$report_writes; }
		return $check;
	};
	add_filter( 'update_post_metadata', $observe_report, 10, 3 );
	$report_before = get_post_meta( $attachment, '_modula_ai_report', true );
	$catalog = modula_ia_call( 'discover', array() );
	foreach ( array( 'read-ai-attachment-state', 'generate-attachment-text' ) as $retired ) {
		modula_ia_assert( ! wp_has_ability( 'modula/' . $retired ), 'Retired ability must not be registered: ' . $retired );
		modula_ia_assert( false === strpos( wp_json_encode( $catalog ), 'modula/' . $retired ), 'Retired names absent from discovery.' );
		$request = new WP_REST_Request( 'generate-attachment-text' === $retired ? 'POST' : 'GET', '/wp-abilities/v1/abilities/modula/' . $retired . '/run' );
		$request->set_param( 'input', array( 'id' => $attachment, 'request_id' => $prefix . '-retired', 'revision' => str_repeat( 'a', 64 ) ) );
		modula_ia_assert( rest_do_request( $request )->get_status() >= 400, 'Native execution of old name refused.' );
	}
	modula_ia_assert( 0 === $reads && 0 === $report_writes && $report_before === get_post_meta( $attachment, '_modula_ai_report', true ), 'Retirement invokes no HTTP or report write.' );
	modula_ia_assert( wp_get_ability( 'modula/update-attachment-text' ), 'Shared attachment writer remains registered.' );
	// Seed historical outcomes, not a substitute for a successful provider run.
	$input = array( 'id' => $attachment, 'revision' => str_repeat( 'a', 64 ), 'request_id' => $prefix . '-ai' );
	$operation = 'modula/generate-attachment-text';
	Requests::claim( $input, $operation );
	$generated = Requests::finish( $input['request_id'], Requests::outcome( $input['request_id'], 'succeeded', '', '', $operation ) + array( 'ai' => array( 'attachment_id' => $attachment, 'phase' => 'proposal', 'cached' => true, 'text' => array( 'title' => 'Cached proposed title', 'alt' => 'Cached proposed alt' ) ) ) );
	modula_ia_assert( 'succeeded' === $generated['status'] && $generated === modula_ia_call( 'recover-request', array( 'request_id' => $input['request_id'] ) ), 'Historical success remains recoverable.' );
	$denied = static function ( $caps, $cap, $user, $args ) use ( $attachment ) {
		return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $attachment ? array( 'do_not_allow' ) : $caps;
	};
	add_filter( 'map_meta_cap', $denied, 10, 4 );
	modula_ia_assert( 'forbidden' === modula_ia_call( 'recover-request', array( 'request_id' => $input['request_id'] ) )['status'], 'Historical recovery rechecks revoked rights.' );
	remove_filter( 'map_meta_cap', $denied, 10 );
	$lost = $input;
	$lost['request_id'] .= '-lost';
	Requests::claim( $lost, $operation );
	$uncertain = Requests::finish( $lost['request_id'], Requests::outcome( $lost['request_id'], 'uncertain', 'ai_confirmation_unavailable', '', $operation ) );
	modula_ia_assert( $uncertain === modula_ia_call( 'recover-request', array( 'request_id' => $lost['request_id'] ) ), 'Historical uncertainty cannot regenerate.' );
	$future = static function () { return time() + 31 * DAY_IN_SECONDS; };
	add_filter( 'modula_abilities_time', $future );
	modula_ia_assert( 'expired' === modula_ia_call( 'recover-request', array( 'request_id' => $input['request_id'] ) )['status'], 'Thirty day recovery retention preserved.' );
	remove_filter( 'modula_abilities_time', $future );
	modula_ia_assert( 0 === $reads && 0 === $report_writes && $report_before === get_post_meta( $attachment, '_modula_ai_report', true ), 'Recovery never checks credits, generates or writes reports.' );
	// Website REST route still reaches its own localhost gate, then its existing cache path.
	$request = new WP_REST_Request( 'POST', '/modula-ai-image-descriptor/v1/generate-alt-text' );
	$request->set_header( 'Content-Type', 'application/json' );
	$request->set_body( wp_json_encode( array( 'id' => $id, 'attachment_id' => $attachment, 'action' => 'generate' ) ) );
	modula_ia_assert( 'modula_ai_unavailable_localhost' === rest_do_request( $request )->get_data()['code'], 'Website handler remains registered with its localhost guard: ' . wp_json_encode( rest_do_request( $request )->get_data() ) );
	$public = static function () { return 'https://owned.example.org'; };
	add_filter( 'site_url', $public );
	modula_ia_assert( $report_before === rest_do_request( $request )->get_data() && 0 === $reads, 'Website existing cache generation remains intact without provider calls.' );
	remove_filter( 'site_url', $public );
	remove_filter( 'update_post_metadata', $observe_report, 10 );
	$output = array(
		'passed'           => true,
		'adapter_loaded'   => class_exists( '\WP\MCP\Plugin' ),
		'galleries'        => $galleries,
		'attachment_id'    => $attachment,
		'proposal_request' => $input['request_id'],
		'live_ai'          => 'retired from abilities; website cache and localhost gate verified',
		'provider_calls_during_retirement_recovery' => $reads,
		'report_writes_during_retirement_recovery' => $report_writes,
		'retirement_only' => '1' === getenv( 'MODULA_E2E_AI_RETIREMENT' ),
	);
	if ( 'pro' === $mode && ! $output['retirement_only'] ) {
		$ig = modula_ia_call( 'read-instagram-state', array( 'id' => $id ) );
		modula_ia_assert( ! is_wp_error( $ig ), 'Instagram must be enabled in Compatible Pro fixture.' );
		$output['live_instagram'] = $ig['configured'] ? 'configured; live sync not exercised by owned cache fixture' : 'unverified: no configured account';
		// Pure local read does not query or refresh the account.
		$before_calls = $reads;
		modula_ia_call( 'read-instagram-state', array( 'id' => $id ) );
		modula_ia_assert( $reads === $before_calls, 'Instagram state is a local read.' );
		if ( $ig['configured'] && 'abilities-instagram-ai' === $action ) {
			remove_filter( 'pre_http_request', $deny_network );
			$live_id = modula_e2e_insert(
				array(
					'post_type'   => 'modula-gallery',
					'post_status' => 'publish',
					'post_author' => $actor,
					'post_title'  => $prefix . '-live',
					'meta_input'  => array( '_modula_beta' => '1' ),
				)
			);
			Meta_Sync::apply_new_beta_gallery_create_defaults( $live_id );
			$cursor = null;
			for ( $attempt = 0; $attempt < 5; ++$attempt ) {
				$live_input = array(
					'id'         => $live_id,
					'revision'   => modula_ia_call( 'read-instagram-state', array( 'id' => $live_id ) )['revision'],
					'request_id' => $prefix . '-live-' . $attempt,
					'max_items'  => 1,
				);
				if ( $cursor ) {
					$live_input['after'] = $cursor; }
				$live                             = modula_ia_call( 'sync-instagram-gallery', $live_input );
				$output['live_instagram']         = array(
					'status'   => $live['status'],
					'code'     => $live['code'],
					'retained' => count( $live['instagram']['attachment_ids'] ?? array() ),
				);
				$output['live_instagram_request'] = $live_input['request_id'];
				if ( $output['live_instagram']['retained'] ) {
					$output['live_gallery'] = Modula\V2\Abilities\Integration::gallery( get_post( $live_id ) );
					$output['live_cursor']  = $cursor;
					break;
				}
				$cursor = $live['instagram']['after'] ?? null;
				if ( ! $cursor || ! in_array( $live['status'], array( 'succeeded', 'partial' ), true ) ) {
						break; }
			}
			$live_page           = modula_e2e_insert(
				array(
					'post_type'    => 'page',
					'post_status'  => 'publish',
					'post_title'   => $prefix . '-live-page',
					'post_content' => '[modula id="' . $live_id . '"]',
				)
			);
			$output['live_page'] = get_permalink( $live_page );
			add_filter( 'pre_http_request', $deny_network );
		}
		add_filter( 'pre_option_modula_instagram_access_token', $credential );
		add_filter(
			'pre_option_modula_instagram_expiry_date',
			static function () {
				return time() + 600;
			}
		);
		$source = (string) ( 900000000 + $attachment );
		update_post_meta( $attachment, 'modula_instagram_image_id', $source );
		// This is an owned existing cache/media fixture, not a provider-success mock.
		$cache = static function () use ( $source ) {
			return array(
				'images' => array(
					array(
						'id'   => $source,
						'url'  => 'https://owned.example.org/image.jpg',
						'type' => 'image',
					),
				),
			);
		};
		add_filter( 'pre_transient_modula_images_list', $cache );
		Meta_Sync::persist_merged_gallery_items( $id, array(), false );
		$embedded = modula_ia_call(
			'update-gallery-items',
			array(
				'id'           => $id,
				'revision'     => modula_ia_call( 'read-gallery', array( 'id' => $id ) )['gallery']['revision'],
				'request_id'   => $prefix . '-block',
				'item_changes' => array(
					array(
						'action' => 'add',
						'id'     => 'owned-block',
						'kind'   => 'content_block',
						'fields' => array( 'title' => 'Preserved Instagram block' ),
					),
				),
			)
		);
		modula_ia_assert( 'succeeded' === $embedded['status'], 'Owned mixed-item fixture.' );
		$iginput = array(
			'id'         => $id,
			'revision'   => modula_ia_call( 'read-instagram-state', array( 'id' => $id ) )['revision'],
			'request_id' => $prefix . '-instagram',
			'refresh'    => false,
		);
		$synced  = modula_ia_call( 'sync-instagram-gallery', $iginput );
		modula_ia_assert( 'succeeded' === $synced['status'] && array( $attachment ) === $synced['instagram']['added_ids'], 'Existing Instagram media is added: ' . wp_json_encode( $synced ) );
		modula_ia_assert( $synced === modula_ia_call( 'sync-instagram-gallery', $iginput ) && $before_calls === $reads, 'Instagram replay never calls provider or duplicates rows.' );
		$iginput['request_id'] .= '-stale';
		modula_ia_assert( 'conflict' === modula_ia_call( 'sync-instagram-gallery', $iginput )['status'], 'Instagram stale revision conflicts.' );
		modula_ia_assert( in_array( 'owned-block', array_column( modula_ia_call( 'read-gallery', array( 'id' => $id ) )['items'], 'id' ), true ), 'Instagram preserves existing mixed content.' );
		// A separate real DB connection holds the shared importer identity lock.
		$other         = new wpdb( DB_USER, DB_PASSWORD, DB_NAME, DB_HOST );
		$identity_lock = 'modula_ig_' . get_current_blog_id() . '_' . md5( $source );
		modula_ia_assert( '1' === (string) $other->get_var( $other->prepare( 'SELECT GET_LOCK(%s, 0)', $identity_lock ) ), 'Own the competing import lock.' );
		$busy_input                = $iginput;
		$busy_input['request_id'] .= '-busy';
		$busy_input['revision']    = modula_ia_call( 'read-instagram-state', array( 'id' => $id ) )['revision'];
		try {
			$busy = modula_ia_call( 'sync-instagram-gallery', $busy_input ); } finally {
					$other->get_var( $other->prepare( 'SELECT RELEASE_LOCK(%s)', $identity_lock ) );
					$other->close(); }
			modula_ia_assert( 'partial' === $busy['status'] && 1 === $busy['instagram']['failed'], 'Concurrent ordinary intake cannot silently duplicate provider media.' );
			remove_filter( 'pre_transient_modula_images_list', $cache );
			$partial_cache = static function () use ( $source ) {
				return array(
					'images' => array(
						array(
							'id'   => $source,
							'url'  => 'https://owned.example.org/image.jpg',
							'type' => 'image',
						),
						array(
							'id'   => '0',
							'type' => 'invalid',
						),
					),
					'after'  => 'owned_cursor',
				);
			};
		add_filter( 'pre_transient_modula_images_list', $partial_cache );
		$iginput['request_id'] .= '-partial';
		$iginput['revision']    = modula_ia_call( 'read-instagram-state', array( 'id' => $id ) )['revision'];
		$partial                = modula_ia_call( 'sync-instagram-gallery', $iginput );
		modula_ia_assert( 'partial' === $partial['status'] && 1 === $partial['instagram']['failed'] && 'owned_cursor' === $partial['instagram']['after'], 'Partial cache page retains artifacts and cursor.' );
		remove_filter( 'pre_transient_modula_images_list', $partial_cache );
		$iginput['request_id'] .= '-network';
		$iginput['refresh']     = true;
		$iginput['revision']    = modula_ia_call( 'read-instagram-state', array( 'id' => $id ) )['revision'];
		// Refuse network through a dedicated cursor; do not clear the user's existing cache.
		$iginput['refresh'] = false;
		$iginput['after']   = 'owned_missing_cursor';
		$failed             = modula_ia_call( 'sync-instagram-gallery', $iginput );
		modula_ia_assert( 'instagram_provider_unavailable' === $failed['code'], 'Provider errors cannot become empty successful syncs.' );
		$output['instagram_request'] = $synced['request_id'];
	} elseif ( 'lite' === $mode ) {
		modula_ia_assert( is_wp_error( modula_ia_call( 'read-instagram-state', array( 'id' => $id ) ) ), 'Lite refuses Instagram extension operation.' );
	}
	remove_filter( 'pre_http_request', $deny_network );
	$page           = modula_e2e_insert(
		array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_title'   => $prefix . '-public',
			'post_content' => '[modula id="' . $id . '"][modula id="' . $galleries[1]['id'] . '"]',
		)
	);
	$output['page'] = get_permalink( $page );
	modula_e2e_output( $output );
} catch ( Throwable $error ) {
	WP_CLI::error( $error->getMessage() ); }
