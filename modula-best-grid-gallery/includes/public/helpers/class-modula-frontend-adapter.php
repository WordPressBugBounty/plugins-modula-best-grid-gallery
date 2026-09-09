<?php

/**
 * Modula Gallery - Frontend Data Adapter
 * Converts existing Modula settings/items to new JSON format for modern frontend
 * Maintains backward compatibility - only outputs when enabled via filter
 *
 * @package Modula
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Modula Frontend Data Adapter
 * Translates existing Modula data format to new frontend JSON format
 */
class Modula_Frontend_Adapter {


	/**
	 * Check if adapter should output data
	 * Can be controlled via filter for backward compatibility
	 *
	 * @return bool Whether to output adapter data
	 */
	public static function should_output() {
		/**
		 * Filter: modula_frontend_adapter_enabled
		 *
		 * @param bool $enabled Whether adapter should output data
		 * @return bool
		 */
		return apply_filters( 'modula_frontend_adapter_enabled', true );
	}

	/**
	 * Convert settings to new config format
	 *
	 * @param array  $settings - Existing Modula settings
	 * @param string $type     - Gallery type
	 * @param bool   $inView   - InView setting
	 * @return array New config format
	 */
	public static function convert_config( $settings, $type, $inView = false ) {
		// Use existing get_jsconfig method as base
		$js_config = Modula_Shortcode::get_jsconfig( $settings, $type, $inView );

		// Number of columns: for grid type use modula-settings[grid_type] (1-12 or 'automatic').
		$grid_type = isset( $settings['grid_type'] ) ? $settings['grid_type'] : ( isset( $js_config['grid_type'] ) ? $js_config['grid_type'] : 'automatic' );
		$columns   = 12;
		if ( 'grid' === $type && '' !== $grid_type && 'automatic' !== $grid_type && is_numeric( $grid_type ) ) {
			$columns = min( 12, max( 1, absint( $grid_type ) ) );
		} elseif ( isset( $js_config['columns'] ) ) {
			$columns = absint( $js_config['columns'] );
		}

		// Map to new config format
		$config = array(
			// Basic settings
			'type'                   => $type,
			'columns'                => $columns,
			'gutter'                 => isset( $js_config['gutter'] ) ? absint( $js_config['gutter'] ) : 10,
			'desktopGutter'          => isset( $js_config['desktopGutter'] ) ? absint( $js_config['desktopGutter'] ) : absint( $js_config['gutter'] ),
			'tabletGutter'           => isset( $js_config['tabletGutter'] ) ? absint( $js_config['tabletGutter'] ) : absint( $js_config['gutter'] ),
			'mobileGutter'           => isset( $js_config['mobileGutter'] ) ? absint( $js_config['mobileGutter'] ) : absint( $js_config['gutter'] ),
			'enableResponsive'       => isset( $js_config['enableResponsive'] ) ? absint( $js_config['enableResponsive'] ) : 0,
			'tabletColumns'          => isset( $js_config['tabletColumns'] ) ? absint( $js_config['tabletColumns'] ) : 2,
			'mobileColumns'          => isset( $js_config['mobileColumns'] ) ? absint( $js_config['mobileColumns'] ) : 1,

			// Height settings
			'height'                 => isset( $js_config['height'] ) ? absint( $js_config['height'] ) : 800,
			'desktopHeight'          => isset( $js_config['desktopHeight'] ) ? absint( $js_config['desktopHeight'] ) : ( isset( $js_config['height'] ) ? absint( $js_config['height'] ) : 800 ),
			'tabletHeight'           => isset( $js_config['tabletHeight'] ) ? absint( $js_config['tabletHeight'] ) : ( isset( $js_config['height'] ) ? absint( $js_config['height'] ) : 800 ),
			'mobileHeight'           => isset( $js_config['mobileHeight'] ) ? absint( $js_config['mobileHeight'] ) : ( isset( $js_config['height'] ) ? absint( $js_config['height'] ) : 800 ),

			// Lightbox
			'lightbox'               => isset( $js_config['lightbox'] ) ? $js_config['lightbox'] : 'fancybox',
			'lightboxOpts'           => isset( $js_config['lightboxOpts'] ) ? $js_config['lightboxOpts'] : array(),

			// Social sharing
			'enableSocial'           => isset( $settings['enableSocial'] ) ? boolval( $settings['enableSocial'] ) : false,
			'enableTwitter'          => isset( $js_config['enableTwitter'] ) ? boolval( $js_config['enableTwitter'] ) : false,
			'enableFacebook'         => isset( $js_config['enableFacebook'] ) ? boolval( $js_config['enableFacebook'] ) : false,
			'enableWhatsapp'         => isset( $js_config['enableWhatsapp'] ) ? boolval( $js_config['enableWhatsapp'] ) : false,
			'enablePinterest'        => isset( $js_config['enablePinterest'] ) ? boolval( $js_config['enablePinterest'] ) : false,
			'enableLinkedin'         => isset( $js_config['enableLinkedin'] ) ? boolval( $js_config['enableLinkedin'] ) : false,
			'enableEmail'            => isset( $js_config['enableEmail'] ) ? boolval( $js_config['enableEmail'] ) : false,
			'socialDesktopCollapsed' => isset( $settings['socialDesktopCollapsed'] ) ? boolval( $settings['socialDesktopCollapsed'] ) : false,

			// Display options
			'hideTitle'              => isset( $settings['hide_title'] ) ? Modula_Helper::is_truthy_flag( $settings['hide_title'] ) : false,
			'hideDescription'        => isset( $settings['hide_description'] ) ? Modula_Helper::is_truthy_flag( $settings['hide_description'] ) : false,
			'lazyLoad'               => 1,

			// Other settings
			'randomFactor'           => isset( $js_config['randomFactor'] ) ? floatval( $js_config['randomFactor'] ) : 0,
			'inView'                 => isset( $js_config['inView'] ) ? boolval( $js_config['inView'] ) : false,
			'email_subject'          => isset( $js_config['email_subject'] ) ? $js_config['email_subject'] : '',
			'email_message'          => isset( $js_config['email_message'] ) ? $js_config['email_message'] : '',

			// Grid-specific settings (Number of columns: from modula-settings[grid_type])
			'grid_type'              => $grid_type,
			'rowHeight'              => isset( $js_config['rowHeight'] ) ? absint( $js_config['rowHeight'] ) : null,
			'lastRow'                => isset( $js_config['lastRow'] ) ? $js_config['lastRow'] : 'justify',
		);

		/**
		 * Filter: modula_frontend_adapter_config
		 * Allow filtering of converted config
		 *
		 * @param array  $config   - Converted config
		 * @param array  $settings - Original settings
		 * @param string $type     - Gallery type
		 * @return array
		 */
		return apply_filters( 'modula_frontend_adapter_config', $config, $settings, $type );
	}

	/**
	 * Grid coordinate from modula-images row: empty string means "not placed" (let JS packer run).
	 *
	 * @param mixed $value Raw gridX or gridY.
	 * @return int|null Integer cell index, or null when unset / empty.
	 */
	private static function custom_grid_coord_from_row( $value ) {
		if ( null === $value || '' === $value ) {
			return null;
		}
		if ( is_string( $value ) && '' === trim( $value ) ) {
			return null;
		}
		return absint( $value );
	}

