<?php
/**
 * Preserves v2-only embedded rows (content blocks, shortcodes) and video template rows when
 * rebuilding the gallery from modula-images.
 *
 * @package Modula
 */

namespace Modula\V2\Images;

defined( 'ABSPATH' ) || exit;

/**
 * Class Item_Merge
 */
final class Item_Merge {

	/**
	 * Rebuild the canonical v2 item list: normalized image rows from v1, with embedded items
	 * reinserted after the attachment occurrence they were anchored to.
	 *
	 * @param array<int, array<string, mixed>> $v1_normalized Rows from modula-images after normalization.
	 * @param array<int, array<string, mixed>> $previous_v2    Full previous v2 list (may include embedded rows).
	 * @return array<int, array<string, mixed>>
	 */
	public static function merge_v1_with_preserved_embedded( array $v1_normalized, array $previous_v2 ): array {
		$embedded = self::extract_embedded_rows( $previous_v2 );
		$result   = array();
		$placed   = array_fill( 0, count( $embedded ), false );

		// Before first image: afterAttachmentId 0, afterOrdinal 0.
		self::append_embedded_after_anchor( $result, $embedded, $placed, 0, 0 );

		$counts = array();
		foreach ( $v1_normalized as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			// Video rows use string ids (`video_template_N`); absint() is 0 — must not skip them.
			if ( Adapter::is_video_template_row( $row ) ) {
				$result[] = Adapter::strip_embedded_only_keys( $row );
				continue;
			}
			$aid = isset( $row['id'] ) ? absint( $row['id'] ) : 0;
			if ( $aid <= 0 ) {
				continue;
			}
			$occ            = isset( $counts[ $aid ] ) ? (int) $counts[ $aid ] : 0;
			$counts[ $aid ] = $occ + 1;

			$result[] = Adapter::strip_embedded_only_keys( $row );

			self::append_embedded_after_anchor( $result, $embedded, $placed, $aid, $occ );
		}

		// Orphans (anchor attachment removed): append to keep user content.
		foreach ( $embedded as $i => $row ) {
			if ( empty( $placed[ $i ] ) ) {
				$result[] = $row;
			}
		}

		return $result;
	}

	/**
	 * @param array<int, array<string, mixed>> $rows Full v2 rows.
	 * @return array<int, array<string, mixed>>
	 */
	private static function extract_embedded_rows( array $rows ): array {
		$out = array();
		foreach ( $rows as $row ) {
			if ( is_array( $row ) && Adapter::is_embedded_gallery_item( $row ) ) {
				$out[] = Adapter::normalize_embedded_row( $row );
			}
		}
		return $out;
	}

	/**
	 * @param array<int, array<string, mixed>> $result  Merged list (by ref).
	 * @param array<int, array<string, mixed>> $embedded Embedded rows.
	 * @param array<int, bool>                 $placed  Whether embedded index was placed.
	 */
	private static function append_embedded_after_anchor( array &$result, array $embedded, array &$placed, int $after_id, int $ordinal ): void {
		foreach ( $embedded as $i => $row ) {
			if ( ! empty( $placed[ $i ] ) ) {
				continue;
			}
			$aid = isset( $row['afterAttachmentId'] ) ? absint( $row['afterAttachmentId'] ) : 0;
			$ord = isset( $row['afterOrdinal'] ) ? absint( $row['afterOrdinal'] ) : 0;
			if ( $aid === $after_id && $ord === $ordinal ) {
				$result[]     = $row;
				$placed[ $i ] = true;
			}
		}
	}
}
