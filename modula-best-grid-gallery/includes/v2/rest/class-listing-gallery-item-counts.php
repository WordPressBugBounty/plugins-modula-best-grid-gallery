<?php
/**
 * Admin listing: resolve and count gallery item catalogs (classic and/or v2).
 *
 * @package Modula
 */

namespace Modula\V2\Rest;

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
	 * Count image vs video rows in a catalog (rows without `id` are ignored).
	 *
	 * @param array<int, mixed> $images Catalog rows.
	 * @return array{images: int, videos: int, galleries: int, total: int}
	 */
	public static function count_rows( $images ) {
		if ( ! is_array( $images ) ) {
			return array(
				'images'    => 0,
				'videos'    => 0,
				'galleries' => 0,
				'total'     => 0,
			);
		}

		$image_count = 0;
		$video_count = 0;
		foreach ( $images as $row ) {
			if ( ! is_array( $row ) || ! isset( $row['id'] ) ) {
				continue;
			}
			$id = (string) $row['id'];
			if ( 0 === strpos( $id, 'video_' ) ) {
				++$video_count;
			} else {
				++$image_count;
			}
		}

		return array(
			'images'    => $image_count,
			'videos'    => $video_count,
			'galleries' => 0,
			'total'     => $image_count + $video_count,
		);
	}
}
