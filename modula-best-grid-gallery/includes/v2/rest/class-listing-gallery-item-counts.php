<?php
/**
 * Admin listing: resolve and count gallery item catalogs (classic and/or v2).
 *
 * @package Modula
 */

namespace Modula\V2\Rest;

use Modula\V2\Images\Adapter;

defined( 'ABSPATH' ) || exit;

/**
 * Pure helpers for listing item counts / preview catalog selection.
 */
class Listing_Gallery_Item_Counts {

	/**
	 * Prefer non-empty classic `modula-images`; otherwise use v2 rows.
	 * Never invents rows that are not in either catalog.
	 *
	 * @param mixed $classic_images `modula-images` post meta.
	 * @param mixed $v2_images      `Meta_Sync::get_images_v2()` result.
	 * @return array<int, array<string, mixed>>
	 */
	public static function select_catalog( $classic_images, $v2_images ) {
		if ( is_array( $classic_images ) && ! empty( $classic_images ) ) {
			return $classic_images;
		}
		if ( is_array( $v2_images ) && ! empty( $v2_images ) ) {
			return $v2_images;
		}
		return array();
	}

	/**
	 * Count catalog rows by kind (rows without `id` are ignored). Content blocks and
	 * shortcodes are their own kinds, never images.
	 *
	 * @param array<int, mixed> $images Catalog rows.
	 * @return array{images: int, videos: int, blocks: int, shortcodes: int, galleries: int, total: int}
	 */
	public static function count_rows( $images ) {
		$counts = array(
			'images'     => 0,
			'videos'     => 0,
			'blocks'     => 0,
			'shortcodes' => 0,
			'galleries'  => 0,
			'total'      => 0,
		);
		if ( ! is_array( $images ) ) {
			return $counts;
		}

		foreach ( $images as $row ) {
			if ( ! is_array( $row ) || ! isset( $row['id'] ) ) {
				continue;
			}
			++$counts[ self::row_count_key( $row ) ];
			++$counts['total'];
		}

		return $counts;
	}

	/**
	 * The count a catalog row adds to.
	 *
	 * Video rows (`video_*` ids) are checked first: their non-numeric id would
	 * otherwise read as an embedded row.
	 *
	 * @param array<string, mixed> $row Catalog row with an `id`.
	 * @return string One of images, videos, blocks, shortcodes.
	 */
	public static function row_count_key( array $row ) {
		if ( 0 === strpos( (string) $row['id'], 'video_' ) ) {
			return 'videos';
		}
		$kind = Adapter::get_item_kind( $row );
		if ( Adapter::ITEM_KIND_CONTENT_BLOCK === $kind ) {
			return 'blocks';
		}
		if ( Adapter::ITEM_KIND_SHORTCODE === $kind ) {
			return 'shortcodes';
		}
		return 'images';
	}
}
