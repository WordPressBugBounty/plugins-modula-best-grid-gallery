/**
 * Resolve hub-drill summaryParts / summaryKind into renderable tokens.
 */
import { __, _n, sprintf } from '@wordpress/i18n';
import { getByPath } from '../../../logic/getByPath';
import { getEnrichedFieldByGroupedPath } from '../../../data/formSchema';
import { normalizeGalleryFilterNames } from '../../../utils/syncImageFiltersWithGalleryFilterList';
import {
	filterBulkEditableImageRows,
	parseFiltersField,
} from '../../bulk-edit/bulkEditUtils';
import { resolveHoverPresetDisplayLabel } from '../../hover-effect-builder/resolveHoverPresetLabel';
import { getInstagramConnectionState } from '../../../platform/instagramRegistry';
import { getModulaSettingsEditorConfig } from '../../../config/modulaSettingsEditorConfig';
import {
	hasGalleryDefaultsPresets,
	isGalleryDefaultsEntitled,
} from '../../../logic/galleryDefaultsGate';

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
 * @param {object} field Enriched field
 * @param {unknown} value
 * @return {string}
 */
function enumLabelForField(field, value) {
	const key = stringifyValue(value);
	if (!key) {
		return '';
	}
	const labels = field?.control?.optionLabels;
	if (labels && typeof labels === 'object') {
		const label = labels[key];
		if (typeof label === 'string' && label.trim() !== '') {
			return label.trim();
		}
		const asNum = Number(key);
		if (Number.isFinite(asNum) && typeof labels[asNum] === 'string') {
			return labels[asNum].trim();
		}
	}
	return key.replace(/-/g, ' ');
}

/**
 * @param {string} count
 * @return {string}
 */
function formatColumnCount(count) {
	return sprintf(
		/* translators: %s: number of columns in a gallery layout summary */
		__('%s columns', 'modula-best-grid-gallery'),
		count
	);
}

/**
 * @param {string} px
 * @return {string}
 */
function formatGutterSummary(px) {
	return sprintf(
		/* translators: %s: spacing between images in pixels */
		__('%spx apart', 'modula-best-grid-gallery'),
		px
	);
}

/**
 * @param {string} template
 * @param {{ value: string, label: string }} vars
 * @return {string}
 */
function applyTemplate(template, vars) {
	if (typeof template !== 'string' || template.trim() === '') {
		return vars.label || vars.value;
	}
	return template
		.replace(/\{value\}/g, vars.value)
		.replace(/\{label\}/g, vars.label || vars.value);
}

/**
 * @param {object} part
 * @param {Record<string, Record<string, unknown>>} values
 * @return {{ kind: 'color', color: string } | { kind: 'text', text: string } | null}
 */
function resolveSummaryPart(part, values) {
	if (!part || typeof part !== 'object') {
		return null;
	}
	const type = typeof part.type === 'string' ? part.type.trim() : '';
	const path = typeof part.path === 'string' ? part.path.trim() : '';
	if (!path) {
		return null;
	}

	const raw = getByPath(values, path);

	const valueStr = stringifyValue(raw);

	if (type === 'color') {
		if (!valueStr) {
			return null;
		}
		return { kind: 'color', color: valueStr };
	}

	const hit = getEnrichedFieldByGroupedPath(path);
	if (type === 'enum') {
		if (!hit) {
			return valueStr ? { kind: 'text', text: valueStr } : null;
		}
		const label = enumLabelForField(hit.field, raw);
		return label ? { kind: 'text', text: label } : null;
	}

	/* Raw stored option/key — for compact drill chips (not editor labels). */
	if (type === 'value') {
		if (valueStr === '') {
			return null;
		}
		const text = applyTemplate(
			typeof part.template === 'string' ? part.template : '{value}',
			{ value: valueStr, label: valueStr }
		).trim();
		return text ? { kind: 'text', text } : null;
	}

	if (type === 'truthy') {
		const on = isTruthySetting(raw);
		const trueLabel =
			typeof part.trueLabel === 'string' && part.trueLabel.trim() !== ''
				? part.trueLabel.trim()
				: __('On', 'modula-best-grid-gallery');
		const falseLabel =
			typeof part.falseLabel === 'string' && part.falseLabel.trim() !== ''
				? part.falseLabel.trim()
				: __('Off', 'modula-best-grid-gallery');
		return { kind: 'text', text: on ? trueLabel : falseLabel };
	}

	if (type === 'text') {
		const num =
			typeof raw === 'number'
				? raw
				: typeof raw === 'string' &&
					  raw.trim() !== '' &&
					  !Number.isNaN(Number(raw))
					? Number(raw)
					: null;
		if (
			num === 0 &&
			typeof part.zeroLabel === 'string' &&
			part.zeroLabel.trim() !== ''
		) {
			return { kind: 'text', text: part.zeroLabel.trim() };
		}
		if (valueStr === '') {
			return null;
		}
		const label = hit ? enumLabelForField(hit.field, raw) : valueStr;
		const text = applyTemplate(
			typeof part.template === 'string' ? part.template : '{value}',
			{ value: valueStr, label }
		).trim();
		return text ? { kind: 'text', text } : null;
	}

	return null;
}