	/**
	 * Convert image/item data to new format
	 * Processes through same filters as template for compatibility
	 *
	 * @param array $image   - Original image data
	 * @param array $settings - Gallery settings
	 * @param array $all_images - All images (for filter compatibility)
	 * @return array Converted item data
	 */
	public static function convert_item( $image, $settings, $all_images = array() ) {
		// Get image object
		$image_object = get_post( $image['id'] );
		if ( is_wp_error( $image_object ) || get_post_type( $image_object ) !== 'attachment' ) {
			return null;
		}

		// Get full image URL and dimensions (same logic as template)
		$mime_type  = get_post_mime_type( $image['id'] );
		$img_width  = null;
		$img_height = null;
		if ( 'image/heic' === $mime_type || 'image/heif' === $mime_type ) {
			$full_img_data = wp_get_attachment_image_src( $image['id'], 'full' );
			if ( ! $full_img_data || ! isset( $full_img_data[0] ) ) {
				return null;
			}
			$full_img_src = $full_img_data[0];
			if ( isset( $full_img_data[1], $full_img_data[2] ) ) {
				$img_width  = (int) $full_img_data[1];
				$img_height = (int) $full_img_data[2];
			}
		} else {
			$full_img_src = wp_get_original_image_url( $image['id'] );
		}
		if ( ( null === $img_width || null === $img_height ) && $image['id'] ) {
			$meta = wp_get_attachment_metadata( $image['id'] );
			if ( ! empty( $meta['width'] ) && ! empty( $meta['height'] ) ) {
				$img_width  = (int) $meta['width'];
				$img_height = (int) $meta['height'];
			}
		}

		// Build item_data (same structure as template)
		$should_hide_title = (
			Modula_Helper::is_truthy_flag( $settings['hide_title'] ?? false ) ||
			Modula_Helper::is_truthy_flag( $image['hide_title'] ?? false )
		);

		$item_data = array(
			'title'                  => Modula_Helper::get_title( $image, 'title' ),
			'description'            => Modula_Helper::get_description( $image, 'caption' ),
			'lightbox'               => $settings['lightbox'],
			'hide_title'             => $should_hide_title,
			'hide_description'       => Modula_Helper::is_truthy_flag( $settings['hide_description'] ?? false ),
			'hide_socials'           => ! boolval( $settings['enableSocial'] ) || boolval( $settings['socialDesktopCollapsed'] ),
			'enableTwitter'          => boolval( $settings['enableTwitter'] ),
			'enableWhatsapp'         => boolval( $settings['enableWhatsapp'] ),
			'enableFacebook'         => boolval( $settings['enableFacebook'] ),
			'enablePinterest'        => boolval( $settings['enablePinterest'] ),
			'enableLinkedin'         => boolval( $settings['enableLinkedin'] ),
			'enableEmail'            => boolval( $settings['enableEmail'] ),
			'socialDesktopCollapsed' => boolval( $settings['socialDesktopCollapsed'] ),
			'lazyLoad'               => 1,
			'item_classes'           => array( 'modula-item' ),
			'item_attributes'        => array(),
			'link_classes'           => array( 'tile-inner', 'modula-item-link' ),
			'link_attributes'        => array(
				'data-image-id' => $image['id'],
				'role'          => 'button',
			),
			'img_classes'            => array( 'pic', 'wp-image-' . $image['id'] ),
			'img_attributes'         => array_merge(
				array(
					'data-valign' => isset( $image['valign'] ) ? esc_attr( $image['valign'] ) : 'center',
					'data-halign' => isset( $image['halign'] ) ? esc_attr( $image['halign'] ) : 'center',
					'alt'         => isset( $image['alt'] ) ? $image['alt'] : '',
					'data-full'   => $full_img_src,
					'title'       => isset( $image['title'] ) ? $image['title'] : '',
				),
				self::focal_attrs_from_image_row( $image ),
				( null !== $img_width && null !== $img_height )
					? array(
						'width'  => $img_width,
						'height' => $img_height,
					)
					: array()
			),
		);

		// Handle togglelightbox
		if ( isset( $image['togglelightbox'] ) && 1 === $image['togglelightbox'] ) {
			$item_data['link_classes'][] = 'modula-simple-link';
			$item_data['link_classes'][] = 'modula-no-follow';
		}

		// Apply image data filter
		$image = apply_filters( 'modula_shortcode_image_data', $image, $settings );

		// Custom grid attributes
		if ( 'custom-grid' === $settings['type'] ) {
			$item_data['item_attributes']['data-width']  = isset( $image['width'] ) ? absint( $image['width'] ) : 2;
			$item_data['item_attributes']['data-height'] = isset( $image['height'] ) ? absint( $image['height'] ) : 2;
		}

		// Apply item data filters (same as template)
		$item_data = apply_filters( 'modula_shortcode_item_data', $item_data, $image, $settings, $all_images );

		// Convert to new format
		$converted_item = array(
			'id'              => absint( $image['id'] ),
			'title'           => isset( $item_data['title'] ) ? $item_data['title'] : '',
			'description'     => isset( $item_data['description'] ) ? $item_data['description'] : '',
			'alt'             => isset( $item_data['img_attributes']['alt'] ) ? $item_data['img_attributes']['alt'] : '',
			'src'             => isset( $item_data['img_attributes']['src'] ) ? $item_data['img_attributes']['src'] : '',
			'thumbnail'       => isset( $item_data['image_url'] ) ? $item_data['image_url'] : ( isset( $item_data['img_attributes']['src'] ) ? $item_data['img_attributes']['src'] : '' ),
			'url'             => isset( $item_data['image_full'] ) ? $item_data['image_full'] : $full_img_src,
			'srcset'          => isset( $item_data['img_attributes']['srcset'] ) ? $item_data['img_attributes']['srcset'] : '',
			'sizes'           => isset( $item_data['img_attributes']['sizes'] ) ? $item_data['img_attributes']['sizes'] : '',
			'valign'          => isset( $item_data['img_attributes']['data-valign'] ) ? $item_data['img_attributes']['data-valign'] : 'center',
			'halign'          => isset( $item_data['img_attributes']['data-halign'] ) ? $item_data['img_attributes']['data-halign'] : 'center',
			'hideTitle'       => Modula_Helper::is_truthy_flag( $item_data['hide_title'] ?? false ),
			'hideDescription' => Modula_Helper::is_truthy_flag( $item_data['hide_description'] ?? false ),
			'hideSocials'     => isset( $item_data['hide_socials'] ) ? boolval( $item_data['hide_socials'] ) : false,
			'lazyLoad'        => 1,
			'itemClasses'     => isset( $item_data['item_classes'] ) ? $item_data['item_classes'] : array( 'modula-item' ),
			'itemAttributes'  => isset( $item_data['item_attributes'] ) ? $item_data['item_attributes'] : array(),
			'linkClasses'     => isset( $item_data['link_classes'] ) ? $item_data['link_classes'] : array(),
			'linkAttributes'  => isset( $item_data['link_attributes'] ) ? $item_data['link_attributes'] : array(),
			'imgClasses'      => isset( $item_data['img_classes'] ) ? $item_data['img_classes'] : array(),
			'imgAttributes'   => isset( $item_data['img_attributes'] ) ? $item_data['img_attributes'] : array(),
		);

		// Add custom grid dimensions
		if ( 'custom-grid' === $settings['type'] ) {
			$converted_item['width']  = isset( $image['width'] ) ? absint( $image['width'] ) : 2;
			$converted_item['height'] = isset( $image['height'] ) ? absint( $image['height'] ) : 2;
			if ( isset( $image['gridX'] ) ) {
				$gx = self::custom_grid_coord_from_row( $image['gridX'] );
				if ( null !== $gx ) {
					$converted_item['gridX'] = $gx;
				}
			}
			if ( isset( $image['gridY'] ) ) {
				$gy = self::custom_grid_coord_from_row( $image['gridY'] );
				if ( null !== $gy ) {
					$converted_item['gridY'] = $gy;
				}
			}
			if ( isset( $image['gridLocked'] ) ) {
				$converted_item['gridLocked'] = absint( $image['gridLocked'] ) ? 1 : 0;
			}
		}

		$converted_item['togglelightbox'] = isset( $image['togglelightbox'] ) ? absint( $image['togglelightbox'] ) : 0;
		$converted_item['hide_title']     = isset( $image['hide_title'] ) ? absint( $image['hide_title'] ) : 0;
		$converted_item['link']           = isset( $image['link'] ) ? (string) $image['link'] : '';
		$converted_item['target']         = isset( $image['target'] ) ? absint( $image['target'] ) : 0;
		if ( isset( $image['filters'] ) && is_scalar( $image['filters'] ) ) {
			$converted_item['filters'] = (string) $image['filters'];
		}
		if ( isset( $item_data['image_licensing'] ) && is_scalar( $item_data['image_licensing'] ) ) {
			$converted_item['image_licensing'] = (string) $item_data['image_licensing'];
		} elseif ( isset( $image['image_licensing'] ) && is_scalar( $image['image_licensing'] ) ) {
			$converted_item['image_licensing'] = (string) $image['image_licensing'];
		}

		$converted_item = self::with_focal_fields( $converted_item, $image );
		$converted_item = self::with_tile_image_fit( $converted_item, $image );

		$converted_item = self::with_react_video_fields( $converted_item, $image, $item_data );
		$converted_item = self::with_exif_fields( $converted_item, $image );

		/**
		 * Filter: modula_frontend_adapter_item
		 * Allow filtering of converted item
		 *
		 * @param array $converted_item - Converted item data
		 * @param array $image          - Original image data
		 * @param array $item_data      - Processed item_data from filters
		 * @param array $settings       - Gallery settings
		 * @return array
		 */
		return apply_filters( 'modula_frontend_adapter_item', $converted_item, $image, $item_data, $settings );
	}

