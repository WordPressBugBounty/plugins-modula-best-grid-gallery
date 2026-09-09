/**
 * Code-split entry for the takeover bulk edit modal.
 */
import { lazy } from '@wordpress/element';
import { Spinner } from '@wordpress/components';
import { useBulkEdit } from '../../context/BulkEditContext';
import LazySettingsEditorBoundary from '../shell/LazySettingsEditorBoundary';

const BulkEditModal = lazy(() => import('./BulkEditModal'));

export default function BulkEditModalLazy() {
	const { isOpen } = useBulkEdit();

	if (!isOpen) {
		return null;
	}

	return (
		<LazySettingsEditorBoundary
			fallback={
				<div
					className="modula-bulk-edit__lazy-fallback"
					role="status"
					aria-live="polite"
					aria-busy="true"
				>
					<Spinner />
				</div>
			}
		>
			<BulkEditModal />
		</LazySettingsEditorBoundary>
	);
}