/**
 * Short aspect token for drill summaries (option value, not editor label).
 *
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
 * Pagination follow-on drill — mode, per-page count, position/colors when numbered.
 *
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'color', color: string } | { kind: 'text', text: string }>}
 */
function formatPaginationSummary(values) {
	/** @type {Array<{ kind: 'color', color: string } | { kind: 'text', text: string }>} */
	const out = [];
	const infinite = isTruthySetting(
		getByPath(values, 'pagination.enableInfiniteScroll')
	);
	const loadMore = isTruthySetting(
		getByPath(values, 'pagination.enableLoadMore')
	);
	const perPageRaw = getByPath(values, 'pagination.maxImagesCount');
	const perPage = stringifyValue(perPageRaw);

	if (infinite) {
		out.push({
			kind: 'text',
			text: __('Infinite scroll', 'modula-best-grid-gallery'),
		});
	} else if (loadMore) {
		out.push({
			kind: 'text',
			text: __('Load more', 'modula-best-grid-gallery'),
		});
	} else {
		out.push({
			kind: 'text',
			text: __('Numbered', 'modula-best-grid-gallery'),
		});
	}

	const perPageNum =
		typeof perPageRaw === 'number'
			? perPageRaw
			: perPage !== '' && !Number.isNaN(Number(perPage))
				? Number(perPage)
				: null;
	if (perPageNum === 0) {
		out.push({
			kind: 'text',
			text: __('No limit', 'modula-best-grid-gallery'),
		});
	} else if (perPage !== '') {
		out.push({
			kind: 'text',
			text: sprintf(
				/* translators: %s: max images shown per page */
				__('%s / page', 'modula-best-grid-gallery'),
				perPage
			),
		});
	}

	return out;
}

/**
 * Gallery layout drill — compact tokens only (not full field labels).
 * Kept as summaryKind because which bits appear depends on gallery type.
 *
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatGalleryLayoutSummary(values) {
	/** @type {string[]} */
	const bits = [];
	const type = stringifyValue(getByPath(values, 'general.type'));
	const columns = stringifyValue(getByPath(values, 'layout.gridType'));
	const gutter = stringifyValue(getByPath(values, 'layout.gutter'));
	const aspect = stringifyValue(
		getByPath(values, 'layout.uniformGridTileAspect')
	);
	const polaroidCols = stringifyValue(
		getByPath(values, 'polaroid.uniformColumns')
	);
	const polaroidUniform = isTruthySetting(
		getByPath(values, 'polaroid.uniformSize')
	);

	const columnTypes = new Set([
		'custom-grid',
		'grid',
		'uniform-grid',
		'fit-grid',
		'parallax-masonry',
		'masonry',
	]);

	if (type === 'polaroid' && polaroidUniform && polaroidCols) {
		bits.push(formatColumnCount(polaroidCols));
	} else if (columns && columnTypes.has(type)) {
		bits.push(formatColumnCount(columns));
	}

	if (gutter !== '') {
		bits.push(formatGutterSummary(gutter));
	}

	if (
		aspect &&
		(type === 'uniform-grid' || type === 'fit-grid' || type === 'grid')
	) {
		bits.push(formatAspectValueShort(aspect));
	}

	return bits.map((text) => ({ kind: 'text', text }));
}

