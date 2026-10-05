<?php
// phpcs:disable WordPress.PHP.YodaConditions.NotYoda -- Assertions compare captured expected values to fresh executions.
/** Retired CSS ability: historical recovery, preserved website route and real settings saves. */
use Modula\V2\Abilities\Requests;
use Modula\V2\Meta_Sync;
if ( ! defined( 'WP_CLI' ) || ! WP_CLI || $state['run'] !== $run ) {
	exit( 1 ); }
function modula_css_assert( $ok, $message ) {
	if ( ! $ok ) {
		throw new RuntimeException( esc_html( $message ) ); } }
function modula_css_call( $name, $input ) {
	$abilities = wp_get_abilities();
	modula_css_assert( isset( $abilities[ 'modula/' . $name ] ), 'Missing ability: ' . $name );
	$result = $abilities[ 'modula/' . $name ]->execute( $input );
	modula_css_assert( ! is_wp_error( $result ), 'Ability error: ' . wp_json_encode( $result ) );
	return $result;
}
( static function () use ( $run, $action, $state, $marker ) {
	try {
		$actor = (int) get_user_by( 'login', $run )->ID;
		wp_set_current_user( $actor );
		$mode   = getenv( 'MODULA_E2E_MODE' );
		$prefix = $run . '-' . $mode . '-css';
		$id     = modula_e2e_insert(
			array(
				'post_type'   => 'modula-gallery',
				'post_status' => 'publish',
				'post_author' => $actor,
				'post_title'  => $prefix,
				'meta_input'  => array(
					'_modula_beta'  => '1',
					'_owned_secret' => 'DO-NOT-EXPOSE',
				),
			)
		);
		Meta_Sync::apply_new_beta_gallery_create_defaults( $id );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Owned local runner artifact.
		$catalog = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
		Meta_Sync::persist_merged_gallery_items( $id, array( array( 'id' => $catalog['attachments'][0]['id'] ) ), false );
		$read    = static function () use ( $id ) {
			return modula_css_call( 'read-gallery', array( 'id' => $id ) );
		};
		$prompt  = 'Return CSS that applies outline: 7px solid rgb(17, 34, 51) !important to the gallery root itself, selector #modula-' . $id . '. No other visual changes, no media queries. Keep this exact outline value.';
		$before  = $read();
		$input   = array(
			'id'         => $id,
			'revision'   => $before['gallery']['revision'],
			'request_id' => $prefix . '-generate',
			'prompt'     => $prompt,
		);
		$calls   = 0;
		$observe = static function ( $pre, $args, $url ) use ( &$calls, $id ) {
			if ( false !== strpos( $url, '/gallery-css-contract/generate' ) ) {
				++$calls;
				$body = json_decode( $args['body'], true );
				modula_css_assert( $id === $body['galleryContext']['galleryId'] && '#modula-' . $id === $body['galleryContext']['rootSelector'], 'Correct scoped context.' );
				modula_css_assert( false === strpos( $args['body'], 'DO-NOT-EXPOSE' ), 'No private meta sent.' );
			}
			return $pre;
		};
		add_filter( 'pre_http_request', $observe, 1, 3 );
		$code = '#modula-' . $id . ' { outline: 7px solid rgb(17, 34, 51) !important; }';
		modula_css_assert( ! wp_has_ability( 'modula/generate-gallery-css' ), 'CSS generation ability is retired.' );
		modula_css_assert( false === strpos( wp_json_encode( modula_css_call( 'discover', array() ) ), 'modula/generate-gallery-css' ), 'Retired CSS absent from discovery.' );
		$native = new WP_REST_Request( 'POST', '/wp-abilities/v1/abilities/modula/generate-gallery-css/run' );
		$native->set_param( 'input', $input );
		modula_css_assert( rest_do_request( $native )->get_status() >= 400 && 0 === $calls, 'Native old-name invocation refused without provider.' );
		// Historical fixtures exercise retained recovery, never simulate a successful provider call.
		Requests::claim( $input, 'modula/generate-gallery-css' );
		$proposal = Requests::finish( $input['request_id'], Requests::outcome( $input['request_id'], 'succeeded', '', '', 'modula/generate-gallery-css' ) + array( 'css' => array( 'gallery_id' => $id, 'revision' => $input['revision'], 'phase' => 'proposal', 'code' => $code ) ) );
		modula_css_assert( $proposal === modula_css_call( 'recover-request', array( 'request_id' => $input['request_id'] ) ), 'Retained CSS success remains recoverable.' );
		$failed_input = $input;
		$failed_input['request_id'] .= '-failed';
		Requests::claim( $failed_input, 'modula/generate-gallery-css' );
		$failed = Requests::finish( $failed_input['request_id'], Requests::outcome( $failed_input['request_id'], 'rejected', 'css_provider_rejected', '', 'modula/generate-gallery-css' ) );
		modula_css_assert( $failed === modula_css_call( 'recover-request', array( 'request_id' => $failed_input['request_id'] ) ), 'Retained failure remains recoverable.' );
		$future = static function () { return time() + 31 * DAY_IN_SECONDS; };
		add_filter( 'modula_abilities_time', $future );
		modula_css_assert( 'expired' === modula_css_call( 'recover-request', array( 'request_id' => $input['request_id'] ) )['status'], 'Historical recovery retains expiry.' );
		remove_filter( 'modula_abilities_time', $future );
		modula_css_assert( 0 === $calls, 'Retirement and recovery never generate.' );
		$after_retirement = $read();
		modula_css_assert( wp_json_encode( $before ) === wp_json_encode( $after_retirement ), 'Retirement and recovery preserve gallery values: ' . wp_json_encode( array_keys( array_filter( $before, static function ( $value, $key ) use ( $after_retirement ) { return wp_json_encode( $value ) !== wp_json_encode( $after_retirement[ $key ] ?? null ); }, ARRAY_FILTER_USE_BOTH ) ) ) );
		// Website UI handler still reaches its provider seam; bounded refusal prevents live effects.
		$stub = static function ( $pre, $args, $url ) {
			return false !== strpos( $url, '/gallery-css-contract/generate' ) ? array( 'response' => array( 'code' => 429 ), 'body' => '{"message":"DO-NOT-EXPOSE"}' ) : $pre;
		};
		add_filter( 'pre_http_request', $stub, 10, 3 );
		$rest = new WP_REST_Request( 'POST', '/modula/v2/gallery/' . $id . '/generate-custom-css' );
		$rest->set_param( 'userPrompt', $prompt );
		modula_css_assert( 429 === rest_do_request( $rest )->get_status() && 1 === $calls, 'Existing website CSS handler remains available.' );
		remove_filter( 'pre_http_request', $stub, 10 );
		$denied = static function ( $caps, $cap, $user, $args ) use ( $id ) {
			return 'edit_post' === $cap && (int) ( $args[0] ?? 0 ) === $id ? array( 'do_not_allow' ) : $caps;
		};
		add_filter( 'map_meta_cap', $denied, 10, 4 );
		modula_css_assert( 'forbidden' === modula_css_call( 'recover-request', array( 'request_id' => $failed_input['request_id'] ) )['status'], 'Recovery checks current object rights.' );
		remove_filter( 'map_meta_cap', $denied, 10 );
		$count = $calls;
		$rest  = new WP_REST_Request( 'PATCH', '/modula/v2/gallery/' . $id . '/settings' );
		$rest->set_header( 'Content-Type', 'application/json' );
		$rest->set_body( wp_json_encode( array( 'layout' => array( 'gutter' => 23 ) ) ) );
		modula_css_assert( 200 === rest_do_request( $rest )->get_status(), 'Intervening editor save.' );
		$apply = array(
			'id'         => $id,
			'revision'   => $input['revision'],
			'request_id' => $prefix . '-stale-apply',
			'settings'   => array( 'style' => array( 'customCss' => $code ) ),
		);
		modula_css_assert( 'conflict' === modula_css_call( 'update-gallery', $apply )['status'], 'Stale proposal application conflicts.' );
		$apply['revision']   = $read()['gallery']['revision'];
		$apply['request_id'] = $prefix . '-apply';
		$applied             = modula_css_call( 'update-gallery', $apply );
		modula_css_assert( 'succeeded' === $applied['status'] && $applied === modula_css_call( 'update-gallery', $apply ), 'Explicit CSS application is replayable.' );
		$saved = Meta_Sync::get_settings_v2( $id, false );
		modula_css_assert( $code === $saved['style']['customCss'] && 23 === $saved['layout']['gutter'], 'Application preserves intervening settings.' );
		$interrupted                = $input;
		$interrupted['request_id'] .= '-interrupted';
		Requests::claim( $interrupted, 'modula/generate-gallery-css' );
		Requests::context(
			$interrupted['request_id'],
			array(
				'started' => time() - 600,
				'css'     => array(
					'gallery_id' => $id,
					'revision'   => $input['revision'],
					'phase'      => 'provider_request',
				),
			)
		);
		$recovered = modula_css_call( 'recover-request', array( 'request_id' => $interrupted['request_id'] ) );
		modula_css_assert( 'uncertain' === $recovered['status'] && 'provider_request' === $recovered['css']['phase'] && $count === $calls, 'Interrupted generation retains stage without replaying provider.' );
		remove_filter( 'pre_http_request', $observe, 1 );
		$page = modula_e2e_insert(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => $prefix . '-public',
				'post_content' => '[modula id="' . $id . '"]',
			)
		);
		modula_e2e_output(
			array(
				'passed'          => true,
				'adapter_loaded'  => class_exists( '\\WP\\MCP\\Plugin' ),
				'gallery'         => $read()['gallery'],
				'page'            => get_permalink( $page ),
				'code'            => $code,
				'prompt'          => $prompt,
				'proposal'        => $proposal,
				'live_provider'   => false,
				'retired'         => true,
				'proposal_request' => $input['request_id'],
				'interrupted_request' => $interrupted['request_id'],
				'live_calls'      => 0,
				'failure_request' => $failed_input['request_id'],
			)
		);
	} catch ( Throwable $error ) {
		WP_CLI::error( $error->getMessage() ); }
} )();
