<?php

/**
 * Modula Item Data Processor
 * Processes gallery item data in a predictable, sequential manner
 *
 * @package Modula
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Processes gallery item data through all transformation steps
 */
class Modula_Item_Data_Processor {


	/**
	 * Process item data through all transformation steps
	 *
	 * @param array  $image      Image data
	 * @param array  $settings   Gallery settings
	 * @param string $gallery_id Gallery ID
	 * @param array  $images     All gallery images (for context)
	 * @return array Processed item data
	 */
	public function process( $image, $settings, $gallery_id, $images ) {
		// Initialize base item data structure
		$item_data = $this->initialize_item_data( $image, $settings, $gallery_id );

		// No image URL / poster — do not run downstream steps on an empty shell (filters may then
		// only partially populate item_data and break render_item_html / templates).
		if ( ! is_array( $item_data ) || empty( $item_data ) ) {
			return array();
		}

		// Apply transformations in order
		$item_data = $this->process_image_sizes( $item_data, $image, $settings );
		$item_data = $this->process_srcset_sizes( $item_data, $image, $settings );
		$item_data = $this->process_lightbox_and_links( $item_data, $image, $settings );
		$item_data = $this->process_hover_effects( $item_data, $settings );
		$item_data = $this->process_custom_grid( $item_data, $image, $settings );
		$item_data = $this->process_grid_settings( $item_data, $image, $settings );

		return $item_data;
	}

