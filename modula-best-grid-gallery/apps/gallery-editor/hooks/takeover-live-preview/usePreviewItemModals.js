/**
 * Modal indices and derived preview shell styles for the live preview.
 */
import { useCallback, useMemo, useState } from '@wordpress/element';
import { useFocusReturn } from '../useFocusReturn';
import { previewGalleryWidthCss } from '../../utils/takeoverLivePreviewBootstrap';
import {
	isGalleryWiderThanArtboard,
	parseAbsoluteGalleryWidthPx,
} from '../../utils/galleryWidthPreviewOverflow';

/**
 * @param {{
 *   galleryType: string,
 *   groupedSettings: object,
 *   artboardInnerWidth?: number,
 * }} args
 */
export function usePreviewItemModals({
	galleryType,
	groupedSettings,
	artboardInnerWidth = 0,
}) {
	const [metaModalStoreIndex, setMetaModalStoreIndex] = useState(null);
	const { saveReturnFocus, restoreReturnFocus } = useFocusReturn();

	const closeMetaModal = useCallback(() => {
		restoreReturnFocus();
		setMetaModalStoreIndex(null);
	}, [restoreReturnFocus]);

	const [contentBlockEdit, setContentBlockEdit] = useState(
		/** @type {{ storeIndex: number, row: Record<string, unknown> } | null} */ (
			null
		)
	);

	const previewGalleryWidth = useMemo(
		() =>
			previewGalleryWidthCss(
				groupedSettings?.general?.width,
				galleryType
			),
		[galleryType, groupedSettings?.general?.width]
	);

	const galleryWidthOverflow = useMemo(() => {
		const galleryPx = parseAbsoluteGalleryWidthPx(previewGalleryWidth);
		const wider = isGalleryWiderThanArtboard(
			previewGalleryWidth,
			artboardInnerWidth
		);
		if (!wider || galleryPx === null) {
			return null;
		}
		return {
			galleryPx: Math.round(galleryPx),
			artboardPx: Math.round(artboardInnerWidth),
		};
	}, [previewGalleryWidth, artboardInnerWidth]);

	const previewGalleryShellStyle = useMemo(() => {
		if (galleryType === 'custom-grid') {
			return undefined;
		}
		const style = {
			width: previewGalleryWidth,
			boxSizing: 'border-box',
		};
		if (galleryWidthOverflow) {
			style.maxWidth = 'none';
		} else {
			style.maxWidth = '100%';
		}
		return style;
	}, [galleryType, previewGalleryWidth, galleryWidthOverflow]);

	return {
		metaModalStoreIndex,
		setMetaModalStoreIndex,
		saveMetaModalReturnFocus: saveReturnFocus,
		closeMetaModal,
		contentBlockEdit,
		setContentBlockEdit,
		previewGalleryShellStyle,
		galleryWidthOverflow,
	};
}
