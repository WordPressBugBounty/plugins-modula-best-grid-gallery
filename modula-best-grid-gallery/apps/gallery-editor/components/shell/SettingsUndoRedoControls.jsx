/**
 * Undo / redo gallery settings (TanStack Form grouped values).
 */
import { __, sprintf } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { displayShortcut } from '@wordpress/keycodes';
import { undo as undoIcon, redo as redoIcon } from '@wordpress/icons';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';

/**
 * @param {Object}               props
 * @param {'topbar' | 'metabox'} [props.variant='metabox']
 */
export default function SettingsUndoRedoControls({ variant = 'metabox' }) {
	const { undoRedo } = useGallerySettingsFormBundle();
	const { undo, redo, canUndo, canRedo } = undoRedo;

	const undoTip = sprintf(
		/* translators: %s: keyboard shortcut */
		__('Undo (%s)', 'modula-best-grid-gallery'),
		displayShortcut.primary('z')
	);
	const redoTip = sprintf(
		/* translators: %s: keyboard shortcut */
		__('Redo (%s)', 'modula-best-grid-gallery'),
		displayShortcut.primaryShift('z')
	);

	const isTopbar = variant === 'topbar';

	if (isTopbar) {
		return (
			<div
				className="modula-settings-editor__undo-redo modula-settings-editor__undo-redo--topbar"
				role="group"
				aria-label={__(
					'Undo and redo settings changes',
					'modula-best-grid-gallery'
				)}
			>
				<Button
					type="button"
					variant="tertiary"
					className="modula-gallery-takeover__topbar-icon-btn"
					icon={undoIcon}
					label={undoTip}
					disabled={!canUndo}
					onClick={undo}
				/>
				<Button
					type="button"
					variant="tertiary"
					className="modula-gallery-takeover__topbar-icon-btn"
					icon={redoIcon}
					label={redoTip}
					disabled={!canRedo}
					onClick={redo}
				/>
			</div>
		);
	}

	return (
		<div
			className="modula-settings-editor__undo-redo"
			role="group"
			aria-label={__(
				'Undo and redo settings changes',
				'modula-best-grid-gallery'
			)}
		>
			<Button
				type="button"
				variant="secondary"
				size="small"
				icon={undoIcon}
				disabled={!canUndo}
				onClick={undo}
			>
				{__('Undo', 'modula-best-grid-gallery')}
			</Button>
			<Button
				type="button"
				variant="secondary"
				size="small"
				icon={redoIcon}
				disabled={!canRedo}
				onClick={redo}
			>
				{__('Redo', 'modula-best-grid-gallery')}
			</Button>
		</div>
	);
}
