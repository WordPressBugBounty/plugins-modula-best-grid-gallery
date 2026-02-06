<?php

/**
 * Compatibility helpers for media and admin UI.
 */
class Modula_Media_Compat {

	/**
	 * Allow WebP uploads.
	 *
	 * @param array $mimes
	 * @return array
	 */
	public function modula_upload_mime_types( $mimes ) {

		$mimes['webp'] = 'image/webp';

		return $mimes;
	}

	/**
	 * Enable WebP preview/thumbnail support.
	 *
	 * @param bool  $result
	 * @param mixed $path
	 * @return bool
	 */
	public function modula_webp_display( $result, $path ) {
		if ( $result === false && IMAGETYPE_WEBP ) {
			$displayable_image_types = array( IMAGETYPE_WEBP );
			$info                    = @getimagesize( $path );

			if ( empty( $info ) ) {
				$result = false;
			} elseif ( ! in_array( $info[2], $displayable_image_types, true ) ) {
				$result = false;
			} else {
				$result = true;
			}
		}

		return $result;
	}

	/**
	 * Add the `modula-no-drag` class to body to hide arrows.
	 *
	 * @param string $classes
	 * @return string
	 */
	public function no_drag_classes( $classes ) {

		$classes .= ' modula-no-drag';

		return $classes;
	}
}
