<?php
/**
 * Local-only fixture operations, invoked by WP-CLI from run.cjs.
 * No HTTP endpoint, existing user credentials, or production-site support.
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	exit( 1 );
}

$action = getenv( 'MODULA_E2E_ACTION' );
$run    = getenv( 'MODULA_E2E_RUN' );
$key    = 'modula_wordpress_e2e_lock';
$marker = '_modula_wordpress_e2e_run';

if ( ! preg_match( '/^modula-e2e-[a-f0-9]{16}$/', $run ) || 'http://localhost:10003' !== untrailingslashit( get_option( 'siteurl' ) ) || is_multisite() ) {
	WP_CLI::error( 'Only the designated single-site localhost:10003 dev installation is supported.' );
}

require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/user.php';

function modula_e2e_output( $value ) {
	WP_CLI::line( 'MODULA_E2E_JSON:' . wp_json_encode( $value, JSON_UNESCAPED_SLASHES ) );
}

function modula_e2e_insert( $data ) {
	$run = getenv( 'MODULA_E2E_RUN' );
	$marker = '_modula_wordpress_e2e_run';
	// Stable visible text also keeps the theme's automatic page menu comparable.
	// Ownership and unique URLs continue to use the random run identifier.
	$data['post_name']  = sanitize_title( $run . ' ' . $data['post_title'] );
	$data['post_title'] = 'Modula E2E ' . $data['post_title'];
	$data['meta_input'][ $marker ] = $run;
	$id = wp_insert_post( $data, true );
	if ( is_wp_error( $id ) ) {
		WP_CLI::error( $id );
	}
	return $id;
}

if ( 'begin' === $action ) {
	$plugins = get_plugins();
	$owned   = array();
	foreach ( $plugins as $file => $plugin ) {
		$directory = realpath( WP_PLUGIN_DIR . '/' . dirname( $file ) );
		if ( realpath( getenv( 'MODULA_E2E_LITE_ROOT' ) ) === $directory ) {
			$owned['lite'] = $file;
		}
		if ( realpath( getenv( 'MODULA_E2E_PRO_ROOT' ) ) === $directory ) {
			$owned['pro'] = $file;
		}
	}
	if ( count( $owned ) !== 2 || ! is_plugin_active( $owned['lite'] ) || version_compare( $plugins[ $owned['pro'] ]['Version'], '3.0.0', '<' ) ) {
		WP_CLI::error( 'Expected active workspace Lite and installed Compatible Pro symlinks.' );
	}
	$state = array( 'run' => $run, 'active_plugins' => get_option( 'active_plugins' ), 'plugins' => $owned, 'ability_cleanup_event' => wp_next_scheduled( 'modula_abilities_cleanup' ), 'ability_cleanup_cursor' => get_option( 'modula_ability_cleanup_cursor', null ) );
	if ( ! add_option( $key, $state, '', false ) ) {
		WP_CLI::error( 'Another run owns the site lock. Recover that run before starting another.' );
	}
	modula_e2e_output( array_merge( $state, array( 'wordpress' => get_bloginfo( 'version' ), 'php' => PHP_VERSION, 'mcp_adapter_version' => $plugins['mcp-adapter/mcp-adapter.php']['Version'] ?? null, 'plugin_versions' => array_map( function ( $file ) use ( $plugins ) { return $plugins[ $file ]['Version']; }, $owned ) ) ) );
	return;
}

$state = get_option( $key );
if ( ! is_array( $state ) || $state['run'] !== $run ) {
	WP_CLI::error( 'This run does not own the site lock; refusing to mutate the site.' );
}

/** Atomic config edits keep Local bootable if the process is interrupted. */
function modula_e2e_write_config( $path, $contents, $run ) {
	$temp = dirname( $path ) . '/.' . $run . '-config.php';
	$mode = fileperms( $path ) & 0777;
	if ( strlen( $contents ) !== file_put_contents( $temp, $contents, LOCK_EX ) || file_get_contents( $temp ) !== $contents || ! chmod( $temp, $mode ) || ! rename( $temp, $path ) ) {
		@unlink( $temp );
		WP_CLI::error( 'Could not atomically update the owned configuration fixture; recovery lock retained.' );
	}
}

if ( 'media-trash-prepare' === $action ) {
	$config_path = ABSPATH . 'wp-config.php';
	$config = file_get_contents( $config_path );
	if ( false === $config || false !== strpos( $config, 'MEDIA_TRASH' ) ) { WP_CLI::error( 'Media trash fixture requires the existing default configuration.' ); }
	$block = "\n// Begin owned media trash fixture {$run}\nif ( ( \$_SERVER['HTTP_X_MODULA_E2E_MEDIA_TRASH'] ?? '' ) === '{$run}' ) { define( 'MEDIA_TRASH', true ); }\n// End owned media trash fixture {$run}\n";
	$state['media_trash_config_block'] = $block;
	update_option( $key, $state, false );
	$patched = preg_replace( '/<\?php/', '<?php' . $block, $config, 1, $count );
	if ( 1 !== $count ) { WP_CLI::error( 'Could not prepare owned media trash fixture.' ); }
	modula_e2e_write_config( $config_path, $patched, $run );
	modula_e2e_output( array( 'prepared' => true ) );
	return;
}

if ( 'mode' === $action ) {
	if ( 'lite' === getenv( 'MODULA_E2E_MODE' ) ) {
		deactivate_plugins( $state['plugins']['pro'], true );
	} elseif ( 'pro' === getenv( 'MODULA_E2E_MODE' ) ) {
		$result = activate_plugin( $state['plugins']['pro'], '', false, true );
		if ( is_wp_error( $result ) ) {
			WP_CLI::error( $result );
		}
	} else {
		WP_CLI::error( 'Unknown plugin mode.' );
	}
	modula_e2e_output( get_option( 'active_plugins' ) );
	return;
}

