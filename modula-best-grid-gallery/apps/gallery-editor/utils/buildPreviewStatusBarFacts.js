/**
 * Left-side facts for the takeover canvas status bar (styleguide `.statusbar`).
 */
import { __, _n, sprintf } from '@wordpress/i18n';
import { getByPath } from '../logic/getByPath';

/**
 * @param {unknown} value
 * @return {string}
 */
function stringifyValue(value) {
	if (value === null || value === undefined) {
		return '';
	}
	if (typeof value === 'boolean') {
		return value ? '1' : '0';
	}
	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value);
	}
	if (typeof value === 'string') {
		return value.trim();
	}
	return '';
}

/**
 * @param {unknown} value
 * @return {boolean}
 */
function isTruthySetting(value) {
	if (value === true || value === 1 || value === '1') {
		return true;
	}
	if (typeof value === 'string' && value.toLowerCase().trim() === 'true') {
		return true;
	}
	return false;
}

/**
 * @param {string} aspect
 * @return {string}
 */
function formatAspectValueShort(aspect) {
	switch (aspect) {
		case 'square':
			return __('square', 'modula-best-grid-gallery');
		case 'portrait':
			return __('portrait', 'modula-best-grid-gallery');
		case 'landscape':
			return __('landscape', 'modula-best-grid-gallery');
		case 'custom':
			return __('custom', 'modula-best-grid-gallery');
		default:
			return aspect.replace(/-/g, ' ');
	}
}

/**
 * @param {Object[]} [items]
 * @return {number}
 */
export function countPreviewStatusBarItems(items) {
	if (!Array.isArray(items)) {
		return 0;
	}
	let count = 0;
	for (const item of items) {
		if (!item || typeof item !== 'object') {
			continue;
		}
		count += 1;
	}
	return count;
}

/**
 * @param {'desktop'|'tablet'|'mobile'} viewport
 * @param {Record<string, Record<string, unknown>>} values
 * @return {string}
 */
function resolveGutterForViewport(viewport, values) {
	if (viewport === 'mobile') {
		const mobile = stringifyValue(getByPath(values, 'layout.mobileGutter'));
		if (mobile !== '') {
			return mobile;
		}
	}
	if (viewport === 'tablet' || viewport === 'mobile') {
		const tablet = stringifyValue(getByPath(values, 'layout.tabletGutter'));
		if (tablet !== '') {
			return tablet;
		}
	}
	return stringifyValue(getByPath(values, 'layout.gutter'));
}

/**
 * @param {Object} args
 * @param {Object[]} [args.items]
 * @param {Record<string, Record<string, unknown>>} args.values
 * @param {'desktop'|'tablet'|'mobile'} [args.previewViewport]
 * @return {string[]}
 */
export function buildPreviewStatusBarFacts({
	items = [],
	values,
	previewViewport = 'desktop',
}) {
	/** @type {string[]} */
	const facts = [];
	const count = countPreviewStatusBarItems(items);
	facts.push(
		sprintf(
			/* translators: %d: number of gallery items in the preview */
			_n('%d image', '%d images', count, 'modula-best-grid-gallery'),
			count
		)
	);

	const type = stringifyValue(getByPath(values, 'general.type'));
	const columns = stringifyValue(getByPath(values, 'layout.gridType'));
	const aspect = stringifyValue(
		getByPath(values, 'layout.uniformGridTileAspect')
	);
	const polaroidCols = stringifyValue(
		getByPath(values, 'polaroid.uniformColumns')
	);
	const polaroidUniform = isTruthySetting(
		getByPath(values, 'polaroid.uniformSize')
	);
	const gutter = resolveGutterForViewport(previewViewport, values || {});

	const columnTypes = new Set([
		'custom-grid',
		'grid',
		'uniform-grid',
		'fit-grid',
		'parallax-masonry',
		'masonry',
	]);

	if (type === 'polaroid' && polaroidUniform && polaroidCols) {
		facts.push(
			sprintf(
				/* translators: %s: number of columns */
				__('%s across', 'modula-best-grid-gallery'),
				polaroidCols
			)
		);
	} else if (columns && columnTypes.has(type)) {
		facts.push(
			sprintf(
				/* translators: %s: number of columns */
				__('%s across', 'modula-best-grid-gallery'),
				columns
			)
		);
	}

	if (
		aspect &&
		(type === 'uniform-grid' || type === 'fit-grid' || type === 'grid')
	) {
		facts.push(formatAspectValueShort(aspect));
	}

	if (gutter !== '') {
		facts.push(
			sprintf(
				/* translators: %s: spacing between images in pixels */
				__('%spx apart', 'modula-best-grid-gallery'),
				gutter
			)
		);
	}

	return facts;
}
