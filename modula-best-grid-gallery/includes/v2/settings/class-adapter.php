<?php

/**
 * Modula v2 settings adapter.
 * Converts between flat modula-settings (legacy) and grouped modula-settings-v2 schema.
 * Uses {@see Field_Registry} for flat ↔ grouped mapping. Legacy alias: Modula_Settings_Adapter.
 *
 * @package Modula
 */

namespace Modula\V2\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Class Adapter
 */
class Adapter {


	/** @var array<string, string>|null */
	private static $grouped_to_flat = null;

	private static function get_grouped_to_flat() {
		if ( null !== self::$grouped_to_flat ) {
			return self::$grouped_to_flat;
		}
		self::$grouped_to_flat = array();
		foreach ( Field_Registry::get_flat_to_grouped_mapping() as $flat => $entry ) {
			self::$grouped_to_flat[ $entry['group'] . '.' . $entry['key'] ] = $flat;
		}
		return self::$grouped_to_flat;
	}

	/**
	 * Flat keys that are numeric and must preserve 0 (never converted to boolean false).
	 *
	 * @var array<string>
	 */
	private static $numeric_flat_keys = array(
		'gutter',
		'tablet_gutter',
		'mobile_gutter',
		'grid_row_height',
		'maxImagesCount',
		'maxImagesCount_mobile',
		'pagination_number',
	);

	/**
	 * Uniform grid custom ratio: both parts must stay in 1–20 (schema + UI).
	 *
	 * @param array<string, int> $wh
	 * @return array{width: int, height: int}
	 */
	public static function clamp_uniform_tile_aspect_custom( array $wh ) {
		$w = isset( $wh['width'] ) ? absint( $wh['width'] ) : 0;
		$h = isset( $wh['height'] ) ? absint( $wh['height'] ) : 0;
		$w = min( 20, max( 1, $w ) );
		$h = min( 20, max( 1, $h ) );
		return array(
			'width'  => $w,
			'height' => $h,
		);
	}

	/**
	 * Canonical shape for v2 width/height settings: associative array with integer width and height.
	 * Accepts legacy `0`, `[ w, h ]`, or `{ width, height }` from flat/meta or REST.
	 *
	 * @param mixed $value Raw value.
	 * @return array{width: int, height: int}
	 */
	public static function normalize_width_height_object( $value ) {
		if ( is_array( $value ) && isset( $value['width'], $value['height'] ) ) {
			return array(
				'width'  => absint( $value['width'] ),
				'height' => absint( $value['height'] ),
			);
		}
		if ( is_array( $value ) && array_key_exists( 0, $value ) && array_key_exists( 1, $value ) && ! isset( $value['width'] ) ) {
			return array(
				'width'  => absint( $value[0] ),
				'height' => absint( $value[1] ),
			);
		}
		if ( is_object( $value ) ) {
			$arr = (array) $value;
			if ( isset( $arr['width'], $arr['height'] ) ) {
				return array(
					'width'  => absint( $arr['width'] ),
					'height' => absint( $arr['height'] ),
				);
			}
		}
		return array(
			'width'  => 0,
			'height' => 0,
		);
	}

	private static function normalize_for_grouped( $value, $flat_key ) {
		if ( '' === $value || null === $value ) {
			return $value;
		}
		if ( is_array( $value ) ) {
			return array_map(
				function ( $v ) use ( $flat_key ) {
					return self::normalize_for_grouped( $v, $flat_key );
				},
				$value
			);
		}
		if ( is_object( $value ) ) {
			return $value;
		}
		$str = is_string( $value ) ? $value : (string) $value;
		// Preserve 0 for numeric settings (gutter, etc.) so backend sends 0, not false.
		if ( in_array( $flat_key, self::$numeric_flat_keys, true ) && ( 0 === $value || '0' === $str ) ) {
			return 0;
		}
		// Legacy flat booleans are often stored as strings "0" / "1". Do not treat integer 0 as false here:
		// (string) 0 === "0", which would corrupt numeric fields (e.g. general.randomFactor) when
		// updated_post_meta re-runs sync_settings_v2() after REST writes modula-settings from to_flat().
		if ( true === $value || false === $value ) {
			return (bool) $value;
		}
		if ( is_string( $value ) && ( '0' === $value || '1' === $value ) ) {
			return '1' === $value;
		}
		if ( is_numeric( $str ) && false === strpos( $str, '.' ) ) {
			return (int) $str;
		}
		return $value;
	}

