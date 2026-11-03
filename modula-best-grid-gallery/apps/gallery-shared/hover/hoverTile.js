/**
 * The hover classes and tile vars a tile gets for a hover builder: what the
 * PHP item processor (`process_hover_effects`) gives a visitor tile, built in
 * the browser so an editor canvas follows every edit. The gallery editor's
 * preview and hover builder card use it, and so does the Pro Albums editor
 * canvas (its tiles play the album's Motion hover). The tile stylesheet is
 * apps/frontend-gallery/_hover-v2.scss.
 *
 * @package
 */

import {
	isEnabledFlag,
	mergeSlotPositions,
	readHoverBuilderKey,
	SLOT_IDS,
} from './hoverBuilderKeys';
import {
	buildHoverSlotRailStyleVars,
	buildHoverSlotStackStyleVars,
} from './hoverSlotRails';
import { resolveHoverDimCssVars } from '../utils/resolveHoverDimCssVars';

/**
 * @typedef {Object} HoverDimInput
 * @property {string} hoverColor      Dim color (its tint is used).
 * @property {number} hoverOpacityPct Strength of the dim, 0–100.
 */

/**
 * @typedef {Object} HoverTile
 * @property {string}                 className Space-separated `modula-item modula-hover-*` tile classes.
 * @property {Record<string, string>} style     `--modula-hover-*` tile custom properties.
 */

/**
 * @param {unknown} value
 * @param {number}  fallback
 * @param {number}  min
 * @param {number}  max
 * @return {number} Whole milliseconds within min–max; the fallback for a non-number.
 */
function clampMs(value, fallback, min, max) {
	const raw = Number(value);
	if (!Number.isFinite(raw)) {
		return fallback;
	}
	return Math.min(max, Math.max(min, Math.round(raw)));
}

/**
 * @param {Record<string, any>}          builder
 * @param {'title'|'caption'|'social'}   slot
 * @param {'Duration'|'Delay'|'Stagger'} kind
 * @param {number}                       fallback
 * @param {number}                       min
 * @param {number}                       max
 * @return {number} The slot's timing in milliseconds.
 */
function readSlotTiming(builder, slot, kind, fallback, min, max) {
	const key = `${slot}Enter${kind}Ms`;
	return clampMs(readHoverBuilderKey(builder, key), fallback, min, max);
}

/**
 * @param {Record<string, any>} builder
 * @return {{
 *   positions: Record<string, {x:number,y:number}>,
 *   cardTreatment: string,
 *   dimOverlayOn: boolean,
 *   titleEnter: string,
 *   captionEnter: string,
 *   socialEnter: string,
 *   graphicElement: string,
 *   graphicVisibility: string,
 *   titleVisibility: string,
 *   captionVisibility: string,
 *   socialVisibility: string,
 * }} What the builder plays, with the defaults where it says nothing.
 */
export function getHoverBuilderCardState(builder) {
	return {
		positions: mergeSlotPositions(builder),
		cardTreatment: readHoverBuilderKey(builder, 'cardTreatment') || 'none',
		dimOverlayOn: isEnabledFlag(readHoverBuilderKey(builder, 'dimOverlay')),
		titleEnter: readHoverBuilderKey(builder, 'titleEnter') || 'fade',
		captionEnter: readHoverBuilderKey(builder, 'captionEnter') || 'fade',
		socialEnter: readHoverBuilderKey(builder, 'socialEnter') || 'fade',
		graphicElement:
			readHoverBuilderKey(builder, 'graphicElement') || 'none',
		graphicVisibility:
			readHoverBuilderKey(builder, 'graphicVisibility') || 'on-hover',
		titleVisibility:
			readHoverBuilderKey(builder, 'titleVisibility') || 'on-hover',
		captionVisibility:
			readHoverBuilderKey(builder, 'captionVisibility') || 'on-hover',
		socialVisibility:
			readHoverBuilderKey(builder, 'socialVisibility') || 'on-hover',
	};
}

/**
 * @param {{
 *   cardTreatment: string,
 *   dimOverlayOn: boolean,
 *   titleEnter: string,
 *   captionEnter: string,
 *   socialEnter: string,
 *   graphicElement: string,
 *   graphicVisibility: string,
 *   titleVisibility: string,
 *   captionVisibility: string,
 *   socialVisibility: string,
 *   captionBelowImage?: boolean,
 *   forceHover?: boolean,
 * }} state
 * @return {string} The tile's space-separated hover classes.
 */
