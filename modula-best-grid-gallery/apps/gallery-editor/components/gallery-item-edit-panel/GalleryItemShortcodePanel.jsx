/** Shortcode tiles expose Freeform stacking through the existing item sidebar. */
import { __ } from '@wordpress/i18n';
import { SettingsPanelHeader } from 'editor-shell';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import FreeformStackingControls from './FreeformStackingControls';

export default function GalleryItemShortcodePanel({ storeIndex }) {
	const { close } = useGalleryItemEditSidebar();
	return (
		<div className="modula-settings-panel modula-gallery-item-edit-panel">
			<SettingsPanelHeader
				title={__('Shortcode', 'modula-best-grid-gallery')}
				isNested
				parentTitle={__('Gallery', 'modula-best-grid-gallery')}
				onBack={close}
			/>
			<div className="modula-settings-panel__scroll modula-gallery-item-edit-panel__scroll">
				<FreeformStackingControls storeIndex={storeIndex} />
			</div>
		</div>
	);
}
