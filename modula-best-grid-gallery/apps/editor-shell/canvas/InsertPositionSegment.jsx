/**
 * Start/End segment choosing where new items are inserted (Sort & order panel,
 * member picker). Each editor supplies its own label and group name.
 */
import { __ } from '@wordpress/i18n';

const POSITIONS = ['start', 'end'];

/**
 * @param {Object}                          props
 * @param {string}                          props.value      `start` or `end`; anything else reads as `end`.
 * @param {(position: string) => void}      props.onChange
 * @param {string}                          props.label      Visible caption (for example "New images").
 * @param {string}                          props.groupLabel Accessible name of the segment group.
 */
export default function InsertPositionSegment({
	value,
	onChange,
	label,
	groupLabel,
}) {
	const current = value === 'start' ? 'start' : 'end';
	const buttonLabels = {
		start: __('Start', 'modula-best-grid-gallery'),
		end: __('End', 'modula-best-grid-gallery'),
	};

	return (
		<div
			className="modula-takeover__preview-insert"
			role="group"
			aria-label={groupLabel}
		>
			<span className="modula-takeover__preview-insert-label">
				{label}
			</span>
			<div className="modula-takeover__preview-segment">
				{POSITIONS.map((position) => (
					<button
						key={position}
						type="button"
						className={`modula-takeover__preview-segment-btn${
							current === position ? ' is-active' : ''
						}`}
						aria-pressed={current === position}
						onClick={() => onChange(position)}
					>
						{buttonLabels[position]}
					</button>
				))}
			</div>
		</div>
	);
}
