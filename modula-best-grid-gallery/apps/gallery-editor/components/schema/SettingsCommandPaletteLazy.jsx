/**
 * Code-split entry for the settings command palette (Cmd/Ctrl+K).
 */
import { lazy } from '@wordpress/element';
import LazySettingsEditorBoundary from '../shell/LazySettingsEditorBoundary';

const SettingsCommandPalette = lazy(() => import('./SettingsCommandPalette'));

/**
 * @param {React.ComponentProps<typeof SettingsCommandPalette>} props
 */
export default function SettingsCommandPaletteLazy(props) {
	if (!props.isOpen) {
		return null;
	}

	return (
		<LazySettingsEditorBoundary>
			<SettingsCommandPalette {...props} />
		</LazySettingsEditorBoundary>
	);
}
