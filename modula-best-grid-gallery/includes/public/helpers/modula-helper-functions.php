<?php

function modula_generate_image_links( $item_data, $item, $settings ) {

	if ( ! apply_filters( 'modula_resize_images', true, $settings, $item_data ) ) {
		return $item_data;
	}

	$gallery_type      = isset( $settings['type'] ) ? $settings['type'] : 'creative-gallery';
	$allowed_galleries = array( 'creative-gallery', 'custom-grid', 'grid' );

	if ( ! in_array( $gallery_type, $allowed_galleries, true ) ) {
		return $item_data;
	}

	// If the image is not resized we will try to resized it now
	// This is safe to call every time, as resize_image() will check if the image already exists, preventing thumbnails from being generated every single time.
	$resizer = new Modula_Image();

	if ( 'custom' === $settings['grid_image_size'] ) {
		if ( 'custom-grid' === $settings['type'] ) {
			$grid_sizes = array(
				'width'  => absint( $settings['img_size'] ) * absint( $item['width'] ),
				'height' => absint( $settings['img_size'] ) * absint( $item['height'] ),
			);
		} else {
			$grid_sizes = array(
				'width'  => $settings['grid_image_dimensions']['width'],
				'height' => $settings['grid_image_dimensions']['height'],
			);
		}
	} else {
		$grid_sizes = $settings['grid_image_size'];
	}

	$crop = false;

	if ( 'custom' === $settings['grid_image_size'] ) {
		if ( 'custom-grid' === $settings['type'] ) {
			$settings['img_crop'] = isset( $settings['img_crop'] ) ? $settings['img_crop'] : 1;
			$crop                 = boolval( $settings['img_crop'] );
		} else {
			$crop = boolval( $settings['grid_image_crop'] );
		}
	}

	$sizes = $resizer->get_image_size( $item['id'], $gallery_type, $grid_sizes, $crop );

	if ( is_wp_error( $sizes ) || ! is_array( $sizes ) || ! isset( $sizes['url'], $sizes['width'], $sizes['height'] ) ) {
		return $item_data;
	}

	$original_image = false;

	if ( 'full' === $grid_sizes ) {
		$original_image = wp_get_original_image_url( $item['id'] );
		$mime_type      = get_post_mime_type( $item['id'] );
		if ( 'image/heic' === $mime_type || 'image/heif' === $mime_type ) {
			$original_image = wp_get_attachment_image_src( $item['id'], 'full' );
			if ( ! $original_image || ! isset( $original_image[0] ) ) {
				$original_image = false;
			}
			$original_image = $original_image[0];
		} else {
			$original_image = wp_get_original_image_url( $item['id'] );
		}
	}

	$resized    = $resizer->resize_image( $sizes['url'], $sizes['width'], $sizes['height'], $crop );
	$image_info = false;

	// If we couldn't resize the image we will return the full image.
	if ( is_wp_error( $resized ) ) {
		$resized = $sizes['url'];
	}
	// Let's check if resize gives us both URL and image info
	// Also, if resized_url is available, image_info should be available
	if ( isset( $resized['resized_url'] ) ) {
		$image_url  = $resized['resized_url'];
		$image_info = $resized['image_info'];
	} else {
		$image_url = $resized;
	}

	$item_data['img_attributes']['width']  = $sizes['width'];
	$item_data['img_attributes']['height'] = $sizes['height'];
	$item_data['image_full']               = $sizes['url'];
	$item_data['image_url']                = ( isset( $sizes['thumb_url'] ) ) ? $sizes['thumb_url'] : $image_url;
	// If thumb_url exists it means we are in predefined sizes.
	$item_data['img_attributes']['src']      = $original_image ? $original_image : ( ( isset( $sizes['thumb_url'] ) ) ? $sizes['thumb_url'] : $image_url );
	$item_data['img_attributes']['data-src'] = $original_image ? $original_image : ( ( isset( $sizes['thumb_url'] ) ) ? $sizes['thumb_url'] : $image_url );
	$item_data['image_info']                 = $image_info;

	return $item_data;
}

/**
 * Whether the tile link overlay should render (gallery link mode or per-image URL).
 *
 * @param array<string, mixed> $item_data Processed item data.
 * @return bool
 */
