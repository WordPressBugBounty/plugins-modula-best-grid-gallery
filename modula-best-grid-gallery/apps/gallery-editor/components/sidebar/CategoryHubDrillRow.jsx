/**
 * Hub section `type: drill` — chevron opens `TakeoverSidebarStack` with all visible paths for a schema group.
 */
import { __, sprintf } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { Icon, chevronRight } from '@wordpress/icons';
import { useTakeoverSidebarStack } from '../../context/TakeoverSidebarStackContext';

/**
 * @param {Object}   props
 * @param {string}   props.label Row label (already translated).
 * @param {string[]} props.groupedPaths Paths to render inside the nested frame.
 * @param {Object}   [props.auxiliaryPanel] Optional middle-column panel while this frame is open.
 * @param {string}   [props.nestedUpsellGroupedPath] Upsell field when gated paths are hidden.
 */
export default function CategoryHubDrillRow({
	label,
	groupedPaths,
	auxiliaryPanel = null,
	nestedUpsellGroupedPath = '',
}) {
	const { pushFrame } = useTakeoverSidebarStack();
	const canOpen = Array.isArray(groupedPaths) && groupedPaths.length > 0;

	return (
		<div className="modula-settings-editor__category-hub-drill-row">
			<Button
				type="button"
				variant="tertiary"
				className="modula-settings-editor__category-hub-drill-btn"
				disabled={!canOpen}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					if (!canOpen) {
						return;
					}
					pushFrame({
						title: label,
						groupedPaths,
						...(auxiliaryPanel ? { auxiliaryPanel } : {}),
						...(typeof nestedUpsellGroupedPath === 'string' &&
						nestedUpsellGroupedPath.trim() !== ''
							? {
									nestedUpsellGroupedPath:
										nestedUpsellGroupedPath.trim(),
								}
							: {}),
					});
				}}
				aria-label={
					canOpen
						? sprintf(
								/* translators: %s: subsection title (e.g. Slider). */
								__(
									'Open %s settings',
									'modula-best-grid-gallery'
								),
								label
							)
						: __(
								'No options to show for the current gallery type.',
								'modula-best-grid-gallery'
							)
				}
			>
				<span className="modula-settings-editor__category-hub-drill-label">
					{label}
				</span>
				<Icon
					icon={chevronRight}
					size={18}
					className="modula-settings-editor__category-hub-drill-chevron"
					aria-hidden="true"
				/>
			</Button>
		</div>
	);
}