	/**
	 * Convert already-processed item_data (e.g. from item processor) to frontend format.
	 * Used when building gallery JSON so items include srcset/sizes from the processor.
	 *
	 * @param array $item_data  Processed item data (e.g. from Modula_Item_Data_Processor::process).
	 * @param array $image     Original image data.
	 * @param array $settings  Gallery settings.
	 * @param array $all_images All gallery images (for filter compatibility).
	 * @return array|null Converted item or null if invalid.
	 */
	public static function convert_item_from_item_data( $item_data, $image, $settings, $all_images = array() ) {
		$is_video_template = class_exists( '\Modula\V2\Images\Adapter' )
			? \Modula\V2\Images\Adapter::is_video_template_row( $image )
			: ( isset( $image['video_template'] ) && 1 === (int) $image['video_template'] );

		if ( empty( $item_data ) ) {
			return null;
		}
		if ( ! $is_video_template && empty( $image['id'] ) ) {
			return null;
		}
		$data_full = '';
		if ( ! empty( $item_data['img_attributes']['data-full'] ) && is_string( $item_data['img_attributes']['data-full'] ) ) {
			$data_full = $item_data['img_attributes']['data-full'];
		}
		$full_img_src = isset( $item_data['image_full'] ) ? $item_data['image_full'] : wp_get_original_image_url( $image['id'] );
		if ( ! $full_img_src && $data_full ) {
			$full_img_src = $data_full;
		}
		if ( ! $full_img_src && ! empty( $image['video_thumbnail'] ) && is_string( $image['video_thumbnail'] ) ) {
			$full_img_src = trim( $image['video_thumbnail'] );
		}
		if ( ! $full_img_src ) {
			$afull = wp_get_attachment_image_src( absint( $image['id'] ), 'full' );
			if ( $afull && ! empty( $afull[0] ) ) {
				$full_img_src = $afull[0];
			} else {
				$att = wp_get_attachment_url( absint( $image['id'] ) );
				if ( $att ) {
					$full_img_src = $att;
				}
			}
		}
		$src_from_item = isset( $item_data['img_attributes']['src'] ) ? $item_data['img_attributes']['src'] : '';
		if ( ! $src_from_item && $data_full ) {
			$src_from_item = $data_full;
		}
		$thumb_fallback = isset( $item_data['image_url'] ) ? $item_data['image_url'] : $src_from_item;
		if ( ! $thumb_fallback && $data_full ) {
			$thumb_fallback = $data_full;
		}
		$item_id = $is_video_template && isset( $image['id'] )
			? (string) $image['id']
			: absint( $image['id'] );

		$converted_item = array(
			'id'              => $item_id,
			'title'           => isset( $item_data['title'] ) && is_scalar( $item_data['title'] ) ? (string) $item_data['title'] : '',
			'description'     => isset( $item_data['description'] ) && is_scalar( $item_data['description'] ) ? (string) $item_data['description'] : '',
			'alt'             => isset( $item_data['img_attributes']['alt'] ) ? $item_data['img_attributes']['alt'] : '',
			'src'             => $src_from_item,
			'thumbnail'       => $thumb_fallback,
			'url'             => isset( $item_data['image_full'] ) ? $item_data['image_full'] : $full_img_src,
			'srcset'          => isset( $item_data['img_attributes']['srcset'] ) ? $item_data['img_attributes']['srcset'] : '',
			'sizes'           => isset( $item_data['img_attributes']['sizes'] ) ? $item_data['img_attributes']['sizes'] : '',
			'valign'          => isset( $item_data['img_attributes']['data-valign'] ) ? $item_data['img_attributes']['data-valign'] : 'center',
			'halign'          => isset( $item_data['img_attributes']['data-halign'] ) ? $item_data['img_attributes']['data-halign'] : 'center',
			'hideTitle'       => Modula_Helper::is_truthy_flag( $item_data['hide_title'] ?? false ),
			'hideDescription' => Modula_Helper::is_truthy_flag( $item_data['hide_description'] ?? false ),
			'hideSocials'     => isset( $item_data['hide_socials'] ) ? (bool) $item_data['hide_socials'] : false,
			'lazyLoad'        => 1,
			'itemClasses'     => isset( $item_data['item_classes'] ) ? $item_data['item_classes'] : array( 'modula-item' ),
			'itemAttributes'  => isset( $item_data['item_attributes'] ) ? $item_data['item_attributes'] : array(),
			'linkClasses'     => isset( $item_data['link_classes'] ) ? $item_data['link_classes'] : array(),
			'linkAttributes'  => isset( $item_data['link_attributes'] ) ? $item_data['link_attributes'] : array(),
			'imgClasses'      => isset( $item_data['img_classes'] ) ? $item_data['img_classes'] : array(),
			'imgAttributes'   => isset( $item_data['img_attributes'] ) ? $item_data['img_attributes'] : array(),
		);
		if ( 'custom-grid' === ( $settings['type'] ?? '' ) ) {
			$converted_item['width']  = isset( $image['width'] ) ? absint( $image['width'] ) : 2;
			$converted_item['height'] = isset( $image['height'] ) ? absint( $image['height'] ) : 2;
			// Match convert_item(): v2 shortcode bootstrap uses this path; grid coords must reach React or layout reverts to packer.
			if ( isset( $image['gridX'] ) ) {
				$gx = self::custom_grid_coord_from_row( $image['gridX'] );
				if ( null !== $gx ) {
					$converted_item['gridX'] = $gx;
				}
			}
			if ( isset( $image['gridY'] ) ) {
				$gy = self::custom_grid_coord_from_row( $image['gridY'] );
				if ( null !== $gy ) {
					$converted_item['gridY'] = $gy;
				}
			}
			if ( isset( $image['gridLocked'] ) ) {
				$converted_item['gridLocked'] = absint( $image['gridLocked'] ) ? 1 : 0;
			}
		}

		// Per-image modula-images fields for admin metadata modal & PATCH parity (hideTitle alone is display-oriented).
		$converted_item['togglelightbox'] = isset( $image['togglelightbox'] ) ? absint( $image['togglelightbox'] ) : 0;
		$converted_item['hide_title']     = isset( $image['hide_title'] ) ? absint( $image['hide_title'] ) : 0;
		$converted_item['link']           = isset( $image['link'] ) ? (string) $image['link'] : '';
		$converted_item['target']         = isset( $image['target'] ) ? absint( $image['target'] ) : 0;
		if ( isset( $image['filters'] ) && is_scalar( $image['filters'] ) ) {
			$converted_item['filters'] = (string) $image['filters'];
		}
		if ( isset( $item_data['image_licensing'] ) && is_scalar( $item_data['image_licensing'] ) ) {
			$converted_item['image_licensing'] = (string) $item_data['image_licensing'];
		} elseif ( isset( $image['image_licensing'] ) && is_scalar( $image['image_licensing'] ) ) {
			$converted_item['image_licensing'] = (string) $image['image_licensing'];
		}

		$converted_item = self::with_focal_fields( $converted_item, $image );
		$converted_item = self::with_tile_image_fit( $converted_item, $image );

		$converted_item = self::with_react_video_fields( $converted_item, $image, $item_data );

		foreach (
			array(
				'video_template',
				'video_url',
				'video_title',
				'video_alt',
				'video_description',
				'video_thumbnail',
				'video_width',
				'video_height',
				'autoplay_thumbnail',
				'autoplay_lightbox',
				'loop_video',
			) as $video_key
		) {
			if ( array_key_exists( $video_key, $image ) ) {
				$converted_item[ $video_key ] = $image[ $video_key ];
			}
		}

		$converted_item = self::with_exif_fields( $converted_item, $image );

		return apply_filters( 'modula_frontend_adapter_item', $converted_item, $image, $item_data, $settings );
	}

