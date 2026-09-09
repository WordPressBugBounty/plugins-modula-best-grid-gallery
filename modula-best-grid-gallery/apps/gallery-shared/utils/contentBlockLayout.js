/**
 * Content block tile padding + font presets (must stay aligned with PHP:
 * `Modula_Frontend_Adapter::content_block_padding_css` /
 * `content_block_font_family_css` / `content_block_google_font_registry`).
 *
 * @package
 */

/** @type {Record<string, string>} */
export const BLOCK_PADDING_CSS = {
	tight: '8px',
	default: 'clamp(12px, 2.8vw, 20px)',
	medium: 'clamp(14px, 3.2vw, 24px)',
	generous: 'clamp(18px, 4vw, 32px)',
};

/** @type {Record<string, string>} */
export const BLOCK_FONT_FAMILY_CSS = {
	default:
		'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
	serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
	mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
	display:
		'"Arial Black", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
	// Self-hosted web fonts — keys must match `content_block_google_font_registry()` (see `content_block_font_preset_keys()`).
	'gf-inter': '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
	'gf-roboto': '"Roboto", system-ui, -apple-system, sans-serif',
	'gf-open-sans': '"Open Sans", system-ui, -apple-system, sans-serif',
	'gf-montserrat': '"Montserrat", system-ui, -apple-system, sans-serif',
	'gf-raleway': '"Raleway", system-ui, -apple-system, sans-serif',
	'gf-dm-sans': '"DM Sans", system-ui, -apple-system, sans-serif',
	'gf-oswald': '"Oswald", system-ui, -apple-system, sans-serif',
	'gf-playfair-display': '"Playfair Display", Georgia, ui-serif, serif',
	'gf-merriweather': '"Merriweather", Georgia, ui-serif, serif',
};

export const DEFAULT_BLOCK_PADDING_PRESET = 'default';
export const DEFAULT_BLOCK_FONT_PRESET = 'default';

/**
 * @param {string} [preset]
 * @return {string} CSS `padding` value.
 */
export function blockPaddingToCss(preset) {
	const k = String(preset || '')
		.trim()
		.toLowerCase();
	return BLOCK_PADDING_CSS[k] ?? BLOCK_PADDING_CSS.default;
}

/**
 * @param {string} [preset]
 * @return {string} CSS `font-family` value.
 */
export function blockFontFamilyCss(preset) {
	const k = String(preset || '')
		.trim()
		.toLowerCase();
	return BLOCK_FONT_FAMILY_CSS[k] ?? BLOCK_FONT_FAMILY_CSS.default;
}

/**
 * Preset keys that use Google Fonts (`gf-*`), in stable object-key order.
 *
 * @return {string[]} Each key exists in `BLOCK_FONT_FAMILY_CSS`.
 */
export function getContentBlockGoogleFontPresetKeys() {
	return Object.keys(BLOCK_FONT_FAMILY_CSS).filter((k) =>
		k.startsWith('gf-')
	);
}

/**
 * Human-readable family label for a `gf-*` preset (English), for UI strings.
 *
 * @param {string} preset e.g. `gf-playfair-display`
 * @return {string} Title-case name (e.g. `Playfair Display`).
 */
export function formatGoogleFontPresetDisplayName(preset) {
	const slug = String(preset).replace(/^gf-/, '').trim().toLowerCase();
	if (!slug) {
		return '';
	}
	return slug
		.split('-')
		.map((part) =>
			part === 'dm' ? 'DM' : part.charAt(0).toUpperCase() + part.slice(1)
		)
		.join(' ');
}
