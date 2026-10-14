/**
 * Hub drill / nested section visibility for the gallery editor schema.
 *
 * The rules are shared with the Albums editor through the editor shell; this
 * module binds them to the gallery field schema.
 *
 * @package
 */

import { createHubSectionVisibility } from 'editor-shell/logic';
import { evaluateWhen, isFieldVisible } from './fieldVisibility';
import { getEnrichedFieldByGroupedPath } from '../data/formSchema';
import { getGroupedPathsForHubDrillSection } from '../utils/getGroupedPathsForHubDrillSection';

export const {
	isHubHeadingField,
	isVisibleHubChildField,
	hubChildFieldsHaveVisibleContent,
	hubPathsHaveVisibleChildren,
	hubDrillHasUpsellFallback,
	shouldRenderHubDrill,
	shouldRenderHubSection,
	hubCategoryHasVisibleContent,
} = createHubSectionVisibility({
	evaluateWhen,
	isFieldVisible,
	getFieldByGroupedPath: (groupedPath) =>
		getEnrichedFieldByGroupedPath(groupedPath)?.field,
	getDrillPaths: getGroupedPathsForHubDrillSection,
});