	/**
	 * Map legacy "grid + columns auto" to v2 "justified-grid".
	 * Old settings: Gallery type masonry with columns auto → v2 Gallery type justified grid.
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings (modified in place).
	 */
	private static function apply_legacy_type_mapping( array &$grouped ) {
		$type      = isset( $grouped['general']['type'] ) ? $grouped['general']['type'] : null;
		$grid_type = isset( $grouped['layout']['gridType'] ) ? $grouped['layout']['gridType'] : null;
		if ( 'grid' === $type && 'automatic' === $grid_type ) {
			$grouped['general']['type'] = 'justified-grid';
			// Column count is not used for justified layout; normalize stale "automatic".
			$grouped['layout']['gridType'] = '3';
		}
		// Legacy saves may still have automatic after type was already justified-grid.
		if ( 'justified-grid' === $type && 'automatic' === $grid_type ) {
			$grouped['layout']['gridType'] = '3';
		}
	}

	/** @param array<string, mixed> $flat */
	public static function to_grouped( array $flat, array $options = array() ) {
		$legacy_import = ! empty( $options['legacy_import'] );
		$grouped       = array();
		$flat_map      = Field_Registry::get_flat_to_grouped_mapping();
		foreach ( $flat as $flat_key => $value ) {
			if ( ! isset( $flat_map[ $flat_key ] ) ) {
				continue;
			}
			$entry = $flat_map[ $flat_key ];
			$g     = $entry['group'];
			$k     = $entry['key'];
			if ( ! isset( $grouped[ $g ] ) ) {
				$grouped[ $g ] = array();
			}
			if ( in_array( $flat_key, array( 'slider_image_dimensions', 'slider_syncing_nav_image_dimensions', 'grid_image_dimensions', 'uniform_grid_tile_aspect_custom' ), true ) ) {
				$grouped[ $g ][ $k ] = self::normalize_width_height_object( $value );
				if ( 'uniform_grid_tile_aspect_custom' === $flat_key ) {
					$grouped[ $g ][ $k ] = self::clamp_uniform_tile_aspect_custom( $grouped[ $g ][ $k ] );
				}
			} else {
				$grouped[ $g ][ $k ] = self::normalize_for_grouped( $value, $flat_key );
			}
		}
		self::apply_legacy_type_mapping( $grouped );
		self::apply_gallery_title_hide_semantics( $grouped, $flat );
		self::apply_lightbox_share_semantics( $grouped, $flat );
		self::apply_legacy_caption_placement( $grouped, $flat );
		self::ensure_hover_builder( $grouped, $flat );
		self::apply_uniform_contain_migration_from_flat( $grouped, $flat );
		if ( $legacy_import ) {
			self::apply_legacy_pagination_semantics( $grouped, $flat );
		}
		self::normalize_pagination_modes( $grouped );
		self::normalize_equal_cell_gallery_layouts( $grouped );
		self::clamp_masonry_gallery_width( $grouped );
		self::enrich_video_media_urls( $grouped );
		if ( ! isset( $grouped['loadingEffects'] ) || ! is_array( $grouped['loadingEffects'] ) ) {
			$grouped['loadingEffects'] = array();
		}
		Sanitizer::hydrate_loading_effects_enables( $grouped['loadingEffects'] );
		return $grouped;
	}

	/**
	 * Resolve custom video play-icon attachment ID to a public URL for React.
	 *
	 * Mutates $grouped in place (pass-by-reference). Also returns it for chaining.
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings (by ref).
	 * @return array<string, array<string, mixed>>
	 */
	public static function enrich_video_media_urls( array &$grouped ) {
		if ( empty( $grouped['video'] ) || ! is_array( $grouped['video'] ) ) {
			return $grouped;
		}
		$aid = isset( $grouped['video']['customVideoIcon'] )
			? absint( $grouped['video']['customVideoIcon'] )
			: 0;
		if ( $aid > 0 ) {
			$url = wp_get_attachment_url( $aid );
			if ( is_string( $url ) && '' !== $url ) {
				$grouped['video']['customVideoIconUrl'] = $url;
			}
		}
		return $grouped;
	}

