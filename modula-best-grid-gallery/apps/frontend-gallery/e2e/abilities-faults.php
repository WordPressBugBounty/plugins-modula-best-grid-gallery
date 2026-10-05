<?php
/** Temporary MU fixture: faults are confined to this run's actor and exact request. */
// Optional-dependency profiles are request scoped and require the owned runner token.
$folders_lock = get_option( 'modula_wordpress_e2e_lock' );
$folders_token = defined( 'WP_CLI' ) && WP_CLI ? getenv( 'MODULA_E2E_RUN' ) : ( $_SERVER['HTTP_X_MODULA_E2E_RUN'] ?? '' );
$folders_profile = defined( 'WP_CLI' ) && WP_CLI ? getenv( 'MODULA_E2E_FOLDERS' ) : ( $_SERVER['HTTP_X_MODULA_E2E_FOLDERS'] ?? '' );
if ( is_array( $folders_lock ) && $folders_token === $folders_lock['run'] ) {
	if ( 'absent' === $folders_profile && ! function_exists( 'wpchill_folders_init' ) ) {
		// The library entry intentionally does not load a second copy when this exists.
		function wpchill_folders_init( $config ) { return false; }
	}
	if ( 'uninitialized' === $folders_profile ) {
		add_action( 'plugins_loaded', static function () {
			remove_action( 'plugins_loaded', 'modula_init_wpchill_folders', 10 );
			remove_action( 'plugins_loaded', 'modula_pro_init_wpchill_folders', 5 );
		}, -999 );
	}
	if ( in_array( $folders_profile, array( 'missing-tables', 'missing-usage' ), true ) ) {
		// Real SQL against an absent request-local table namespace, never rename live tables.
		add_filter( 'query', static function ( $sql ) use ( $folders_profile ) {
			$names = 'missing-usage' === $folders_profile ? array( 'attachment_usage' ) : array( 'folders', 'folder_memberships', 'collections', 'collection_labels', 'favorites', 'attachment_usage' );
			global $wpdb;
			foreach ( $names as $name ) {
				$table = $wpdb->prefix . 'wpchill_' . $name;
				// Scope to Abilities so unrelated library hooks remain real and undisturbed.
				$ability_query = false;
				foreach ( debug_backtrace( DEBUG_BACKTRACE_IGNORE_ARGS, 20 ) as $frame ) {
					if ( 0 === strpos( $frame['class'] ?? '', 'Modula\\V2\\Abilities\\' ) ) { $ability_query = true; break; }
				}
				if ( $ability_query ) {
					$sql = str_replace( array( $table, addslashes( $wpdb->esc_like( $table ) ) ), array( $table . '_e2e_absent', addslashes( $wpdb->esc_like( $table . '_e2e_absent' ) ) ), $sql );
				}
			}
			return $sql;
		} );
	}
}
unset( $folders_lock, $folders_token, $folders_profile );

