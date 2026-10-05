<?php
/**
 * Gallery business-operation checks within the shared WordPress fixture lock.
 * Invoked only by wordpress.php; all content belongs to this run.
 */

if ( ! defined( 'WP_CLI' ) || ! WP_CLI || ! isset( $state['run'] ) || $state['run'] !== getenv( 'MODULA_E2E_RUN' ) ) {
	exit( 1 );
}

function modula_e2e_gallery_assert( $condition, $message ) {
	if ( ! $condition ) {
		WP_CLI::error( $message );
	}
}

$users = get_users(
	array(
		'meta_key'   => $marker,
		'meta_value' => $run,
		'login__in'  => array( $run ),
		'fields'     => 'ID',
	)
);
modula_e2e_gallery_assert( 1 === count( $users ), 'Expected one test-owned actor.' );
wp_set_current_user( $users[0] );
// Register the real REST routes, which load the editor's upload/text service.
rest_get_server();

$gallery_id    = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'auto-draft',
		'post_title'  => 'business operations ' . getenv( 'MODULA_E2E_MODE' ),
		'post_author' => $users[0],
		'meta_input'  => array( '_modula_beta' => '1' ),
	)
);
$catalog       = json_decode( file_get_contents( getenv( 'MODULA_E2E_RUN_DIR' ) . '/catalog.json' ), true );
$attachment_id = $catalog['attachments'][0]['id'];

// A wiped filter list is repairable from the image tags. Do not seed through
// sync hooks, since they intentionally repair this state for ordinary readers.
global $wpdb;
foreach ( array(
	'modula-settings'    => array(
		'type'    => 'grid',
		'filters' => array( '' ),
	),
	'modula-images'      => array(
		array(
			'id'      => $attachment_id,
			'filters' => 'Retained tag',
		),
	),
	'modula_settings_v2' => wp_json_encode(
		array(
			'general' => array( 'type' => 'grid' ),
			'filters' => array( 'filters' => array( '' ) ),
		)
	),
) as $meta_key => $value ) {
	delete_post_meta( $gallery_id, $meta_key );
	$wpdb->insert(
		$wpdb->postmeta,
		array(
			'post_id'    => $gallery_id,
			'meta_key'   => $meta_key,
			'meta_value' => maybe_serialize( $value ),
		)
	);
}
wp_cache_delete( $gallery_id, 'post_meta' );

$before       = get_post_meta( $gallery_id );
$syncs_before = did_action( 'modula_gallery_settings_v2_updated' );
$read         = \Modula\V2\Meta_Sync::get_settings_v2( $gallery_id, false );
modula_e2e_gallery_assert( array( '' ) === $read['filters']['filters'], 'No-repair read must return the stored filter list.' );
modula_e2e_gallery_assert( $before === get_post_meta( $gallery_id ), 'No-repair read must not change any gallery metadata.' );
modula_e2e_gallery_assert( 'auto-draft' === get_post_status( $gallery_id ), 'No-repair read must not publish the gallery.' );
modula_e2e_gallery_assert( $syncs_before === did_action( 'modula_gallery_settings_v2_updated' ), 'No-repair read must not invoke settings synchronization.' );
$editor_read = \Modula\V2\Meta_Sync::get_settings_v2( $gallery_id );
modula_e2e_gallery_assert( array( 'Retained tag' ) === $editor_read['filters']['filters'], 'Existing reader must retain its filter-list repair behavior.' );
delete_post_meta( $gallery_id, \Modula\V2\Meta_Sync::SETTINGS_V2_META_KEY );
$before       = get_post_meta( $gallery_id );
$missing_read = \Modula\V2\Meta_Sync::get_settings_v2( $gallery_id, false );
modula_e2e_gallery_assert( ! \Modula\V2\Meta_Sync::settings_v2_is_usable( $missing_read ) && $before === get_post_meta( $gallery_id ), 'No-repair read must not backfill missing grouped settings.' );

// Use a separate attachment, with its own bytes and ownership, shared by two
// galleries so later suite scenarios never inherit these text changes.
$uploads = wp_upload_dir();
$file    = $uploads['basedir'] . '/' . $run . '/operations-' . getenv( 'MODULA_E2E_MODE' ) . '.jpg';
modula_e2e_gallery_assert( copy( get_attached_file( $attachment_id ), $file ), 'Could not copy the owned image.' );
$shared_id = wp_insert_attachment(
	array(
		'post_mime_type' => 'image/jpeg',
		'post_title'     => 'Shared operation title',
		'post_excerpt'   => 'Shared operation caption',
		'post_content'   => 'Shared operation description',
		'meta_input'     => array( $marker => $run ),
	),
	$file
);
update_post_meta( $shared_id, '_wp_attachment_image_alt', 'Shared operation alt' );
wp_update_attachment_metadata( $shared_id, wp_generate_attachment_metadata( $shared_id, $file ) );

