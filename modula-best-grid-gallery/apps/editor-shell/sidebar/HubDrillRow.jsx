/**
 * Category hub drill row — label + chevron that opens a nested settings frame.
 */
import { __, sprintf } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { Icon, chevronRight } from '@wordpress/icons';

/**
 * @param {Object}     props
 * @param {string}     props.label            Row label (already translated).
 * @param {boolean}    props.canOpen          False when the drill has nothing to show.
 * @param {() => void} props.onOpen
 * @param {string}     props.unavailableLabel Accessible name while `canOpen` is false.
 */
export default function HubDrillRow({
	label,
	canOpen,
	onOpen,
	unavailableLabel,
}) {
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
					if (canOpen) {
						onOpen();
					}
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
						: unavailableLabel
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