function modula_item_renders_link_overlay( $item_data ) {
	$lightbox = isset( $item_data['lightbox'] ) ? (string) $item_data['lightbox'] : '';
	if ( '' === $lightbox || 'no-link' === $lightbox ) {
		return ! empty( $item_data['link_attributes']['href'] );
	}
	return true;
}

/**
 * @param object $data Item template data.
 * @return bool
 */
function modula_item_object_renders_link_overlay( $data ) {
	$lightbox = isset( $data->lightbox ) ? (string) $data->lightbox : '';
	if ( '' === $lightbox || 'no-link' === $lightbox ) {
		return ! empty( $data->link_attributes['href'] );
	}
	return true;
}

/**
 * Resolve href for external-url / attachment-page when the item has no custom link.
 *
 * Video templates and other non-attachment rows use string ids (e.g. `video_template_0`)
 * that must not be passed to `get_attachment_link()`.
 *
 * @param array<string, mixed> $item     Image row.
 * @param string               $fallback Fallback URL (e.g. full image / poster).
 * @return string
 */
function modula_resolve_simple_link_href( $item, $fallback = '' ) {
	$attachment_id = isset( $item['id'] ) && is_numeric( $item['id'] ) ? absint( $item['id'] ) : 0;
	if ( $attachment_id > 0 ) {
		return (string) get_attachment_link( $attachment_id );
	}

	foreach ( array( 'video_url', 'videoUrl', 'videoSrc' ) as $key ) {
		if ( empty( $item[ $key ] ) || ! is_string( $item[ $key ] ) ) {
			continue;
		}
		$url = trim( $item[ $key ] );
		if ( '' !== $url ) {
			return $url;
		}
	}

	return is_string( $fallback ) ? $fallback : '';
}

/**
 * Caption text for an item without calling WP attachment APIs on non-numeric ids.
 *
 * @param array<string, mixed> $item Image row.
 * @return string
 */
function modula_resolve_item_caption( $item ) {
	if ( isset( $item['description'] ) && '' !== $item['description'] ) {
		return (string) $item['description'];
	}

	$attachment_id = isset( $item['id'] ) && is_numeric( $item['id'] ) ? absint( $item['id'] ) : 0;
	if ( $attachment_id > 0 ) {
		$caption = wp_get_attachment_caption( $attachment_id );
		return is_string( $caption ) ? $caption : '';
	}

	return '';
}

/**
 * Apply a per-image custom URL when the gallery click mode is "no link".
 *
 * @param array<string, mixed> $item_data Item data.
 * @param array<string, mixed> $item      Image row.
 * @return array<string, mixed>
 */
function modula_apply_per_image_link_for_no_link_mode( $item_data, $item ) {
	$item_link = isset( $item['link'] ) ? trim( (string) $item['link'] ) : '';
	if ( '' === $item_link ) {
		return $item_data;
	}

	$item_data['link_attributes']['href']       = $item_link;
	$item_data['link_attributes']['aria-label'] = esc_html__( 'Open external link', 'modula-best-grid-gallery' );
	$item_data['link_classes'][]                = 'modula-simple-link';
	$item_data['item_classes'][]                = 'modula-simple-link';

	if ( isset( $item['target'] ) && '1' === (string) $item['target'] ) {
		$item_data['link_attributes']['target'] = '_blank';
	}

	if ( isset( $item_data['link_attributes']['role'] ) ) {
		unset( $item_data['link_attributes']['role'] );
	}

	return $item_data;
}

