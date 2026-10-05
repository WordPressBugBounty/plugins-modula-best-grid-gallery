<?php
/** Temporary MU fixture: keep generated pages out of navigation on owned pages. */
// The locked runner installs this file and verifies/removes it during cleanup.
add_filter( 'get_pages', static function ( $pages ) {
	$lock = get_option( 'modula_wordpress_e2e_lock' );
	$marker = '_modula_wordpress_e2e_run';
	if ( is_admin() || ! is_array( $lock ) || empty( $lock['run'] ) || get_post_meta( get_queried_object_id(), $marker, true ) !== $lock['run'] ) {
		return $pages;
	}
	return array_values( array_filter( $pages, static function ( $page ) use ( $marker, $lock ) {
		return get_post_meta( $page->ID, $marker, true ) !== $lock['run'];
	} ) );
} );

// An owned, opt-in transport probe: no production ability or attachment access.
$probe_run = $_SERVER['HTTP_X_MODULA_E2E_VISUAL_PROBE'] ?? '';
$probe_lock = get_option( 'modula_wordpress_e2e_lock' );
if ( is_string( $probe_run ) && preg_match( '/^modula-e2e-[a-f0-9]{16}$/', $probe_run ) && ( $probe_lock['run'] ?? '' ) === $probe_run ) {
	add_action( 'wp_abilities_api_init', static function () use ( $probe_run ) {
		wp_register_ability( 'modula-e2e/visual-probe', array(
			'label' => 'Owned visual transport probe',
			'description' => 'Test-only paired result probe; never a production vision tool.',
			'category' => 'modula',
			'input_schema' => array( 'type' => 'object', 'properties' => array( 'shape' => array( 'type' => 'string', 'enum' => array( 'image', 'blocks' ) ) ), 'required' => array( 'shape' ), 'additionalProperties' => false ),
			'execute_callback' => static function () { return array( 'snapshot' => 'owned-snapshot' ); },
			'permission_callback' => static function () use ( $probe_run ) {
				return current_user_can( 'manage_options' ) && wp_get_current_user()->user_login === $probe_run;
			},
			'meta' => array( 'mcp' => array( 'public' => true, 'type' => 'tool' ) ),
		) );
	} );
	add_filter( 'mcp_adapter_default_server_config', static function ( $config ) {
		$config['tools'][] = 'modula-e2e/visual-probe';
		return $config;
	} );
	add_filter( 'mcp_adapter_tool_call_result', static function ( $result, $args, $name ) {
		if ( 'modula-e2e-visual-probe' !== $name || is_wp_error( $result ) ) { return $result; }
		// A known 1x1 PNG. Metadata and pixels originate in this same callback.
		$png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5p8AAAAASUVORK5CYII=';
		$content = array( array( 'type' => 'text', 'text' => wp_json_encode( $result ) ), array( 'type' => 'image', 'data' => $png, 'mimeType' => 'image/png' ) );
		if ( 'image' === $args['shape'] ) {
			return array( 'type' => 'image', 'results' => base64_decode( $png ), 'mimeType' => 'image/png', '_meta' => $result, 'content' => $content, 'structuredContent' => $result );
		}
		return array( 'content' => $content, 'structuredContent' => $result );
	}, 10, 3 );
}

// A non-UTC timezone only for the locked test actor's opt-in requests.
add_action( 'init', static function () {
	$run = $_SERVER['HTTP_X_MODULA_E2E_PUBLICATION_DATE'] ?? '';
	$lock = get_option( 'modula_wordpress_e2e_lock' );
	if ( ! is_string( $run ) || ! preg_match( '/^modula-e2e-[a-f0-9]{16}$/', $run ) || ( $lock['run'] ?? '' ) !== $run || wp_get_current_user()->user_login !== $run ) {
		return;
	}
	add_filter( 'pre_option_timezone_string', static function () { return 'Europe/Bucharest'; } );
} );

add_action( 'plugins_loaded', static function () {
	if ( defined( 'MODULA_PATH' ) && is_file( MODULA_PATH . 'apps/frontend-gallery/e2e/vimeo-showcase-fixtures.php' ) ) {
		require MODULA_PATH . 'apps/frontend-gallery/e2e/vimeo-showcase-fixtures.php';
	}
} );