if ( 'restore' === $action || 'cleanup' === $action ) {
	foreach ( $state['ability_site_options'] ?? array() as $option => $original ) {
		if ( $original['exists'] ) { update_option( $option, $original['value'] ); } else { delete_option( $option ); }
	}
	// Preserve the exact original activation order as well as membership.
	update_option( 'active_plugins', $state['active_plugins'] );
	if ( 'cleanup' === $action ) {
		$owned_actors = get_users( array( 'meta_key' => $marker, 'meta_value' => $run, 'fields' => 'ID' ) );
		global $wpdb;
		$transfer_state = new \WPChill\Folders\Storage\Folder_Transfer_State();
		$active_transfer = $transfer_state->get();
		if ( $active_transfer && in_array( (string) ( $active_transfer['actor_id'] ?? 0 ), array_map( 'strval', $owned_actors ), true ) ) { $transfer_state->clear(); }
		foreach ( $wpdb->get_results( $wpdb->prepare( "SELECT option_name,option_value FROM {$wpdb->options} WHERE option_name LIKE %s", $wpdb->esc_like( 'wpchill_folders_transfer_result_' ) . '%' ), ARRAY_A ) as $transfer_option ) {
			$transfer_row = maybe_unserialize( $transfer_option['option_value'] );
			if ( is_array( $transfer_row ) && in_array( (string) ( $transfer_row['actor_id'] ?? 0 ), array_map( 'strval', $owned_actors ), true ) ) { delete_option( $transfer_option['option_name'] ); wp_clear_scheduled_hook( 'wpchill_folders_expire_transfer', array( $transfer_row['id'] ) ); }
		}
		foreach ( $state['storage_objects'] ?? array() as $object ) {
			if ( 0 !== strpos( $object['key'], $run . '/' ) && 0 !== strpos( $object['key'], $run . '-' ) ) { WP_CLI::error( 'Remote fixture ownership mismatch.' ); }
			$connection = \WPChill\Folders\Rest\Connections_Controller::service()->find( $object['connection_id'] );
			if ( ! $connection || is_wp_error( ( new \WPChill\Folders\Storage\S3_Compatible_Object_Store() )->delete( $connection, $object['key'] ) ) ) { WP_CLI::error( 'Owned remote fixture cleanup failed; recovery lock retained.' ); }
			$id = ( new \WPChill\Folders\Storage\Option_Provider_Map_Repository() )->find_attachment_id( $object['connection_id'], $object['key'] );
			if ( $id ) { ( new \WPChill\Folders\Storage\Option_Provider_Map_Repository() )->delete( $id ); }
		}

		foreach ( $state['transfer_local_files'] ?? array() as $owned_file ) {
			if ( 0 !== strpos( basename( $owned_file ), $run . '-' ) ) { WP_CLI::error( 'Local transfer fixture ownership mismatch.' ); }
			if ( is_file( $owned_file ) && ! unlink( $owned_file ) ) { WP_CLI::error( 'Owned local transfer fixture cleanup failed.' ); }
		}

		if ( isset( $state['media_trash_config_block'] ) ) {
			$config_path = ABSPATH . 'wp-config.php';
			$config = file_get_contents( $config_path );
			if ( false === $config ) { WP_CLI::error( 'Could not read Local config; recovery lock retained.' ); }
			$clean = str_replace( $state['media_trash_config_block'], '', $config, $removed );
			if ( $removed > 1 || false !== strpos( $clean, $run ) ) { WP_CLI::error( 'Owned media trash fixture changed; preserving recovery lock.' ); }
			if ( 1 === $removed ) { modula_e2e_write_config( $config_path, $clean, $run ); }
			// Both interruption windows (before insertion/after removal) are recoverable.
			$temp = ABSPATH . '.' . $run . '-config.php';
			if ( is_file( $temp ) && ! unlink( $temp ) ) { WP_CLI::error( 'Owned config temporary file could not be removed.' ); }
			unset( $state['media_trash_config_block'] );
			update_option( $key, $state, false );
		}
		$actor_posts = $owned_actors ? get_posts( array( 'post_type' => array( 'modula-gallery', 'modula-album', 'modula-defaults', 'defaults-albums' ), 'post_status' => array_keys( get_post_stati() ), 'posts_per_page' => -1, 'fields' => 'ids', 'author__in' => $owned_actors ) ) : array();
		$ids = get_posts( array( 'post_type' => array( 'page', 'modula-gallery', 'modula-album', 'modula-defaults', 'defaults-albums', 'attachment' ), 'post_status' => array_keys( get_post_stati() ), 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => $marker, 'meta_value' => $run ) );
		$ids = array_unique( array_merge( $ids, $actor_posts ) );
		global $wpdb;
		$deleted_folders = array();
		if ( $owned_actors ) {
			$actors_sql = implode( ',', array_map( 'absint', $owned_actors ) );
			$deleted_folders = $wpdb->get_col( $wpdb->prepare( "SELECT id FROM {$wpdb->prefix}wpchill_folders WHERE owner_user_id IN ($actors_sql) OR name LIKE %s", $wpdb->esc_like( $run . '-' ) . '%' ) );
			if ( $wpdb->last_error ) { WP_CLI::error( 'Owned folder lookup failed; preserving recovery lock.' ); }
			foreach ( $deleted_folders as $folder_id ) {
				// Ownership is the fresh test actor, including interrupted fixture setup.
				if ( false === $wpdb->delete( $wpdb->prefix . 'wpchill_folder_memberships', array( 'folder_id' => $folder_id ), array( '%d' ) ) || false === $wpdb->delete( $wpdb->prefix . 'wpchill_folders', array( 'id' => $folder_id ), array( '%d' ) ) ) {
					WP_CLI::error( 'Owned folder cleanup failed; preserving recovery lock.' );
				}
			}
		}
		$collection_ids = $wpdb->get_col( $wpdb->prepare( "SELECT id FROM {$wpdb->prefix}wpchill_collections WHERE name LIKE %s", $wpdb->esc_like( $run . '-' ) . '%' ) );
		foreach ( $collection_ids as $collection_id ) {
			\WPChill\Folders\Rest\Collections_Controller::service()->delete( (int) $collection_id );
		}
		// Proofing records have no post foreign key; remove only rows for owned galleries.
		foreach ( array( 'modula_image_proofing_invitations', 'modula_image_proofing_selections' ) as $suffix ) {
			$table = $wpdb->prefix . $suffix;
			if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $table ) ) ) ) {
				foreach ( $ids as $owned_id ) { if ( false === $wpdb->delete( $table, array( 'gallery_id' => $owned_id ), array( '%d' ) ) ) { WP_CLI::error( 'Owned Proofing cleanup failed; preserving recovery lock.' ); } }
			}
		}
		foreach ( $ids as $owned_id ) {
			$wpdb->delete( $wpdb->prefix . 'wpchill_favorites', array( 'object_id' => $owned_id, 'object_type' => 'attachment' ) );
			$wpdb->delete( $wpdb->prefix . 'wpchill_collection_labels', array( 'object_id' => $owned_id, 'object_type' => 'attachment' ) );
		}
		foreach ( $owned_actors as $actor ) {
			// Test request ids all start with the owned run; derive exact actor/site keys.
				foreach ( get_option( 'modula_e2e_ability_requests_' . $run, array() ) as $request ) {
					$digest = hash( 'sha256', get_current_blog_id() . ':' . $actor . ':' . $request );
					delete_option( \Modula\V2\Abilities\Requests::PREFIX . $digest );
					delete_option( 'modula_ability_result_' . $digest );
				}
		}
		$owned_requests = $wpdb->get_results( $wpdb->prepare( "SELECT option_name,option_value FROM {$wpdb->options} WHERE option_name LIKE %s", $wpdb->esc_like( 'modula_e2e_owned_request_' . $run . '_' ) . '%' ), ARRAY_A );
		foreach ( $owned_requests as $owned ) {
			$request_key = $owned['option_value'];
			if ( preg_match( '/^modula_ability_request_[a-f0-9]{64}$/', $request_key ) ) { delete_option( $request_key ); delete_option( str_replace( 'modula_ability_request_', 'modula_ability_result_', $request_key ) ); }
			delete_option( $owned['option_name'] );
		}
		delete_option( 'modula_e2e_ability_requests_' . $run );
		$observed_adapter_warnings = (int) get_option( 'modula_e2e_adapter_warnings_' . $run, 0 );
		$observed_adapter_denials = (int) get_option( 'modula_e2e_adapter_denials_' . $run, 0 );
		delete_option( 'modula_e2e_adapter_warnings_' . $run );
		delete_option( 'modula_e2e_adapter_denials_' . $run );
		$fault_file = WPMU_PLUGIN_DIR . '/' . $run . '-abilities.php';
		if ( is_file( $fault_file ) ) {
			if ( hash_file( 'sha256', $fault_file ) !== hash_file( 'sha256', __DIR__ . '/abilities-faults.php' ) || ! unlink( $fault_file ) ) {
				WP_CLI::error( 'Owned ability fault file could not be verified/removed; preserving recovery lock.' );
			}
		}
		$compatibility_file = WPMU_PLUGIN_DIR . '/' . $run . '-pro-compatibility.php';
		if ( is_file( $compatibility_file ) && ( hash_file( 'sha256', $compatibility_file ) !== hash_file( 'sha256', __DIR__ . '/abilities-pro-compatibility-bootstrap.php' ) || ! unlink( $compatibility_file ) ) ) { WP_CLI::error( 'Owned Pro compatibility fixture could not be removed.' ); }
		$visitor_file = WPMU_PLUGIN_DIR . '/' . $run . '-visitor.php';
		if ( is_file( $visitor_file ) && ( hash_file( 'sha256', $visitor_file ) !== hash_file( 'sha256', __DIR__ . '/visitor-fixtures.php' ) || ! unlink( $visitor_file ) ) ) {
			WP_CLI::error( 'Owned visitor fixture could not be verified/removed; preserving recovery lock.' );
		}
		if ( empty( $state['ability_cleanup_event'] ) ) { wp_clear_scheduled_hook( 'modula_abilities_cleanup' ); }
		if ( null === ( $state['ability_cleanup_cursor'] ?? null ) ) { delete_option( 'modula_ability_cleanup_cursor' ); } else { update_option( 'modula_ability_cleanup_cursor', $state['ability_cleanup_cursor'], false ); }
		foreach ( $state['watermark_galleries'] ?? array() as $gallery_id ) {
			if ( get_post_meta( $gallery_id, $marker, true ) !== $run ) { WP_CLI::error( 'Watermark cleanup ownership changed.' ); }
			$directory = wp_get_upload_dir()['basedir'] . '/modula/gallery-' . $gallery_id;
			foreach ( glob( $directory . '/' . $run . '-*' ) ?: array() as $owned_file ) { if ( is_file( $owned_file ) && ! is_link( $owned_file ) ) { wp_delete_file( $owned_file ); } }
			if ( is_dir( $directory ) && ! rmdir( $directory ) ) { WP_CLI::error( 'Owned watermark backup cleanup failed.' ); }
		}
		// Remove referring fixture documents before attachments; honor the real usage guard.
		usort( $ids, static function ( $a, $b ) { return (int) ( 'attachment' === get_post_type( $a ) ) <=> (int) ( 'attachment' === get_post_type( $b ) ); } );
		foreach ( $ids as $id ) {
			if ( 'modula-gallery' === get_post_type( $id ) ) {
				foreach ( get_comments( array( 'post_id' => $id, 'status' => 'all', 'fields' => 'ids' ) ) as $comment_id ) {
					WPChill_Notifications::remove_notification( "modula-$id-new-comment-$comment_id" );
				}
			}
			if ( 'attachment' === get_post_type( $id ) ) {
				$deleted = wp_delete_attachment( $id, true );
			} else {
				$deleted = wp_delete_post( $id, true );
			}
			if ( ! $deleted ) {
				WP_CLI::error( 'Could not remove fixture ' . $id . '; keeping the recovery lock.' );
			}
		}
		$users = get_users( array( 'meta_key' => $marker, 'meta_value' => $run, 'fields' => 'ID' ) );
		foreach ( $users as $user_id ) {
			if ( ! wp_delete_user( $user_id ) ) {
				WP_CLI::error( 'Could not remove the temporary user; keeping the recovery lock.' );
			}
		}
		$upload = wp_upload_dir();
		$folder = $upload['basedir'] . '/' . $run;
		// Only the Diagnostics fixture subtree belongs to this run; never touch the user's log.
		$debug_root = $folder . '/operations-debug';
		foreach ( array( '/modula/debug/modula-debug.jsonl', '/modula/debug/index.php', '/modula/debug/.htaccess' ) as $suffix ) { if ( is_file( $debug_root . $suffix ) ) { unlink( $debug_root . $suffix ); } }
		foreach ( array( '/modula/debug', '/modula', '' ) as $suffix ) { if ( is_dir( $debug_root . $suffix ) ) { rmdir( $debug_root . $suffix ); } }
		// Also remove files left if attachment creation failed mid-seed.
		foreach ( glob( $folder . '/*' ) ?: array() as $file ) {
			if ( is_file( $file ) && ! is_link( $file ) ) {
				wp_delete_file( $file );
			}
		}
		if ( is_dir( $folder ) && ! rmdir( $folder ) ) {
			WP_CLI::error( 'Could not remove the uploads folder; keeping the recovery lock.' );
		}
		delete_option( $key );
	}
	modula_e2e_output( array( 'active_plugins' => get_option( 'active_plugins' ), 'restored' => get_option( 'active_plugins' ) === $state['active_plugins'], 'cleaned' => 'cleanup' === $action, 'observed_adapter_schema_warnings' => $observed_adapter_warnings ?? 0, 'observed_adapter_expected_denials' => $observed_adapter_denials ?? 0, 'deleted_posts' => $ids ?? array(), 'deleted_users' => $users ?? array(), 'deleted_folders' => $deleted_folders ?? array() ) );
	return;
}

if ( 'abilities-transport-prepare' === $action ) {
	$fault_file = WPMU_PLUGIN_DIR . '/' . $run . '-abilities.php';
	if ( ! is_file( $fault_file ) && ( ! wp_mkdir_p( WPMU_PLUGIN_DIR ) || ! copy( __DIR__ . '/abilities-faults.php', $fault_file ) ) ) {
		WP_CLI::error( 'Owned ability transport fixture could not be installed.' );
	}
	modula_e2e_output( array( 'prepared' => true ) );
	return;
}

if ( 'abilities-pro-compatibility-prepare' === $action ) {
	$state['pro_compatibility_root'] = getenv( 'MODULA_E2E_RUN_DIR' );
	foreach ( array( 'modula_image_licensing_option', 'modula_pro_active_extensions', 'modula_pro_current_plan', 'modula_pro_license_data' ) as $option ) {
		$value = get_option( $option, null );
		$state['ability_site_options'][ $option ] = array( 'exists' => null !== $value, 'value' => $value );
	}

	update_option( $key, $state, false );
	if ( ! copy( __DIR__ . '/abilities-pro-compatibility-bootstrap.php', WPMU_PLUGIN_DIR . '/' . $run . '-pro-compatibility.php' ) ) { WP_CLI::error( 'Compatibility fixture could not be installed.' ); }
	modula_e2e_output( array( 'prepared' => true ) );
	return;
}
if ( 'abilities-pro-compatibility' === $action ) {
	require __DIR__ . '/abilities-pro-compatibility.php';
	return;
}

if ( 'abilities-folders' === $action ) {
	require __DIR__ . '/abilities-folders.php';
	return;
}

if ( 'abilities-native-without-mcp' === $action ) {
	$users = get_users( array( 'meta_key' => $marker, 'meta_value' => $run, 'fields' => 'ID' ) );
	wp_set_current_user( $users[0] );
	if ( class_exists( '\WP\MCP\Core\McpAdapter' ) ) {
		WP_CLI::error( 'Adapter must actually be absent from native-only process.' );
	}
	$native = wp_get_ability( 'modula/discover' );
	$result = $native ? $native->execute( array() ) : null;
	if ( null === $result || is_wp_error( $result ) ) {
		WP_CLI::error( 'Native discovery must work without the adapter loaded.' );
	}
	modula_e2e_output( array( 'adapter_loaded' => false, 'native' => $result ) );
	return;
}

if ( in_array( $action, array( 'abilities-creation', 'abilities-creation-crash', 'abilities-creation-native-only', 'abilities-creation-prepare' ), true ) ) {
	require __DIR__ . '/abilities-creation.php';
	return;
}

