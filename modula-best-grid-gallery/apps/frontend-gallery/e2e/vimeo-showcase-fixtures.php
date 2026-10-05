<?php
/** Controlled Vimeo boundary, installed by the shared owned MU fixture only. */
add_action( 'init', static function () {
	$run = $_SERVER['HTTP_X_MODULA_E2E_VIMEO'] ?? '';
	$lock = get_option( 'modula_wordpress_e2e_lock' );
	if ( ! is_string( $run ) || ! preg_match( '/^modula-e2e-[a-f0-9]{16}$/D', $run ) || ( $lock['run'] ?? '' ) !== $run || wp_get_current_user()->user_login !== $run || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	// Do not read, replace, persist or expose the site's real OAuth credentials.
	add_filter( 'pre_option_modula_video_vimeo_access_token', static function () { return 'owned-vimeo-fixture'; } );
	add_filter( 'pre_http_request', static function ( $pre, $args, $url ) use ( $run ) {
		if ( 'api.vimeo.com' !== wp_parse_url( $url, PHP_URL_HOST ) ) { return $pre; }
		if ( '1' === ( $_SERVER['HTTP_X_MODULA_E2E_VIMEO_BLOCK'] ?? '' ) ) { return new WP_Error( 'replay_must_not_query', 'Provider disabled for replay check.' ); }
		$path = wp_parse_url( $url, PHP_URL_PATH );
		if ( ! preg_match( '~^/me/albums/(12429567|99002|99003|99004|99005)(/videos)?$~D', $path, $match ) ) {
			return new WP_Error( 'owned_vimeo_only', 'Unexpected provider path; live calls disabled in this fixture.' );
		}
		parse_str( (string) wp_parse_url( $url, PHP_URL_QUERY ), $query );
		$status = 200;
		if ( empty( $match[2] ) ) {
			$body = array( 'privacy' => array( 'view' => '99004' === $match[1] ? 'password' : 'anybody' ) );
		} elseif ( '99002' === $match[1] && 2 === (int) ( $query['page'] ?? 1 ) ) {
			$status = 503;
			$body = array( 'error' => 'Synthetic provider failure, must not be shown.' );
		} else {
			if ( 'default' !== ( $query['sort'] ?? '' ) ) { return new WP_Error( 'wrong_sort', 'Expected default Showcase order.' ); }
			$ids = '99003' === $match[1] ? array() : ( 1 === (int) ( $query['page'] ?? 1 ) ? array( 76979871, 22439234 ) : array( 146022717, 1084537 ) );
			$uploads = wp_upload_dir();
			$poster = $uploads['baseurl'] . '/' . $run . '/landscape.jpg';
			// Reuse a real fixture attachment, whichever filename the shared seed uses.
			$attachment = get_posts( array( 'post_type' => 'attachment', 'posts_per_page' => 1, 'fields' => 'ids', 'post_mime_type' => 'image', 'meta_key' => '_modula_wordpress_e2e_run', 'meta_value' => $run ) );
			if ( $attachment ) { $poster = wp_get_attachment_url( $attachment[0] ); }
			$rows = array();
			foreach ( $ids as $id ) {
				$rows[] = array( 'uri' => '/videos/' . $id, 'name' => 'Showcase video ' . $id, 'description' => 'Controlled Vimeo fixture', 'pictures' => array( 'base_link' => $poster ), 'width' => 640, 'height' => 360, 'privacy' => array( 'view' => '99005' === $match[1] && 22439234 === $id ? 'nobody' : 'anybody', 'embed' => 'public' ) );
			}
			$body = array( 'data' => $rows, 'total' => '99003' === $match[1] ? 0 : 4, 'paging' => array( 'next' => $ids && 1 === (int) ( $query['page'] ?? 1 ) ? $path . '?page=2&sort=default' : null ) );
		}
		return array( 'response' => array( 'code' => $status ), 'headers' => array( 'content-type' => 'application/json' ), 'body' => wp_json_encode( $body ), 'cookies' => array() );
	}, 10, 3 );
}, 0 );