/**
 * Lightbox toolbar buttons drill — “N of M shown” for the seven core controls.
 * `downloadAllButton` stays in the drill but is excluded from M (extension-gated).
 *
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatLightboxToolbarButtonsSummary(values) {
	if (!isTruthySetting(getByPath(values, 'lightbox.toolbar'))) {
		return [
			{
				kind: 'text',
				text: __('Off', 'modula-best-grid-gallery'),
			},
		];
	}
	const paths = [
		'lightbox.close',
		'lightbox.thumbs',
		'lightbox.download',
		'lightbox.zoom',
		'lightbox.share',
		'lightbox.infobar',
		'lightbox.enableFullscreen',
	];
	const total = paths.length;
	let shown = 0;
	for (const path of paths) {
		if (isTruthySetting(getByPath(values, path))) {
			shown += 1;
		}
	}
	return [
		{
			kind: 'text',
			text: sprintf(
				/* translators: 1: number of toolbar buttons enabled, 2: total core buttons */
				__('%1$d of %2$d shown', 'modula-best-grid-gallery'),
				shown,
				total
			),
		},
	];
}

/**
 * @param {Record<string, Record<string, unknown>>} values
 * @param {Object[]} [previewItems]
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatFiltersListSummary(values, previewItems) {
	const names = normalizeGalleryFilterNames(values?.filters?.filters);
	const filterCount = names.length;
	const items = Array.isArray(previewItems) ? previewItems : [];
	const taggedCount = filterBulkEditableImageRows(items).filter((row) => {
		const tags = parseFiltersField(row?.filters);
		return tags.length > 0;
	}).length;

	const filtersText = sprintf(
		/* translators: %d: number of gallery filter names */
		_n('%d filter', '%d filters', filterCount, 'modula-best-grid-gallery'),
		filterCount
	);
	const taggedText = sprintf(
		/* translators: %d: number of images that have at least one filter tag */
		_n(
			'%d image tagged',
			'%d images tagged',
			taggedCount,
			'modula-best-grid-gallery'
		),
		taggedCount
	);

	return [
		{
			kind: 'text',
			text: `${filtersText} · ${taggedText}`,
		},
	];
}

/**
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatHoverEffectSummary(values) {
	const builder = values?.hover?.builder;
	return [
		{
			kind: 'text',
			text: resolveHoverPresetDisplayLabel(builder),
		},
	];
}

/**
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatDownloadSummary(values) {
	if (!isTruthySetting(getByPath(values, 'download.enableDownload'))) {
		return [
			{
				kind: 'text',
				text: __('Off', 'modula-best-grid-gallery'),
			},
		];
	}
	/** @type {string[]} */
	const bits = [];
	if (isTruthySetting(getByPath(values, 'download.downloadGalleryButton'))) {
		bits.push(__('Single', 'modula-best-grid-gallery'));
	}
	if (
		isTruthySetting(getByPath(values, 'download.downloadAllGalleryButton'))
	) {
		bits.push(__('Whole gallery', 'modula-best-grid-gallery'));
	}
	if (bits.length === 0) {
		return [
			{
				kind: 'text',
				text: __('On', 'modula-best-grid-gallery'),
			},
		];
	}
	return [
		{
			kind: 'text',
			text: bits.join(' · '),
		},
	];
}

/**
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatSocialNetworksSummary(values) {
	const paths = [
		'social.enableTwitter',
		'social.enableFacebook',
		'social.enableWhatsapp',
		'social.enableLinkedin',
		'social.enablePinterest',
		'social.enableEmail',
	];
	let count = 0;
	for (const path of paths) {
		if (isTruthySetting(getByPath(values, path))) {
			count += 1;
		}
	}
	if (count === 0) {
		return [
			{
				kind: 'text',
				text: __('No networks on', 'modula-best-grid-gallery'),
			},
		];
	}
	return [
		{
			kind: 'text',
			text: sprintf(
				/* translators: %d: number of social/sharing networks enabled */
				_n(
					'%d configured network',
					'%d configured networks',
					count,
					'modula-best-grid-gallery'
				),
				count
			),
		},
	];
}

