/**
 * Canvas chrome status bar — layout facts (left) + last settings step / undo-redo (right).
 */
import { Fragment } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { usePreviewReduxStoreItems } from '../../hooks/usePreviewReduxStoreItems';
import { buildPreviewStatusBarFacts } from '../../utils/buildPreviewStatusBarFacts';
import {
	statusBarRedoIcon,
	statusBarUndoIcon,
} from '../../utils/statusBarHistoryIcons';

/**
 * @param {{
 *   previewViewport?: 'desktop' | 'tablet' | 'mobile',
 * }} props
 */
export default function GalleryPreviewStatusBar({
	previewViewport = 'desktop',
}) {
	const { form, undoRedo } = useGallerySettingsFormBundle();
	const {
		undo,
		redo,
		canUndo,
		canRedo,
		lastStepLabel,
		undoStepLabel,
		redoStepLabel,
		stackVersion,
	} = undoRedo;
	const items = usePreviewReduxStoreItems();

	const undoTitle = undoStepLabel
		? sprintf(
				/* translators: %s: description of the settings change to undo */
				__('Undo: %s', 'modula-best-grid-gallery'),
				undoStepLabel
			)
		: __('Undo', 'modula-best-grid-gallery');
	const redoTitle = redoStepLabel
		? sprintf(
				/* translators: %s: description of the settings change to redo */
				__('Redo: %s', 'modula-best-grid-gallery'),
				redoStepLabel
			)
		: canRedo
			? __('Redo', 'modula-best-grid-gallery')
			: __('Nothing to redo', 'modula-best-grid-gallery');

	return (
		<div
			className="modula-gallery-takeover__status-bar"
			role="status"
			aria-live="polite"
		>
			<form.Subscribe selector={(s) => s.values}>
				{(values) => {
					const facts = buildPreviewStatusBarFacts({
						items,
						values: values || {},
						previewViewport,
					});

					return (
						<>
							{facts.map((fact, index) => (
								<Fragment key={`${index}-${fact}`}>
									{index > 0 ? (
										<span
											className="modula-gallery-takeover__status-bar-sep"
											aria-hidden="true"
										>
											·
										</span>
									) : null}
									<span className="modula-gallery-takeover__status-bar-fact">
										{fact}
									</span>
								</Fragment>
							))}
						</>
					);
				}}
			</form.Subscribe>
			<span
				className="modula-gallery-takeover__status-bar-spacer"
				aria-hidden="true"
			/>
			<div
				className="modula-gallery-takeover__status-bar-history"
				role="group"
				aria-label={__('Settings history', 'modula-best-grid-gallery')}
			>
				{lastStepLabel ? (
					<span
						key={`step-${stackVersion}-${lastStepLabel}`}
						className="modula-gallery-takeover__status-bar-step"
					>
						{lastStepLabel}
					</span>
				) : null}
				<button
					type="button"
					className="modula-gallery-takeover__status-bar-hbtn"
					aria-label={undoTitle}
					title={undoTitle}
					disabled={!canUndo}
					onClick={undo}
				>
					<Icon icon={statusBarUndoIcon} size={15} />
				</button>
				<button
					type="button"
					className="modula-gallery-takeover__status-bar-hbtn"
					aria-label={redoTitle}
					title={redoTitle}
					disabled={!canRedo}
					onClick={redo}
				>
					<Icon icon={statusBarRedoIcon} size={15} />
				</button>
			</div>
		</div>
	);
}
