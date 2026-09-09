/**
 * Settings takeover: URL hash (#!category) is the source of truth for the open panel.
 * Maps legacy metabox tab hashes (#!modula-general, …) to v2 editor category `name` values.
 */

/**
 * Old v2 category slugs (removed or merged) → current `SETTINGS_EDITOR_CATEGORIES[].name`.
 * @type {Record<string, string>}
 */
const DEPRECATED_V2_CATEGORY_SLUGS = {
	gallery: 'layout',
	appearance: 'layout',
	hover: 'layout',
	pagination: 'layout',
	playback: 'lightbox',
	performance: 'advanced',
	privacy: 'advanced',
	proofing: 'advanced',
	social: 'interaction',
	download: 'interaction',
	imageGuardian: 'protection',
	imageLicensing: 'protection',
	/** Custom CSS moved under Layout → Style; old deep links open Layout. */
	custom: 'layout',
};

/**
 * Legacy `data-tab` / hash segment (from classic Modula settings) → v2 `SETTINGS_EDITOR_CATEGORIES[].name`.
 * @type {Record<string, string>}
 */
const LEGACY_HASH_TO_CATEGORY = {
	'modula-general': 'layout',
	'modula-lightboxes': 'lightbox',
	'modula-filters': 'filters',
	'modula-captions': 'layout',
	'modula-social': 'interaction',
	'modula-image-loaded-effects': 'layout',
	'modula-image_licensing': 'protection',
	'modula-hover-effect': 'layout',
	'modula-video': 'video',
	'modula-style': 'layout',
	'modula-speedup': 'advanced',
	'modula-exif': 'advanced',
	'modula-download': 'interaction',
	'modula-zoom': 'interaction',
	'modula-responsive': 'layout',
	'modula-misc': 'protection',
	'modula-slideshow': 'lightbox',
	'modula-password_protect': 'protection',
	'modula-watermark': 'protection',
	'modula-customizations': 'layout',
	'modula-comments': 'interaction',
	'modula-pagination': 'layout',
	'modula-proofing': 'advanced',
	'modula-instagram': 'advanced',
};

/**
 * Parse the takeover category fragment from `#!category` only.
 * Plain hashes (e.g. Fancybox deeplink `#modulagallery-123-1`) are ignored.
 *
 * @return {string}
 */
export function parseHashFragment() {
	if (typeof window === 'undefined') {
		return '';
	}
	const raw = window.location.hash || '';
	const bang = raw.match(/^#!(.+)$/);
	if (bang) {
		return decodeURIComponent(bang[1].trim());
	}
	const plain = raw.replace(/^#/, '').trim();
	if (plain.startsWith('!')) {
		return decodeURIComponent(plain.slice(1).trim());
	}
	return '';
}

/**
 * @param {string}   fragment
 * @param {string[]} validCategoryNames
 * @return {string|null} Resolved v2 category slug, or null if unknown / empty.
 */
export function resolveEditorCategoryFromHash(fragment, validCategoryNames) {
	if (!fragment || !validCategoryNames.length) {
		return null;
	}
	const set = new Set(validCategoryNames);
	if (set.has(fragment)) {
		return fragment;
	}
	const deprecated = DEPRECATED_V2_CATEGORY_SLUGS[fragment];
	if (deprecated && set.has(deprecated)) {
		return deprecated;
	}
	const legacy = LEGACY_HASH_TO_CATEGORY[fragment];
	if (legacy && set.has(legacy)) {
		return legacy;
	}
	return null;
}

/**
 * @param {{ name: string }[]} categories
 * @return {{ activeCategory: string }}
 */
export function getTakeoverStateFromLocationHash(categories) {
	const names = categories.map((c) => c.name);
	const first = names[0] ?? 'layout';
	const fragment = parseHashFragment();
	if (!fragment) {
		return { activeCategory: first };
	}
	const resolved = resolveEditorCategoryFromHash(fragment, names);
	return {
		activeCategory: resolved || first,
	};
}

/**
 * @param {string} categoryName
 */
export function replaceSettingsEditorHash(categoryName) {
	if (typeof window === 'undefined' || !categoryName) {
		return;
	}
	const path = `${window.location.pathname}${window.location.search}`;
	const desiredHash = `#!${categoryName}`;
	if (window.location.hash !== desiredHash) {
		window.history.replaceState(null, '', `${path}${desiredHash}`);
	}
}

/** Remove #! fragment from the editor URL. */
export function clearSettingsEditorHash() {
	if (typeof window === 'undefined') {
		return;
	}
	const path = `${window.location.pathname}${window.location.search}`;
	if (window.location.hash) {
		window.history.replaceState(null, '', path);
	}
}