/**
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatCommentsSummary(values) {
	if (!isTruthySetting(getByPath(values, 'comments.commentStatus'))) {
		return [
			{
				kind: 'text',
				text: __('Off', 'modula-best-grid-gallery'),
			},
		];
	}
	const collapsed = isTruthySetting(
		getByPath(values, 'comments.startCollapsed')
	);
	return [
		{
			kind: 'text',
			text: collapsed
				? __('On · collapsed', 'modula-best-grid-gallery')
				: __('On · open', 'modula-best-grid-gallery'),
		},
	];
}

/**
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatZoomSummary(values) {
	if (!isTruthySetting(getByPath(values, 'zoom.enableZoom'))) {
		return [
			{
				kind: 'text',
				text: __('Off', 'modula-best-grid-gallery'),
			},
		];
	}
	const type = stringifyValue(getByPath(values, 'zoom.zoomType'));
	const hit = getEnrichedFieldByGroupedPath('zoom.zoomType');
	const label = hit ? enumLabelForField(hit.field, type) : type;
	return [
		{
			kind: 'text',
			text: label || __('On', 'modula-best-grid-gallery'),
		},
	];
}

/**
 * @param {unknown} flag
 * @return {boolean}
 */
function isLoadingEffectEnabled(flag) {
	return flag === true || flag === 1 || flag === '1';
}

/**
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatLoadingEffectSummary(values) {
	const scaleOn = isLoadingEffectEnabled(
		getByPath(values, 'loadingEffects.enableScale')
	);
	const rotateOn = isLoadingEffectEnabled(
		getByPath(values, 'loadingEffects.enableRotate')
	);
	const slideOn = isLoadingEffectEnabled(
		getByPath(values, 'loadingEffects.enableSlide')
	);
	const scale = scaleOn
		? stringifyValue(getByPath(values, 'loadingEffects.loadedScale'))
		: '';
	const rotate = rotateOn
		? stringifyValue(getByPath(values, 'loadingEffects.loadedRotate'))
		: '';
	const hSlide = slideOn
		? stringifyValue(getByPath(values, 'loadingEffects.loadedHSlide'))
		: '';
	const vSlide = slideOn
		? stringifyValue(getByPath(values, 'loadingEffects.loadedVSlide'))
		: '';
	const hasFx =
		(scale !== '' && scale !== '100') ||
		(rotate !== '' && rotate !== '0') ||
		(hSlide !== '' && hSlide !== '0') ||
		(vSlide !== '' && vSlide !== '0');
	if (!hasFx) {
		return [
			{
				kind: 'text',
				text: __('None', 'modula-best-grid-gallery'),
			},
		];
	}
	/** @type {string[]} */
	const bits = [];
	if (scale !== '' && scale !== '100') {
		bits.push(
			sprintf(
				/* translators: %s: scale percentage for load-in animation */
				__('%s%% scale', 'modula-best-grid-gallery'),
				scale
			)
		);
	}
	if (rotate !== '' && rotate !== '0') {
		bits.push(
			sprintf(
				/* translators: %s: rotation degrees for load-in animation */
				__('%s°', 'modula-best-grid-gallery'),
				rotate
			)
		);
	}
	if (
		bits.length === 0 &&
		((hSlide !== '' && hSlide !== '0') || (vSlide !== '' && vSlide !== '0'))
	) {
		return [
			{
				kind: 'text',
				text: __('Slide', 'modula-best-grid-gallery'),
			},
		];
	}
	return bits.length
		? bits.map((text) => ({ kind: 'text', text }))
		: [{ kind: 'text', text: __('Custom', 'modula-best-grid-gallery') }];
}

