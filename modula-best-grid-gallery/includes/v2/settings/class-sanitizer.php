<?php

/**
 * Modula v2 settings sanitizer.
 * Sanitizes grouped settings array using schema types. Extensions can hook per-group.
 *
 * @package Modula
 */

namespace Modula\V2\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sanitizer
 */
class Sanitizer {


	/**
	 * Sanitize a full grouped settings array (schema v2).
	 *
	 * @param array<string, array<string, mixed>> $grouped Raw grouped settings.
	 * @return array<string, array<string, mixed>> Sanitized grouped settings.
	 */
	public static function sanitize_grouped( array $grouped ) {
		Adapter::normalize_pagination_modes( $grouped );
		$grouped = self::migrate_customizations_style_to_style_custom_css( $grouped );
		$schema  = Registry::get_schema();
		$out     = array();
		$seen    = array();

		/*
		 * Walk schema-defined groups first (even when missing from stored v2 JSON) so PATCH responses
		 * always include e.g. `general` with `randomFactor`. Previously only groups present in `$grouped`
		 * were emitted; a DB blob with only `polaroid` caused the editor to lose other groups on reset.
		 */
		foreach ( $schema as $group => $group_def ) {
			if ( ! is_string( $group ) || '' === $group || ! is_array( $group_def ) ) {
				continue;
			}
			$keys = isset( $grouped[ $group ] ) && is_array( $grouped[ $group ] ) ? $grouped[ $group ] : array();
			/**
			 * Filter: custom sanitization for one group. Return sanitized array for that group.
			 * If not used, default sanitization by schema type is applied.
			 *
			 * @param array<string, mixed>|null $sanitized Sanitized group data, or null to use default.
			 * @param array<string, mixed>      $keys      Raw group data.
			 * @param string                    $group     Group name.
			 */
			$custom = apply_filters( 'modula_v2_sanitize_group_' . $group, null, $keys, $group );
			if ( is_array( $custom ) ) {
				$out[ $group ] = $custom;
			} else {
				$out[ $group ] = self::sanitize_group( $keys, $group_def, $group );
			}
			$seen[ $group ] = true;
		}

		foreach ( $grouped as $group => $keys ) {
			if ( isset( $seen[ $group ] ) || ! is_array( $keys ) ) {
				continue;
			}
			$custom = apply_filters( 'modula_v2_sanitize_group_' . $group, null, $keys, $group );
			if ( is_array( $custom ) ) {
				$out[ $group ] = $custom;
				continue;
			}
			$out[ $group ] = self::sanitize_group( $keys, array(), $group );
		}

		self::sync_social_enable_from_networks( $out );
		self::hydrate_loading_effects_enables_in_grouped( $out );

		return $out;
	}

	/**
	 * Hydrate loadingEffects.enable* from classic numerics after schema defaults fill Off.
	 *
	 * Classic never stored enable flags. Sanitizer emits schema default false for missing
	 * keys, which would hide Amount and skip motion even when loadedScale (etc.) is active.
	 * Off + non-neutral numeric means the flag was never authored (authored Off resets the
	 * numeric). Mutates $grouped in place.
	 *
	 * @param array<string, array<string, mixed>> $grouped Sanitized grouped settings.
	 */
	private static function hydrate_loading_effects_enables_in_grouped( array &$grouped ) {
		if ( ! isset( $grouped['loadingEffects'] ) || ! is_array( $grouped['loadingEffects'] ) ) {
			$grouped['loadingEffects'] = array();
		}
		self::hydrate_loading_effects_enables( $grouped['loadingEffects'] );
	}