$composition_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'composition operations ' . getenv( 'MODULA_E2E_MODE' ),
		'post_author' => $users[0],
		'meta_input'  => array( '_modula_beta' => '1' ),
	)
);
$reference_id   = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'shared attachment reference ' . getenv( 'MODULA_E2E_MODE' ),
		'post_author' => $users[0],
		'meta_input'  => array( '_modula_beta' => '1' ),
	)
);
foreach ( array( $composition_id, $reference_id ) as $id ) {
	\Modula\V2\Meta_Sync::ensure_default_settings( $id );
	\Modula\V2\Meta_Sync::persist_merged_gallery_items( $id, array( array( 'id' => $shared_id ) ), false );
}
$shared_before = get_post( $shared_id, ARRAY_A );
$alt_before    = get_post_meta( $shared_id, '_wp_attachment_image_alt', true );
$mixed         = array(
	array(
		'itemKind'      => 'content_block',
		'embeddedId'    => 'operations-block',
		'blockTitle'    => 'Operation block',
		'blockBodyHtml' => '<p>Retained <a href="#anchor">body</a></p>',
	),
	array(
		'id'          => $shared_id,
		'title'       => 'Stale caller title',
		'alt'         => 'Stale caller alt',
		'description' => 'Stale caller caption',
		'width'       => 3,
		'height'      => 2,
		'gridX'       => 2,
		'gridY'       => 4,
	),
	array(
		'itemKind'     => 'shortcode',
		'embeddedId'   => 'operations-shortcode',
		'shortcodeRaw' => '[caption]Retained shortcode[/caption]',
	),
);
$saved         = \Modula\V2\Meta_Sync::persist_merged_gallery_items( $composition_id, $mixed, false );
modula_e2e_gallery_assert( true === $saved, 'Composition must save successfully.' );
modula_e2e_gallery_assert( $shared_before === get_post( $shared_id, ARRAY_A ) && $alt_before === get_post_meta( $shared_id, '_wp_attachment_image_alt', true ), 'Composition-only save must preserve every shared attachment text field.' );
$reopened = \Modula\V2\Meta_Sync::get_images_v2( $composition_id );
modula_e2e_gallery_assert( 3 === count( $reopened ) && 'operations-block' === $reopened[0]['embeddedId'] && $shared_id === (int) $reopened[1]['id'] && 'operations-shortcode' === $reopened[2]['embeddedId'], 'Mixed gallery item identity and order must survive reopening.' );
modula_e2e_gallery_assert( 2 === $reopened[1]['gridX'] && 4 === $reopened[1]['gridY'] && 3 === $reopened[1]['width'] && 2 === $reopened[1]['height'], 'Custom-grid cells must survive composition saves.' );

$page_id = modula_e2e_insert(
	array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'shared operation visitor ' . getenv( 'MODULA_E2E_MODE' ),
		'post_content' => '[modula id="' . $reference_id . '"]',
	)
);

modula_e2e_gallery_assert( class_exists( '\Modula\V2\Settings\Writer' ), 'Reusable gallery settings writer must be available.' );
$first = \Modula\V2\Settings\Writer::patch(
	$gallery_id,
	array(
		'general' => array( 'randomFactor' => 72 ),
		'layout'  => array( 'gutter' => 18 ),
	)
);
modula_e2e_gallery_assert( ! is_wp_error( $first ), 'Reusable settings patch must save.' );
$patched = \Modula\V2\Settings\Writer::patch( $gallery_id, array( 'layout' => array( 'gutter' => '26' ) ) );
modula_e2e_gallery_assert( 26 === $patched['layout']['gutter'] && 72 === $patched['general']['randomFactor'], 'PATCH must normalize requested values and preserve unrequested settings.' );
modula_e2e_gallery_assert( 'auto-draft' === get_post_status( $gallery_id ), 'Reusable settings patch must not infer publication intent.' );
$settings_before = get_post_meta( $gallery_id );
$invalid         = \Modula\V2\Settings\Writer::patch(
	$gallery_id,
	array(
		'layout'   => array( 'gutter' => 33 ),
		'lightbox' => 'invalid',
	)
);
modula_e2e_gallery_assert( is_wp_error( $invalid ) && 'rest_invalid_param' === $invalid->get_error_code(), 'Invalid complete patch must be rejected.' );
modula_e2e_gallery_assert( $settings_before === get_post_meta( $gallery_id ), 'Rejected patch must not partially save the valid group.' );
$invalid_request = new WP_REST_Request( 'PATCH', '/modula/v2/gallery/' . $gallery_id . '/settings' );
$invalid_request->set_header( 'Content-Type', 'application/json' );
$invalid_request->set_body(
	wp_json_encode(
		array(
			'layout'   => array( 'gutter' => 33 ),
			'lightbox' => 'invalid',
		)
	)
);
$invalid_response = rest_do_request( $invalid_request );
modula_e2e_gallery_assert( 400 === $invalid_response->get_status() && $settings_before === get_post_meta( $gallery_id ) && 'auto-draft' === get_post_status( $gallery_id ), 'Invalid editor request must not promote or partially save the auto-draft.' );
$reopened_settings = \Modula\V2\Meta_Sync::get_settings_v2( $gallery_id, false );
modula_e2e_gallery_assert( 26 === $reopened_settings['layout']['gutter'] && 72 === $reopened_settings['general']['randomFactor'], 'Reusable settings writes must survive reopening.' );

