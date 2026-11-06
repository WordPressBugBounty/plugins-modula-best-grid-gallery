<?php

class Modula_Image {

	public function __construct() {}

	/**
	 * Helper method to return the image size depending on image orientation( landscape/portrait ).
	 *
	 * @param int    $id The image ID.
	 * @param string $type
	 * @param array  $sizes
	 * @param        $crop
	 *
	 * @return WP_Error|string Return WP_Error on error, array of data on success.
	 * @since 2.0.0
	 *
	 */
	public function get_image_size( $id, $type = 'creative-gallery', $sizes = array(), $crop = false ) {

		$image_full = wp_get_attachment_image_src( $id, 'full' );

		if ( $image_full ) {
			$return = array(
				'url' => $image_full[0],
			);

			$gallery_types = array( 'creative-gallery', 'custom-grid', 'grid', 'justified-grid', 'parallax-masonry', 'uniform-grid', 'fit-grid', 'polaroid' );

			if ( in_array( $type, $gallery_types, true ) ) {
				if ( is_array( $sizes ) && ! empty( $sizes ) ) {
					$size_width  = isset( $sizes['width'] ) ? $sizes['width'] : 0;
					$size_height = isset( $sizes['height'] ) ? $sizes['height'] : 0;

					if ( ! $crop ) {
						$ratio  = (float) ( (int) $image_full[1] / (int) $image_full[2] );
						$width  = absint( $size_width );
						$height = absint( $size_height );

						if ( 0 === $width || 0 === $height ) {
							if ( 0 === $width ) {
								$width = $height * $ratio;
							} else {
								$height = $width / $ratio;
							}
						} elseif ( $size_width / $size_height !== $image_full[1] / $image_full[2] ) {
							if ( $size_width <= $size_height ) {
								$height = $size_width / $ratio;
							} else {
								$width = $size_height * $ratio;
							}
						}

						if ( $width > $image_full[1] || $height > $image_full[2] ) {
							$return['width']  = $image_full[1];
							$return['height'] = $image_full[2];
						} else {
							$return['width']  = (int) $width;
							$return['height'] = (int) $height;
						}
					} elseif ( $size_width > $image_full[1] || $size_height > $image_full[2] ) {
						$return['width']  = $image_full[1];
						$return['height'] = $image_full[2];
					} else {
						$return['width']  = $size_width;
						$return['height'] = $size_height;
					}
				} else {
					$image_sizes = wp_get_attachment_image_src( $id, $sizes );

					if ( $image_sizes ) {
						$return['width']     = $image_sizes[1];
						$return['height']    = $image_sizes[2];
						$return['thumb_url'] = $image_sizes[0];
					}
				}
			} else {
				$return = apply_filters( "modula_resize_image_{$type}", $return, $id, $sizes, $crop );
			}

			if ( ! is_array( $return ) ) {
				$return = array(
					'url' => $image_full[0],
				);
			}

			if ( ! isset( $return['width'], $return['height'] ) ) {
				$return['width']  = (int) $image_full[1];
				$return['height'] = (int) $image_full[2];
			}

			return $return;
		} else {
			return new WP_Error( 'modula-gallery-error-no-url', esc_html__( 'No image with this ID.', 'modula-best-grid-gallery' ) );
		}
	}