	/**
	 * Hydrate enableScale / enableRotate / enableSlide from loaded* numerics.
	 *
	 * Public for CLI seam tests. Mutates $loading in place.
	 *
	 * @param array<string, mixed> $loading loadingEffects group.
	 */
	public static function hydrate_loading_effects_enables( array &$loading ) {
		$scale  = isset( $loading['loadedScale'] ) && is_numeric( $loading['loadedScale'] )
			? (int) $loading['loadedScale']
			: 100;
		$rotate = isset( $loading['loadedRotate'] ) && is_numeric( $loading['loadedRotate'] )
			? (int) $loading['loadedRotate']
			: 0;
		$h_slide = isset( $loading['loadedHSlide'] ) && is_numeric( $loading['loadedHSlide'] )
			? (int) $loading['loadedHSlide']
			: 0;
		$v_slide = isset( $loading['loadedVSlide'] ) && is_numeric( $loading['loadedVSlide'] )
			? (int) $loading['loadedVSlide']
			: 0;

		if ( self::should_hydrate_loading_effect_enable( $loading, 'enableScale' ) ) {
			$loading['enableScale'] = ( 100 !== $scale );
		}
		if ( self::should_hydrate_loading_effect_enable( $loading, 'enableRotate' ) ) {
			$loading['enableRotate'] = ( 0 !== $rotate );
		}
		if ( self::should_hydrate_loading_effect_enable( $loading, 'enableSlide' ) ) {
			$loading['enableSlide'] = ( 0 !== $h_slide || 0 !== $v_slide );
		}
	}

	/**
	 * @param array<string, mixed> $loading loadingEffects group.
	 * @param string               $key     enableScale|enableRotate|enableSlide.
	 * @return bool
	 */
	private static function should_hydrate_loading_effect_enable( array $loading, $key ) {
		if ( ! array_key_exists( $key, $loading ) ) {
			return true;
		}
		$flag = $loading[ $key ];
		if ( null === $flag || '' === $flag ) {
			return true;
		}
		return false === $flag || 0 === $flag || '0' === $flag;
	}

	/**
	 * Keep social.enableSocial in sync with any enabled network (editor no longer exposes a master toggle).
	 *
	 * @param array<string, array<string, mixed>> $grouped Sanitized grouped settings (mutated).
	 */
	private static function sync_social_enable_from_networks( array &$grouped ) {
		if ( ! isset( $grouped['social'] ) || ! is_array( $grouped['social'] ) ) {
			$grouped['social'] = array();
		}
		$networks = array(
			'enableTwitter',
			'enableFacebook',
			'enableWhatsapp',
			'enableLinkedin',
			'enablePinterest',
			'enableEmail',
		);
		$any      = false;
		foreach ( $networks as $key ) {
			if ( ! empty( $grouped['social'][ $key ] ) ) {
				$any = true;
				break;
			}
		}
		$grouped['social']['enableSocial'] = $any;
	}

	/**
	 * Legacy grouped key customizations.style → style.customCss (Layout → Style in the editor).
	 *
	 * @param array<string, array<string, mixed>> $grouped Raw grouped settings.
	 * @return array<string, array<string, mixed>>
	 */
	private static function migrate_customizations_style_to_style_custom_css( array $grouped ) {
		if ( ! isset( $grouped['customizations'] ) || ! is_array( $grouped['customizations'] ) ) {
			return $grouped;
		}
		$cust = $grouped['customizations'];
		if ( ! array_key_exists( 'style', $cust ) ) {
			return $grouped;
		}
		$legacy = $cust['style'];
		if ( ! is_string( $legacy ) || '' === $legacy ) {
			unset( $grouped['customizations']['style'] );
			if ( array() === $grouped['customizations'] ) {
				unset( $grouped['customizations'] );
			}
			return $grouped;
		}
		if ( ! isset( $grouped['style'] ) || ! is_array( $grouped['style'] ) ) {
			$grouped['style'] = array();
		}
		if ( ! array_key_exists( 'customCss', $grouped['style'] ) || '' === (string) $grouped['style']['customCss'] ) {
			$grouped['style']['customCss'] = $legacy;
		}
		unset( $grouped['customizations']['style'] );
		if ( array() === $grouped['customizations'] ) {
			unset( $grouped['customizations'] );
		}
		return $grouped;
	}

