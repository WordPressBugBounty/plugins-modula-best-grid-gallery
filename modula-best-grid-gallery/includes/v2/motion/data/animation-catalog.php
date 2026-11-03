<?php
/**
 * Animation catalog: the only definition of the hover builder's primitives,
 * its built-in presets and the curated Motion menus.
 *
 * PHP reads it through Modula\V2\Motion\Animation_Catalog (settings schema
 * enums, sanitizer, hover builder policy and Lite locks, frontend item
 * classes). The editor reads the generated
 * apps/gallery-editor/generated/modula-animation-catalog.js; regenerate it with
 * `npm run generate:settings-schemas`. Labels and descriptions are exported as
 * translatable strings.
 *
 * - primitives: building blocks per kind. `builderFields` names the
 *   `hover.builder` keys that store an id of that kind, so their schema enums
 *   come from here. The runtime turns an id into a class
 *   (`modula-hover-card--{id}`, `modula-hover-enter--{layer}--{id}`, …) that
 *   _hover-v2.scss and the builder preview stylesheet style. A card treatment
 *   that `followsPointer` gets the pointer's offset from the item's centre
 *   (`--modula-hover-pointer-x` / `-y`, -0.5 to 0.5) while it is hovered,
 *   from the gallery runtime (apps/gallery-shared/motion/hoverPointer.js);
 *   its stylesheet rule turns that into motion.
 * - primitives.entrance: motions played once per item as it enters view
 *   (`triggers`: `in-view`). Unlike the hover kinds, their look is data that
 *   the runtime interprets (apps/gallery-shared/motion/playEntrance.js), so a
 *   new entrance needs no code. Each track animates the `tile` (the item) or
 *   its `image` with Web Animations `keyframes`; `alternate` swaps in other
 *   keyframes on odd rows or odd items. `durationMs` and `delayMs` are sums:
 *   `base` plus a factor per item variable (`index` in reading order, `row`,
 *   `col`, `distance` in px from the centre of the items entering together).
 *   Keyframe strings may name per-item values: {dx} {dy} (px from the item
 *   to that centre), {scatter} (a tilt between -15 and 14 deg), {fit} (the
 *   scale that fits the longest side in 200px) and {stack} (a z-index, the
 *   first item on top). `easing` defaults to the runtime's.
 * - speeds: the Motion speed's scale on every entrance duration and delay,
 *   and on every timing (`…Ms`) of a hover preset's builder.
 * - presets: named compositions in the builder's own format. `composition`
 *   holds what applying the preset writes: `builder` is `hover.builder`
 *   (without `sourcePresetId`), `hover` the overlay keys beside it. Order is
 *   the builder's preset menu order. Stored `sourcePresetId` values are these
 *   ids, so an id never changes. Stored `motion.entrance` / `motion.hover`
 *   values are these ids too; entrance `none` has an empty composition. A
 *   hover choice other than `custom` plays its preset's builder
 *   (Motion_Settings::played_hover_builder()); no two hover presets may play
 *   the same builder, since a builder names its preset by matching it. A
 *   hover preset with `inlineSocial` shows the social icons inline even when
 *   the gallery folds them into the share button on desktop (the gallery
 *   runtime's showsInlineSocial()).
 * - menus: the curated Motion menus. An item with `pending` is a planned
 *   preset (the value names the ticket that adds it); the menu skips it until
 *   the preset exists, and its `pending` key goes when it lands.
 *   `recommended` maps a gallery type (`others`: every type not listed) to
 *   the preset `motion.{kind} = auto` plays for it; Motion_Settings::resolve()
 *   reads it. A pending id there resolves to `custom` until it lands.
 *   `offMenu` lists the presets the menu leaves out; the editor lists one
 *   while it is the stored choice, so a stored value is never lost.
 *
 * @package Modula
 */

use Modula\V2\Motion\Animation_Catalog;

defined( 'ABSPATH' ) || exit;

$modula_hover_primitive = static function ( string $id, string $label, bool $scales_with_speed ): array {
	return array(
		'id'              => $id,
		'label'           => $label,
		'triggers'        => array( 'hover' ),
		'scalesWithSpeed' => $scales_with_speed,
		'galleryTypes'    => Animation_Catalog::ALL_TYPES,
		'pro'             => false,
	);
};

$modula_card_primitive = static function ( string $id, string $label, bool $scales_with_speed, bool $follows_pointer ) use ( $modula_hover_primitive ): array {
	return $modula_hover_primitive( $id, $label, $scales_with_speed ) + array( 'followsPointer' => $follows_pointer );
};