if ( in_array( $action, array( 'abilities-cloud-jobs-interrupt', 'abilities-cloud-jobs-interrupted-read' ), true ) ) {
	wp_set_current_user( get_user_by( 'login', $run )->ID );
	$fixture = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/pro/abilities-cloud-jobs-native-only.json' ), true );
	$item = $fixture['crash_item'];
	$request_id = $run . '-cloud-interruption';
	if ( 'abilities-cloud-jobs-interrupted-read' === $action ) {
		add_filter( 'modula_abilities_time', static function ( $time ) { return $time + 301; } );
		$outcome = wp_get_ability( 'modula/recover-request' )->execute( array( 'request_id' => $request_id ) );
		if ( 'uncertain' !== $outcome['status'] || 1 !== $outcome['storage']['remote_deleted'] || 'remote' !== $outcome['storage']['phase'] || get_post( $item['id'] ) ) { WP_CLI::error( 'Interrupted cloud checkpoint not recovered.' ); }
		modula_e2e_output( $outcome ); exit;
	}
	if ( get_post_meta( $item['id'], $marker, true ) !== $run ) { WP_CLI::error( 'Owned cloud interruption target required.' ); }
	$input = array( 'request_id' => $request_id, 'id' => $item['id'], 'connection_id' => $fixture['connection_id'], 'key' => $item['key'], 'revision' => \Modula\V2\Abilities\Revision::document( $item['id'] ), 'storage_revision' => \Modula\V2\Abilities\Revision::organization() );
	add_action( 'updated_option', static function ( $option, $old, $value ) use ( $request_id ) {
		if ( 0 === strpos( $option, \Modula\V2\Abilities\Requests::PREFIX ) && is_array( $value ) && 'modula/delete-storage-object' === ( $value['operation'] ?? '' ) && 1 === ( $value['storage']['remote_deleted'] ?? 0 ) ) {
			modula_e2e_output( array( 'terminated_after_first_delete' => true, 'request_id' => $request_id ) );
			exit; // End this owned CLI process before final outcome persistence or next DELETE.
		}
	}, 10, 3 );
	wp_get_ability( 'modula/delete-storage-object' )->execute( $input );
	WP_CLI::error( 'Interruption checkpoint was not reached.' );
}

if ( 'abilities-cloud-jobs-process' === $action ) {
	wp_set_current_user( get_user_by( 'login', $run )->ID );
	$transfer = ( new \WPChill\Folders\Storage\Folder_Transfer_State() )->get();
	if ( ! $transfer || (int) $transfer['actor_id'] !== get_current_user_id() ) { WP_CLI::error( 'Owned transfer required.' ); }
	foreach ( $transfer['members'] as $member ) { if ( get_post_meta( $member['attachment_id'], $marker, true ) !== $run || 0 !== strpos( $member['destination_key'], $run . '/' ) ) { WP_CLI::error( 'Owned transfer member required.' ); } }
	modula_e2e_output( \WPChill\Folders\Rest\Folder_Transfers_Controller::service()->process_next_batch() ); exit;
}

if ( 'abilities-proofing' === $action ) { require __DIR__ . '/abilities-proofing.php'; exit; }
if ( 'abilities-css-ai' === $action ) { require __DIR__ . '/abilities-css-ai.php'; exit; }
if ( in_array( $action, array( 'abilities-instagram-ai', 'abilities-instagram-ai-native' ), true ) ) { require __DIR__ . '/abilities-instagram-ai.php'; exit; }
if ( in_array( $action, array( 'abilities-watermark-video', 'abilities-watermark-video-native' ), true ) ) { require __DIR__ . '/abilities-watermark-video.php'; exit; }

if ( in_array( $action, array( 'abilities-cloud-jobs', 'abilities-cloud-jobs-native-only' ), true ) ) { require __DIR__ . '/abilities-cloud-jobs.php'; exit; }

if ( in_array( $action, array( 'abilities-storage', 'abilities-storage-native-only', 'abilities-storage-http-prepare' ), true ) ) {
	require __DIR__ . '/abilities-storage.php';
	return;
}

if ( in_array( $action, array( 'abilities-operations', 'abilities-operations-native-only', 'abilities-operations-http-prepare', 'abilities-operations-http-inspect' ), true ) ) {
	require __DIR__ . '/abilities-operations.php';
	return;
}

if ( in_array( $action, array( 'abilities-administration', 'abilities-administration-native-only' ), true ) ) {
	require __DIR__ . '/abilities-administration.php';
	return;
}

if ( in_array( $action, array( 'abilities-media', 'abilities-media-native-only' ), true ) ) {
	require __DIR__ . '/abilities-media.php';
	exit;
}

if ( in_array( $action, array( 'abilities-presets', 'abilities-presets-native-only' ), true ) ) {
	require __DIR__ . '/abilities-presets.php';
	exit;
}

if ( in_array( $action, array( 'abilities-albums', 'abilities-albums-native-only' ), true ) ) {
	require __DIR__ . '/abilities-albums.php';
	exit;
}

if ( in_array( $action, array( 'abilities-batch', 'abilities-batch-native-only', 'abilities-batch-crash' ), true ) ) {
	require __DIR__ . '/abilities-batch.php';
	return;
}

if ( in_array( $action, array( 'abilities-lifecycle', 'abilities-lifecycle-native-only' ), true ) ) {
	require __DIR__ . '/abilities-lifecycle.php';
	return;
}

if ( in_array( $action, array( 'abilities-embedded', 'abilities-embedded-native-only' ), true ) ) {
	require __DIR__ . '/abilities-embedded.php';
	return;
}

if ( in_array( $action, array( 'abilities-composition', 'abilities-composition-native-only' ), true ) ) {
	require __DIR__ . '/abilities-composition.php';
	return;
}

if ( in_array( $action, array( 'abilities-settings', 'abilities-settings-native-only' ), true ) ) {
	require __DIR__ . '/abilities-settings.php';
	return;
}

if ( 'abilities-discovery' === $action ) {
	require __DIR__ . '/abilities-discovery.php';
	return;
}

if ( 'legacy-rest-credentials' === $action ) {
	require __DIR__ . '/legacy-rest-credentials.php';
	exit;
}

if ( 'gallery-business-operations' === $action ) {
	require __DIR__ . '/gallery-business-operations.php';
	return;
}

if ( 'seed' !== $action ) {
	WP_CLI::error( 'Unknown fixture action.' );
}

$visitor_file = WPMU_PLUGIN_DIR . '/' . $run . '-visitor.php';
if ( ! wp_mkdir_p( WPMU_PLUGIN_DIR ) || ! copy( __DIR__ . '/visitor-fixtures.php', $visitor_file ) ) {
	WP_CLI::error( 'Owned visitor fixture could not be installed.' );
}

$user_id = wp_insert_user( array( 'user_login' => $run, 'user_pass' => getenv( 'MODULA_E2E_PASSWORD' ), 'role' => 'administrator', 'user_email' => $run . '@example.invalid', 'meta_input' => array( $marker => $run ) ) );
if ( is_wp_error( $user_id ) ) {
	WP_CLI::error( $user_id );
}
wp_set_current_user( $user_id );