	/**
	 * Sanitize one group's keys using schema definitions.
	 *
	 * @param array<string, mixed> $keys      Raw key => value.
	 * @param array                $group_def Schema segment for this group (key => def).
	 * @param string               $group    Group name (for filter).
	 * @return array<string, mixed>
	 */
	private static function sanitize_group( array $keys, array $group_def, $group ) {
	 // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- $group for filter context
		if ( 'hover' === $group ) {
			unset( $keys['effect'] );
			if ( isset( $keys['builder'] ) && is_array( $keys['builder'] ) ) {
				$b = &$keys['builder'];
				if ( ! isset( $b['cardTreatment'] ) && isset( $b['cardtreatment'] ) ) {
					$b['cardTreatment'] = $b['cardtreatment'];
				}
				$ct = isset( $b['cardTreatment'] ) ? sanitize_key( (string) $b['cardTreatment'] ) : '';
				if ( 'dim' === $ct ) {
					$b['cardTreatment'] = 'none';
					$b['dimOverlay']    = true;
				}
			}
		}
		if ( 'lightbox' === $group ) {
			$keys = self::migrate_lightbox_legacy_keys( $keys );
		}
		if ( 'slider' === $group ) {
			foreach ( array( 'imageDimensions', 'syncingNavImageDimensions' ) as $dim_key ) {
				if ( array_key_exists( $dim_key, $keys ) ) {
					$keys[ $dim_key ] = Adapter::normalize_width_height_object( $keys[ $dim_key ] );
				}
			}
		}
		if ( 'layout' === $group && array_key_exists( 'gridImageDimensions', $keys ) ) {
			$keys['gridImageDimensions'] = Adapter::normalize_width_height_object( $keys['gridImageDimensions'] );
		}
		/*
		 * Emit every schema-defined key for this group (use default when missing) so PATCH responses
		 * and stored v2 JSON stay complete. Previously only keys present in $keys were returned;
		 * a partial merge (e.g. polaroid-only PATCH) then dropped keys like general.randomFactor,
		 * and the editor reset them to schema defaults (e.g. 50) after save.
		 */
		$result = array();
		foreach ( $group_def as $key => $def ) {
			if ( ! is_array( $def ) ) {
				continue;
			}
			$value          = array_key_exists( $key, $keys )
				? $keys[ $key ]
				: ( array_key_exists( 'default', $def ) ? $def['default'] : null );
			$type           = isset( $def['type'] ) ? $def['type'] : 'string';
			$result[ $key ] = self::sanitize_value(
				$value,
				$type,
				isset( $def['enum'] ) ? $def['enum'] : null,
				array_key_exists( 'default', $def ) ? $def['default'] : null,
				$def
			);
		}
		/* Unknown keys (e.g. editorPresentationOnly stubs) are dropped when the group has a schema. */
		if ( array() === $group_def ) {
			foreach ( $keys as $key => $value ) {
				if ( array_key_exists( $key, $result ) ) {
					continue;
				}
				$result[ $key ] = self::sanitize_value( $value, 'string', null, null, array() );
			}
		}
		if ( 'hover' === $group && isset( $result['builder'] ) && is_array( $result['builder'] ) ) {
			$result['builder'] = self::normalize_hover_builder( $result['builder'] );
		}
		if ( 'hover' === $group ) {
			$result = self::sync_hover_dim_overlay( $result );
			$result = self::sync_hover_color_opacity( $result );
		}
		return $result;
	}