/*
 * Every built-in preset times the tile and the three layers alike: one
 * duration, one base delay, one stagger.
 */
$modula_preset_timing = static function ( int $duration_ms, int $delay_ms, int $stagger_ms ): array {
	return array(
		'cardEnterDurationMs'    => $duration_ms,
		'cardEnterDelayMs'       => $delay_ms,
		'titleEnterDurationMs'   => $duration_ms,
		'captionEnterDurationMs' => $duration_ms,
		'socialEnterDurationMs'  => $duration_ms,
		'titleEnterDelayMs'      => $delay_ms,
		'captionEnterDelayMs'    => $delay_ms,
		'socialEnterDelayMs'     => $delay_ms,
		'titleEnterStaggerMs'    => $stagger_ms,
		'captionEnterStaggerMs'  => $stagger_ms,
		'socialEnterStaggerMs'   => $stagger_ms,
	);
};

$modula_preset_slots = static function ( int $title_x, int $title_y, int $caption_x, int $caption_y, int $social_x, int $social_y ): array {
	return array(
		'title'   => array(
			'x' => $title_x,
			'y' => $title_y,
		),
		'caption' => array(
			'x' => $caption_x,
			'y' => $caption_y,
		),
		'social'  => array(
			'x' => $social_x,
			'y' => $social_y,
		),
	);
};

$modula_entrance_motion = static function ( string $id, string $label, array $tracks ): array {
	return array(
		'id'              => $id,
		'label'           => $label,
		'triggers'        => array( 'in-view' ),
		'scalesWithSpeed' => true,
		'galleryTypes'    => Animation_Catalog::ALL_TYPES,
		'pro'             => false,
		'tracks'          => $tracks,
	);
};

// The image settles from a zoom while its tile reveals it.
$modula_image_settle = static function ( string $from, int $duration_ms, array $delay_ms ): array {
	return array(
		'target'     => 'image',
		'keyframes'  => array(
			array( 'transform' => $from ),
			array( 'transform' => 'none' ),
		),
		'durationMs' => array( 'base' => $duration_ms ),
		'delayMs'    => $delay_ms,
	);
};

// An entrance preset plays the entrance motion of the same id.
$modula_entrance_preset = static function ( string $id, string $label, string $description ): array {
	return array(
		'id'           => $id,
		'kind'         => 'entrance',
		'label'        => $label,
		'description'  => $description,
		'galleryTypes' => Animation_Catalog::ALL_TYPES,
		'pro'          => false,
		'composition'  => array( 'entrance' => $id ),
	);
};

/*
 * A hover preset. `$look` holds cardTreatment, dimOverlay, the three
 * *Enter ids and one `visibility` for the three layers. `$inline_social`:
 * the social icons are the preset's look, so they show inline even when the
 * gallery folds them into the share button on desktop.
 */
$modula_hover_preset = static function ( string $id, string $label, string $description, bool $pro, array $look, array $timing, array $slots, string $hover_color, int $hover_opacity, bool $inline_social = false ): array {
	return array(
		'id'           => $id,
		'kind'         => 'hover',
		'label'        => $label,
		'description'  => $description,
		'galleryTypes' => Animation_Catalog::ALL_TYPES,
		'pro'          => $pro,
		'inlineSocial' => $inline_social,
		'composition'  => array(
			'builder' => array_merge(
				array(
					'cardTreatment'     => $look['cardTreatment'],
					'graphicElement'    => 'none',
					'graphicVisibility' => 'on-hover',
					'dimOverlay'        => $look['dimOverlay'],
					'titleEnter'        => $look['titleEnter'],
					'captionEnter'      => $look['captionEnter'],
					'socialEnter'       => $look['socialEnter'],
					'titleVisibility'   => $look['visibility'],
					'captionVisibility' => $look['visibility'],
					'socialVisibility'  => $look['visibility'],
				),
				$timing,
				array( 'slotPositions' => $slots )
			),
			'hover'   => array(
				'hoverColor'   => $hover_color,
				'hoverOpacity' => $hover_opacity,
			),
		),
	);
};

/*
 * A simple hover move: Modula's default hover (title, caption and social fade
 * in on hover; Adapter::default_hover_builder()) with one card treatment.
 * So Zoom is what the Zoom on hover switch has always played. The text sits at
 * the bottom of the photo (editor-qa 2026-10-29 ticket 15), under one scrim
 * from the bottom edge, rather than the default builder's 18 / 50 / 82.
 */
