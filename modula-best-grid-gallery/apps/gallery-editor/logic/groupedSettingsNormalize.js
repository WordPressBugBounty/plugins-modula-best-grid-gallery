/**
 * Normalize grouped settings before save / preview (client-side parity with PHP adapter).
 *
 * @package
 */

import {
	DEFAULT_GALLERY_TYPE,
	DEFAULT_MASONRY_GRID_TYPE,
	getLayoutPolicy,
	normalizeUniformGridColumnSetting,
} from 'gallery-shared/preview';
import { normalizeCaptionsBelowImageDefaults } from './captionsBelowImageDefaults';
import { normalizeLoadingEffectsEnables } from './loadingEffectsEnableSideEffects';
import { normalizeSocialEnableFromNetworks } from './socialEnableSideEffects';
import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';

/**
 * Migrate uniform-grid + contain (legacy) → fit-grid before other normalization.
 *
 * @param {Record<string, Record<string, unknown>>} grouped
 */
function migrateUniformContainToFitGrid(grouped) {
	if (grouped?.general?.type !== 'uniform-grid') {
		return;
	}
	const fit = grouped?.layout?.uniformGridImageFit;
	if (typeof fit === 'string' && fit.trim().toLowerCase() === 'contain') {
		grouped.general.type = 'fit-grid';
		const legacyAlign = grouped?.layout?.uniformGridImageAlign;
		grouped.layout.fitGridImageAlign = legacyAlign ?? 'center';
		delete grouped.layout.uniformGridImageFit;
		delete grouped.layout.uniformGridImageAlign;
	}
}

/**
 * @param {Record<string, Record<string, unknown>>|null|undefined} grouped
 */
export function normalizeGroupedDefaults(grouped) {
	if (!grouped || typeof grouped !== 'object') {
		return;
	}
	migrateUniformContainToFitGrid(grouped);
	if (
		grouped.general?.type === DEFAULT_GALLERY_TYPE &&
		(grouped.layout?.gridType === undefined ||
			grouped.layout?.gridType === null ||
			grouped.layout?.gridType === '')
	) {
		if (!grouped.layout || typeof grouped.layout !== 'object') {
			grouped.layout = {};
		}
		grouped.layout.gridType = DEFAULT_MASONRY_GRID_TYPE;
	}
	if (grouped.general?.type === 'uniform-grid') {
		if (!grouped.layout || typeof grouped.layout !== 'object') {
			grouped.layout = {};
		}
		grouped.layout.gridType = normalizeUniformGridColumnSetting(
			grouped.layout.gridType
		);
		delete grouped.layout.uniformGridImageFit;
		delete grouped.layout.uniformGridImageAlign;
	}
	if (grouped.general?.type === 'fit-grid') {
		if (!grouped.layout || typeof grouped.layout !== 'object') {
			grouped.layout = {};
		}
		grouped.layout.gridType = normalizeUniformGridColumnSetting(
			grouped.layout.gridType
		);
		grouped.layout.fitGridImageAlign =
			getLayoutPolicy(grouped).derived.fitGridAlign;
		delete grouped.layout.uniformGridImageFit;
		delete grouped.layout.uniformGridImageAlign;
	}

	if (!grouped.general || typeof grouped.general !== 'object') {
		grouped.general = {};
	}
	if (Object.prototype.hasOwnProperty.call(grouped.general, 'width')) {
		grouped.general.width = getLayoutPolicy(grouped).clampWidth(
			grouped.general.width
		);
	}

	if (!grouped.captions || typeof grouped.captions !== 'object') {
		grouped.captions = {};
	}
	if (
		grouped.captions.contentPlacement === undefined ||
		grouped.captions.contentPlacement === null ||
		grouped.captions.contentPlacement === ''
	) {
		grouped.captions.contentPlacement = 'inside-image';
	}
	if (
		grouped.captions.compactCaptionPopover === undefined ||
		grouped.captions.compactCaptionPopover === null ||
		grouped.captions.compactCaptionPopover === ''
	) {
		grouped.captions.compactCaptionPopover = true;
	}
	{
		const rawMin = parseInt(grouped.captions.compactCaptionMinSize, 10);
		if (!Number.isFinite(rawMin)) {
			grouped.captions.compactCaptionMinSize = 240;
		} else {
			grouped.captions.compactCaptionMinSize = Math.min(
				480,
				Math.max(80, rawMin)
			);
		}
	}
	normalizeCaptionsBelowImageDefaults(grouped.captions);

	if (!grouped.loadingEffects || typeof grouped.loadingEffects !== 'object') {
		grouped.loadingEffects = {};
	}
	normalizeLoadingEffectsEnables(grouped.loadingEffects);

	if (!grouped.social || typeof grouped.social !== 'object') {
		grouped.social = {};
	}
	normalizeSocialEnableFromNetworks(grouped.social);

	if (!grouped.licensing || typeof grouped.licensing !== 'object') {
		grouped.licensing = {};
	}
	{
		const config = getModulaSettingsEditorConfig();
		const globals =
			config?.licensingGlobal &&
			typeof config.licensingGlobal === 'object'
				? config.licensingGlobal
				: {};
		const authorEmpty =
			grouped.licensing.author === undefined ||
			grouped.licensing.author === null ||
			String(grouped.licensing.author).trim() === '';
		const companyEmpty =
			grouped.licensing.company === undefined ||
			grouped.licensing.company === null ||
			String(grouped.licensing.company).trim() === '';
		if (
			authorEmpty &&
			typeof globals.author === 'string' &&
			globals.author.trim() !== ''
		) {
			grouped.licensing.author = globals.author.trim();
		}
		if (
			companyEmpty &&
			typeof globals.company === 'string' &&
			globals.company.trim() !== ''
		) {
			grouped.licensing.company = globals.company.trim();
		}
	}

	if (!grouped.watermark || typeof grouped.watermark !== 'object') {
		grouped.watermark = {};
	}
	{
		const type = grouped.watermark.watermarkType;
		const typeStr =
			typeof type === 'string' ? type.trim().toLowerCase() : '';
		if (!typeStr) {
			const imageId = Number(grouped.watermark.watermarkImage);
			grouped.watermark.watermarkType =
				Number.isFinite(imageId) && imageId > 0 ? 'image' : 'none';
		}
		const scope = grouped.watermark.watermarkApplyScope;
		if (scope === undefined || scope === null || scope === '') {
			grouped.watermark.watermarkApplyScope = 'all';
		}
		const opacity = parseInt(grouped.watermark.watermarkOpacity, 10);
		if (!Number.isFinite(opacity)) {
			grouped.watermark.watermarkOpacity = 60;
		}
	}

	if (!grouped.responsive || typeof grouped.responsive !== 'object') {
		grouped.responsive = {};
	}
	{
		const tabletUnder = parseInt(grouped.responsive.treatAsTabletUnder, 10);
		if (!Number.isFinite(tabletUnder)) {
			grouped.responsive.treatAsTabletUnder = 1024;
		} else {
			grouped.responsive.treatAsTabletUnder = Math.min(
				1400,
				Math.max(768, tabletUnder)
			);
		}
		const phoneUnder = parseInt(grouped.responsive.treatAsPhoneUnder, 10);
		if (!Number.isFinite(phoneUnder)) {
			grouped.responsive.treatAsPhoneUnder = 600;
		} else {
			grouped.responsive.treatAsPhoneUnder = Math.min(
				900,
				Math.max(320, phoneUnder)
			);
		}
	}
}
