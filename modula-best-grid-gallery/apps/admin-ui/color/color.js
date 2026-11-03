/**
 * Colour values as gallery settings store them: `#rrggbb` (or `#rgb`) when
 * opaque, `rgb()` / `rgba()` otherwise. ColorField edits them as a hex
 * colour plus an opacity.
 *
 * @typedef {{ hex: string, alpha: number }} ColorParts `hex` is lowercase `#rrggbb`; `alpha` is 0–1.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB =
	/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i;

/**
 * A channel (0–255) as two hex digits.
 *
 * @param {number} channel
 * @return {string} Hex pair.
 */
function toHexPair(channel) {
	return channel.toString(16).padStart(2, '0');
}

/**
 * The 6-digit lowercase form of a `#rgb` or `#rrggbb` colour, or null.
 *
 * @param {string} value
 * @return {string|null} `#rrggbb`, or null when the text is not a hex colour.
 */
export function normalizeHex(value) {
	const match = HEX.exec(String(value).trim());
	if (!match) {
		return null;
	}
	const digits =
		3 === match[1].length
			? [...match[1]].map((digit) => digit + digit).join('')
			: match[1];

	return `#${digits.toLowerCase()}`;
}

/**
 * Splits a stored colour into hex and opacity.
 *
 * @param {*} css Stored value.
 * @return {ColorParts|null} The parts, or null for anything else (names, out-of-range channels).
 */
export function parseColor(css) {
	if ('string' !== typeof css) {
		return null;
	}
	const hex = normalizeHex(css);
	if (null !== hex) {
		return { hex, alpha: 1 };
	}
	const match = RGB.exec(css.trim());
	if (!match) {
		return null;
	}
	const channels = match.slice(1, 4).map(Number);
	const alpha = undefined === match[4] ? 1 : Number(match[4]);
	const inRange = channels.every((channel) => channel <= 255) && alpha <= 1;

	return inRange
		? { hex: `#${channels.map(toHexPair).join('')}`, alpha }
		: null;
}

/**
 * Writes hex and opacity back as a stored colour: hex when opaque, `rgba()`
 * otherwise.
 *
 * @param {ColorParts} parts
 * @return {string} CSS colour.
 */
export function formatColor({ hex, alpha }) {
	const normalized = normalizeHex(hex) ?? '#000000';
	if (alpha >= 1) {
		return normalized;
	}
	const channels = [1, 3, 5].map((start) =>
		parseInt(normalized.slice(start, start + 2), 16)
	);
	const rounded = Math.round(Math.max(0, alpha) * 100) / 100;

	return `rgba(${channels.join(', ')}, ${rounded})`;
}