$modula_simple_hover_preset = static function ( string $id, string $label, string $description, string $card_treatment ) use ( $modula_hover_preset, $modula_preset_timing, $modula_preset_slots ): array {
	$preset = $modula_hover_preset(
		$id,
		$label,
		$description,
		false,
		array(
			'cardTreatment' => $card_treatment,
			'dimOverlay'    => false,
			'titleEnter'    => 'fade',
			'captionEnter'  => 'fade',
			'socialEnter'   => 'fade',
			'visibility'    => 'on-hover',
		),
		$modula_preset_timing( 280, 0, 45 ),
		$modula_preset_slots( 50, 70, 50, 84, 50, 94 ),
		'rgba(0,0,0,.5)',
		50
	);
	// A builder saved with the default builder's slots plays this move too, so
	// galleries saved before the move went to the bottom keep their choice
	// (Hover_Builder_Policy::matching_motion_preset_id()).
	$preset['composition']['legacySlotPositions'] = $modula_preset_slots( 50, 18, 50, 50, 50, 82 );
	return $preset;
};

return array(
	'primitives' => array(
		'card'     => array(
			'builderFields' => array( 'cardTreatment' ),
			'items'         => array(
				$modula_card_primitive( 'none', 'None', false, false ),
				$modula_card_primitive( 'zoom', 'Zoom image', true, false ),
				$modula_card_primitive( 'grayscale', 'Grayscale', true, false ),
				$modula_card_primitive( 'lift', 'Lift', true, false ),
				// The design's simple hover moves: tilt toward the pointer, dim the other images, pan the image against the pointer.
				$modula_card_primitive( 'tilt', 'Tilt', true, true ),
				$modula_card_primitive( 'spotlight', 'Spotlight', true, false ),
				$modula_card_primitive( 'pan', 'Pan image', true, true ),
			),
		),
		// Frame and diamond fade in on a fixed 220ms, outside the builder timings.
		'graphic'  => array(
			'builderFields' => array( 'graphicElement' ),
			'items'         => array(
				$modula_hover_primitive( 'none', 'None', false ),
				$modula_hover_primitive( 'frame', 'Frame', false ),
				$modula_hover_primitive( 'diamond', 'Diamond', false ),
			),
		),
		'layer'    => array(
			'builderFields' => array( 'titleEnter', 'captionEnter', 'socialEnter' ),
			'items'         => array(
				$modula_hover_primitive( 'none', 'None', false ),
				$modula_hover_primitive( 'fade', 'Fade in', true ),
				$modula_hover_primitive( 'slide-up', 'Slide up', true ),
				$modula_hover_primitive( 'slide-down', 'Slide down', true ),
				$modula_hover_primitive( 'slide-left', 'Slide left', true ),
				$modula_hover_primitive( 'slide-right', 'Slide right', true ),
				$modula_hover_primitive( 'blur-in', 'Blur in', true ),
				$modula_hover_primitive( 'scale', 'Scale in', true ),
			),
		),
		// Keyframes, easing and timings from the design's entrance preview.
		'entrance' => array(
			'builderFields' => array(),
			'items'         => array(
				$modula_entrance_motion(
					'rise',
					'Rise',
					array(
						array(
							'target'     => 'tile',
							'keyframes'  => array(
								array(
									'opacity'   => 0,
									'transform' => 'translateY(40px) scale(.96)',
								),
								array(
									'opacity'   => 1,
									'transform' => 'none',
								),
							),
							'durationMs' => array( 'base' => 800 ),
							'delayMs'    => array( 'index' => 80 ),
						),
					)
				),
				$modula_entrance_motion(
					'develop',
					'Develop',
					array(
						array(
							'target'     => 'tile',
							'keyframes'  => array(
								array( 'clipPath' => 'inset(100% 0 0 0)' ),
								array( 'clipPath' => 'inset(0 0 0 0)' ),
							),
							'durationMs' => array( 'base' => 1000 ),
							'delayMs'    => array(
								'col' => 140,
								'row' => 240,
							),
							'easing'     => 'cubic-bezier(.7,0,.2,1)',
						),
						$modula_image_settle(
							'scale(1.3)',
							1500,
							array(
								'col' => 140,
								'row' => 240,
							)
						),
					)
				),
				$modula_entrance_motion(
					'sweep',
					'Sweep',
					array(
						array(
							'target'     => 'tile',
							'keyframes'  => array(
								array(
									'transform' => 'translateX(-90px)',
									'opacity'   => 0,
									'clipPath'  => 'inset(0 100% 0 0)',
								),
								array(
									'transform' => 'none',
									'opacity'   => 1,
									'clipPath'  => 'inset(0 0 0 0)',
								),
							),
							// Odd rows sweep in from the other side.
							'alternate'  => array(
								'by'        => 'row',
								'keyframes' => array(
									array(
										'transform' => 'translateX(90px)',
										'opacity'   => 0,
										'clipPath'  => 'inset(0 0 0 100%)',
									),
									array(
										'transform' => 'none',
										'opacity'   => 1,
										'clipPath'  => 'inset(0 0 0 0)',
									),
								),
							),
							'durationMs' => array( 'base' => 1100 ),
							'delayMs'    => array(
								'row' => 180,
								'col' => 50,
							),
							'easing'     => 'cubic-bezier(.65,0,.2,1)',
						),
						$modula_image_settle(
							'scale(1.25)',
							1500,
							array(
								'row' => 180,
								'col' => 50,
							)
						),
					)
				),
				$modula_entrance_motion(
					'darkroom',
					'Darkroom',
					array(
						array(
							'target'     => 'tile',
							'keyframes'  => array(
								array(
									'filter'    => 'brightness(0) blur(14px)',
									'transform' => 'scale(1.06)',
								),
								array(
									'filter'    => 'brightness(1) blur(0)',
									'transform' => 'none',
								),
							),
							'durationMs' => array( 'base' => 1300 ),
							'delayMs'    => array( 'index' => 150 ),
							'easing'     => 'cubic-bezier(.4,0,.2,1)',
						),
					)
				),
				$modula_entrance_motion(
					'flip',
					'Flip wave',
					array(
						array(
							'target'     => 'tile',
							'keyframes'  => array(
								array(
									'transform' => 'perspective(900px) rotateY(-90deg)',
									'opacity'   => 0,
								),
								array(
									'opacity' => 1,
									'offset'  => 0.35,
								),
								array(
									'transform' => 'perspective(900px) rotateY(0)',
									'opacity'   => 1,
								),
							),
							'durationMs' => array( 'base' => 900 ),
							'delayMs'    => array(
								'row' => 110,
								'col' => 110,
							),
							'easing'     => 'cubic-bezier(.3,1.3,.5,1)',
						),
					)
				),
				$modula_entrance_motion(
					'drop',
					'Drop and develop',
					array(
						array(
							'target'     => 'tile',
							'keyframes'  => array(
								array( 'transform' => 'translateY(-760px) rotate(-26deg)' ),
								array( 'transform' => 'none' ),
							),
							// Odd prints fall tilted the other way.
							'alternate'  => array(
								'by'        => 'index',
								'keyframes' => array(
									array( 'transform' => 'translateY(-760px) rotate(26deg)' ),
									array( 'transform' => 'none' ),
								),
							),
							'durationMs' => array( 'base' => 950 ),
							'delayMs'    => array( 'index' => 100 ),
							'easing'     => 'cubic-bezier(.34,1.45,.55,1)',
						),
						// The print develops after it lands.
						array(
							'target'     => 'image',
							'keyframes'  => array(
								array( 'filter' => 'sepia(1) brightness(2.3) contrast(.3) saturate(0) blur(3px)' ),
								array(
									'filter' => 'sepia(.6) brightness(1.4) contrast(.7) saturate(.4) blur(1px)',
									'offset' => 0.45,
								),
								array( 'filter' => 'none' ),
							),
							'durationMs' => array( 'base' => 2400 ),
							'delayMs'    => array(
								'base'  => 700,
								'index' => 100,
							),
							'easing'     => 'ease-out',
						),
					)
				),
				$modula_entrance_motion(
					'deal',
					'Deal the deck',
					array(
						// Every card starts stacked at the centre, then is dealt to its place.
						array(
							'target'     => 'tile',
							'keyframes'  => array(
								array(
									'transform' => 'translate({dx}px, {dy}px) rotate({scatter}deg) scale({fit})',
									'zIndex'    => '{stack}',
								),
								array(
									'transform' => 'translate({dx}px, {dy}px) rotate({scatter}deg) scale({fit})',
									'zIndex'    => '{stack}',
									'offset'    => 0.3,
								),
								array(
									'transform' => 'none',
									'zIndex'    => '1',
								),
							),
							'durationMs' => array(
								'base'  => 1500,
								'index' => 50,
							),
							'delayMs'    => array( 'index' => 40 ),
							'easing'     => 'cubic-bezier(.3,1.25,.4,1)',
						),
					)
				),
				$modula_entrance_motion(
					'aperture',
					'Aperture',
					array(
						array(
							'target'     => 'tile',
							'keyframes'  => array(
								array( 'clipPath' => 'circle(0% at 50% 50%)' ),
								array( 'clipPath' => 'circle(75% at 50% 50%)' ),
							),
							'durationMs' => array( 'base' => 1000 ),
							'delayMs'    => array( 'distance' => 0.9 ),
							'easing'     => 'cubic-bezier(.6,0,.2,1)',
						),
						$modula_image_settle( 'scale(1.35) rotate(-4deg)', 1400, array( 'distance' => 0.9 ) ),
					)
				),
				$modula_entrance_motion(
					'curtain',
					'Curtain',
					array(
						array(
							'target'     => 'tile',
							'keyframes'  => array(
								array( 'clipPath' => 'inset(0 100% 0 0)' ),
								array( 'clipPath' => 'inset(0 0 0 0)' ),
							),
							'durationMs' => array( 'base' => 1100 ),
							'delayMs'    => array(
								'col' => 130,
								'row' => 90,
							),
							'easing'     => 'cubic-bezier(.77,0,.18,1)',
						),
						$modula_image_settle(
							'scale(1.25)',
							1600,
							array(
								'col' => 130,
								'row' => 90,
							)
						),
					)
				),
				$modula_entrance_motion(
					'letterbox',
					'Letterbox',
					array(
						array(
							'target'     => 'tile',
							'keyframes'  => array(
								array( 'clipPath' => 'inset(50% 0 50% 0)' ),
								array(
									'clipPath' => 'inset(50% 0 50% 0)',
									'offset'   => 0.1,
								),
								array( 'clipPath' => 'inset(0 0 0 0)' ),
							),
							'durationMs' => array( 'base' => 1300 ),
							'delayMs'    => array( 'index' => 90 ),
							'easing'     => 'cubic-bezier(.77,0,.18,1)',
						),
						$modula_image_settle( 'scale(1.12)', 1800, array( 'index' => 90 ) ),
					)
				),
				$modula_entrance_motion(
					'pop',
					'Pop',
					array(
						array(
							'target'     => 'tile',
							'keyframes'  => array(
								array(
									'transform' => 'scale(.5)',
									'opacity'   => 0,
								),
								array(
									'opacity' => 1,
									'offset'  => 0.3,
								),
								array(
									'transform' => 'none',
									'opacity'   => 1,
								),
							),
							'durationMs' => array( 'base' => 700 ),
							'delayMs'    => array( 'index' => 70 ),
							'easing'     => 'cubic-bezier(.34,1.56,.64,1)',
						),
					)
				),
			),
		),
	),
	'speeds'     => array(
		'slow'   => 1.4,
		'normal' => 1.0,
		'fast'   => 0.65,
	),
	'presets'    => array(
		$modula_hover_preset(
			'none',
			'None',
			'Pure photos only: no hover motion, overlay, or on-image title, caption, or social icons.',
			false,
			array(
				'cardTreatment' => 'none',
				'dimOverlay'    => false,
				'titleEnter'    => 'none',
				'captionEnter'  => 'none',
				'socialEnter'   => 'none',
				'visibility'    => 'hidden',
			),
			$modula_preset_timing( 180, 0, 0 ),
			$modula_preset_slots( 50, 18, 50, 50, 50, 82 ),
			'rgba(0,0,0,0)',
			0
		),
		$modula_hover_preset(
			'none-with-captions',
			'None - with captions',
			'No hover effects, but title, caption, and social stay visible on the image.',
			false,
			array(
				'cardTreatment' => 'none',
				'dimOverlay'    => false,
				'titleEnter'    => 'none',
				'captionEnter'  => 'none',
				'socialEnter'   => 'none',
				'visibility'    => 'always',
			),
			$modula_preset_timing( 180, 0, 0 ),
			$modula_preset_slots( 50, 18, 50, 30, 50, 82 ),
			'rgba(0,0,0,0)',
			0
		),
		$modula_hover_preset(
			'balanced-reveal',
			'Balanced reveal',
			'General-purpose hover: soft zoom, readable overlay, all content revealed without drama.',
			false,
			array(
				'cardTreatment' => 'zoom',
				'dimOverlay'    => true,
				'titleEnter'    => 'fade',
				'captionEnter'  => 'fade',
				'socialEnter'   => 'fade',
				'visibility'    => 'on-hover',
			),
			$modula_preset_timing( 280, 0, 40 ),
			$modula_preset_slots( 50, 24, 50, 36, 50, 78 ),
			'rgba(17,17,17,.46)',
			46
		),
		$modula_hover_preset(
			'portfolio-lift',
			'Portfolio lift',
			'A polished portfolio card with a small lift and upward content entrance.',
			false,
			array(
				'cardTreatment' => 'lift',
				'dimOverlay'    => true,
				'titleEnter'    => 'slide-up',
				'captionEnter'  => 'slide-up',
				'socialEnter'   => 'fade',
				'visibility'    => 'on-hover',
			),
			$modula_preset_timing( 320, 25, 55 ),
			$modula_preset_slots( 50, 22, 50, 34, 50, 76 ),
			'rgba(15,23,42,.54)',
			54
		),
		$modula_hover_preset(
			'center-hero',
			'Center hero',
			'Hero-style hover with centered copy, stronger title emphasis, and balanced timing.',
			false,
			array(
				'cardTreatment' => 'zoom',
				'dimOverlay'    => true,
				'titleEnter'    => 'scale',
				'captionEnter'  => 'fade',
				'socialEnter'   => 'fade',
				'visibility'    => 'on-hover',
			),
			$modula_preset_timing( 360, 20, 60 ),
			$modula_preset_slots( 50, 40, 50, 54, 50, 70 ),
			'rgba(31,41,55,.52)',
			52
		),
		$modula_hover_preset(
			'caption-spotlight',
			'Caption spotlight',
			'For storytelling galleries where the caption is the main content layer.',
			true,
			array(
				'cardTreatment' => 'none',
				'dimOverlay'    => true,
				'titleEnter'    => 'blur-in',
				'captionEnter'  => 'slide-up',
				'socialEnter'   => 'fade',
				'visibility'    => 'on-hover',
			),
			$modula_preset_timing( 340, 40, 70 ),
			$modula_preset_slots( 50, 56, 50, 70, 50, 86 ),
			'rgba(17,24,39,.64)',
			64
		),
		$modula_hover_preset(
			'cinematic-dark',
			'Cinematic dark',
			'Darker, slower, dramatic reveal for large photography tiles.',
			true,
			array(
				'cardTreatment' => 'lift',
				'dimOverlay'    => true,
				'titleEnter'    => 'blur-in',
				'captionEnter'  => 'slide-up',
				'socialEnter'   => 'slide-up',
				'visibility'    => 'on-hover',
			),
			$modula_preset_timing( 420, 50, 80 ),
			$modula_preset_slots( 50, 60, 50, 74, 50, 88 ),
			'rgba(2,6,23,.72)',
			72
		),
		$modula_hover_preset(
			'editorial-corner-left',
			'Editorial corner left',
			'Magazine-like top-left stack: copy reveals together on hover.',
			true,
			array(
				'cardTreatment' => 'none',
				'dimOverlay'    => true,
				'titleEnter'    => 'slide-right',
				'captionEnter'  => 'slide-right',
				'socialEnter'   => 'fade',
				'visibility'    => 'on-hover',
			),
			$modula_preset_timing( 280, 10, 35 ),
			$modula_preset_slots( 12, 16, 12, 30, 12, 46 ),
			'rgba(16,24,39,.3)',
			30
		),
		$modula_hover_preset(
			'editorial-corner-right',
			'Editorial corner right',
			'Clean top-right editorial layout: stacked copy reveals on hover.',
			true,
			array(
				'cardTreatment' => 'none',
				'dimOverlay'    => true,
				'titleEnter'    => 'slide-left',
				'captionEnter'  => 'slide-left',
				'socialEnter'   => 'fade',
				'visibility'    => 'on-hover',
			),
			$modula_preset_timing( 280, 10, 35 ),
			$modula_preset_slots( 88, 16, 88, 30, 88, 46 ),
			'rgba(15,23,42,.34)',
			34
		),
		$modula_hover_preset(
			'monochrome-frame',
			'Monochrome',
			'Grayscale editorial hover with compact stacked content.',
			true,
			array(
				'cardTreatment' => 'grayscale',
				'dimOverlay'    => true,
				'titleEnter'    => 'slide-up',
				'captionEnter'  => 'slide-up',
				'socialEnter'   => 'fade',
				'visibility'    => 'on-hover',
			),
			$modula_preset_timing( 300, 15, 45 ),
			$modula_preset_slots( 50, 24, 50, 42, 50, 62 ),
			'rgba(15,17,21,.36)',
			36
		),
		$modula_hover_preset(
			'social-strip-bottom',
			'Social strip bottom',
			'Keeps social actions predictable at the bottom while text enters above.',
			true,
			array(
				'cardTreatment' => 'none',
				'dimOverlay'    => true,
				'titleEnter'    => 'slide-down',
				'captionEnter'  => 'slide-right',
				'socialEnter'   => 'slide-up',
				'visibility'    => 'on-hover',
			),
			$modula_preset_timing( 300, 25, 55 ),
			$modula_preset_slots( 50, 20, 50, 36, 50, 88 ),
			'rgba(11,18,32,.56)',
			56,
			true
		),
		$modula_hover_preset(
			'product-card-clean',
			'Product card clean',
			'A restrained product/gallery hover: no tile motion, low overlay, bottom-stacked content.',
			true,
			array(
				'cardTreatment' => 'none',
				'dimOverlay'    => true,
				'titleEnter'    => 'fade',
				'captionEnter'  => 'slide-up',
				'socialEnter'   => 'fade',
				'visibility'    => 'on-hover',
			),
			$modula_preset_timing( 240, 0, 25 ),
			$modula_preset_slots( 50, 70, 50, 82, 50, 92 ),
			'rgba(0,0,0,.24)',
			24
		),
		$modula_hover_preset(
			'soft-zoom-stack',
			'Soft zoom stack',
			'Friendly modern preset with soft zoom and bottom stacked metadata.',
			true,
			array(
				'cardTreatment' => 'zoom',
				'dimOverlay'    => true,
				'titleEnter'    => 'blur-in',
				'captionEnter'  => 'slide-up',
				'socialEnter'   => 'slide-up',
				'visibility'    => 'on-hover',
			),
			$modula_preset_timing( 350, 35, 65 ),
			$modula_preset_slots( 50, 60, 50, 72, 50, 84 ),
			'rgba(15,23,42,.6)',
			60
		),
		$modula_hover_preset(
			'accessible-no-motion',
			'Accessible no motion',
			'No animation preset: content appears on hover without movement or scaling.',
			true,
			array(
				'cardTreatment' => 'none',
				'dimOverlay'    => true,
				'titleEnter'    => 'none',
				'captionEnter'  => 'none',
				'socialEnter'   => 'none',
				'visibility'    => 'on-hover',
			),
			$modula_preset_timing( 180, 0, 0 ),
			$modula_preset_slots( 50, 64, 50, 76, 50, 88 ),
			'rgba(0,0,0,.42)',
			42
		),
		$modula_simple_hover_preset( 'captions', 'Captions only', 'Title, caption and social fade in on hover; the image stays still.', 'none' ),
		$modula_simple_hover_preset( 'zoom', 'Zoom', 'The image zooms in slightly on hover.', 'zoom' ),
		$modula_simple_hover_preset( 'lift', 'Lift', 'The image lifts off the page with a soft shadow.', 'lift' ),
		$modula_simple_hover_preset( 'tilt', 'Tilt', 'The image tilts toward the pointer, like a card in the hand.', 'tilt' ),
		$modula_simple_hover_preset( 'spot', 'Spotlight', 'The image under the pointer stays bright while the others dim.', 'spotlight' ),
		$modula_simple_hover_preset( 'pan', 'Pan', 'The image drifts against the pointer inside its frame.', 'pan' ),
		// Images just appear. Galleries without a loading effect keep this.
		array(
			'id'           => 'none',
			'kind'         => 'entrance',
			'label'        => 'None',
			'description'  => 'Images appear without an entrance animation.',
			'galleryTypes' => Animation_Catalog::ALL_TYPES,
			'pro'          => false,
			'composition'  => array(),
		),
		$modula_entrance_preset( 'rise', 'Rise', 'Images fade in as they rise into place, one after another.' ),
		$modula_entrance_preset( 'develop', 'Develop', 'Each image is revealed from the bottom up while the photo settles from a zoom.' ),
		$modula_entrance_preset( 'sweep', 'Sweep', 'Rows sweep in from alternating sides.' ),
		$modula_entrance_preset( 'darkroom', 'Darkroom', 'Images surface from black and come into focus.' ),
		$modula_entrance_preset( 'flip', 'Flip wave', 'Images flip into view in a wave across the gallery.' ),
		$modula_entrance_preset( 'drop', 'Drop and develop', 'Prints drop into place, then develop like an instant photo.' ),
		$modula_entrance_preset( 'deal', 'Deal the deck', 'Images start stacked in the centre and are dealt to their places.' ),
		$modula_entrance_preset( 'aperture', 'Aperture', 'Images open like a camera iris, from the centre outwards.' ),
		$modula_entrance_preset( 'curtain', 'Curtain', 'Images are revealed from left to right like a drawn curtain.' ),
		$modula_entrance_preset( 'letterbox', 'Letterbox', 'Images open from a thin horizontal band, like a film frame.' ),
		$modula_entrance_preset( 'pop', 'Pop', 'Images pop into place with a small bounce, one after another.' ),
	),
	/*
	 * The Motion tab menus, in the design's order. Labels are the design's
	 * short names; stored ids stay as they are. `offMenu` lists the presets the
	 * design drops by name. They stay extra options, listed while stored,
	 * rather than mapping to a menu entry: each plays a hover no entry plays
	 * (Portfolio lift slides its copy up under an overlay, Lift fades it in;
	 * None - with captions keeps the copy always visible, Captions only shows
	 * it on hover), so mapping would change live galleries.
	 */
	'menus'      => array(
		'hover'    => array(
			'hiddenForTypes' => array( 'story', 'slider', 'video' ),
			'items'          => array(
				array(
					'id'    => 'none',
					'label' => 'None',
				),
				array(
					'id'    => 'captions',
					'label' => 'Captions only',
				),
				array(
					'id'    => 'zoom',
					'label' => 'Zoom',
				),
				array(
					'id'    => 'lift',
					'label' => 'Lift',
				),
				array(
					'id'    => 'tilt',
					'label' => 'Tilt',
				),
				array(
					'id'    => 'spot',
					'label' => 'Spotlight',
				),
				array(
					'id'    => 'pan',
					'label' => 'Pan',
				),
				array(
					'id'    => 'balanced-reveal',
					'label' => 'Balanced reveal',
				),
				array(
					'id'    => 'center-hero',
					'label' => 'Center hero',
				),
				array(
					'id'    => 'caption-spotlight',
					'label' => 'Caption spotlight',
				),
				array(
					'id'    => 'cinematic-dark',
					'label' => 'Cinematic dark',
				),
				array(
					'id'    => 'editorial-corner-left',
					'label' => 'Corner tag left',
				),
				array(
					'id'    => 'editorial-corner-right',
					'label' => 'Corner tag right',
				),
				array(
					'id'    => 'monochrome-frame',
					'label' => 'Monochrome',
				),
				array(
					'id'    => 'social-strip-bottom',
					'label' => 'Social strip',
				),
				array(
					'id'    => 'product-card-clean',
					'label' => 'Product card',
				),
			),
			'offMenu'        => array( 'none-with-captions', 'portfolio-lift', 'soft-zoom-stack', 'accessible-no-motion' ),
			'recommended'    => array(
				'grid'                         => 'zoom',
				'justified-grid'               => 'zoom',
				// Spotlight dims every other tile, which reads as the whole grid darkening.
				'fit-grid'                     => 'zoom',
				'uniform-grid'                 => 'tilt',
				'polaroid'                     => 'none',
				'story'                        => 'none',
				'slider'                       => 'none',
				'creative-gallery'             => 'lift',
				'bnb'                          => 'zoom',
				'custom-grid'                  => 'pan',
				'video'                        => 'none',
				// Showcase text shows only on hover, so Auto brings the captions.
				'showcase'                     => 'captions',
				'parallax-masonry'             => 'zoom',
				Animation_Catalog::OTHER_TYPES => 'zoom',
			),
		),
		'entrance' => array(
			'hiddenForTypes' => array(),
			'items'          => array(
				array(
					'id'    => 'none',
					'label' => 'None',
				),
				array(
					'id'    => 'rise',
					'label' => 'Rise',
				),
				array(
					'id'    => 'develop',
					'label' => 'Develop',
				),
				array(
					'id'    => 'sweep',
					'label' => 'Sweep',
				),
				array(
					'id'    => 'darkroom',
					'label' => 'Darkroom',
				),
				array(
					'id'    => 'flip',
					'label' => 'Flip wave',
				),
				array(
					'id'    => 'drop',
					'label' => 'Drop and develop',
				),
				array(
					'id'    => 'deal',
					'label' => 'Deal the deck',
				),
				array(
					'id'    => 'aperture',
					'label' => 'Aperture',
				),
				array(
					'id'    => 'curtain',
					'label' => 'Curtain',
				),
				array(
					'id'    => 'letterbox',
					'label' => 'Letterbox',
				),
				array(
					'id'    => 'pop',
					'label' => 'Pop',
				),
			),
			'offMenu'        => array(),
			'recommended'    => array(
				'grid'                         => 'develop',
				'justified-grid'               => 'sweep',
				'fit-grid'                     => 'darkroom',
				'uniform-grid'                 => 'flip',
				'polaroid'                     => 'drop',
				'story'                        => 'rise',
				'slider'                       => 'curtain',
				'creative-gallery'             => 'deal',
				'bnb'                          => 'curtain',
				'custom-grid'                  => 'aperture',
				'video'                        => 'letterbox',
				'showcase'                     => 'deal',
				'parallax-masonry'             => 'sweep',
				Animation_Catalog::OTHER_TYPES => 'rise',
			),
		),
	),
);
