/**
 * Hub section `type: drill` — opens `TakeoverSidebarStack` with all visible paths for a schema group.
 */
import { __ } from '@wordpress/i18n';
import { HubDrillRow } from 'editor-shell';
import { useTakeoverSidebarStack } from '../../context/TakeoverSidebarStackContext';

/**
 * @param {Object}   props
 * @param {string}   props.label                     Row label (already translated).
 * @param {string[]} props.groupedPaths              Paths to render inside the nested frame.
 * @param {Object}   [props.auxiliaryPanel]          Optional middle-column panel while this frame is open.
 * @param {string}   [props.nestedUpsellGroupedPath] Upsell field when gated paths are hidden.
 */
export default function CategoryHubDrillRow({
	label,
	groupedPaths,
	auxiliaryPanel = null,
	nestedUpsellGroupedPath = '',
}) {
	const { pushFrame } = useTakeoverSidebarStack();
	const upsellPath =
		typeof nestedUpsellGroupedPath === 'string'
			? nestedUpsellGroupedPath.trim()
			: '';

	return (
		<HubDrillRow
			label={label}
			canOpen={Array.isArray(groupedPaths) && groupedPaths.length > 0}
			unavailableLabel={__(
				'No options to show for the current gallery type.',
				'modula-best-grid-gallery'
			)}
			onOpen={() =>
				pushFrame({
					title: label,
					groupedPaths,
					...(auxiliaryPanel ? { auxiliaryPanel } : {}),
					...(upsellPath
						? { nestedUpsellGroupedPath: upsellPath }
						: {}),
				})
			}
		/>
	);
}
