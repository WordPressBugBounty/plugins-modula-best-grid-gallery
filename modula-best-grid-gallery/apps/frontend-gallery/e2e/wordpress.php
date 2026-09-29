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
	$state = array( 'run' => $run, 'active_plugins' => get_option( 'active_plugins' ), 'plugins' => $owned );
	if ( ! add_option( $key, $state, '', false ) ) {
		WP_CLI::error( 'Another run owns the site lock. Recover that run before starting another.' );
	}
	modula_e2e_output( array_merge( $state, array( 'wordpress' => get_bloginfo( 'version' ), 'php' => PHP_VERSION, 'plugin_versions' => array_map( function ( $file ) use ( $plugins ) { return $plugins[ $file ]['Version']; }, $owned ) ) ) );
	return;
}

$state = get_option( $key );
if ( ! is_array( $state ) || $state['run'] !== $run ) {
	WP_CLI::error( 'This run does not own the site lock; refusing to mutate the site.' );
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
	// Preserve the exact original activation order as well as membership.
	update_option( 'active_plugins', $state['active_plugins'] );
	if ( 'cleanup' === $action ) {
		$ids = get_posts( array( 'post_type' => array( 'page', 'modula-gallery', 'modula-album', 'attachment' ), 'post_status' => array_keys( get_post_stati() ), 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => $marker, 'meta_value' => $run ) );
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
	modula_e2e_output( array( 'active_plugins' => get_option( 'active_plugins' ), 'restored' => get_option( 'active_plugins' ) === $state['active_plugins'], 'cleaned' => 'cleanup' === $action, 'deleted_posts' => $ids ?? array(), 'deleted_users' => $users ?? array() ) );
	return;
}

if ( 'seed' !== $action ) {
	WP_CLI::error( 'Unknown fixture action.' );
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
foreach ( array( 'visible', 'farOffscreen', 'hiddenTab', 'hiddenSlider', 'classic', 'responsive', 'responsiveCrop', 'mobileCrop', 'editedResponsive', 'automatic', 'lightboxCatalog', 'compactControls', 'privateAccess', 'download', 'layoutStability' ) as $name ) {
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
	update_post_meta( $id, 'modula-images', $rows );
	wp_update_post( array( 'ID' => $id ) ); // Run the normal gallery save hooks.
	if ( 'classic' !== $name ) {
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

$shortcode = function ( $name ) use ( $galleries ) { return '[modula id="' . $galleries[ $name ]['id'] . '"]'; };
$contents = array(
	'visible' => $shortcode( 'visible' ),
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
);
$pages = array();
$page_ids = array();
foreach ( $contents as $name => $content ) {
	$id = modula_e2e_insert( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $name, 'post_content' => $content ) );
	$pages[ $name ] = get_permalink( $id );
	$page_ids[ $name ] = $id;
}
modula_e2e_output( array( 'run' => $run, 'galleries' => $galleries, 'album_id' => $album_id, 'pages' => $pages, 'page_ids' => $page_ids, 'attachments' => $attachments ) );
