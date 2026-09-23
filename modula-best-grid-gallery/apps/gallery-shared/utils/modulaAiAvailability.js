/**
 * Modula AI availability helpers (local host gate, language default, generate UI state).
 */

/**
 * Whether a site URL hostname is local (cloud AI cannot reach it).
 *
 * @param {string|null|undefined} hostname Host only (no scheme/path).
 * @return {boolean}
 */
export function isLocalSiteHost(hostname) {
	if (hostname == null || typeof hostname !== 'string') {
		return false;
	}
	const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
	if (!host) {
		return false;
	}
	if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
		return true;
	}
	if (host.endsWith('.local')) {
		return true;
	}
	return false;
}

/**
 * Map WordPress Site Language locale to an AI language list value.
 *
 * @param {string}   locale        WP locale (e.g. en_US, ro_RO, zh_TW).
 * @param {string[]} languageCodes Allowed AI language option values.
 * @return {string}
 */
export function mapWpLocaleToAiLanguage(locale, languageCodes) {
	const codes = Array.isArray(languageCodes) ? languageCodes : [];
	const fallback = codes.includes('en') ? 'en' : codes[0] || 'en';
	if (!locale || typeof locale !== 'string') {
		return fallback;
	}

	const normalized = locale.trim().replace(/_/g, '-');
	if (!normalized) {
		return fallback;
	}

	const lowerCodes = new Map(
		codes.map((code) => [String(code).toLowerCase(), code])
	);

	const exact = lowerCodes.get(normalized.toLowerCase());
	if (exact) {
		return exact;
	}

	const primary = normalized.split('-')[0].toLowerCase();
	const primaryMatch = lowerCodes.get(primary);
	if (primaryMatch) {
		return primaryMatch;
	}

	return fallback;
}

/**
 * @typedef {'unavailable_localhost'|'generate'|'configure'|'generating'} ModulaAiPrimaryLabelKey
 * @typedef {'none'|'generate'|'configure'} ModulaAiPrimaryAction
 *
 * @typedef {Object} ModulaAiGenerateUiState
 * @property {boolean}                  showFieldGenerate
 * @property {boolean}                  primaryDisabled
 * @property {ModulaAiPrimaryLabelKey}  primaryLabelKey
 * @property {ModulaAiPrimaryAction}    primaryAction
 */

/**
 * Resolve generate toolbar / per-field Generate UI for image metadata AI.
 *
 * @param {Object}  args
 * @param {boolean} args.unavailableOnLocalhost
 * @param {boolean} args.aiConfigured
 * @param {boolean} args.aiBusy
 * @return {ModulaAiGenerateUiState}
 */
export function resolveModulaAiGenerateUiState({
	unavailableOnLocalhost,
	aiConfigured,
	aiBusy,
}) {
	if (unavailableOnLocalhost) {
		return {
			showFieldGenerate: false,
			primaryDisabled: true,
			primaryLabelKey: 'unavailable_localhost',
			primaryAction: 'none',
		};
	}

	if (aiBusy) {
		return {
			showFieldGenerate: true,
			primaryDisabled: true,
			primaryLabelKey: 'generating',
			primaryAction: aiConfigured ? 'generate' : 'configure',
		};
	}

	if (aiConfigured) {
		return {
			showFieldGenerate: true,
			primaryDisabled: false,
			primaryLabelKey: 'generate',
			primaryAction: 'generate',
		};
	}

	return {
		showFieldGenerate: true,
		primaryDisabled: false,
		primaryLabelKey: 'configure',
		primaryAction: 'configure',
	};
}
