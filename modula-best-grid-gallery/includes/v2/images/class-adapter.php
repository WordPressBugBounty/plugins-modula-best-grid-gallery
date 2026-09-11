<?php

/**
 * Modula gallery images — v2 storage adapter.
 * Normalizes rows from modula-images before persisting modula_images_v2 (JSON envelope).
 * v1 meta (modula-images) stays authoritative for legacy flows; v2 is derived on save.
 *
 * @package Modula
 */

namespace Modula\V2\Images;

defined( 'ABSPATH' ) || exit;

/**
 * Class Adapter
 */
class Adapter {


	public const STORAGE_FORMAT = 'modula-gallery-items-v2';

	/**
	 * v2: embedded rows (content_block, shortcode) may exist only in modula_images_v2; v1 stays attachment-only.
	 */
	public const STORAGE_VERSION = 2;

	/** Implicit default when itemKind is absent (legacy rows). */
	public const ITEM_KIND_IMAGE = 'image';

	public const ITEM_KIND_CONTENT_BLOCK = 'content_block';

	public const ITEM_KIND_SHORTCODE = 'shortcode';

	public const MANIFEST_FORMAT = 'modula-gallery-items-manifest';

	public const MANIFEST_VERSION = 1;

	/**
	 * Integer fields on item rows (legacy + schema `items` in settings-v2-document).
	 *
	 * @var string[]
	 */
	private static $int_keys = array(
		'id',
		'target',
		'width',
		'height',
		'togglelightbox',
		'hide_title',
	);

	/**
	 * Bootstrap-only fields from settings-editor preview; must not be written to modula_images_v2.
	 *
	 * @var string[]
	 */
	private static $bootstrap_only_storage_keys = array(
		'modulaRowIndex',
		'itemClasses',
		'itemAttributes',
		'linkClasses',
		'linkAttributes',
		'imgClasses',
		'imgAttributes',
		'srcset',
		'sizes',
		'lazyLoad',
		'hideTitle',
		'hideDescription',
		'hideSocials',
		'src',
		'thumbnail',
		'url',
		'blockBodyHtmlRendered',
		'shortcodeHtml',
		'watermarkApplied',
	);

	/**
	 * Drop settings-editor bootstrap keys before v2 persistence.
	 *
	 * @param array<string, mixed> $row Row.
	 * @return array<string, mixed>
	 */
	public static function strip_bootstrap_only_row_keys( array $row ): array {
		foreach ( self::$bootstrap_only_storage_keys as $key ) {
			unset( $row[ $key ] );
		}
		return $row;
	}

	/**
	 * Wrap normalized item list for post meta JSON (extensible envelope for pagination manifest later).
	 *
	 * @param array<int, array<string, mixed>> $items Item rows.
	 * @return array{format: string, version: int, items: array<int, array<string, mixed>>}
	 */
	public static function wrap_envelope( array $items ) {
		return array(
			'format'  => self::STORAGE_FORMAT,
			'version' => self::STORAGE_VERSION,
			'items'   => array_values( $items ),
		);
	}

	/**
	 * Item kind for a stored row (image is default).
	 *
	 * @param array<string, mixed> $row Row.
	 */
	public static function get_item_kind( array $row ): string {
		if ( isset( $row['itemKind'] ) && is_string( $row['itemKind'] ) ) {
			$k = $row['itemKind'];
			if ( 'content-block' === $k ) {
				return self::ITEM_KIND_CONTENT_BLOCK;
			}
			if ( self::ITEM_KIND_CONTENT_BLOCK === $k || self::ITEM_KIND_SHORTCODE === $k ) {
				return $k;
			}
		}
		if ( isset( $row['shortcodeRaw'] ) && '' !== trim( (string) $row['shortcodeRaw'] ) ) {
			return self::ITEM_KIND_SHORTCODE;
		}
		if ( self::row_has_embedded_identity( $row ) ) {
			return self::ITEM_KIND_CONTENT_BLOCK;
		}
		return self::ITEM_KIND_IMAGE;
	}

	/**
	 * Rows that exist only in v2 JSON (not written to modula-images).
	 *
	 * @param array<string, mixed> $row Row.
	 */
	public static function is_embedded_gallery_item( array $row ): bool {
		return self::ITEM_KIND_IMAGE !== self::get_item_kind( $row );
	}