	/**
	 * Readable foreground color for a solid background color.
	 * Keeps a small hue relation by mixing toward dark/light "ink" colors, then
	 * requires WCAG-like contrast (>= 4.5). Falls back to black/white only if needed.
	 *
	 * @param string $color Hex / rgb / rgba, or empty for transparent.
	 * @return string
	 */
	public static function contrasting_hex_for_background( $color ) {
		$rgb = self::parse_css_color_rgb( $color );
		if ( ! $rgb ) {
			/* Transparent / missing — dark ink on light artboard (matches JS). */
			return '#1d2327';
		}

		$bg = $rgb;

		$to_lin    = static function ( $c ) {
			$c = (float) $c / 255.0;
			return ( $c <= 0.03928 ) ? ( $c / 12.92 ) : pow( ( $c + 0.055 ) / 1.055, 2.4 );
		};
		$luminance = static function ( $rgb ) use ( $to_lin ) {
			return 0.2126 * $to_lin( $rgb['r'] ) + 0.7152 * $to_lin( $rgb['g'] ) + 0.0722 * $to_lin( $rgb['b'] );
		};
		$mix       = static function ( $from, $to, $amount ) {
			$t = max( 0.0, min( 1.0, (float) $amount ) );
			return array(
				'r' => (int) round( $from['r'] + ( $to['r'] - $from['r'] ) * $t ),
				'g' => (int) round( $from['g'] + ( $to['g'] - $from['g'] ) * $t ),
				'b' => (int) round( $from['b'] + ( $to['b'] - $from['b'] ) * $t ),
			);
		};
		$to_hex    = static function ( $rgb ) {
			return sprintf( '#%02x%02x%02x', $rgb['r'], $rgb['g'], $rgb['b'] );
		};
		$contrast  = static function ( $la, $lb ) {
			$light = max( $la, $lb );
			$dark  = min( $la, $lb );
			return ( $light + 0.05 ) / ( $dark + 0.05 );
		};

		$bg_l              = $luminance( $bg );
		$prefers_dark_text = $bg_l > 0.45;
		$mix_levels        = array( 0.86, 0.78, 0.7, 0.62 );
		$anchors           = $prefers_dark_text
			? array(
				array(
					'r' => 17,
					'g' => 24,
					'b' => 39,
				), // #111827
				array(
					'r' => 17,
					'g' => 17,
					'b' => 17,
				), // #111111
			)
			: array(
				array(
					'r' => 249,
					'g' => 250,
					'b' => 251,
				), // #f9fafb
				array(
					'r' => 255,
					'g' => 255,
					'b' => 255,
				), // #ffffff
			);

		foreach ( $anchors as $anchor ) {
			foreach ( $mix_levels as $level ) {
				$candidate = $mix( $bg, $anchor, $level );
				$c_l       = $luminance( $candidate );
				if ( $contrast( $bg_l, $c_l ) < 4.5 ) {
					continue;
				}
				return $to_hex( $candidate );
			}
		}

		$black_l = $luminance(
			array(
				'r' => 17,
				'g' => 17,
				'b' => 17,
			)
		);
		$white_l = $luminance(
			array(
				'r' => 255,
				'g' => 255,
				'b' => 255,
			)
		);
		return ( $contrast( $bg_l, $black_l ) >= $contrast( $bg_l, $white_l ) ) ? '#111111' : '#ffffff';
	}

	/**
	 * Pure black/white ink for content blocks with a background image
	 * (hue-mixed Auto text looks washed over photos).
	 *
	 * @param string $color Background / overlay color (hex / rgb / rgba).
	 * @return string
	 */
	public static function solid_contrasting_hex_for_background( $color ) {
		$rgb = self::parse_css_color_rgb( $color );
		if ( ! $rgb ) {
			return '#111111';
		}

		$to_lin    = static function ( $c ) {
			$c = (float) $c / 255.0;
			return ( $c <= 0.03928 ) ? ( $c / 12.92 ) : pow( ( $c + 0.055 ) / 1.055, 2.4 );
		};
		$luminance = 0.2126 * $to_lin( $rgb['r'] ) + 0.7152 * $to_lin( $rgb['g'] ) + 0.0722 * $to_lin( $rgb['b'] );

		return ( $luminance > 0.45 ) ? '#111111' : '#ffffff';
	}

	/**
	 * Parse hex / rgb / rgba into RGB channels (alpha ignored).
	 *
	 * @param mixed $color Raw CSS color.
	 * @return array{r:int,g:int,b:int}|null
	 */
	public static function parse_css_color_rgb( $color ) {
		if ( null === $color || false === $color || '' === $color ) {
			return null;
		}
		$raw = trim( (string) $color );
		if ( '' === $raw || 0 === strcasecmp( $raw, 'transparent' ) ) {
			return null;
		}

		$sanitized = class_exists( 'Modula_Helper' ) && method_exists( 'Modula_Helper', 'sanitize_rgba_colour' )
			? (string) \Modula_Helper::sanitize_rgba_colour( $raw )
			: '';
		if ( '' === $sanitized ) {
			$hex       = sanitize_hex_color( $raw );
			$sanitized = $hex ? $hex : '';
		}
		if ( '' === $sanitized ) {
			return null;
		}

		if ( '#' === $sanitized[0] ) {
			$h = ltrim( $sanitized, '#' );
			if ( 3 === strlen( $h ) ) {
				$h = $h[0] . $h[0] . $h[1] . $h[1] . $h[2] . $h[2];
			}
			if ( 6 !== strlen( $h ) || ! ctype_xdigit( $h ) ) {
				return null;
			}
			return array(
				'r' => hexdec( substr( $h, 0, 2 ) ),
				'g' => hexdec( substr( $h, 2, 2 ) ),
				'b' => hexdec( substr( $h, 4, 2 ) ),
			);
		}

		$compact = str_replace( ' ', '', $sanitized );
		if ( preg_match( '/^rgba?\((\d{1,3}),(\d{1,3}),(\d{1,3})(?:,([0-9]*\.?[0-9]+))?\)$/i', $compact, $m ) ) {
			return array(
				'r' => absint( $m[1] ),
				'g' => absint( $m[2] ),
				'b' => absint( $m[3] ),
			);
		}

		return null;
	}

	/**
	 * CSS padding for a v2 content_block inset preset (aligned with gallery-shared `contentBlockLayout.js`).
	 *
	 * @param string $preset `tight|default|medium|generous`.
	 * @return string
	 */
	public static function content_block_padding_css( $preset ) {
		$preset = sanitize_key( (string) $preset );
		$map    = array(
			'tight'    => '8px',
			'default'  => 'clamp(12px,2.8vw,20px)',
			'medium'   => 'clamp(14px,3.2vw,24px)',
			'generous' => 'clamp(18px,4vw,32px)',
		);
		return isset( $map[ $preset ] ) ? $map[ $preset ] : $map['default'];
	}

	/**
	 * Convert a hex color + opacity percent to an rgba() CSS value.
	 *
	 * @param string $hex         Hex color.
	 * @param int    $opacity_pct Opacity 0–100.
	 * @return string Empty string when hex is invalid.
	 */
	public static function hex_to_rgba( $hex, $opacity_pct ) {
		$hex = sanitize_hex_color( (string) $hex );
		if ( ! $hex ) {
			return '';
		}
		$raw = ltrim( $hex, '#' );
		if ( 3 === strlen( $raw ) ) {
			$raw = $raw[0] . $raw[0] . $raw[1] . $raw[1] . $raw[2] . $raw[2];
		}
		if ( 6 !== strlen( $raw ) || ! ctype_xdigit( $raw ) ) {
			return '';
		}
		$opacity_pct = max( 0, min( 100, (int) $opacity_pct ) );
		$a           = $opacity_pct / 100;
		return sprintf(
			'rgba(%d,%d,%d,%s)',
			hexdec( substr( $raw, 0, 2 ) ),
			hexdec( substr( $raw, 2, 2 ) ),
			hexdec( substr( $raw, 4, 2 ) ),
			rtrim( rtrim( number_format( $a, 2, '.', '' ), '0' ), '.' )
		);
	}