export function buildHoverBuilderItemClassName(state) {
	const itemClassParts = [
		'modula-item',
		'modula-hover-v2',
		'modula-hover-v2--free-slots',
	];
	if (state.forceHover) {
		itemClassParts.push('is-forced-hover');
	}
	if (state.cardTreatment && state.cardTreatment !== 'none') {
		itemClassParts.push(`modula-hover-card--${state.cardTreatment}`);
	}
	if (state.dimOverlayOn) {
		itemClassParts.push('modula-hover-card--dim-addon');
	}
	if (state.graphicElement && state.graphicElement !== 'none') {
		itemClassParts.push(`modula-hover-graphic--${state.graphicElement}`);
		if (state.graphicVisibility === 'always') {
			itemClassParts.push('modula-hover-graphic-visibility--always');
		}
	}

	const enters = {
		title: state.titleEnter,
		caption: state.captionEnter,
		social: state.socialEnter,
	};
	const visibility = {
		title: state.titleVisibility,
		caption: state.captionVisibility,
		social: state.socialVisibility,
	};
	SLOT_IDS.forEach((slot) => {
		if (
			state.captionBelowImage &&
			(slot === 'title' || slot === 'caption')
		) {
			return;
		}
		const vis = visibility[slot];
		if (vis === 'on-hover') {
			itemClassParts.push(`modula-hover-visibility--${slot}--on-hover`);
		} else if (vis && vis !== 'on-hover') {
			itemClassParts.push(`modula-hover-visibility--${slot}--${vis}`);
		}
		const ent = enters[slot];
		if (vis === 'on-hover' && ent && ent !== 'none') {
			itemClassParts.push(`modula-hover-enter--${slot}--${ent}`);
		}
		if (vis === 'hide-on-hover' && ent && ent !== 'none') {
			itemClassParts.push(`modula-hover-exit--${slot}--${ent}`);
		}
	});
	return itemClassParts.join(' ');
}

/**
 * @param {Record<string, {x:number,y:number}>} positions
 * @return {Array<'title'|'caption'|'social'>} The slots top to bottom, then left to right.
 */
export function getSlotOrderFromPositions(positions) {
	/** @type {Array<'title'|'caption'|'social'>} */
	const slots = ['title', 'caption', 'social'];
	return [...slots].sort((a, b) => {
		const ay = Number(positions?.[a]?.y ?? 50);
		const by = Number(positions?.[b]?.y ?? 50);
		if (ay !== by) {
			return ay - by;
		}
		const ax = Number(positions?.[a]?.x ?? 50);
		const bx = Number(positions?.[b]?.x ?? 50);
		return ax - bx;
	});
}

/**
 * @param {{
 *   builder: Record<string, any>,
 *   positions: Record<string, {x:number,y:number}>,
 *   dimOverlayOn: boolean,
 *   hoverColor: string,
 *   hoverOpacityPct: number,
 * }} args
 * @return {Record<string, string>} The tile's `--modula-hover-*` custom properties.
 */