	/**
	 * v2-only embedded rows use UUID/string ids (not attachment numeric ids).
	 *
	 * @param array<string, mixed> $row Row.
	 */
	private static function row_has_embedded_identity( array $row ): bool {
		if ( self::is_video_template_row( $row ) ) {
			return false;
		}
		$eid = isset( $row['embeddedId'] ) ? trim( (string) $row['embeddedId'] ) : '';
		if ( '' !== $eid && ! ctype_digit( $eid ) ) {
			return true;
		}
		$id = isset( $row['id'] ) ? $row['id'] : '';
		if ( is_string( $id ) ) {
			$id = trim( $id );
			if ( '' !== $id && ! ctype_digit( $id ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Sanitize content block HTML for storage while preserving `[shortcode]` tokens.
	 *
	 * @param string $html Raw editor HTML.
	 * @return string
	 */
	public static function sanitize_content_block_body_html_for_storage( string $html ): string {
		$html = (string) $html;
		if ( '' === trim( $html ) ) {
			return '';
		}

		$placeholders = array();
		$index        = 0;
		$patterns     = array();
		if ( function_exists( 'get_shortcode_regex' ) ) {
			$regex = get_shortcode_regex();
			if ( is_string( $regex ) && '' !== $regex ) {
				$patterns[] = '/' . $regex . '/';
			}
		}
		// Fallback for unregistered shortcodes in mixed HTML bodies.
		$patterns[] = '/\[[\/]?[a-zA-Z0-9_-]+(?:\s+[^\]]*)?[\/]?\]/';

		foreach ( $patterns as $pattern ) {
			$replaced = preg_replace_callback(
				$pattern,
				static function ( array $match ) use ( &$placeholders, &$index ): string {
					foreach ( $placeholders as $token => $original ) {
						if ( $original === $match[0] ) {
							return $token;
						}
					}
					$token                  = '%%MODULA_SB_' . $index . '%%';
					$placeholders[ $token ] = $match[0];
					++$index;
					return $token;
				},
				$html
			);
			if ( is_string( $replaced ) ) {
				$html = $replaced;
			}
		}

		$sanitized = wp_kses_post( $html );
		if ( ! empty( $placeholders ) ) {
			$sanitized = str_replace( array_keys( $placeholders ), array_values( $placeholders ), $sanitized );
		}

		return self::normalize_shortcode_attribute_quotes_to_single( $sanitized );
	}

	/**
	 * Shortcode attrs with double quotes (e.g. [kaliform id="1819"]) break JSON meta round-trips — store single-quoted attrs.
	 *
	 * @param string $html HTML / shortcode mix.
	 * @return string
	 */
	public static function normalize_shortcode_attribute_quotes_to_single( string $html ): string {
		if ( '' === $html || false === strpos( $html, '[' ) ) {
			return $html;
		}
		$replaced = preg_replace_callback(
			'/\[[^\]]+\]/',
			static function ( array $match ): string {
				$token = $match[0];
				$next  = preg_replace( '/(\s[\w-]+)=(")([^"]*)(")/', '$1\'$3\'', $token );
				return is_string( $next ) ? $next : $token;
			},
			$html
		);
		return is_string( $replaced ) ? $replaced : $html;
	}

	/**
	 * Video extension rows use string ids (`video_template_{n}`), not attachment IDs.
	 *
	 * @param array<string, mixed> $row Gallery row.
	 */
	public static function is_video_template_row( array $row ): bool {
		if ( isset( $row['video_template'] ) && 1 === (int) $row['video_template'] ) {
			return true;
		}
		if ( isset( $row['id'] ) && is_string( $row['id'] ) && 0 === strpos( $row['id'], 'video_template_' ) ) {
			return true;
		}
		return false;
	}

	/**
	 * Restore string ids for video rows saved with `absint( 'video_template_N' ) === 0`.
	 *
	 * @param array<int, array<string, mixed>> $items Mixed rows.
	 * @return array<int, array<string, mixed>>
	 */
	public static function repair_video_template_row_ids( array $items ): array {
		$max_suffix = 0;
		foreach ( $items as $row ) {
			if ( ! is_array( $row ) || ! isset( $row['id'] ) || ! is_string( $row['id'] ) ) {
				continue;
			}
			if ( preg_match( '/^video_template_(\d+)$/', $row['id'], $matches ) ) {
				$max_suffix = max( $max_suffix, (int) $matches[1] );
			}
		}

		$out = array();
		foreach ( $items as $row ) {
			if ( ! is_array( $row ) ) {
				$out[] = $row;
				continue;
			}
			if ( self::is_video_template_row( $row ) ) {
				$id = isset( $row['id'] ) ? $row['id'] : 0;
				if ( ! is_string( $id ) || '' === $id || ( is_numeric( $id ) && (int) $id <= 0 ) ) {
					++$max_suffix;
					$row['id'] = 'video_template_' . $max_suffix;
				}
			}
			$out[] = $row;
		}
		return $out;
	}

	/**
	 * Remove keys that must not appear on modula-images rows when deriving v1 from a merged list.
	 *
	 * @param array<string, mixed> $row Row.
	 * @return array<string, mixed>
	 */
	public static function strip_embedded_only_keys( array $row ): array {
		$strip = array(
			'itemKind',
			'embeddedId',
			'afterAttachmentId',
			'afterOrdinal',
			'blockBackgroundColor',
			'blockTextColor',
			'blockPaddingPreset',
			'blockFontPreset',
			'blockBackgroundImageId',
			'blockBackgroundImageUrl',
			'blockBackgroundOverlayOpacity',
			'blockBackgroundSize',
			'blockBackgroundPosition',
			'blockBackgroundRepeat',
			'blockBodyHtml',
			'blockBodyHtmlRendered',
			'shortcodeRaw',
			'shortcodeHtml',
		);
		foreach ( $strip as $key ) {
			unset( $row[ $key ] );
		}
		return $row;
	}

	/**
	 * Normalize a content_block or shortcode row for v2 storage.
	 *
	 * @param array<string, mixed> $row Row.
	 * @return array<string, mixed>
	 */
	public static function normalize_embedded_row( array $row ): array {
		$kind = self::get_item_kind( $row );
		if ( self::ITEM_KIND_IMAGE === $kind ) {
			return self::normalize_item_row( $row );
		}
		$id = isset( $row['embeddedId'] ) ? sanitize_text_field( (string) $row['embeddedId'] ) : '';
		if ( '' === $id ) {
			$id = wp_generate_uuid4();
		}
		$out = array(
			'itemKind'          => $kind,
			'embeddedId'        => $id,
			'id'                => $id,
			'afterAttachmentId' => isset( $row['afterAttachmentId'] ) ? absint( $row['afterAttachmentId'] ) : 0,
			'afterOrdinal'      => isset( $row['afterOrdinal'] ) ? absint( $row['afterOrdinal'] ) : 0,
		);
		if ( self::ITEM_KIND_CONTENT_BLOCK === $kind ) {
			$raw_bg = isset( $row['blockBackgroundColor'] ) ? trim( (string) $row['blockBackgroundColor'] ) : '';
			if ( '' === $raw_bg || 0 === strcasecmp( $raw_bg, 'transparent' ) ) {
				/* Explicit clear / transparent — no solid tint. */
				$out['blockBackgroundColor'] = '';
			} elseif ( class_exists( 'Modula_Helper' ) && method_exists( 'Modula_Helper', 'sanitize_rgba_colour' ) ) {
				$out['blockBackgroundColor'] = (string) \Modula_Helper::sanitize_rgba_colour( $raw_bg );
			} else {
				$bg                          = sanitize_hex_color( $raw_bg );
				$out['blockBackgroundColor'] = $bg ? $bg : '';
			}
			$fg = isset( $row['blockTextColor'] ) ? sanitize_hex_color( (string) $row['blockTextColor'] ) : '';
			if ( $fg ) {
				$out['blockTextColor'] = $fg;
			}
			$pad_presets               = array( 'tight', 'default', 'medium', 'generous' );
			$pp                        = isset( $row['blockPaddingPreset'] ) ? sanitize_key( (string) $row['blockPaddingPreset'] ) : 'default';
			$out['blockPaddingPreset'] = in_array( $pp, $pad_presets, true ) ? $pp : 'default';
			$font_presets              = class_exists( 'Modula_Frontend_Adapter' )
				? \Modula_Frontend_Adapter::content_block_font_preset_keys()
				: array( 'default', 'serif', 'mono', 'display' );
			$fp                        = isset( $row['blockFontPreset'] ) ? sanitize_key( (string) $row['blockFontPreset'] ) : 'default';
			$out['blockFontPreset']    = in_array( $fp, $font_presets, true ) ? $fp : 'default';
			$bg_image_id               = isset( $row['blockBackgroundImageId'] ) ? absint( $row['blockBackgroundImageId'] ) : 0;
			if ( $bg_image_id > 0 && 'attachment' === get_post_type( $bg_image_id ) ) {
				$out['blockBackgroundImageId'] = $bg_image_id;
			} else {
				$out['blockBackgroundImageId'] = 0;
			}
			$overlay_opacity                      = isset( $row['blockBackgroundOverlayOpacity'] )
				? (int) $row['blockBackgroundOverlayOpacity']
				: 45;
			$out['blockBackgroundOverlayOpacity'] = max( 0, min( 100, $overlay_opacity ) );
			$size_presets                         = array( 'cover', 'contain', 'auto' );
			$size                                 = isset( $row['blockBackgroundSize'] ) ? sanitize_text_field( (string) $row['blockBackgroundSize'] ) : 'cover';
			$size                                 = strtolower( trim( $size ) );
			$out['blockBackgroundSize']           = in_array( $size, $size_presets, true ) ? $size : 'cover';
			$position_presets                     = array(
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
			$out['blockBackgroundPosition']       = in_array( $position, $position_presets, true ) ? $position : 'center';
			$repeat_presets                       = array( 'no-repeat', 'repeat', 'repeat-x', 'repeat-y' );
			$repeat                               = isset( $row['blockBackgroundRepeat'] )
				? strtolower( trim( sanitize_text_field( (string) $row['blockBackgroundRepeat'] ) ) )
				: 'no-repeat';
			$out['blockBackgroundRepeat']         = in_array( $repeat, $repeat_presets, true ) ? $repeat : 'no-repeat';
			$html                                 = isset( $row['blockBodyHtml'] ) ? (string) $row['blockBodyHtml'] : '';
			$out['blockBodyHtml']                 = self::sanitize_content_block_body_html_for_storage( $html );
			$out['title']                         = isset( $row['title'] ) ? sanitize_text_field( (string) $row['title'] ) : '';
			$out['description']                   = isset( $row['description'] ) ? sanitize_textarea_field( (string) $row['description'] ) : '';
			$out['width']                         = isset( $row['width'] ) ? max( 1, absint( $row['width'] ) ) : 2;
			$out['height']                        = isset( $row['height'] ) ? max( 1, absint( $row['height'] ) ) : 2;
		} elseif ( self::ITEM_KIND_SHORTCODE === $kind ) {
			$raw                 = isset( $row['shortcodeRaw'] ) ? (string) $row['shortcodeRaw'] : '';
			$out['shortcodeRaw'] = sanitize_textarea_field( $raw );
			$out['width']        = isset( $row['width'] ) ? max( 1, absint( $row['width'] ) ) : 2;
			$out['height']       = isset( $row['height'] ) ? max( 1, absint( $row['height'] ) ) : 2;
		}
		// Custom grid: persist placement on v2-only rows (bootstrap + editor parity with modula-images).
		foreach ( array( 'gridX', 'gridY' ) as $grid_key ) {
			if ( ! array_key_exists( $grid_key, $row ) ) {
				continue;
			}
			$gv = $row[ $grid_key ];
			if ( null === $gv || '' === $gv || ( is_string( $gv ) && '' === trim( $gv ) ) ) {
				continue;
			}
			$out[ $grid_key ] = absint( $gv );
		}
		if ( isset( $row['gridLocked'] ) ) {
			$out['gridLocked'] = absint( $row['gridLocked'] ) ? 1 : 0;
		}
		return $out;
	}

	/**
	 * Normalize a heterogeneous list (images + embedded) for persisting modula_images_v2.
	 *
	 * @param array<int, array<string, mixed>|mixed> $items Rows.
	 * @return array<int, array<string, mixed>>
	 */
	public static function normalize_mixed_items_for_v2_storage( array $items ): array {
		$out = array();
		foreach ( $items as $i => $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			/**
			 * Filter one row before mixed normalization (images + embedded).
			 *
			 * @param array<string, mixed> $row Row.
			 * @param int                    $i   Index.
			 */
			$row = apply_filters( 'modula_v2_normalize_mixed_item_row_before', $row, (int) $i );
			if ( ! is_array( $row ) ) {
				continue;
			}
			$row = self::strip_bootstrap_only_row_keys( $row );
			if ( self::is_embedded_gallery_item( $row ) ) {
				$out[] = self::normalize_embedded_row( $row );
			} else {
				$out[] = self::normalize_item_row( $row );
			}
		}
		return apply_filters( 'modula_v2_normalize_mixed_items_list', $out, $items );
	}

	/**
	 * Image rows only (for modula-images meta), in order, from a merged v2 list.
	 *
	 * @param array<int, array<string, mixed>> $items Mixed rows.
	 * @return array<int, array<string, mixed>>
	 */
	public static function extract_v1_image_rows_from_mixed( array $items ): array {
		$out = array();
		foreach ( $items as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			if ( self::is_embedded_gallery_item( $row ) ) {
				continue;
			}
			if ( self::is_video_template_row( $row ) ) {
				$clean = self::strip_embedded_only_keys( $row );
				unset( $clean['itemKind'] );
				$out[] = self::normalize_item_row( $clean );
				continue;
			}
			$id = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
			if ( $id <= 0 ) {
				continue;
			}
			$clean = self::strip_embedded_only_keys( $row );
			unset( $clean['itemKind'] );
			$out[] = self::normalize_item_row( $clean );
		}
		return $out;
	}

	/**
	 * Decode raw meta value: envelope v2 or legacy flat list of items.
	 *
	 * @param mixed $decoded json_decode result or array from DB.
	 * @return array<int, array<string, mixed>>
	 */
	public static function unwrap_items( $decoded ) {
		return self::strip_catalog_file_urls_from_items( self::unwrap_items_lenient( $decoded ) );
	}

	/**
	 * Drop gallery item file URL snapshots from stored catalog rows (ADR 0022).
	 *
	 * @param array<int, mixed> $items Rows.
	 * @return array<int, mixed>
	 */
	public static function strip_catalog_file_urls_from_items( array $items ): array {
		$out = array();
		foreach ( $items as $row ) {
			if ( ! is_array( $row ) ) {
				$out[] = $row;
				continue;
			}
			unset( $row['url'], $row['src'], $row['thumbnail'] );
			$out[] = $row;
		}
		return $out;
	}

	/**
	 * Decode item rows from modula_images_v2 meta (envelope, legacy list, or items-only blob).
	 *
	 * @param mixed $decoded json_decode result or array from DB.
	 * @return array<int, array<string, mixed>>
	 */
	public static function unwrap_items_lenient( $decoded ) {
		if ( ! is_array( $decoded ) ) {
			return array();
		}
		if ( isset( $decoded['items'] ) && is_array( $decoded['items'] ) ) {
			return array_values( $decoded['items'] );
		}
		if ( self::is_list_of_items( $decoded ) ) {
			return array_values( $decoded );
		}
		return array();
	}

	/**
	 * Decode one chunk meta value: mini-envelope or flat list of rows.
	 *
	 * @param mixed $decoded json_decode of chunk meta.
	 * @return array<int, array<string, mixed>>
	 */
	public static function decode_chunk_items( $decoded ) {
		if ( ! is_array( $decoded ) ) {
			return array();
		}
		if ( isset( $decoded['items'] ) && is_array( $decoded['items'] ) ) {
			return array_values( $decoded['items'] );
		}
		if ( self::is_list_of_items( $decoded ) ) {
			return array_values( $decoded );
		}
		return array();
	}

	/**
	 * @param array<int, array<string, mixed>> $rows        Normalized rows.
	 * @param int                              $chunk_size  Rows per chunk (min 1).
	 * @return array<int, array<int, array<string, mixed>>>
	 */
	public static function split_to_chunks( array $rows, int $chunk_size ): array {
		$chunk_size = max( 1, $chunk_size );
		if ( array() === $rows ) {
			return array();
		}
		return array_chunk( array_values( $rows ), $chunk_size, false );
	}

	/**
	 * Validate decoded manifest JSON shape.
	 *
	 * @param mixed $decoded json_decode result.
	 */
	public static function validate_manifest( $decoded ): bool {
		if ( ! is_array( $decoded ) ) {
			return false;
		}
		if ( ( $decoded['format'] ?? '' ) !== self::MANIFEST_FORMAT ) {
			return false;
		}
		if ( ! isset( $decoded['keys'] ) || ! is_array( $decoded['keys'] ) ) {
			return false;
		}
		foreach ( $decoded['keys'] as $key ) {
			if ( ! is_string( $key ) || '' === $key ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @param array<mixed> $decoded Decoded meta.
	 * @return bool Whether the array is a 0..n-1 list of item row arrays.
	 */
	private static function is_list_of_items( array $decoded ) {
		if ( array() === $decoded ) {
			return true;
		}
		$i = 0;
		foreach ( $decoded as $k => $row ) {
			if ( (int) $k !== $i || ! is_array( $row ) ) {
				return false;
			}
			++$i;
		}
		return true;
	}

	/**
	 * Normalize v1/v2 rows for storage (deterministic typing; keeps unknown keys for Pro/filters).
	 *
	 * @param array<int, array<string, mixed>|mixed> $images List from modula-images.
	 * @return array<int, array<string, mixed>>
	 */
	public static function normalize_images_for_v2_storage( array $images ) {
		$out = array();
		foreach ( $images as $index => $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			/**
			 * Filter one image row before v2 list normalization.
			 *
			 * @param array<string, mixed> $row   Row from modula-images.
			 * @param int                  $index 0-based index in gallery.
			 */
			$row   = apply_filters( 'modula_v2_normalize_image_row_before', $row, (int) $index );
			$out[] = self::normalize_item_row( $row );
		}
		/**
		 * Filter full normalized item list (before envelope).
		 *
		 * @param array<int, array<string, mixed>> $out     Normalized rows.
		 * @param array<int, array<string, mixed>> $images  Original rows (same shape as modula-images).
		 */
		return apply_filters( 'modula_v2_normalize_images_list', $out, $images );
	}

	/**
	 * @param array<string, mixed> $item One modula-images row.
	 * @return array<string, mixed>
	 */
	public static function normalize_item_row( array $item ) {
		$out = $item;
		foreach ( self::$int_keys as $key ) {
			if ( ! array_key_exists( $key, $out ) ) {
				continue;
			}
			$val = $out[ $key ];
			if ( '' === $val || null === $val ) {
				continue;
			}
			if ( 'id' === $key && self::is_video_template_row( $item ) ) {
				$out['id'] = sanitize_text_field( (string) $val );
				continue;
			}
			$out[ $key ] = absint( $val );
		}
		if ( isset( $out['halign'] ) && is_string( $out['halign'] ) ) {
			$allowed = array( 'left', 'right', 'center' );
			if ( ! in_array( $out['halign'], $allowed, true ) ) {
				$out['halign'] = 'center';
			}
		}
		if ( isset( $out['valign'] ) && is_string( $out['valign'] ) ) {
			$allowed = array( 'top', 'bottom', 'middle' );
			if ( ! in_array( $out['valign'], $allowed, true ) ) {
				$out['valign'] = 'middle';
			}
		}
		foreach ( array( 'focal_x', 'focal_y', 'focal_crop_x', 'focal_crop_y' ) as $fk ) {
			if ( ! array_key_exists( $fk, $out ) ) {
				continue;
			}
			if ( '' === $out[ $fk ] || null === $out[ $fk ] ) {
				continue;
			}
			$v = floatval( $out[ $fk ] );
			if ( is_finite( $v ) ) {
				$out[ $fk ] = min( 1, max( 0, $v ) );
			} else {
				unset( $out[ $fk ] );
			}
		}
		foreach ( array( 'focal_crop_w', 'focal_crop_h' ) as $fk ) {
			if ( ! array_key_exists( $fk, $out ) ) {
				continue;
			}
			if ( '' === $out[ $fk ] || null === $out[ $fk ] ) {
				continue;
			}
			$v = floatval( $out[ $fk ] );
			if ( is_finite( $v ) && $v > 0 ) {
				$out[ $fk ] = min( 1, max( 1e-6, $v ) );
			} else {
				unset( $out[ $fk ] );
			}
		}
		if ( array_key_exists( 'tile_image_fit', $out ) ) {
			if ( '' === $out['tile_image_fit'] || null === $out['tile_image_fit'] ) {
				unset( $out['tile_image_fit'] );
			} else {
				$fit = sanitize_text_field( (string) $out['tile_image_fit'] );
				if ( in_array( $fit, array( 'contain', 'cover' ), true ) ) {
					$out['tile_image_fit'] = $fit;
				} else {
					unset( $out['tile_image_fit'] );
				}
			}
		}
		return $out;
	}
}
