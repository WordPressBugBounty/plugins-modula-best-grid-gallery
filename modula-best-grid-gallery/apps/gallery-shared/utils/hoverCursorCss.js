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
 * Cursor of a tile's link; empty when the tiles have no link or no cursor is set.
 *
 * @param {string}                                                                                   root Gallery root selector (e.g. `#modula-123`).
 * @param {{ cursor?: string, customCursorUrl?: string, lightbox?: string, changeCursor?: boolean }} args
 * @return {string}
 */
function resolveTileLinkCursor(
	root,
	{ cursor, customCursorUrl, lightbox, changeCursor = true }
) {
	if (!root || lightbox === 'no-link') {
		return '';
	}
	return resolveHoverCursorCssValue({
		cursor,
		customCursorUrl,
		changeCursor,
	});
}

/**
 * @param {string}                                                                                   root Gallery root selector (e.g. `#modula-123`).
 * @param {{ cursor?: string, customCursorUrl?: string, lightbox?: string, changeCursor?: boolean }} args
 * @return {string}
 */
export function buildHoverCursorCss(root, args) {
	const cursorValue = resolveTileLinkCursor(root, args);
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

/**
 * Settings-editor preview: the tiles render no link, so the link cursor goes
 * on `--modula-preview-tile-cursor`, which the editor's tile select hit reads.
 *
 * @param {string}                                                                                   root Gallery root selector (e.g. `#modula-123`).
 * @param {{ cursor?: string, customCursorUrl?: string, lightbox?: string, changeCursor?: boolean }} args
 * @return {string}
 */
export function buildPreviewTileCursorCss(root, args) {
	const cursorValue = resolveTileLinkCursor(root, args);
	if (!cursorValue) {
		return '';
	}
	return `${root} .modula-item{--modula-preview-tile-cursor:${cursorValue};}`;
}