	/**
	 * Inline background CSS declarations for a content_block tile (aligned with gallery-shared `contentBlockBackground.js`).
	 *
	 * @param array<string, mixed> $json_item Converted embedded item.
	 * @return string[] CSS declarations without trailing semicolons.
	 */
	public static function content_block_background_css_parts( array $json_item ): array {
		$raw_bg    = isset( $json_item['blockBackgroundColor'] ) ? trim( (string) $json_item['blockBackgroundColor'] ) : '';
		$bg        = class_exists( 'Modula_Helper' ) && method_exists( 'Modula_Helper', 'sanitize_rgba_colour' )
			? (string) \Modula_Helper::sanitize_rgba_colour( $raw_bg )
			: ( sanitize_hex_color( $raw_bg ) ? sanitize_hex_color( $raw_bg ) : '' );
		$has_color = ( '' !== $bg );
		$image_url = isset( $json_item['blockBackgroundImageUrl'] )
			? esc_url( (string) $json_item['blockBackgroundImageUrl'] )
			: '';

		if ( '' === $image_url ) {
			return array(
				'background-color:' . ( $has_color ? $bg : 'transparent' ),
			);
		}

		$size_ok     = array( 'cover', 'contain', 'auto' );
		$size        = isset( $json_item['blockBackgroundSize'] )
			? strtolower( trim( (string) $json_item['blockBackgroundSize'] ) )
			: 'cover';
		$position_ok = array(
			'center',
			'top',
			'bottom',
			'left',
			'right',
			'top left',
			'top right',
			'bottom left',
			'bottom right',
		);
		$position    = isset( $json_item['blockBackgroundPosition'] )
			? strtolower( trim( (string) $json_item['blockBackgroundPosition'] ) )
			: 'center';
		$repeat_ok   = array( 'no-repeat', 'repeat', 'repeat-x', 'repeat-y' );
		$repeat      = isset( $json_item['blockBackgroundRepeat'] )
			? strtolower( trim( (string) $json_item['blockBackgroundRepeat'] ) )
			: 'no-repeat';

		$meta = array(
			'background-size:' . ( in_array( $size, $size_ok, true ) ? $size : 'cover' ),
			'background-position:' . ( in_array( $position, $position_ok, true ) ? $position : 'center' ),
			'background-repeat:' . ( in_array( $repeat, $repeat_ok, true ) ? $repeat : 'no-repeat' ),
		);

		if ( ! $has_color ) {
			return array_merge(
				array(
					'background-color:transparent',
					sprintf( 'background-image:url("%s")', esc_attr( $image_url ) ),
				),
				$meta
			);
		}

		$opacity = isset( $json_item['blockBackgroundOverlayOpacity'] )
			? (int) $json_item['blockBackgroundOverlayOpacity']
			: 45;
		$opacity = max( 0, min( 100, $opacity ) );

		/* Prefer stored rgba alpha; opaque hex/rgb uses overlay opacity. */
		if ( 0 === stripos( $bg, 'rgba(' ) ) {
			$overlay = $bg;
		} else {
			$overlay = self::hex_to_rgba( $bg, $opacity );
			if ( '' === $overlay && 0 === stripos( $bg, 'rgb(' ) ) {
				$compact = str_replace( ' ', '', $bg );
				if ( preg_match( '/^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/i', $compact, $m ) ) {
					$a       = $opacity / 100;
					$overlay = sprintf(
						'rgba(%d,%d,%d,%s)',
						absint( $m[1] ),
						absint( $m[2] ),
						absint( $m[3] ),
						rtrim( rtrim( number_format( $a, 2, '.', '' ), '0' ), '.' )
					);
				}
			}
			if ( '' === $overlay ) {
				$overlay = 'rgba(0,0,0,0)';
			}
		}

		return array_merge(
			array(
				'background-color:' . $bg,
				sprintf(
					'background-image:linear-gradient(%1$s,%1$s),url("%2$s")',
					$overlay,
					esc_attr( $image_url )
				),
			),
			$meta
		);
	}

	/**
	 * Web font presets for v2 content blocks (aligned with `contentBlockLayout.js` `BLOCK_FONT_FAMILY_CSS`).
	 * Keys are stored as `blockFontPreset` on embedded rows. Served self-hosted from `assets/fonts/content-blocks/`.
	 * Adding a family: update this registry, JS map, run `npm run build:content-block-fonts`, then rebuild apps.
	 *
	 * @return array<string, array{family:string,wght:string,css:string}>
	 */
	public static function content_block_google_font_registry(): array {
		return array(
			'gf-inter'            => array(
				'family' => 'Inter',
				'wght'   => '400;500;600;700;800',
				'css'    => '"Inter",system-ui,-apple-system,"Segoe UI",sans-serif',
			),
			'gf-roboto'           => array(
				'family' => 'Roboto',
				'wght'   => '400;500;700;900',
				'css'    => '"Roboto",system-ui,-apple-system,sans-serif',
			),
			'gf-open-sans'        => array(
				'family' => 'Open Sans',
				'wght'   => '400;600;700;800',
				'css'    => '"Open Sans",system-ui,-apple-system,sans-serif',
			),
			'gf-montserrat'       => array(
				'family' => 'Montserrat',
				'wght'   => '400;600;700;800',
				'css'    => '"Montserrat",system-ui,-apple-system,sans-serif',
			),
			'gf-raleway'          => array(
				'family' => 'Raleway',
				'wght'   => '500;600;700;800',
				'css'    => '"Raleway",system-ui,-apple-system,sans-serif',
			),
			'gf-dm-sans'          => array(
				'family' => 'DM Sans',
				'wght'   => '400;500;700',
				'css'    => '"DM Sans",system-ui,-apple-system,sans-serif',
			),
			'gf-oswald'           => array(
				'family' => 'Oswald',
				'wght'   => '400;600;700',
				'css'    => '"Oswald",system-ui,-apple-system,sans-serif',
			),
			'gf-playfair-display' => array(
				'family' => 'Playfair Display',
				'wght'   => '400;600;700',
				'css'    => '"Playfair Display",Georgia,ui-serif,serif',
			),
			'gf-merriweather'     => array(
				'family' => 'Merriweather',
				'wght'   => '400;700;900',
				'css'    => '"Merriweather",Georgia,ui-serif,serif',
			),
		);
	}

	/**
	 * Allowed `blockFontPreset` values: system stacks plus keys from `content_block_google_font_registry()`.
	 *
	 * When adding a Google preset, update only the registry and `contentBlockLayout.js` (`BLOCK_FONT_FAMILY_CSS`).
	 *
	 * @return string[]
	 */
	public static function content_block_font_preset_keys(): array {
		return array_merge(
			array( 'default', 'serif', 'mono', 'display' ),
			array_keys( self::content_block_google_font_registry() )
		);
	}

	/**
	 * CSS font-family for a v2 content_block preset (system stacks + Google preset keys).
	 *
	 * @param string $preset `default|serif|mono|display|gf-*`.
	 * @return string
	 */
	public static function content_block_font_family_css( $preset ) {
		$preset = sanitize_key( (string) $preset );
		$gf     = self::content_block_google_font_registry();
		if ( isset( $gf[ $preset ] ) ) {
			return $gf[ $preset ]['css'];
		}
		$map = array(
			'default' => 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
			'serif'   => 'ui-serif,Georgia,Cambria,"Times New Roman",Times,serif',
			'mono'    => 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace',
			'display' => '"Arial Black","Helvetica Neue",Helvetica,Arial,system-ui,sans-serif',
		);
		return isset( $map[ $preset ] ) ? $map[ $preset ] : $map['default'];
	}

