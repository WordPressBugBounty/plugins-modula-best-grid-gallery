<?php
/**
 * Read side of the animation catalog (data/animation-catalog.php): the hover
 * builder primitives, the entrance motions, the built-in presets and the
 * curated Motion menus.
 *
 * @package Modula
 */

namespace Modula\V2\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Settings schema enums, the sanitizer, the hover builder policy and the
 * frontend read the catalog through this class. The editor reads the same
 * data from the generated `modula-animation-catalog.js`, and the gallery
 * runtime (visitor and preview) its `runtime_data()` projection.
 */
final class Animation_Catalog {
	/**
	 * Gallery types value meaning "every gallery type".
	 */
	public const ALL_TYPES = 'all';

	/**
	 * Key of a menu's `recommended` table that covers every gallery type the
	 * table does not list.
	 */
	public const OTHER_TYPES = 'others';

	/**
	 * @var array<string,mixed>|null
	 */
	private static $data = null;

	/**
	 * @var array<string,array<string,mixed>>|null
	 */
	private static $hover_builders = null;

	/**
	 * @var array<string,array<string,mixed>>|null
	 */
	private static $legacy_hover_builders = null;

	/**
	 * The whole catalog, as data/animation-catalog.php declares it.
	 *
	 * @return array{primitives:array<string,array{builderFields:array<int,string>,items:array<int,array<string,mixed>>}>,speeds:array<string,float>,presets:array<int,array<string,mixed>>,menus:array<string,array<string,mixed>>}
	 */
	public static function data(): array {
		if ( null === self::$data ) {
			self::$data = require __DIR__ . '/data/animation-catalog.php';
		}
		return self::$data;
	}

	/**
	 * @return array<string,float> The Motion speed's scale on entrance durations and delays, keyed by `motion.speed`.
	 */
	public static function speeds(): array {
		return self::data()['speeds'];
	}

	/**
	 * What the gallery runtime (apps/gallery-shared) needs to play a stored
	 * Motion choice, without labels: the preset ids and recommendations that
	 * resolve a choice, the entrance tracks each entrance preset plays, the
	 * builder each hover preset plays and the builder keys that stay the
	 * stored builder's (Motion_Settings::played_hover_builder()), the hover
	 * presets that show the social icons inline, the card treatments that
	 * follow the pointer, and the speeds. Written to
	 * apps/gallery-shared/motion/modula-motion-runtime.json for the visitor
	 * and preview bundles.
	 *
	 * @return array{presetIds:array<string,array<int,string>>,recommended:array<string,array<string,string>>,entrances:array<string,array<int,array<string,mixed>>>,hoverBuilders:array<string,array<string,mixed>>,storedBuilderKeys:array<int,string>,inlineSocialHovers:array<int,string>,pointerCards:array<int,string>,speeds:array<string,float>}
	 */
	public static function runtime_data(): array {
		$motions   = array_column( self::primitives( 'entrance' ), 'tracks', 'id' );
		$entrances = array();
		foreach ( self::presets( 'entrance' ) as $id => $preset ) {
			$motion = $preset['composition']['entrance'] ?? '';
			if ( isset( $motions[ $motion ] ) ) {
				$entrances[ $id ] = $motions[ $motion ];
			}
		}
		$preset_ids  = array();
		$recommended = array();
		foreach ( array_keys( self::data()['menus'] ) as $kind ) {
			$preset_ids[ $kind ]  = array_keys( self::presets( $kind ) );
			$recommended[ $kind ] = self::data()['menus'][ $kind ]['recommended'];
		}
		$pointer_cards = array_filter(
			self::primitives( 'card' ),
			static function ( array $card ): bool {
				return true === ( $card['followsPointer'] ?? false );
			}
		);
		return array(
			'presetIds'          => $preset_ids,
			'recommended'        => $recommended,
			'entrances'          => $entrances,
			'hoverBuilders'      => self::hover_builders(),
			'storedBuilderKeys'  => Motion_Settings::STORED_BUILDER_KEYS,
			'inlineSocialHovers' => self::inline_social_hover_ids(),
			'pointerCards'       => array_column( $pointer_cards, 'id' ),
			'speeds'             => self::speeds(),
		);
	}

	/**
	 * The builder each hover preset plays. Cached: the frontend asks once per
	 * gallery item.
	 *
	 * @return array<string,array<string,mixed>> Keyed by preset id, in catalog order.
	 */
	public static function hover_builders(): array {
		if ( null === self::$hover_builders ) {
			self::$hover_builders = array_map(
				static function ( array $preset ): array {
					return $preset['composition']['builder'];
				},
				self::presets( 'hover' )
			);
		}
		return self::$hover_builders;
	}

	/**
	 * The builder each hover preset with older slot positions also plays at
	 * those positions (`composition.legacySlotPositions`: the simple moves, at
	 * the default builder's slots before they moved to the bottom).
	 *
	 * @return array<string,array<string,mixed>> Keyed by preset id, in catalog order.
	 */
	public static function legacy_hover_builders(): array {
		if ( null !== self::$legacy_hover_builders ) {
			return self::$legacy_hover_builders;
		}
		self::$legacy_hover_builders = array();
		foreach ( self::presets( 'hover' ) as $id => $preset ) {
			if ( isset( $preset['composition']['legacySlotPositions'] ) ) {
				self::$legacy_hover_builders[ $id ] = array_merge( $preset['composition']['builder'], array( 'slotPositions' => $preset['composition']['legacySlotPositions'] ) );
			}
		}
		return self::$legacy_hover_builders;
	}

