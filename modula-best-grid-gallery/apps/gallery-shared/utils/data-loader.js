/**
 * Modula Gallery - Data Loader
 * Loads gallery data from JS object near the gallery element
 *
 * @package
 */

/**
 * Find and load gallery data object from script tag near the gallery
 *
 * @param {HTMLElement} element - Gallery container element
 * @return {Object|null} Gallery data object or null
 */
export function loadGalleryData(element) {
	// Look for script tag with data-modula-gallery-id matching the gallery
	const galleryId = element.id || element.getAttribute('data-gallery-id');

	if (!galleryId) {
		// Try to find script tag immediately before or after the gallery
		const scriptTag = element.previousElementSibling;
		if (
			scriptTag &&
			scriptTag.tagName === 'SCRIPT' &&
			scriptTag.type === 'application/json' &&
			scriptTag.hasAttribute('data-modula-gallery')
		) {
			return parseScriptData(scriptTag);
		}

		// Try next sibling
		const nextScriptTag = element.nextElementSibling;
		if (
			nextScriptTag &&
			nextScriptTag.tagName === 'SCRIPT' &&
			nextScriptTag.type === 'application/json' &&
			nextScriptTag.hasAttribute('data-modula-gallery')
		) {
			return parseScriptData(nextScriptTag);
		}

		// Try parent's previous sibling
		const parent = element.parentElement;
		if (parent) {
			const parentPrevScript = parent.previousElementSibling;
			if (
				parentPrevScript &&
				parentPrevScript.tagName === 'SCRIPT' &&
				parentPrevScript.type === 'application/json' &&
				parentPrevScript.hasAttribute('data-modula-gallery')
			) {
				return parseScriptData(parentPrevScript);
			}
		}

		return null;
	}

	// Look for script tag with matching ID
	const scriptSelector = `script[data-modula-gallery-id="${galleryId}"]`;
	const scriptTag = document.querySelector(scriptSelector);

	if (scriptTag) {
		return parseScriptData(scriptTag);
	}

	// Fallback: look for window object
	if (typeof window !== 'undefined' && window.modulaGalleries) {
		const galleryData = window.modulaGalleries[galleryId];
		if (galleryData) {
			return galleryData;
		}
	}

	return null;
}

/**
 * Parse data from script tag
 *
 * @param {HTMLElement} scriptTag - Script element
 * @return {{ ok: true, data: Object }|{ ok: false, reason: 'empty'|'parse_error', error?: unknown }}
 */
function parseScriptDataResult(scriptTag) {
	try {
		const textContent = scriptTag.textContent || scriptTag.innerHTML;
		if (!textContent || !String(textContent).trim()) {
			return { ok: false, reason: 'empty' };
		}

		return { ok: true, data: JSON.parse(textContent) };
	} catch (error) {
		console.error(
			'Modula: Failed to parse gallery data from script tag',
			error
		);
		return { ok: false, reason: 'parse_error', error };
	}
}

/**
 * Parse data from script tag
 *
 * @param {HTMLElement} scriptTag - Script element
 * @return {Object|null} Parsed data or null
 */
function parseScriptData(scriptTag) {
	const result = parseScriptDataResult(scriptTag);
	return result.ok ? result.data : null;
}

/**
 * @param {HTMLElement} element
 * @return {HTMLElement|null}
 */
function findGalleryJsonScriptTag(element) {
	const galleryId = element.id || element.getAttribute('data-gallery-id');

	if (!galleryId) {
		const siblings = [
			element.previousElementSibling,
			element.nextElementSibling,
		];
		for (const scriptTag of siblings) {
			if (
				scriptTag &&
				scriptTag.tagName === 'SCRIPT' &&
				scriptTag.type === 'application/json' &&
				scriptTag.hasAttribute('data-modula-gallery')
			) {
				return scriptTag;
			}
		}

		const parent = element.parentElement;
		if (parent) {
			const parentPrevScript = parent.previousElementSibling;
			if (
				parentPrevScript &&
				parentPrevScript.tagName === 'SCRIPT' &&
				parentPrevScript.type === 'application/json' &&
				parentPrevScript.hasAttribute('data-modula-gallery')
			) {
				return parentPrevScript;
			}
		}

		return null;
	}

	const scriptSelector = `script[data-modula-gallery-id="${galleryId}"]`;
	const scriptTag = document.querySelector(scriptSelector);
	return scriptTag || null;
}

/**
 * Resolve inline gallery JSON from the DOM (script tag or window.modulaGalleries).
 *
 * @param {HTMLElement} element Gallery container element.
 * @return {{ status: 'ok', data: Object }|{ status: 'missing' }|{ status: 'parse_error', error?: unknown }}
 */
export function resolveGalleryDataFromDom(element) {
	const scriptTag = findGalleryJsonScriptTag(element);
	if (scriptTag) {
		const parsed = parseScriptDataResult(scriptTag);
		if (!parsed.ok) {
			return parsed.reason === 'parse_error'
				? { status: 'parse_error', error: parsed.error }
				: { status: 'missing' };
		}
		return { status: 'ok', data: parsed.data };
	}

	const galleryId = element.id || element.getAttribute('data-gallery-id');
	if (
		typeof window !== 'undefined' &&
		window.modulaGalleries &&
		galleryId &&
		window.modulaGalleries[galleryId]
	) {
		return { status: 'ok', data: window.modulaGalleries[galleryId] };
	}

	const dataConfig = element.getAttribute('data-config');
	if (dataConfig && String(dataConfig).trim() !== '') {
		try {
			const config = JSON.parse(dataConfig);
			return {
				status: 'ok',
				data: {
					...createDefaultData(element),
					config: config && typeof config === 'object' ? config : {},
				},
			};
		} catch (error) {
			console.warn('Modula: Failed to parse data-config', error);
			return { status: 'parse_error', error };
		}
	}

	return { status: 'missing' };
}

/**
 * Create default data structure
 *
 * @param {HTMLElement} element - Gallery element
 * @return {Object} Default data structure
 */
export function createDefaultData(element) {
	// Try to parse from data-config as fallback
	const dataConfig = element.getAttribute('data-config');
	let config = {};

	if (dataConfig) {
		try {
			config = JSON.parse(dataConfig);
		} catch (e) {
			console.warn('Modula: Failed to parse data-config', e);
		}
	}

	return {
		config,
		items: [],
		metadata: {},
		pagination: {
			enabled: false,
			type: 'client',
			perPage: 12,
			currentPage: 1,
		},
		filtering: {
			enabled: false,
			type: 'client',
			activeFilters: [],
			availableFilters: [],
		},
	};
}