function modula_check_lightboxes_and_links( $item_data, $item, $settings ) {

	// Create link attributes like : title/rel
	if ( class_exists( '\Elementor\Plugin' ) ) {
		$item_data['link_attributes']['data-elementor-open-lightbox'] = 'no';
	}

	// ADA Compliance. Makes tag focusable using tab key.
	$item_data['link_attributes']['tabindex'] = 0;

	$caption = modula_resolve_item_caption( $item );

	$item_data['img_attributes']['data-caption'] = $caption;

	if ( '' === $settings['lightbox'] || 'no-link' === $settings['lightbox'] ) {
		return modula_apply_per_image_link_for_no_link_mode( $item_data, $item );
	}

	if ( 'external-url' === $settings['lightbox'] || 'attachment-page' === $settings['lightbox'] ) {
		$item_data['link_attributes']['class'][]    = 'modula-simple-link';
		$item_data['item_classes'][]                = 'modula-simple-link';
		$item_data['link_attributes']['aria-label'] = esc_html__( 'Open external link', 'modula-best-grid-gallery' );
		if ( '' !== $item['link'] ) {
			$item_data['link_attributes']['href'] = $item['link'];
			if ( isset( $item['target'] ) && '1' == $item['target'] ) {
				$item_data['link_attributes']['target'] = '_blank';
			}
		} else {
			$fallback                             = isset( $item_data['image_full'] ) ? (string) $item_data['image_full'] : '';
			$item_data['link_attributes']['href'] = modula_resolve_simple_link_href( $item, $fallback );
		}
	} elseif ( 'direct' === $settings['lightbox'] ) {
		$item_data['link_attributes']['href']       = $item_data['image_full'];
		$item_data['link_attributes']['class'][]    = 'modula-simple-link';
		$item_data['item_classes'][]                = 'modula-simple-link';
		$item_data['link_attributes']['aria-label'] = esc_html__( 'Open image', 'modula-best-grid-gallery' );
	} else {
		if ( modula_href_required() ) {
			$item_data['link_attributes']['href'] = $item_data['image_full'];
		}
		$item_data['link_attributes']['rel']          = $settings['gallery_id'];
		$item_data['link_attributes']['data-caption'] = $caption;
		$item_data['link_attributes']['aria-label']   = esc_html__( 'Open image in lightbox', 'modula-best-grid-gallery' );
		$item_data['link_attributes']['role']         = 'button';
	}

	return $item_data;
}

function modula_check_hover_effect( $item_data, $item, $settings ) {

	// v2 settings use hover.builder; legacy flat `effect` may be absent after migration.
	$effect = isset( $settings['effect'] ) ? (string) $settings['effect'] : 'none';

	// Hover builder is the Beta overlay. Classic visitor still uses legacy `effect`.
	$uses_hover_builder = false;
	$captions_below     = isset( $settings['contentPlacement'] )
		&& 'below-image' === $settings['contentPlacement'];

	/*
	 * Legacy hover effects hide overlay slots that the preset does not paint.
	 * The v2 hover builder owns those slots in CSS (on-hover / always). Mapping
	 * a missing legacy `effect` onto hide_title also blanked below-image copy.
	 */
	if ( ! $uses_hover_builder && ! $captions_below ) {
		$hover_effect_elements = Modula_Helper::hover_effects_elements( $effect );

		if ( ! $hover_effect_elements['title'] ) {
			$item_data['hide_title'] = true;
		}

		if ( ! $hover_effect_elements['description'] ) {
			$item_data['hide_description'] = true;
		}

		if ( ! $hover_effect_elements['social'] ) {
			$item_data['hide_socials'] = true;
		}
	}

	if ( 'none' !== $effect ) {
		$item_data['item_classes'][] = 'effect-' . $effect;
	}

	return $item_data;
}

function modula_check_custom_grid( $item_data, $item, $settings ) {

	if ( 'custom-grid' !== $settings['type'] ) {
		return $item_data;
	}

	$item_data['item_attributes']['data-width']  = $item['width'];
	$item_data['item_attributes']['data-height'] = $item['height'];

	return $item_data;
}

function modula_enable_lazy_load( $item_data, $item, $settings ) {

	if ( ! modula_run_lazy_load( $settings ) && apply_filters( 'modula_lazyload_compatibility_item', true ) ) {
		return $item_data;
	}

	if ( 'grid' === $settings['type'] && 'automatic' === $settings['grid_type'] ) {

		// Fix for lazyload scripts when working with Automatic Grid
		if ( ! apply_filters( 'modula_lazyload_compatibility_item', true ) ) {
			$item_data['img_classes'][] = 'lazyloaded';
			return $item_data;
		}
	}

	if ( isset( $item_data['img_classes'] ) && is_array( $item_data['img_classes'] ) ) {
		$item_data['img_classes'][] = 'lazyload';
	}

	if ( isset( $item_data['img_attributes']['src'] ) && apply_filters( 'modula_lazyload_compatibility_item', true ) ) {
		unset( $item_data['img_attributes']['src'] );
	}

	$item_data['img_attributes']['data-source'] = 'modula';

	return $item_data;
}