	/**
	 * Optional data-focal-* attributes for object-position (React gallery / CSS).
	 *
	 * @param array $image Gallery row.
	 * @return array
	 */
	private function focal_img_attribute_subset( $image ) {
		if ( ! is_array( $image ) || ! isset( $image['focal_x'], $image['focal_y'] ) ) {
			return array();
		}
		if ( '' === $image['focal_x'] || '' === $image['focal_y'] ) {
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
		$crop = $this->focal_crop_img_attribute_subset( $image );
		return array_merge( $out, $crop );
	}

	/**
	 * Optional data-focal-crop-* (normalized 0–1 rect on source) for zoom + pan parity with editor.
	 *
	 * @param array $image Gallery row.
	 * @return array
	 */
	private function focal_crop_img_attribute_subset( $image ) {
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
	 * Initialize base item data structure
	 *
	 * @param array  $image      Image data
	 * @param array  $settings   Gallery settings
	 * @param string $gallery_id Gallery ID
	 * @return array Initial item data
	 */
	private function initialize_item_data( $image, $settings, $gallery_id ) {
		$full_img_src = $this->get_full_image_url( $image['id'], $image );
		if ( ! $full_img_src ) {
			return array();
		}

		$should_hide_title = Modula_Helper::is_truthy_flag( $settings['hide_title'] ?? false )
			|| Modula_Helper::is_truthy_flag( $image['hide_title'] ?? false );

		return array(
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
			'lazyLoad'               => boolval( $settings['lazy_load'] ),
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
				$this->focal_img_attribute_subset( $image )
			),
			'social_attributes'      => array(
				'data-modula-gallery-id' => preg_replace( '/[^0-9]/', '', $gallery_id ),
				'data-modula-item-id'    => absint( $image['id'] ),
				'data-modula-image-src'  => $full_img_src,
			),
		);
	}

	/**
	 * Get full image URL, handling HEIC/HEIF formats, Modula Video poster, and video attachments
	 *
	 * @param int   $image_id Attachment ID
	 * @param array $image    Gallery row (optional; used for video_thumbnail / video items)
	 * @return string|false Image URL or false on failure
	 */
	private function get_full_image_url( $image_id, $image = array() ) {
		if ( is_array( $image ) && isset( $image['video_template'] ) && 1 === (int) $image['video_template'] ) {
			foreach ( array( 'video_thumbnail', 'thumbnail', 'full' ) as $thumb_key ) {
				if ( empty( $image[ $thumb_key ] ) || ! is_string( $image[ $thumb_key ] ) ) {
					continue;
				}
				$thumb = trim( $image[ $thumb_key ] );
				if ( '' !== $thumb ) {
					return $thumb;
				}
			}
		}

		$image_id = absint( $image_id );
		if ( ! $image_id ) {
			return false;
		}

		$mime_type = get_post_mime_type( $image_id );

		if ( 'image/heic' === $mime_type || 'image/heif' === $mime_type ) {
			$full_img_src = wp_get_attachment_image_src( $image_id, 'full' );
			if ( ! $full_img_src || ! isset( $full_img_src[0] ) ) {
				return false;
			}
			return $full_img_src[0];
		}

		$original = wp_get_original_image_url( $image_id );
		if ( $original ) {
			return $original;
		}

		// Modula Video: row often stores poster on video_thumbnail while attachment is video/mp4.
		if ( ! empty( $image['video_thumbnail'] ) && is_string( $image['video_thumbnail'] ) ) {
			$thumb = trim( $image['video_thumbnail'] );
			if ( '' !== $thumb ) {
				return $thumb;
			}
		}

		$full = wp_get_attachment_image_src( $image_id, 'full' );
		if ( $full && ! empty( $full[0] ) ) {
			return $full[0];
		}

		$url = wp_get_attachment_url( $image_id );
		return $url ? $url : false;
	}

	/**
	 * Process image sizes and generate resized URLs
	 *
	 * @param array $item_data Item data
	 * @param array $image     Image data
	 * @param array $settings  Gallery settings
	 * @return array Modified item data
	 */
	private function process_image_sizes( $item_data, $image, $settings ) {
		// Check if image resizing is enabled
		if ( ! apply_filters( 'modula_resize_images', true, $settings, $item_data ) ) {
			return $item_data;
		}

		$gallery_type      = $settings['type'] ?? 'creative-gallery';
		$allowed_galleries = array( 'creative-gallery', 'custom-grid', 'grid', 'justified-grid', 'parallax-masonry', 'uniform-grid', 'fit-grid', 'polaroid' );

		if ( ! in_array( $gallery_type, $allowed_galleries, true ) ) {
			return $item_data;
		}

		$resizer = new Modula_Image();

		// Determine grid sizes
		$grid_sizes = $this->get_grid_sizes( $settings, $image );
		$crop       = $this->should_crop_image( $settings );

		// Get image size information
		$sizes = $resizer->get_image_size( $image['id'], $gallery_type, $grid_sizes, $crop );
		if ( is_wp_error( $sizes ) || ! is_array( $sizes ) || ! isset( $sizes['url'], $sizes['width'], $sizes['height'] ) ) {
			return $item_data;
		}

		// Handle full-size images
		$original_image = false;
		if ( 'full' === $grid_sizes ) {
			$original_image = $this->get_full_image_url( $image['id'], $image );
		}

		// Resize image
		$resized    = $resizer->resize_image( $sizes['url'], $sizes['width'], $sizes['height'], $crop );
		$image_info = false;

		if ( is_wp_error( $resized ) ) {
			$resized = $sizes['url'];
		}

		if ( isset( $resized['resized_url'] ) ) {
			$image_url  = $resized['resized_url'];
			$image_info = $resized['image_info'];
		} else {
			$image_url = $resized;
		}

		// Update item data with image URLs and dimensions
		$item_data['img_attributes']['width']    = $sizes['width'];
		$item_data['img_attributes']['height']   = $sizes['height'];
		$item_data['image_full']                 = $sizes['url'];
		$item_data['image_url']                  = isset( $sizes['thumb_url'] ) ? $sizes['thumb_url'] : $image_url;
		$item_data['img_attributes']['src']      = $original_image ? $original_image : ( isset( $sizes['thumb_url'] ) ? $sizes['thumb_url'] : $image_url );
		$item_data['img_attributes']['data-src'] = $original_image ? $original_image : ( isset( $sizes['thumb_url'] ) ? $sizes['thumb_url'] : $image_url );
		$item_data['image_info']                 = $image_info;

		return $item_data;
	}

	/**
	 * Add srcset and sizes to img_attributes for responsive/retina (JSON frontend).
	 *
	 * @param array $item_data Item data
	 * @param array $image     Image data
	 * @param array $settings  Gallery settings
	 * @return array Modified item data
	 */
	private function process_srcset_sizes( $item_data, $image, $settings ) {
		$troubleshoot_opt = get_option( 'modula_troubleshooting_option', array() );
		$disable_srcset   = isset( $troubleshoot_opt['disable_srcset'] ) ? (bool) $troubleshoot_opt['disable_srcset'] : false;
		if ( true === apply_filters( 'modula_troubleshooting_disable_srcset', $disable_srcset ) ) {
			return $item_data;
		}

		$gallery_type      = $settings['type'] ?? 'creative-gallery';
		$allowed_galleries = array( 'creative-gallery', 'custom-grid', 'grid', 'justified-grid', 'parallax-masonry', 'uniform-grid', 'fit-grid', 'polaroid' );
		if ( ! in_array( $gallery_type, $allowed_galleries, true ) ) {
			return $item_data;
		}

		$attachment_id = isset( $image['id'] ) ? (int) $image['id'] : 0;
		if ( ! $attachment_id ) {
			return $item_data;
		}

		$image_meta = wp_get_attachment_metadata( $attachment_id );
		if ( empty( $image_meta ) || empty( $image_meta['sizes'] ) ) {
			return $item_data;
		}

		$full_image = isset( $item_data['image_full'] ) ? $item_data['image_full'] : '';
		if ( ! $full_image ) {
			$full_image = $this->get_full_image_url( $attachment_id, $image );
		}
		if ( ! $full_image ) {
			return $item_data;
		}

		$img_w = isset( $item_data['img_attributes']['width'] ) ? (int) $item_data['img_attributes']['width'] : 0;
		$img_h = isset( $item_data['img_attributes']['height'] ) ? (int) $item_data['img_attributes']['height'] : 0;
		if ( $img_w <= 0 || $img_h <= 0 ) {
			$img_w = isset( $image_meta['width'] ) ? (int) $image_meta['width'] : 1600;
			$img_h = isset( $image_meta['height'] ) ? (int) $image_meta['height'] : 1200;
		}
		if ( $img_w <= 0 || $img_h <= 0 ) {
			return $item_data;
		}

		// Use a generous size so srcset includes large/2x options.
		$max_edge = 1600;
		if ( $img_w >= $img_h ) {
			$size_array = array( min( $img_w, $max_edge ), (int) round( $img_h * min( $img_w, $max_edge ) / $img_w ) );
		} else {
			$size_array = array( (int) round( $img_w * min( $img_h, $max_edge ) / $img_h ), min( $img_h, $max_edge ) );
		}

		$srcset = apply_filters( 'modula_template_image_srcset', array(), (object) $item_data, $image_meta );
		if ( empty( $srcset ) && function_exists( 'wp_calculate_image_srcset' ) ) {
			$srcset = wp_calculate_image_srcset( $size_array, $full_image, $image_meta, $attachment_id );
		}
		if ( $srcset && is_string( $srcset ) ) {
			$item_data['img_attributes']['srcset'] = $srcset;
			$image_src                             = isset( $item_data['img_attributes']['src'] ) ? $item_data['img_attributes']['src'] : $full_image;
			list( $image_src )                     = explode( '?', $image_src );
			$sizes                                 = modula_resolve_image_sizes_attr(
				array(
					'settings'      => $settings,
					'size_array'    => $size_array,
					'image_src'     => $image_src,
					'image_meta'    => $image_meta,
					'attachment_id' => $attachment_id,
					'lazy'          => ! empty( $item_data['lazyLoad'] ) || ! empty( $settings['lazy_load'] ) || ! empty( $settings['lazyLoad'] ),
					'data'          => $item_data,
				)
			);
			if ( $sizes && is_string( $sizes ) ) {
				$item_data['img_attributes']['sizes'] = $sizes;
			}
		}

		return $item_data;
	}

	/**
	 * Get grid sizes based on settings
	 *
	 * @param array $settings Gallery settings
	 * @param array $image    Image data
	 * @return array|string Grid sizes
	 */
	private function get_grid_sizes( $settings, $image ) {
		if ( 'custom' !== $settings['grid_image_size'] ) {
			return $settings['grid_image_size'];
		}

		if ( 'custom-grid' === $settings['type'] ) {
			return array(
				'width'  => absint( $settings['img_size'] ) * absint( $image['width'] ),
				'height' => absint( $settings['img_size'] ) * absint( $image['height'] ),
			);
		}

		return array(
			'width'  => $settings['grid_image_dimensions']['width'],
			'height' => $settings['grid_image_dimensions']['height'],
		);
	}

	/**
	 * Determine if image should be cropped
	 *
	 * @param array $settings Gallery settings
	 * @return bool Whether to crop
	 */
	private function should_crop_image( $settings ) {
		if ( 'custom' !== $settings['grid_image_size'] ) {
			return false;
		}

		if ( 'custom-grid' === $settings['type'] ) {
			$settings['img_crop'] = isset( $settings['img_crop'] ) ? $settings['img_crop'] : 1;
			return boolval( $settings['img_crop'] );
		}

		return boolval( $settings['grid_image_crop'] );
	}

	/**
	 * Process lightbox and link settings
	 *
	 * @param array $item_data Item data
	 * @param array $image     Image data
	 * @param array $settings  Gallery settings
	 * @return array Modified item data
	 */
	private function process_lightbox_and_links( $item_data, $image, $settings ) {
		// Elementor compatibility
		if ( class_exists( '\Elementor\Plugin' ) ) {
			$item_data['link_attributes']['data-elementor-open-lightbox'] = 'no';
		}

		// ADA compliance - make focusable
		$item_data['link_attributes']['tabindex'] = 0;

		// Get caption (skip WP attachment APIs for video template / non-numeric ids).
		$caption = function_exists( 'modula_resolve_item_caption' )
			? modula_resolve_item_caption( $image )
			: ( isset( $image['description'] ) ? (string) $image['description'] : '' );

		$item_data['img_attributes']['data-caption'] = $caption;

		// Handle different lightbox types
		$lightbox = $settings['lightbox'] ?? '';

		if ( '' === $lightbox || 'no-link' === $lightbox ) {
			return modula_apply_per_image_link_for_no_link_mode( $item_data, $image );
		}

		if ( 'external-url' === $lightbox || 'attachment-page' === $lightbox ) {
			$item_data['link_classes'][]                = 'modula-simple-link';
			$item_data['item_classes'][]                = 'modula-simple-link';
			$item_data['link_attributes']['aria-label'] = esc_html__( 'Open external link', 'modula-best-grid-gallery' );

			if ( isset( $image['link'] ) && '' !== $image['link'] ) {
				$item_data['link_attributes']['href'] = $image['link'];
				if ( isset( $image['target'] ) && '1' === $image['target'] ) {
					$item_data['link_attributes']['target'] = '_blank';
				}
			} else {
				$fallback                             = isset( $item_data['image_full'] ) ? (string) $item_data['image_full'] : '';
				$item_data['link_attributes']['href'] = function_exists( 'modula_resolve_simple_link_href' )
					? modula_resolve_simple_link_href( $image, $fallback )
					: $fallback;
			}
		} elseif ( 'direct' === $lightbox ) {
			$item_data['link_attributes']['href']       = $item_data['image_full'];
			$item_data['link_classes'][]                = 'modula-simple-link';
			$item_data['item_classes'][]                = 'modula-simple-link';
			$item_data['link_attributes']['aria-label'] = esc_html__( 'Open image', 'modula-best-grid-gallery' );
		} else {
			// Standard lightbox
			if ( modula_href_required() ) {
				$item_data['link_attributes']['href'] = $item_data['image_full'];
			}
			$item_data['link_attributes']['rel']          = $settings['gallery_id'];
			$item_data['link_attributes']['data-caption'] = $caption;
			$item_data['link_attributes']['aria-label']   = esc_html__( 'Open image in lightbox', 'modula-best-grid-gallery' );
			$item_data['link_attributes']['role']         = 'button';
		}

		// Handle togglelightbox override
		if ( isset( $image['togglelightbox'] ) && 1 === $image['togglelightbox'] ) {
			$item_data['link_classes'][] = 'modula-simple-link';
			$item_data['link_classes'][] = 'modula-no-follow';
		}

		return $item_data;
	}

	/**
	 * Horizontal translate anchor for hover v2 free slots.
	 *
	 * @param int $x Slot X position (0–100).
	 * @return string
	 */
	private function hover_slot_anchor_percent( $x ) {
		$x = (int) $x;
		if ( 50 === $x ) {
			return '-50%';
		}
		return $x > 50 ? '-100%' : '0%';
	}

	/**
	 * Max slot width (% of tile) from anchor to nearest horizontal edge.
	 *
	 * @param int $x Slot X position (0–100).
	 * @return int
	 */
	private function hover_slot_max_width_percent( $x ) {
		$x = min( 100, max( 0, (int) $x ) );
		if ( 50 === $x ) {
			return 100;
		}
		$span = $x > 50 ? $x : ( 100 - $x );
		return max( 15, $span );
	}

	/**
	 * Text alignment for hover v2 free slots.
	 *
	 * @param int $x Slot X position (0–100).
	 * @return string
	 */
	private function hover_slot_text_align( $x ) {
		$x = (int) $x;
		if ( 50 === $x ) {
			return 'center';
		}
		return $x > 50 ? 'right' : 'left';
	}

	/**
	 * Process hover effects
	 *
	 * @param array $item_data Item data
	 * @param array $settings  Gallery settings
	 * @return array Modified item data
	 */
	private function process_hover_effects( $item_data, $settings ) {
		$builder = isset( $settings['hover_builder'] ) && is_array( $settings['hover_builder'] )
			? $settings['hover_builder']
			: null;

		if ( null === $builder ) {
			return $item_data;
		}

		$caption_below = $this->is_caption_below_image( $settings );
		if ( $caption_below ) {
			$item_data['item_classes'][] = 'modula-caption-below-image';
		}

		$item_data['item_classes'][] = 'modula-hover-v2';

		$card_raw = isset( $builder['cardTreatment'] ) ? $builder['cardTreatment'] : ( isset( $builder['cardtreatment'] ) ? $builder['cardtreatment'] : 'zoom' );
		$card     = sanitize_key( (string) $card_raw );
		$dim_raw  = isset( $builder['dimOverlay'] ) ? $builder['dimOverlay'] : ( isset( $builder['dimoverlay'] ) ? $builder['dimoverlay'] : false );
		$dim_on   = ( true === $dim_raw || 1 === $dim_raw || '1' === (string) $dim_raw );
		if ( 'dim' === $card ) {
			$dim_on = true;
			$card   = 'none';
		}
		if ( '' !== $card && 'none' !== $card ) {
			$item_data['item_classes'][] = 'modula-hover-card--' . $card;
		}
		$graphic_raw = isset( $builder['graphicElement'] ) ? $builder['graphicElement'] : 'none';
		$graphic     = sanitize_key( (string) $graphic_raw );
		if ( in_array( $graphic, array( 'frame', 'diamond' ), true ) ) {
			$item_data['item_classes'][] = 'modula-hover-graphic--' . $graphic;
			$graphic_visibility_raw      = isset( $builder['graphicVisibility'] ) ? $builder['graphicVisibility'] : 'on-hover';
			$graphic_visibility          = sanitize_key( (string) $graphic_visibility_raw );
			if ( 'always' === $graphic_visibility ) {
				$item_data['item_classes'][] = 'modula-hover-graphic-visibility--always';
			}
		}
		if ( $dim_on ) {
			$item_data['item_classes'][] = 'modula-hover-card--dim-addon';
		}

		$slots = array( 'title', 'caption', 'social' );
		foreach ( $slots as $slot ) {
			if ( $caption_below && in_array( $slot, array( 'title', 'caption' ), true ) ) {
				continue;
			}
			$key            = 'title' === $slot ? 'titleEnter' : ( 'caption' === $slot ? 'captionEnter' : 'socialEnter' );
			$key_legacy     = strtolower( $key );
			$ent_raw        = isset( $builder[ $key ] ) ? $builder[ $key ] : ( isset( $builder[ $key_legacy ] ) ? $builder[ $key_legacy ] : 'fade' );
			$ent            = sanitize_key( (string) $ent_raw );
			$visibility_key = $slot . 'Visibility';
			$visibility_raw = isset( $builder[ $visibility_key ] ) ? $builder[ $visibility_key ] : 'on-hover';
			$visibility     = sanitize_key( (string) $visibility_raw );
			if ( 'on-hover' === $visibility ) {
				$item_data['item_classes'][] = 'modula-hover-visibility--' . $slot . '--on-hover';
			} elseif ( in_array( $visibility, array( 'always', 'hide-on-hover', 'hidden' ), true ) ) {
				$item_data['item_classes'][] = 'modula-hover-visibility--' . $slot . '--' . $visibility;
			}
			if ( 'on-hover' === $visibility && '' !== $ent && 'none' !== $ent ) {
				$item_data['item_classes'][] = 'modula-hover-enter--' . $slot . '--' . $ent;
			}
			if ( 'hide-on-hover' === $visibility && '' !== $ent && 'none' !== $ent ) {
				$item_data['item_classes'][] = 'modula-hover-exit--' . $slot . '--' . $ent;
			}
		}

		$defaults_pos = \Modula\V2\Settings\Adapter::default_hover_builder()['slotPositions'];
		$raw_pos      = array();
		if ( isset( $builder['slotPositions'] ) && is_array( $builder['slotPositions'] ) ) {
			$raw_pos = $builder['slotPositions'];
		} elseif ( isset( $builder['slotpositions'] ) && is_array( $builder['slotpositions'] ) ) {
			$raw_pos = $builder['slotpositions'];
		}
		$pos = array();
		foreach ( $defaults_pos as $sk => $def ) {
			$cell       = isset( $raw_pos[ $sk ] ) && is_array( $raw_pos[ $sk ] ) ? $raw_pos[ $sk ] : array();
			$x          = isset( $cell['x'] ) ? absint( $cell['x'] ) : $def['x'];
			$y          = isset( $cell['y'] ) ? absint( $cell['y'] ) : $def['y'];
			$pos[ $sk ] = array(
				'x' => min( 100, max( 0, $x ) ),
				'y' => min( 100, max( 0, $y ) ),
			);
		}
		$anchor_title   = $this->hover_slot_anchor_percent( $pos['title']['x'] );
		$anchor_caption = $this->hover_slot_anchor_percent( $pos['caption']['x'] );
		$anchor_social  = $this->hover_slot_anchor_percent( $pos['social']['x'] );
		$max_title      = $this->hover_slot_max_width_percent( $pos['title']['x'] );
		$max_caption    = $this->hover_slot_max_width_percent( $pos['caption']['x'] );
		$max_social     = $this->hover_slot_max_width_percent( $pos['social']['x'] );
		$align_title    = $this->hover_slot_text_align( $pos['title']['x'] );
		$align_caption  = $this->hover_slot_text_align( $pos['caption']['x'] );
		$align_social   = $this->hover_slot_text_align( $pos['social']['x'] );
		$slot_order     = array( 'title', 'caption', 'social' );
		usort(
			$slot_order,
			static function ( $a, $b ) use ( $pos ) {
				$ay = isset( $pos[ $a ]['y'] ) ? (int) $pos[ $a ]['y'] : 50;
				$by = isset( $pos[ $b ]['y'] ) ? (int) $pos[ $b ]['y'] : 50;
				if ( $ay !== $by ) {
					return $ay <=> $by;
				}
				$ax = isset( $pos[ $a ]['x'] ) ? (int) $pos[ $a ]['x'] : 50;
				$bx = isset( $pos[ $b ]['x'] ) ? (int) $pos[ $b ]['x'] : 50;
				return $ax <=> $bx;
			}
		);
		$ord = array(
			'title'   => 0,
			'caption' => 1,
			'social'  => 2,
		);
		foreach ( $slot_order as $i => $slot_key ) {
			$ord[ $slot_key ] = (int) $i;
		}
		$defaults                    = \Modula\V2\Settings\Adapter::default_hover_builder();
		$card_duration_ms            = min( 1200, max( 120, absint( isset( $builder['cardEnterDurationMs'] ) ? $builder['cardEnterDurationMs'] : $defaults['cardEnterDurationMs'] ) ) );
		$card_delay_ms               = min( 600, max( 0, absint( isset( $builder['cardEnterDelayMs'] ) ? $builder['cardEnterDelayMs'] : $defaults['cardEnterDelayMs'] ) ) );
		$title_duration_ms           = min( 1200, max( 120, absint( isset( $builder['titleEnterDurationMs'] ) ? $builder['titleEnterDurationMs'] : $defaults['titleEnterDurationMs'] ) ) );
		$caption_duration_ms         = min( 1200, max( 120, absint( isset( $builder['captionEnterDurationMs'] ) ? $builder['captionEnterDurationMs'] : $defaults['captionEnterDurationMs'] ) ) );
		$social_duration_ms          = min( 1200, max( 120, absint( isset( $builder['socialEnterDurationMs'] ) ? $builder['socialEnterDurationMs'] : $defaults['socialEnterDurationMs'] ) ) );
		$title_delay_base            = min( 600, max( 0, absint( isset( $builder['titleEnterDelayMs'] ) ? $builder['titleEnterDelayMs'] : $defaults['titleEnterDelayMs'] ) ) );
		$caption_delay_base          = min( 600, max( 0, absint( isset( $builder['captionEnterDelayMs'] ) ? $builder['captionEnterDelayMs'] : $defaults['captionEnterDelayMs'] ) ) );
		$social_delay_base           = min( 600, max( 0, absint( isset( $builder['socialEnterDelayMs'] ) ? $builder['socialEnterDelayMs'] : $defaults['socialEnterDelayMs'] ) ) );
		$title_stagger_ms            = min( 300, max( 0, absint( isset( $builder['titleEnterStaggerMs'] ) ? $builder['titleEnterStaggerMs'] : $defaults['titleEnterStaggerMs'] ) ) );
		$caption_stagger_ms          = min( 300, max( 0, absint( isset( $builder['captionEnterStaggerMs'] ) ? $builder['captionEnterStaggerMs'] : $defaults['captionEnterStaggerMs'] ) ) );
		$social_stagger_ms           = min( 300, max( 0, absint( isset( $builder['socialEnterStaggerMs'] ) ? $builder['socialEnterStaggerMs'] : $defaults['socialEnterStaggerMs'] ) ) );
		$delay_title_ms              = $title_delay_base + ( $title_stagger_ms * $ord['title'] );
		$delay_caption_ms            = $caption_delay_base + ( $caption_stagger_ms * $ord['caption'] );
		$delay_social_ms             = $social_delay_base + ( $social_stagger_ms * $ord['social'] );
		$item_data['item_classes'][] = 'modula-hover-v2--free-slots';
		$free                        = sprintf(
			'--modula-hover-ord-title:%d;--modula-hover-ord-caption:%d;--modula-hover-ord-social:%d;--modula-hover-card-enter-duration:%dms;--modula-hover-card-enter-delay:%dms;--modula-hover-enter-duration-title:%dms;--modula-hover-enter-duration-caption:%dms;--modula-hover-enter-duration-social:%dms;--modula-hover-enter-delay-title:%dms;--modula-hover-enter-delay-caption:%dms;--modula-hover-enter-delay-social:%dms;--modula-hover-slot-title-x:%d%%;--modula-hover-slot-title-y:%d%%;--modula-hover-slot-caption-x:%d%%;--modula-hover-slot-caption-y:%d%%;--modula-hover-slot-social-x:%d%%;--modula-hover-slot-social-y:%d%%;--modula-hover-slot-anchor-title:%s;--modula-hover-slot-anchor-caption:%s;--modula-hover-slot-anchor-social:%s;--modula-hover-slot-max-width-title:%d%%;--modula-hover-slot-max-width-caption:%d%%;--modula-hover-slot-max-width-social:%d%%;--modula-hover-slot-text-align-title:%s;--modula-hover-slot-text-align-caption:%s;--modula-hover-slot-text-align-social:%s;',
			$ord['title'],
			$ord['caption'],
			$ord['social'],
			$card_duration_ms,
			$card_delay_ms,
			$title_duration_ms,
			$caption_duration_ms,
			$social_duration_ms,
			$delay_title_ms,
			$delay_caption_ms,
			$delay_social_ms,
			$pos['title']['x'],
			$pos['title']['y'],
			$pos['caption']['x'],
			$pos['caption']['y'],
			$pos['social']['x'],
			$pos['social']['y'],
			$anchor_title,
			$anchor_caption,
			$anchor_social,
			$max_title,
			$max_caption,
			$max_social,
			$align_title,
			$align_caption,
			$align_social
		);
		if ( isset( $item_data['item_attributes']['style'] ) && is_string( $item_data['item_attributes']['style'] ) && '' !== $item_data['item_attributes']['style'] ) {
			$item_data['item_attributes']['style'] = rtrim( $item_data['item_attributes']['style'], ';' ) . ';' . $free;
		} else {
			$item_data['item_attributes']['style'] = $free;
		}

		return $item_data;
	}

	/**
	 * Whether title/caption render below the image tile (not in hover overlay).
	 *
	 * @param array $settings Gallery settings (flat).
	 * @return bool
	 */
	private function is_caption_below_image( $settings ) {
		$type = isset( $settings['type'] ) ? sanitize_key( (string) $settings['type'] ) : '';
		if ( in_array( $type, array( 'story', 'bnb', 'parallax-masonry' ), true ) ) {
			return false;
		}

		$placement = isset( $settings['contentPlacement'] ) ? sanitize_key( (string) $settings['contentPlacement'] ) : 'inside-image';
		return 'below-image' === $placement;
	}

	/**
	 * Process custom grid attributes
	 *
	 * @param array $item_data Item data
	 * @param array $image     Image data
	 * @param array $settings  Gallery settings
	 * @return array Modified item data
	 */
	private function process_custom_grid( $item_data, $image, $settings ) {
		if ( 'custom-grid' !== $settings['type'] ) {
			return $item_data;
		}

		$item_data['item_attributes']['data-width']  = isset( $image['width'] ) ? absint( $image['width'] ) : 2;
		$item_data['item_attributes']['data-height'] = isset( $image['height'] ) ? absint( $image['height'] ) : 2;

		return $item_data;
	}

	/**
	 * Process grid-specific settings (crop, custom size)
	 *
	 * @param array $item_data Item data
	 * @param array $image     Image data
	 * @param array $settings  Gallery settings
	 * @return array Modified item data
	 */
	private function process_grid_settings( $item_data, $image, $settings ) {
		$type       = $settings['type'] ?? 'creative-gallery';
		$grid_types = array( 'creative-gallery', 'grid', 'custom-grid', 'uniform-grid', 'fit-grid', 'polaroid' );

		if ( ! in_array( $type, $grid_types, true ) ) {
			return $item_data;
		}

		// Custom grid size flag
		if ( 'custom' === $settings['grid_image_size'] ) {
			$item_data['custom_grid'] = true;
		}

		// Crop settings
		if ( 'custom-grid' !== $type ) {
			if ( isset( $settings['grid_image_crop'] ) && '1' === $settings['grid_image_crop'] ) {
				$item_data['crop'] = true;
			}
		} elseif ( isset( $settings['img_crop'] ) && '1' === $settings['img_crop'] ) {
			$item_data['crop'] = true;
		}

		return $item_data;
	}
}