	/**
	 * Self-hosted @font-face stylesheet URLs for content_block `gf-*` presets.
	 *
	 * @param string[] $presets Sanitized preset keys from gallery rows.
	 * @return array<string, string> Map preset key => public stylesheet URL.
	 */
	public static function content_block_font_stylesheet_urls_for_presets( array $presets ) {
		if ( true !== apply_filters( 'modula_content_block_google_fonts_enabled', true ) ) {
			return array();
		}
		$gf      = self::content_block_google_font_registry();
		$wanted  = array();
		$presets = array_unique( array_map( 'sanitize_key', $presets ) );
		foreach ( $presets as $p ) {
			if ( isset( $gf[ $p ] ) ) {
				$wanted[ $p ] = $gf[ $p ];
			}
		}
		if ( empty( $wanted ) ) {
			return array();
		}
		$urls = array();
		foreach ( $wanted as $key => $def ) {
			$rel  = 'assets/css/front/content-block-fonts/' . $key . '.css';
			$path = MODULA_PATH . $rel;
			if ( ! is_readable( $path ) ) {
				continue;
			}
			$url = MODULA_URL . $rel;
			/**
			 * Filter a self-hosted content block font stylesheet URL.
			 *
			 * @param string $url        Public URL to the preset stylesheet.
			 * @param string $preset_key gf-* preset key.
			 * @param array  $def        Registry entry (family, wght, css).
			 */
			$urls[ $key ] = apply_filters( 'modula_content_block_font_stylesheet_url', $url, $key, $def );
		}
		return $urls;
	}

	/**
	 * Register and enqueue self-hosted content block font stylesheets.
	 *
	 * @param string[] $presets Preset keys (`gf-*` subset applied internally).
	 */
	public static function enqueue_content_block_font_stylesheets_for_presets( array $presets ) {
		$urls = self::content_block_font_stylesheet_urls_for_presets( $presets );
		foreach ( $urls as $preset_key => $url ) {
			if ( ! is_string( $url ) || '' === $url ) {
				continue;
			}
			$handle = 'modula-cb-font-' . sanitize_key( (string) $preset_key );
			if ( ! wp_style_is( $handle, 'registered' ) ) {
				wp_register_style( $handle, $url, array(), MODULA_LITE_VERSION );
			}
			wp_enqueue_style( $handle );
		}
	}

	/**
	 * Back-compat: first self-hosted stylesheet URL for the given presets.
	 *
	 * Prefer `enqueue_content_block_font_stylesheets_for_presets()` so every preset loads.
	 *
	 * @param string[] $presets Sanitized preset keys from gallery rows.
	 * @return string URL or empty if none / filtered off.
	 */
	public static function content_block_google_fonts_stylesheet_url_for_presets( array $presets ) {
		$urls = self::content_block_font_stylesheet_urls_for_presets( $presets );
		if ( empty( $urls ) ) {
			return '';
		}
		$gf     = self::content_block_google_font_registry();
		$wanted = array();
		foreach ( array_keys( $urls ) as $key ) {
			if ( isset( $gf[ $key ] ) ) {
				$wanted[ $key ] = $gf[ $key ];
			}
		}
		$url = reset( $urls );
		if ( ! is_string( $url ) ) {
			return '';
		}
		/**
		 * Deprecated single-URL filter (Google CDN era). Receives the first local preset URL.
		 *
		 * @param string $url    Stylesheet URL.
		 * @param array  $wanted Map of preset key => registry entry.
		 */
		return apply_filters( 'modula_content_block_google_fonts_url', $url, $wanted );
	}

	/**
	 * Bootstrap / React JSON for v2-only embedded rows (content block, shortcode).
	 *
	 * @param array<string, mixed> $row     Normalized row from modula_images_v2.
	 * @param array<string, mixed> $flat    Flat gallery settings.
	 * @param string               $context `public` (default) or `settings_editor` — editor skips rendered shortcode body.
	 * @return array<string, mixed>|null
	 */
	public static function convert_embedded_gallery_item_for_json( array $row, array $flat, $context = 'public' ) {
		$context = is_string( $context ) ? $context : 'public';
		if ( ! \Modula\V2\Images\Adapter::is_embedded_gallery_item( $row ) ) {
			return null;
		}
		$kind = \Modula\V2\Images\Adapter::get_item_kind( $row );
		$eid  = isset( $row['embeddedId'] ) ? (string) $row['embeddedId'] : '';
		if ( '' === $eid ) {
			return null;
		}
		$w = isset( $row['width'] ) ? absint( $row['width'] ) : 2;
		$h = isset( $row['height'] ) ? absint( $row['height'] ) : 2;
		if ( $w < 1 ) {
			$w = 2;
		}
		if ( $h < 1 ) {
			$h = 2;
		}
		$item_classes = array(
			'modula-item',
			'modula-item--embedded',
			'modula-item--embedded-' . sanitize_html_class( str_replace( '_', '-', $kind ) ),
		);
		$out          = array(
			'id'              => $eid,
			'itemKind'        => $kind,
			'embeddedId'      => $eid,
			'title'           => isset( $row['title'] ) ? (string) $row['title'] : '',
			'description'     => isset( $row['description'] ) ? (string) $row['description'] : '',
			'src'             => '',
			'thumbnail'       => '',
			'url'             => '',
			'srcset'          => '',
			'sizes'           => '',
			'alt'             => '',
			'valign'          => 'middle',
			'halign'          => 'center',
			'hideTitle'       => false,
			'hideDescription' => false,
			'hideSocials'     => true,
			'lazyLoad'        => 0,
			'itemClasses'     => $item_classes,
			'itemAttributes'  => array(
				'data-embedded-id' => $eid,
				'data-item-kind'   => $kind,
				'data-width'       => (string) $w,
				'data-height'      => (string) $h,
			),
			'linkClasses'     => array(),
			'linkAttributes'  => array(
				'tabindex'    => '-1',
				'aria-hidden' => 'true',
			),
			'imgClasses'      => array(),
			'imgAttributes'   => array(),
			'togglelightbox'  => 1,
			'hide_title'      => 0,
			'width'           => $w,
			'height'          => $h,
		);
		$gallery_type = isset( $flat['type'] ) ? (string) $flat['type'] : '';
		if ( 'custom-grid' === $gallery_type ) {
			// Same as convert_item_from_item_data: React editor needs coords or mixed implicit/explicit repacks embedded tiles.
			if ( isset( $row['gridX'] ) ) {
				$gx = self::custom_grid_coord_from_row( $row['gridX'] );
				if ( null !== $gx ) {
					$out['gridX'] = $gx;
				}
			}
			if ( isset( $row['gridY'] ) ) {
				$gy = self::custom_grid_coord_from_row( $row['gridY'] );
				if ( null !== $gy ) {
					$out['gridY'] = $gy;
				}
			}
			if ( isset( $row['gridLocked'] ) ) {
				$out['gridLocked'] = absint( $row['gridLocked'] ) ? 1 : 0;
			}
		}
		if ( \Modula\V2\Images\Adapter::ITEM_KIND_CONTENT_BLOCK === $kind ) {
			$raw_bg = isset( $row['blockBackgroundColor'] ) ? trim( (string) $row['blockBackgroundColor'] ) : '';
			if ( '' === $raw_bg || 0 === strcasecmp( $raw_bg, 'transparent' ) ) {
				$out['blockBackgroundColor'] = '';
			} elseif ( class_exists( 'Modula_Helper' ) && method_exists( 'Modula_Helper', 'sanitize_rgba_colour' ) ) {
				$out['blockBackgroundColor'] = (string) \Modula_Helper::sanitize_rgba_colour( $raw_bg );
			} else {
				$hex                         = sanitize_hex_color( $raw_bg );
				$out['blockBackgroundColor'] = $hex ? $hex : '';
			}
			$out['blockTextColor'] = isset( $row['blockTextColor'] ) ? (string) $row['blockTextColor'] : '';
			$body_raw              = isset( $row['blockBodyHtml'] ) ? (string) $row['blockBodyHtml'] : '';
			$out['blockBodyHtml']  = $body_raw;
			if ( 'settings_editor' !== $context ) {
				$out['blockBodyHtmlRendered'] = self::kses_embedded_rendered_html(
					self::render_content_block_body_html( $body_raw )
				);
			}
			$pad_ok                    = array( 'tight', 'default', 'medium', 'generous' );
			$pp                        = isset( $row['blockPaddingPreset'] ) ? sanitize_key( (string) $row['blockPaddingPreset'] ) : 'default';
			$out['blockPaddingPreset'] = in_array( $pp, $pad_ok, true ) ? $pp : 'default';
			$font_ok                   = self::content_block_font_preset_keys();
			$fp                        = isset( $row['blockFontPreset'] ) ? sanitize_key( (string) $row['blockFontPreset'] ) : 'default';
			$out['blockFontPreset']    = in_array( $fp, $font_ok, true ) ? $fp : 'default';

			$bg_image_id                    = isset( $row['blockBackgroundImageId'] ) ? absint( $row['blockBackgroundImageId'] ) : 0;
			$out['blockBackgroundImageId']  = $bg_image_id > 0 ? $bg_image_id : 0;
			$out['blockBackgroundImageUrl'] = '';
			if ( $bg_image_id > 0 ) {
				$url = wp_get_attachment_image_url( $bg_image_id, 'full' );
				if ( is_string( $url ) && '' !== $url ) {
					$out['blockBackgroundImageUrl'] = $url;
				}
			}
			$overlay_opacity                      = isset( $row['blockBackgroundOverlayOpacity'] )
				? (int) $row['blockBackgroundOverlayOpacity']
				: 45;
			$out['blockBackgroundOverlayOpacity'] = max( 0, min( 100, $overlay_opacity ) );
			$size_ok                              = array( 'cover', 'contain', 'auto' );
			$size                                 = isset( $row['blockBackgroundSize'] )
				? strtolower( trim( sanitize_text_field( (string) $row['blockBackgroundSize'] ) ) )
				: 'cover';
			$out['blockBackgroundSize']           = in_array( $size, $size_ok, true ) ? $size : 'cover';
			$position_ok                          = array(
				'center',
				'top',
				'bottom',
				'left',
				'right',
				'top left',
				'top right',
				'bottom left',
				'bottom right',
			);
			$position                             = isset( $row['blockBackgroundPosition'] )
				? strtolower( trim( sanitize_text_field( (string) $row['blockBackgroundPosition'] ) ) )
				: 'center';
			$out['blockBackgroundPosition']       = in_array( $position, $position_ok, true ) ? $position : 'center';
			$repeat_ok                            = array( 'no-repeat', 'repeat', 'repeat-x', 'repeat-y' );
			$repeat                               = isset( $row['blockBackgroundRepeat'] )
				? strtolower( trim( sanitize_text_field( (string) $row['blockBackgroundRepeat'] ) ) )
				: 'no-repeat';
			$out['blockBackgroundRepeat']         = in_array( $repeat, $repeat_ok, true ) ? $repeat : 'no-repeat';
		} elseif ( \Modula\V2\Images\Adapter::ITEM_KIND_SHORTCODE === $kind ) {
			$out['shortcodeRaw']  = isset( $row['shortcodeRaw'] ) ? (string) $row['shortcodeRaw'] : '';
			$shortcode_html       = self::render_embedded_shortcode_safe_html( $out['shortcodeRaw'] );
			$out['shortcodeHtml'] = 'settings_editor' === $context
				? $shortcode_html
				: self::kses_embedded_rendered_html( $shortcode_html );
		}
		return apply_filters( 'modula_frontend_adapter_embedded_item', $out, $row, $flat );
	}