function modula_add_align_classes( $template_data ) {

	if ( '' !== $template_data['settings']['align'] ) {
		$template_data['gallery_container']['class'][] = 'align' . $template_data['settings']['align'];
	}

	return $template_data;
}

function modula_show_schemaorg( $settings = array() ) {
	global $wp;
	global $post;

	static $rendered_schema_ids = array();

	$should_output = apply_filters( 'modula_enable_schemaorg', true, $post );
	if ( ! $should_output ) {
		return;
	}

	$page_url = is_wp_error( $post ) || empty( $post )
		? home_url( add_query_arg( array(), $wp->request ) )
		: get_the_permalink( $post->ID );

	$schema_id = trailingslashit( $page_url );
	if ( isset( $settings['gallery_id'] ) && is_string( $settings['gallery_id'] ) ) {
		$gallery_id = absint( preg_replace( '/[^0-9]/', '', $settings['gallery_id'] ) );
		if ( $gallery_id > 0 ) {
			$schema_id = trailingslashit( $page_url ) . '#modula-gallery-' . $gallery_id;
		}
	}

	if ( isset( $rendered_schema_ids[ $schema_id ] ) ) {
		return;
	}

	$rendered_schema_ids[ $schema_id ] = true;
	?>

	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "ImageGallery",
			"id": "<?php echo esc_url( $schema_id ); ?>",
			"url": "<?php echo esc_url( trailingslashit( $page_url ) ); ?>"
		}
	</script>

	<?php
}

function modula_edit_gallery( $settings ) {
	$troubleshooting_options = get_option( 'modula_troubleshooting_option', array() );
	$disable_edit            = isset( $troubleshooting_options['disable_edit'] ) ? $troubleshooting_options['disable_edit'] : false;
	if ( apply_filters( 'modula_troubleshooting_disable_edit', $disable_edit ) ) {
		return;
	}

	$gallery_id = absint( explode( 'modula-', $settings['gallery_id'] )[1] );
	edit_post_link( __( 'Edit gallery', 'modula-best-grid-gallery' ), '', '', $gallery_id, 'post-edit-link' );
}

function modula_add_gallery_class( $template_data ) {

	if ( 'custom-grid' == $template_data['settings']['type'] ) {
		$template_data['gallery_container']['class'][] = 'modula-custom-grid';
	} elseif ( 'grid' == $template_data['settings']['type'] ) {
		$template_data['gallery_container']['class'][] = 'modula-columns';
	} elseif ( 'creative-gallery' == $template_data['settings']['type'] ) {
		$template_data['gallery_container']['class'][] = 'modula-creative-gallery';
	} elseif ( 'template' == $template_data['settings']['type'] ) {
		$template_data['gallery_container']['class'][] = 'modula-template-gallery';
		$layout_slug                                   = '';
		if ( ! empty( $template_data['settings']['template'] ) && is_array( $template_data['settings']['template'] ) ) {
			$layout_slug = isset( $template_data['settings']['template']['templateLayout'] )
				? sanitize_key( $template_data['settings']['template']['templateLayout'] )
				: '';
		}
		if ( '' !== $layout_slug ) {
			$template_data['gallery_container']['class'][] = 'modula-template-gallery--' . $layout_slug;
		}
	}

	if ( modula_run_lazy_load( $template_data['settings'] ) ) {
		$template_data['gallery_container']['class'][] = 'modula-is-lazy';
	}

	return $template_data;
}

function modula_add_scripts( $scripts, $settings ) {

	$needed_scripts = array();

	if ( ! is_array( $settings ) ) {
		return $scripts;
	}

	if ( apply_filters( 'modula_lazyload_compatibility_script', modula_run_lazy_load( $settings ), $settings ) ) {
		$needed_scripts[] = 'modula-lazysizes';
	}

	if ( 'grid' === $settings['type'] && 'automatic' === $settings['grid_type'] ) {
		$needed_scripts[] = 'modula-grid-justified-gallery';
	} else {
		$needed_scripts[] = 'modula-isotope';
		$needed_scripts[] = 'modula-isotope-packery';
	}

	if ( 'fancybox' === $settings['lightbox'] ) {
		$needed_scripts[] = 'modula-fancybox';
		$needed_scripts[] = 'modulaFancybox';
	}

	return array_merge( $needed_scripts, $scripts );
}

