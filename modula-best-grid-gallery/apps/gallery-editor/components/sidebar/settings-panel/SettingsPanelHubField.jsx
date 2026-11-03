/**
 * One hub field row. Toggles, selects, segmented, colour and position fields
 * use the compact hub rows; every other kind uses the stacked schema row, so
 * no kind is left out of the hub.
 */
import { getGroupKeyFromGroupedPath } from '../../../data/formSchema';
import SchemaFieldRow from '../../schema/SchemaFieldRow';
import SettingsPanelColorRow from './SettingsPanelColorRow';
import SettingsPanelGalleryTypeRow from './SettingsPanelGalleryTypeRow';
import SettingsPanelMotionChoiceRow from './SettingsPanelMotionChoiceRow';
import SettingsPanelPositionGridRow from './SettingsPanelPositionGridRow';
import SettingsPanelSegmentedRow from './SettingsPanelSegmentedRow';
import SettingsPanelSelectRow from './SettingsPanelSelectRow';
import SettingsPanelToggleRow from './SettingsPanelToggleRow';

// The gallery type row confirms a type change and explains the chosen type.
const GALLERY_TYPE_PATH = 'general.type';

const HUB_ROW_BY_KIND = {
	toggle: SettingsPanelToggleRow,
	toggleWithNested: SettingsPanelToggleRow,
	color: SettingsPanelColorRow,
	parallaxOverlayColor: SettingsPanelColorRow,
	segmentedEnum: SettingsPanelSegmentedRow,
	select: SettingsPanelSelectRow,
	templateLayoutSelect: SettingsPanelSelectRow,
	motionChoice: SettingsPanelMotionChoiceRow,
	positionGrid: SettingsPanelPositionGridRow,
};

/**
 * @param {Object} props
 * @param {Object} props.field             Enriched schema field.
 * @param {Object} [props.dependentsReset] Reset of the headless box under the field.
 */
export default function SettingsPanelHubField({ field, dependentsReset }) {
	const groupKey = getGroupKeyFromGroupedPath(field);
	const labelId = `modula-settings-panel-field-${field.groupedPath.replace(
		/[^a-z0-9.-]/gi,
		'-'
	)}`;

	if (field.groupedPath === GALLERY_TYPE_PATH) {
		return (
			<SettingsPanelGalleryTypeRow
				groupKey={groupKey}
				field={field}
				labelId={labelId}
			/>
		);
	}

	const HubRow = HUB_ROW_BY_KIND[field.control?.kind];
	if (!HubRow) {
		return (
			<SchemaFieldRow
				groupKey={groupKey}
				field={field}
				disabled={false}
				variant="stacked"
				dependentsReset={dependentsReset}
			/>
		);
	}
	return (
		<HubRow
			groupKey={groupKey}
			field={field}
			labelId={labelId}
			dependentsReset={dependentsReset}
		/>
	);
}
