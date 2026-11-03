/** Whole-catalog cell geometry, independent of editor gestures and Canvas. */
import { galleryItemRowKey } from './galleryItemIdentity';
import { resolveGalleryItemIntrinsicDimensions } from './galleryItemIntrinsicDimensions';

export const FREEFORM_COLUMNS = 24;

/**
 * Local occurrence identities keep duplicate attachments independent on save/reopen.
 * @param {Object[]} items Ordered catalog.
 * @return {string[]} Independent identities.
 */
export function freeformOccurrenceIds(items) {
	const counts = new Map();
	const reserved = new Set(
		items.map((item) => item.freeformId).filter(Boolean)
	);
	const used = new Set();
	return items.map((item, index) => {
		if (item.freeformId && !used.has(item.freeformId)) {
			used.add(item.freeformId);
			return item.freeformId;
		}
		const key = galleryItemRowKey(item, index);
		let occurrence = counts.get(key) || 0;
		while (
			reserved.has(`${key}:${occurrence}`) ||
			used.has(`${key}:${occurrence}`)
		) {
			occurrence++;
		}
		counts.set(key, occurrence + 1);
		const id = `${key}:${occurrence}`;
		used.add(id);
		return id;
	});
}
function whole(value, fallback) {
	const n = Number(value);
	return Number.isFinite(n) ? Math.round(n) : fallback;
}
export function constrainFreeformPlacement(placement) {
	const w = Math.min(FREEFORM_COLUMNS, Math.max(1, whole(placement.w, 8)));
	return {
		id: placement.id,
		x: Math.min(FREEFORM_COLUMNS - w, Math.max(0, whole(placement.x, 0))),
		y: Math.max(0, whole(placement.y, 0)),
		w,
		h: Math.max(1, whole(placement.h, 6)),
		z: whole(placement.z, 0),
	};
}

/**
 * Resolve initial tiles in three columns, retaining any authored rectangles.
 * @param {string[]} ids   Ordered occurrence identities.
 * @param {Object[]} saved Authored cell rectangles.
 * @param {Object[]} items Catalog with intrinsic dimensions.
 * @return {Object[]} Resolved cell rectangles.
 */
export function resolveFreeformComposition(ids, saved = [], items = []) {
	const byId = new Map(
		(Array.isArray(saved) ? saved : []).map((p) => [p.id, p])
	);
	const retained = ids
		.filter((id) => byId.has(id))
		.map((id) => constrainFreeformPlacement(byId.get(id)));
	let rowY = Math.max(0, ...retained.map((p) => p.y + p.h));
	let nextZ = Math.max(-1, ...retained.map((p) => p.z)) + 1;
	let rowHeight = 0;
	let appended = 0;
	return ids.map((id, index) => {
		if (byId.has(id)) {
			return constrainFreeformPlacement(byId.get(id));
		}
		if (appended > 0 && appended % 3 === 0) {
			rowY += rowHeight;
			rowHeight = 0;
		}
		const { width, height } = resolveGalleryItemIntrinsicDimensions(
			items[index],
			{ type: 'freeform' }
		);
		const aspect = width && height ? width / height : 4 / 3;
		const h = Math.max(1, Math.round(8 / aspect));
		rowHeight = Math.max(rowHeight, h);
		const placement = {
			id,
			x: (appended % 3) * 8,
			y: rowY,
			w: 8,
			h,
			z: nextZ,
		};
		appended++;
		nextZ++;
		return placement;
	});
}

const FREEFORM_DEVICE_GUTTER_KEYS = {
	tablet: 'tabletGutter',
	mobile: 'mobileGutter',
};

/**
 * Spacing for the painted device. Unlike the column layouts, Freeform paints
 * tablet/mobile automatically, so the device value applies even when the
 * legacy responsive toggle is off.
 * @param {Object} config Gallery config.
 * @param {string} device Responsive device.
 * @return {number} Gutter in pixels; a missing device value falls back to desktop.
 */
export function freeformDeviceGutter(config, device) {
	const desktop = Number(config?.gutter ?? 10);
	const desktopGutter = Number.isFinite(desktop) ? desktop : 10;
	const key = FREEFORM_DEVICE_GUTTER_KEYS[device];
	if (!key) {
		return desktopGutter;
	}
	const stored = config?.[key];
	// Number(null) and Number('') are 0; a cleared value means "not set".
	if (stored === null || stored === undefined || stored === '') {
		return desktopGutter;
	}
	const value = Number(stored);
	return Number.isFinite(value) ? value : desktopGutter;
}