$uploads = wp_upload_dir();
$folder  = $uploads['basedir'] . '/' . $run;
wp_mkdir_p( $folder );
if ( ! copy( __DIR__ . '/fixtures/slider.mp4', $folder . '/sample.mp4' ) ) {
	WP_CLI::error( 'Could not create the local video fixture.' );
}
add_image_size( 'modula-e2e-small', 320, 240, true );
add_image_size( 'modula-e2e-medium', 640, 480, true );
add_image_size( 'modula-e2e-large', 1280, 960, true );
// Same ratio as the standard thumbnail, but a different crop origin.
add_image_size( 'modula-e2e-left-crop', 300, 300, array( 'left', 'top' ) );
$images      = array();
$attachments = array();
for ( $i = 1; $i <= 9; $i++ ) {
	$file   = $folder . '/image-' . $i . '.jpg';
	$canvas = imagecreatetruecolor( 1600, 1200 );
	$color  = imagecolorallocate( $canvas, 30 + $i * 25, 50 + $i * 15, 180 - $i * 15 );
	imagefill( $canvas, 0, 0, $color );
	imagefilledrectangle( $canvas, 80, 80, 600 + $i * 80, 1000, imagecolorallocate( $canvas, 220, 220, 210 ) );
	if ( 9 === $i ) {
		// Detailed, deterministic image for transfer comparisons, independent of remote photos.
		for ( $y = 0; $y < 1200; $y++ ) {
			for ( $x = 0; $x < 1600; $x++ ) {
				$detail = ( $x * 13 + $y * 7 + ( $x * $y ) % 31 ) % 35;
				imagesetpixel( $canvas, $x, $y, imagecolorallocate( $canvas, 70 + (int) ( $x / 16 ) + $detail, 60 + (int) ( $y / 12 ) + $detail, 90 + $detail ) );
			}
		}
		imagefilledrectangle( $canvas, 200, 480, 320, 720, imagecolorallocate( $canvas, 230, 40, 30 ) );
	}
	imagestring( $canvas, 5, 100, 100, 'Modula E2E image ' . $i, imagecolorallocate( $canvas, 10, 10, 10 ) );
	imagejpeg( $canvas, $file, 85 );
	imagedestroy( $canvas );
	$id = wp_insert_attachment( array( 'post_title' => $run . ' image ' . $i, 'post_status' => 'inherit', 'post_mime_type' => 'image/jpeg', 'meta_input' => array( $marker => $run ) ), $file, 0, true );
	if ( is_wp_error( $id ) ) {
		WP_CLI::error( $id );
	}
	$metadata = wp_generate_attachment_metadata( $id, $file );
	wp_update_attachment_metadata( $id, $metadata );
	if ( 9 === $i ) {
		// Independent WordPress reference, plus an existing pre-fix crop cache.
		$references = array();
		foreach ( array( 640, 960, 1200 ) as $edge ) {
			$reference = wp_get_image_editor( $file );
			$quality = $reference->get_quality();
			$reference->resize( $edge, $edge, true );
			$saved_reference = $reference->save( $folder . '/reference-' . $edge . '.jpg' );
			$references[ $edge ] = array( 'url' => $uploads['baseurl'] . '/' . $run . '/' . basename( $saved_reference['path'] ), 'bytes' => filesize( $saved_reference['path'] ), 'quality' => $quality );
			$old = wp_get_image_editor( $file );
			$old->resize( $edge, $edge, true );
			$old->set_quality( 100 );
			$old->save( $folder . '/image-9-' . $edge . 'x' . $edge . '_c.jpg' );
		}
	}
	foreach ( array( 'small' => 320, 'medium' => 640, 'large' => 1280 ) as $size => $width ) {
		$derivative = $metadata['sizes'][ 'modula-e2e-' . $size ] ?? array();
		if ( ( $derivative['width'] ?? 0 ) !== $width || ( $derivative['height'] ?? 0 ) !== (int) ( $width * 3 / 4 ) || ! is_file( $folder . '/' . ( $derivative['file'] ?? '' ) ) ) {
			WP_CLI::error( 'WordPress did not generate the required ' . $size . ' fixture derivative.' );
		}
	}
	update_post_meta( $id, '_wp_attachment_image_alt', 'E2E image ' . $i );
	if ( 8 === $i ) {
		// A real edited attachment retains a stale pre-edit derivative and the original download.
		$editor = wp_get_image_editor( $file );
		if ( is_wp_error( $editor ) || is_wp_error( $editor->crop( 400, 300, 800, 600 ) ) ) {
			WP_CLI::error( 'Could not crop the edited attachment fixture.' );
		}
		$edited = $editor->save( $folder . '/image-8-e1234567890123.jpg' );
		if ( is_wp_error( $edited ) ) {
			WP_CLI::error( $edited );
		}
		$stale = $metadata['sizes']['medium'];
		update_attached_file( $id, $edited['path'] );
		$metadata = wp_generate_attachment_metadata( $id, $edited['path'] );
		$metadata['sizes']['stale-before-edit'] = $stale;
		$metadata['original_image'] = basename( $file );
		// WordPress also permits a thumbnail-only edit with a separate crop/edit token.
		$thumbnail_editor = wp_get_image_editor( $edited['path'] );
		if ( is_wp_error( $thumbnail_editor ) || is_wp_error( $thumbnail_editor->crop( 50, 40, 150, 150 ) ) ) {
			WP_CLI::error( 'Could not crop the thumbnail-only edit fixture.' );
		}
		$thumbnail = $thumbnail_editor->save( $folder . '/image-8-e1234567890999-150x150.jpg' );
		if ( is_wp_error( $thumbnail ) ) {
			WP_CLI::error( $thumbnail );
		}
		$metadata['sizes']['thumbnail'] = array( 'file' => basename( $thumbnail['path'] ), 'width' => 150, 'height' => 150, 'mime-type' => 'image/jpeg' );
		wp_update_attachment_metadata( $id, $metadata );
	}
	$attachments[] = array( 'id' => $id, 'metadata' => $metadata, 'url' => wp_get_attachment_url( $id ) );
	if ( 9 === $i ) {
		$attachments[8]['references'] = $references;
	}
	if ( 7 === $i ) {
		// A separate attachment with no derivatives: never conflate its fallback with the normal case.
		$metadata['sizes'] = array();
		wp_update_attachment_metadata( $id, $metadata );
		$attachments[6]['metadata'] = $metadata;
	} elseif ( $i < 7 ) {
		$images[] = array( 'id' => $id, 'title' => 'E2E image ' . $i, 'alt' => 'E2E image ' . $i, 'description' => 'Deterministic fixture ' . $i, 'width' => 4, 'height' => 3, 'link' => '', 'halign' => 'center', 'valign' => 'middle' );
	}
}
$portrait_images = array();
foreach ( $images as $index => $image ) {
	$file = $folder . '/portrait-' . $index . '.jpg';
	$source = imagecreatefromjpeg( get_attached_file( $image['id'] ) );
	$height = 1500 + ( $index % 3 ) * 150;
	$canvas = imagecreatetruecolor( 1200, $height );
	imagecopyresampled( $canvas, $source, 0, 0, 0, 0, 1200, $height, 1600, 1200 );
	imagejpeg( $canvas, $file, 85 );
	imagedestroy( $source );
	imagedestroy( $canvas );
	$id = wp_insert_attachment( array( 'post_title' => 'Layout portrait ' . $index, 'post_status' => 'inherit', 'post_mime_type' => 'image/jpeg', 'meta_input' => array( $marker => $run ) ), $file, 0, true );
	if ( is_wp_error( $id ) ) {
		WP_CLI::error( $id );
	}
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $file ) );
	$portrait_images[] = array_merge( $image, array( 'id' => $id, 'width' => 1200, 'height' => $height ) );
}
$settings = array_merge( Modula_CPT_Fields_Helper::get_defaults(), array( 'type' => 'grid', 'grid_type' => '3', 'gutter' => 16, 'enable_responsive' => 1, 'tablet_columns' => 2, 'mobile_columns' => 1, 'lazy_load' => 1, 'shuffle' => 0, 'lightbox' => 'no-link', 'effect' => 'none' ) );
$galleries = array();
foreach ( array( 'visible', 'farOffscreen', 'hiddenTab', 'hiddenSlider', 'classic', 'responsive', 'responsiveCrop', 'mobileCrop', 'editedResponsive', 'automatic', 'lightboxCatalog', 'compactControls', 'privateAccess', 'download', 'layoutStability', 'abilitySettings', 'filterDefault', 'filterServer', 'filterFallback', 'filterClassic', 'filterDropdown', 'filterAppend' ) as $name ) {
	$id = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'privateAccess' === $name ? 'private' : 'publish', 'post_title' => $name ) );
	$flat = $settings;
	if ( 'layoutStability' === $name ) {
		$flat = array_merge( $flat, array( 'grid_type' => '4', 'gutter' => 10, 'tablet_gutter' => 10, 'mobile_gutter' => 10, 'grid_image_size' => 'large', 'lightbox' => 'fancybox' ) );
	}
	if ( 'download' === $name ) {
		$flat['lightbox'] = 'fancybox';
		$flat['lightbox_download'] = '1';
	}
	if ( 'hiddenSlider' === $name ) {
		$flat['type'] = 'slider';
	}
	if ( 'automatic' === $name ) {
		$flat['grid_type'] = 'automatic';
	}
	if ( in_array( $name, array( 'farOffscreen', 'lightboxCatalog' ), true ) ) {
		$flat['lightbox'] = 'fancybox';
		$flat['modula_deeplink'] = 1;
		$flat['customLinkName'] = 'e2egallery';
	}
	if ( 'farOffscreen' === $name ) {
		// Non-Slider gallery with enough images for a multi-thumb strip (Lite + Pro visitor).
		$flat['lightbox_thumbsAutoStart'] = 1;
	}
	if ( 'lightboxCatalog' === $name ) {
		$flat['showAllOnLightbox'] = 1;
		$flat['enable_pagination'] = 1;
		$flat['maxImagesCount'] = 2;
		$flat['enable_infinite_scroll'] = 0;
		$flat['enable_load_more'] = 0;
	}
	if ( in_array( $name, array( 'responsive', 'responsiveCrop', 'mobileCrop', 'editedResponsive' ), true ) ) {
		$flat['enable_optimization'] = 'disabled';
		$flat['thumbnail_optimization'] = 'lossless';
		$flat['lightbox_optimization'] = 'disabled';
		$flat['lightbox_download'] = '1';
	}
	if ( 'mobileCrop' === $name ) {
		// Match the live hover galleries, which have Image Guardian disabled.
		$flat['protection'] = false;
		$flat['blur_protection'] = false;
		$flat['url_protection'] = false;
	}
	if ( 'compactControls' === $name ) {
		$flat = array_merge( $flat, array( 'lightbox' => 'fancybox', 'enable_pagination' => 1, 'maxImagesCount' => 2, 'enable_infinite_scroll' => 0, 'enable_load_more' => 0, 'filters' => array( 'Landscape', 'Portrait' ), 'show_filter_bar' => 1, 'showFilterCount' => 1, 'enable_exif' => 1, 'exif_camera' => 1, 'url_protection' => 1, 'lightbox_download' => '1' ) );
	}
	if ( 0 === strpos( $name, 'filter' ) ) {
		$flat = array_merge( $flat, array( 'filters' => array( 'Red', 'Blue' ), 'show_filter_bar' => 1, 'showFilterCount' => 0, 'defaultActiveFilter' => 'All', 'lazy_load' => 0 ) );
		if ( in_array( $name, array( 'filterServer', 'filterAppend' ), true ) ) {
			$flat = array_merge( $flat, array( 'defaultActiveFilter' => 'Red', 'enable_pagination' => 1, 'maxImagesCount' => 1, 'enable_infinite_scroll' => 0, 'enable_load_more' => 'filterAppend' === $name ? 1 : 0 ) );
		} elseif ( in_array( $name, array( 'filterFallback', 'filterDropdown' ), true ) ) {
			$flat['defaultActiveFilter'] = 'Unavailable';
			if ( 'filterDropdown' === $name ) {
				$flat['dropdownFilters'] = 1;
				$flat['hideAllFilter'] = 1;
			}
		}
	}
	update_post_meta( $id, 'modula-settings', $flat );
	$rows = 'editedResponsive' === $name ? array( array_merge( $images[0], array( 'id' => $attachments[7]['id'] ) ) ) : $images;
	if ( 'layoutStability' === $name ) {
		$rows = $portrait_images;
	}
	if ( 'mobileCrop' === $name ) {
		$rows = array( array_merge( $images[0], array( 'id' => $attachments[8]['id'] ) ) );
	}
	if ( 'compactControls' === $name ) {
		foreach ( $rows as $index => &$row ) {
			$row['filters'] = $index < 3 ? 'Landscape' : 'Portrait';
			$row['exif_camera'] = 'E2E Camera';
		}
		unset( $row );
	}
	if ( 0 === strpos( $name, 'filter' ) ) {
		$rows = array_slice( $rows, 0, 4 );
		foreach ( $rows as $index => &$row ) {
			$row['filters'] = $index % 2 ? 'Red' : 'Blue';
		}
		unset( $row );
	}
	update_post_meta( $id, 'modula-images', $rows );
	wp_update_post( array( 'ID' => $id ) ); // Run the normal gallery save hooks.
	if ( ! in_array( $name, array( 'classic', 'filterClassic' ), true ) ) {
		update_post_meta( $id, '_modula_beta', 1 );
	}
	$galleries[ $name ] = array( 'id' => $id, 'editor' => admin_url( 'post.php?post=' . $id . '&action=edit' ), 'settings' => Modula\V2\Meta_Sync::get_settings_v2( $id ) );
}
$slider_settings = array_merge( $settings, array( 'type' => 'slider', 'slider_slidesToShow' => 1, 'slider_syncing' => 1, 'slider_syncing_nav_size' => 'auto', 'slider_syncing_nav_thumbnails_number' => 6, 'slider_syncing_nav_thumbnails_gutter' => 10, 'slider_image_size' => 'large', 'slider_lightbox' => 'no-link' ) );
foreach ( array( 'classicSlider', 'fallbackSlider', 'videoSlider', 'customSlider' ) as $name ) {
	$id = modula_e2e_insert( array( 'post_type' => 'modula-gallery', 'post_status' => 'publish', 'post_title' => $name ) );
	$rows = $images;
	if ( 'fallbackSlider' === $name ) {
		$rows = array( array_merge( $images[0], array( 'id' => $attachments[6]['id'] ) ), $images[1] );
	} elseif ( 'videoSlider' === $name ) {
		$rows[0] = array_merge( $images[0], array( 'id' => 'video_e2e', 'video_template' => 1, 'video_width' => 160, 'video_height' => 120, 'video_url' => $uploads['baseurl'] . '/' . $run . '/sample.mp4', 'video_thumbnail' => $attachments[0]['url'] ) );
	}
	update_post_meta( $id, 'modula-settings', $slider_settings );
	update_post_meta( $id, 'modula-images', $rows );
	wp_update_post( array( 'ID' => $id ) );
	if ( 'classicSlider' !== $name ) {
		update_post_meta( $id, '_modula_beta', 1 );
	}
	$galleries[ $name ] = array( 'id' => $id, 'editor' => admin_url( 'post.php?post=' . $id . '&action=edit' ) );
}
$album_id = modula_e2e_insert( array( 'post_type' => 'modula-album', 'post_status' => 'publish', 'post_title' => 'Slider album' ) );
update_post_meta( $album_id, 'modula-album-settings', array_merge( $slider_settings, array( 'album_type' => 'slider', 'type' => 'all' ) ) );
$members = array();
foreach ( array_slice( array_values( $galleries ), 0, 6 ) as $index => $member ) {
	$members[] = array( 'id' => $member['id'], 'itemType' => 'modula-gallery', 'cover' => $attachments[ $index ]['id'], 'width' => 4, 'height' => 3 );
}
update_post_meta( $album_id, 'modula-album-galleries', $members );

