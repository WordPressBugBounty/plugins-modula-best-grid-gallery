/**
 * Registry-driven, lazy-loaded extension import modals (Phase B).
 * Loads a webpack chunk only when `openFlow` is set and the user is entitled.
 */
import { lazy, useMemo } from '@wordpress/element';
import { Spinner } from '@wordpress/components';
import {
	getExtensionImportEntryByReactFlow,
	isExtensionImportEntitled,
} from '../../platform/extensionImportRegistry';
import LazySettingsEditorBoundary from '../shell/LazySettingsEditorBoundary';

/**
 * @param {{
 *   galleryId: number,
 *   editor: { isPro?: boolean, extensionEntitlements?: Record<string, { available?: boolean, enabled?: boolean }> },
 *   openFlow: 'content-galleries' | 'instagram' | 'video' | 'video-playlist' | null,
 *   onClose: () => void,
 * }} props
 */
export default function TakeoverExtensionImportModals({
	galleryId,
	editor,
	openFlow,
	onClose,
}) {
	const entry = openFlow
		? getExtensionImportEntryByReactFlow(openFlow)
		: undefined;
	const entitled = Boolean(entry && isExtensionImportEntitled(entry, editor));

	const LazyModal = useMemo(() => {
		if (!entry?.load) {
			return null;
		}
		return lazy(entry.load);
	}, [entry?.id, entry?.load]);

	if (!galleryId || !openFlow || !entitled || !LazyModal || !entry) {
		return null;
	}

	const modalProps = entry.modalProps ?? {};

	return (
		<LazySettingsEditorBoundary
			fallback={
				<div
					className="modula-import-dialog__spinner-wrap modula-import-dialog__lazy-fallback"
					role="status"
					aria-live="polite"
				>
					<Spinner />
				</div>
			}
		>
			<LazyModal
				isOpen
				onClose={onClose}
				galleryId={galleryId}
				{...modalProps}
			/>
		</LazySettingsEditorBoundary>
	);
}