	/**
	 * Legacy flat show_gallery_title (1 = show) → v2 captions.hideGalleryTitle (true = hide).
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings (by ref).
	 * @param array<string, mixed>                $flat    Flat settings.
	 */
	private static function apply_gallery_title_hide_semantics( array &$grouped, array $flat ) {
		if ( ! array_key_exists( 'show_gallery_title', $flat ) ) {
			return;
		}
		if ( ! isset( $grouped['captions'] ) || ! is_array( $grouped['captions'] ) ) {
			$grouped['captions'] = array();
		}
		$show                                    = self::normalize_for_grouped( $flat['show_gallery_title'], 'show_gallery_title' );
		$grouped['captions']['hideGalleryTitle'] = ! (bool) $show;
	}

	/**
	 * Legacy flat lightbox_share / enableSocial → v2 lightbox.share when share was not stored separately.
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings (by ref).
	 * @param array<string, mixed>                $flat    Flat settings.
	 */
	private static function apply_lightbox_share_semantics( array &$grouped, array $flat ) {
		if ( ! isset( $grouped['lightbox'] ) || ! is_array( $grouped['lightbox'] ) ) {
			$grouped['lightbox'] = array();
		}
		if ( array_key_exists( 'share', $grouped['lightbox'] ) || array_key_exists( 'lightbox_share', $flat ) ) {
			return;
		}
		$enable_social = false;
		if ( isset( $grouped['social']['enableSocial'] ) ) {
			$enable_social = (bool) self::normalize_for_grouped( $grouped['social']['enableSocial'], 'enableSocial' );
		} elseif ( array_key_exists( 'enableSocial', $flat ) ) {
			$enable_social = (bool) self::normalize_for_grouped( $flat['enableSocial'], 'enableSocial' );
		}
		if ( $enable_social ) {
			$grouped['lightbox']['share'] = true;
		}
	}

	/**
	 * Legacy flat `effect` = under (title & caption below image) → v2 captions.contentPlacement.
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings (by ref).
	 * @param array<string, mixed>                $flat    Flat settings.
	 */
	private static function apply_legacy_caption_placement( array &$grouped, array $flat ) {
		if ( ! isset( $grouped['captions'] ) || ! is_array( $grouped['captions'] ) ) {
			$grouped['captions'] = array();
		}
		if (
			isset( $grouped['captions']['contentPlacement'] )
			&& 'below-image' === $grouped['captions']['contentPlacement']
		) {
			return;
		}
		$effect = isset( $flat['effect'] ) ? sanitize_key( (string) $flat['effect'] ) : '';
		if ( 'under' !== $effect ) {
			return;
		}
		$grouped['captions']['contentPlacement'] = 'below-image';
		$grouped['captions']['hideTitle']        = false;
		$grouped['captions']['hideDescription']  = false;
	}

	/**
	 * Legacy Pro flat `pagination_number` was “images per page”, not pagination chrome.
	 * v2 uses `pagination.maxImagesCount` for per-page size and `pagination.paginationNumber` for link window.
	 *
	 * Runs only on first flat → v2 import (`legacy_import`) when max-per-page was unset (0).
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings (by ref).
	 * @param array<string, mixed>                $flat    Flat settings.
	 */
	private static function apply_legacy_pagination_semantics( array &$grouped, array $flat ) {
		if ( ! isset( $grouped['pagination'] ) || ! is_array( $grouped['pagination'] ) ) {
			$grouped['pagination'] = array();
		}
		$pg = &$grouped['pagination'];

		$pagination_on = ! empty( $flat['enable_pagination'] ) && (int) $flat['enable_pagination'] !== 0;
		if ( ! $pagination_on && empty( $pg['enablePagination'] ) ) {
			return;
		}

		$legacy_per_page = isset( $flat['pagination_number'] ) ? absint( $flat['pagination_number'] ) : 0;
		if ( $legacy_per_page <= 0 ) {
			return;
		}

		$max_desktop = array_key_exists( 'maxImagesCount', $flat )
			? absint( $flat['maxImagesCount'] )
			: ( isset( $pg['maxImagesCount'] ) ? absint( $pg['maxImagesCount'] ) : 0 );
		$max_mobile  = array_key_exists( 'maxImagesCount_mobile', $flat )
			? absint( $flat['maxImagesCount_mobile'] )
			: ( isset( $pg['maxImagesCountMobile'] ) ? absint( $pg['maxImagesCountMobile'] ) : 0 );

		if ( $max_desktop > 0 || $max_mobile > 0 ) {
			return;
		}

		$pg['maxImagesCount'] = $legacy_per_page;
		// Legacy flat key mapped 1:1 into paginationNumber; reset to v2 UI default (link window, not per-page).
		$pg['paginationNumber'] = 5;
	}

