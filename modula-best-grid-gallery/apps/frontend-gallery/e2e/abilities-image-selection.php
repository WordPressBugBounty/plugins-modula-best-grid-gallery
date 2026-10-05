<?php
/** Demonstrate the documented assistant loop through native public abilities, without a new service. */
$selection_checks = ( static function ( $source_file, $prefix, $run, $marker, $actor ) {
	$call = 'modula_media_call';
	$assert = 'modula_media_assert';
	$ids = array();
	for ( $i = 0; $i < 6; ++$i ) {
		$ids[] = wp_insert_attachment( array( 'post_title' => 'IMG_1234 ' . $prefix . '-selection', 'post_mime_type' => 'image/jpeg', 'post_author' => $actor, 'post_excerpt' => 1 === $i ? 'Existing caption' : '', 'meta_input' => array( $marker => $run, '_wp_attachment_image_alt' => 1 === $i ? 'Existing alt' : '' ) ), $source_file );
	}
	$folder = $call( 'create-media-folder', array( 'request_id' => $prefix . '-selection-folder', 'name' => $prefix . '-selection', 'revision' => $call( 'list-media-folders', array() )['revision'] ) )['folder']['id'];
	global $wpdb;
	$wpdb->update( $wpdb->prefix . 'wpchill_folders', array( 'owner_user_id' => $actor ), array( 'id' => $folder ) );
	$child = $call( 'create-media-folder', array( 'request_id' => $prefix . '-selection-child', 'name' => $prefix . '-selection-child', 'parent_id' => $folder, 'revision' => $call( 'list-media-folders', array() )['revision'] ) )['folder']['id'];
	foreach ( $ids as $i => $id ) {
		$assigned = $call( 'assign-media-folder', array( 'request_id' => $prefix . '-selection-member-' . $i, 'id' => $id, 'object_type' => 'attachment', 'folder_id' => 5 === $i ? $child : $folder, 'revision' => $call( 'list-media-folders', array() )['revision'] ) );
		$assert( 'succeeded' === $assigned['status'], 'Selection member assigned.' );
	}
	$enumerate = static function ( $input, $fail_page = 0 ) use ( $call ) {
		$found = array(); $total = null;
		for ( $page = 1; ; ++$page ) {
			if ( $page === $fail_page ) { return array( 'ids' => $found, 'complete' => false ); }
			$result = $call( 'list-attachments', $input + array( 'page' => $page, 'per_page' => 2 ) );
			if ( is_wp_error( $result ) || ( null !== $total && $total !== $result['total'] ) ) { return array( 'ids' => $found, 'complete' => false ); }
			$total = $result['total'];
			foreach ( $result['attachments'] as $row ) {
				if ( 0 === strpos( $row['mime_type'], 'image/' ) && 'trash' !== $row['status'] ) { $found[ $row['id'] ] = $row['id']; }
			}
			if ( $page >= $result['total_pages'] ) { return array( 'ids' => array_values( $found ), 'complete' => true ); }
		}
	};
	$direct = $enumerate( array( 'folder_id' => $folder ) );
	$assert( $direct['complete'] && array_slice( $ids, 0, 5 ) === $direct['ids'], 'Direct membership consumes three pages and excludes descendants.' );
	$assert( $direct === $enumerate( array( 'folder_id' => $folder ) ), 'Second stable enumeration agrees before freezing.' );
	$partial = $enumerate( array( 'folder_id' => $folder ), 2 );
	$assert( ! $partial['complete'] && 2 === count( $partial['ids'] ), 'Interrupted page enumeration stays explicitly incomplete.' );
	$folders = $call( 'list-media-folders', array( 'search' => $prefix . '-selection', 'per_page' => 100 ) );
	$descendant_ids = $direct['ids'];
	foreach ( $folders['folders'] as $row ) {
		if ( $folder === $row['parent_id'] ) { $descendant_ids = array_merge( $descendant_ids, $enumerate( array( 'folder_id' => $row['id'] ) )['ids'] ); }
	}
	$assert( $ids === $descendant_ids, 'Requested descendants add only their direct images.' );
	// Explicit library read is allowed only in this requested-scope demonstration; never write user media.
	$library = $enumerate( array( 'per_page' => 100 ) );
	$assert( $library['complete'] && ! array_diff( $ids, $library['ids'] ), 'Explicit library enumeration finds authorized images across folders.' );
	$video = wp_insert_attachment( array( 'post_title' => 'Video selection exclusion', 'post_mime_type' => 'video/mp4', 'meta_input' => array( $marker => $run ) ) );
	$gallery = $call( 'create-gallery', array( 'request_id' => $prefix . '-selection-gallery', 'title' => 'Selection only', 'status' => 'draft', 'attachment_ids' => array( $ids[0], $ids[1] ) ) )['gallery']['id'];
	// Ordinary fixture composition includes repeated image references, a video and embedded rows.
	\Modula\V2\Meta_Sync::persist_merged_gallery_items( $gallery, array( array( 'id' => $ids[0] ), array( 'id' => $ids[1] ), array( 'id' => $ids[0] ), array( 'id' => $video ), array( 'id' => 'block-selection', 'itemKind' => 'content_block', 'blockBodyHtml' => '<p>Not an image</p>' ), array( 'id' => 'shortcode-selection', 'itemKind' => 'shortcode', 'shortcodeRaw' => '[gallery]' ) ), false );
	$gallery_ids = array();
	for ( $page = 1; ; ++$page ) {
		$read = $call( 'read-gallery', array( 'id' => $gallery, 'page' => $page, 'per_page' => 2 ) );
		$assert( ! is_wp_error( $read ), 'Gallery selection page accessible.' );
		foreach ( $read['items'] as $item ) {
			if ( 'image' !== $item['itemKind'] ) { continue; }
			$row = $call( 'read-attachment', array( 'id' => (int) $item['id'] ) );
			if ( ! is_wp_error( $row ) && 0 === strpos( $row['attachment']['mime_type'], 'image/' ) ) { $gallery_ids[] = $row['attachment']['id']; }
		}
		if ( $page >= $read['total_pages'] ) { break; }
	}
	$assert( array( $ids[0], $ids[1] ) === array_values( array_unique( $gallery_ids ) ), 'Gallery pages select only actual image attachments.' );
	$frozen = array_values( array_unique( array_merge( $direct['ids'], $gallery_ids, array( $ids[0] ) ) ) );
	$assert( 5 === count( $frozen ), 'Overlapping explicit/gallery/folder references are deduplicated.' );
	$new_id = wp_insert_attachment( array( 'post_title' => 'Later addition', 'post_mime_type' => 'image/jpeg', 'meta_input' => array( $marker => $run ) ), $source_file );
	$call( 'assign-media-folder', array( 'request_id' => $prefix . '-later-member', 'id' => $new_id, 'object_type' => 'attachment', 'folder_id' => $folder, 'revision' => $call( 'list-media-folders', array() )['revision'] ) );
	$assert( ! in_array( $new_id, $frozen, true ), 'Membership added after freeze is not processed.' );
	$deny = static function ( $caps, $cap, $user, $args ) use ( $ids ) { return 'edit_post' === $cap && $ids[4] === (int) ( $args[0] ?? 0 ) ? array( 'do_not_allow' ) : $caps; };
	add_filter( 'map_meta_cap', $deny, 10, 4 );
	$outcomes = array();
	$totals = array( 'updated' => 0, 'skipped' => 0, 'conflicted' => 0, 'failed' => 0, 'unconfirmed' => 0 );
	try {
		foreach ( $frozen as $index => $id ) {
			$context = $call( 'read-attachment-image-context', array( 'id' => $id ) );
			if ( is_wp_error( $context ) ) { ++$totals['failed']; $outcomes[] = array( 'status' => 'failed', 'reason' => 'Target no longer accessible; details withheld.' ); continue; }
			$patch = array();
			foreach ( array( 'title', 'alt', 'caption' ) as $field ) {
				if ( '' === trim( $context['text'][ $field ] ) ) { $patch[ $field ] = 'caption' === $field ? 'Caption from inspected pixels' : 'Alt from inspected pixels'; }
			}
			if ( ! $patch ) { ++$totals['skipped']; $outcomes[] = array( 'id' => $id, 'status' => 'skipped', 'reason' => 'Requested fields already contain authored text.' ); continue; }
			$input = array_intersect_key( $context, array_flip( array( 'id', 'revision', 'visual_revision' ) ) );
			$assert( ! is_wp_error( $call( 'read-attachment-image', $input ) ), 'Selected target inspected before writing.' );
			if ( 2 === $index ) { update_post_meta( $id, '_wp_attachment_image_alt', 'New human alt' ); }
			$request_id = $prefix . '-selected-write-' . $index;
			$result = $call( 'update-attachment-text', $input + array( 'request_id' => $request_id, 'text' => $patch ) );
			if ( 3 === $index ) {
				// Discard the response and reconcile; a later human edit must survive replay.
				unset( $result ); update_post_meta( $id, '_wp_attachment_image_alt', 'Later human alt' );
				$result = $call( 'recover-request', array( 'request_id' => $request_id ) );
				$assert( $result === $call( 'update-attachment-text', $input + array( 'request_id' => $request_id, 'text' => $patch ) ), 'Recovered selection write does not repeat over later edits.' );
			}
			$outcomes[] = array( 'id' => $id, 'status' => $result['status'], 'reason' => 'succeeded' === $result['status'] ? 'Confirmed shared write, including recovered outcomes.' : ( 'conflict' === $result['status'] ? 'A newer change requires fresh context and reconciliation.' : 'Outcome requires recovery before retry.' ) );
			if ( 'succeeded' === $result['status'] ) { ++$totals['updated']; }
			elseif ( 'conflict' === $result['status'] ) { ++$totals['conflicted']; }
			elseif ( in_array( $result['status'], array( 'uncertain', 'in_progress' ), true ) ) { ++$totals['unconfirmed']; }
			else { ++$totals['failed']; }
		}
	} finally { remove_filter( 'map_meta_cap', $deny, 10 ); }
	$assert( array( 'updated' => 2, 'skipped' => 1, 'conflicted' => 1, 'failed' => 1, 'unconfirmed' => 0 ) === $totals && count( $frozen ) === array_sum( $totals ), 'Partial selection preserves successes and reports exact individual totals.' );
	foreach ( array( 0 => 'Alt from inspected pixels', 1 => 'Existing alt', 2 => 'New human alt', 3 => 'Later human alt', 4 => '', 5 => '' ) as $i => $alt ) {
		$text = $call( 'read-attachment', array( 'id' => $ids[$i] ) )['attachment']['text'];
		$assert( $alt === $text['alt'] && 0 === strpos( $text['title'], 'IMG_1234' ), 'Sparse selection writes preserve filename titles, human edits and out-of-scope images.' );
	}
	$assert( 5 === count( $outcomes ) && ! isset( $outcomes[4]['id'] ) && ! isset( $outcomes[4]['title'] ) && ! empty( $outcomes[4]['reason'] ), 'Report retains useful outcomes and omits inaccessible target details.' );
	$rewrite_context = $call( 'read-attachment-image-context', array( 'id' => $ids[1] ) );
	$rewrite_input = array_intersect_key( $rewrite_context, array_flip( array( 'id', 'revision', 'visual_revision' ) ) );
	$assert( ! is_wp_error( $call( 'read-attachment-image', $rewrite_input ) ), 'Explicit rewrite inspects current pixels.' );
	$rewrite = $call( 'update-attachment-text', $rewrite_input + array( 'request_id' => $prefix . '-explicit-rewrite', 'text' => array( 'alt' => 'Explicitly rewritten alt' ) ) );
	$rewritten = $call( 'read-attachment', array( 'id' => $ids[1] ) )['attachment']['text'];
	$assert( 'succeeded' === $rewrite['status'] && 'Explicitly rewritten alt' === $rewritten['alt'] && 'Existing caption' === $rewritten['caption'] && 0 === strpos( $rewritten['title'], 'IMG_1234' ), 'Explicit rewrite changes only its requested field.' );
	return array( 'outcomes' => $outcomes, 'complete' => true, 'frozen' => count( $frozen ), 'totals' => $totals, 'partial_enumeration_reported' => true, 'later_addition_excluded' => true );
} )( $file, $prefix, $run, $marker, $actor->ID );
