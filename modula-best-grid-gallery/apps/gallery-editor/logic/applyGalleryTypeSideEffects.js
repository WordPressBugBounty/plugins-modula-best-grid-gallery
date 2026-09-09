/**
 * Apply style defaults when the gallery type changes (e.g. polaroid shadow preset).
 *
 * @package
 */

import { getLayoutPolicy } from 'gallery-shared/preview';

/** v2 style.shadowColor schema default — no tile shadow. */
const STYLE_DEFAULT_SHADOW_COLOR = '#ffffff';

/**
 * @param {unknown} color
 * @return {boolean} True when the color is empty or the style schema white default.
 */
function isUnsetStyleShadowColor(color) {
	const raw = String(color ?? '')
		.trim()
		.toLowerCase();
	return !raw || raw === '#ffffff' || raw === '#fff';
}

/**
 * @param {import('@tanstack/react-form').ReactFormExtendedApi} form
 * @param {unknown}                                             prevType
 * @param {unknown}                                             nextType
 * @return {void}
 */
export function applyGalleryTypeSideEffects(form, prevType, nextType) {
	const prev = String(prevType ?? '');
	const next = String(nextType ?? '');
	const style = form.state.values?.style;

	if (next === 'polaroid' && prev !== 'polaroid') {
		const polaroidPolicy = getLayoutPolicy({
			general: { type: 'polaroid' },
		});
		const shadowSize = parseInt(style?.shadowSize ?? 0, 10) || 0;
		if (shadowSize === 0) {
			form.setFieldValue(
				'style.shadowSize',
				polaroidPolicy.derived.polaroidShadowSize
			);
		}
		if (isUnsetStyleShadowColor(style?.shadowColor)) {
			form.setFieldValue(
				'style.shadowColor',
				polaroidPolicy.derived.polaroidShadowColor
			);
		}
		form.setFieldValue('polaroid.uniformSize', true);
		form.setFieldValue('polaroid.uniformColumns', 3);
		return;
	}

	if (prev === 'polaroid' && next !== 'polaroid') {
		const polaroidPolicy = getLayoutPolicy({
			general: { type: 'polaroid' },
		});
		if (
			(parseInt(style?.shadowSize, 10) || 0) ===
			polaroidPolicy.derived.polaroidShadowSize
		) {
			form.setFieldValue('style.shadowSize', 0);
		}
		if (
			String(style?.shadowColor ?? '').trim() ===
			polaroidPolicy.derived.polaroidShadowColor
		) {
			form.setFieldValue('style.shadowColor', STYLE_DEFAULT_SHADOW_COLOR);
		}
	}

	const nextPolicy = getLayoutPolicy({ general: { type: next } });

	if (next === 'grid') {
		const width = form.state.values?.general?.width;
		const clamped = nextPolicy.clampWidth(width);
		if (clamped !== width) {
			form.setFieldValue('general.width', clamped);
		}
	}

	if (next === 'template' && prev !== 'template') {
		const currentLayout = String(
			form.state.values?.template?.templateLayout || ''
		).trim();
		if (!currentLayout) {
			form.setFieldValue('template.templateLayout', 'split-stack');
		}
	}

	if (
		!nextPolicy.capabilities.pagination &&
		form.state.values?.pagination?.enablePagination
	) {
		form.setFieldValue('pagination.enablePagination', false);
	}

	if (!nextPolicy.capabilities.filters) {
		const filters = form.state.values?.filters?.filters;
		const hasFilters =
			Array.isArray(filters) &&
			filters.some((name) => String(name).trim() !== '');
		if (hasFilters) {
			form.setFieldValue('filters.filters', ['']);
		}
	}

	/*
	 * Do NOT reset lightbox.lightbox / slider.lightbox when switching to story /
	 * slider / video. Those layouts hide the Lightbox category and force no tile
	 * lightbox at runtime via settingsToConfig (isGalleryTypeWithoutLightbox).
	 * Mutating the form value permanently lost the user's choice when returning
	 * to Masonry / Creative / etc.
	 */
}
