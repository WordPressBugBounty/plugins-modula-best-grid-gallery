import { getAnimationPresets } from '../../data/animationCatalog';

/**
 * The animation catalog's hover presets, in the shape the builder applies:
 * `builder` is `hover.builder` (without `sourcePresetId`), `hover` the overlay
 * keys beside it. Catalog order is the preset menu order.
 */
export const HOVER_BUILDER_PRESETS = getAnimationPresets('hover').map(
	(preset) => ({
		id: preset.id,
		label: preset.label,
		description: preset.description,
		pro: preset.pro,
		builder: preset.composition.builder,
		hover: preset.composition.hover,
	})
);

/**
 * The hover presets a builder also plays at older slot positions
 * (`composition.legacySlotPositions`: the simple moves, at the default
 * builder's slots before they moved to the bottom), as
 * `Animation_Catalog::legacy_hover_builders()` in PHP.
 */
const LEGACY_HOVER_BUILDER_PRESETS = getAnimationPresets('hover')
	.filter((preset) => preset.composition.legacySlotPositions)
	.map((preset) => ({
		id: preset.id,
		builder: {
			...preset.composition.builder,
			slotPositions: preset.composition.legacySlotPositions,
		},
	}));

/**
 * @param {unknown}                                   builder `hover.builder`.
 * @param {(current: Object, preset: Object) => boolean} matches Compares the normalized builder with a normalized preset builder.
 * @return {string} The first preset the builder plays, then the first it
 * plays at older slot positions (as PHP `Hover_Builder_Policy`); empty for none.
 */
function findPresetIdPlayedBy(builder, matches) {
	const current = normalizeBuilderForPresetCompare(builder);
	const matched = [
		...HOVER_BUILDER_PRESETS,
		...LEGACY_HOVER_BUILDER_PRESETS,
	].find((preset) =>
		matches(current, normalizeBuilderForPresetCompare(preset.builder))
	);
	return matched ? matched.id : '';
}

