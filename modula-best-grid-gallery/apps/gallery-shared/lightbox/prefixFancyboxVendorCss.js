/**
 * PostCSS prefix for Fancybox vendor CSS under the lightbox CSS host.
 *
 * Same host as classic `fancybox.css` (`.modula-best-grid-gallery`), but
 * document-level selectors must not become impossible descendants:
 * - `:root` defaults → host (variables inherit into the lightbox)
 * - `html` / `body` scroll-lock rules → stay at document level
 *
 * @param {string} prefix
 * @param {string} selector
 * @param {string} prefixedSelector
 * @returns {string}
 */
function transformFancyboxVendorSelector(prefix, selector, prefixedSelector) {
	const trimmed = String(selector || '').trim();
	if (trimmed === ':root' || trimmed.startsWith(':root:')) {
		return prefix;
	}
	if (/^(html|body)([.\s:#\[\],>]|$)/.test(trimmed)) {
		return selector;
	}
	return prefixedSelector;
}

/**
 * @returns {import('postcss').AcceptedPlugin}
 */
function createFancyboxVendorPrefixPlugin() {
	// eslint-disable-next-line @typescript-eslint/no-var-requires -- webpack/CommonJS seam
	const prefixSelector = require('postcss-prefix-selector');
	return prefixSelector({
		prefix: '.modula-best-grid-gallery',
		transform: transformFancyboxVendorSelector,
	});
}

module.exports = {
	transformFancyboxVendorSelector,
	createFancyboxVendorPrefixPlugin,
};
