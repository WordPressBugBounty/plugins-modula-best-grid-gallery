<?php
/**
 * The stored Motion choices (`motion.entrance`, `motion.hover`): their allowed
 * values, how `auto` resolves per gallery type, and how galleries saved before
 * the Motion settings keep what they play.
 *
 * @package Modula
 */

namespace Modula\V2\Motion;

use Modula\V2\Abilities\Hover_Builder_Policy;
use Modula\V2\Settings\Adapter;
use Modula\V2\Settings\Sanitizer;

defined( 'ABSPATH' ) || exit;

/**
 * A choice is `auto` (the catalog's recommendation for the gallery type), a
 * catalog preset id, or `custom`: the gallery's own composition, which is
 * `hover.builder` for hover and the loading effects (`loadingEffects.*`) for
 * the entrance.
 */
final class Motion_Settings {
	public const AUTO   = 'auto';
	public const CUSTOM = 'custom';

	/**
	 * What a gallery saved before the Motion settings played, beyond its
	 * entrance and hover: normal pace, motion on phones, no Justified
	 * widening (it never had one) and prints that stay put.
	 */
	private const EXISTING_GALLERY_VALUES = array(
		'speed'      => 'normal',
		'phones'     => true,
		'widen'      => false,
		'movePrints' => false,
	);

	/**
	 * `hover.builder` keys that stay the stored builder's whatever the hover
	 * choice plays: Darken on hover writes `dimOverlay`, and `sourcePresetId`
	 * stamps the preset the builder was seeded from.
	 */
	public const STORED_BUILDER_KEYS = array( 'dimOverlay', 'sourcePresetId' );

	/**
	 * The hover a gallery imported from the classic Under Image plays (ticket
	 * 105): the effect is "Under the image" in Where it sits, not a hover. Its
	 * imported builder is None's look with every layer hidden, which shows no
	 * text once Where it sits moves to On the image; None - with captions
	 * draws the same tile under the image and keeps the text on it, as an
	 * album's Under Image does (Pro album-frontend ticket 16).
	 */
	private const UNDER_IMAGE_HOVER = 'none-with-captions';

	/**
	 * The classic effect that prints the captions under the image.
	 */
	private const UNDER_IMAGE_EFFECT = 'under';

	/**
	 * Allowed values of `motion.{kind}`: `auto`, the catalog's presets of that
	 * kind in catalog order, then `custom`.
	 *
	 * @param string $kind `entrance` or `hover`.
	 * @return array<int,string>
	 */
	public static function choices( string $kind ): array {
		return array_merge(
			array( self::AUTO ),
			array_keys( Animation_Catalog::presets( $kind ) ),
			array( self::CUSTOM )
		);
	}

	/**
	 * What a stored choice plays: an explicit value as stored; `auto` the
	 * catalog's recommendation for the gallery type. A recommendation whose
	 * preset a later ticket still adds plays `custom` meanwhile, which is
	 * what the gallery played before the Motion settings.
	 *
	 * @param string $kind         `entrance` or `hover`.
	 * @param string $choice       Stored `motion.{kind}`.
	 * @param string $gallery_type `general.type`.
	 * @return string A catalog preset id or `custom`.
	 */
	public static function resolve( string $kind, string $choice, string $gallery_type ): string {
		if ( self::AUTO !== $choice ) {
			return $choice;
		}
		$recommended = Animation_Catalog::recommended( $kind, $gallery_type );
		return isset( Animation_Catalog::presets( $kind )[ $recommended ] ) ? $recommended : self::CUSTOM;
	}

	/**
	 * The hover builder a gallery plays: its own for `custom` (or any value
	 * the catalog has no preset for), else the builder of the preset the
	 * choice resolves to, with every timing (`…Ms`) scaled by the Motion
	 * speed. Darken on hover and the `sourcePresetId` stamp stay the stored
	 * builder's. The gallery runtime's resolveGalleryHoverBuilder()
	 * (apps/gallery-shared/motion/motionRuntime.js) applies the same rule to
	 * the editor preview.
	 *
	 * @param string              $choice       Stored `motion.hover`.
	 * @param string              $speed        Stored `motion.speed`; an unknown speed plays at normal pace.
	 * @param string              $gallery_type `general.type`.
	 * @param array<string,mixed> $builder      Stored `hover.builder`.
	 * @return array<string,mixed> `hover.builder` as it plays.
	 */
	public static function played_hover_builder( string $choice, string $speed, string $gallery_type, array $builder ): array {
		$preset = Animation_Catalog::hover_builders()[ self::resolve( 'hover', $choice, $gallery_type ) ] ?? null;
		if ( null === $preset ) {
			return $builder;
		}
		$scale  = Animation_Catalog::speeds()[ $speed ] ?? 1.0;
		$played = array();
		foreach ( $preset as $key => $value ) {
			$played[ $key ] = 'Ms' === substr( $key, -2 ) ? (int) round( $value * $scale ) : $value;
		}
		foreach ( self::STORED_BUILDER_KEYS as $key ) {
			unset( $played[ $key ] );
			if ( array_key_exists( $key, $builder ) ) {
				$played[ $key ] = $builder[ $key ];
			}
		}
		return $played;
	}

