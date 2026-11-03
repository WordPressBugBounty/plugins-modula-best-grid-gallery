/**
 * Start/End segment choosing where new items are inserted (each editor's
 * Sort popover, member picker). Each editor supplies its own label and group
 * name.
 */
import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Segmented, SettingsRow } from 'admin-ui';

/**
 * @param {Object}                          props
 * @param {string}                          props.value      `start` or `end`; anything else reads as `end`.
 * @param {(position: string) => void}      props.onChange
 * @param {string}                          props.label      Row label (for example "New images").
 * @param {string}                          props.groupLabel Accessible name of the segment group.
 */
export default function InsertPositionSegment({
	value,
	onChange,
	label,
	groupLabel,
}) {
	const controlId = `modula-insert-position-${useId()}`;
	const options = [
		{ value: 'start', label: __('Start', 'modula-best-grid-gallery') },
		{ value: 'end', label: __('End', 'modula-best-grid-gallery') },
	];

	// The wrapper keeps the label and the segment on one line in a narrow
	// column (see `_insert-position-segment.scss`).
	return (
		<div className="modula-takeover__insert-position">
			<SettingsRow
				label={label}
				controlId={controlId}
				labelElement="span"
			>
				{/* The group keeps its fuller name ("Where to add new images
				in the gallery list"); the row label is the short caption. */}
				<Segmented
					aria-label={groupLabel}
					options={options}
					value={value === 'start' ? 'start' : 'end'}
					onChange={onChange}
				/>
			</SettingsRow>
		</div>
	);
}
