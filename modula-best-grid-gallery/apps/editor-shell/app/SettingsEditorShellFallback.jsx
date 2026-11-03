/**
 * Shared Suspense fallback while a settings-editor shell chunk loads.
 * Each editor passes its own loading class (default: the gallery editor's).
 * It shows the same Modula logo as the pre-React boot shell; the message is
 * for screen readers only.
 */
import { __ } from '@wordpress/i18n';
import { BrandLoader } from 'admin-ui';
import AdminUiScope from '../appearance/AdminUiScope';
import { resolveEditorAppearance, readStoredPreference } from '../logic';

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
			<AdminUiScope>
				<BrandLoader
					label={
						message ||
						__('Loading editor…', 'modula-best-grid-gallery')
					}
				/>
			</AdminUiScope>
		</div>
	);
}