	/**
	 * Flat gallery settings (`modula-settings` keys) as they render: their
	 * `hover_builder` is the one the gallery plays (`played_hover_builder()`).
	 * A gallery without a builder, or without a Motion hover choice (not
	 * migrated yet), keeps its own.
	 *
	 * @param array<string,mixed> $flat Flat gallery settings.
	 * @return array<string,mixed>
	 */
	public static function with_played_hover_builder( array $flat ): array {
		$builder = $flat['hover_builder'] ?? null;
		$choice  = $flat['motion_hover'] ?? null;
		if ( ! is_array( $builder ) || ! is_string( $choice ) ) {
			return $flat;
		}
		$speed                 = $flat['motion_speed'] ?? '';
		$type                  = $flat['type'] ?? '';
		$flat['hover_builder'] = self::played_hover_builder( $choice, is_string( $speed ) ? $speed : '', is_string( $type ) ? $type : '', $builder );
		return $flat;
	}

	/**
	 * Fill the `motion` keys a gallery saved before the Motion settings lacks,
	 * with explicit values that play what it played: its loading effects and
	 * hover builder, motion on phones, no widening and fixed prints. Stored
	 * motion values are kept, except a gallery that plays the builder imported
	 * from Under Image as its own (without_imported_under_hover()). New
	 * galleries get the schema defaults (`auto`) from their create path instead.
	 *
	 * @param array<string,mixed> $grouped Grouped settings.
	 * @return array<string,mixed> The same settings with every `motion` key set.
	 */
	public static function with_existing_gallery_values( array $grouped ): array {
		$motion = isset( $grouped['motion'] ) && is_array( $grouped['motion'] ) ? $grouped['motion'] : array();
		if ( ! array_key_exists( 'entrance', $motion ) ) {
			$motion['entrance'] = self::entrance_choice_for_loading_effects( $grouped['loadingEffects'] ?? array() );
		}
		if ( ! array_key_exists( 'hover', $motion ) ) {
			$builder         = $grouped['hover']['builder'] ?? null;
			$motion['hover'] = is_array( $builder ) ? self::hover_choice_for_builder( $builder ) : self::CUSTOM;
		}
		$grouped['motion'] = $motion + self::EXISTING_GALLERY_VALUES;
		return self::without_imported_under_hover( $grouped );
	}

	/**
	 * Under Image is no hover (UNDER_IMAGE_HOVER): a gallery whose hover is
	 * `custom` with the builder imported from it, untouched, plays None - with
	 * captions instead. That covers the first import and galleries imported
	 * before ticket 105, which store `custom`. The builder, Where it sits and
	 * Darken on hover stay as stored (the import never darkened, so a Darken
	 * on hover that is on was turned on since). A builder edited after the
	 * import, and any other hover choice, are left alone. The read
	 * (with_existing_gallery_values) and the settings writer both apply it,
	 * so the next save stores the choice.
	 *
	 * @param array<string,mixed> $grouped Grouped settings.
	 * @return array<string,mixed>
	 */
	public static function without_imported_under_hover( array $grouped ): array {
		if ( ! self::plays_imported_under_as_hover( $grouped ) ) {
			return $grouped;
		}
		$grouped['motion']['hover'] = self::UNDER_IMAGE_HOVER;
		return $grouped;
	}

	/**
	 * A settings patch that changes what `hover.builder` plays, without naming
	 * `motion.hover`, also sets the hover choice from the new builder (Customize,
	 * the preset row, Zoom on hover and ability writes all write the builder).
	 * A stored choice that still plays the builder's preset stays, so `auto`
	 * stays `auto`; the editor's Motion menu applies the same rule
	 * (`hoverChoiceSync`). `dimOverlay` alone never counts: Darken on hover
	 * writes it.
	 *
	 * @param array<string,mixed> $existing Stored grouped settings.
	 * @param array<string,mixed> $incoming Grouped patch.
	 * @return array<string,mixed> The patch, with `motion.hover` when the choice moved.
	 */
	public static function with_hover_choice_from_builder_write( array $existing, array $incoming ): array {
		$builder = $incoming['hover']['builder'] ?? null;
		if ( ! is_array( $builder ) || isset( $incoming['motion']['hover'] ) ) {
			return $incoming;
		}
		$stored = $existing['hover']['builder'] ?? null;
		if ( is_array( $stored ) && Hover_Builder_Policy::same_motion( $stored, $builder ) ) {
			return $incoming;
		}
		$choice = self::hover_choice_for_builder( $builder );
		if ( self::CUSTOM !== $choice && self::stored_choice_plays( $existing, $incoming, $choice ) ) {
			return $incoming;
		}
		$incoming['motion']['hover'] = $choice;
		return $incoming;
	}

