/**
 * Stored Motion choices at render time (visitor gallery and editor preview):
 * what a `motion.*` choice plays, as `Motion_Settings::resolve()` does in
 * PHP, and the entrance and hover builder it plays. The data is the animation catalog's runtime
 * projection (`Animation_Catalog::runtime_data()`), generated from
 * includes/v2/motion/data/animation-catalog.php by
 * `npm run generate:settings-schemas` and committed beside this module.
 *
 * @package
 */

import motionRuntime from './modula-motion-runtime.json';
import {
	DEFAULT_GALLERY_TYPE,
	isGalleryTypeWithoutLoadingEffects,
} from '../constants/galleryLayoutDefaults';

/** Stored `motion.entrance` / `motion.hover`: the recommendation for the gallery type. */
export const MOTION_AUTO = 'auto';

/** Stored `motion.*`: the gallery's own loading effects or hover builder. */
export const MOTION_CUSTOM = 'custom';

/** Key of a `recommended` table for every gallery type it does not list. */
const OTHER_GALLERY_TYPES = 'others';

/** `motion.speed` when the stored value is missing or unknown. */
const DEFAULT_SPEED = 'normal';

/**
 * The Motion tab's "This layout" options (`motion.{option}`) and the gallery
 * type each one plays on; the editor places them on the same types.
 */
const LAYOUT_MOTION_GALLERY_TYPES = Object.freeze({
	widen: 'justified-grid',
	movePrints: 'polaroid',
});

/**
 * @typedef {Object} EntranceTrack
 * @property {'tile'|'image'}                             target      The item, or the image inside it.
 * @property {Object[]}                                   keyframes   Web Animations keyframes; strings may name per-item values ({dx}, {fit}, …).
 * @property {{ by: 'row'|'index', keyframes: Object[] }} [alternate] Keyframes for odd rows or odd items.
 * @property {Record<string, number>}                     durationMs  `base` plus a factor per item variable.
 * @property {Record<string, number>}                     delayMs     `base` plus a factor per item variable.
 * @property {string}                                     [easing]    Web Animations easing; the runtime's default when missing.
 */

/**
 * The preset a Motion menu recommends for a gallery type (its row of the
 * `recommended` table, else the `others` row). It may still be pending.
 *
 * @param {'hover'|'entrance'} kind
 * @param {string}             galleryType `general.type`.
 * @return {string} Preset id; empty for an unknown menu.
 */
export function getMotionRecommendation(kind, galleryType) {
	const table = motionRuntime.recommended[kind] ?? {};
	return table[galleryType] ?? table[OTHER_GALLERY_TYPES] ?? '';
}

/**
 * What a stored Motion choice plays: an explicit value as stored; `auto` the
 * recommendation, or `custom` while the recommended preset is still pending.
 * The editor's Motion menus use this same rule through the public
 * `gallery-shared/motionRules` entry.
 *
 * @param {'hover'|'entrance'} kind
 * @param {string}             choice      Stored `motion.{kind}`.
 * @param {string}             galleryType `general.type`.
 * @return {string} A catalog preset id or `custom`.
 */
export function resolveMotionChoice(kind, choice, galleryType) {
	if (choice !== MOTION_AUTO) {
		return choice;
	}
	const recommended = getMotionRecommendation(kind, galleryType);
	const presetIds = motionRuntime.presetIds[kind] ?? [];
	return presetIds.includes(recommended) ? recommended : MOTION_CUSTOM;
}

/**
 * @param {Object|null|undefined} settings Grouped settings.
 * @return {string} The gallery type its Motion choices resolve against.
 */
export function galleryTypeOf(settings) {
	return settings?.general?.type || DEFAULT_GALLERY_TYPE;
}

/**
 * The entrance a gallery plays. A gallery without `motion.entrance` (saved
 * before the Motion settings and not migrated, e.g. a Pro album) keeps its
 * loading effects.
 *
 * @param {Object|null|undefined} settings Grouped settings.
 * @return {string} A catalog entrance preset id, or `custom` for the loading effects.
 */
export function resolveGalleryEntrance(settings) {
	const choice = settings?.motion?.entrance;
	if (typeof choice !== 'string') {
		return MOTION_CUSTOM;
	}
	return resolveMotionChoice('entrance', choice, galleryTypeOf(settings));
}

/**
 * The loading effects (scale / rotate / slide) are the entrance's `custom`
 * choice, so they play only while it is chosen, and never on the layouts
 * that have no loading effects.
 *
 * @param {Object|null|undefined} settings Grouped settings.
 * @return {boolean} The gallery's loading effects play.
 */
export function playsLoadingEffects(settings) {
	return (
		!isGalleryTypeWithoutLoadingEffects(galleryTypeOf(settings)) &&
		resolveGalleryEntrance(settings) === MOTION_CUSTOM
	);
}