// This file is copied only by the locked Local runner and removed during cleanup.
add_filter( 'wp_register_ability_args', static function ( $args, $name ) {
	if ( ! in_array( $name, array( 'modula/update-media-folder', 'modula/update-attachment-text', 'modula/create-gallery', 'modula/update-gallery', 'modula/update-gallery-images', 'modula/update-gallery-items', 'modula/create-album', 'modula/update-album', 'modula/create-gallery-preset', 'modula/update-gallery-preset', 'modula/apply-gallery-preset' ), true ) ) {
		return $args;
	}
	$callback = $args['execute_callback'];
	$args['execute_callback'] = static function ( $input ) use ( $callback ) {
		$GLOBALS['modula_e2e_ability_input'] = $input;
		$result = call_user_func( $callback, $input );
		unset( $GLOBALS['modula_e2e_ability_input'] );
		$lock = get_option( 'modula_wordpress_e2e_lock' );
		if ( is_array( $lock ) && get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) === $lock['run'] && in_array( $input['request_id'] ?? '', array( $lock['run'] . '-lite-http-output', $lock['run'] . '-pro-http-output', $lock['run'] . '-lite-settings-http-output', $lock['run'] . '-pro-settings-http-output', $lock['run'] . '-lite-composition-http-output', $lock['run'] . '-pro-composition-http-output', $lock['run'] . '-lite-embedded-http-output', $lock['run'] . '-pro-embedded-http-output', $lock['run'] . '-pro-album-http-output', $lock['run'] . '-pro-preset-http-output' ), true ) && is_array( $result ) && 'succeeded' === $result['status'] ) {
			// Real core output-schema rejection after a real save.
			if ( isset( $result['album'] ) ) { unset( $result['album']['shortcode'] ); }
			elseif ( isset( $result['preset'] ) ) { unset( $result['preset']['title'] ); }
			else { unset( $result['gallery']['shortcode'] ); }
		}
		return $result;
	};
	return $args;
}, 10, 2 );
add_action( 'wp_insert_post', static function ( $id, $post, $update ) {
	$lock = get_option( 'modula_wordpress_e2e_lock' );
	if ( ! $update && is_array( $lock ) && get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) === $lock['run'] && in_array( $post->post_title, array( $lock['run'] . '-lite-concurrent', $lock['run'] . '-pro-concurrent' ), true ) ) {
		usleep( 800000 ); // Keep the actual claim active while other HTTP workers enter.
	}
}, 999, 3 );

// Pause precisely after revision checking, before the real settings SQL write.
add_filter( 'update_post_metadata', static function ( $check, $id, $key ) {
 $lock = get_option( 'modula_wordpress_e2e_lock' );
 $input = $GLOBALS['modula_e2e_ability_input'] ?? array();
 if ( is_array( $lock ) && get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) === $lock['run'] && 'modula_settings_v2' === $key && in_array( $input['request_id'] ?? '', array( $lock['run'] . '-lite-settings-race-api', $lock['run'] . '-pro-settings-race-api' ), true ) ) { usleep( 900000 ); }
 if ( is_array( $lock ) && get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) === $lock['run'] && 'modula-images' === $key && in_array( $input['request_id'] ?? '', array( $lock['run'] . '-lite-composition-race-api', $lock['run'] . '-pro-composition-race-api', $lock['run'] . '-lite-embedded-race-api', $lock['run'] . '-pro-embedded-race-api' ), true ) ) { usleep( 900000 ); }
 return $check;
}, 10, 3 );

// Observe the installed adapter defect without duplicating known warnings into
// the user's debug.log. The real schema/validation remains unchanged.
$modula_e2e_previous_handler = null;
$modula_e2e_previous_handler = set_error_handler( static function ( $level, $message, $file, $line ) use ( &$modula_e2e_previous_handler ) {
	$lock = function_exists( 'get_option' ) ? get_option( 'modula_wordpress_e2e_lock' ) : null;
	if ( ( ( E_WARNING === $level && 'Undefined array key "type"' === $message && ABSPATH . 'wp-includes/rest-api.php' === $file ) || ( E_USER_NOTICE === $level && false !== strpos( $message, 'rest_validate_value_from_schema' ) && false !== strpos( $message, 'schema keyword for output[data]' ) ) ) && is_array( $lock ) && get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) === $lock['run'] ) {
		foreach ( debug_backtrace( DEBUG_BACKTRACE_PROVIDE_OBJECT | DEBUG_BACKTRACE_IGNORE_ARGS, 16 ) as $frame ) {
			if ( isset( $frame['object'] ) && $frame['object'] instanceof WP_Ability && 'mcp-adapter/execute-ability' === $frame['object']->get_name() ) {
				$key = 'modula_e2e_adapter_warnings_' . $lock['run'];
				update_option( $key, (int) get_option( $key, 0 ) + 1, false );
				return true;
			}
		}
	}
	return $modula_e2e_previous_handler ? call_user_func( $modula_e2e_previous_handler, $level, $message, $file, $line ) : false;
}, E_WARNING | E_USER_NOTICE );
add_filter( 'mcp_adapter_default_server_config', static function ( $config ) {
	if ( ! class_exists( 'Modula_E2E_Expected_Access_Log', false ) ) {
		class Modula_E2E_Expected_Access_Log extends \WP\MCP\Infrastructure\ErrorHandling\ErrorLogMcpErrorHandler {
			public function log( string $message, array $context = array(), string $type = 'error' ): void {
				$lock = get_option( 'modula_wordpress_e2e_lock' );
				if ( is_array( $lock ) && ( $_SERVER['HTTP_X_MODULA_E2E_RUN'] ?? '' ) === $lock['run'] && 0 === get_current_user_id() && 0 === strpos( $message, 'Permission denied for MCP API access.' ) && array( 'HttpTransport::check_permission' ) === $context ) {
					$key = 'modula_e2e_adapter_denials_' . $lock['run'];
					update_option( $key, (int) get_option( $key, 0 ) + 1, false );
					return;
				}
				parent::log( $message, $context, $type );
			}
		}
	}
	$config['error_handler'] = Modula_E2E_Expected_Access_Log::class;
	return $config;
} );

