/**
 * How the gallery entry should load initial state: DOM JSON vs REST bootstrap.
 *
 * @param {HTMLElement} element Gallery root element.
 * @return {'dom'|'rest'} Bootstrap source.
 */
export function getBootstrapMode(element) {
	const fromEl = element.getAttribute('data-modula-bootstrap');
	if (fromEl === 'rest' || fromEl === 'dom') {
		return fromEl;
	}
	const g = typeof window !== 'undefined' ? window.modulaGallery : null;
	if (g?.bootstrap === 'rest' || g?.bootstrap === 'dom') {
		return g.bootstrap;
	}
	return 'dom';
}

/**
 * Numeric gallery post ID from id="modula-123" or data-gallery-id="123".
 *
 * @param {HTMLElement} element Gallery root.
 * @return {number|null} Post ID or null if not parseable.
 */
export function parseGalleryPostId(element) {
	const idAttr = element.id || '';
	const m = idAttr.match(/^modula-(\d+)$/i);
	if (m) {
		return parseInt(m[1], 10);
	}
	const raw = element.getAttribute('data-gallery-id');
	if (raw && /^\d+$/.test(String(raw).trim())) {
		return parseInt(String(raw).trim(), 10);
	}
	return null;
}
