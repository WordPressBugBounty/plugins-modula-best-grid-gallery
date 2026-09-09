/**
 * Hosts gallery defaults AdvancedPanel slot (Delivery → Presets).
 */
import GalleryDefaultsEditorSlot from '../defaults/GalleryDefaultsEditorSlot';

export default function GalleryDefaultsShellField() {
	return (
		<div className="modula-settings-editor__gallery-defaults-shell">
			<GalleryDefaultsEditorSlot slot="AdvancedPanel" />
		</div>
	);
}