/**
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatPasswordSummary(values) {
	const password = stringifyValue(
		getByPath(values, 'passwordProtect.password')
	);
	if (password === '') {
		return [];
	}
	return [
		{
			kind: 'text',
			text: '***',
		},
	];
}

/**
 * Hub summary for gallery license type (short labels).
 *
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatImageLicensingSummary(values) {
	const raw = getByPath(values, 'licensing.imageLicensing');
	const key = stringifyValue(raw) || 'none';
	/** @type {Record<string, string>} */
	const short = {
		none: __('All rights reserved', 'modula-best-grid-gallery'),
		by: __('CC BY 4.0', 'modula-best-grid-gallery'),
		'by-sa': __('CC BY-SA 4.0', 'modula-best-grid-gallery'),
		'by-nc': __('CC BY-NC 4.0', 'modula-best-grid-gallery'),
		'by-nc-sa': __('CC BY-NC-SA 4.0', 'modula-best-grid-gallery'),
		'by-nc-nd': __('CC BY-NC-ND 4.0', 'modula-best-grid-gallery'),
		'by-nd': __('CC BY-ND 4.0', 'modula-best-grid-gallery'),
		cc0: __('CC0', 'modula-best-grid-gallery'),
	};
	const text = short[key] || key;
	return [
		{
			kind: 'text',
			text,
		},
	];
}

/**
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatImageGuardianSummary(values) {
	/** @type {string[]} */
	const bits = [];
	if (isTruthySetting(getByPath(values, 'protection.protection'))) {
		bits.push(__('Right-click', 'modula-best-grid-gallery'));
	}
	if (isTruthySetting(getByPath(values, 'protection.blockDragging'))) {
		bits.push(__('Drag', 'modula-best-grid-gallery'));
	}
	if (isTruthySetting(getByPath(values, 'protection.blurProtection'))) {
		bits.push(__('Blur', 'modula-best-grid-gallery'));
	}
	if (isTruthySetting(getByPath(values, 'protection.urlProtection'))) {
		bits.push(__('Hidden URLs', 'modula-best-grid-gallery'));
	}
	if (bits.length === 0) {
		return [
			{
				kind: 'text',
				text: __('Off', 'modula-best-grid-gallery'),
			},
		];
	}
	return [
		{
			kind: 'text',
			text: bits.join(' · '),
		},
	];
}

/**
 * Hub summary for the play badge on video tiles.
 *
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatPlayBadgeSummary(values) {
	if (!isTruthySetting(getByPath(values, 'video.showVideoIcon'))) {
		return [
			{
				kind: 'text',
				text: __('Off', 'modula-best-grid-gallery'),
			},
		];
	}
	const customId = Number(getByPath(values, 'video.customVideoIcon'));
	if (Number.isFinite(customId) && customId > 0) {
		return [
			{
				kind: 'text',
				text: __('Custom image', 'modula-best-grid-gallery'),
			},
		];
	}
	const field = getEnrichedFieldByGroupedPath('video.videoIconIcon');
	const label = enumLabelForField(
		field,
		getByPath(values, 'video.videoIconIcon')
	);
	return [
		{
			kind: 'text',
			text: label || __('On', 'modula-best-grid-gallery'),
		},
	];
}

/**
 * Hub summary for hover preview on video tiles.
 *
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatHoverPreviewSummary(values) {
	if (!isTruthySetting(getByPath(values, 'video.previewVideo'))) {
		return [
			{
				kind: 'text',
				text: __('Off', 'modula-best-grid-gallery'),
			},
		];
	}
	const duration = stringifyValue(
		getByPath(values, 'video.previewVideoDuration')
	);
	if (duration !== '') {
		return [
			{
				kind: 'text',
				text: sprintf(
					/* translators: %s: preview duration in seconds */
					__('%ss', 'modula-best-grid-gallery'),
					duration
				),
			},
		];
	}
	return [
		{
			kind: 'text',
			text: __('On', 'modula-best-grid-gallery'),
		},
	];
}