function normalizeBuilderForPresetCompare(builder) {
	const slotPositions =
		builder?.slotPositions && typeof builder.slotPositions === 'object'
			? builder.slotPositions
			: {};
	const readXY = (slotId, axis, fallback) => {
		const value = slotPositions?.[slotId]?.[axis];
		const n = Number(value);
		if (!Number.isFinite(n)) {
			return fallback;
		}
		return Math.min(100, Math.max(0, Math.round(n)));
	};
	return {
		cardTreatment:
			typeof builder?.cardTreatment === 'string'
				? builder.cardTreatment
				: 'none',
		graphicElement:
			typeof builder?.graphicElement === 'string'
				? builder.graphicElement
				: 'none',
		graphicVisibility:
			builder?.graphicVisibility === 'always' ? 'always' : 'on-hover',
		dimOverlay:
			builder?.dimOverlay === true ||
			builder?.dimOverlay === 1 ||
			builder?.dimOverlay === '1',
		titleEnter:
			typeof builder?.titleEnter === 'string'
				? builder.titleEnter
				: 'fade',
		captionEnter:
			typeof builder?.captionEnter === 'string'
				? builder.captionEnter
				: 'fade',
		socialEnter:
			typeof builder?.socialEnter === 'string'
				? builder.socialEnter
				: 'fade',
		titleVisibility:
			typeof builder?.titleVisibility === 'string'
				? builder.titleVisibility
				: 'on-hover',
		captionVisibility:
			typeof builder?.captionVisibility === 'string'
				? builder.captionVisibility
				: 'on-hover',
		socialVisibility:
			typeof builder?.socialVisibility === 'string'
				? builder.socialVisibility
				: 'on-hover',
		cardEnterDurationMs: (() => {
			const n = Number(builder?.cardEnterDurationMs);
			return Number.isFinite(n)
				? Math.min(1200, Math.max(120, Math.round(n)))
				: 280;
		})(),
		cardEnterDelayMs: (() => {
			const n = Number(builder?.cardEnterDelayMs);
			return Number.isFinite(n)
				? Math.min(600, Math.max(0, Math.round(n)))
				: 0;
		})(),
		titleEnterDurationMs: (() => {
			const n = Number(builder?.titleEnterDurationMs);
			return Number.isFinite(n)
				? Math.min(1200, Math.max(120, Math.round(n)))
				: 280;
		})(),
		captionEnterDurationMs: (() => {
			const n = Number(builder?.captionEnterDurationMs);
			return Number.isFinite(n)
				? Math.min(1200, Math.max(120, Math.round(n)))
				: 280;
		})(),
		socialEnterDurationMs: (() => {
			const n = Number(builder?.socialEnterDurationMs);
			return Number.isFinite(n)
				? Math.min(1200, Math.max(120, Math.round(n)))
				: 280;
		})(),
		titleEnterDelayMs: (() => {
			const n = Number(builder?.titleEnterDelayMs);
			return Number.isFinite(n)
				? Math.min(600, Math.max(0, Math.round(n)))
				: 0;
		})(),
		captionEnterDelayMs: (() => {
			const n = Number(builder?.captionEnterDelayMs);
			return Number.isFinite(n)
				? Math.min(600, Math.max(0, Math.round(n)))
				: 0;
		})(),
		socialEnterDelayMs: (() => {
			const n = Number(builder?.socialEnterDelayMs);
			return Number.isFinite(n)
				? Math.min(600, Math.max(0, Math.round(n)))
				: 0;
		})(),
		titleEnterStaggerMs: (() => {
			const n = Number(builder?.titleEnterStaggerMs);
			return Number.isFinite(n)
				? Math.min(300, Math.max(0, Math.round(n)))
				: 45;
		})(),
		captionEnterStaggerMs: (() => {
			const n = Number(builder?.captionEnterStaggerMs);
			return Number.isFinite(n)
				? Math.min(300, Math.max(0, Math.round(n)))
				: 45;
		})(),
		socialEnterStaggerMs: (() => {
			const n = Number(builder?.socialEnterStaggerMs);
			return Number.isFinite(n)
				? Math.min(300, Math.max(0, Math.round(n)))
				: 45;
		})(),
		slotPositions: {
			title: {
				x: readXY('title', 'x', 50),
				y: readXY('title', 'y', 18),
			},
			caption: {
				x: readXY('caption', 'x', 50),
				y: readXY('caption', 'y', 50),
			},
			social: {
				x: readXY('social', 'x', 50),
				y: readXY('social', 'y', 82),
			},
		},
	};
}

export function getMatchingPresetId(builder) {
	return findPresetIdPlayedBy(
		builder,
		(current, candidate) =>
			sameNormalizedMotion(current, candidate) &&
			current.dimOverlay === candidate.dimOverlay
	);
}

/**
 * The preset a builder plays, leaving `dimOverlay` out because Darken on
 * hover owns it (`Hover_Builder_Policy::matching_motion_preset_id()` in PHP).
 *
 * @param {unknown} builder `hover.builder`.
 * @return {string} Preset id; empty when the builder plays none of them.
 */
export function getMatchingMotionPresetId(builder) {
	return findPresetIdPlayedBy(builder, sameNormalizedMotion);
}

/**
 * @param {unknown} a `hover.builder`.
 * @param {unknown} b `hover.builder`.
 * @return {boolean} Both play the same hover, `dimOverlay` aside (`Hover_Builder_Policy::same_motion()`).
 */
export function sameHoverMotion(a, b) {
	return sameNormalizedMotion(
		normalizeBuilderForPresetCompare(a),
		normalizeBuilderForPresetCompare(b)
	);
}

/**
 * @param {Object} current   A normalized builder.
 * @param {Object} candidate A normalized builder.
 * @return {boolean} Both play the same hover, `dimOverlay` aside.
 */
