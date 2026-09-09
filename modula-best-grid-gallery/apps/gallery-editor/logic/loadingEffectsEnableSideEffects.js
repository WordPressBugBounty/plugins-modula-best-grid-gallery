/**
 * Loading-effect enable toggles ↔ neutral numeric values (scale 100, rotate/slide 0).
 *
 * @package
 */

import { isWpTruthy } from './wpTruthy';

/**
 * @param {unknown} value
 * @param {number}  fallback
 * @return {number}
 */
function toNumber(value, fallback) {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

/**
 * True when an enable* flag was never authored (missing / null / empty), or when
 * schema/sanitize filled Off while the related numeric may still be non-neutral.
 * Authored Off resets numerics to neutral, so Off + non-neutral means unauthored.
 *
 * @param {Record<string, unknown>} loadingEffects
 * @param {string}                  key
 * @return {boolean}
 */
function shouldHydrateLoadingEffectEnable(loadingEffects, key) {
	if (!Object.prototype.hasOwnProperty.call(loadingEffects, key)) {
		return true;
	}
	const flag = loadingEffects[key];
	if (flag === null || flag === '') {
		return true;
	}
	return flag === false || flag === 0 || flag === '0';
}

/**
 * Hydrate enable* flags from stored numerics (classic galleries / convert).
 *
 * @param {Record<string, unknown>|undefined|null} loadingEffects
 */
export function normalizeLoadingEffectsEnables(loadingEffects) {
	if (!loadingEffects || typeof loadingEffects !== 'object') {
		return;
	}

	const scale = toNumber(loadingEffects.loadedScale, 100);
	const rotate = toNumber(loadingEffects.loadedRotate, 0);
	const hSlide = toNumber(loadingEffects.loadedHSlide, 0);
	const vSlide = toNumber(loadingEffects.loadedVSlide, 0);

	if (shouldHydrateLoadingEffectEnable(loadingEffects, 'enableScale')) {
		loadingEffects.enableScale = scale !== 100;
	}
	if (shouldHydrateLoadingEffectEnable(loadingEffects, 'enableRotate')) {
		loadingEffects.enableRotate = rotate !== 0;
	}
	if (shouldHydrateLoadingEffectEnable(loadingEffects, 'enableSlide')) {
		loadingEffects.enableSlide = hSlide !== 0 || vSlide !== 0;
	}
}

/**
 * When an enable toggle turns Off, reset the related numerics to neutral.
 *
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {string}                                 groupedPath
 * @param {unknown}                                value
 */
export function applyLoadingEffectsEnableSideEffects(
	form,
	groupedPath,
	value
) {
	if (isWpTruthy(value)) {
		return;
	}
	if (groupedPath === 'loadingEffects.enableScale') {
		form.setFieldValue('loadingEffects.loadedScale', 100);
		return;
	}
	if (groupedPath === 'loadingEffects.enableRotate') {
		form.setFieldValue('loadingEffects.loadedRotate', 0);
		return;
	}
	if (groupedPath === 'loadingEffects.enableSlide') {
		form.setFieldValue('loadingEffects.loadedHSlide', 0);
		form.setFieldValue('loadingEffects.loadedVSlide', 0);
	}
}