	/**
	 * Normalize composable hover builder (positions + animation settings).
	 *
	 * @param array<string, mixed> $builder Sanitized builder object.
	 * @return array<string, mixed>
	 */
	private static function normalize_hover_builder( array $builder ) {
		/*
		 * Drop legacy keys produced by older sanitizer versions (sanitize_key lowercased property names).
		 */
		foreach ( array( 'slotorder', 'slotpositions', 'cardtreatment', 'graphicelement', 'graphicvisibility', 'titleenter', 'captionenter', 'socialenter', 'titlevisibility', 'captionvisibility', 'socialvisibility', 'dimoverlay', 'enterdurationms', 'enterdelayms', 'enterstaggerms', 'cardenterdurationms', 'cardenterdelayms', 'titleenterdurationms', 'captionenterdurationms', 'socialenterdurationms', 'titleenterdelayms', 'captionenterdelayms', 'socialenterdelayms', 'titleenterstaggerms', 'captionenterstaggerms', 'socialenterstaggerms', 'sourcepresetid' ) as $legacy ) {
			unset( $builder[ $legacy ] );
		}
		$source_preset             = isset( $builder['sourcePresetId'] ) ? sanitize_key( (string) $builder['sourcePresetId'] ) : '';
		$builder['sourcePresetId'] = $source_preset;
		$ct                        = isset( $builder['cardTreatment'] ) ? sanitize_key( (string) $builder['cardTreatment'] ) : '';
		if ( 'dim' === $ct ) {
			$builder['cardTreatment'] = 'none';
			$builder['dimOverlay']    = true;
		}
		$allowed_graphics             = array( 'none', 'frame', 'diamond' );
		$graphic                      = isset( $builder['graphicElement'] ) ? sanitize_key( (string) $builder['graphicElement'] ) : 'none';
		$builder['graphicElement']    = in_array( $graphic, $allowed_graphics, true ) ? $graphic : 'none';
		$builder['graphicVisibility'] = ( isset( $builder['graphicVisibility'] ) && 'always' === sanitize_key( (string) $builder['graphicVisibility'] ) ) ? 'always' : 'on-hover';
		$allowed_visibility           = array( 'on-hover', 'always', 'hide-on-hover', 'hidden' );
		foreach ( array( 'titleVisibility', 'captionVisibility', 'socialVisibility' ) as $v_key ) {
			$visibility        = isset( $builder[ $v_key ] ) ? sanitize_key( (string) $builder[ $v_key ] ) : 'on-hover';
			$builder[ $v_key ] = in_array( $visibility, $allowed_visibility, true ) ? $visibility : 'on-hover';
		}
		$defaults                       = \Modula\V2\Settings\Adapter::default_hover_builder();
		$card_duration                  = isset( $builder['cardEnterDurationMs'] )
			? absint( $builder['cardEnterDurationMs'] )
			: absint( $defaults['cardEnterDurationMs'] );
		$card_delay                     = isset( $builder['cardEnterDelayMs'] )
			? absint( $builder['cardEnterDelayMs'] )
			: absint( $defaults['cardEnterDelayMs'] );
		$builder['cardEnterDurationMs'] = min( 1200, max( 120, $card_duration ) );
		$builder['cardEnterDelayMs']    = min( 600, max( 0, $card_delay ) );
		foreach ( array( 'title', 'caption', 'social' ) as $slot ) {
			$duration_key = $slot . 'EnterDurationMs';
			$delay_key    = $slot . 'EnterDelayMs';
			$stagger_key  = $slot . 'EnterStaggerMs';

			$duration = isset( $builder[ $duration_key ] )
				? absint( $builder[ $duration_key ] )
				: absint( $defaults[ $duration_key ] );
			$delay    = isset( $builder[ $delay_key ] )
				? absint( $builder[ $delay_key ] )
				: absint( $defaults[ $delay_key ] );
			$stagger  = isset( $builder[ $stagger_key ] )
				? absint( $builder[ $stagger_key ] )
				: absint( $defaults[ $stagger_key ] );

			$builder[ $duration_key ] = min( 1200, max( 120, $duration ) );
			$builder[ $delay_key ]    = min( 600, max( 0, $delay ) );
			$builder[ $stagger_key ]  = min( 300, max( 0, $stagger ) );
		}
		return self::normalize_hover_builder_slot_positions( $builder );
	}