// Intentional filter dismiss/clear must strip matching image tags so repair-on-read
// cannot refill the cleared gallery filter name list.
$filter_gallery_id = modula_e2e_insert(
	array(
		'post_type'   => 'modula-gallery',
		'post_status' => 'publish',
		'post_title'  => 'filter dismiss persist ' . getenv( 'MODULA_E2E_MODE' ),
		'post_author' => $users[0],
		'meta_input'  => array( '_modula_beta' => '1' ),
	)
);
\Modula\V2\Meta_Sync::ensure_default_settings( $filter_gallery_id );
// Seed image tags via raw meta — Lite sanitize_modula_images_list omits `filters`
// (Pro adds it via modula_gallery_image_attributes).
$filter_seed_images = array(
	array(
		'id'      => $shared_id,
		'filters' => 'Keep me,Drop me',
	),
);
update_post_meta( $filter_gallery_id, 'modula-images', $filter_seed_images );
\Modula\V2\Meta_Sync::sync_modula_images_v2_from_list( $filter_gallery_id, $filter_seed_images );
$seeded_images = get_post_meta( $filter_gallery_id, 'modula-images', true );
modula_e2e_gallery_assert(
	is_array( $seeded_images ) && isset( $seeded_images[0]['filters'] ) && 'Keep me,Drop me' === $seeded_images[0]['filters'],
	'Filter dismiss fixture must seed per-image tags.'
);
$named = \Modula\V2\Settings\Writer::patch(
	$filter_gallery_id,
	array(
		'filters' => array(
			'filters' => array( 'Keep me', 'Drop me' ),
		),
	)
);
modula_e2e_gallery_assert( ! is_wp_error( $named ) && array( 'Keep me', 'Drop me' ) === $named['filters']['filters'], 'Filter list seed must persist named filters.' );
$partial = \Modula\V2\Settings\Writer::patch(
	$filter_gallery_id,
	array(
		'filters' => array(
			'filters' => array( 'Keep me' ),
		),
	)
);
modula_e2e_gallery_assert( ! is_wp_error( $partial ) && array( 'Keep me' ) === $partial['filters']['filters'], 'Partial dismiss must keep remaining filter names.' );
$partial_images = get_post_meta( $filter_gallery_id, 'modula-images', true );
modula_e2e_gallery_assert( is_array( $partial_images ) && isset( $partial_images[0]['filters'] ), 'Partial dismiss must leave gallery images readable.' );
modula_e2e_gallery_assert( 'Keep me' === $partial_images[0]['filters'], 'Partial dismiss must strip only the removed image tag.' );
$cleared_filters = \Modula\V2\Settings\Writer::patch(
	$filter_gallery_id,
	array(
		'filters' => array(
			'filters' => array(),
		),
	)
);
modula_e2e_gallery_assert( ! is_wp_error( $cleared_filters ) && array() === $cleared_filters['filters']['filters'], 'Intentional clear must persist an empty gallery filter list.' );
$cleared_images = get_post_meta( $filter_gallery_id, 'modula-images', true );
modula_e2e_gallery_assert( is_array( $cleared_images ) && '' === (string) $cleared_images[0]['filters'], 'Intentional clear must strip matching tags from gallery images.' );
$repaired_after_clear = \Modula\V2\Meta_Sync::get_settings_v2( $filter_gallery_id );
$repaired_names       = isset( $repaired_after_clear['filters']['filters'] ) ? $repaired_after_clear['filters']['filters'] : null;
modula_e2e_gallery_assert(
	array() === $repaired_names
		&& ! in_array( 'Keep me', (array) $repaired_names, true )
		&& ! in_array( 'Drop me', (array) $repaired_names, true ),
	'Repair-on-read must not refill an intentionally cleared filter list.'
);

modula_e2e_output(
	array(
		'gallery_id'                                  => $gallery_id,
		'read_without_repair'                         => true,
		'composition_preserves_attachment_text'       => true,
		'composition_id'                              => $composition_id,
		'reference_id'                                => $reference_id,
		'reference_page'                              => get_permalink( $page_id ),
		'attachment_id'                               => $shared_id,
		'settings_patch_preserves_unrequested_fields' => true,
		'filter_dismiss_strips_image_tags'            => true,
		'editor_url'                                  => admin_url( 'post.php?post=' . $composition_id . '&action=edit' ),
	)
);