export function freeformMetrics(width, spacing) {
	const gutter = Math.max(
		0,
		Math.min(Number(spacing) || 0, Math.max(0, (width - 24) / 23))
	);
	const cell = Math.max(1, (width - 23 * gutter) / FREEFORM_COLUMNS);
	return {
		columnWidth: cell,
		rowHeight: cell,
		gutterX: gutter,
		gutterY: gutter,
		pitch: cell + gutter,
	};
}
export function freeformRectangle(placement, metrics) {
	return {
		left: placement.x * metrics.pitch,
		top: placement.y * metrics.pitch,
		width: placement.w * metrics.pitch - metrics.gutterX,
		height: placement.h * metrics.pitch - metrics.gutterY,
	};
}
/**
 * @param {Object} metrics Cell metrics.
 * @return {number} Painted width of the 24 columns, without the trailing gutter.
 */
export function freeformSurfaceWidth(metrics) {
	return FREEFORM_COLUMNS * metrics.pitch - metrics.gutterX;
}
export function freeformExtent(composition, metrics) {
	const rows = Math.max(0, ...composition.map((p) => p.y + p.h));
	return rows ? rows * metrics.pitch - metrics.gutterY : 0;
}

/**
 * Shared device paint. Mobile aspect is the saved cell-span ratio, independent of spacing.
 * @param {Object[]} composition Authored placements.
 * @param {Object}   metrics     Cell metrics.
 * @param {string}   device      Responsive device.
 * @return {Object} Rectangles and surface height.
 */
export function freeformPaint(composition, metrics, device) {
	if (device !== 'mobile') {
		return {
			rectangles: composition.map((p) => freeformRectangle(p, metrics)),
			height: freeformExtent(composition, metrics),
		};
	}
	const width = freeformSurfaceWidth(metrics);
	let nextTop = 0;
	const rectangles = composition.map((p) => {
		const height = (width * p.h) / p.w;
		const rectangle = { left: 0, top: nextTop, width, height };
		nextTop += height + metrics.gutterY;
		return rectangle;
	});
	return {
		rectangles,
		height: rectangles.length ? nextTop - metrics.gutterY : 0,
	};
}

/**
 * Cell rectangles overlap when they share area; tiles that only share an edge do not.
 * @param {Object} a Placement.
 * @param {Object} b Placement.
 * @return {boolean} Whether the two paint over each other.
 */
function freeformPlacementsOverlap(a, b) {
	return (
		a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
	);
}

/**
 * Rank of the nearest image in paint order, in `direction`, that overlaps the one at `from`.
 * @param {Object[]} ordered   Placements in paint order.
 * @param {number}   from      Rank of the target.
 * @param {number}   direction 1 (above) or -1 (below).
 * @return {number} That rank, or `from` when no image overlaps in that direction.
 */
function nearestOverlappingRank(ordered, from, direction) {
	for (
		let rank = from + direction;
		rank >= 0 && rank < ordered.length;
		rank += direction
	) {
		if (freeformPlacementsOverlap(ordered[rank], ordered[from])) {
			return rank;
		}
	}
	return from;
}

/** Target rank per stacking action, given the placements in paint order and the target's rank. */
const FREEFORM_STACKING_TARGETS = {
	forward: (ordered, from) => nearestOverlappingRank(ordered, from, 1),
	backward: (ordered, from) => nearestOverlappingRank(ordered, from, -1),
	front: (ordered) => ordered.length - 1,
	back: () => 0,
};

/**
 * Change paint order only; retain the catalog array and every authored rectangle.
 * Forward/backward step past the nearest overlapping image (non-overlapping
 * ones are skipped, as in Figma or Keynote); front/back go to either end.
 * @param {Object[]} composition Authored placements.
 * @param {string}   id          Target occurrence.
 * @param {string}   action      Stacking direction.
 * @return {Object[]} Updated placements; the same array when nothing changes.
 */
export function changeFreeformStacking(composition, id, action) {
	if (
		!Object.prototype.hasOwnProperty.call(FREEFORM_STACKING_TARGETS, action)
	) {
		return composition;
	}
	const ordered = composition
		.map((p, index) => ({ ...p, index }))
		.sort((a, b) => a.z - b.z || a.index - b.index);
	const from = ordered.findIndex((p) => p.id === id);
	if (from < 0) {
		return composition;
	}
	const to = FREEFORM_STACKING_TARGETS[action](ordered, from);
	if (to === from) {
		return composition;
	}
	ordered.splice(to, 0, ordered.splice(from, 1)[0]);
	const ranks = new Map(ordered.map((p, index) => [p.id, index]));
	return composition.map((p) => ({ ...p, z: ranks.get(p.id) }));
}