/**
 * Hub summary from attachment meta on bootstrap items (not the hidden enable flag).
 *
 * @param {unknown} [bootstrapItems]
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatWatermarkSummary(bootstrapItems) {
	if (!Array.isArray(bootstrapItems) || bootstrapItems.length === 0) {
		return [];
	}

	let total = 0;
	let applied = 0;
	for (const item of bootstrapItems) {
		if (!item || typeof item !== 'object') {
			continue;
		}
		const id = Number(/** @type {{ id?: unknown }} */ (item).id);
		if (!Number.isFinite(id) || id <= 0) {
			continue;
		}
		total += 1;
		if (
			isTruthySetting(
				/** @type {{ watermarkApplied?: unknown }} */ (item)
					.watermarkApplied
			)
		) {
			applied += 1;
		}
	}

	if (total === 0) {
		return [];
	}

	if (applied === 0) {
		return [
			{
				kind: 'text',
				text: __('Not applied', 'modula-best-grid-gallery'),
			},
		];
	}

	if (applied < total) {
		return [
			{
				kind: 'text',
				text: sprintf(
					/* translators: %1$d: watermarked image count, %2$d: total gallery images */
					__('%1$d of %2$d applied', 'modula-best-grid-gallery'),
					applied,
					total
				),
			},
		];
	}

	return [
		{
			kind: 'text',
			text: __('Applied', 'modula-best-grid-gallery'),
		},
	];
}

/**
 * Hub summary for EXIF / shooting data.
 *
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatShootingDataSummary(values) {
	if (!isTruthySetting(getByPath(values, 'exif.enableExif'))) {
		return [
			{
				kind: 'text',
				text: __('Off', 'modula-best-grid-gallery'),
			},
		];
	}
	const fieldPaths = [
		'exif.exifCamera',
		'exif.exifLens',
		'exif.exifShutterSpeed',
		'exif.exifAperture',
		'exif.exifFocalLength',
		'exif.exifIso',
		'exif.exifDate',
	];
	let onCount = 0;
	for (const path of fieldPaths) {
		if (isTruthySetting(getByPath(values, path))) {
			onCount += 1;
		}
	}
	if (onCount === fieldPaths.length) {
		return [
			{
				kind: 'text',
				text: __('All 7 fields', 'modula-best-grid-gallery'),
			},
		];
	}
	return [
		{
			kind: 'text',
			text: sprintf(
				/* translators: %d: number of EXIF fields enabled */
				_n(
					'%d field',
					'%d fields',
					onCount,
					'modula-best-grid-gallery'
				),
				onCount
			),
		},
	];
}

/**
 * Hub summary for deeplink / link to one image.
 *
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatDeeplinkSummary(values) {
	if (!isTruthySetting(getByPath(values, 'deeplink.modulaDeeplink'))) {
		return [
			{
				kind: 'text',
				text: __('Off', 'modula-best-grid-gallery'),
			},
		];
	}
	const slug = stringifyValue(getByPath(values, 'deeplink.customLinkName'));
	const token = slug !== '' ? slug : 'modulagallery';
	return [
		{
			kind: 'text',
			text: `#${token}`,
		},
	];
}

/**
 * Hub summary for Instagram connect + sync.
 *
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatInstagramSummary(values) {
	const connection = getInstagramConnectionState();
	if (connection === 'disconnected') {
		return [
			{
				kind: 'text',
				text: __('Not connected', 'modula-best-grid-gallery'),
			},
		];
	}
	if (isTruthySetting(getByPath(values, 'instagram.syncWithInstagram'))) {
		return [
			{
				kind: 'text',
				text: __('On', 'modula-best-grid-gallery'),
			},
		];
	}
	return [
		{
			kind: 'text',
			text: __('Off', 'modula-best-grid-gallery'),
		},
	];
}

/**
 * Hub summary for performance.
 *
 * @param {Record<string, Record<string, unknown>>} values
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatPerformanceSummary(values) {
	/** @type {string[]} */
	const bits = [];
	if (isTruthySetting(getByPath(values, 'performance.lazyLoad'))) {
		bits.push(__('Lazy load', 'modula-best-grid-gallery'));
	}
	const optimization = stringifyValue(
		getByPath(values, 'performance.enableOptimization')
	);
	if (optimization === 'enabled') {
		bits.push(__('Optimized', 'modula-best-grid-gallery'));
	} else if (optimization === 'disabled') {
		bits.push(__('Optimization off', 'modula-best-grid-gallery'));
	}
	if (bits.length === 0) {
		return [
			{
				kind: 'text',
				text: __('Defaults', 'modula-best-grid-gallery'),
			},
		];
	}
	return bits.map((text) => ({ kind: 'text', text }));
}