/**
 * Read a gallery setting from flat legacy or camelCase keys.
 *
 * @param array      $settings Gallery settings.
 * @param string     $legacy_key Snake_case key.
 * @param string     $camel_key CamelCase key.
 * @param mixed|null $default Default when missing.
 * @return mixed
 */
function modula_get_setting_value( $settings, $legacy_key, $camel_key, $default = null ) {
	if ( ! is_array( $settings ) ) {
		return $default;
	}
	if ( array_key_exists( $legacy_key, $settings ) ) {
		return $settings[ $legacy_key ];
	}
	if ( array_key_exists( $camel_key, $settings ) ) {
		return $settings[ $camel_key ];
	}
	return $default;
}

/**
 * Estimate a `sizes` attribute from gallery column breakpoints.
 *
 * Used when the image is not lazy-loaded (sizes="auto" only applies with
 * loading="lazy"). Prefer column-based vw over file pixel width — grid tiles
 * are almost never displayed at the source file width.
 *
 * @param array $settings Gallery settings (flat legacy and/or camelCase).
 * @return string|false sizes attribute value, or false when not estimable.
 */
function modula_estimate_gallery_image_sizes( $settings ) {
	if ( ! is_array( $settings ) ) {
		return false;
	}

	$type = (string) modula_get_setting_value( $settings, 'type', 'type', 'creative-gallery' );

	/*
	 * Full-bleed / single-slot layouts: the image typically spans the gallery width.
	 */
	$full_bleed = array( 'slider', 'showcase', 'story', 'video' );
	if ( in_array( $type, $full_bleed, true ) ) {
		return '100vw';
	}

	if ( 'template' === $type ) {
		return '(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw';
	}

	$enable_responsive = (bool) modula_get_setting_value( $settings, 'enable_responsive', 'enableResponsive', false );
	$cols_desktop      = absint( modula_get_setting_value( $settings, 'columns', 'columns', 4 ) );
	$cols_desktop      = max( 1, min( 12, $cols_desktop ? $cols_desktop : 4 ) );

	$cols_tablet = $enable_responsive
		? absint( modula_get_setting_value( $settings, 'tablet_columns', 'tabletColumns', 2 ) )
		: $cols_desktop;
	$cols_tablet = max( 1, min( 12, $cols_tablet ? $cols_tablet : $cols_desktop ) );

	$cols_mobile = $enable_responsive
		? absint( modula_get_setting_value( $settings, 'mobile_columns', 'mobileColumns', 1 ) )
		: $cols_desktop;
	$cols_mobile = max( 1, min( 12, $cols_mobile ? $cols_mobile : $cols_desktop ) );

	$phone_under  = absint( modula_get_setting_value( $settings, 'treat_as_phone_under', 'treatAsPhoneUnder', 600 ) );
	$tablet_under = absint( modula_get_setting_value( $settings, 'treat_as_tablet_under', 'treatAsTabletUnder', 1024 ) );
	$phone_under  = $phone_under > 0 ? $phone_under : 600;
	$tablet_under = $tablet_under > 0 ? $tablet_under : 1024;
	if ( $tablet_under <= $phone_under ) {
		$tablet_under = $phone_under + 1;
	}

	$vw = static function ( $cols ) {
		$cols = max( 1, (int) $cols );
		return (string) ( round( 100 / $cols, 2 ) ) . 'vw';
	};

	return sprintf(
		'(max-width: %1$dpx) %2$s, (max-width: %3$dpx) %4$s, %5$s',
		$phone_under,
		$vw( $cols_mobile ),
		$tablet_under,
		$vw( $cols_tablet ),
		$vw( $cols_desktop )
	);
}

