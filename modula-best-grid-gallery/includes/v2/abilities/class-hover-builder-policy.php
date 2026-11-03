<?php
/**
 * Hover Builder nested policy: the catalog's free presets stay writable; premium presets and
 * customization follow Compatible Pro. Effective configuration is authoritative.
 *
 * @package Modula
 */

namespace Modula\V2\Abilities;

use Modula\V2\Motion\Animation_Catalog;

defined( 'ABSPATH' ) || exit;

final class Hover_Builder_Policy {
	public const FEATURE = 'hover-builder';

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
	 * Hover presets the catalog does not mark Pro, in catalog order.
	 *
	 * @return array<int,string>
	 */
	public static function free_ids(): array {
		return array_values( array_diff( array_keys( Animation_Catalog::presets( 'hover' ) ), Animation_Catalog::pro_preset_ids( 'hover' ) ) );
	}

	/**
	 * Complete builder written by applying a catalog preset, including sourcePresetId.
	 *
	 * @return array<string,mixed>|null
	 */
	public static function applied_builder( string $id ): ?array {
		$presets = Animation_Catalog::hover_builders();
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

	/**
	 * Whether the editor lets this site pick the preset: the free presets, or
	 * every preset with Compatible Pro (the catalog's `pro` flag, the
	 * editor's `isHoverPresetLocked`). An image's own hover follows the same
	 * rule on the frontend (`Images\Item_Fields::hover_builder_for_item`).
	 */
	public static function preset_available_in_editor( string $id ): bool {
		return in_array( $id, self::free_ids(), true ) || modula_is_compatible_pro();
	}

	public static function matching_preset_id( array $builder ): string {
		return self::preset_id_with_fingerprint( $builder, array( __CLASS__, 'fingerprint' ) );
	}

	/**
	 * The catalog preset a builder plays, as the Motion hover choice sees it:
	 * `dimOverlay` is left out, because Darken on hover owns it.
	 *
	 * @param array<string,mixed> $builder `hover.builder`.
	 * @return string Preset id, or '' when the builder is the owner's own.
	 */
	public static function matching_motion_preset_id( array $builder ): string {
		return self::preset_id_with_fingerprint( $builder, array( __CLASS__, 'motion_fingerprint' ) );
	}

	/**
	 * Whether two builders play the same hover, ignoring `dimOverlay` (Darken on hover).
	 *
	 * @param array<string,mixed> $a `hover.builder`.
	 * @param array<string,mixed> $b `hover.builder`.
	 */
	public static function same_motion( array $a, array $b ): bool {
		return self::motion_fingerprint( $a ) === self::motion_fingerprint( $b );
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
			'dimOverlay'             => in_array( $builder['dimOverlay'] ?? null, array( true, 1, '1' ), true ),
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
	 * @param array<string,mixed> $builder     `hover.builder`.
	 * @param callable            $fingerprint Builder → comparable array.
	 * @return string The first catalog preset with the builder's fingerprint,
	 *                then the first played at its older slot positions, or ''.
	 */
	private static function preset_id_with_fingerprint( array $builder, callable $fingerprint ): string {
		$current = $fingerprint( $builder );
		foreach ( array( Animation_Catalog::hover_builders(), Animation_Catalog::legacy_hover_builders() ) as $presets ) {
			foreach ( $presets as $id => $preset ) {
				if ( $fingerprint( $preset ) === $current ) {
					return $id;
				}
			}
		}
		return '';
	}

	/**
	 * @return array<string,mixed>
	 */
	private static function motion_fingerprint( array $builder ): array {
		$fingerprint = self::fingerprint( $builder );
		unset( $fingerprint['dimOverlay'] );
		return $fingerprint;
	}
}
