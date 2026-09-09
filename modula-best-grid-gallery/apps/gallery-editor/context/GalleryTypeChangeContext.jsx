/**
 * Single gallery-type change flow for takeover: confirm modal + PATCH when focus data exists.
 * Mounted once so preview chrome can change type while the General sidebar row is unmounted.
 */
import { createContext, useContext } from '@wordpress/element';
import { useGalleryTypeChangeConfirm } from '../hooks/useGalleryTypeChangeConfirm';
import GalleryTypeChangeConfirmModal from '../components/modals/GalleryTypeChangeConfirmModal';

/** @type {import('react').Context<ReturnType<typeof useGalleryTypeChangeConfirm>|null>} */
const GalleryTypeChangeContext = createContext(null);

export function GalleryTypeChangeProvider({ children }) {
	const confirm = useGalleryTypeChangeConfirm('general.type');
	return (
		<GalleryTypeChangeContext.Provider value={confirm}>
			{children}
			<GalleryTypeChangeConfirmModal
				isOpen={confirm.galleryTypeConfirmOpen}
				isBusy={confirm.galleryTypeConfirmBusy}
				onCancel={confirm.handleGalleryTypeConfirmCancel}
				onConfirm={confirm.handleGalleryTypeConfirm}
			/>
		</GalleryTypeChangeContext.Provider>
	);
}

/**
 * Takeover only; null in metabox.
 * @return {ReturnType<typeof useGalleryTypeChangeConfirm>|null} Shared confirm flow or null outside provider.
 */
export function useGalleryTypeChangeContext() {
	return useContext(GalleryTypeChangeContext);
}