export function buildHoverBuilderItemStyle(args) {
	const slotOrder = getSlotOrderFromPositions(args.positions);
	const slotOrderIndex = (slotId) => {
		const idx = slotOrder.indexOf(
			/** @type {'title'|'caption'|'social'} */ (slotId)
		);
		return idx >= 0 ? idx : 0;
	};
	const titleDurationMs = readSlotTiming(
		args.builder,
		'title',
		'Duration',
		280,
		120,
		1200
	);
	const captionDurationMs = readSlotTiming(
		args.builder,
		'caption',
		'Duration',
		280,
		120,
		1200
	);
	const socialDurationMs = readSlotTiming(
		args.builder,
		'social',
		'Duration',
		280,
		120,
		1200
	);
	const cardDurationMs = clampMs(
		readHoverBuilderKey(args.builder, 'cardEnterDurationMs'),
		280,
		120,
		1200
	);
	const cardDelayMs = clampMs(
		readHoverBuilderKey(args.builder, 'cardEnterDelayMs'),
		0,
		0,
		600
	);
	const titleDelayMs = readSlotTiming(
		args.builder,
		'title',
		'Delay',
		0,
		0,
		600
	);
	const captionDelayMs = readSlotTiming(
		args.builder,
		'caption',
		'Delay',
		0,
		0,
		600
	);
	const socialDelayMs = readSlotTiming(
		args.builder,
		'social',
		'Delay',
		0,
		0,
		600
	);
	const titleStaggerMs = readSlotTiming(
		args.builder,
		'title',
		'Stagger',
		45,
		0,
		300
	);
	const captionStaggerMs = readSlotTiming(
		args.builder,
		'caption',
		'Stagger',
		45,
		0,
		300
	);
	const socialStaggerMs = readSlotTiming(
		args.builder,
		'social',
		'Stagger',
		45,
		0,
		300
	);
	const style = {
		'--modula-hover-enter-duration-title': `${titleDurationMs}ms`,
		'--modula-hover-enter-duration-caption': `${captionDurationMs}ms`,
		'--modula-hover-enter-duration-social': `${socialDurationMs}ms`,
		'--modula-hover-card-enter-duration': `${cardDurationMs}ms`,
		'--modula-hover-card-enter-delay': `${cardDelayMs}ms`,
		'--modula-hover-enter-delay-title': `${titleDelayMs + titleStaggerMs * slotOrderIndex('title')}ms`,
		'--modula-hover-enter-delay-caption': `${captionDelayMs + captionStaggerMs * slotOrderIndex('caption')}ms`,
		'--modula-hover-enter-delay-social': `${socialDelayMs + socialStaggerMs * slotOrderIndex('social')}ms`,
		...buildHoverSlotRailStyleVars(args.positions),
		...buildHoverSlotStackStyleVars(args.positions, slotOrder),
	};

	if (args.dimOverlayOn) {
		// An unreadable Dim color still darkens, in black.
		const dim = resolveHoverDimCssVars(
			args.hoverColor,
			args.hoverOpacityPct
		);
		style['--modula-hover-overlay-tint'] = dim ? dim.tint : '#000000';
		style['--modula-hover-dim-active-opacity'] = String(
			args.hoverOpacityPct / 100
		);
	}

	return style;
}

/**
 * Dim color and strength from the gallery's grouped `hover` settings, with
 * the visitor defaults (50% black).
 *
 * @param {Record<string, any>|null|undefined} hover
 * @return {HoverDimInput} The Dim color and its strength.
 */
export function readHoverDimInput(hover) {
	const hoverColorRaw =
		typeof hover?.hoverColor === 'string' ? hover.hoverColor.trim() : '';
	const hoverOpacityNum = Number(hover?.hoverOpacity);
	return {
		hoverColor: hoverColorRaw || 'rgba(0,0,0,.5)',
		hoverOpacityPct: Number.isFinite(hoverOpacityNum)
			? Math.min(100, Math.max(0, Math.round(hoverOpacityNum)))
			: 50,
	};
}

/**
 * The hover classes and tile vars of a tile that plays `builder`. Null
 * without a builder, as the item processor then adds nothing.
 *
 * @param {{
 *   builder: unknown,
 *   dim: HoverDimInput,
 *   captionBelowImage: boolean,
 * }} args
 * @return {HoverTile|null} The tile's hover classes and vars; null without a builder.
 */
export function buildHoverTile({ builder, dim, captionBelowImage }) {
	if (!builder || typeof builder !== 'object') {
		return null;
	}
	const cardState = getHoverBuilderCardState(builder);
	return {
		className: buildHoverBuilderItemClassName({
			...cardState,
			captionBelowImage,
		}),
		style: buildHoverBuilderItemStyle({
			builder,
			positions: cardState.positions,
			dimOverlayOn: cardState.dimOverlayOn,
			...dim,
		}),
	};
}

/**
 * The live hover classes and tile vars of a gallery preview tile, built from
 * the form so the preview follows every edit: the Dim color and strength are
 * the gallery's `hover.hoverColor` / `hover.hoverOpacity`.
 *
 * @param {{
 *   builder: unknown,
 *   hover: Record<string, any>|null|undefined,
 *   captionBelowImage: boolean,
 * }} args
 * @return {HoverTile|null} The tile's hover classes and vars; null without a builder.
 */
export function buildPreviewHoverTile({ builder, hover, captionBelowImage }) {
	return buildHoverTile({
		builder,
		dim: readHoverDimInput(hover),
		captionBelowImage,
	});
}