// Beta album for settings PATCH preserve (merge + opaque flat keys). Classic slider album stays untouched.
$beta_album_id = modula_e2e_insert( array( 'post_type' => 'modula-album', 'post_status' => 'publish', 'post_title' => 'Beta merge album' ) );
update_post_meta( $beta_album_id, '_modula_beta', 1 );
$beta_album_members = array_slice( $members, 0, 3 );
update_post_meta( $beta_album_id, 'modula-album-galleries', $beta_album_members );
update_post_meta(
	$beta_album_id,
	'modula-album-settings',
	array(
		'album_type'               => 'grid',
		'merge_items'              => '1',
		'gutter'                   => 18,
		'type'                     => '4',
		'ext_download_size'        => 'full',
		'integration_partner_flag' => 'keep-me',
	)
);
// Abilities mutate a dedicated album; the merge-settings journey keeps its seed.
$ability_album_id = modula_e2e_insert( array(
	'post_type' => 'modula-album', 'post_status' => 'publish', 'post_title' => 'Abilities album',
	'meta_input' => array(
		'_modula_beta' => 1,
		'modula-album-galleries' => $beta_album_members,
		'modula-album-settings' => get_post_meta( $beta_album_id, 'modula-album-settings', true ),
	),
) );
// Beta album for typed numeric/boolean round-trip (gutter=1, lazy_load ON).
$beta_typed_album_id = modula_e2e_insert( array( 'post_type' => 'modula-album', 'post_status' => 'publish', 'post_title' => 'Beta typed album' ) );
update_post_meta( $beta_typed_album_id, '_modula_beta', 1 );
update_post_meta( $beta_typed_album_id, 'modula-album-galleries', array_slice( $members, 0, 3 ) );
update_post_meta(
	$beta_typed_album_id,
	'modula-album-settings',
	array(
		'album_type'  => 'grid',
		'merge_items' => '1',
		'gutter'      => 20,
		'type'        => '4',
		'lazy_load'   => '0',
	)
);

// Beta album with WordPress post_password for title/status preserve journey.
$beta_protected_album_id = modula_e2e_insert(
	array(
		'post_type'     => 'modula-album',
		'post_status'   => 'publish',
		'post_title'    => 'Beta protected album',
		'post_password' => 'e2e-album-gate',
	)
);
update_post_meta( $beta_protected_album_id, '_modula_beta', 1 );
update_post_meta( $beta_protected_album_id, 'modula-album-galleries', array_slice( $members, 0, 2 ) );
update_post_meta(
	$beta_protected_album_id,
	'modula-album-settings',
	array(
		'album_type'      => 'grid',
		'merge_items'     => '1',
		'gutter'          => 12,
		'type'            => '4',
		'enable_password' => '1',
		'password'        => 'e2e-album-gate',
	)
);

// Real WP post update without classic modula-settings: password callback must not clear the gate.
if ( class_exists( '\Modula_Pro\Extensions\Password_Protect\Albums\Password_Protect' ) ) {
	$protect = \Modula_Pro\Extensions\Password_Protect\Albums\Password_Protect::get_instance();
	$prior_post = $_POST;
	$_POST      = array();
	$protect->save_extra_fields( $beta_protected_album_id, get_post( $beta_protected_album_id ) );
	$_POST = $prior_post;
	$after_probe = get_post( $beta_protected_album_id );
	if ( ! $after_probe || 'e2e-album-gate' !== (string) $after_probe->post_password ) {
		WP_CLI::error( 'Album password callback cleared post_password when modula-settings was omitted.' );
	}
}

// Classic sparse album (not Beta): Try the beta + open/migrate legacy defaults.
$classic_sparse_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Classic sparse album',
	)
);
update_post_meta( $classic_sparse_album_id, 'modula-album-galleries', array_slice( $members, 0, 3 ) );
update_post_meta(
	$classic_sparse_album_id,
	'modula-album-settings',
	array(
		'album_type' => 'grid',
		'gutter'     => 20,
		'type'       => '4',
	)
);

// Classic album for in-place Convert to beta (identity/shortcode/members).
$classic_convert_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Classic convert album',
	)
);
$classic_convert_members = array_slice( $members, 0, 2 );
update_post_meta( $classic_convert_album_id, 'modula-album-galleries', $classic_convert_members );
update_post_meta(
	$classic_convert_album_id,
	'modula-album-settings',
	array(
		'album_type'  => 'grid',
		'merge_items' => '1',
		'gutter'      => 14,
		'type'        => '3',
		'cursor'      => 'crosshair',
	)
);

// Classic password-protected album for Convert preserving WordPress post_password.
$classic_protected_album_id = modula_e2e_insert(
	array(
		'post_type'     => 'modula-album',
		'post_status'   => 'publish',
		'post_title'    => 'Classic protected album',
		'post_password' => 'e2e-classic-gate',
	)
);
update_post_meta( $classic_protected_album_id, 'modula-album-galleries', array_slice( $members, 0, 2 ) );
update_post_meta(
	$classic_protected_album_id,
	'modula-album-settings',
	array(
		'album_type'      => 'grid',
		'gutter'          => 16,
		'type'            => '4',
		'enable_password' => '1',
		'password'        => 'e2e-classic-gate',
	)
);

// Beta parent plus two nested albums: responsive CSS on the parent, sibling navigation on the second child.
$layout_parent_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta layout album',
	)
);
update_post_meta( $layout_parent_id, '_modula_beta', 1 );
$layout_child_a_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Layout child A',
		'post_parent' => $layout_parent_id,
	)
);
$layout_child_b_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Layout child B',
		'post_parent' => $layout_parent_id,
	)
);
update_post_meta( $layout_child_a_id, 'modula-album-galleries', array_slice( $members, 0, 1 ) );
update_post_meta( $layout_child_b_id, 'modula-album-galleries', array_slice( $members, 1, 1 ) );
update_post_meta(
	$layout_child_a_id,
	'modula-album-settings',
	array(
		'album_type' => 'grid',
		'type'       => '2',
		'gutter'     => 10,
	)
);
update_post_meta(
	$layout_child_b_id,
	'modula-album-settings',
	array(
		'album_type' => 'grid',
		'type'       => '2',
		'gutter'     => 10,
	)
);
update_post_meta(
	$layout_parent_id,
	'modula-album-galleries',
	array(
		array(
			'id'       => $layout_child_a_id,
			'itemType' => 'modula-album',
			'width'    => 1,
			'height'   => 1,
		),
		array(
			'id'       => $layout_child_b_id,
			'itemType' => 'modula-album',
			'width'    => 2,
			'height'   => 2,
		),
	)
);
update_post_meta(
	$layout_parent_id,
	'modula-album-settings',
	array(
		'album_type'        => 'grid',
		'type'              => '3',
		'gutter'            => 10,
		'tablet_gutter'     => 10,
		'mobile_gutter'     => 10,
		'tablet_columns'    => 2,
		'mobile_columns'    => 1,
		'enable_responsive' => '1',
		'album_width'       => 'auto',
		'width'             => '100%',
		'albums_navigation' => 'below',
		'merge_items'       => '0',
	)
);

// Beta album for image size / crop / member cover journeys.
$image_size_nested_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Image size nested',
	)
);
update_post_meta(
	$image_size_nested_id,
	'modula-album-galleries',
	array_slice( $members, 0, 1 )
);
update_post_meta(
	$image_size_nested_id,
	'modula-album-settings',
	array(
		'album_type' => 'grid',
		'type'       => '2',
		'gutter'     => 10,
	)
);
$beta_image_size_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta image size album',
	)
);
update_post_meta( $beta_image_size_album_id, '_modula_beta', 1 );
$image_size_members = array(
	array(
		'id'           => $members[0]['id'],
		'itemType'     => 'modula-gallery',
		'cover'        => $attachments[0]['id'],
		'shuffleCover' => '0',
		'width'        => 4,
		'height'       => 3,
	),
	array(
		'id'           => $members[1]['id'],
		'itemType'     => 'modula-gallery',
		'cover'        => $attachments[1]['id'],
		'shuffleCover' => '1',
		'width'        => 4,
		'height'       => 3,
	),
	array(
		'id'       => $image_size_nested_id,
		'itemType' => 'modula-album',
		'width'    => 2,
		'height'   => 2,
	),
);
update_post_meta( $beta_image_size_album_id, 'modula-album-galleries', $image_size_members );
update_post_meta(
	$beta_image_size_album_id,
	'modula-album-settings',
	array(
		'album_type'       => 'grid',
		'type'             => '4',
		'gutter'           => 10,
		'merge_items'      => '1',
		'image_size'       => 'medium',
		'image_dimensions' => array(
			'width'  => 0,
			'height' => 0,
		),
		'crop_images'      => '0',
	)
);

// Beta album for core Lightbox controls: image gallery + video-capable member.
$lightbox_image_gallery_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'Album lightbox images',
	)
);
update_post_meta(
	$lightbox_image_gallery_id,
	'modula-settings',
	array_merge(
		$settings,
		array(
			'lightbox' => 'fancybox',
		)
	)
);
$lightbox_image_rows = $images;
foreach ( $lightbox_image_rows as $index => &$lightbox_row ) {
	$lightbox_row['id'] = $attachments[ $index ]['id'];
}
unset( $lightbox_row );
wp_update_post(
	array(
		'ID'           => $attachments[0]['id'],
		'post_excerpt' => 'E2E album lightbox caption',
	)
);
update_post_meta( $lightbox_image_gallery_id, 'modula-images', $lightbox_image_rows );
wp_update_post( array( 'ID' => $lightbox_image_gallery_id ) );
update_post_meta( $lightbox_image_gallery_id, '_modula_beta', 1 );

$lightbox_video_gallery_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'Album lightbox video',
	)
);
update_post_meta(
	$lightbox_video_gallery_id,
	'modula-settings',
	array_merge(
		$settings,
		array(
			'lightbox' => 'fancybox',
		)
	)
);
// Real attachment id so album lightbox src resolves; Video filter swaps src to video_url.
$lightbox_video_rows = array(
	array_merge(
		$images[0],
		array(
			'id'              => $attachments[0]['id'],
			'video_template'  => 1,
			'video_width'     => 160,
			'video_height'    => 120,
			'video_url'       => $uploads['baseurl'] . '/' . $run . '/sample.mp4',
			'video_thumbnail' => $attachments[0]['url'],
		)
	),
	array_merge( $images[1], array( 'id' => $attachments[1]['id'] ) ),
);
update_post_meta( $lightbox_video_gallery_id, 'modula-images', $lightbox_video_rows );
wp_update_post( array( 'ID' => $lightbox_video_gallery_id ) );
update_post_meta( $lightbox_video_gallery_id, '_modula_beta', 1 );

$beta_lightbox_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta lightbox album',
	)
);
update_post_meta( $beta_lightbox_album_id, '_modula_beta', 1 );
update_post_meta(
	$beta_lightbox_album_id,
	'modula-album-galleries',
	array(
		array(
			'id'           => $lightbox_image_gallery_id,
			'itemType'     => 'modula-gallery',
			'cover'        => $attachments[0]['id'],
			'shuffleCover' => '0',
			'width'        => 4,
			'height'       => 3,
		),
		array(
			'id'           => $lightbox_video_gallery_id,
			'itemType'     => 'modula-gallery',
			'cover'        => $attachments[1]['id'],
			'shuffleCover' => '0',
			'width'        => 4,
			'height'       => 3,
		),
	)
);
update_post_meta(
	$beta_lightbox_album_id,
	'modula-album-settings',
	array(
		'album_type'                => 'grid',
		'type'                      => '4',
		'gutter'                    => 10,
		'merge_items'               => '1',
		'enable_lightbox'           => '1',
		'enable_navigation'         => '1',
		'loop_lightbox'             => '0',
		'show_image_title'          => '0',
		'show_image_caption'        => '0',
		'captionPosition'           => 'left',
		'lightbox_toolbar'          => '1',
		'lightbox_close'            => '1',
		'enable_thumbs'             => '0',
		'autostart_thumbs'          => '0',
		'lightbox_thumbsPosition'   => 'bottom',
		'enable_download'           => '0',
		'enable_zoom'               => '0',
		'enable_share'              => '1',
		'lightbox_facebook'         => '1',
		'lightbox_twitter'          => '0',
		'lightbox_whatsapp'         => '0',
		'lightbox_linkedin'         => '0',
		'lightbox_pinterest'        => '0',
		'lightbox_email'            => '0',
		'enable_play'               => '1',
		'enable_slideshow'          => '1',
		'slideshow_duration'        => 4500,
		'animation_effect'          => 'fade',
		'transition_effect'         => 'slide',
		'lightbox_background_color' => 'rgba(10,20,30,0.9)',
		'doubleClick'               => '0',
		'lightbox_infobar'          => '1',
	)
);