// Each successful admission gets its own ownership marker; concurrent callers cannot
// overwrite a shared array. Only the locked runner's temporary actor is eligible.
add_action( 'added_option', static function ( $name, $value ) {
 if ( 0 !== strpos( $name, 'modula_ability_request_' ) ) { return; }
 $lock = get_option( 'modula_wordpress_e2e_lock' );
 if ( ! is_array( $lock ) || get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) !== $lock['run'] ) { return; }
 add_option( 'modula_e2e_owned_request_' . $lock['run'] . '_' . substr( $name, strlen( 'modula_ability_request_' ) ), $name, '', false );
}, 10, 2 );

// Hold a real media write after its revision/row lock, so an ordinary REST writer overlaps.
add_filter( 'query', static function ( $query ) {
 $input = $GLOBALS['modula_e2e_ability_input'] ?? array();
 if ( empty( $input['request_id'] ) || ! preg_match( '/-media-mcp-(folder|text)-race$/', $input['request_id'] ) || 0 !== strpos( $query, 'UPDATE ' ) ) { return $query; }
 $lock = get_option( 'modula_wordpress_e2e_lock' );
 if ( ! is_array( $lock ) || get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) !== $lock['run'] ) { return $query; }
 $prefix = $lock['run'];
 global $wpdb;
 foreach ( array( 'lite', 'pro' ) as $mode ) {
  $request = $input['request_id'] ?? '';
  if ( $prefix . '-' . $mode . '-media-mcp-folder-race' === $request && 0 === strpos( $query, 'UPDATE `' . $wpdb->prefix . 'wpchill_folders`' ) ) { usleep( 900000 ); }
  if ( $prefix . '-' . $mode . '-media-mcp-text-race' === $request && 0 === strpos( $query, 'UPDATE `' . $wpdb->posts . '`' ) ) { usleep( 900000 ); }
 }
 return $query;
}, 999 );

add_action( 'add_attachment', static function ( $id ) {
 $lock = get_option( 'modula_wordpress_e2e_lock' );
 if ( is_array( $lock ) && get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) === $lock['run'] ) {
  update_post_meta( $id, '_modula_wordpress_e2e_run', $lock['run'] );
 }
}, -1000 );