	/**
	 * @param string $kind Primitive kind: `card`, `graphic`, `layer` or `entrance`.
	 * @return array<int,array<string,mixed>> The kind's primitives in menu order; empty for an unknown kind.
	 */
	public static function primitives( string $kind ): array {
		return self::data()['primitives'][ $kind ]['items'] ?? array();
	}

	/**
	 * @param string $kind Primitive kind.
	 * @return array<int,string>
	 */
	public static function primitive_ids( string $kind ): array {
		return array_column( self::primitives( $kind ), 'id' );
	}

	/**
	 * Allowed values of a `hover.builder` key that stores a primitive id
	 * (`cardTreatment`, `graphicElement`, `titleEnter`, …).
	 *
	 * @param string $field Builder key.
	 * @return array<int,string> Empty when no primitive kind owns the key.
	 */
	public static function builder_field_ids( string $field ): array {
		foreach ( self::data()['primitives'] as $kind => $definition ) {
			if ( in_array( $field, $definition['builderFields'], true ) ) {
				return self::primitive_ids( $kind );
			}
		}
		return array();
	}

	/**
	 * @param string $kind Preset kind: `hover` or `entrance`.
	 * @return array<string,array<string,mixed>> Presets keyed by id, in catalog order.
	 */
	public static function presets( string $kind ): array {
		$presets = array();
		foreach ( self::data()['presets'] as $preset ) {
			if ( $kind === $preset['kind'] ) {
				$presets[ $preset['id'] ] = $preset;
			}
		}
		return $presets;
	}

	/**
	 * @param string $kind Preset kind.
	 * @return array<int,string> Ids of the kind's presets that need Compatible Pro, in catalog order.
	 */
	public static function pro_preset_ids( string $kind ): array {
		$pro = array();
		foreach ( self::presets( $kind ) as $id => $preset ) {
			if ( true === $preset['pro'] ) {
				$pro[] = $id;
			}
		}
		return $pro;
	}

	/**
	 * @return array<int,string> Ids of the hover presets that show the social icons inline whatever the desktop folding (`inlineSocial`), in catalog order.
	 */
	public static function inline_social_hover_ids(): array {
		$inline = array();
		foreach ( self::presets( 'hover' ) as $id => $preset ) {
			if ( true === $preset['inlineSocial'] ) {
				$inline[] = $id;
			}
		}
		return $inline;
	}

	/**
	 * The curated Motion menu for a kind: the entries that exist in the
	 * catalog today, in menu order. Entries a later ticket still has to add
	 * (`pending`) are left out.
	 *
	 * @param string $kind `hover` or `entrance`.
	 * @return array<int,array{id:string,label:string}>
	 */
	public static function menu( string $kind ): array {
		$items = self::data()['menus'][ $kind ]['items'] ?? array();
		$menu  = array();
		foreach ( $items as $item ) {
			if ( isset( $item['pending'] ) ) {
				continue;
			}
			$menu[] = array(
				'id'    => $item['id'],
				'label' => $item['label'],
			);
		}
		return $menu;
	}

	/**
	 * The preset the Motion menu recommends for a gallery type: its row in the
	 * menu's `recommended` table, else the `others` row. The id may still be
	 * a planned (pending) entry.
	 *
	 * @param string $kind         `hover` or `entrance`.
	 * @param string $gallery_type `general.type`.
	 * @return string Preset id; empty for an unknown menu.
	 */
	public static function recommended( string $kind, string $gallery_type ): string {
		$table = self::data()['menus'][ $kind ]['recommended'] ?? array();
		return $table[ $gallery_type ] ?? $table[ self::OTHER_TYPES ] ?? '';
	}

	/**
	 * @param string $kind         `hover` or `entrance`.
	 * @param string $gallery_type `general.type`.
	 * @return bool The Motion menu for this kind is hidden for the gallery type.
	 */
	public static function menu_hidden_for_type( string $kind, string $gallery_type ): bool {
		return in_array( $gallery_type, self::menu_hidden_types( $kind ), true );
	}

	/**
	 * @param string $kind `hover` or `entrance`.
	 * @return array<int,string> Gallery types the Motion menu for this kind is hidden for.
	 */
	public static function menu_hidden_types( string $kind ): array {
		return self::data()['menus'][ $kind ]['hiddenForTypes'] ?? array();
	}

	/**
	 * @param array<string,mixed> $entry        A primitive or a preset.
	 * @param string              $gallery_type `general.type`.
	 * @return bool
	 */
	public static function supports_type( array $entry, string $gallery_type ): bool {
		$types = $entry['galleryTypes'] ?? array();
		return self::ALL_TYPES === $types || ( is_array( $types ) && in_array( $gallery_type, $types, true ) );
	}
}