	/**
	 * Run shortcodes inside a content block body (HTML + `[shortcode]` mix).
	 *
	 * @param string $html Stored block body (already wp_kses_post on save).
	 * @return string
	 */
	public static function render_content_block_body_html( $html ) {
		$html = (string) $html;
		if ( '' === trim( $html ) ) {
			return '';
		}
		$rendered = do_shortcode( $html );
		return apply_filters( 'modula_content_block_body_html', $rendered, $html );
	}

	/**
	 * KSES for shortcode-rendered embedded HTML (forms, embeds) — wp_kses_post strips <script>.
	 *
	 * @param string $html Trusted output from do_shortcode() / render_content_block_body_html().
	 * @return string
	 */
	public static function kses_embedded_rendered_html( $html ) {
		$html = (string) $html;
		if ( '' === trim( $html ) ) {
			return '';
		}
		$allowed           = wp_kses_allowed_html( 'post' );
		$allowed['script'] = array(
			'type'  => true,
			'id'    => true,
			'src'   => true,
			'async' => true,
			'defer' => true,
		);
		if ( isset( $allowed['div'] ) && is_array( $allowed['div'] ) ) {
			$allowed['div']['data-kaliforms-mount'] = true;
			$allowed['div']['data-form-id']         = true;
		}
		$filtered = wp_kses( $html, $allowed );
		return apply_filters( 'modula_embedded_rendered_html', $filtered, $html );
	}

	/**
	 * Prime wp_enqueue_* for shortcodes embedded in content block bodies (full gallery list).
	 *
	 * @param array<int, array<string, mixed>> $images Gallery rows from v2 meta.
	 */
	public static function prime_embedded_content_block_assets( array $images ) {
		foreach ( $images as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			if ( \Modula\V2\Images\Adapter::ITEM_KIND_CONTENT_BLOCK !== \Modula\V2\Images\Adapter::get_item_kind( $row ) ) {
				continue;
			}
			$body = isset( $row['blockBodyHtml'] ) ? (string) $row['blockBodyHtml'] : '';
			if ( '' === trim( $body ) ) {
				continue;
			}
			// Side-effect only: register scripts/styles required by shortcodes (e.g. paginated catalog).
			self::render_content_block_body_html( $body );
		}
	}

	/**
	 * Render shortcode string for front output (admin saves with edit_post capability).
	 *
	 * @param string $raw Stored shortcode text.
	 * @return string
	 */
	private static function render_embedded_shortcode_safe_html( $raw ) {
		$raw = trim( (string) $raw );
		if ( '' === $raw ) {
			return '';
		}
		$html = do_shortcode( $raw );
		return apply_filters( 'modula_embedded_shortcode_html', $html, $raw );
	}

	/**
	 * Optional data-focal-* for img_attributes (legacy adapter path).
	 *
	 * @param array $image Gallery row.
	 * @return array
	 */
	private static function focal_attrs_from_image_row( $image ) {
		if ( ! is_array( $image ) || ! isset( $image['focal_x'], $image['focal_y'] ) ) {
			return array();
		}
		if ( '' === (string) $image['focal_x'] || '' === (string) $image['focal_y'] ) {
			return array();
		}
		$fx = floatval( $image['focal_x'] );
		$fy = floatval( $image['focal_y'] );
		if ( ! is_finite( $fx ) || ! is_finite( $fy ) ) {
			return array();
		}
		$fx   = min( 1, max( 0, $fx ) );
		$fy   = min( 1, max( 0, $fy ) );
		$out  = array(
			'data-focal-x' => (string) $fx,
			'data-focal-y' => (string) $fy,
		);
		$crop = self::focal_crop_attrs_from_image_row( $image );
		return array_merge( $out, $crop );
	}

	/**
	 * Optional data-focal-crop-* on img (zoom/framing from image focus modal).
	 *
	 * @param array $image Gallery row.
	 * @return array
	 */
	private static function focal_crop_attrs_from_image_row( $image ) {
		if ( ! is_array( $image ) ) {
			return array();
		}
		foreach ( array( 'focal_crop_x', 'focal_crop_y', 'focal_crop_w', 'focal_crop_h' ) as $k ) {
			if ( ! isset( $image[ $k ] ) || '' === (string) $image[ $k ] ) {
				return array();
			}
		}
		$x = floatval( $image['focal_crop_x'] );
		$y = floatval( $image['focal_crop_y'] );
		$w = floatval( $image['focal_crop_w'] );
		$h = floatval( $image['focal_crop_h'] );
		if ( ! is_finite( $x ) || ! is_finite( $y ) || ! is_finite( $w ) || ! is_finite( $h ) || $w <= 0 || $h <= 0 ) {
			return array();
		}
		$x = min( 1, max( 0, $x ) );
		$y = min( 1, max( 0, $y ) );
		$w = min( 1, max( 1e-6, $w ) );
		$h = min( 1, max( 1e-6, $h ) );
		return array(
			'data-focal-crop-x' => (string) $x,
			'data-focal-crop-y' => (string) $y,
			'data-focal-crop-w' => (string) $w,
			'data-focal-crop-h' => (string) $h,
		);
	}

