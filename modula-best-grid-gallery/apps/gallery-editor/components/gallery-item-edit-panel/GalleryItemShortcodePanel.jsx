/** Shortcode tiles expose Freeform stacking through the existing item sidebar. */
import { __ } from '@wordpress/i18n';
import { ItemEditPanelHeader } from 'editor-shell';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import FreeformStackingControls from './FreeformStackingControls';

export default function GalleryItemShortcodePanel({ storeIndex }) {
	const { back } = useGalleryItemEditSidebar();
	return (
		<div className="modula-settings-panel modula-gallery-item-edit-panel">
			<ItemEditPanelHeader
				title={__('Shortcode', 'modula-best-grid-gallery')}
				onBack={back}
			/>
			<div className="modula-settings-panel__scroll modula-gallery-item-edit-panel__scroll">
				<FreeformStackingControls storeIndex={storeIndex} />
			</div>
		</div>
	);
}
