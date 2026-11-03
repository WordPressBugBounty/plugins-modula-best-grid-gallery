import { renderToggleKind } from './kinds/toggleKind';
import {
	renderTextKind,
	renderMetadataFiltersAutocompleteKind,
	renderNumberKind,
	renderActionButtonKind,
	renderTextareaKind,
	renderStringListKind,
	renderObjectKind,
} from './kinds/basicInputKinds';
import { renderCssLengthKind } from './kinds/cssLengthKind';
import { renderCustomCssTextareaKind } from './kinds/customCssTextareaKind';
import { renderRangeKind } from './kinds/rangeKind';
import { renderProofingSelectionRangeKind } from './kinds/proofingSelectionRangeKind';
import { renderSelectKind } from './kinds/selectKind';
import { renderLicenseImageSelectKind } from './kinds/licenseImageSelectKind';
import {
	renderDefaultActiveFilterKind,
	renderFilterNameListKind,
	renderMediaAttachmentKind,
	renderMediaUrlKind,
} from './kinds/wiredKinds';
import { renderColorKind } from './kinds/colorKind';
import { renderParallaxOverlayColorKind } from './kinds/parallaxOverlayColorKind';
import { renderTuple3Kind } from './kinds/tuple3Kind';
import { renderDimensionsKind } from './kinds/dimensionsKind';
import { renderUnknownKind } from './kinds/unknownKind';
import { renderPasswordWithStrengthKind } from './kinds/passwordWithStrengthKind';
import { renderSegmentedEnumKind } from './kinds/segmentedEnumKind';
import { renderPositionGridKind } from './kinds/positionGridKind';
import { renderWatermarkApplyScopeKind } from './kinds/watermarkApplyScopeKind';
import { renderPlaceholderPatternKind } from './kinds/placeholderPatternKind';
import { renderTemplateLayoutSelectKind } from './kinds/templateLayoutSelectKind';
import { renderMotionChoiceKind } from './kinds/motionChoiceKind';

/**
 * The one mapping from `control.kind` to its admin-ui control (entry:
 * `FieldControl.jsx`). Kinds that draw a whole row instead of a control
 * (headings, callouts, previews) live in `schema/schemaRowKinds.jsx`;
 * `fieldKindMapping.test.js` checks both cover the generated schema.
 *
 * Each renderer receives the field context below and returns the control;
 * the row around it (label, reset dot, upsell) belongs to the caller.
 */
const FIELD_CONTROL_RENDERERS = {
	toggle: renderToggleKind,
	// The nested drill is row chrome (SchemaFieldRowToggleWithNestedGrid);
	// the control is the toggle.
	toggleWithNested: renderToggleKind,
	text: renderTextKind,
	cssLength: renderCssLengthKind,
	metadataFiltersAutocomplete: renderMetadataFiltersAutocompleteKind,
	number: renderNumberKind,
	actionButton: renderActionButtonKind,
	range: renderRangeKind,
	proofingSelectionRange: renderProofingSelectionRangeKind,
	select: renderSelectKind,
	licenseImageSelect: renderLicenseImageSelectKind,
	segmentedEnum: renderSegmentedEnumKind,
	positionGrid: renderPositionGridKind,
	watermarkApplyScope: renderWatermarkApplyScopeKind,
	placeholderPattern: renderPlaceholderPatternKind,
	templateLayoutSelect: renderTemplateLayoutSelectKind,
	motionChoice: renderMotionChoiceKind,
	defaultActiveFilterSelect: renderDefaultActiveFilterKind,
	textarea: renderTextareaKind,
	customCssTextarea: renderCustomCssTextareaKind,
	passwordWithStrength: renderPasswordWithStrengthKind,
	color: renderColorKind,
	parallaxOverlayColor: renderParallaxOverlayColorKind,
	tuple3: renderTuple3Kind,
	dimensions: renderDimensionsKind,
	filterNameList: renderFilterNameListKind,
	mediaAttachment: renderMediaAttachmentKind,
	mediaUrl: renderMediaUrlKind,
	stringList: renderStringListKind,
	object: renderObjectKind,
};

/**
 * @typedef {Object} FieldControlContext
 * @property {Object}           field     Enriched form schema field.
 * @property {Object}           control   `field.control`.
 * @property {string}           kind
 * @property {string}           controlId Id for the native control, so the row label names it.
 * @property {string}           label     Setting name, for controls named by their own button.
 * @property {*}                value
 * @property {Function}         onChange
 * @property {boolean}          disabled
 * @property {string|undefined} help
 */

/**
 * @param {FieldControlContext} ctx
 * @return {import('react').ReactNode} The control for `ctx.kind`.
 */
export function renderFieldControlKind(ctx) {
	const render = Object.prototype.hasOwnProperty.call(
		FIELD_CONTROL_RENDERERS,
		ctx.kind
	)
		? FIELD_CONTROL_RENDERERS[ctx.kind]
		: renderUnknownKind;

	return render(ctx);
}