/**
 * Resolve the HTML `sizes` attribute for a Modula gallery image.
 *
 * Prefer sizes="auto" when lazy-loading (browser uses real layout width — WP 6.7+).
 * Otherwise estimate from gallery columns. File-based wp_calculate_image_sizes is
 * only a last resort because grid slots are much smaller than the source file.
 *
 * Filter: `modula_template_image_sizes` (symmetric with `modula_template_image_srcset`).
 *
 * @param array $args {
 *     @type array|null    $settings      Gallery settings.
 *     @type array|null    $size_array    [width, height] of the selected source.
 *     @type string|null   $image_src     Image URL.
 *     @type array|null    $image_meta    Attachment metadata.
 *     @type int|null      $attachment_id Attachment ID.
 *     @type bool          $lazy          Whether the image uses lazy loading.
 *     @type object|array|null $data      Item data passed to filters.
 * }
 * @return string|false sizes value, or false when unavailable.
 */
function modula_resolve_image_sizes_attr( $args ) {
	$args = is_array( $args ) ? $args : array();

	$lazy     = ! empty( $args['lazy'] );
	$settings = isset( $args['settings'] ) && is_array( $args['settings'] ) ? $args['settings'] : array();
	$data     = isset( $args['data'] ) ? $args['data'] : null;

	$sizes = false;

	if ( $lazy ) {
		/*
		 * Browser / lazysizes measure the laid-out width. Valid with loading="lazy"
		 * (native) and with data-sizes="auto" (lazysizes).
		 */
		$sizes = 'auto';
	} else {
		$sizes = modula_estimate_gallery_image_sizes( $settings );
	}

	if ( ! $sizes && ! empty( $args['size_array'] ) && is_array( $args['size_array'] ) && function_exists( 'wp_calculate_image_sizes' ) ) {
		$image_src     = isset( $args['image_src'] ) ? (string) $args['image_src'] : '';
		$image_meta    = isset( $args['image_meta'] ) && is_array( $args['image_meta'] ) ? $args['image_meta'] : array();
		$attachment_id = isset( $args['attachment_id'] ) ? (int) $args['attachment_id'] : 0;
		$sizes         = wp_calculate_image_sizes( $args['size_array'], $image_src, $image_meta, $attachment_id );
	}

	/**
	 * Filter the sizes attribute for Modula gallery images.
	 *
	 * @since 3.0.0
	 *
	 * @param string|false     $sizes Resolved sizes value.
	 * @param object|array|null $data Item data when available.
	 * @param array            $args Full resolver args.
	 */
	return apply_filters( 'modula_template_image_sizes', $sizes, $data, $args );
}

/**
 * Add srcset and sizes to images
 *
 * @param $data
 *
 * @since 2.5.2
 * Inspired by wp_image_add_srcset_and_sizes
 */