	/**
	 * Numbered pagination vs infinite scroll vs load-more are mutually exclusive sub-modes.
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings (by ref).
	 */
	public static function normalize_pagination_modes( array &$grouped ) {
		if ( ! isset( $grouped['pagination'] ) || ! is_array( $grouped['pagination'] ) ) {
			return;
		}
		$pg = &$grouped['pagination'];
		if ( empty( $pg['enablePagination'] ) ) {
			return;
		}
		$infinite  = ! empty( $pg['enableInfiniteScroll'] );
		$load_more = ! empty( $pg['enableLoadMore'] );
		if ( $infinite && $load_more ) {
			$pg['enableInfiniteScroll'] = false;
		}
	}

	/**
	 * Default composable hover builder (v2).
	 *
	 * @return array<string, mixed>
	 */
	public static function default_hover_builder() {
		return array(
			'cardTreatment'          => 'zoom',
			'graphicElement'         => 'none',
			'graphicVisibility'      => 'on-hover',
			'dimOverlay'             => false,
			'titleEnter'             => 'fade',
			'captionEnter'           => 'fade',
			'socialEnter'            => 'fade',
			'titleVisibility'        => 'on-hover',
			'captionVisibility'      => 'on-hover',
			'socialVisibility'       => 'on-hover',
			'cardEnterDurationMs'    => 280,
			'cardEnterDelayMs'       => 0,
			'titleEnterDurationMs'   => 280,
			'captionEnterDurationMs' => 280,
			'socialEnterDurationMs'  => 280,
			'titleEnterDelayMs'      => 0,
			'captionEnterDelayMs'    => 0,
			'socialEnterDelayMs'     => 0,
			'titleEnterStaggerMs'    => 45,
			'captionEnterStaggerMs'  => 45,
			'socialEnterStaggerMs'   => 45,
			'sourcePresetId'         => '',
			'slotPositions'          => array(
				'title'   => array(
					'x' => 50,
					'y' => 18,
				),
				'caption' => array(
					'x' => 50,
					'y' => 50,
				),
				'social'  => array(
					'x' => 50,
					'y' => 82,
				),
			),
		);
	}

	/**
	 * Map a legacy hover effect slug to a reasonable builder preset.
	 *
	 * @param string $slug Legacy effect slug.
	 * @return array<string, mixed>
	 */
	public static function hover_builder_from_legacy_effect_slug( $slug ) {
		$slug = is_string( $slug ) ? $slug : '';
		$b    = self::default_hover_builder();
		if ( '' === $slug || 'none' === $slug ) {
			$b['cardTreatment'] = 'none';
			return $b;
		}
		if ( false !== strpos( $slug, 'greyscale' ) || 'greyscale' === $slug ) {
			$b['cardTreatment'] = 'grayscale';
			return $b;
		}
		if ( preg_match( '/^tilt/', $slug ) ) {
			$b['cardTreatment'] = 'lift';
			return $b;
		}
		return $b;
	}