	/**
	 * Helper method to return common information about an image.
	 *
	 * @since 2.0.0
	 *
	 * @param array $args      List of resizing args to expand for gathering info.
	 * @return WP_Error|string Return WP_Error on error, array of data on success.
	 */
	public function get_image_info( $args ) {

		// Unpack arguments.
		list($url, $width, $height, $crop, $align, $quality, $retina, $data) = $args;

		// Return an error if no URL is present.
		if ( empty( $url ) ) {
			return new WP_Error( 'modula-gallery-error-no-url', esc_html__( 'No image URL specified for cropping.', 'modula-best-grid-gallery' ) );
		}

		// Get the image file path.
		$urlinfo       = wp_parse_url( $url );
		$wp_upload_dir = wp_upload_dir();

		// Interpret the file path of the image.
		if ( preg_match( '/\/[0-9]{4}\/[0-9]{2}\/.+$/', $urlinfo['path'], $matches ) ) {
			$file_path = $wp_upload_dir['basedir'] . $matches[0];
		} else {
			$pathinfo = wp_parse_url( $url );
			// $uploads_dir = is_multisite() ? '/files/' : '/wp-content/';
			$uploads_dir = is_multisite() ? '/files/' : '/' . str_replace( ABSPATH, '', WP_CONTENT_DIR ) . '/';
			$file_path   = ABSPATH . str_replace( dirname( isset( $_SERVER['SCRIPT_NAME'] ) ? sanitize_text_field( wp_unslash( $_SERVER['SCRIPT_NAME'] ) ) : '' ) . '/', '', strstr( $pathinfo['path'], $uploads_dir ) );
			$file_path   = preg_replace( '/(\/\/)/', '/', $file_path );
		}

		// Attempt to stream and import the image if it does not exist based on URL provided.
		if ( ! file_exists( $file_path ) ) {
			return new WP_Error( 'modula-gallery-error-no-file', esc_html__( 'No file could be found for the image URL specified.', 'modula-best-grid-gallery' ) );
		}

		// Attempt to stream and import the image if it does not exist based on URL provided.
		if ( ! file_exists( $file_path ) ) {
			return new WP_Error( 'modula-gallery-error-no-file', esc_html__( 'No file could be found for the image URL specified.', 'modula-best-grid-gallery' ) );
		}

		// Get original image size.
		$size = @getimagesize( $file_path );

		// If no size data obtained, return an error.
		if ( ! $size ) {
			return new WP_Error( 'modula-gallery-error-no-size', esc_html__( 'The dimensions of the original image could not be retrieved for cropping.', 'modula-best-grid-gallery' ) );
		}

		// Set original width and height.
		list($orig_width, $orig_height, $orig_type) = $size;

		// Generate width or height if not provided.
		if ( $width && ! $height ) {
			$height = floor( $orig_height * ( $width / $orig_width ) );
		} elseif ( $height && ! $width ) {
			$width = floor( $orig_width * ( $height / $orig_height ) );
		} elseif ( ! $width && ! $height ) {
			return new WP_Error( 'modula-gallery-error-no-size', esc_html__( 'The dimensions of the original image could not be retrieved for cropping.', 'modula-best-grid-gallery' ) );
		}

		// Allow for different retina image sizes.
		$retina = $retina ? ( true === $retina ? 2 : $retina ) : 1;

		// Destination width and height variables
		$dest_width  = $width * $retina;
		$dest_height = $height * $retina;

		// Some additional info about the image.
		$info = pathinfo( $file_path );
		$dir  = $info['dirname'];
		$ext  = $info['extension'];
		$name = wp_basename( $file_path, ".$ext" );

		// Suffix applied to filename
		$suffix = "{$dest_width}x{$dest_height}";

		// Set alignment information on the file.
		if ( $crop ) {
			$suffix .= ( $align ) ? "_{$align}" : '_c';
		}
		// Native WordPress encoding must not reuse an existing quality-100 file.
		// Keep the legacy cache and its callers unchanged.
		if ( null === $quality ) {
			$suffix .= '_wp';
		}

		// The editor's save() may rename the extension; predict the file it writes.
		$crop_ext       = self::crop_extension( $file_path );
		$dest_file_name = "{$dir}/{$name}-{$suffix}.{$crop_ext}";

		// Return the info. `ext` is the crop's extension, so name-suffix.ext is the crop file.
		$info = array(
			'dir'            => $dir,
			'name'           => $name,
			'ext'            => $crop_ext,
			'suffix'         => $suffix,
			'orig_width'     => $orig_width,
			'orig_height'    => $orig_height,
			'orig_type'      => $orig_type,
			'dest_width'     => $dest_width,
			'dest_height'    => $dest_height,
			'file_path'      => $file_path,
			'dest_file_name' => $dest_file_name,
		);

		return $info;
	}