	/**
	 * Ensure hover.builder.slotPositions has title/caption/social with x,y in 0–100.
	 *
	 * @param array<string, mixed> $builder Builder array.
	 * @return array<string, mixed>
	 */
	private static function normalize_hover_builder_slot_positions( array $builder ) {
		$defaults = array(
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
		);
		$raw      = array();
		if ( isset( $builder['slotPositions'] ) && is_array( $builder['slotPositions'] ) ) {
			$raw = $builder['slotPositions'];
		} elseif ( isset( $builder['slotpositions'] ) && is_array( $builder['slotpositions'] ) ) {
			$raw = $builder['slotpositions'];
		}
		$out = array();
		foreach ( $defaults as $key => $def ) {
			$cell        = isset( $raw[ $key ] ) && is_array( $raw[ $key ] ) ? $raw[ $key ] : array();
			$x           = isset( $cell['x'] ) ? absint( $cell['x'] ) : $def['x'];
			$y           = isset( $cell['y'] ) ? absint( $cell['y'] ) : $def['y'];
			$out[ $key ] = array(
				'x' => min( 100, max( 0, $x ) ),
				'y' => min( 100, max( 0, $y ) ),
			);
		}
		$builder['slotPositions'] = $out;
		return $builder;
	}

	/**
	 * Keep sidebar `dimOverlay` and builder `dimOverlay` in sync.
	 *
	 * @param array<string, mixed> $hover Sanitized hover group.
	 * @return array<string, mixed>
	 */
	private static function sync_hover_dim_overlay( array $hover ) {
		$dim = array_key_exists( 'dimOverlay', $hover ) ? (bool) $hover['dimOverlay'] : null;
		if ( isset( $hover['builder'] ) && is_array( $hover['builder'] ) ) {
			if ( null !== $dim ) {
				$hover['builder']['dimOverlay'] = $dim;
			} elseif ( array_key_exists( 'dimOverlay', $hover['builder'] ) ) {
				$hover['dimOverlay'] = (bool) $hover['builder']['dimOverlay'];
			} else {
				$hover['dimOverlay']            = false;
				$hover['builder']['dimOverlay'] = false;
			}
		} elseif ( null !== $dim ) {
			$hover['dimOverlay'] = $dim;
		}
		return $hover;
	}

	/**
	 * Keep Dim color / opacity in sync.
	 *
	 * - rgba / hex-with-alpha → derive `hoverOpacity` from alpha.
	 * - opaque hex / `rgb()` + `hoverOpacity` → rewrite color as rgba (alpha from opacity).
	 *
	 * @param array<string, mixed> $hover Sanitized hover group.
	 * @return array<string, mixed>
	 */
	private static function sync_hover_color_opacity( array $hover ) {
		if ( ! isset( $hover['hoverColor'] ) || ! is_string( $hover['hoverColor'] ) ) {
			return $hover;
		}
		$parsed = self::parse_css_color( $hover['hoverColor'] );
		if ( null === $parsed ) {
			return $hover;
		}
		if ( ! empty( $parsed['hasAlpha'] ) ) {
			$hover['hoverOpacity'] = (int) min( 100, max( 0, (int) round( $parsed['a'] * 100 ) ) );
			return $hover;
		}
		if ( ! isset( $hover['hoverOpacity'] ) || ! is_numeric( $hover['hoverOpacity'] ) ) {
			return $hover;
		}
		$opacity               = (int) min( 100, max( 0, (int) round( (float) $hover['hoverOpacity'] ) ) );
		$hover['hoverOpacity'] = $opacity;
		$hover['hoverColor']   = self::format_rgba_color(
			$parsed['r'],
			$parsed['g'],
			$parsed['b'],
			$opacity / 100
		);
		return $hover;
	}

