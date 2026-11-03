/**
 * Code-split entry for the Add media dialog. The chunk loads on the first
 * open; the dialog then stays mounted, so the native `<dialog>` closes (and
 * returns focus) instead of unmounting.
 */
import { lazy, useState } from '@wordpress/element';
import { useAddMediaDialog } from '../../context/addMediaDialogStore';
import LazySettingsEditorBoundary from '../shell/LazySettingsEditorBoundary';

const AddMediaDialog = lazy(() => import('./AddMediaDialog'));

export default function AddMediaDialogLazy() {
	const { isOpen } = useAddMediaDialog();
	const [hasOpened, setHasOpened] = useState(false);

	// Remember the first open during render, as React's "storing information
	// from previous renders" pattern; no Effect is needed.
	if (isOpen && !hasOpened) {
		setHasOpened(true);
	}

	if (!hasOpened) {
		return null;
	}

	return (
		<LazySettingsEditorBoundary fallback={null}>
			<AddMediaDialog />
		</LazySettingsEditorBoundary>
	);
}
