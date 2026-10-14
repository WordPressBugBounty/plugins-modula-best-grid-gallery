<?php
/**
 * Hover Builder nested policy: five free presets stay writable; premium presets and
 * customization follow Compatible Pro. Effective configuration is authoritative.
 *
 * @package Modula
 */

namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Hover_Builder_Policy {
	public const FREE_PRESET_COUNT = 5;
	public const FEATURE           = 'hover-builder';

	/**
	 * @param array<int,array<string,mixed>> $blockers Existing blockers for the patch.
	 * @param mixed                          $value    Requested field value.
	 * @return array<int,array<string,mixed>>
	 */
	public static function append( array $blockers, string $path, $value ): array {
		if ( 'hover.builder' !== $path || ! is_array( $value ) ) {
			return $blockers;
		}
		if ( self::compatible_pro_ready() ) {
			return $blockers;
		}
		$matched = self::matching_preset_id( $value );
		if ( in_array( $matched, self::free_ids(), true ) ) {
			return $blockers;
		}
		$label = '' !== $matched ? $matched : 'customization';
		$added = Availability::for_requirement( self::requirement(), $path, $label );
		// Base-scope Availability labels Compatible Pro as modula-pro; this family names hover-builder.
		foreach ( $added as &$blocker ) {
			$blocker['feature'] = self::FEATURE;
		}
		unset( $blocker );
		return array_merge( $blockers, $added );
	}

	/**
	 * @return array<int,string>
	 */
	public static function free_ids(): array {
		return array_slice( array_keys( self::presets() ), 0, self::FREE_PRESET_COUNT );
	}

	/**
	 * Complete builder written by applying a catalog preset, including sourcePresetId.
	 *
	 * @return array<string,mixed>|null
	 */
	public static function applied_builder( string $id ): ?array {
		$presets = self::presets();
		if ( ! isset( $presets[ $id ] ) ) {
			return null;
		}
		$builder = self::fingerprint( $presets[ $id ] );
		$slots   = $builder['slotPositions'];
		unset( $builder['slotPositions'] );
		// Strict patch compare uses schema property order: sourcePresetId before slotPositions.
		$builder['sourcePresetId'] = $id;
		$builder['slotPositions']  = $slots;
		return $builder;
	}

	public static function matching_preset_id( array $builder ): string {
		$current = self::fingerprint( $builder );
		foreach ( self::presets() as $id => $preset ) {
			if ( $current === self::fingerprint( $preset ) ) {
				return $id;
			}
		}
		return '';
	}

	/**
	 * @return array{feature:string,scope:string}
	 */
	public static function requirement(): array {
		return array(
			'feature' => self::FEATURE,
			'scope'   => 'base',
		);
	}

	private static function compatible_pro_ready(): bool {
		return Field_Requirements::satisfied(
			array(
				'feature' => 'modula-pro',
				'scope'   => 'base',
			)
		);
	}

	/**
	 * @return array<string,mixed>
	 */
	private static function fingerprint( array $builder ): array {
		$slots = isset( $builder['slotPositions'] ) && is_array( $builder['slotPositions'] ) ? $builder['slotPositions'] : array();
		$coord = static function ( array $slots, string $slot, string $axis, int $fallback ): int {
			$raw = $slots[ $slot ][ $axis ] ?? null;
			$n   = is_numeric( $raw ) ? (int) round( (float) $raw ) : $fallback;
			return max( 0, min( 100, $n ) );
		};
		$clamp = static function ( $raw, int $min, int $max, int $fallback ): int {
			if ( ! is_numeric( $raw ) ) {
				return $fallback;
			}
			return max( $min, min( $max, (int) round( (float) $raw ) ) );
		};
		$enter = static function ( $raw, string $fallback ): string {
			return is_string( $raw ) && '' !== $raw ? $raw : $fallback;
		};
		return array(
			'cardTreatment'          => $enter( $builder['cardTreatment'] ?? null, 'none' ),
			'graphicElement'         => $enter( $builder['graphicElement'] ?? null, 'none' ),
			'graphicVisibility'      => ( isset( $builder['graphicVisibility'] ) && 'always' === $builder['graphicVisibility'] ) ? 'always' : 'on-hover',
			'dimOverlay'             => true === $builder['dimOverlay'] || 1 === $builder['dimOverlay'] || '1' === ( $builder['dimOverlay'] ?? null ),
			'titleEnter'             => $enter( $builder['titleEnter'] ?? null, 'fade' ),
			'captionEnter'           => $enter( $builder['captionEnter'] ?? null, 'fade' ),
			'socialEnter'            => $enter( $builder['socialEnter'] ?? null, 'fade' ),
			'titleVisibility'        => $enter( $builder['titleVisibility'] ?? null, 'on-hover' ),
			'captionVisibility'      => $enter( $builder['captionVisibility'] ?? null, 'on-hover' ),
			'socialVisibility'       => $enter( $builder['socialVisibility'] ?? null, 'on-hover' ),
			'cardEnterDurationMs'    => $clamp( $builder['cardEnterDurationMs'] ?? null, 120, 1200, 280 ),
			'cardEnterDelayMs'       => $clamp( $builder['cardEnterDelayMs'] ?? null, 0, 600, 0 ),
			'titleEnterDurationMs'   => $clamp( $builder['titleEnterDurationMs'] ?? null, 120, 1200, 280 ),
			'captionEnterDurationMs' => $clamp( $builder['captionEnterDurationMs'] ?? null, 120, 1200, 280 ),
			'socialEnterDurationMs'  => $clamp( $builder['socialEnterDurationMs'] ?? null, 120, 1200, 280 ),
			'titleEnterDelayMs'      => $clamp( $builder['titleEnterDelayMs'] ?? null, 0, 600, 0 ),
			'captionEnterDelayMs'    => $clamp( $builder['captionEnterDelayMs'] ?? null, 0, 600, 0 ),
			'socialEnterDelayMs'     => $clamp( $builder['socialEnterDelayMs'] ?? null, 0, 600, 0 ),
			'titleEnterStaggerMs'    => $clamp( $builder['titleEnterStaggerMs'] ?? null, 0, 300, 45 ),
			'captionEnterStaggerMs'  => $clamp( $builder['captionEnterStaggerMs'] ?? null, 0, 300, 45 ),
			'socialEnterStaggerMs'   => $clamp( $builder['socialEnterStaggerMs'] ?? null, 0, 300, 45 ),
			'slotPositions'          => array(
				'title'   => array(
					'x' => $coord( $slots, 'title', 'x', 50 ),
					'y' => $coord( $slots, 'title', 'y', 18 ),
				),
				'caption' => array(
					'x' => $coord( $slots, 'caption', 'x', 50 ),
					'y' => $coord( $slots, 'caption', 'y', 50 ),
				),
				'social'  => array(
					'x' => $coord( $slots, 'social', 'x', 50 ),
					'y' => $coord( $slots, 'social', 'y', 82 ),
				),
			),
		);
	}

	/**
	 * Catalog order matches the editor's HOVER_BUILDER_PRESETS list. The first five are free.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	private static function presets(): array {
		$slot = static function ( int $tx, int $ty, int $cx, int $cy, int $sx, int $sy ): array {
			return array(
				'title'   => array(
					'x' => $tx,
					'y' => $ty,
				),
				'caption' => array(
					'x' => $cx,
					'y' => $cy,
				),
				'social'  => array(
					'x' => $sx,
					'y' => $sy,
				),
			);
		};
		$row  = static function ( array $fields, array $slots ) {
			return array_merge(
				array(
					'graphicElement'    => 'none',
					'graphicVisibility' => 'on-hover',
				),
				$fields,
				array( 'slotPositions' => $slots )
			);
		};
		return array(
			'none'                   => $row(
				array(
					'cardTreatment'          => 'none',
					'dimOverlay'             => false,
					'titleEnter'             => 'none',
					'captionEnter'           => 'none',
					'socialEnter'            => 'none',
					'titleVisibility'        => 'hidden',
					'captionVisibility'      => 'hidden',
					'socialVisibility'       => 'hidden',
					'cardEnterDurationMs'    => 180,
					'cardEnterDelayMs'       => 0,
					'titleEnterDurationMs'   => 180,
					'captionEnterDurationMs' => 180,
					'socialEnterDurationMs'  => 180,
					'titleEnterDelayMs'      => 0,
					'captionEnterDelayMs'    => 0,
					'socialEnterDelayMs'     => 0,
					'titleEnterStaggerMs'    => 0,
					'captionEnterStaggerMs'  => 0,
					'socialEnterStaggerMs'   => 0,
				),
				$slot( 50, 18, 50, 50, 50, 82 )
			),
			'none-with-captions'     => $row(
				array(
					'cardTreatment'          => 'none',
					'dimOverlay'             => false,
					'titleEnter'             => 'none',
					'captionEnter'           => 'none',
					'socialEnter'            => 'none',
					'titleVisibility'        => 'always',
					'captionVisibility'      => 'always',
					'socialVisibility'       => 'always',
					'cardEnterDurationMs'    => 180,
					'cardEnterDelayMs'       => 0,
					'titleEnterDurationMs'   => 180,
					'captionEnterDurationMs' => 180,
					'socialEnterDurationMs'  => 180,
					'titleEnterDelayMs'      => 0,
					'captionEnterDelayMs'    => 0,
					'socialEnterDelayMs'     => 0,
					'titleEnterStaggerMs'    => 0,
					'captionEnterStaggerMs'  => 0,
					'socialEnterStaggerMs'   => 0,
				),
				$slot( 50, 18, 50, 30, 50, 82 )
			),
			'balanced-reveal'        => $row(
				array(
					'cardTreatment'          => 'zoom',
					'dimOverlay'             => true,
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
					'titleEnterStaggerMs'    => 40,
					'captionEnterStaggerMs'  => 40,
					'socialEnterStaggerMs'   => 40,
				),
				$slot( 50, 24, 50, 36, 50, 78 )
			),
			'portfolio-lift'         => $row(
				array(
					'cardTreatment'          => 'lift',
					'dimOverlay'             => true,
					'titleEnter'             => 'slide-up',
					'captionEnter'           => 'slide-up',
					'socialEnter'            => 'fade',
					'titleVisibility'        => 'on-hover',
					'captionVisibility'      => 'on-hover',
					'socialVisibility'       => 'on-hover',
					'cardEnterDurationMs'    => 320,
					'cardEnterDelayMs'       => 25,
					'titleEnterDurationMs'   => 320,
					'captionEnterDurationMs' => 320,
					'socialEnterDurationMs'  => 320,
					'titleEnterDelayMs'      => 25,
					'captionEnterDelayMs'    => 25,
					'socialEnterDelayMs'     => 25,
					'titleEnterStaggerMs'    => 55,
					'captionEnterStaggerMs'  => 55,
					'socialEnterStaggerMs'   => 55,
				),
				$slot( 50, 22, 50, 34, 50, 76 )
			),
			'center-hero'            => $row(
				array(
					'cardTreatment'          => 'zoom',
					'dimOverlay'             => true,
					'titleEnter'             => 'scale',
					'captionEnter'           => 'fade',
					'socialEnter'            => 'fade',
					'titleVisibility'        => 'on-hover',
					'captionVisibility'      => 'on-hover',
					'socialVisibility'       => 'on-hover',
					'cardEnterDurationMs'    => 360,
					'cardEnterDelayMs'       => 20,
					'titleEnterDurationMs'   => 360,
					'captionEnterDurationMs' => 360,
					'socialEnterDurationMs'  => 360,
					'titleEnterDelayMs'      => 20,
					'captionEnterDelayMs'    => 20,
					'socialEnterDelayMs'     => 20,
					'titleEnterStaggerMs'    => 60,
					'captionEnterStaggerMs'  => 60,
					'socialEnterStaggerMs'   => 60,
				),
				$slot( 50, 40, 50, 54, 50, 70 )
			),
			'caption-spotlight'      => $row(
				array(
					'cardTreatment'          => 'none',
					'dimOverlay'             => true,
					'titleEnter'             => 'blur-in',
					'captionEnter'           => 'slide-up',
					'socialEnter'            => 'fade',
					'titleVisibility'        => 'on-hover',
					'captionVisibility'      => 'on-hover',
					'socialVisibility'       => 'on-hover',
					'cardEnterDurationMs'    => 340,
					'cardEnterDelayMs'       => 40,
					'titleEnterDurationMs'   => 340,
					'captionEnterDurationMs' => 340,
					'socialEnterDurationMs'  => 340,
					'titleEnterDelayMs'      => 40,
					'captionEnterDelayMs'    => 40,
					'socialEnterDelayMs'     => 40,
					'titleEnterStaggerMs'    => 70,
					'captionEnterStaggerMs'  => 70,
					'socialEnterStaggerMs'   => 70,
				),
				$slot( 50, 56, 50, 70, 50, 86 )
			),
			'cinematic-dark'         => $row(
				array(
					'cardTreatment'          => 'lift',
					'dimOverlay'             => true,
					'titleEnter'             => 'blur-in',
					'captionEnter'           => 'slide-up',
					'socialEnter'            => 'slide-up',
					'titleVisibility'        => 'on-hover',
					'captionVisibility'      => 'on-hover',
					'socialVisibility'       => 'on-hover',
					'cardEnterDurationMs'    => 420,
					'cardEnterDelayMs'       => 50,
					'titleEnterDurationMs'   => 420,
					'captionEnterDurationMs' => 420,
					'socialEnterDurationMs'  => 420,
					'titleEnterDelayMs'      => 50,
					'captionEnterDelayMs'    => 50,
					'socialEnterDelayMs'     => 50,
					'titleEnterStaggerMs'    => 80,
					'captionEnterStaggerMs'  => 80,
					'socialEnterStaggerMs'   => 80,
				),
				$slot( 50, 60, 50, 74, 50, 88 )
			),
			'editorial-corner-left'  => $row(
				array(
					'cardTreatment'          => 'none',
					'dimOverlay'             => true,
					'titleEnter'             => 'slide-right',
					'captionEnter'           => 'slide-right',
					'socialEnter'            => 'fade',
					'titleVisibility'        => 'on-hover',
					'captionVisibility'      => 'on-hover',
					'socialVisibility'       => 'on-hover',
					'cardEnterDurationMs'    => 280,
					'cardEnterDelayMs'       => 10,
					'titleEnterDurationMs'   => 280,
					'captionEnterDurationMs' => 280,
					'socialEnterDurationMs'  => 280,
					'titleEnterDelayMs'      => 10,
					'captionEnterDelayMs'    => 10,
					'socialEnterDelayMs'     => 10,
					'titleEnterStaggerMs'    => 35,
					'captionEnterStaggerMs'  => 35,
					'socialEnterStaggerMs'   => 35,
				),
				$slot( 12, 16, 12, 30, 12, 46 )
			),
			'editorial-corner-right' => $row(
				array(
					'cardTreatment'          => 'none',
					'dimOverlay'             => true,
					'titleEnter'             => 'slide-left',
					'captionEnter'           => 'slide-left',
					'socialEnter'            => 'fade',
					'titleVisibility'        => 'on-hover',
					'captionVisibility'      => 'on-hover',
					'socialVisibility'       => 'on-hover',
					'cardEnterDurationMs'    => 280,
					'cardEnterDelayMs'       => 10,
					'titleEnterDurationMs'   => 280,
					'captionEnterDurationMs' => 280,
					'socialEnterDurationMs'  => 280,
					'titleEnterDelayMs'      => 10,
					'captionEnterDelayMs'    => 10,
					'socialEnterDelayMs'     => 10,
					'titleEnterStaggerMs'    => 35,
					'captionEnterStaggerMs'  => 35,
					'socialEnterStaggerMs'   => 35,
				),
				$slot( 88, 16, 88, 30, 88, 46 )
			),
			'monochrome-frame'       => $row(
				array(
					'cardTreatment'          => 'grayscale',
					'dimOverlay'             => true,
					'titleEnter'             => 'slide-up',
					'captionEnter'           => 'slide-up',
					'socialEnter'            => 'fade',
					'titleVisibility'        => 'on-hover',
					'captionVisibility'      => 'on-hover',
					'socialVisibility'       => 'on-hover',
					'cardEnterDurationMs'    => 300,
					'cardEnterDelayMs'       => 15,
					'titleEnterDurationMs'   => 300,
					'captionEnterDurationMs' => 300,
					'socialEnterDurationMs'  => 300,
					'titleEnterDelayMs'      => 15,
					'captionEnterDelayMs'    => 15,
					'socialEnterDelayMs'     => 15,
					'titleEnterStaggerMs'    => 45,
					'captionEnterStaggerMs'  => 45,
					'socialEnterStaggerMs'   => 45,
				),
				$slot( 50, 24, 50, 42, 50, 62 )
			),
			'social-strip-bottom'    => $row(
				array(
					'cardTreatment'          => 'none',
					'dimOverlay'             => true,
					'titleEnter'             => 'slide-down',
					'captionEnter'           => 'slide-right',
					'socialEnter'            => 'slide-up',
					'titleVisibility'        => 'on-hover',
					'captionVisibility'      => 'on-hover',
					'socialVisibility'       => 'on-hover',
					'cardEnterDurationMs'    => 300,
					'cardEnterDelayMs'       => 25,
					'titleEnterDurationMs'   => 300,
					'captionEnterDurationMs' => 300,
					'socialEnterDurationMs'  => 300,
					'titleEnterDelayMs'      => 25,
					'captionEnterDelayMs'    => 25,
					'socialEnterDelayMs'     => 25,
					'titleEnterStaggerMs'    => 55,
					'captionEnterStaggerMs'  => 55,
					'socialEnterStaggerMs'   => 55,
				),
				$slot( 50, 20, 50, 36, 50, 88 )
			),
			'product-card-clean'     => $row(
				array(
					'cardTreatment'          => 'none',
					'dimOverlay'             => true,
					'titleEnter'             => 'fade',
					'captionEnter'           => 'slide-up',
					'socialEnter'            => 'fade',
					'titleVisibility'        => 'on-hover',
					'captionVisibility'      => 'on-hover',
					'socialVisibility'       => 'on-hover',
					'cardEnterDurationMs'    => 240,
					'cardEnterDelayMs'       => 0,
					'titleEnterDurationMs'   => 240,
					'captionEnterDurationMs' => 240,
					'socialEnterDurationMs'  => 240,
					'titleEnterDelayMs'      => 0,
					'captionEnterDelayMs'    => 0,
					'socialEnterDelayMs'     => 0,
					'titleEnterStaggerMs'    => 25,
					'captionEnterStaggerMs'  => 25,
					'socialEnterStaggerMs'   => 25,
				),
				$slot( 50, 70, 50, 82, 50, 92 )
			),
			'soft-zoom-stack'        => $row(
				array(
					'cardTreatment'          => 'zoom',
					'dimOverlay'             => true,
					'titleEnter'             => 'blur-in',
					'captionEnter'           => 'slide-up',
					'socialEnter'            => 'slide-up',
					'titleVisibility'        => 'on-hover',
					'captionVisibility'      => 'on-hover',
					'socialVisibility'       => 'on-hover',
					'cardEnterDurationMs'    => 350,
					'cardEnterDelayMs'       => 35,
					'titleEnterDurationMs'   => 350,
					'captionEnterDurationMs' => 350,
					'socialEnterDurationMs'  => 350,
					'titleEnterDelayMs'      => 35,
					'captionEnterDelayMs'    => 35,
					'socialEnterDelayMs'     => 35,
					'titleEnterStaggerMs'    => 65,
					'captionEnterStaggerMs'  => 65,
					'socialEnterStaggerMs'   => 65,
				),
				$slot( 50, 60, 50, 72, 50, 84 )
			),
			'accessible-no-motion'   => $row(
				array(
					'cardTreatment'          => 'none',
					'dimOverlay'             => true,
					'titleEnter'             => 'none',
					'captionEnter'           => 'none',
					'socialEnter'            => 'none',
					'titleVisibility'        => 'on-hover',
					'captionVisibility'      => 'on-hover',
					'socialVisibility'       => 'on-hover',
					'cardEnterDurationMs'    => 180,
					'cardEnterDelayMs'       => 0,
					'titleEnterDurationMs'   => 180,
					'captionEnterDurationMs' => 180,
					'socialEnterDurationMs'  => 180,
					'titleEnterDelayMs'      => 0,
					'captionEnterDelayMs'    => 0,
					'socialEnterDelayMs'     => 0,
					'titleEnterStaggerMs'    => 0,
					'captionEnterStaggerMs'  => 0,
					'socialEnterStaggerMs'   => 0,
				),
				$slot( 50, 64, 50, 76, 50, 88 )
			),
		);
	}
}
