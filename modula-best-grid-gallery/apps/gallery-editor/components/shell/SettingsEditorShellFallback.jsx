/**
 * Shared Suspense fallback while a settings-editor shell chunk loads.
 */
import { __ } from '@wordpress/i18n';
import { Spinner } from '@wordpress/components';
import {
	resolveEditorAppearance,
	readStoredPreference,
} from '../../constants/settingsEditorAppearance';

/**
 * @param {{ className?: string, message?: string }} [props]
 */
export default function SettingsEditorShellFallback({
	className = 'modula-settings-editor__shell-loading',
	message,
}) {
	const appearance = resolveEditorAppearance(readStoredPreference());

	return (
		<div
			className={className}
			data-appearance={appearance}
			role="status"
			aria-live="polite"
			aria-busy="true"
		>
			<Spinner />
			<span>
				{message || __('Loading editor…', 'modula-best-grid-gallery')}
			</span>
		</div>
	);
}