$captions_gallery_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'E2E album tile title',
	)
);
update_post_meta(
	$captions_gallery_id,
	'modula-settings',
	array_merge( $settings, array( 'lightbox' => 'no-link' ) )
);
$captions_gallery_rows = $images;
foreach ( $captions_gallery_rows as $index => &$captions_row ) {
	$captions_row['id'] = $attachments[ $index ]['id'];
}
unset( $captions_row );
update_post_meta( $captions_gallery_id, 'modula-images', $captions_gallery_rows );
wp_update_post( array( 'ID' => $captions_gallery_id ) );
update_post_meta( $captions_gallery_id, '_modula_beta', 1 );

$beta_captions_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta captions album',
	)
);
update_post_meta( $beta_captions_album_id, '_modula_beta', 1 );
update_post_meta(
	$beta_captions_album_id,
	'modula-album-galleries',
	array(
		array(
			'id'           => $captions_gallery_id,
			'itemType'     => 'modula-gallery',
			'title'        => 'E2E album tile title',
			'caption'      => 'E2E album tile caption',
			'cover'        => $attachments[0]['id'],
			'shuffleCover' => '0',
			'width'        => 4,
			'height'       => 3,
		),
	)
);
update_post_meta(
	$beta_captions_album_id,
	'modula-album-settings',
	array(
		'album_type'            => 'grid',
		'type'                  => '2',
		'gutter'                => 12,
		'effect'                => 'under',
		'hide_title'            => '0',
		'hide_description'      => '0',
		'titleColor'            => '#112233',
		'titleFontSize'         => 18,
		'mobileTitleFontSize'   => 11,
		'captionColor'          => '#445566',
		'captionFontSize'       => 15,
		'mobileCaptionFontSize' => 9,
		'enable_lightbox'       => '1',
		'show_image_title'      => '1',
		'show_image_caption'    => '0',
		'captionPosition'       => 'right',
		'display_image_count'   => '0',
	)
);

$beta_hover_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta hover album',
	)
);
update_post_meta( $beta_hover_album_id, '_modula_beta', 1 );
update_post_meta(
	$beta_hover_album_id,
	'modula-album-galleries',
	array(
		array(
			'id'           => $captions_gallery_id,
			'itemType'     => 'modula-gallery',
			'title'        => 'E2E hover tile',
			'caption'      => 'E2E hover caption',
			'alt'          => 'E2E hover cover',
			'cover'        => $attachments[0]['id'],
			'shuffleCover' => '0',
			'width'        => 4,
			'height'       => 3,
		),
	)
);
update_post_meta(
	$beta_hover_album_id,
	'modula-album-settings',
	array(
		'album_type'          => 'grid',
		'type'                => '2',
		'gutter'              => 14,
		'effect'              => 'under',
		'cursor'              => 'pointer',
		'uploadCursor'        => '0',
		'display_image_count' => '0',
		'imageCountColor'     => '#ffffff',
		'imageCountFontSize'  => 14,
		'hoverColor'          => '#112233',
		'backgroundColor'     => '#334455',
		'hoverOpacity'        => 40,
		'hoverPadding'        => 8,
		'hide_title'          => '0',
		'titleColor'          => '#aabbcc',
	)
);

$beta_download_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta download album',
	)
);
update_post_meta( $beta_download_album_id, '_modula_beta', 1 );

$download_gallery_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'Album download images',
	)
);
update_post_meta(
	$download_gallery_id,
	'modula-settings',
	array_merge( $settings, array( 'lightbox' => 'fancybox' ) )
);
$download_gallery_rows = array(
	array_merge( $images[0], array( 'id' => $attachments[0]['id'] ) ),
);
update_post_meta( $download_gallery_id, 'modula-images', $download_gallery_rows );
wp_update_post( array( 'ID' => $download_gallery_id ) );
update_post_meta( $download_gallery_id, '_modula_beta', 1 );

update_post_meta(
	$beta_download_album_id,
	'modula-album-galleries',
	array(
		array(
			'id'           => $download_gallery_id,
			'itemType'     => 'modula-gallery',
			'title'        => 'E2E download tile',
			'caption'      => 'E2E download caption',
			'alt'          => 'E2E download cover',
			'cover'        => $attachments[0]['id'],
			'shuffleCover' => '0',
			'width'        => 4,
			'height'       => 3,
		),
	)
);
update_post_meta(
	$beta_download_album_id,
	'modula-album-settings',
	array(
		'album_type'                             => 'grid',
		'type'                                   => '2',
		'gutter'                                 => 16,
		'merge_items'                            => '0',
		'enable_lightbox'                        => '1',
		'enable_download'                        => '1',
		'enable_download_albums'                 => '0',
		'download_gallery_button_albums'         => '1',
		'download_all_gallery_button_albums'     => '1',
		'download_all_lightbox_button_albums'    => '0',
		'download_image_sizes_albums'            => 'full',
		'download_all_label_albums'              => 'Download All Images',
		'download_all_position_albums'           => 'below_gallery',
		'download_all_hposition_albums'          => 'center',
		'custom_zip_name_albums'                 => '%%album_title%%',
	)
);

$beta_zoom_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta zoom album',
	)
);
update_post_meta( $beta_zoom_album_id, '_modula_beta', 1 );

$zoom_gallery_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'Album zoom images',
	)
);
update_post_meta(
	$zoom_gallery_id,
	'modula-settings',
	array_merge( $settings, array( 'lightbox' => 'fancybox' ) )
);
$zoom_gallery_rows = array(
	array_merge( $images[0], array( 'id' => $attachments[0]['id'] ) ),
);
update_post_meta( $zoom_gallery_id, 'modula-images', $zoom_gallery_rows );
wp_update_post( array( 'ID' => $zoom_gallery_id ) );
update_post_meta( $zoom_gallery_id, '_modula_beta', 1 );

update_post_meta(
	$beta_zoom_album_id,
	'modula-album-galleries',
	array(
		array(
			'id'           => $zoom_gallery_id,
			'itemType'     => 'modula-gallery',
			'title'        => 'E2E zoom tile',
			'caption'      => 'E2E zoom caption',
			'alt'          => 'E2E zoom cover',
			'cover'        => $attachments[0]['id'],
			'shuffleCover' => '0',
			'width'        => 4,
			'height'       => 3,
		),
	)
);
update_post_meta(
	$beta_zoom_album_id,
	'modula-album-settings',
	array(
		'album_type'                 => 'grid',
		'type'                       => '2',
		'gutter'                     => 16,
		'merge_items'                => '0',
		'enable_lightbox'            => '1',
		'enable_zoom'                => '1',
		'enable_zoom_albums'         => '0',
		'zoom_on_hover_albums'       => '1',
		'zoom_type_albums'           => 'window',
		'zoom_effect_albums'         => 'fade_in',
		'zoom_window_position_albums' => 'upper_left',
		'zoom_window_size_albums'     => 'medium',
		'zoom_lens_size_albums'       => 'medium',
		'zoom_lens_shape_albums'      => 'round',
		'zoom_tint_color_albums'      => '',
		'zoom_tint_opacity_albums'    => 0,
	)
);

// Beta album for Password Protect settings enable/change/disable (starts open).
$beta_password_settings_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta password settings album',
	)
);
update_post_meta( $beta_password_settings_album_id, '_modula_beta', 1 );
update_post_meta(
	$beta_password_settings_album_id,
	'modula-album-galleries',
	array_slice( $members, 0, 2 )
);
update_post_meta(
	$beta_password_settings_album_id,
	'modula-album-settings',
	array(
		'album_type'      => 'grid',
		'type'            => '2',
		'gutter'          => 16,
		'merge_items'     => '0',
		'enable_password' => '0',
		'password'        => '',
	)
);

// Beta album for EXIF displayExif enum (default|on|off) in Lightbox captions.
$beta_exif_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta EXIF album',
	)
);
update_post_meta( $beta_exif_album_id, '_modula_beta', 1 );

$exif_gallery_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'Album EXIF images',
	)
);
update_post_meta(
	$exif_gallery_id,
	'modula-settings',
	array_merge(
		$settings,
		array(
			'lightbox'     => 'fancybox',
			'enable_exif'  => 1,
			'exif_camera'  => 1,
			'exif_lens'    => 1,
			'exif_aperture'=> 1,
			'exif_iso'     => 1,
			'exif_date'    => 1,
			'exif_shutter_speed' => 1,
			'exif_focal_length'  => 1,
		)
	)
);
$exif_gallery_rows = array(
	array_merge(
		$images[0],
		array(
			'id'          => $attachments[0]['id'],
			'exif_camera' => 'E2E Album Camera',
		)
	),
);
update_post_meta( $exif_gallery_id, 'modula-images', $exif_gallery_rows );
wp_update_post( array( 'ID' => $exif_gallery_id ) );
update_post_meta( $exif_gallery_id, '_modula_beta', 1 );

update_post_meta(
	$beta_exif_album_id,
	'modula-album-galleries',
	array(
		array(
			'id'           => $exif_gallery_id,
			'itemType'     => 'modula-gallery',
			'cover'        => $attachments[0]['id'],
			'shuffleCover' => '0',
			'width'        => 4,
			'height'       => 3,
		),
	)
);
update_post_meta(
	$beta_exif_album_id,
	'modula-album-settings',
	array(
		'album_type'         => 'grid',
		'type'               => '2',
		'gutter'             => 16,
		'merge_items'        => '0',
		'enable_lightbox'    => '1',
		'show_image_caption' => '1',
		'show_image_title'   => '0',
		'displayExif'        => 'default',
	)
);

// Beta album for Image Guardian (right-click / blur / URL protection).
$beta_guardian_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta Guardian album',
	)
);
update_post_meta( $beta_guardian_album_id, '_modula_beta', 1 );

$guardian_gallery_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'Album Guardian images',
	)
);
update_post_meta(
	$guardian_gallery_id,
	'modula-settings',
	array_merge( $settings, array( 'lightbox' => 'fancybox' ) )
);
$guardian_gallery_rows = array(
	array_merge( $images[0], array( 'id' => $attachments[0]['id'] ) ),
);
update_post_meta( $guardian_gallery_id, 'modula-images', $guardian_gallery_rows );
wp_update_post( array( 'ID' => $guardian_gallery_id ) );
update_post_meta( $guardian_gallery_id, '_modula_beta', 1 );

update_post_meta(
	$beta_guardian_album_id,
	'modula-album-galleries',
	array(
		array(
			'id'           => $guardian_gallery_id,
			'itemType'     => 'modula-gallery',
			'title'        => 'E2E guardian tile',
			'caption'      => 'E2E guardian caption',
			'alt'          => 'E2E guardian cover',
			'cover'        => $attachments[0]['id'],
			'shuffleCover' => '0',
			'width'        => 4,
			'height'       => 3,
		),
	)
);
update_post_meta(
	$beta_guardian_album_id,
	'modula-album-settings',
	array(
		'album_type'      => 'grid',
		'type'            => '2',
		'gutter'          => 16,
		'merge_items'     => '0',
		'enable_lightbox' => '1',
		'protection'      => '0',
		'url_protection'  => '0',
		'blur_protection' => '0',
	)
);

// Beta custom-grid album for public-result inspection (editor ↔ anonymous).
$beta_public_result_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta public result album',
	)
);
update_post_meta( $beta_public_result_album_id, '_modula_beta', 1 );