function modula_sources_and_sizes( $data ) {

	// Lets creat our $image object
	$image = '<img class="' . esc_attr( implode( ' ', $data->img_classes ) ) . '" ' . Modula_Helper::generate_attributes( $data->img_attributes ) . '/>';

	// Check if srcset is disabled for an early return.
	$troubleshoot_opt = get_option( 'modula_troubleshooting_option', array() );
	$disable_srcset   = isset( $troubleshoot_opt['disable_srcset'] ) ? boolval( $troubleshoot_opt['disable_srcset'] ) : false;

	if ( true === apply_filters( 'modula_troubleshooting_disable_srcset', $disable_srcset ) ) {
		echo $image;
		return;
	}

	// Cropped output: skip srcset — it targets the original attachment, not the crop.
	if (
		( isset( $data->gallery_type ) && 'slider' === $data->gallery_type && isset( $data->img_attributes['crop'] ) && $data->img_attributes['crop'] )
		|| ( ! empty( $data->custom_grid ) && ! empty( $data->crop ) )
	) {
		echo $image;
		return;
	}

	$image_meta = array();
	// Get the imag meta
	if ( isset( $data->link_attributes['data-image-id'] ) ) {
		$image_meta = wp_get_attachment_metadata( $data->link_attributes['data-image-id'] );
	}

	$mime_type = '';

	if ( isset( $image_meta['sizes']['thumbnail']['mime-type'] ) ) {
		$mime_type = $image_meta['sizes']['thumbnail']['mime-type'];
	} elseif ( function_exists( 'mime_content_type' ) && isset( $data->image_info ) && $data->image_info ) {
		$mime_type = mime_content_type( $data->image_info['file_path'] );
	}

	//Add custom size only if it's different than original image size
	if ( ! empty( $data->image_info ) && $data->image_info && ! empty( $image_meta ) && $image_meta['width'] !== $data->img_attributes['width'] && $image_meta['height'] !== $data->img_attributes['height'] ) {
		$image_meta['sizes']['custom'] = array(
			'file'      => $data->image_info['name'] . '-' . $data->image_info['suffix'] . '.' . $data->image_info['ext'],
			'width'     => $data->img_attributes['width'],
			'height'    => $data->img_attributes['height'],
			'mime-type' => $mime_type,
		);
	}
	// Ensure the image meta exists.
	if ( empty( $image_meta['sizes'] ) ) {
		echo $image;
		return;
	}

	$attachment_id = $data->link_attributes['data-image-id'];

	$image_src       = preg_match( '/src="([^"]+)"/', $image, $match_src ) ? $match_src[1] : '';
	list($image_src) = explode( '?', $image_src );

	// Return early if we couldn't get the image source.
	if ( ! $image_src ) {
		echo $image;

		return;
	}

	// Bail early if an image has been inserted and later edited.
	if (
		preg_match( '/-e[0-9]{13}/', $image_meta['file'], $img_edit_hash ) &&
		strpos( wp_basename( $image_src ), $img_edit_hash[0] ) === false
	) {
		echo $image;

		return;
	}

	$width  = preg_match( '/ width="([0-9]+)"/', $image, $match_width ) ? (int) $match_width[1] : 0;
	$height = preg_match( '/ height="([0-9]+)"/', $image, $match_height ) ? (int) $match_height[1] : 0;

	if ( $width && $height ) {
		$size_array = array( $width, $height );
	} else {
		$size_array = wp_image_src_get_dimensions( $image_src, $image_meta, $attachment_id );
		if ( ! $size_array ) {
			echo $image;

			return;
		}
	}

	$srcset = apply_filters( 'modula_template_image_srcset', array(), $data, $image_meta );

	if ( empty( $srcset ) ) {
		if ( ! isset( $data->image_full ) ) {
			$data->image_full = $image_src;
		}
		$srcset = wp_calculate_image_srcset( $size_array, $data->image_full, $image_meta, $attachment_id );
	}

	if ( $srcset ) {
		// Check if there is already a 'sizes' attribute.
		$sizes = strpos( $image, ' data-sizes=' );

		if ( ! $sizes ) {
			$sizes = modula_resolve_image_sizes_attr(
				array(
					'settings'      => isset( $data->settings ) && is_array( $data->settings ) ? $data->settings : array(),
					'size_array'    => $size_array,
					'image_src'     => $image_src,
					'image_meta'    => $image_meta,
					'attachment_id' => $attachment_id,
					'lazy'          => ! empty( $data->lazyLoad ),
					'data'          => $data,
				)
			);
		}
	}

	if ( $srcset && $sizes ) {

		// Format the 'srcset' and 'sizes' string and escape attributes.
		// Check if lazy load is enabled and add data-srcset and data-sizes
		if ( $data->lazyLoad ) {
			$attr = sprintf( ' data-srcset="%1$s"', esc_attr( $srcset ) );

			if ( is_string( $sizes ) ) {
				$attr .= sprintf( ' data-sizes="%1$s"', esc_attr( $sizes ) );
			}
		} else {
			$attr = sprintf( ' srcset="%s"', esc_attr( $srcset ) );

			if ( is_string( $sizes ) ) {
				$attr .= sprintf( ' sizes="%s"', esc_attr( $sizes ) );
			}
		}

		// Add the srcset and sizes attributes to the image markup.
		echo preg_replace( '/<img ([^>]+?)[\/ ]*>/', '<img $1' . $attr . ' />', $image );

		return;
	}

	echo $image;
}

/**
 * Checks versions of plugins before we remove href attribute from image link
 *
 *
 * @since 2.7.2
 */
