/**
 * Image Focus UI inside the Image sidebar (replaces FocusPointModal for takeover).
 */
import { Provider } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { getFocusModalCropHints } from '../../utils/getFocusModalCropHints';
import { getGalleryBootstrapQueryKey } from '../../query/useGalleryBootstrapQuery';
import { getGalleryPreviewReduxStore } from '../../utils/previewReduxStoreRef';
import { resolveGalleryAdminPostId } from '../../utils/resolveGalleryAdminPostId';
import FocusPointModal from '../modals/FocusPointModal';

/**
 * @param {Object} props
 * @param {number} props.storeIndex
 */
export default function GalleryItemFocusPanel({ storeIndex }) {
	const editor = useModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(editor);
	const { closeFocus } = useGalleryItemEditSidebar() || {
		closeFocus: () => {},
	};
	const { form } = useGallerySettingsFormBundle();
	const queryClient = useQueryClient();
	const store = getGalleryPreviewReduxStore();

	const focusCropHints = useMemo(
		() => getFocusModalCropHints(form.state.values),
		[form.state.values]
	);

	if (!store || !galleryId) {
		return (
			<div className="modula-settings-panel modula-gallery-item-focus-panel">
				<p className="modula-gallery-item-focus-panel__empty">
					{__(
						'Preview is not ready yet.',
						'modula-best-grid-gallery'
					)}
				</p>
			</div>
		);
	}

	return (
		<Provider store={store}>
			<FocusPointModal
				key={`${galleryId}-${storeIndex}`}
				embedded
				isOpen
				onClose={closeFocus}
				galleryId={galleryId}
				storeIndex={storeIndex}
				queryClient={queryClient}
				bootstrapQueryKey={getGalleryBootstrapQueryKey(galleryId)}
				focusCropHints={focusCropHints}
			/>
		</Provider>
	);
}