	/**
	 * Compact Modula-style rgba string (`rgba(0,0,0,.5)`).
	 *
	 * @param int   $r Red 0–255.
	 * @param int   $g Green 0–255.
	 * @param int   $b Blue 0–255.
	 * @param float $a Alpha 0–1.
	 * @return string
	 */
	private static function format_rgba_color( int $r, int $g, int $b, float $a ) {
		$a = max( 0.0, min( 1.0, $a ) );
		$a = round( $a * 1000 ) / 1000;
		if ( 0.0 === $a ) {
			$alpha = '0';
		} elseif ( 1.0 === $a ) {
			$alpha = '1';
		} else {
			$alpha = rtrim( rtrim( sprintf( '%.3f', $a ), '0' ), '.' );
			if ( 0 === strpos( $alpha, '0.' ) ) {
				$alpha = substr( $alpha, 1 );
			}
		}
		return sprintf( 'rgba(%d,%d,%d,%s)', $r, $g, $b, $alpha );
	}

	/**
	 * Parse hex or rgba/rgb into channels.
	 *
	 * @param string $raw Color string.
	 * @return array{r:int,g:int,b:int,a:float,hasAlpha:bool}|null
	 */
	private static function parse_css_color( string $raw ) {
		$value = trim( $raw );
		if ( '' === $value ) {
			return null;
		}
		if ( preg_match( '/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $value, $m ) ) {
			$h   = $m[1];
			$len = strlen( $h );
			if ( 3 === $len || 4 === $len ) {
				return array(
					'r'        => (int) hexdec( $h[0] . $h[0] ),
					'g'        => (int) hexdec( $h[1] . $h[1] ),
					'b'        => (int) hexdec( $h[2] . $h[2] ),
					'a'        => 4 === $len ? (float) ( hexdec( $h[3] . $h[3] ) / 255 ) : 1.0,
					'hasAlpha' => 4 === $len,
				);
			}
			return array(
				'r'        => (int) hexdec( substr( $h, 0, 2 ) ),
				'g'        => (int) hexdec( substr( $h, 2, 2 ) ),
				'b'        => (int) hexdec( substr( $h, 4, 2 ) ),
				'a'        => 8 === $len ? (float) ( hexdec( substr( $h, 6, 2 ) ) / 255 ) : 1.0,
				'hasAlpha' => 8 === $len,
			);
		}
		if ( preg_match( '/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i', $value, $m ) ) {
			$has_alpha = isset( $m[4] );
			$a         = $has_alpha ? (float) $m[4] : 1.0;
			$a         = max( 0.0, min( 1.0, $a ) );
			return array(
				'r'        => max( 0, min( 255, (int) $m[1] ) ),
				'g'        => max( 0, min( 255, (int) $m[2] ) ),
				'b'        => max( 0, min( 255, (int) $m[3] ) ),
				'a'        => $a,
				'hasAlpha' => $has_alpha,
			);
		}
		return null;
	}

	/**
	 * Map renamed / legacy lightbox keys before schema validation.
	 *
	 * @param array<string, mixed> $keys Raw lightbox group.
	 * @return array<string, mixed>
	 */
	private static function migrate_lightbox_legacy_keys( array $keys ) {
		if ( isset( $keys['thumbsAutoStart'] ) && ! array_key_exists( 'showThumbnails', $keys ) ) {
			$keys['showThumbnails'] = $keys['thumbsAutoStart'];
		}
		unset( $keys['thumbsAutoStart'] );
		// Touch navigation is always on in v2 (control removed from the settings UI).
		$keys['touch'] = true;
		return $keys;
	}

	/**
	 * Sanitize a single value by type.
	 *
	 * @param mixed      $value          Raw value.
	 * @param string     $type           One of: string, integer, boolean, array, object.
	 * @param array|null $allowed_values Allowed values (for string).
	 * @param mixed      $fallback       Default if invalid.
	 * @param array      $def            Full definition (minimum, maximum, etc.).
	 * @return mixed
	 */
	private static function sanitize_value( $value, $type, $allowed_values = null, $fallback = null, array $def = array() ) {
		switch ( $type ) {
			case 'boolean':
				$out = rest_sanitize_boolean( $value );
				return $out;
			case 'integer':
			case 'number':
				if ( ! is_numeric( $value ) ) {
					$out = is_scalar( $fallback ) ? (int) $fallback : 0;
				} else {
					$out = (int) $value;
				}
				if ( isset( $def['minimum'] ) && $out < (int) $def['minimum'] ) {
					$out = (int) $def['minimum'];
				}
				if ( isset( $def['maximum'] ) && $out > (int) $def['maximum'] ) {
					$out = (int) $def['maximum'];
				}
				return $out;
			case 'array':
				if ( ! is_array( $value ) ) {
					return is_array( $fallback ) ? $fallback : array();
				}
				$item_type = isset( $def['items']['type'] ) ? $def['items']['type'] : 'integer';
				$item_def  = isset( $def['items'] ) && is_array( $def['items'] ) ? $def['items'] : array();
				$item_enum = isset( $item_def['enum'] ) && is_array( $item_def['enum'] ) ? $item_def['enum'] : null;
				$out       = array();
				foreach ( $value as $v ) {
					$one = self::sanitize_value( $v, $item_type, $item_enum, null, $item_def );
					if ( 'string' === $item_type && null !== $item_enum && is_array( $item_enum ) && ! in_array( $one, $item_enum, true ) ) {
						continue;
					}
					$out[] = $one;
				}
				if ( array() === $out && is_array( $fallback ) ) {
					return $fallback;
				}
				return $out;
			case 'object':
				if ( ! is_array( $value ) && ! is_object( $value ) ) {
					return is_array( $fallback ) ? $fallback : array();
				}
				$arr = (array) $value;
				if ( isset( $def['properties'] ) && is_array( $def['properties'] ) ) {
					$out = array();
					foreach ( $def['properties'] as $pk => $pdef ) {
						if ( ! is_array( $pdef ) ) {
							continue;
						}
						/*
						 * Use schema property names verbatim (camelCase). Do not use sanitize_key() here:
						 * it lowercases keys (e.g. slotOrder → slotorder), so hover.builder.slotPositions
						 * was never read by normalize_hover_builder() and positions reset after save.
						 */
						$pk_str = (string) $pk;
						$pv     = null;
						if ( array_key_exists( $pk_str, $arr ) ) {
							$pv = $arr[ $pk_str ];
						} else {
							$pk_lower = strtolower( $pk_str );
							if ( $pk_lower !== $pk_str && array_key_exists( $pk_lower, $arr ) ) {
								$pv = $arr[ $pk_lower ];
							} else {
								$pv = array_key_exists( 'default', $pdef ) ? $pdef['default'] : null;
							}
						}
						$ptype          = isset( $pdef['type'] ) ? $pdef['type'] : 'string';
						$penum          = isset( $pdef['enum'] ) ? $pdef['enum'] : null;
						$pdeflt         = array_key_exists( 'default', $pdef ) ? $pdef['default'] : null;
						$out[ $pk_str ] = self::sanitize_value( $pv, $ptype, $penum, $pdeflt, $pdef );
					}
					return $out;
				}
				$out = array();
				foreach ( $arr as $k => $v ) {
					$out[ sanitize_key( $k ) ] = is_numeric( $v ) ? absint( $v ) : sanitize_text_field( (string) $v );
				}
				return $out;
			case 'string':
			default:
				$out = is_scalar( $value ) ? sanitize_text_field( (string) $value ) : ( is_scalar( $fallback ) ? (string) $fallback : '' );
				if ( null !== $allowed_values && is_array( $allowed_values ) && ! in_array( $out, $allowed_values, true ) ) {
					$out = is_scalar( $fallback ) ? (string) $fallback : ( count( $allowed_values ) > 0 ? (string) $allowed_values[0] : '' );
				}
				return $out;
		}
	}

	/**
	 * Sanitize color string (rgba/hex). Use when schema says "string" but value is a color.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public static function sanitize_color( $value ) {
		if ( class_exists( 'Modula_Helper' ) && method_exists( 'Modula_Helper', 'sanitize_rgba_colour' ) ) {
			return \Modula_Helper::sanitize_rgba_colour( wp_unslash( $value ) );
		}
		return sanitize_text_field( wp_unslash( $value ) );
	}
}