	/**
	 * Ensure grouped.hover.builder exists (migrate from legacy flat `effect` when needed).
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings (by ref).
	 * @param array<string, mixed>                $flat    Flat settings used for migration hints.
	 */
	private static function ensure_hover_builder( array &$grouped, array $flat ) {
		if ( ! isset( $grouped['hover'] ) || ! is_array( $grouped['hover'] ) ) {
			$grouped['hover'] = array();
		}
		$h = &$grouped['hover'];
		if ( isset( $h['builder'] ) && is_array( $h['builder'] ) ) {
			$pos_ok = ( isset( $h['builder']['slotPositions'] ) && is_array( $h['builder']['slotPositions'] ) && count( $h['builder']['slotPositions'] ) > 0 )
				|| ( isset( $h['builder']['slotpositions'] ) && is_array( $h['builder']['slotpositions'] ) && count( $h['builder']['slotpositions'] ) > 0 );
			if ( $pos_ok ) {
				$defaults      = self::default_hover_builder();
				$has_positions = ( isset( $h['builder']['slotPositions'] ) && is_array( $h['builder']['slotPositions'] ) )
					|| ( isset( $h['builder']['slotpositions'] ) && is_array( $h['builder']['slotpositions'] ) );
				if ( ! $has_positions ) {
					$h['builder']['slotPositions'] = $defaults['slotPositions'];
				}
				if ( ! array_key_exists( 'dimOverlay', $h['builder'] ) ) {
					$h['builder']['dimOverlay'] = $defaults['dimOverlay'];
				}
				if ( array_key_exists( 'dimOverlay', $h ) ) {
					$h['builder']['dimOverlay'] = (bool) $h['dimOverlay'];
				} else {
					$h['dimOverlay'] = (bool) $h['builder']['dimOverlay'];
				}
				return;
			}
		}
		if ( isset( $flat['effect'] ) && is_string( $flat['effect'] ) && '' !== $flat['effect'] ) {
			$h['builder']    = self::hover_builder_from_legacy_effect_slug( $flat['effect'] );
			$h['dimOverlay'] = (bool) $h['builder']['dimOverlay'];
			return;
		}
		$h['builder']    = self::default_hover_builder();
		$h['dimOverlay'] = (bool) $h['builder']['dimOverlay'];
	}

	/** @param array<string, array<string, mixed>> $grouped */
	public static function normalize_equal_cell_gallery_layouts( array &$grouped ) {
		self::migrate_uniform_contain_to_fit_grid( $grouped );
		self::normalize_uniform_grid_layout( $grouped );
		self::normalize_fit_grid_layout( $grouped );
	}

	/**
	 * Legacy flat uniform_grid_image_fit=contain → fit-grid (before flat key removal from registry).
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings (by ref).
	 * @param array<string, mixed>                $flat    Flat settings.
	 */
	private static function apply_uniform_contain_migration_from_flat( array &$grouped, array $flat ) {
		if ( ! isset( $flat['uniform_grid_image_fit'] ) ) {
			return;
		}
		$fit = sanitize_key( (string) $flat['uniform_grid_image_fit'] );
		if ( 'contain' !== $fit ) {
			return;
		}
		$type = isset( $grouped['general']['type'] ) ? (string) $grouped['general']['type'] : '';
		if ( 'uniform-grid' !== $type ) {
			return;
		}
		if ( ! isset( $grouped['layout'] ) || ! is_array( $grouped['layout'] ) ) {
			$grouped['layout'] = array();
		}
		if ( ! isset( $grouped['layout']['uniformGridImageFit'] ) ) {
			$grouped['layout']['uniformGridImageFit'] = 'contain';
		}
		if (
			! isset( $grouped['layout']['uniformGridImageAlign'] ) &&
			isset( $flat['uniform_grid_image_align'] )
		) {
			$grouped['layout']['uniformGridImageAlign'] = sanitize_key(
				(string) $flat['uniform_grid_image_align']
			);
		}
		self::migrate_uniform_contain_to_fit_grid( $grouped );
	}

	/**
	 * v2 grouped saves: uniform-grid + uniformGridImageFit contain → fit-grid.
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings (by ref).
	 */
	public static function migrate_uniform_contain_to_fit_grid( array &$grouped ) {
		$type = isset( $grouped['general']['type'] ) ? (string) $grouped['general']['type'] : '';
		if ( 'uniform-grid' !== $type ) {
			return;
		}
		if ( ! isset( $grouped['layout'] ) || ! is_array( $grouped['layout'] ) ) {
			return;
		}
		$fit = isset( $grouped['layout']['uniformGridImageFit'] )
			? sanitize_key( (string) $grouped['layout']['uniformGridImageFit'] )
			: 'cover';
		if ( 'contain' !== $fit ) {
			return;
		}
		$align                                  = isset( $grouped['layout']['uniformGridImageAlign'] )
			? sanitize_key( (string) $grouped['layout']['uniformGridImageAlign'] )
			: 'center';
		$grouped['general']['type']             = 'fit-grid';
		$grouped['layout']['fitGridImageAlign'] = in_array(
			$align,
			array( 'center', 'top', 'bottom', 'left', 'right' ),
			true
		) ? $align : 'center';
		unset( $grouped['layout']['uniformGridImageFit'], $grouped['layout']['uniformGridImageAlign'] );
	}

