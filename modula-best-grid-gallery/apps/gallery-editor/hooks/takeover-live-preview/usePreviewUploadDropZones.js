import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { uploadBrowserImageFilesToGallery } from '../../api/galleryUploadApi';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import {
	boundGalleryAllowsCanvasDrop,
	getBoundGallerySummaryFromEditor,
} from '../../utils/boundGalleryChromePolicy';

const IDLE_UPLOAD_UI = { status: 'idle', current: 1, total: 1 };

/**
 * Start/end drop-zone upload progress and file handling.
 *
 * @param {{
 *   galleryId: number,
 *   runPreviewItemMutation: (task: () => Promise<unknown>) => Promise<unknown>,
 *   invalidateBootstrap?: () => void,
 * }} args
 */
export function usePreviewUploadDropZones({
	galleryId,
	runPreviewItemMutation,
	invalidateBootstrap,
}) {
	const [startLiveUi, setStartLiveUi] = useState(
		/** @type {{ status: 'idle'|'loading'|'complete', current: number, total: number }} */ (
			IDLE_UPLOAD_UI
		)
	);
	const [endLiveUi, setEndLiveUi] = useState(
		/** @type {{ status: 'idle'|'loading'|'complete', current: number, total: number }} */ (
			IDLE_UPLOAD_UI
		)
	);
	const [dropZoneError, setDropZoneError] = useState('');
	const completeTimerStartRef = useRef(null);
	const completeTimerEndRef = useRef(null);
	const dropZoneInteractive = boundGalleryAllowsCanvasDrop(
		getBoundGallerySummaryFromEditor(getModulaSettingsEditorConfig())
	);

	useEffect(() => {
		return () => {
			const startTimerId = completeTimerStartRef.current;
			const endTimerId = completeTimerEndRef.current;
			if (startTimerId) {
				window.clearTimeout(startTimerId);
			}
			if (endTimerId) {
				window.clearTimeout(endTimerId);
			}
		};
	}, []);

	const handleDropZoneFiles = useCallback(
		async (placement, fileList) => {
			if (!dropZoneInteractive || !galleryId || !fileList?.length) {
				return;
			}
			const setUi = placement === 'start' ? setStartLiveUi : setEndLiveUi;
			const timerRef =
				placement === 'start'
					? completeTimerStartRef
					: completeTimerEndRef;
			const pos = placement === 'start' ? 'start' : 'end';
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			setDropZoneError('');
			const list = Array.from(fileList).filter(
				(f) =>
					f instanceof File &&
					(f.type.startsWith('image/') ||
						/\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(f.name))
			);
			if (!list.length) {
				return;
			}
			setUi({
				status: 'loading',
				current: 1,
				total: list.length,
			});
			try {
				const { ids } = await uploadBrowserImageFilesToGallery(
					galleryId,
					list,
					{
						uploadPosition: pos,
						onProgress: (c, t) => {
							setUi({
								status: 'loading',
								current: c,
								total: t,
							});
						},
					},
					runPreviewItemMutation
				);
				if (!ids.length) {
					setUi(IDLE_UPLOAD_UI);
					setDropZoneError(
						__(
							'No images could be uploaded.',
							'modula-best-grid-gallery'
						)
					);
					return;
				}
				invalidateBootstrap?.();
				setUi({ status: 'complete', current: 1, total: 1 });
				timerRef.current = window.setTimeout(() => {
					timerRef.current = null;
					setUi(IDLE_UPLOAD_UI);
				}, 2200);
			} catch (e) {
				const msg =
					e?.message ||
					e?.data?.message ||
					__(
						'Could not add images to the gallery.',
						'modula-best-grid-gallery'
					);
				setDropZoneError(typeof msg === 'string' ? msg : String(msg));
				setUi(IDLE_UPLOAD_UI);
			}
		},
		[dropZoneInteractive, galleryId, runPreviewItemMutation, invalidateBootstrap]
	);

	return {
		dropZoneError,
		dismissDropZoneError: () => setDropZoneError(''),
		startZoneDisplay: {
			status: startLiveUi.status,
			current: startLiveUi.current,
			total: startLiveUi.total,
		},
		endZoneDisplay: {
			status: endLiveUi.status,
			current: endLiveUi.current,
			total: endLiveUi.total,
		},
		dropZoneInteractive,
		handleDropZoneFiles,
	};
}
