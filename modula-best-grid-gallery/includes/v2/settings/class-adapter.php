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
	 * Hover effect family for a classic effect slug (approximate builder starting point).
	 *
	 * @param string $slug Classic effect slug.
	 * @return string Family id: none|reveal-center|title-only|social-forward|under|grayscale|tilt|fallback.
	 */
	public static function hover_effect_family_for_slug( $slug ) {
		$slug = is_string( $slug ) ? sanitize_key( $slug ) : '';
		if ( '' === $slug || 'none' === $slug ) {
			return 'none';
		}
		if ( 'under' === $slug ) {
			return 'under';
		}
		if ( 'greyscale' === $slug || false !== strpos( $slug, 'greyscale' ) ) {
			return 'grayscale';
		}
		if ( preg_match( '/^tilt/', $slug ) ) {
			return 'tilt';
		}
		if ( 'catinelle' === $slug ) {
			return 'social-forward';
		}
		$title_only = array(
			'quiet',
			'curtain',
			'appear',
			'seemo',
			'comodo',
			'honey',
			'hera',
			'winston',
			'terry',
			'phoebe',
		);
		if ( in_array( $slug, $title_only, true ) ) {
			return 'title-only';
		}
		$known_reveal = array(
			'pufrobo',
			'lily',
			'sadie',
			'layla',
			'zoe',
			'oscar',
			'marley',
			'ruby',
			'roxy',
			'bubba',
			'dexter',
			'sarah',
			'chico',
			'milo',
			'julia',
			'selena',
			'ming',
			'fluid-up',
			'hide',
			'reflex',
			'lens',
			'crafty',
			'apollo',
			'steve',
			'jazz',
			'lexi',
			'duke',
			'centered-bottom',
		);
		if ( in_array( $slug, $known_reveal, true ) ) {
			return 'reveal-center';
		}
		return 'fallback';
	}

	/**
	 * Slot paint flags for a classic effect slug.
	 *
	 * Mirrors {@see \Modula_Helper::hover_effects_elements()} title/description/social.
	 *
	 * @param string $slug Classic effect slug.
	 * @return array{title: bool, caption: bool, social: bool}
	 */
	public static function legacy_hover_slot_paint( $slug ) {
		$slug = is_string( $slug ) ? sanitize_key( $slug ) : '';
		if ( class_exists( '\Modula_Helper' ) ) {
			$el = \Modula_Helper::hover_effects_elements( $slug );
			return array(
				'title'   => ! empty( $el['title'] ),
				'caption' => ! empty( $el['description'] ),
				'social'  => ! empty( $el['social'] ),
			);
		}
		return array(
			'title'   => false,
			'caption' => false,
			'social'  => false,
		);
	}

	/**
	 * Family → builder shape (before classic slot paint / sourcePresetId stamp).
	 *
	 * @param string $family Family id from {@see hover_effect_family_for_slug()}.
	 * @return array{builder: array<string, mixed>, hover: array{hoverColor: string, hoverOpacity: int}}
	 */
	public static function hover_builder_template_for_family( $family ) {
		$family = is_string( $family ) ? sanitize_key( $family ) : 'fallback';
		$base   = self::default_hover_builder();
		$hover  = array(
			'hoverColor'   => 'rgba(17,17,17,.46)',
			'hoverOpacity' => 46,
		);

		switch ( $family ) {
			case 'none':
				$base['cardTreatment']          = 'none';
				$base['dimOverlay']             = false;
				$base['titleEnter']             = 'none';
				$base['captionEnter']           = 'none';
				$base['socialEnter']            = 'none';
				$base['titleVisibility']        = 'hidden';
				$base['captionVisibility']      = 'hidden';
				$base['socialVisibility']       = 'hidden';
				$base['cardEnterDurationMs']    = 180;
				$base['titleEnterDurationMs']   = 180;
				$base['captionEnterDurationMs'] = 180;
				$base['socialEnterDurationMs']  = 180;
				$base['titleEnterStaggerMs']    = 0;
				$base['captionEnterStaggerMs']  = 0;
				$base['socialEnterStaggerMs']   = 0;
				$hover                          = array(
					'hoverColor'   => 'rgba(0,0,0,0)',
					'hoverOpacity' => 0,
				);
				break;
			case 'title-only':
				$base['cardTreatment']     = 'zoom';
				$base['dimOverlay']        = true;
				$base['titleEnter']        = 'fade';
				$base['captionEnter']      = 'none';
				$base['socialEnter']       = 'fade';
				$base['titleVisibility']   = 'on-hover';
				$base['captionVisibility'] = 'hidden';
				$base['socialVisibility']  = 'on-hover';
				$base['slotPositions']     = array(
					'title'   => array(
						'x' => 50,
						'y' => 28,
					),
					'caption' => array(
						'x' => 50,
						'y' => 50,
					),
					'social'  => array(
						'x' => 50,
						'y' => 82,
					),
				);
				break;
			case 'social-forward':
				$base['cardTreatment']          = 'none';
				$base['dimOverlay']             = true;
				$base['titleEnter']             = 'slide-down';
				$base['captionEnter']           = 'slide-right';
				$base['socialEnter']            = 'slide-up';
				$base['titleVisibility']        = 'on-hover';
				$base['captionVisibility']      = 'on-hover';
				$base['socialVisibility']       = 'on-hover';
				$base['cardEnterDurationMs']    = 300;
				$base['titleEnterDurationMs']   = 300;
				$base['captionEnterDurationMs'] = 300;
				$base['socialEnterDurationMs']  = 300;
				$base['titleEnterDelayMs']      = 25;
				$base['captionEnterDelayMs']    = 25;
				$base['socialEnterDelayMs']     = 25;
				$base['titleEnterStaggerMs']    = 55;
				$base['captionEnterStaggerMs']  = 55;
				$base['socialEnterStaggerMs']   = 55;
				$base['slotPositions']          = array(
					'title'   => array(
						'x' => 50,
						'y' => 20,
					),
					'caption' => array(
						'x' => 50,
						'y' => 36,
					),
					'social'  => array(
						'x' => 50,
						'y' => 88,
					),
				);
				$hover                          = array(
					'hoverColor'   => 'rgba(11,18,32,.56)',
					'hoverOpacity' => 56,
				);
				break;
			case 'under':
				$base['cardTreatment']     = 'none';
				$base['dimOverlay']        = false;
				$base['titleEnter']        = 'none';
				$base['captionEnter']      = 'none';
				$base['socialEnter']       = 'none';
				$base['titleVisibility']   = 'hidden';
				$base['captionVisibility'] = 'hidden';
				$base['socialVisibility']  = 'hidden';
				$hover                     = array(
					'hoverColor'   => 'rgba(0,0,0,0)',
					'hoverOpacity' => 0,
				);
				break;
			case 'grayscale':
				$base['cardTreatment']     = 'grayscale';
				$base['dimOverlay']        = true;
				$base['titleEnter']        = 'fade';
				$base['captionEnter']      = 'fade';
				$base['socialEnter']       = 'fade';
				$base['titleVisibility']   = 'on-hover';
				$base['captionVisibility'] = 'on-hover';
				$base['socialVisibility']  = 'on-hover';
				$base['slotPositions']     = array(
					'title'   => array(
						'x' => 50,
						'y' => 24,
					),
					'caption' => array(
						'x' => 50,
						'y' => 36,
					),
					'social'  => array(
						'x' => 50,
						'y' => 78,
					),
				);
				break;
			case 'tilt':
				$base['cardTreatment']          = 'lift';
				$base['dimOverlay']             = true;
				$base['titleEnter']             = 'slide-up';
				$base['captionEnter']           = 'slide-up';
				$base['socialEnter']            = 'fade';
				$base['titleVisibility']        = 'on-hover';
				$base['captionVisibility']      = 'on-hover';
				$base['socialVisibility']       = 'on-hover';
				$base['cardEnterDurationMs']    = 320;
				$base['titleEnterDurationMs']   = 320;
				$base['captionEnterDurationMs'] = 320;
				$base['socialEnterDurationMs']  = 320;
				$base['slotPositions']          = array(
					'title'   => array(
						'x' => 50,
						'y' => 22,
					),
					'caption' => array(
						'x' => 50,
						'y' => 34,
					),
					'social'  => array(
						'x' => 50,
						'y' => 76,
					),
				);
				$hover                          = array(
					'hoverColor'   => 'rgba(15,23,42,.54)',
					'hoverOpacity' => 54,
				);
				break;
			case 'reveal-center':
			case 'fallback':
			default:
				$base['cardTreatment']         = 'zoom';
				$base['dimOverlay']            = true;
				$base['titleEnter']            = 'fade';
				$base['captionEnter']          = 'fade';
				$base['socialEnter']           = 'fade';
				$base['titleVisibility']       = 'on-hover';
				$base['captionVisibility']     = 'on-hover';
				$base['socialVisibility']      = 'on-hover';
				$base['titleEnterStaggerMs']   = 40;
				$base['captionEnterStaggerMs'] = 40;
				$base['socialEnterStaggerMs']  = 40;
				$base['slotPositions']         = array(
					'title'   => array(
						'x' => 50,
						'y' => 24,
					),
					'caption' => array(
						'x' => 50,
						'y' => 36,
					),
					'social'  => array(
						'x' => 50,
						'y' => 78,
					),
				);
				break;
		}

		return array(
			'builder' => $base,
			'hover'   => $hover,
		);
	}

	/**
	 * Map a legacy hover effect slug to an approximate Hover Effect Builder starting point.
	 *
	 * Stamps `sourcePresetId` as `legacy-{slug}` so ensure does not re-migrate.
	 *
	 * @param string $slug Legacy effect slug.
	 * @return array<string, mixed>
	 */
	public static function hover_builder_from_legacy_effect_slug( $slug ) {
		$slug   = is_string( $slug ) ? sanitize_key( $slug ) : '';
		$family = self::hover_effect_family_for_slug( $slug );
		$pack   = self::hover_builder_template_for_family( $family );
		$b      = $pack['builder'];

		if ( 'none' !== $family && 'under' !== $family ) {
			$paint                  = self::legacy_hover_slot_paint( $slug );
			$b['titleVisibility']   = $paint['title'] ? 'on-hover' : 'hidden';
			$b['captionVisibility'] = $paint['caption'] ? 'on-hover' : 'hidden';
			$b['socialVisibility']  = $paint['social'] ? 'on-hover' : 'hidden';
		}

		$stamp               = '' === $slug ? 'none' : $slug;
		$b['sourcePresetId'] = 'legacy-' . $stamp;
		return $b;
	}

	/**
	 * Family hover chrome defaults for migrate when flat has no color/opacity yet.
	 *
	 * @param string $slug Classic effect slug.
	 * @return array{hoverColor: string, hoverOpacity: int}
	 */
	public static function hover_chrome_from_legacy_effect_slug( $slug ) {
		$family = self::hover_effect_family_for_slug( $slug );
		$pack   = self::hover_builder_template_for_family( $family );
		return $pack['hover'];
	}

	/**
	 * Whether a hover builder document already owns hover (non-empty sourcePresetId).
	 *
	 * Empty sourcePresetId means “generic / needs legacy approximate migrate”.
	 *
	 * @param array<string, mixed>|null $builder Builder array.
	 * @return bool
	 */
	public static function hover_builder_has_source_stamp( $builder ) {
		if ( ! is_array( $builder ) ) {
			return false;
		}
		$source = isset( $builder['sourcePresetId'] ) ? sanitize_key( (string) $builder['sourcePresetId'] ) : '';
		return '' !== $source;
	}

	/**
	 * Ensure grouped.hover.builder exists (migrate from legacy flat `effect` when needed).
	 *
	 * Overwrites an existing builder only when `sourcePresetId` is empty (generic).
	 * Migrated builders stamp `legacy-{effect}` and are sticky thereafter.
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings (by ref).
	 * @param array<string, mixed>                $flat    Flat settings used for migration hints.
	 */
	private static function ensure_hover_builder( array &$grouped, array $flat ) {
		if ( ! isset( $grouped['hover'] ) || ! is_array( $grouped['hover'] ) ) {
			$grouped['hover'] = array();
		}
		$h       = &$grouped['hover'];
		$builder = ( isset( $h['builder'] ) && is_array( $h['builder'] ) ) ? $h['builder'] : null;

		if ( is_array( $builder ) && self::hover_builder_has_source_stamp( $builder ) ) {
			$defaults      = self::default_hover_builder();
			$has_positions = ( isset( $builder['slotPositions'] ) && is_array( $builder['slotPositions'] ) && count( $builder['slotPositions'] ) > 0 )
				|| ( isset( $builder['slotpositions'] ) && is_array( $builder['slotpositions'] ) && count( $builder['slotpositions'] ) > 0 );
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

		$effect = ( isset( $flat['effect'] ) && is_string( $flat['effect'] ) && '' !== $flat['effect'] )
			? $flat['effect']
			: '';
		if ( '' !== $effect ) {
			$h['builder'] = self::hover_builder_from_legacy_effect_slug( $effect );
			$chrome       = self::hover_chrome_from_legacy_effect_slug( $effect );
			if ( ! isset( $h['hoverColor'] ) || ! is_string( $h['hoverColor'] ) || '' === $h['hoverColor'] ) {
				$h['hoverColor'] = $chrome['hoverColor'];
			}
			if ( ! isset( $h['hoverOpacity'] ) || ! is_numeric( $h['hoverOpacity'] ) ) {
				$h['hoverOpacity'] = $chrome['hoverOpacity'];
			}
		} else {
			$h['builder'] = self::default_hover_builder();
		}
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
