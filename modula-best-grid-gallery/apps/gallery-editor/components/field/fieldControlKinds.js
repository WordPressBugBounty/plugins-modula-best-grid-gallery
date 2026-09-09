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
import { renderCustomCssTextareaKind } from './kinds/customCssTextareaKind';
import { renderRangeKind } from './kinds/rangeKind';
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
import { renderFallbackKind } from './kinds/fallbackKind';
import { renderPasswordWithStrengthKind } from './kinds/passwordWithStrengthKind';
import { renderSegmentedEnumKind } from './kinds/segmentedEnumKind';
import { renderPositionGridKind } from './kinds/positionGridKind';
import { renderWatermarkApplyScopeKind } from './kinds/watermarkApplyScopeKind';
import { renderPlaceholderPatternKind } from './kinds/placeholderPatternKind';
import { renderTemplateLayoutSelectKind } from './kinds/templateLayoutSelectKind';

/**
 * Maps `control.kind` to field UI (see `FieldControl.jsx` entry).
 */

const CTX_KEYS = ['field', 'control', 'value', 'onChange', 'disabled', 'help'];

function ctxPick(props) {
	/** @type {Record<string, unknown>} */
	const o = {};
	for (const k of CTX_KEYS) {
		if (props[k] !== undefined) {
			o[k] = props[k];
		}
	}
	return o;
}

/**
 * @param {Object}           props
 * @param {Object}           props.field
 * @param {Object}           props.control
 * @param {string}           props.kind
 * @param {*}                props.value
 * @param {Function}         props.onChange
 * @param {boolean}          props.disabled
 * @param {string|undefined} props.help
 */
export function renderFieldControlKind(props) {
	const { kind } = props;
	const ctx = ctxPick(props);

	switch (kind) {
		case 'toggle':
			return renderToggleKind(ctx);
		case 'toggleWithNested':
			return renderToggleKind({
				...ctx,
				control: { ...ctx.control, kind: 'toggle' },
			});
		case 'text':
			return renderTextKind(ctx);
		case 'metadataFiltersAutocomplete':
			return renderMetadataFiltersAutocompleteKind(ctx);
		case 'number':
			return renderNumberKind(ctx);
		case 'actionButton':
			return renderActionButtonKind(ctx);
		case 'range':
			return renderRangeKind(ctx);
		case 'select':
			return renderSelectKind(ctx);
		case 'licenseImageSelect':
			return renderLicenseImageSelectKind(ctx);
		case 'segmentedEnum':
			return renderSegmentedEnumKind(ctx);
		case 'positionGrid':
			return renderPositionGridKind(ctx);
		case 'watermarkApplyScope':
			return renderWatermarkApplyScopeKind(ctx);
		case 'placeholderPattern':
			return renderPlaceholderPatternKind(ctx);
		case 'templateLayoutSelect':
			return renderTemplateLayoutSelectKind(ctx);
		case 'defaultActiveFilterSelect':
			return renderDefaultActiveFilterKind(ctx);
		case 'textarea':
			return renderTextareaKind(ctx);
		case 'customCssTextarea':
			return renderCustomCssTextareaKind(ctx);
		case 'passwordWithStrength':
			return renderPasswordWithStrengthKind(ctx);
		case 'color':
			return renderColorKind(ctx);
		case 'parallaxOverlayColor':
			return renderParallaxOverlayColorKind(ctx);
		case 'tuple3':
			return renderTuple3Kind(ctx);
		case 'dimensions':
			return renderDimensionsKind(ctx);
		case 'filterNameList':
			return renderFilterNameListKind(ctx);
		case 'mediaAttachment':
			return renderMediaAttachmentKind(ctx);
		case 'mediaUrl':
			return renderMediaUrlKind(ctx);
		case 'stringList':
			return renderStringListKind(ctx);
		case 'object':
			return renderObjectKind(ctx);
		default:
			return renderFallbackKind({ ...ctx, kind });
	}
}
