/**
 * Top-bar save indicator: ✓ Saved / Saving… / Unsaved / error.
 */
import { __ } from '@wordpress/i18n';
import { Icon, check } from '@wordpress/icons';
import { useTakeoverSaveStatus } from '../../context/TakeoverSaveStatusContext';

export default function TakeoverTopBarSaveStatus() {
	const { status, errorMessage } = useTakeoverSaveStatus();

	const isBusy = status === 'saving' || status === 'unsaved';
	const isError = status === 'error';

	let label = __('Saved', 'modula-best-grid-gallery');
	if (isError && errorMessage) {
		label = errorMessage;
	} else if (status === 'saving') {
		label = __('Saving…', 'modula-best-grid-gallery');
	} else if (status === 'unsaved') {
		label = __('Unsaved changes', 'modula-best-grid-gallery');
	}

	return (
		<div
			className={`modula-gallery-takeover__topbar-save-status${
				isError ? ' is-error' : isBusy ? ' is-busy' : ' is-saved'
			}`}
			role="status"
			aria-live="polite"
			aria-busy={status === 'saving'}
		>
			{!isBusy && !isError ? (
				<Icon
					icon={check}
					size={16}
					className="modula-gallery-takeover__topbar-save-status-icon"
					aria-hidden="true"
				/>
			) : null}
			<span className="modula-gallery-takeover__topbar-save-status-label">
				{label}
			</span>
		</div>
	);
}
