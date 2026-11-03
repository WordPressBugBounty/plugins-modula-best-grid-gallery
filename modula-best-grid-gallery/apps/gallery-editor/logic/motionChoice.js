/**
 * The Motion tab's Entrance and Hover menus (Motion ticket 03): the options a
 * menu lists, which hover preset a choice plays, how a hover builder edit
 * moves the hover choice, and how a loading effects edit moves the entrance
 * choice. The save rules in PHP (`Motion_Settings`) apply the same rules to
 * saves that write only the builder or the loading effects.
 */
import {
	MOTION_CUSTOM,
	galleryMotionCatalog,
	getMotionRecommendation,
	resolveMotionChoice,
} from '../data/animationCatalog';
import {
	HOVER_BUILDER_PRESETS,
	applyHoverPreset,
	applyHoverPresetToForm,
	getMatchingMotionPresetId,
	sameHoverMotion,
} from '../components/hover-effect-builder/hoverBuilderPresets';
import { isHoverPresetLocked } from '../utils/hoverBuilderEntitlements';
import { isWpTruthy } from './wpTruthy';

/** The stored hover choice. */
export const HOVER_CHOICE_PATH = 'motion.hover';

/** The stored entrance choice. */
export const ENTRANCE_CHOICE_PATH = 'motion.entrance';

/** Settings group of the loading effects, the entrance's own (`custom`) composition. */
const LOADING_EFFECTS_PATH_PREFIX = 'loadingEffects.';

/**
 * The menu for `motion.{kind}` (gallery-shared `createMotionCatalog`), with
 * the gallery type's recommendation and, in Lite, the Pro presets locked.
 *
 * @param {'hover'|'entrance'} kind
 * @param {Object}             context
 * @param {string}             context.value       Stored choice.
 * @param {string}             context.galleryType `general.type`.
 * @param {Object}             context.editor      Editor config (`isPro`).
 * @return {import('gallery-shared/motion/motionCatalog').MotionChoiceOption[]} Options in menu order.
 */
export function getMotionChoiceOptions(kind, { value, galleryType, editor }) {
	return galleryMotionCatalog.getMotionChoiceOptions(kind, {
		value,
		recommended: getMotionRecommendation(kind, galleryType),
		galleryType,
		isLocked: (preset) => isHoverPresetLocked(preset, editor),
	});
}

/**
 * @param {string} choice      Stored `motion.hover`.
 * @param {string} galleryType `general.type`.
 * @return {Object|null} The `HOVER_BUILDER_PRESETS` entry the choice plays; null for the own effect (`custom`).
 */
export function hoverPresetToPlay(choice, galleryType) {
	const played = resolveMotionChoice('hover', choice, galleryType);
	return HOVER_BUILDER_PRESETS.find((preset) => preset.id === played) ?? null;
}

/**
 * The hover builder a choice plays, at its own timings: the preset's, or the
 * stored builder for the own effect. The canvas adds the Motion speed
 * (`resolveGalleryHoverBuilder` in gallery-shared).
 *
 * @param {string}  choice      Stored `motion.hover`.
 * @param {unknown} builder     Stored `hover.builder`.
 * @param {string}  galleryType `general.type`.
 * @return {unknown} The preset's builder, or `builder`.
 */
export function hoverBuilderToPlay(choice, builder, galleryType) {
	return hoverPresetToPlay(choice, galleryType)?.builder ?? builder;
}

/**
 * The builder the Zoom on hover switch writes: the hover that plays with
 * another card treatment. A preset the choice plays but the builder does not
 * hold yet (an `auto` choice after a type switch) is seeded first. The
 * builder keeps its Darken on hover and its `sourcePresetId` stamp, as the
 * runtime does (`resolveGalleryHoverBuilder`): stamping a builder that had
 * none would hand a classic gallery's chrome to the hover builder
 * (`modula_settings_use_hover_builder()`). The overlay colour is not touched.
 *
 * @param {string}  choice        Stored `motion.hover`.
 * @param {unknown} builder       Stored `hover.builder`.
 * @param {string}  galleryType   `general.type`.
 * @param {string}  cardTreatment Card treatment to play.
 * @return {Object} The next `hover.builder`.
 */
export function hoverBuilderWithCardTreatment(
	choice,
	builder,
	galleryType,
	cardTreatment
) {
	const stored = builder && typeof builder === 'object' ? builder : {};
	const preset = hoverPresetToPlay(choice, galleryType);
	if (!preset || sameHoverMotion(stored, preset.builder)) {
		return { ...stored, cardTreatment };
	}
	return {
		...applyHoverPreset(stored, preset),
		dimOverlay: isWpTruthy(stored.dimOverlay),
		sourcePresetId:
			typeof stored.sourcePresetId === 'string'
				? stored.sourcePresetId
				: '',
		cardTreatment,
	};
}

