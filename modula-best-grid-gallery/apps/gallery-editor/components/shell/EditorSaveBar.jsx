/**
 * Submit bar wired to TanStack Form (dirty state + validation + PATCH).
 */

import { __ } from '@wordpress/i18n';
import { Button, Notice } from '@wordpress/components';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import SettingsUndoRedoControls from './SettingsUndoRedoControls';

/**
 * Primary save action — reusable in metabox toolbar or takeover top bar.
 *
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props.variant='primary']
 * @param {string} [props.label]             Save button label when idle (not saving).
 */
export function SavePrimaryButton({ className, variant = 'primary', label }) {
	const { form } = useGallerySettingsFormBundle();
	const idleLabel =
		label || __('Save settings (v2)', 'modula-best-grid-gallery');

	return (
		<form.Subscribe
			selector={(s) => ({
				isDirty: s.isDirty,
				canSubmit: s.canSubmit,
				isSubmitting: s.isSubmitting,
			})}
		>
			{({ isDirty, canSubmit, isSubmitting }) => (
				<Button
					variant={variant}
					className={className}
					aria-busy={isSubmitting}
					disabled={!isDirty || !canSubmit || isSubmitting}
					onClick={() => void form.handleSubmit()}
				>
					{isSubmitting
						? __('Saving…', 'modula-best-grid-gallery')
						: idleLabel}
				</Button>
			)}
		</form.Subscribe>
	);
}

/**
 * @param {Object}  props
 * @param {boolean} [props.showPrimaryButton=true] Set false in takeover (save lives in top bar).
 */
export default function EditorSaveBar({ showPrimaryButton = true }) {
	const { patchMutation, clientError } = useGallerySettingsFormBundle();

	return (
		<div className="modula-settings-editor__save-bar">
			<div
				className="modula-settings-editor__save-bar-announce"
				aria-live="polite"
				aria-relevant="additions text"
			>
				{clientError ? (
					<Notice status="error" isDismissible={false}>
						{clientError}
					</Notice>
				) : null}
				{patchMutation.isError && (
					<Notice status="error" isDismissible={false}>
						{patchMutation.error?.message ||
							String(patchMutation.error || '')}
					</Notice>
				)}
			</div>
			<div className="modula-settings-editor__save-bar-row">
				<SettingsUndoRedoControls variant="metabox" />
				{showPrimaryButton ? <SavePrimaryButton /> : null}
			</div>
		</div>
	);
}