$public_result_gallery_a_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'Public result gallery A',
	)
);
update_post_meta(
	$public_result_gallery_a_id,
	'modula-settings',
	array_merge( $settings, array( 'lightbox' => 'fancybox' ) )
);
$public_result_gallery_a_rows = array(
	array_merge( $images[0], array( 'id' => $attachments[0]['id'] ) ),
	array_merge( $images[1], array( 'id' => $attachments[1]['id'] ) ),
);
update_post_meta( $public_result_gallery_a_id, 'modula-images', $public_result_gallery_a_rows );
wp_update_post( array( 'ID' => $public_result_gallery_a_id ) );
update_post_meta( $public_result_gallery_a_id, '_modula_beta', 1 );

$public_result_gallery_b_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'Public result gallery B',
	)
);
update_post_meta(
	$public_result_gallery_b_id,
	'modula-settings',
	array_merge( $settings, array( 'lightbox' => 'fancybox' ) )
);
$public_result_gallery_b_rows = array(
	array_merge( $images[2], array( 'id' => $attachments[2]['id'] ) ),
);
update_post_meta( $public_result_gallery_b_id, 'modula-images', $public_result_gallery_b_rows );
wp_update_post( array( 'ID' => $public_result_gallery_b_id ) );
update_post_meta( $public_result_gallery_b_id, '_modula_beta', 1 );

update_post_meta(
	$beta_public_result_album_id,
	'modula-album-galleries',
	array(
		array(
			'id'           => $public_result_gallery_a_id,
			'itemType'     => 'modula-gallery',
			'title'        => 'E2E public result tile A',
			'caption'      => 'E2E public result caption A',
			'cover'        => $attachments[0]['id'],
			'shuffleCover' => '0',
			'width'        => 1,
			'height'       => 1,
			// Editor-only cells: visitor Packery ignores these coordinates.
			'gridX'        => 3,
			'gridY'        => 2,
		),
		array(
			'id'           => $public_result_gallery_b_id,
			'itemType'     => 'modula-gallery',
			'title'        => 'E2E public result tile B',
			'caption'      => 'E2E public result caption B',
			'cover'        => $attachments[2]['id'],
			'shuffleCover' => '0',
			'width'        => 2,
			'height'       => 2,
			'gridX'        => 0,
			'gridY'        => 0,
		),
	)
);
update_post_meta(
	$beta_public_result_album_id,
	'modula-album-settings',
	array(
		'album_type'         => 'custom-grid',
		'type'               => '4',
		'gutter'             => 14,
		'merge_items'        => '0',
		'image_size'         => 'medium',
		'crop_images'        => '1',
		'effect'             => 'lily',
		'hoverColor'         => '#aa1122',
		'hoverOpacity'       => 65,
		'hide_title'         => '0',
		'hide_description'   => '0',
		'titleColor'         => '#00aabb',
		'titleFontSize'      => 17,
		'captionColor'       => '#bb6600',
		'captionFontSize'    => 13,
		'enable_lightbox'    => '1',
		'lightbox_toolbar'   => '1',
		'enable_thumbs'      => '0',
		'show_image_title'   => '1',
		'show_image_caption' => '0',
		'captionPosition'    => 'left',
	)
);

// Autosave deliberately changes settings and member cells; later layout/history
// journeys must still see their original seeds.
$autosave_albums = array();
foreach ( array( 'autosaveLayout' => $layout_parent_id, 'autosaveMembers' => $beta_public_result_album_id ) as $name => $source_id ) {
	$id = modula_e2e_insert( array(
		'post_type' => 'modula-album', 'post_status' => 'publish', 'post_title' => $name,
		'meta_input' => array(
			'_modula_beta' => 1,
			'modula-album-settings' => get_post_meta( $source_id, 'modula-album-settings', true ),
			'modula-album-galleries' => 'autosaveLayout' === $name ? $beta_album_members : get_post_meta( $source_id, 'modula-album-galleries', true ),
		),
	) );
	$autosave_albums[ $name ] = array( 'id' => $id, 'editor' => admin_url( 'post.php?post=' . $id . '&action=edit' ), 'galleryA' => $public_result_gallery_a_id );
}

// Beta Grid album converted to Slider for editor ↔ inspection ↔ visitor parity.
$beta_slider_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta slider album',
	)
);
update_post_meta( $beta_slider_album_id, '_modula_beta', 1 );

$slider_gallery_a_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'Slider album gallery A',
	)
);
update_post_meta(
	$slider_gallery_a_id,
	'modula-settings',
	array_merge( $settings, array( 'lightbox' => 'fancybox' ) )
);
update_post_meta(
	$slider_gallery_a_id,
	'modula-images',
	array(
		array_merge( $images[0], array( 'id' => $attachments[0]['id'] ) ),
		array_merge( $images[1], array( 'id' => $attachments[1]['id'] ) ),
	)
);
wp_update_post( array( 'ID' => $slider_gallery_a_id ) );
update_post_meta( $slider_gallery_a_id, '_modula_beta', 1 );

$slider_gallery_b_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'Slider album gallery B',
	)
);
update_post_meta(
	$slider_gallery_b_id,
	'modula-settings',
	array_merge( $settings, array( 'lightbox' => 'fancybox' ) )
);
update_post_meta(
	$slider_gallery_b_id,
	'modula-images',
	array(
		array_merge( $images[2], array( 'id' => $attachments[2]['id'] ) ),
	)
);
wp_update_post( array( 'ID' => $slider_gallery_b_id ) );
update_post_meta( $slider_gallery_b_id, '_modula_beta', 1 );

$slider_gallery_c_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'Slider album gallery C',
	)
);
update_post_meta(
	$slider_gallery_c_id,
	'modula-settings',
	array_merge( $settings, array( 'lightbox' => 'fancybox' ) )
);
update_post_meta(
	$slider_gallery_c_id,
	'modula-images',
	array(
		array_merge( $images[3], array( 'id' => $attachments[3]['id'] ) ),
	)
);
wp_update_post( array( 'ID' => $slider_gallery_c_id ) );
update_post_meta( $slider_gallery_c_id, '_modula_beta', 1 );

update_post_meta(
	$beta_slider_album_id,
	'modula-album-galleries',
	array(
		array(
			'id'           => $slider_gallery_a_id,
			'itemType'     => 'modula-gallery',
			'title'        => 'E2E slider tile A',
			'caption'      => 'E2E slider caption A',
			'cover'        => $attachments[0]['id'],
			'shuffleCover' => '0',
			'width'        => 4,
			'height'       => 3,
		),
		array(
			'id'           => $slider_gallery_b_id,
			'itemType'     => 'modula-gallery',
			'title'        => 'E2E slider tile B',
			'caption'      => 'E2E slider caption B',
			'cover'        => $attachments[2]['id'],
			'shuffleCover' => '0',
			'width'        => 4,
			'height'       => 3,
		),
		array(
			'id'           => $slider_gallery_c_id,
			'itemType'     => 'modula-gallery',
			'title'        => 'E2E slider tile C',
			'caption'      => 'E2E slider caption C',
			'cover'        => $attachments[3]['id'],
			'shuffleCover' => '0',
			'width'        => 4,
			'height'       => 3,
		),
	)
);
update_post_meta(
	$beta_slider_album_id,
	'modula-album-settings',
	array(
		'album_type'  => 'grid',
		'type'        => '5',
		'gutter'      => 12,
		'merge_items' => '0',
	)
);

// Legacy album preset (flat-only, no password keys) for Apply preset journeys.
// defaults-albums CPT registers in admin only; WP-CLI seed still stores the type.
$album_layout_preset_id = modula_e2e_insert(
	array(
		'post_type'   => 'defaults-albums',
		'post_status' => 'publish',
		'post_title'  => 'E2E album layout preset',
	)
);
update_post_meta(
	$album_layout_preset_id,
	'modula-album-settings',
	array(
		'album_type' => 'grid',
		'type'       => '3',
		'gutter'     => 28,
	)
);

// Unprotected Beta album for Apply preset overwrite + members preserve.
$beta_apply_preset_album_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-album',
		'post_status' => 'publish',
		'post_title'  => 'Beta apply preset album',
	)
);
update_post_meta( $beta_apply_preset_album_id, '_modula_beta', 1 );
$apply_preset_members = array_slice( $members, 0, 2 );
update_post_meta( $beta_apply_preset_album_id, 'modula-album-galleries', $apply_preset_members );
update_post_meta(
	$beta_apply_preset_album_id,
	'modula-album-settings',
	array(
		'album_type'               => 'custom-grid',
		'type'                     => '4',
		'gutter'                   => 99,
		'merge_items'              => '1',
		'integration_partner_flag' => 'keep-me',
	)
);

// Protected Beta album: Apply preset omitting protection must keep the gate.
$beta_apply_preset_protected_album_id = modula_e2e_insert(
	array(
		'post_type'     => 'modula-album',
		'post_status'   => 'publish',
		'post_title'    => 'Beta apply preset protected album',
		'post_password' => 'e2e-apply-preset-gate',
	)
);
update_post_meta( $beta_apply_preset_protected_album_id, '_modula_beta', 1 );
update_post_meta(
	$beta_apply_preset_protected_album_id,
	'modula-album-galleries',
	array_slice( $members, 0, 2 )
);
update_post_meta(
	$beta_apply_preset_protected_album_id,
	'modula-album-settings',
	array(
		'album_type'      => 'grid',
		'type'            => '4',
		'gutter'          => 40,
		'merge_items'     => '0',
		'enable_password' => '1',
		'password'        => 'e2e-apply-preset-gate',
	)
);

