<?php
/** Owned gallery credentials and actors for real REST and visitor checks. */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( 1 );
}

$admin = get_user_by( 'login', $run );
if ( ! $admin || get_user_meta( $admin->ID, $marker, true ) !== $run ) {
	WP_CLI::error( 'Owned primary actor required.' );
}
wp_set_current_user( $admin->ID );
$mode   = getenv( 'MODULA_E2E_MODE' );
$author = wp_insert_user(
	array(
		'user_login' => $run . '-credentials-' . $mode,
		'user_pass'  => wp_generate_password( 32, true, true ),
		'user_email' => $run . '-credentials-' . $mode . '@example.invalid',
		'role'       => 'author',
		'meta_input' => array( $marker => $run ),
	)
);
if ( is_wp_error( $author ) ) {
	WP_CLI::error( $author );
}
$catalog   = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$images    = get_post_meta( $catalog['galleries']['classic']['id'], 'modula-images', true );
$galleries = array();
foreach ( array( 'classic', 'beta', 'disabled', 'author', 'draft', 'private' ) as $name ) {
	$flat = array_merge(
		get_post_meta( $catalog['galleries']['classic']['id'], 'modula-settings', true ),
		array(
			'type'                      => 'grid',
			'grid_type'                 => '3',
			'gutter'                    => 16,
			'lazy_load'                 => 0,
			'enable_password'           => 'disabled' === $name ? 0 : 1,
			'password'                  => 'owned-rest-gallery-gate',
			'password_protect_username' => 'classic' === $name ? '' : 'owned-visitor',
			'password_protect_text'     => 'Owned gallery access',
		)
	);
	$id = modula_e2e_insert(
		array(
			'post_type'   => 'modula-gallery',
			'post_status' => 'publish',
			'post_author' => 'author' === $name ? $author : $admin->ID,
			'post_title'  => 'REST credentials ' . $mode . ' ' . $name,
		)
	);
	update_post_meta( $id, 'modula-settings', $flat );
	update_post_meta( $id, 'modula-images', array_slice( $images, 0, 1 ) );
	if ( 'classic' !== $name ) {
		update_post_meta( $id, '_modula_beta', 1 );
	}
	// Match classic protection saving, including its post_password synchronization.
	$_POST['modula-settings'] = $flat;
	wp_update_post( array( 'ID' => $id, 'post_password' => $flat['enable_password'] ? $flat['password'] : '' ) );
	unset( $_POST['modula-settings'] );
	if ( in_array( $name, array( 'draft', 'private' ), true ) ) {
		wp_update_post( array( 'ID' => $id, 'post_status' => $name ) );
	}
	$page_id = modula_e2e_insert(
		array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_title'   => 'REST credentials visitor ' . $mode . ' ' . $name,
			'post_content' => '[modula id="' . $id . '"]',
		)
	);
	$galleries[ $name ] = array(
		'id'       => $id,
		'page'     => get_permalink( $page_id ),
		'editor'   => admin_url( 'post.php?post=' . $id . '&action=edit' ),
		'password' => $flat['password'],
		'username' => $flat['password_protect_username'],
	);
}

$edge_cases = array();
foreach ( array(
	'missing'          => null,
	'empty'            => array(),
	'scalar'           => 'legacy-invalid',
	'null-credentials' => array( 'password' => null, 'password_protect_username' => null, 'gutter' => 17 ),
) as $name => $value ) {
	$id = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'publish', 'post_title' => 'REST edge ' . $mode . ' ' . $name ) );
	delete_post_meta( $id, 'modula-settings' );
	if ( null !== $value ) {
		// Deliberately malformed legacy storage must bypass normal settings repair
		// during setup. Assertions still exercise the actual HTTP read boundary.
		global $wpdb;
		$wpdb->insert( $wpdb->postmeta, array( 'post_id' => $id, 'meta_key' => 'modula-settings', 'meta_value' => maybe_serialize( $value ) ) );
		wp_cache_delete( $id, 'post_meta' );
	}
	$edge_cases[ $name ] = $id;
}

$block_page = modula_e2e_insert(
	array(
		'post_type'    => 'page',
		'post_status'  => 'draft',
		'post_title'   => 'REST Gutenberg consumer ' . $mode,
		'post_content' => '<!-- wp:modula/gallery ' . wp_json_encode( array( 'id' => $galleries['classic']['id'], 'galleryType' => 'gallery' ) ) . ' /-->',
	)
);

// Use real WordPress session credentials for a second actor. The enclosing runner
// stores this privately, removes owned users at cleanup, and never prints it.
wp_set_current_user( $author );
$expires = time() + HOUR_IN_SECONDS;
$token   = WP_Session_Tokens::get_instance( $author )->create( $expires );
$cookie  = wp_generate_auth_cookie( $author, $expires, 'logged_in', $token );
$_COOKIE[ LOGGED_IN_COOKIE ] = $cookie;
modula_e2e_output(
	array(
		'galleries'      => $galleries,
		'edge_cases'     => $edge_cases,
		'block_editor'   => admin_url( 'post.php?post=' . $block_page . '&action=edit' ),
		'author_headers' => array( 'Cookie' => LOGGED_IN_COOKIE . '=' . $cookie, 'X-WP-Nonce' => wp_create_nonce( 'wp_rest' ) ),
	)
);
