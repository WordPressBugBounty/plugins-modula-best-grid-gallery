import {
	isEnabledFlag,
	mergeSlotPositions,
	readHoverBuilderKey,
	SLOT_IDS,
} from './hoverBuilderUtils';
import { buildHoverSlotRailStyleVars } from './hoverSlotRails';
import {
	formatHexColor,
	parseCssColor,
} from '../../utils/cssColorValue';

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clampMs(value, fallback, min, max) {
	const raw = Number(value);
	if (!Number.isFinite(raw)) {
		return fallback;
	}
	return Math.min(max, Math.max(min, Math.round(raw)));
}

/**
 * @param {Record<string, any>} builder
 * @param {'title'|'caption'|'social'} slot
 * @param {'Duration'|'Delay'|'Stagger'} kind
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function readSlotTiming(builder, slot, kind, fallback, min, max) {
	const key = `${slot}Enter${kind}Ms`;
	return clampMs(readHoverBuilderKey(builder, key), fallback, min, max);
}

/**
 * @param {Record<string, any>} builder
 * @returns {{
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
 * }}
 */
export function getHoverBuilderCardState(builder) {
	return {
		positions: mergeSlotPositions(builder),
		cardTreatment: readHoverBuilderKey(builder, 'cardTreatment') || 'zoom',
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
 * @returns {string}
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
 * @returns {Array<'title'|'caption'|'social'>}
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
 * @returns {Record<string, string>}
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
	};

	if (args.dimOverlayOn) {
		const tintParts = parseCssColor(args.hoverColor);
		style['--modula-hover-overlay-tint'] = tintParts
			? formatHexColor(tintParts)
			: '#000000';
		style['--modula-hover-dim-active-opacity'] = String(
			args.hoverOpacityPct / 100
		);
	}

	return style;
}

/**
 * @param {Record<string, {x:number,y:number}>} currentPos
 * @param {'title'|'caption'|'social'} slot
 * @param {{x:number,y:number}} next
 * @param {string[]} linkedOverlaySlots
 * @returns {Record<string, {x:number,y:number}>}
 */
export function buildCommittedSlotPositions(
	currentPos,
	slot,
	next,
	linkedOverlaySlots
) {
	let nextPos = {
		...currentPos,
		[slot]: next,
	};
	const linkedSlots = Array.isArray(linkedOverlaySlots)
		? linkedOverlaySlots.filter((id) => SLOT_IDS.includes(id))
		: [];
	const shouldMoveLinked =
		linkedSlots.length > 1 &&
		linkedSlots.includes(slot) &&
		(slot === 'title' || slot === 'caption' || slot === 'social');
	if (!shouldMoveLinked) {
		return nextPos;
	}

	const from = currentPos[slot];
	const dx = next.x - from.x;
	const dy = next.y - from.y;
	/** @param {'title'|'caption'|'social'} slotId */
	const nextSlotPos = (slotId) => ({
		x: linkedSlots.includes(slotId)
			? Math.min(100, Math.max(0, Math.round(currentPos[slotId].x + dx)))
			: currentPos[slotId].x,
		y: linkedSlots.includes(slotId)
			? Math.min(100, Math.max(0, Math.round(currentPos[slotId].y + dy)))
			: currentPos[slotId].y,
	});

	nextPos = {
		...nextPos,
		title: nextSlotPos('title'),
		caption: nextSlotPos('caption'),
		social: nextSlotPos('social'),
	};
	return nextPos;
}