	/**
	 * Method for cropping & resize images.
	 *
	 * @since 2.0.0
	 *
	 * @global object $wpdb The $wpdb database object.
	 *
	 * @param string $url      The URL of the image to resize.
	 * @param int $width       The width for cropping the image.
	 * @param int $height      The height for cropping the image.
	 * @param bool $crop       Whether or not to crop the image (default yes).
	 * @param string $align    The crop position alignment.
	 * @param int|null $quality Encoding quality; null uses the site's WordPress defaults and filters.
	 * @param bool $retina     Whether or not to make a retina copy of image.
	 * @param array $data      Array of gallery data (optional).
	 * @param bool $force_overwrite      Forces an overwrite even if the thumbnail already exists (useful for applying watermarks)
	 * @return WP_Error|string Return WP_Error on error, URL of resized image on success.
	 */
	public function resize_image( $url, $width = null, $height = null, $crop = false, $align = 'c', $quality = 100, $retina = false, $data = array(), $force_overwrite = false ) {
		$args = func_get_args();
		if ( class_exists( '\WPChill\Folders\Mutation_Lock' ) ) {
			global $wpdb;
			$upload_dir = wp_upload_dir();
			$relative = str_replace( $upload_dir['baseurl'] . '/', '', $url );
			$attachment_id = (int) $wpdb->get_var( $wpdb->prepare( "SELECT post_id FROM $wpdb->postmeta WHERE meta_key = '_wp_attached_file' AND meta_value = %s", $relative ) );
			if ( $attachment_id ) {
				return \WPChill\Folders\Mutation_Lock::run( 'attachment:' . $attachment_id, function () use ( $args, $attachment_id ) {
					// A replacement may have completed while this visitor waited.
					clean_post_cache( $attachment_id );
					return $this->resize_image_locked( ...$args );
				} );
			}
		}
		return $this->resize_image_locked( ...$args );
	}

