/**
 * Reads of a stored hover builder (`hover.builder`, or a catalog preset's
 * builder), shared by the hover tile classes (hoverTile.js) and the gallery
 * editor's hover builder.
 *
 * @package
 */

export const SLOT_IDS = /** @type {const} */ (['title', 'caption', 'social']);

const DEFAULT_SLOT_POSITIONS = {
	title: { x: 50, y: 18 },
	caption: { x: 50, y: 50 },
	social: { x: 50, y: 82 },
};

/**
 * @param {unknown} value
 * @return {boolean} The stored flag is on (`true`, `1` or `'1'`).
 */
export function isEnabledFlag(value) {
	return value === true || value === 1 || value === '1';
}

/**
 * @param {unknown} value
 * @param {number}  fallback
 * @return {number} A whole percent, 0–100; the fallback for a non-number.
 */
function normalizePercent(value, fallback) {
	const n = Number(value);
	if (!Number.isFinite(n)) {
		return fallback;
	}
	return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Read camelCase props; fall back to legacy lowercase (older PHP sanitizer used sanitize_key on object keys).
 *
 * @param {Record<string, unknown>} builder
 * @param {string}                  camel
 * @return {unknown} The stored value; undefined when the builder has neither key.
 */
export function readHoverBuilderKey(builder, camel) {
	if (!builder || typeof builder !== 'object') {
		return undefined;
	}
	if (Object.prototype.hasOwnProperty.call(builder, camel)) {
		return builder[camel];
	}
	const lower =
		camel.charAt(0).toLowerCase() +
		camel.slice(1).replace(/[A-Z]/g, (c) => c.toLowerCase());
	if (
		lower !== camel &&
		Object.prototype.hasOwnProperty.call(builder, lower)
	) {
		return builder[lower];
	}
	return undefined;
}

/**
 * @param {unknown} builder Stored hover builder.
 * @return {Record<string, { x: number, y: number }>} Each slot's position, the defaults where the builder has none.
 */
export function mergeSlotPositions(builder) {
	const rawSlot = readHoverBuilderKey(builder, 'slotPositions');
	const raw =
		rawSlot && typeof rawSlot === 'object' && !Array.isArray(rawSlot)
			? rawSlot
			: {};
	const out = { ...DEFAULT_SLOT_POSITIONS };
	for (const id of SLOT_IDS) {
		const cell = raw[id];
		if (cell && typeof cell === 'object') {
			out[id] = {
				x: normalizePercent(cell.x, DEFAULT_SLOT_POSITIONS[id].x),
				y: normalizePercent(cell.y, DEFAULT_SLOT_POSITIONS[id].y),
			};
		}
	}
	return out;
}
