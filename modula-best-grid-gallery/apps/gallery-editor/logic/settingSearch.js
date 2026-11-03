/**
 * Setting search ("Find a setting…") bound to the gallery schema and panel.
 * The index and matching rules live in the editor shell
 * (`createSettingSearch`); the gallery adds its Zoom on hover row.
 */
import { __ } from '@wordpress/i18n';
import { createSettingSearch } from 'editor-shell/logic';
import {
	getEnrichedFieldByGroupedPath,
	getEnrichedFieldsForGroup,
} from '../data/formSchema';
import { getGroupedPathsForHubDrillSection } from '../utils/getGroupedPathsForHubDrillSection';
import { resolveHubV2FieldLabel } from '../constants/sidebarV2Meta';
import { isCategoryVisible } from './categoryVisibility';
import { isFieldVisible } from './fieldVisibility';
import {
	isHubHeadingField,
	shouldRenderHubSection,
} from './hubSectionVisibility';
import { resolveOmitControlInLite } from './proGateLock';
import { ZOOM_ON_HOVER_ANCHOR } from './settingAnchor';
import {
	isFieldEntryShown,
	isSectionLocked,
	resolveSectionTitle,
} from './settingsPanelSections';

/**
 * @typedef {import('editor-shell/sidebar/settingSearchIndex').SettingSearchResult} SettingSearchResult
 */

export { matchSettings } from 'editor-shell/logic';

export const { buildSettingSearchIndex, listShownSettings } =
	createSettingSearch({
		getFieldByGroupedPath: getEnrichedFieldByGroupedPath,
		getFieldsForGroup: getEnrichedFieldsForGroup,
		resolveFieldLabel: resolveHubV2FieldLabel,
		resolveSectionTitle,
		getDrillPaths: getGroupedPathsForHubDrillSection,
		isHubHeadingField,
		isCategoryVisible,
		shouldRenderHubSection,
		isFieldEntryShown,
		isFieldVisible,
		isSectionLocked,
		isFieldLocked: (field, editor) =>
			resolveOmitControlInLite(field.schema, editor),
		// A locked section draws its upsell (`SettingsPanelItems`).
		showsLockedSectionUpsell: true,
		itemRows: {
			zoomOnHoverToggle: {
				anchor: ZOOM_ON_HOVER_ANCHOR,
				label: __('Zoom on hover', 'modula-best-grid-gallery'),
			},
		},
	});