	/** @param array<string, array<string, mixed>> $grouped */
	public static function normalize_uniform_grid_layout( array &$grouped ) {
		$type = isset( $grouped['general']['type'] ) ? (string) $grouped['general']['type'] : '';
		if ( 'uniform-grid' !== $type ) {
			return;
		}
		if ( ! isset( $grouped['layout'] ) || ! is_array( $grouped['layout'] ) ) {
			$grouped['layout'] = array();
		}
		$grid_type = isset( $grouped['layout']['gridType'] ) ? (string) $grouped['layout']['gridType'] : '';
		if ( '1' === $grid_type ) {
			$grouped['layout']['gridType'] = '2';
		}
		unset( $grouped['layout']['uniformGridImageFit'], $grouped['layout']['uniformGridImageAlign'] );
	}

	/** @param array<string, array<string, mixed>> $grouped */
	public static function normalize_fit_grid_layout( array &$grouped ) {
		$type = isset( $grouped['general']['type'] ) ? (string) $grouped['general']['type'] : '';
		if ( 'fit-grid' !== $type ) {
			return;
		}
		if ( ! isset( $grouped['layout'] ) || ! is_array( $grouped['layout'] ) ) {
			$grouped['layout'] = array();
		}
		$grid_type = isset( $grouped['layout']['gridType'] ) ? (string) $grouped['layout']['gridType'] : '';
		if ( '1' === $grid_type ) {
			$grouped['layout']['gridType'] = '2';
		}
		$align                                  = isset( $grouped['layout']['fitGridImageAlign'] )
			? sanitize_key( (string) $grouped['layout']['fitGridImageAlign'] )
			: 'center';
		$grouped['layout']['fitGridImageAlign'] = in_array(
			$align,
			array( 'center', 'top', 'bottom', 'left', 'right' ),
			true
		) ? $align : 'center';
		unset( $grouped['layout']['uniformGridImageFit'], $grouped['layout']['uniformGridImageAlign'] );
	}

	/**
	 * Masonry (type `grid`): percent widths cannot exceed 100%.
	 * Bare numbers / px are unchanged; only values ending in `%` are clamped.
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings (by ref).
	 */
	public static function clamp_masonry_gallery_width( array &$grouped ) {
		$type = isset( $grouped['general']['type'] ) ? (string) $grouped['general']['type'] : '';
		if ( 'grid' !== $type ) {
			return;
		}
		if ( ! isset( $grouped['general'] ) || ! is_array( $grouped['general'] ) ) {
			return;
		}
		if ( ! array_key_exists( 'width', $grouped['general'] ) ) {
			return;
		}
		$raw = $grouped['general']['width'];
		if ( null === $raw || is_array( $raw ) || is_object( $raw ) ) {
			return;
		}
		$s = trim( (string) $raw );
		if ( '' === $s || '%' !== substr( $s, -1 ) ) {
			return;
		}
		$num = (float) trim( substr( $s, 0, -1 ) );
		if ( $num > 100 ) {
			$grouped['general']['width'] = '100%';
		}
	}

	/** @param array<string, array<string, mixed>> $grouped */
	public static function to_flat( array $grouped ) {
		self::normalize_equal_cell_gallery_layouts( $grouped );
		self::normalize_pagination_modes( $grouped );
		self::clamp_masonry_gallery_width( $grouped );
		$reverse = self::get_grouped_to_flat();
		$flat    = array();
		foreach ( $grouped as $group => $keys ) {
			if ( ! is_array( $keys ) ) {
				continue;
			}
			foreach ( $keys as $key => $value ) {
				$composite = $group . '.' . $key;
				if ( isset( $reverse[ $composite ] ) ) {
					$flat[ $reverse[ $composite ] ] = $value;
				}
			}
		}
		if ( isset( $grouped['captions']['hideGalleryTitle'] ) ) {
			$flat['show_gallery_title'] = $grouped['captions']['hideGalleryTitle'] ? 0 : 1;
		}
		return $flat;
	}

	/** @return array<string, array{group: string, key: string}> */
	public static function get_flat_to_grouped_mapping() {
		return Field_Registry::get_flat_to_grouped_mapping();
	}
}
