import { __, sprintf } from '@wordpress/i18n';
import {
	getMatchingPresetId,
	HOVER_BUILDER_PRESETS,
} from './hoverBuilderPresets';

/**
 * @param {unknown} builder
 * @return {string}
 */
export function getHoverBuilderSourcePresetId(builder) {
	if (!builder || typeof builder !== 'object') {
		return '';
	}
	const raw = /** @type {{ sourcePresetId?: unknown }} */ (builder)
		.sourcePresetId;
	return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * Select value: exact match, else last applied source, else empty (Custom).
 *
 * @param {unknown} builder
 * @return {string}
 */
export function resolveHoverPresetSelectValue(builder) {
	const matched = getMatchingPresetId(builder);
	if (matched) {
		return matched;
	}
	const source = getHoverBuilderSourcePresetId(builder);
	if (source && HOVER_BUILDER_PRESETS.some((p) => p.id === source)) {
		return source;
	}
	return '';
}

/**
 * @param {unknown} builder
 * @return {boolean}
 */
export function isHoverPresetCustomized(builder) {
	const matched = getMatchingPresetId(builder);
	if (matched) {
		return false;
	}
	const source = getHoverBuilderSourcePresetId(builder);
	return Boolean(
		source && HOVER_BUILDER_PRESETS.some((p) => p.id === source)
	);
}

/**
 * Human label for hub summary and Select display.
 *
 * @param {unknown} builder
 * @return {string}
 */
export function resolveHoverPresetDisplayLabel(builder) {
	const matched = getMatchingPresetId(builder);
	if (matched) {
		const preset = HOVER_BUILDER_PRESETS.find((p) => p.id === matched);
		if (preset?.label) {
			return preset.label;
		}
	}
	const source = getHoverBuilderSourcePresetId(builder);
	if (source) {
		const preset = HOVER_BUILDER_PRESETS.find((p) => p.id === source);
		if (preset?.label) {
			return sprintf(
				/* translators: %s: hover preset name */
				__('%s — customized', 'modula-best-grid-gallery'),
				preset.label
			);
		}
	}
	return __('Custom', 'modula-best-grid-gallery');
}

/**
 * Customize control is hidden only for exact “None” (not none-with-captions / customized).
 *
 * @param {unknown} builder
 * @return {boolean}
 */
export function shouldShowHoverCustomizeButton(builder) {
	const matched = getMatchingPresetId(builder);
	if (matched === 'none') {
		return false;
	}
	if (matched) {
		return true;
	}
	const selectValue = resolveHoverPresetSelectValue(builder);
	if (selectValue && selectValue !== 'none') {
		return true;
	}
	// Orphan custom builder (no source) — still allow Customize.
	if (builder && typeof builder === 'object') {
		return true;
	}
	return false;
}