/**
 * Hub summary for presets (legacy summaryKind `exportImport`).
 *
 * @return {Array<{ kind: 'text', text: string }>}
 */
function formatExportImportSummary() {
	const config = getModulaSettingsEditorConfig();
	if (!isGalleryDefaultsEntitled(config)) {
		return [
			{
				kind: 'text',
				text: __('Premium', 'modula-best-grid-gallery'),
			},
		];
	}
	const count = Number(config?.galleryDefaults?.presetCount || 0);
	if (!hasGalleryDefaultsPresets(config) || count <= 0) {
		return [
			{
				kind: 'text',
				text: __('No presets yet', 'modula-best-grid-gallery'),
			},
		];
	}
	return [
		{
			kind: 'text',
			text: sprintf(
				/* translators: %d: number of saved gallery presets */
				_n(
					'%d preset',
					'%d presets',
					count,
					'modula-best-grid-gallery'
				),
				count
			),
		},
	];
}

/**
 * @param {object} section Hub drill section
 * @param {Record<string, Record<string, unknown>>} values Form values
 * @param {{ previewItems?: Object[], bootstrapItems?: Object[] }} [extras]
 * @return {Array<{ kind: 'color', color: string } | { kind: 'text', text: string }>}
 */
export function resolveDrillSummaryParts(section, values, extras = {}) {
	if (!section || typeof section !== 'object') {
		return [];
	}

	const kind =
		typeof section.summaryKind === 'string'
			? section.summaryKind.trim()
			: '';
	if (kind === 'galleryLayout') {
		return formatGalleryLayoutSummary(values || {});
	}
	if (kind === 'pagination') {
		return formatPaginationSummary(values || {});
	}
	if (kind === 'lightboxToolbarButtons') {
		return formatLightboxToolbarButtonsSummary(values || {});
	}
	if (kind === 'filtersList') {
		return formatFiltersListSummary(values || {}, extras.previewItems);
	}
	if (kind === 'hoverEffect') {
		return formatHoverEffectSummary(values || {});
	}
	if (kind === 'download') {
		return formatDownloadSummary(values || {});
	}
	if (kind === 'socialNetworks') {
		return formatSocialNetworksSummary(values || {});
	}
	if (kind === 'comments') {
		return formatCommentsSummary(values || {});
	}
	if (kind === 'zoom') {
		return formatZoomSummary(values || {});
	}
	if (kind === 'loadingEffect') {
		return formatLoadingEffectSummary(values || {});
	}
	if (kind === 'password') {
		return formatPasswordSummary(values || {});
	}
	if (kind === 'imageGuardian') {
		return formatImageGuardianSummary(values || {});
	}
	if (kind === 'imageLicensing') {
		return formatImageLicensingSummary(values || {});
	}
	if (kind === 'watermark') {
		return formatWatermarkSummary(extras.bootstrapItems);
	}
	if (kind === 'playBadge') {
		return formatPlayBadgeSummary(values || {});
	}
	if (kind === 'hoverPreview') {
		return formatHoverPreviewSummary(values || {});
	}
	if (kind === 'shootingData') {
		return formatShootingDataSummary(values || {});
	}
	if (kind === 'deeplink') {
		return formatDeeplinkSummary(values || {});
	}
	if (kind === 'instagram') {
		return formatInstagramSummary(values || {});
	}
	if (kind === 'performance') {
		return formatPerformanceSummary(values || {});
	}
	if (kind === 'exportImport') {
		return formatExportImportSummary();
	}

	const parts = Array.isArray(section.summaryParts)
		? section.summaryParts
		: [];
	/** @type {Array<{ kind: 'color', color: string } | { kind: 'text', text: string }>} */
	const out = [];
	for (const part of parts) {
		const resolved = resolveSummaryPart(part, values || {});
		if (resolved) {
			out.push(resolved);
		}
	}
	return out;
}