	/**
	 * Add tile_image_fit for custom-grid letterbox (React gallery).
	 *
	 * @param array $converted_item Frontend JSON item.
	 * @param array $image          Raw gallery row.
	 * @return array
	 */
	private static function with_tile_image_fit( $converted_item, $image ) {
		if ( ! is_array( $converted_item ) || ! is_array( $image ) || ! isset( $image['tile_image_fit'] ) ) {
			return $converted_item;
		}
		if ( '' === (string) $image['tile_image_fit'] ) {
			return $converted_item;
		}
		$fit = sanitize_text_field( (string) $image['tile_image_fit'] );
		if ( in_array( $fit, array( 'contain', 'cover' ), true ) ) {
			$converted_item['tile_image_fit'] = $fit;
		}
		return $converted_item;
	}

	/**
	 * Add focal_x / focal_y to React JSON when set on the gallery row.
	 *
	 * @param array $converted_item Frontend JSON item.
	 * @param array $image          Raw gallery row.
	 * @return array
	 */
	private static function with_focal_fields( $converted_item, $image ) {
		if ( ! is_array( $converted_item ) || ! is_array( $image ) || ! isset( $image['focal_x'], $image['focal_y'] ) ) {
			return $converted_item;
		}
		if ( '' === (string) $image['focal_x'] || '' === (string) $image['focal_y'] ) {
			return $converted_item;
		}
		$fx = floatval( $image['focal_x'] );
		$fy = floatval( $image['focal_y'] );
		if ( ! is_finite( $fx ) || ! is_finite( $fy ) ) {
			return $converted_item;
		}
		$converted_item['focal_x'] = min( 1, max( 0, $fx ) );
		$converted_item['focal_y'] = min( 1, max( 0, $fy ) );

		foreach ( array( 'focal_crop_x', 'focal_crop_y', 'focal_crop_w', 'focal_crop_h' ) as $ck ) {
			if ( ! isset( $image[ $ck ] ) || '' === (string) $image[ $ck ] ) {
				return $converted_item;
			}
		}
		$cx = floatval( $image['focal_crop_x'] );
		$cy = floatval( $image['focal_crop_y'] );
		$cw = floatval( $image['focal_crop_w'] );
		$ch = floatval( $image['focal_crop_h'] );
		if ( is_finite( $cx ) && is_finite( $cy ) && is_finite( $cw ) && is_finite( $ch ) && $cw > 0 && $ch > 0 ) {
			$converted_item['focal_crop_x'] = min( 1, max( 0, $cx ) );
			$converted_item['focal_crop_y'] = min( 1, max( 0, $cy ) );
			$converted_item['focal_crop_w'] = min( 1, max( 1e-6, $cw ) );
			$converted_item['focal_crop_h'] = min( 1, max( 1e-6, $ch ) );
		}

		return $converted_item;
	}

	/**
	 * Add video fields for React story / embeds when the gallery row has a Modula Video URL (e.g. Pro).
	 *
	 * @param array $converted_item Frontend JSON item.
	 * @param array $image          Raw gallery image row.
	 * @param array $item_data      Item payload after `modula_shortcode_item_data`.
	 * @return array
	 */
	/**
	 * Copy per-image EXIF fields for settings-editor modal / REST patch parity.
	 *
	 * @param array $converted_item Frontend item.
	 * @param array $image          Raw modula-images row.
	 * @return array
	 */
	private static function with_exif_fields( $converted_item, $image ) {
		foreach (
			array(
				'exif_camera',
				'exif_lens',
				'exif_focal_length',
				'exif_shutter_speed',
				'exif_aperture',
				'exif_iso',
				'exif_date',
			) as $exif_key
		) {
			if ( array_key_exists( $exif_key, $image ) ) {
				$converted_item[ $exif_key ] = is_scalar( $image[ $exif_key ] )
					? (string) $image[ $exif_key ]
					: '';
			}
		}

		return $converted_item;
	}

	/**
	 * @param array $converted_item
	 * @param array $image
	 * @param array $item_data
	 * @return array
	 */
	private static function with_react_video_fields( $converted_item, $image, $item_data ) {
		$video_url_raw = isset( $image['video_url'] ) ? trim( (string) $image['video_url'] ) : '';
		if ( '' === $video_url_raw ) {
			$from_attrs = '';
			if ( ! empty( $item_data['img_attributes']['data-full'] ) && is_string( $item_data['img_attributes']['data-full'] ) ) {
				$from_attrs = trim( $item_data['img_attributes']['data-full'] );
			}
			if ( '' === $from_attrs && ! empty( $item_data['link_attributes']['data-full'] ) && is_string( $item_data['link_attributes']['data-full'] ) ) {
				$from_attrs = trim( $item_data['link_attributes']['data-full'] );
			}
			if ( $from_attrs && self::is_probable_modula_video_playback_url( $from_attrs ) ) {
				$video_url_raw = $from_attrs;
			}
		}
		if ( '' === $video_url_raw ) {
			$converted_item['videoUrl'] = '';
			$converted_item['videoSrc'] = '';
			return $converted_item;
		}

		$converted_item['videoUrl'] = $video_url_raw;
		// Playback URL for React (YouTube/Vimeo/HTML5). Poster stays on src/thumbnail/imgAttributes data-full.
		$converted_item['videoSrc'] = $video_url_raw;

		/*
		 * Pro `add_video` overwrites img/link data-full with the playback URL.
		 * Restore the still image so tile href / DOM fallback / lightbox posters
		 * never treat the video URL as the image source.
		 */
		$poster = '';
		if ( ! empty( $converted_item['url'] ) && is_string( $converted_item['url'] ) ) {
			$poster = trim( $converted_item['url'] );
		}
		if ( '' === $poster && ! empty( $converted_item['thumbnail'] ) && is_string( $converted_item['thumbnail'] ) ) {
			$poster = trim( $converted_item['thumbnail'] );
		}
		if (
			'' === $poster
			&& ! empty( $converted_item['src'] )
			&& is_string( $converted_item['src'] )
			&& ! self::is_probable_modula_video_playback_url( $converted_item['src'] )
		) {
			$poster = trim( $converted_item['src'] );
		}
		if ( '' !== $poster && ! self::is_probable_modula_video_playback_url( $poster ) ) {
			if ( ! isset( $converted_item['imgAttributes'] ) || ! is_array( $converted_item['imgAttributes'] ) ) {
				$converted_item['imgAttributes'] = array();
			}
			$converted_item['imgAttributes']['data-full'] = $poster;

			if ( isset( $converted_item['linkAttributes'] ) && is_array( $converted_item['linkAttributes'] ) ) {
				$link_full = isset( $converted_item['linkAttributes']['data-full'] )
					? (string) $converted_item['linkAttributes']['data-full']
					: '';
				if ( '' !== $link_full && self::is_probable_modula_video_playback_url( $link_full ) ) {
					$converted_item['linkAttributes']['data-full'] = $poster;
				}
			}
		}

		return $converted_item;
	}

	/**
	 * True if URL is likely a video embed or file (not a static image poster).
	 *
	 * @param string $url Absolute or relative URL.
	 * @return bool
	 */
	private static function is_probable_modula_video_playback_url( $url ) {
		$u = strtolower( (string) $url );
		if ( '' === $u ) {
			return false;
		}
		if ( false !== strpos( $u, 'youtu.be' ) || false !== strpos( $u, 'youtube.com' ) || false !== strpos( $u, 'youtube-nocookie.com' ) ) {
			return true;
		}
		if ( false !== strpos( $u, 'vimeo.com' ) || false !== strpos( $u, 'player.vimeo' ) ) {
			return true;
		}
		return (bool) preg_match( '/\.(mp4|webm|ogv|ogg)(\?|#|$)/i', $u );
	}
}