	/** Generate crop bytes and their metadata within the shared attachment lock. */
	private function resize_image_locked( $url, $width = null, $height = null, $crop = false, $align = 'c', $quality = 100, $retina = false, $data = array(), $force_overwrite = false ) {

		global $wpdb;
		$upload_dir = wp_upload_dir();

		// Get common vars.
		$args = array( $url, $width, $height, $crop, $align, $quality, $retina, $data );

		// Filter args
		$args = apply_filters( 'modula_gallery_resize_image_args', $args );

		// Don't resize images that don't belong to this site's URL
		// Strip ?lang=fr from blog's URL - WPML adds this on
		// and means our next statement fails
		if ( is_multisite() ) {
			$site_url = preg_replace( '/\?.*/', '', network_site_url() );
		} else {
			$site_url = preg_replace( '/\?.*/', '', get_bloginfo( 'url' ) );
		}

		// WPML check - if there is a /fr or any domain in the url, then remove that from the $site_url
		if ( defined( 'ICL_LANGUAGE_CODE' ) ) {
			if ( strpos( $site_url, '/' . ICL_LANGUAGE_CODE ) !== false ) {
				$site_url = str_replace( '/' . ICL_LANGUAGE_CODE, '', $site_url );
			}
		}

		if ( function_exists( 'trp_get_url_for_language' ) ) {
			$current_lang = function_exists( 'trp_get_current_language' ) ? trp_get_current_language() : '';
			if ( strpos( $site_url, '/' . $current_lang ) !== false ) {
				$site_url = str_replace( '/' . $current_lang, '', $site_url );
			}
		}

		if ( strpos( $url, $site_url ) === false ) {
			return $url;
		}

		// Get image info
		$common = $this->get_image_info( $args );

		// Unpack variables if an array, otherwise return WP_Error.
		if ( is_wp_error( $common ) ) {
			return $common;
		} else {
			extract( $common );
		}

		// If the destination width/height values are the same as the original, don't do anything.
		if ( ! $force_overwrite && $orig_width === $dest_width && $orig_height === $dest_height ) {
			return array(
				'resized_url' => $url,
				'image_info'  => $common,
			);
		}

		// If the file doesn't exist yet, we need to create it.
		if ( ! file_exists( $dest_file_name ) || ( file_exists( $dest_file_name ) && $force_overwrite ) ) {

			// We only want to resize Media Library images, so we can be sure they get deleted correctly when appropriate.
			$_wp_attached_file = str_replace( $upload_dir['baseurl'] . '/', '', $url );
			$get_attachment    = $wpdb->get_var( $wpdb->prepare( "SELECT post_id FROM $wpdb->postmeta WHERE meta_key='_wp_attached_file' AND meta_value='%s'", $_wp_attached_file ) );

			// Load the WordPress image editor.
			$editor = wp_get_image_editor( $file_path );

			// If an editor cannot be found, the user needs to have GD or Imagick installed.
			if ( is_wp_error( $editor ) ) {
				return new WP_Error( 'modula-gallery-error-no-editor', esc_html__( 'No image editor could be selected. Please verify with your webhost that you have either the GD or Imagick image library compiled with your PHP install on your server.', 'modula-best-grid-gallery' ) );
			}

			// Set the image editor quality.
			if ( null !== $quality ) {
				$editor->set_quality( $quality );
			}

			// If cropping, process cropping.
			if ( $crop ) {
				$src_x = 0;
				$src_y = 0;
				$src_w = $orig_width;
				$src_h = $orig_height;

				$cmp_x = $orig_width / $dest_width;
				$cmp_y = $orig_height / $dest_height;

				// Calculate x or y coordinate and width or height of source
				if ( $cmp_x > $cmp_y ) {
					$src_w = round( $orig_width / $cmp_x * $cmp_y );
					$src_x = round( ( $orig_width - ( $orig_width / $cmp_x * $cmp_y ) ) / 2 );
				} elseif ( $cmp_y > $cmp_x ) {
					$src_h = round( $orig_height / $cmp_y * $cmp_x );
					$src_y = round( ( $orig_height - ( $orig_height / $cmp_y * $cmp_x ) ) / 2 );
				}

				// Positional cropping.
				if ( $align && 'c' !== $align ) {
					if ( strpos( $align, 't' ) !== false || strpos( $align, 'tr' ) !== false || strpos( $align, 'tl' ) !== false ) {
						$src_y = 0;
					}

					if ( strpos( $align, 'b' ) !== false || strpos( $align, 'br' ) !== false || strpos( $align, 'bl' ) !== false ) {
						$src_y = $orig_height - $src_h;
					}

					if ( strpos( $align, 'l' ) !== false ) {
						$src_x = 0;
					}

					if ( strpos( $align, 'r' ) !== false ) {
						$src_x = $orig_width - $src_w;
					}
				}

				// Crop the image.
				$editor->crop( $src_x, $src_y, $src_w, $src_h, $dest_width, $dest_height );
			} else {
				// Just resize the image.
				$editor->resize( $dest_width, $dest_height );
			}
			if ( null === $quality ) {
				// Native quality filters receive the output dimensions, as in WP resizing.
				$editor->set_quality();
			}

			// Save the image.
			$saved = $editor->save( $dest_file_name );

			// Print possible out of memory errors.
			if ( is_wp_error( $saved ) ) {
				@unlink( $dest_file_name );
				return $saved;
			}

			// Add the resized dimensions and alignment to original image metadata, so the images
			// can be deleted when the original image is delete from the Media Library.
			if ( $get_attachment ) {
				$this->record_crop_suffix( (int) $get_attachment, $suffix );
			}

			// Set the resized image URL.
			$resized_url = str_replace( basename( $url ), basename( $saved['path'] ), $url );
		} else {
			// Set the resized image URL.
			$resized_url = str_replace( basename( $url ), basename( $dest_file_name ), $url );
		}

		$return = array(
			'resized_url' => $resized_url,
			'image_info'  => $common,
		);
		// Return the resized image URL.
		return $return;
	}

	/**
	 * The extension the WordPress image editor saves a crop of this file under.
	 *
	 * Mirrors WP_Image_Editor::get_output_format() for a destination that keeps
	 * the original's extension: the extension is lowercased, and when the
	 * `image_editor_output_format` mapping converts the type (HEIC → JPEG by
	 * default since WP 6.7, JPEG → WebP on sites that filter it) and an editor
	 * can write the target type, the target type's default extension wins.
	 *
	 * @param string $file_path Path of the original image.
	 * @return string Extension without the leading dot.
	 */
	public static function crop_extension( $file_path ) {
		$extension = strtolower( pathinfo( $file_path, PATHINFO_EXTENSION ) );
		$filetype  = wp_check_filetype( $file_path );

		// WordPress < 5.8 has no output-format mapping.
		if ( empty( $filetype['type'] ) || ! function_exists( 'wp_get_default_extension_for_mime_type' ) ) {
			return $extension;
		}

		$output_mime = self::mapped_output_mime( $file_path, $filetype['type'] );
		if ( '' === $output_mime ) {
			return $extension;
		}

		$output_extension = wp_get_default_extension_for_mime_type( $output_mime );

		return $output_extension ? $output_extension : $extension;
	}