/**
 * @param {string} choice      Stored `motion.entrance`.
 * @param {string} galleryType `general.type`.
 * @return {string} The entrance preset the choice plays, when it animates; empty for None and for the loading effects (`custom`), which have nothing to replay.
 */
export function entranceToReplay(choice, galleryType) {
	const played = resolveMotionChoice('entrance', choice, galleryType);
	return galleryMotionCatalog.entranceAnimates(played) ? played : '';
}

/**
 * Writes the preset a hover choice plays into the hover builder, unless the
 * builder already plays it (its Darken on hover and positions stay). The own
 * effect (`custom`) writes nothing.
 *
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {string}                                 choice `motion.hover`.
 */
export function playHoverChoiceInBuilder(form, choice) {
	const preset = hoverPresetToPlay(
		choice,
		String(form.getFieldValue('general.type') ?? '')
	);
	if (
		!preset ||
		sameHoverMotion(form.getFieldValue('hover.builder'), preset.builder)
	) {
		return;
	}
	applyHoverPresetToForm(form, preset);
}

/**
 * Field coupling of `motion.hover` (choosing or resetting it): the builder
 * takes the chosen preset, as the old preset menu did. The preview and the
 * frontend play the choice itself; the builder stays the copy the Zoom on
 * hover switch (and Customize, hidden for now) edits, and the one the
 * classic editor reads.
 * The preset also seeds its overlay colour, a setting of its own.
 *
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {string}                                 groupedPath
 * @param {unknown}                                value
 */
export function applyMotionHoverSideEffects(form, groupedPath, value) {
	if (groupedPath !== HOVER_CHOICE_PATH) {
		return;
	}
	playHoverChoiceInBuilder(form, String(value));
}

/**
 * Field coupling of the Loading effects section (More settings): editing or
 * resetting a loading effect makes the entrance Custom, the gallery's own
 * composition, since the loading effects play only then. The save rule in
 * PHP (`Motion_Settings::with_entrance_choice_from_loading_write()`) applies
 * the same rule to ability writes.
 *
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {string}                                 groupedPath
 */
export function applyMotionEntranceSideEffects(form, groupedPath) {
	if (
		!groupedPath.startsWith(LOADING_EFFECTS_PATH_PREFIX) ||
		form.getFieldValue(ENTRANCE_CHOICE_PATH) === MOTION_CUSTOM
	) {
		return;
	}
	form.setFieldValue(ENTRANCE_CHOICE_PATH, MOTION_CUSTOM);
}

/**
 * @typedef {Object} HoverChoiceState
 * @property {string}  choice      `motion.hover`.
 * @property {unknown} builder     `hover.builder`.
 * @property {string}  galleryType `general.type`.
 */

/**
 * The editor's copy of the PHP save rule, run on every form change: an edit
 * that changes what the builder plays, without setting the choice in the
 * same change, moves the choice (the builder, its preset JSON and Zoom on
 * hover write only the builder). A change that
 * sets both, such as a menu choice or Undo, is left alone.
 *
 * @param {HoverChoiceState} previous
 * @param {HoverChoiceState} current
 * @return {string|null} The `motion.hover` to write; null when it stays.
 */
export function hoverChoiceSync(previous, current) {
	if (
		current.choice !== previous.choice ||
		sameHoverMotion(previous.builder, current.builder)
	) {
		return null;
	}
	const next = hoverChoiceAfterBuilderEdit(
		current.choice,
		current.builder,
		current.galleryType
	);
	return next === current.choice ? null : next;
}

/**
 * The hover choice after the builder changed what it plays: kept while it
 * still plays the builder's preset (so `auto` stays `auto`), else the preset
 * the builder now plays, else Custom.
 *
 * @param {string}  choice      Stored `motion.hover`.
 * @param {unknown} builder     `hover.builder` after the edit.
 * @param {string}  galleryType `general.type`.
 * @return {string} The next `motion.hover`.
 */
export function hoverChoiceAfterBuilderEdit(choice, builder, galleryType) {
	const playing = getMatchingMotionPresetId(builder);
	if (playing === '') {
		return MOTION_CUSTOM;
	}
	return resolveMotionChoice('hover', choice, galleryType) === playing
		? choice
		: playing;
}