// Server-import and Diagnostics probes use only the runner's owned uploads directory.
add_filter( 'modula_gallery_upload_default_dir', static function ( $root ) {
 $lock = get_option( 'modula_wordpress_e2e_lock' );
 if ( is_array( $lock ) && ( $_SERVER['HTTP_X_MODULA_E2E_RUN'] ?? '' ) === $lock['run'] && 'server' === ( $_SERVER['HTTP_X_MODULA_E2E_OPERATIONS'] ?? '' ) && get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) === $lock['run'] ) {
  return wp_upload_dir( null, false )['basedir'] . '/' . $lock['run'];
 }
 return $root;
} );
add_filter( 'upload_dir', static function ( $data ) {
 $lock = get_option( 'modula_wordpress_e2e_lock' );
 if ( is_array( $lock ) && ( $_SERVER['HTTP_X_MODULA_E2E_RUN'] ?? '' ) === $lock['run'] && 'diagnostics' === ( $_SERVER['HTTP_X_MODULA_E2E_OPERATIONS'] ?? '' ) && get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) === $lock['run'] ) {
  $data['basedir'] .= '/' . $lock['run'] . '/operations-debug'; $data['error'] = false;
 }
 return $data;
} );

// Local macOS PHP-FPM's DNS resolver aborts after fork. Resolve in the native
// fixture, retaining real cURL, provider signing, TLS hostname and certificate checks.
add_action( 'http_api_curl', static function ( $handle, $args, $url ) {
	$lock = get_option( 'modula_wordpress_e2e_lock' );
	$host = wp_parse_url( $url, PHP_URL_HOST );
	if ( is_array( $lock ) && isset( $lock['storage_dns'][ $host ] ) && ( $_SERVER['HTTP_X_MODULA_E2E_STORAGE'] ?? '' ) === $lock['run'] && get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) === $lock['run'] ) {
		$port = wp_parse_url( $url, PHP_URL_PORT ) ?: ( 'https' === wp_parse_url( $url, PHP_URL_SCHEME ) ? 443 : 80 );
		curl_setopt( $handle, CURLOPT_RESOLVE, array( $host . ':' . $port . ':' . $lock['storage_dns'][ $host ] ) );
	}
}, 10, 3 );

// Entire-library fixture isolation only at the existing attachment-provider query.
// Ordinary queries, permissions, SQL writes and all provider requests remain real.
add_action( 'pre_get_posts', static function ( $query ) {
	$lock = get_option( 'modula_wordpress_e2e_lock' );
	$token = defined( 'WP_CLI' ) && WP_CLI ? getenv( 'MODULA_E2E_RUN' ) : ( $_SERVER['HTTP_X_MODULA_E2E_STORAGE'] ?? '' );
	if ( ! is_array( $lock ) || $token !== $lock['run'] || ! isset( $lock['cloud_library_ids'] ) || get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) !== $lock['run'] ) { return; }
	foreach ( debug_backtrace( DEBUG_BACKTRACE_IGNORE_ARGS, 15 ) as $frame ) {
		if ( 'WPChill\\Folders\\Objects\\Wp_Attachment_Object_Provider' === ( $frame['class'] ?? '' ) && 'list_objects' === $frame['function'] ) {
			foreach ( $lock['cloud_library_ids'] as $id ) { if ( get_post_meta( $id, '_modula_wordpress_e2e_run', true ) !== $lock['run'] ) { throw new RuntimeException( 'Library fixture ownership mismatch.' ); } }
			$query->set( 'post__in', $lock['cloud_library_ids'] ?: array( 0 ) );
			return;
		}
	}
} );

// HTTP-created Proofing accounts belong to the same owned actor and run as native fixtures.
add_action( 'user_register', static function ( $id ) {
	$lock = get_option( 'modula_wordpress_e2e_lock' );
	$run = $_SERVER['HTTP_X_MODULA_E2E_RUN'] ?? '';
	$user = get_userdata( $id );
	if ( is_array( $lock ) && $run === $lock['run'] && get_user_meta( get_current_user_id(), '_modula_wordpress_e2e_run', true ) === $run && $user && 0 === strpos( $user->user_login, $run . '-' ) ) {
		update_user_meta( $id, '_modula_wordpress_e2e_run', $run );
	}
} );
