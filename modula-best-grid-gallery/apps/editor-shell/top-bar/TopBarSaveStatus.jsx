/**
 * Top-bar save indicator: ✓ Saved / Saving… / Unsaved / error.
 */
import { Icon, check } from '@wordpress/icons';
import { getSaveStatusLabel } from './saveStatusLabel';

/**
 * @param {Object}                                    props
 * @param {'saved'|'saving'|'unsaved'|'error'|string} props.status
 * @param {string}                                    [props.errorMessage] Shown instead of the label while `status` is `error`.
 */
export default function TopBarSaveStatus({ status, errorMessage = '' }) {
	const isBusy = status === 'saving' || status === 'unsaved';
	const isError = status === 'error';

	const label = getSaveStatusLabel({ status, errorMessage });

	let stateClass = ' is-saved';
	if (isError) {
		stateClass = ' is-error';
	} else if (isBusy) {
		stateClass = ' is-busy';
	}

	return (
		<div
			className={`modula-takeover__topbar-save-status${stateClass}`}
			role="status"
			aria-live="polite"
			aria-busy={status === 'saving'}
		>
			{!isBusy && !isError ? (
				<Icon
					icon={check}
					size={16}
					className="modula-takeover__topbar-save-status-icon"
					aria-hidden="true"
				/>
			) : null}
			<span className="modula-takeover__topbar-save-status-label">
				{label}
			</span>
		</div>
	);
}
