/**
 * Gallery status bar — layout facts and settings history for the shared status bar.
 */
import { __ } from '@wordpress/i18n';
import { StatusBar, useTakeoverSaveStatus } from 'editor-shell';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { usePreviewReduxStoreItems } from '../../hooks/usePreviewReduxStoreItems';
import { buildPreviewStatusBarFacts } from '../../utils/buildPreviewStatusBarFacts';

const HISTORY_LABELS = {
	heading: __('Settings history', 'modula-best-grid-gallery'),
	clearConfirmMessage: __(
		'Clear settings history? Past and future steps are removed. Your current settings stay as they are.',
		'modula-best-grid-gallery'
	),
};

/**
 * @param {{
 *   previewViewport?: 'desktop' | 'tablet' | 'mobile',
 * }} props
 */
export default function GalleryPreviewStatusBar({
	previewViewport = 'desktop',
}) {
	const { form, undoRedo } = useGallerySettingsFormBundle();
	const { status, errorMessage } = useTakeoverSaveStatus();
	const items = usePreviewReduxStoreItems();

	return (
		<form.Subscribe selector={(s) => s.values}>
			{(values) => (
				<StatusBar
					facts={buildPreviewStatusBarFacts({
						items,
						values: values || {},
						previewViewport,
					})}
					history={undoRedo}
					saveStatus={{ status, errorMessage }}
					historyLabels={HISTORY_LABELS}
				/>
			)}
		</form.Subscribe>
	);
}
