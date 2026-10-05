<?php
/** The media suite's visual-read seam; every byte belongs to its existing owned attachment. */
return ( static function ( $id, $file, $prefix ) {
	$call              = static function ( $name, $input ) {
		return modula_media_call( $name, $input );
	};
	$private_temp_seen = false;
	$check_temp        = static function ( $orientation, $path ) use ( &$private_temp_seen ) {
		modula_media_assert( 0 === ( fileperms( dirname( $path ) ) & 0077 ), 'Temporary image directory denies group and other access.' );
		$private_temp_seen = true;
		return $orientation;
	};
	add_filter( 'wp_image_maybe_exif_rotate', $check_temp, 10, 2 );
	$context = $call( 'read-attachment-image-context', array( 'id' => $id ) );
	remove_filter( 'wp_image_maybe_exif_rotate', $check_temp, 10 );
	modula_media_assert( $private_temp_seen, 'Preparation used the private directory.' );
	modula_media_assert( ! is_wp_error( $context ), 'Read visual context: ' . wp_json_encode( $context ) );
	$input = array_intersect_key( $context, array_flip( array( 'id', 'revision', 'visual_revision' ) ) );
	$image = $call( 'read-attachment-image', $input );
	modula_media_assert( ! is_wp_error( $image ), 'Read revision-bound image: ' . wp_json_encode( $image instanceof WP_Error ? $image : array() ) );
	$bytes = base64_decode( $image['data'], true );
	$size  = getimagesizefromstring( $bytes );
	modula_media_assert( $size && $size[0] === $image['width'] && $size[1] === $image['height'] && max( $size[0], $size[1] ) <= 1600 && strlen( $bytes ) <= 2097152, 'Native image contains bounded decodable bytes.' );
	modula_media_assert( $input === array_intersect_key( $image, $input ) && $context['text'] === $image['text'], 'Two calls share the same identity and revisions.' );
	$original = file_get_contents( $file );
	try {
		file_put_contents( $file, $original . 'replacement' );
		modula_media_assert( is_wp_error( $call( 'read-attachment-image', $input ) ), 'Changed file rejects the second image call.' );
		$write = $call(
			'update-attachment-text',
			$input + array(
				'request_id' => $prefix . '-visual-stale',
				'text'       => array( 'alt' => 'Must not save' ),
			)
		);
		modula_media_assert( ! is_wp_error( $write ) && 'conflict' === $write['status'] && 'stale_visual_revision' === $write['code'], 'Changed file rejects the text write with a visual conflict.' );
	} finally {
		file_put_contents( $file, $original );
	}
	// Read-only calls preserve all metadata and file bytes; no provider or report side effect.
	$metadata         = get_post_meta( $id );
	$temporary_before = glob( rtrim( sys_get_temp_dir(), '/\\' ) . '/modula-visual-*' );
	$http_calls       = 0;
	$report_writes    = 0;
	$deny_http        = static function () use ( &$http_calls ) {
		++$http_calls;
		return new WP_Error( 'unexpected_http', 'Visual reads must be local.' );
	};
	$watch_report     = static function ( $check, $object_id, $key ) use ( $id, &$report_writes ) {
		if ( $id === (int) $object_id && '_modula_ai_report' === $key ) {
			++$report_writes; }
		return $check;
	};
	add_filter( 'pre_http_request', $deny_http );
	add_filter( 'update_post_metadata', $watch_report, 10, 3 );
	$expect_error = static function ( $result, $code, $message ) {
		modula_media_assert( is_wp_error( $result ) && $code === $result->get_error_code(), $message . ': ' . wp_json_encode( $result instanceof WP_Error ? $result : array() ) );
	};
	$read         = static function () use ( $call, $id ) {
		return $call( 'read-attachment-image-context', array( 'id' => $id ) );
	};
	$still        = static function ( $width, $height, $mime = 'png' ) {
		$im = imagecreatetruecolor( $width, $height );
		imagefilledrectangle( $im, 0, 0, $width - 1, $height - 1, imagecolorallocate( $im, 255, 255, 255 ) );
		imagefilledrectangle( $im, 0, 0, (int) ( $width / 4 ), $height - 1, imagecolorallocate( $im, 255, 0, 0 ) );
		imagefilledrectangle( $im, (int) ( 3 * $width / 4 ), 0, $width - 1, $height - 1, imagecolorallocate( $im, 0, 0, 255 ) );
		ob_start();
		if ( 'jpg' === $mime ) {
			imagejpeg( $im, null, 95 );
		} else {
			imagepng( $im ); }
		$bytes = ob_get_clean();
		imagedestroy( $im );
		return $bytes;
	};
	try {
		$expect_error( $call( 'read-attachment-image', array( 'id' => $id ) ), 'ability_invalid_input', 'Image call requires both revisions' );
		modula_media_assert(
			is_wp_error(
				$call(
					'read-attachment-image-context',
					array(
						'id'  => $id,
						'url' => 'http://localhost/private',
					)
				)
			),
			'Arbitrary source URL is rejected.'
		);
		$again = $read();
		modula_media_assert( $again === $context && $metadata === get_post_meta( $id ) && $original === file_get_contents( $file ), 'Visual reads are stable and read-only.' );
		modula_media_assert( ! isset( $again['data'] ) && false === strpos( wp_json_encode( $again ), ABSPATH ), 'Context contains no bytes or internal paths.' );
		$site_language = static function () {
			return 'ro_RO';
		};
		add_filter( 'pre_option_WPLANG', $site_language );
		modula_media_assert( 'ro_RO' === $read()['language'], 'Site language is read without AI configuration.' );
		remove_filter( 'pre_option_WPLANG', $site_language );
		$empty_language = static function () {
			return '';
		};
		add_filter( 'pre_option_WPLANG', $empty_language );
		modula_media_assert( get_locale() === $read()['language'], 'Empty language falls back to WordPress locale.' );
		remove_filter( 'pre_option_WPLANG', $empty_language );
		$post_status = get_post_status( $id );
		try {
			wp_update_post(
				array(
					'ID'          => $id,
					'post_status' => 'private',
				)
			);
			modula_media_assert( ! is_wp_error( $read() ), 'Authorized private attachment pixels need no public URL.' );
			$deny = static function ( $caps, $cap, $user, $args ) use ( $id ) {
				return 'edit_post' === $cap && $id === (int) ( $args[0] ?? 0 ) ? array( 'do_not_allow' ) : $caps;
			};
			add_filter( 'map_meta_cap', $deny, 10, 4 );
			try {
				$expect_error( $read(), 'modula_image_forbidden', 'Revoked attachment permission refuses context' );
				$expect_error( $call( 'read-attachment-image', $input ), 'modula_image_forbidden', 'Revoked attachment permission refuses pixels' );
			} finally {
				remove_filter( 'map_meta_cap', $deny, 10 ); }
			wp_update_post(
				array(
					'ID'          => $id,
					'post_status' => 'trash',
				)
			);
			$expect_error( $read(), 'modula_image_forbidden', 'Trash has no visual output' );
		} finally {
			wp_update_post(
				array(
					'ID'          => $id,
					'post_status' => $post_status,
				)
			); }
		// Stable context checks use real ordinary edits, not fabricated revision tokens.
		$before_text = $read();
		wp_update_post(
			array(
				'ID'         => $id,
				'post_title' => 'IMG_1234',
			)
		);
		$expect_error( $call( 'read-attachment-image', array_intersect_key( $before_text, $input ) ), 'modula_image_conflict', 'Text edit between calls refuses pixels' );
		$fresh  = $read();
		$sparse = array_intersect_key( $fresh, $input ) + array(
			'request_id' => $prefix . '-visual-save',
			'text'       => array( 'alt' => 'A red and blue test image' ),
		);
		$saved  = $call( 'update-attachment-text', $sparse );
		modula_media_assert( 'succeeded' === $saved['status'] && 'IMG_1234' === $saved['attachment']['text']['title'], 'Visual sparse save preserves substantive filename-like title.' );
		wp_update_post(
			array(
				'ID'           => $id,
				'post_excerpt' => 'Human caption after save',
			)
		);
		modula_media_assert( $saved === $call( 'update-attachment-text', $sparse ), 'Lost-response replay returns history without overwriting later caption.' );
		$recover = $call( 'recover-request', array( 'request_id' => $sparse['request_id'] ) );
		modula_media_assert( $saved === $recover && 'Human caption after save' === $call( 'read-attachment', array( 'id' => $id ) )['attachment']['text']['caption'], 'Visual write recovery preserves subsequent edits.' );
		$clear_context = $read();
		$cleared       = $call(
			'update-attachment-text',
			array_intersect_key( $clear_context, $input ) + array(
				'request_id' => $prefix . '-visual-clear',
				'text'       => array( 'alt' => '' ),
			)
		);
		modula_media_assert( 'succeeded' === $cleared['status'] && '' === $cleared['attachment']['text']['alt'] && 'Human caption after save' === $cleared['attachment']['text']['caption'], 'Explicit decorative alt clearing preserves caption.' );
		// No persistent derivatives used for synthetic size/orientation checks.
		$attachment_metadata = wp_get_attachment_metadata( $id );
		delete_post_meta( $id, '_wp_attachment_metadata' );
		try {
			$derived_file = dirname( $file ) . '/' . $prefix . '-old-derivative.png';
			$source_image = $still( 2000, 1000 );
			file_put_contents( $file, $source_image );
			file_put_contents( $derived_file, $still( 1200, 600 ) );
			wp_update_attachment_metadata(
				$id,
				array(
					'width'  => 2000,
					'height' => 1000,
					'sizes'  => array(
						'large' => array(
							'width'     => 1200,
							'height'    => 600,
							'file'      => basename( $derived_file ),
							'mime-type' => 'image/png',
						),
					),
				)
			);
			$prior_source = $read();
			$new_source   = imagecreatefromstring( $source_image );
			imagefilledrectangle( $new_source, 0, 0, 1999, 999, imagecolorallocate( $new_source, 0, 255, 0 ) );
			imagepng( $new_source, $file );
			imagedestroy( $new_source );
			$fresh_source = $read();
			modula_media_assert( $prior_source['visual_revision'] !== $fresh_source['visual_revision'], 'Replacing full source changes visual revision.' );
			$fresh_pixels = $call( 'read-attachment-image', array_intersect_key( $fresh_source, $input ) );
			$decoded      = imagecreatefromstring( base64_decode( $fresh_pixels['data'] ) );
			$color        = imagecolorsforindex( $decoded, imagecolorat( $decoded, 1, 1 ) );
			imagedestroy( $decoded );
			modula_media_assert( $color['green'] > 240 && $color['red'] < 15, 'Fresh context must inspect replacement pixels, never an old registered derivative.' );
			unlink( $derived_file );
			delete_post_meta( $id, '_wp_attachment_metadata' );
			file_put_contents( $file, $still( 2000, 1000 ) );
			$large = $read();
			modula_media_assert( 1600 === $large['width'] && 800 === $large['height'], 'Downscale preserves the whole aspect ratio.' );
			$large_pixels = $call( 'read-attachment-image', array_intersect_key( $large, $input ) );
			$decoded      = imagecreatefromstring( base64_decode( $large_pixels['data'] ) );
			$left         = imagecolorsforindex( $decoded, imagecolorat( $decoded, 1, 400 ) );
			$right        = imagecolorsforindex( $decoded, imagecolorat( $decoded, 1598, 400 ) );
			modula_media_assert( $left['red'] > 240 && $right['blue'] > 240, 'Both image edges survive, proving no context-losing crop.' );
			imagedestroy( $decoded );
			$convert = static function ( $formats ) {
				return array( 'image/png' => 'image/webp' ) + $formats;
			};
			add_filter( 'image_editor_output_format', $convert );
			try {
				$converted = $read();
				modula_media_assert( ! is_wp_error( $converted ) && 'image/webp' === $converted['mime_type'], 'WordPress output-format changes retain bounded output and cleanup.' );
			} finally {
				remove_filter( 'image_editor_output_format', $convert ); }
			// Real EXIF orientation 6: TIFF little-endian, one IFD orientation tag.
			$jpeg = $still( 80, 40, 'jpg' );
			$exif = "Exif\0\0II\x2a\0\x08\0\0\0\x01\0\x12\x01\x03\0\x01\0\0\0\x06\0\0\0\0\0\0\0";
			file_put_contents( $file, substr( $jpeg, 0, 2 ) . "\xff\xe1" . pack( 'n', strlen( $exif ) + 2 ) . $exif . substr( $jpeg, 2 ) );
			$rotated = $read();
			modula_media_assert( 40 === $rotated['width'] && 80 === $rotated['height'], 'Real EXIF orientation is honored.' );
			$rotated_pixels = $call( 'read-attachment-image', array_intersect_key( $rotated, $input ) );
			modula_media_assert( false === strpos( base64_decode( $rotated_pixels['data'] ), "Exif\0\0" ), 'Re-encoding strips source EXIF metadata.' );
			file_put_contents( $file, str_repeat( 'x', 8388609 ) );
			$expect_error( $read(), 'modula_image_over_limit', 'Oversized source rejected before decoding' );
			file_put_contents( $file, 'broken image' );
			$expect_error( $read(), 'modula_image_corrupt', 'Malformed image classified' );
			// PNG IHDR advertises >40M pixels; no large image allocation is needed.
			$png  = $still( 80, 40 );
			$huge = substr_replace( $png, pack( 'NN', 10000, 10000 ), 16, 8 );
			file_put_contents( $file, $huge );
			$expect_error( $read(), 'modula_image_over_limit', 'Pixel bound enforced before allocation' );
			$chunk = static function ( $type, $data ) {
				return pack( 'N', strlen( $data ) ) . $type . $data . pack( 'N', crc32( $type . $data ) );
			};
			// 1024-square noisy PNG fits source bounds but exceeds the encoded output budget.
			$raw = '';
			for ( $row = 0; $row < 1024; ++$row ) {
				$raw .= "\0" . random_bytes( 3072 ); }
			$noisy = "\x89PNG\r\n\x1a\n" . $chunk( 'IHDR', pack( 'NNCCCCC', 1024, 1024, 8, 2, 0, 0, 0 ) ) . $chunk( 'IDAT', gzcompress( $raw ) ) . $chunk( 'IEND', '' );
			unset( $raw );
			file_put_contents( $file, $noisy );
			$expect_error( $read(), 'modula_image_over_limit', 'Encoded output byte bound enforced' );
			unset( $noisy );
			// Core only rotates JPEG EXIF; PNG eXIf must not silently become sideways pixels.
			file_put_contents( $file, substr( $png, 0, 33 ) . $chunk( 'eXIf', substr( $exif, 6 ) ) . substr( $png, 33 ) );
			$expect_error( $read(), 'modula_image_unsupported', 'PNG EXIF orientation has an explicit unsupported outcome' );
			$actl = pack( 'NN', 2, 0 );
			file_put_contents( $file, substr( $png, 0, 33 ) . pack( 'N', 8 ) . 'acTL' . $actl . pack( 'N', crc32( 'acTL' . $actl ) ) . substr( $png, 33 ) );
			$expect_error( $read(), 'modula_image_animated', 'Animated PNG rejected before decoding' );
			file_put_contents( $file, base64_decode( 'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==' ) );
			$expect_error( $read(), 'modula_image_unsupported', 'Unsupported GIF classified' );
			file_put_contents( $file, $png );
			$change_during_read = static function ( $orientation ) use ( $file, $png ) {
				file_put_contents( $file, $png . 'changed' );
				return $orientation;
			};
			add_filter( 'wp_image_maybe_exif_rotate', $change_during_read );
			try {
				$expect_error( $read(), 'modula_image_conflict', 'File replacement during preparation is detected' ); } finally {
				remove_filter( 'wp_image_maybe_exif_rotate', $change_during_read ); }
				$missing = $file . '.owned-missing';
				rename( $file, $missing );
				try {
					$expect_error( $read(), 'modula_image_unavailable', 'Missing source classified' ); } finally {
								rename( $missing, $file ); }
		} finally {
			file_put_contents( $file, $original );
			wp_update_attachment_metadata( $id, $attachment_metadata );
		}
		modula_media_assert( 0 === $http_calls && 0 === $report_writes, 'Visual inspection and application call no provider, credit service or AI report writer.' );
		modula_media_assert( $temporary_before === glob( rtrim( sys_get_temp_dir(), '/\\' ) . '/modula-visual-*' ), 'All temporary image files cleaned after success and failure.' );
	} finally {
		remove_filter( 'pre_http_request', $deny_http );
		remove_filter( 'update_post_metadata', $watch_report, 10 );
	}
	return array(
		'native_pixels'      => true,
		'source_conflict'    => true,
		'replacement_pixels' => true,
		'private_temp'       => true,
		'orientation'        => true,
		'bounds'             => true,
		'provider_calls'     => $http_calls,
		'report_writes'      => $report_writes,
	);
} )( $attachment, $file, $prefix );
