/**
 * Dynamic gallery item link cursor (legacy modula_shortcode CSS parity).
 *
 * @package
 */

const ALLOWED_HOVER_CURSORS = new Set([
	'pointer',
	'zoom-in',
	'wait',
	'cell',
	'crosshair',
	'nesw-resize',
	'nwse-resize',
]);

/**
 * @param {string} url
 * @return {string}
 */
function cssCursorUrl(url) {
	const trimmed = typeof url === 'string' ? url.trim() : '';
	if (!trimmed) {
		return '';
	}
	return `url(${JSON.stringify(trimmed)}), auto`;
}

/**
 * @param {{ cursor?: string, customCursorUrl?: string, changeCursor?: boolean }} args
 * @return {string} CSS cursor value or empty when unset.
 */
export function resolveHoverCursorCssValue({
	cursor,
	customCursorUrl,
	changeCursor = true,
}) {
	if (changeCursor === false) {
		return 'pointer';
	}
	const raw =
		typeof cursor === 'string' && cursor.trim() !== '' ? cursor.trim() : '';
	if (raw === 'custom') {
		return cssCursorUrl(customCursorUrl);
	}
	if (ALLOWED_HOVER_CURSORS.has(raw)) {
		return raw;
	}
	return '';
}

/**
 * @param {string} root Gallery root selector (e.g. `#modula-123`).
 * @param {{ cursor?: string, customCursorUrl?: string, lightbox?: string, changeCursor?: boolean }} args
 * @return {string}
 */
export function buildHoverCursorCss(
	root,
	{ cursor, customCursorUrl, lightbox, changeCursor = true }
) {
	if (!root || lightbox === 'no-link') {
		return '';
	}

	const cursorValue = resolveHoverCursorCssValue({
		cursor,
		customCursorUrl,
		changeCursor,
	});
	if (!cursorValue) {
		return '';
	}

	const linkSelectors = [
		`${root}.modula-gallery .modula-item > a`,
		`${root}.modula-gallery .modula-item a.modula-item-link`,
		`${root}.modula-gallery .modula-item-content > a:not(.modula-no-follow)`,
	].join(', ');

	let css = `${linkSelectors}{cursor:${cursorValue};}`;
	css += `${root}.modula-gallery .modula-item-content .modula-no-follow{cursor:default;}`;
	return css;
}