	/**
	 * Every path a crop of this file may sit at: the editor's current output
	 * path first, then the original-extension path crops used to be predicted
	 * at (legacy files, cleaned up alongside).
	 *
	 * @param string $file_path Path of the original image.
	 * @param string $suffix    Crop suffix as stored in `resized_images`.
	 * @return string[] Unique candidate paths.
	 */
	public static function crop_file_paths( $file_path, $suffix ) {
		$info       = pathinfo( $file_path );
		$extensions = array( self::crop_extension( $file_path ), pathinfo( $file_path, PATHINFO_EXTENSION ) );
		$paths      = array();

		foreach ( array_unique( $extensions ) as $extension ) {
			$paths[] = "{$info['dirname']}/{$info['filename']}-{$suffix}.{$extension}";
		}

		return $paths;
	}

	/**
	 * Adds a crop suffix to the `resized_images` list, keeping each suffix once.
	 *
	 * Duplicates written before the list was de-duplicated collapse here too.
	 *
	 * @param mixed  $suffixes Stored `resized_images` value.
	 * @param string $suffix   Crop suffix to record.
	 * @return string[] Unique suffixes, in first-seen order.
	 */
	public static function add_crop_suffix( $suffixes, $suffix ) {
		$suffixes   = is_array( $suffixes ) ? $suffixes : array();
		$suffixes[] = $suffix;

		return array_values( array_unique( $suffixes ) );
	}

	/**
	 * Records a crop suffix in the attachment metadata, writing only on change.
	 *
	 * @param int    $attachment_id Attachment the crop belongs to.
	 * @param string $suffix        Crop suffix.
	 * @return void
	 */
	private function record_crop_suffix( $attachment_id, $suffix ) {
		$metadata = wp_get_attachment_metadata( $attachment_id );
		if ( ! isset( $metadata['image_meta'] ) ) {
			return;
		}

		$current = isset( $metadata['image_meta']['resized_images'] ) ? $metadata['image_meta']['resized_images'] : array();
		$updated = self::add_crop_suffix( $current, $suffix );
		if ( $updated === $current ) {
			return;
		}

		$metadata['image_meta']['resized_images'] = $updated;
		wp_update_attachment_metadata( $attachment_id, $metadata );
	}

	/**
	 * The mime type `image_editor_output_format` converts this type to, when an
	 * editor can write it (the editor keeps the source type otherwise).
	 *
	 * @param string $file_path Path passed to the filter, as the editor does.
	 * @param string $mime_type Source mime type.
	 * @return string Target mime type, or '' when the type is not converted.
	 */
	private static function mapped_output_mime( $file_path, $mime_type ) {
		// WordPress 5.8–6.6 applied the filter inline with an empty default.
		$output_format = function_exists( 'wp_get_image_editor_output_format' )
			? wp_get_image_editor_output_format( $file_path, $mime_type )
			: apply_filters( 'image_editor_output_format', array(), $file_path, $mime_type ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Core's filter, applied as the editor does.

		if ( ! is_array( $output_format ) || empty( $output_format[ $mime_type ] ) ) {
			return '';
		}

		$output_mime = $output_format[ $mime_type ];

		return self::editor_supports_mime( $output_mime ) ? $output_mime : '';
	}

	/**
	 * Whether an available image editor can write this mime type, once per request.
	 *
	 * @param string $mime_type Mime type.
	 * @return bool
	 */
	private static function editor_supports_mime( $mime_type ) {
		static $supported = array();

		if ( ! isset( $supported[ $mime_type ] ) ) {
			$supported[ $mime_type ] = wp_image_editor_supports( array( 'mime_type' => $mime_type ) );
		}

		return $supported[ $mime_type ];
	}
}
