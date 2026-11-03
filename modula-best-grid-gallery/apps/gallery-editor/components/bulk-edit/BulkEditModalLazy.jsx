/**
 * Code-split entry for the takeover bulk edit modal.
 */
import { lazy } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Spinner } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';
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
					aria-label={__('Loading…', 'modula-best-grid-gallery')}
					aria-live="polite"
					aria-busy="true"
				>
					<AdminUiScope>
						<Spinner />
					</AdminUiScope>
				</div>
			}
		>
			<BulkEditModal />
		</LazySettingsEditorBoundary>
	);
}
