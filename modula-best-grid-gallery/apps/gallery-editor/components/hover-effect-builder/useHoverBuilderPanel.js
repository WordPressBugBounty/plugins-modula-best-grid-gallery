/**
 * Opens and closes the hover effect builder for the row that owns it (the
 * Motion Hover menu's Customize). Customize is hidden for now (maintainer,
 * Motion ticket 05), so nothing opens the builder from the Motion tab; the
 * hook and the builder stay for when it returns.
 */
import { useEffect } from '@wordpress/element';
import { useTakeoverSidebarStack } from '../../context/TakeoverSidebarStackContext';
import { useOptionalTakeoverAuxiliaryPanel } from '../../context/TakeoverAuxiliaryPanelContext';

const BUILDER_PANEL = { kind: 'hoverEffectBuilder' };

/**
 * @return {{ open: () => void, close: () => void }} Builder panel controls.
 */
export function useHoverBuilderPanel() {
	const takeoverAuxiliary = useOptionalTakeoverAuxiliaryPanel();
	const { setTopFrameAuxiliaryPanel } = useTakeoverSidebarStack();
	const closeFromSettings = takeoverAuxiliary?.closeFromSettings;

	// The builder belongs to its row: it closes when the row leaves the
	// panel (its section closes, or image edit replaces the panel).
	useEffect(() => closeFromSettings, [closeFromSettings]);

	/**
	 * The takeover has no drill frames: the builder opens in its auxiliary
	 * column. The metabox editor ties it to the open drill frame.
	 *
	 * @param {{ kind: string }|null} descriptor Null closes the builder.
	 */
	const setBuilderPanel = (descriptor) => {
		if (!takeoverAuxiliary) {
			setTopFrameAuxiliaryPanel(descriptor);
			return;
		}
		if (descriptor) {
			takeoverAuxiliary.openFromSettings(descriptor);
			return;
		}
		takeoverAuxiliary.closeFromSettings();
	};

	return {
		open: () => setBuilderPanel(BUILDER_PANEL),
		close: () => setBuilderPanel(null),
	};
}