function modula_href_required() {

	if (
		( ( defined( 'MODULA_PRO_VERSION' ) && version_compare( MODULA_PRO_VERSION, '2.6.3', '>=' ) ) || ! defined( 'MODULA_PRO_VERSION' ) ) &&
		( ( defined( 'MODULA_VIDEO_VERSION' ) && version_compare( MODULA_VIDEO_VERSION, '1.0.9', '>=' ) ) || ! defined( 'MODULA_VIDEO_VERSION' ) ) &&
		( ( defined( 'MODULA_SLIDER_VERSION' ) && version_compare( MODULA_SLIDER_VERSION, '1.1.1', '>=' ) ) || ! defined( 'MODULA_SLIDER_VERSION' ) ) &&
		( ( defined( 'MODULA_SPEEDUP_VERSION' ) && version_compare( MODULA_SPEEDUP_VERSION, '1.0.14', '>=' ) ) || ! defined( 'MODULA_SPEEDUP_VERSION' ) ) &&
		( ( defined( 'MODULA_WATERMARK_VERSION' ) && version_compare( MODULA_WATERMARK_VERSION, '1.0.8', '>=' ) ) || ! defined( 'MODULA_WATERMARK_VERSION' ) )
	) {
		return false;
	}

	return true;
}

function modula_mobile_share( $data ) {

	if ( isset( $data->enableSocial ) && ! Modula_Helper::is_truthy_flag( $data->enableSocial ) ) {
		return;
	}

	$any_social = $data->enableTwitter || $data->enableFacebook || $data->enableWhatsapp || $data->enablePinterest || $data->enableLinkedin || $data->enableEmail || ! empty( $data->download['download_button'] );

	if ( ! $any_social ) {
		return;
	}

	?>
	<div class="modula-social-expandable <?php echo $data->socialDesktopCollapsed ? esc_attr( 'modula-social-desktop-collapsed' ) : ''; ?>">
		<a class="modula-icon-share" aria-label="<?php echo esc_html__( 'Click to share', 'modula-best-grid-gallery' ); ?>" href="#"><?php echo Modula_Helper::get_icon( 'share' ); ?></a>
	</div>
	<div class="modula-social-expandable-icons <?php echo $data->socialDesktopCollapsed ? esc_attr( 'modula-social-desktop-collapsed' ) : ''; ?>">
		<?php if ( $data->enableTwitter ) : ?>
			<a class="modula-icon-twitter" aria-label="<?php echo esc_html__( 'Share on X', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo Modula_Helper::get_icon( 'twitter' ); ?></a>
		<?php endif ?>
		<?php if ( $data->enableFacebook ) : ?>
			<a class="modula-icon-facebook" aria-label="<?php echo esc_html__( 'Share on Facebook', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?>
				href="#"><?php echo Modula_Helper::get_icon( 'facebook' ); ?></a>
		<?php endif ?>
		<?php if ( $data->enableWhatsapp ) : ?>
			<a class="modula-icon-whatsapp" aria-label="<?php echo esc_html__( 'Share on Whatsapp', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?>
				href="#"><?php echo Modula_Helper::get_icon( 'whatsapp' ); ?></a>
		<?php endif ?>
		<?php if ( $data->enablePinterest ) : ?>
			<a class="modula-icon-pinterest" aria-label="<?php echo esc_html__( 'Share on Pinterest', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?>
				href="#"><?php echo Modula_Helper::get_icon( 'pinterest' ); ?></a>
		<?php endif ?>
		<?php if ( $data->enableLinkedin ) : ?>
			<a class="modula-icon-linkedin" aria-label="<?php echo esc_html__( 'Share on LinkedIn', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?>
				href="#"><?php echo Modula_Helper::get_icon( 'linkedin' ); ?></a>
		<?php endif ?>
		<?php if ( $data->enableEmail ) : ?>
			<a class="modula-icon-email" aria-label="<?php echo esc_html__( 'Share by Email', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo Modula_Helper::get_icon( 'email' ); ?></a>
		<?php endif ?>
		<?php do_action( 'modula_extra_socials', $data ); ?>
	</div>
	<?php
}

function modula_run_lazy_load( $settings ) {
	return isset( $settings['lazy_load'] ) && apply_filters( 'modula_gallery_lazyload_state', 1 === $settings['lazy_load'], $settings );
}