/**
 * A "This layout" option plays only on its own gallery type, and only when it
 * is stored on: a gallery saved before the Motion settings has none of them.
 *
 * @param {Object|null|undefined} settings Grouped settings.
 * @param {'widen'|'movePrints'}  option   `motion.widen` (Justified) or `motion.movePrints` (Polaroid).
 * @return {boolean} The option plays on this gallery.
 */
export function playsLayoutMotion(settings, option) {
	return (
		LAYOUT_MOTION_GALLERY_TYPES[option] === galleryTypeOf(settings) &&
		settings?.motion?.[option] === true
	);
}

/**
 * @param {string} presetId Entrance preset id.
 * @return {EntranceTrack[]} What the preset plays; empty for None, `custom` and unknown ids.
 */
export function getEntranceTracks(presetId) {
	return motionRuntime.entrances[presetId] ?? [];
}

/**
 * @param {unknown} speed Stored `motion.speed`.
 * @return {number} Scale on every entrance duration and delay, and on every hover preset timing.
 */
export function getMotionSpeedScale(speed) {
	return (
		motionRuntime.speeds[speed] ?? motionRuntime.speeds[DEFAULT_SPEED] ?? 1
	);
}

/**
 * The hover builder a gallery plays, as `Motion_Settings::played_hover_builder()`
 * does for the visitor items: its own for `custom` (or a gallery without a
 * hover choice, or a value the catalog has no preset for), else the builder
 * of the preset the choice resolves to, every timing (`…Ms`) scaled by the
 * Motion speed. Darken on hover (`dimOverlay`) and the `sourcePresetId`
 * stamp stay the stored builder's.
 *
 * @param {Object|null|undefined} settings Grouped settings.
 * @return {Object|undefined} `hover.builder` as it plays; the stored value when it is not an object.
 */
export function resolveGalleryHoverBuilder(settings) {
	const stored = settings?.hover?.builder;
	const presetId = resolvePlayedHoverPreset(settings);
	if (!presetId) {
		return stored;
	}
	const played = getPlayedHoverBuilder(presetId, settings?.motion?.speed);
	for (const key of motionRuntime.storedBuilderKeys) {
		if (key in stored) {
			played[key] = stored[key];
		}
	}
	return played;
}

/**
 * A catalog hover preset's builder as it plays at a Motion speed: every
 * timing (`…Ms`) scaled. Darken on hover and the seed stamp
 * (Motion_Settings::STORED_BUILDER_KEYS) are left out: the gallery keeps its
 * stored builder's, and the Pro Albums canvas sets Darken on hover from the
 * album's own key.
 *
 * @param {string}  presetId Catalog hover preset id.
 * @param {unknown} speed    Stored `motion.speed`.
 * @return {Object|undefined} The builder; undefined when the catalog has no such preset.
 */
export function getPlayedHoverBuilder(presetId, speed) {
	if (
		!Object.prototype.hasOwnProperty.call(
			motionRuntime.hoverBuilders,
			presetId
		)
	) {
		return undefined;
	}
	const scale = getMotionSpeedScale(speed);
	const played = {};
	for (const [key, value] of Object.entries(
		motionRuntime.hoverBuilders[presetId]
	)) {
		if (motionRuntime.storedBuilderKeys.includes(key)) {
			continue;
		}
		played[key] = key.endsWith('Ms') ? Math.round(value * scale) : value;
	}
	return played;
}

/**
 * Whether the hover a gallery plays shows the social icons inline whatever
 * the desktop folding (`inlineSocial` in the catalog: Social strip).
 * prepareItemData() already undoes the folding that PHP writes into a row's
 * `hideSocials`, so this alone decides it, for the visitor and for the editor
 * preview, whose rows keep the saved settings.
 *
 * @param {Object|null|undefined} settings Grouped settings.
 * @return {boolean} "Collapsed on desktop" does not fold this gallery's social icons.
 */
export function showsInlineSocial(settings) {
	return motionRuntime.inlineSocialHovers.includes(
		resolvePlayedHoverPreset(settings)
	);
}

/**
 * The hover preset a gallery plays (resolveGalleryHoverBuilder()): none for
 * `custom`, a value the catalog has no preset for, or a gallery without a
 * hover choice or a stored builder, which all play their own builder.
 *
 * @param {Object|null|undefined} settings Grouped settings.
 * @return {string} A catalog hover preset id; empty when the gallery plays its own builder.
 */
function resolvePlayedHoverPreset(settings) {
	const stored = settings?.hover?.builder;
	const choice = settings?.motion?.hover;
	if (!stored || typeof stored !== 'object' || typeof choice !== 'string') {
		return '';
	}
	const presetId = resolveMotionChoice(
		'hover',
		choice,
		galleryTypeOf(settings)
	);
	return Object.prototype.hasOwnProperty.call(
		motionRuntime.hoverBuilders,
		presetId
	)
		? presetId
		: '';
}

/**
 * @return {string[]} Card treatments whose hover follows the pointer (`followsPointer` in the catalog).
 */
export function getPointerCardTreatments() {
	return motionRuntime.pointerCards;
}