	/**
	 * A settings patch that changes the loading effects (`loadingEffects.*`),
	 * without naming `motion.entrance`, makes the entrance the gallery's own
	 * (`custom`): the loading effects play only then. The editor's Loading
	 * effects section and ability writes both write those keys; the editor
	 * applies the same rule as a field coupling (`applyMotionEntranceSideEffects`).
	 *
	 * @param array<string,mixed> $existing Stored grouped settings.
	 * @param array<string,mixed> $incoming Grouped patch.
	 * @return array<string,mixed> The patch, with `motion.entrance` when the loading effects changed.
	 */
	public static function with_entrance_choice_from_loading_write( array $existing, array $incoming ): array {
		$loading = $incoming['loadingEffects'] ?? null;
		if ( ! is_array( $loading ) || isset( $incoming['motion']['entrance'] ) ) {
			return $incoming;
		}
		$stored = isset( $existing['loadingEffects'] ) && is_array( $existing['loadingEffects'] ) ? $existing['loadingEffects'] : array();
		// Compare sanitized values: a patch may send '1' or "100" for what is stored as true or 100.
		$before = Sanitizer::sanitize_grouped( array( 'loadingEffects' => $stored ) )['loadingEffects'] ?? array();
		$after  = Sanitizer::sanitize_grouped( array( 'loadingEffects' => array_merge( $stored, $loading ) ) )['loadingEffects'] ?? array();
		if ( $before === $after ) {
			return $incoming;
		}
		$incoming['motion']['entrance'] = self::CUSTOM;
		return $incoming;
	}

	/**
	 * The hover choice a builder stands for: the catalog preset it plays, else `custom`.
	 *
	 * @param array<string,mixed> $builder `hover.builder`.
	 */
	public static function hover_choice_for_builder( array $builder ): string {
		$preset = Hover_Builder_Policy::matching_motion_preset_id( $builder );
		return '' !== $preset ? $preset : self::CUSTOM;
	}

	/**
	 * @param array<string,mixed> $grouped Grouped settings.
	 * @return bool The hover is `custom` with the builder imported from Under Image, as the import made it (Darken on hover aside).
	 */
	private static function plays_imported_under_as_hover( array $grouped ): bool {
		$builder = $grouped['hover']['builder'] ?? null;
		if ( self::CUSTOM !== ( $grouped['motion']['hover'] ?? null ) || ! is_array( $builder ) ) {
			return false;
		}
		$imported = Adapter::hover_builder_from_legacy_effect_slug( self::UNDER_IMAGE_EFFECT );
		return $imported['sourcePresetId'] === ( $builder['sourcePresetId'] ?? null )
			&& Hover_Builder_Policy::same_motion( $builder, $imported );
	}

	/**
	 * @param array<string,mixed> $existing Stored grouped settings.
	 * @param array<string,mixed> $incoming Grouped patch; its gallery type wins.
	 * @param string              $preset   Catalog hover preset id.
	 * @return bool The stored hover choice plays `$preset`.
	 */
	private static function stored_choice_plays( array $existing, array $incoming, string $preset ): bool {
		$stored = $existing['motion']['hover'] ?? null;
		if ( ! is_string( $stored ) ) {
			return false;
		}
		$type = $incoming['general']['type'] ?? $existing['general']['type'] ?? '';
		return self::resolve( 'hover', $stored, is_string( $type ) ? $type : '' ) === $preset;
	}

	/**
	 * @param mixed $loading `loadingEffects` group.
	 * @return string `custom` when a loading effect is on, else `none`.
	 */
	private static function entrance_choice_for_loading_effects( $loading ): string {
		$loading = is_array( $loading ) ? $loading : array();
		// Classic galleries stored only the values; the sanitizer's rule derives the flags.
		Sanitizer::hydrate_loading_effects_enables( $loading );
		$on = ! empty( $loading['enableScale'] ) || ! empty( $loading['enableRotate'] ) || ! empty( $loading['enableSlide'] );
		return $on ? self::CUSTOM : 'none';
	}
}