$albums = array(
	'slider' => array(
		'id'     => $album_id,
		'editor' => admin_url( 'post.php?post=' . $album_id . '&action=edit' ),
	),
	'betaMerge' => array(
		'id'     => $beta_album_id,
		'editor' => admin_url( 'post.php?post=' . $beta_album_id . '&action=edit' ),
		'opaque' => array(
			'ext_download_size'        => 'full',
			'integration_partner_flag' => 'keep-me',
		),
	),
	'abilityAlbum' => array( 'id' => $ability_album_id ),
	'betaTyped' => array(
		'id'     => $beta_typed_album_id,
		'editor' => admin_url( 'post.php?post=' . $beta_typed_album_id . '&action=edit' ),
	),
	'betaProtected' => array(
		'id'       => $beta_protected_album_id,
		'editor'   => admin_url( 'post.php?post=' . $beta_protected_album_id . '&action=edit' ),
		'password' => 'e2e-album-gate',
	),
	'classicSparse' => array(
		'id'     => $classic_sparse_album_id,
		'editor' => admin_url( 'post.php?post=' . $classic_sparse_album_id . '&action=edit' ),
	),
	'classicConvert' => array(
		'id'     => $classic_convert_album_id,
		'editor' => admin_url( 'post.php?post=' . $classic_convert_album_id . '&action=edit' ),
		'members' => count( $classic_convert_members ),
	),
	'classicProtected' => array(
		'id'       => $classic_protected_album_id,
		'editor'   => admin_url( 'post.php?post=' . $classic_protected_album_id . '&action=edit' ),
		'password' => 'e2e-classic-gate',
	),
	'betaLayout' => array(
		'id'      => $layout_parent_id,
		'editor'  => admin_url( 'post.php?post=' . $layout_parent_id . '&action=edit' ),
		'childId' => $layout_child_b_id,
		'childA'  => $layout_child_a_id,
	),
	'betaImageSize' => array(
		'id'              => $beta_image_size_album_id,
		'editor'          => admin_url( 'post.php?post=' . $beta_image_size_album_id . '&action=edit' ),
		'nestedId'        => $image_size_nested_id,
		'coverAttachment' => $attachments[0]['id'],
		'altCover'        => $attachments[3]['id'],
		'galleryA'        => $members[0]['id'],
		'galleryB'        => $members[1]['id'],
	),
	'betaLightbox' => array(
		'id'             => $beta_lightbox_album_id,
		'editor'         => admin_url( 'post.php?post=' . $beta_lightbox_album_id . '&action=edit' ),
		'imageGalleryId' => $lightbox_image_gallery_id,
		'videoGalleryId' => $lightbox_video_gallery_id,
		'captionHint'    => 'E2E album lightbox caption',
	),
	'betaCaptions' => array(
		'id'           => $beta_captions_album_id,
		'editor'       => admin_url( 'post.php?post=' . $beta_captions_album_id . '&action=edit' ),
		'galleryId'    => $captions_gallery_id,
		'tileTitle'    => 'E2E album tile title',
		'tileCaption'  => 'E2E album tile caption',
	),
	'betaHover' => array(
		'id'               => $beta_hover_album_id,
		'editor'           => admin_url( 'post.php?post=' . $beta_hover_album_id . '&action=edit' ),
		'galleryId'        => $captions_gallery_id,
		'cursorAttachment' => $attachments[1]['id'],
	),
	'betaDownload' => array(
		'id'             => $beta_download_album_id,
		'editor'         => admin_url( 'post.php?post=' . $beta_download_album_id . '&action=edit' ),
		'imageGalleryId' => $download_gallery_id,
		'label'          => 'E2E Album Bundle',
		'zipHint'        => 'Beta download album',
	),
	'betaZoom' => array(
		'id'        => $beta_zoom_album_id,
		'editor'    => admin_url( 'post.php?post=' . $beta_zoom_album_id . '&action=edit' ),
		'galleryId' => $zoom_gallery_id,
	),
	'betaPasswordSettings' => array(
		'id'       => $beta_password_settings_album_id,
		'editor'   => admin_url( 'post.php?post=' . $beta_password_settings_album_id . '&action=edit' ),
		'password' => 'e2e-album-settings-gate',
	),
	'betaExif' => array(
		'id'             => $beta_exif_album_id,
		'editor'         => admin_url( 'post.php?post=' . $beta_exif_album_id . '&action=edit' ),
		'imageGalleryId' => $exif_gallery_id,
		'cameraHint'     => 'E2E Album Camera',
	),
	'betaGuardian' => array(
		'id'             => $beta_guardian_album_id,
		'editor'         => admin_url( 'post.php?post=' . $beta_guardian_album_id . '&action=edit' ),
		'imageGalleryId' => $guardian_gallery_id,
	),
	'autosaveLayout' => $autosave_albums['autosaveLayout'],
	'autosaveMembers' => $autosave_albums['autosaveMembers'],
	'betaPublicResult' => array(
		'id'        => $beta_public_result_album_id,
		'editor'    => admin_url( 'post.php?post=' . $beta_public_result_album_id . '&action=edit' ),
		'galleryA'  => $public_result_gallery_a_id,
		'galleryB'  => $public_result_gallery_b_id,
		'tileTitle' => 'E2E public result tile A',
	),
	'betaSlider' => array(
		'id'        => $beta_slider_album_id,
		'editor'    => admin_url( 'post.php?post=' . $beta_slider_album_id . '&action=edit' ),
		'galleryA'  => $slider_gallery_a_id,
		'galleryB'  => $slider_gallery_b_id,
		'galleryC'  => $slider_gallery_c_id,
		'tileTitle' => 'E2E slider tile A',
	),
	'betaApplyPreset' => array(
		'id'       => $beta_apply_preset_album_id,
		'editor'   => admin_url( 'post.php?post=' . $beta_apply_preset_album_id . '&action=edit' ),
		'members'  => count( $apply_preset_members ),
		'presetId' => $album_layout_preset_id,
		'opaque'   => 'keep-me',
	),
	'betaApplyPresetProtected' => array(
		'id'       => $beta_apply_preset_protected_album_id,
		'editor'   => admin_url( 'post.php?post=' . $beta_apply_preset_protected_album_id . '&action=edit' ),
		'password' => 'e2e-apply-preset-gate',
		'presetId' => $album_layout_preset_id,
	),
	'albumLayoutPreset' => array(
		'id' => $album_layout_preset_id,
	),
);

$shortcode = function ( $name ) use ( $galleries ) { return '[modula id="' . $galleries[ $name ]['id'] . '"]'; };
$contents = array(
	'visible' => $shortcode( 'visible' ),
	'abilitySettings' => $shortcode( 'abilitySettings' ),
	'comments' => $shortcode( 'farOffscreen' ),
	'lightboxCatalog' => $shortcode( 'lightboxCatalog' ),
	'compactControls' => $shortcode( 'compactControls' ),
	'privateAccess' => $shortcode( 'privateAccess' ),
	'download' => $shortcode( 'download' ),
	'automatic' => $shortcode( 'visible' ) . '<button type="button" onclick="document.getElementById(\'e2e-hidden-automatic\').hidden=false;window.dispatchEvent(new Event(\'resize\'))">Show gallery tab</button><section id="e2e-hidden-automatic" hidden>' . $shortcode( 'automatic' ) . '</section>',
	'responsive' => $shortcode( 'responsive' ),
	'responsiveCrop' => $shortcode( 'responsiveCrop' ),
	'mobileCrop' => $shortcode( 'mobileCrop' ),
	'mobileCropHidden' => '<button type="button" onclick="document.getElementById(\'e2e-hidden-crop\').hidden=false;window.dispatchEvent(new Event(\'resize\'))">Show crop tab</button><section id="e2e-hidden-crop" hidden>' . $shortcode( 'mobileCrop' ) . '</section>',
	'editedResponsive' => $shortcode( 'editedResponsive' ),
	'classic' => $shortcode( 'classic' ),
	'mixed' => $shortcode( 'classic' ) . $shortcode( 'hiddenTab' ),
	'filterDefault' => $shortcode( 'filterDefault' ) . $shortcode( 'filterFallback' ),
	'filterServer' => $shortcode( 'filterServer' ),
	'filterAppend' => $shortcode( 'filterAppend' ),
	'filterDropdown' => $shortcode( 'filterDropdown' ),
	'filterClassic' => $shortcode( 'filterClassic' ),
	'filterClassicFirst' => $shortcode( 'filterClassic' ) . $shortcode( 'filterServer' ),
	'filterBetaFirst' => $shortcode( 'filterServer' ) . $shortcode( 'filterClassic' ),
	'layoutStability' => '<style>body:has(#e2e-layout-stage) { margin:0; } body:has(#e2e-layout-stage) header, body:has(#e2e-layout-stage) .entry-header { display:none; } #e2e-layout-stage { width:calc(100vw - 120px); max-width:1230px; margin:0 auto; font-family:Arial,sans-serif; } #e2e-layout-after { height:100px; background:#ddd; }</style><div id="e2e-layout-stage">' . $shortcode( 'layoutStability' ) . '<p id="e2e-layout-after">Content after the gallery</p></div>',
	'layoutStabilityOffscreen' => '<div style="height:6000px" aria-hidden="true"></div>' . $shortcode( 'layoutStability' ),
	'layoutStabilityHidden' => '<button type="button" onclick="document.getElementById(\'e2e-layout-hidden\').hidden=false;window.dispatchEvent(new Event(\'resize\'))">Show Parallax tab</button><section id="e2e-layout-hidden" hidden>' . $shortcode( 'layoutStability' ) . '</section>',
	'catalog' => '<h2>Visible gallery</h2>' . $shortcode( 'visible' ) . '<button type="button" onclick="document.getElementById(\'e2e-hidden-tab\').hidden=false;window.dispatchEvent(new Event(\'resize\'))">Show gallery tab</button><section id="e2e-hidden-tab" hidden>' . $shortcode( 'hiddenTab' ) . '</section><button type="button" onclick="document.getElementById(\'e2e-hidden-slider\').hidden=false;window.dispatchEvent(new Event(\'resize\'))">Show Slider tab</button><section id="e2e-hidden-slider" hidden>' . $shortcode( 'hiddenSlider' ) . '</section><div style="height:6000px" aria-hidden="true"></div><h2>Far-offscreen gallery</h2>' . $shortcode( 'farOffscreen' ),
	'slider' => '<button type="button" onclick="document.getElementById(\'e2e-hidden-slider\').hidden=false;window.dispatchEvent(new Event(\'resize\'))">Show Slider tab</button><section id="e2e-hidden-slider" hidden>' . $shortcode( 'hiddenSlider' ) . '</section>',
	'classicSlider' => $shortcode( 'classicSlider' ),
	'fallbackSlider' => $shortcode( 'fallbackSlider' ),
	'videoSlider' => $shortcode( 'videoSlider' ),
	'customSlider' => $shortcode( 'customSlider' ),
	'albumSlider' => '[modula-album id="' . $album_id . '"]',
	'albumBetaMerge' => '[modula-album id="' . $beta_album_id . '"]',
	'abilityAlbum' => '[modula-album id="' . $ability_album_id . '"]',
	'albumBetaTyped' => '[modula-album id="' . $beta_typed_album_id . '"]',
	'albumBetaProtected' => '[modula-album id="' . $beta_protected_album_id . '"]',
	'albumClassicSparse' => '[modula-album id="' . $classic_sparse_album_id . '"]',
	'albumClassicConvert' => '[modula-album id="' . $classic_convert_album_id . '"]',
	'albumClassicProtected' => '[modula-album id="' . $classic_protected_album_id . '"]',
	'albumBetaLayout' => '[modula-album id="' . $layout_parent_id . '"]',
	'albumBetaLayoutChild' => '[modula-album id="' . $layout_child_b_id . '"]',
	'albumBetaImageSize' => '[modula-album id="' . $beta_image_size_album_id . '"]',
	'albumBetaLightbox' => '[modula-album id="' . $beta_lightbox_album_id . '"]',
	'albumBetaCaptions' => '[modula-album id="' . $beta_captions_album_id . '"]',
	'albumBetaHover' => '[modula-album id="' . $beta_hover_album_id . '"]',
	'albumBetaDownload' => '[modula-album id="' . $beta_download_album_id . '"]',
	'albumBetaZoom' => '[modula-album id="' . $beta_zoom_album_id . '"]',
	'albumBetaPasswordSettings' => '[modula-album id="' . $beta_password_settings_album_id . '"]',
	'albumBetaExif' => '[modula-album id="' . $beta_exif_album_id . '"]',
	'albumBetaGuardian' => '[modula-album id="' . $beta_guardian_album_id . '"]',
	'albumBetaPublicResult' => '[modula-album id="' . $beta_public_result_album_id . '"]',
	'albumAutosaveLayout' => '[modula-album id="' . $autosave_albums['autosaveLayout']['id'] . '"]',
	'albumBetaSlider' => '[modula-album id="' . $beta_slider_album_id . '"]',
	'albumBetaApplyPreset' => '[modula-album id="' . $beta_apply_preset_album_id . '"]',
	'albumBetaApplyPresetProtected' => '[modula-album id="' . $beta_apply_preset_protected_album_id . '"]',
);
$pages = array();
$page_ids = array();
foreach ( $contents as $name => $content ) {
	$id = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $name, 'post_content' => $content ) );
	$pages[ $name ] = get_permalink( $id );
	$page_ids[ $name ] = $id;
}
modula_e2e_output( array( 'run' => $run, 'galleries' => $galleries, 'album_id' => $album_id, 'albums' => $albums, 'pages' => $pages, 'page_ids' => $page_ids, 'attachments' => $attachments ) );
