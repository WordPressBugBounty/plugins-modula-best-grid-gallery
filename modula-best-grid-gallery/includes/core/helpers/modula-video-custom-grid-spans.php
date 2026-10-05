<?php
/**
 * Keep custom-grid cell spans separate from video pixel metadata.
 *
 * Custom-grid `width` / `height` are cell counts. Video rows also store
 * `video_width` / `video_height` in pixels for aspect ratio. Contaminating
 * the cell spans with pixel values (e.g. height=1080) blows up the admin grid.
 *
 * @package Modula
 */

defined( 'ABSPATH' ) || exit;

/**
 * Whether a gallery row is a video template item.
 *
 * @param array<string, mixed> $image Gallery image row.
 * @return bool
 */
function modula_is_video_template_image_row( $image ) {
	if ( ! is_array( $image ) ) {
		return false;
	}
	if ( isset( $image['video_template'] ) && 1 === (int) $image['video_template'] ) {
		return true;
	}
	if ( isset( $image['id'] ) && is_string( $image['id'] ) && 0 === strpos( $image['id'], 'video_template_' ) ) {
		return true;
	}
	return false;
}

/**
 * Reset custom-grid spans when they match video pixel dimensions.
 *
 * Typical contamination: REST reshape copied video_height (1080) onto height.
 * Spans above the 12-column grid that equal the matching video_* pixel field
 * are treated as contamination and reset to the default 2×2 cell tile.
 *
 * @param array<string, mixed> $image Gallery image row.
 * @return array<string, mixed>
 */
function modula_repair_video_custom_grid_spans( $image ) {
	if ( ! modula_is_video_template_image_row( $image ) ) {
		return $image;
	}

	$max_cell_span = 12;

	if ( isset( $image['height'], $image['video_height'] )
		&& (int) $image['height'] === (int) $image['video_height']
		&& (int) $image['height'] > $max_cell_span
	) {
		$image['height'] = 2;
	}

	if ( isset( $image['width'], $image['video_width'] )
		&& (int) $image['width'] === (int) $image['video_width']
		&& (int) $image['width'] > $max_cell_span
	) {
		$image['width'] = 2;
	}

	return $image;
}