function sameNormalizedMotion(current, candidate) {
	return (
		current.cardTreatment === candidate.cardTreatment &&
		current.graphicElement === candidate.graphicElement &&
		current.graphicVisibility === candidate.graphicVisibility &&
		current.titleEnter === candidate.titleEnter &&
		current.captionEnter === candidate.captionEnter &&
		current.socialEnter === candidate.socialEnter &&
		current.titleVisibility === candidate.titleVisibility &&
		current.captionVisibility === candidate.captionVisibility &&
		current.socialVisibility === candidate.socialVisibility &&
		current.cardEnterDurationMs === candidate.cardEnterDurationMs &&
		current.cardEnterDelayMs === candidate.cardEnterDelayMs &&
		current.titleEnterDurationMs === candidate.titleEnterDurationMs &&
		current.captionEnterDurationMs === candidate.captionEnterDurationMs &&
		current.socialEnterDurationMs === candidate.socialEnterDurationMs &&
		current.titleEnterDelayMs === candidate.titleEnterDelayMs &&
		current.captionEnterDelayMs === candidate.captionEnterDelayMs &&
		current.socialEnterDelayMs === candidate.socialEnterDelayMs &&
		current.titleEnterStaggerMs === candidate.titleEnterStaggerMs &&
		current.captionEnterStaggerMs === candidate.captionEnterStaggerMs &&
		current.socialEnterStaggerMs === candidate.socialEnterStaggerMs &&
		current.slotPositions.title.x === candidate.slotPositions.title.x &&
		current.slotPositions.title.y === candidate.slotPositions.title.y &&
		current.slotPositions.caption.x === candidate.slotPositions.caption.x &&
		current.slotPositions.caption.y === candidate.slotPositions.caption.y &&
		current.slotPositions.social.x === candidate.slotPositions.social.x &&
		current.slotPositions.social.y === candidate.slotPositions.social.y
	);
}

/**
 * Writes a preset into the form: the builder, Darken on hover from the
 * builder, and the preset's overlay colour and opacity.
 *
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {Object}                                 preset A `HOVER_BUILDER_PRESETS` entry.
 */
export function applyHoverPresetToForm(form, preset) {
	const current = form.getFieldValue('hover.builder');
	const nextBuilder = applyHoverPreset(
		current && typeof current === 'object' ? current : {},
		preset
	);
	form.setFieldValue('hover.builder', nextBuilder);
	form.setFieldValue('hover.dimOverlay', !!nextBuilder.dimOverlay);
	if (preset.hover) {
		form.setFieldValue('hover.hoverColor', preset.hover.hoverColor);
		form.setFieldValue('hover.hoverOpacity', preset.hover.hoverOpacity);
	}
}

export function applyHoverPreset(baseBuilder, preset) {
	const next = {
		cardTreatment: preset.builder.cardTreatment,
		graphicElement: preset.builder.graphicElement || 'none',
		graphicVisibility: preset.builder.graphicVisibility || 'on-hover',
		dimOverlay: preset.builder.dimOverlay,
		titleEnter: preset.builder.titleEnter,
		captionEnter: preset.builder.captionEnter,
		socialEnter: preset.builder.socialEnter,
		titleVisibility: preset.builder.titleVisibility || 'on-hover',
		captionVisibility: preset.builder.captionVisibility || 'on-hover',
		socialVisibility: preset.builder.socialVisibility || 'on-hover',
		cardEnterDurationMs: preset.builder.cardEnterDurationMs,
		cardEnterDelayMs: preset.builder.cardEnterDelayMs,
		titleEnterDurationMs: preset.builder.titleEnterDurationMs,
		captionEnterDurationMs: preset.builder.captionEnterDurationMs,
		socialEnterDurationMs: preset.builder.socialEnterDurationMs,
		titleEnterDelayMs: preset.builder.titleEnterDelayMs,
		captionEnterDelayMs: preset.builder.captionEnterDelayMs,
		socialEnterDelayMs: preset.builder.socialEnterDelayMs,
		titleEnterStaggerMs: preset.builder.titleEnterStaggerMs,
		captionEnterStaggerMs: preset.builder.captionEnterStaggerMs,
		socialEnterStaggerMs: preset.builder.socialEnterStaggerMs,
		slotPositions: {
			title: { ...preset.builder.slotPositions.title },
			caption: { ...preset.builder.slotPositions.caption },
			social: { ...preset.builder.slotPositions.social },
		},
		sourcePresetId: typeof preset.id === 'string' ? preset.id : '',
	};
	return next;
}
