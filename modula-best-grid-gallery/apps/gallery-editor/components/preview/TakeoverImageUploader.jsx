/**
 * Takeover-only image picker: hidden `<input type="file">` → WordPress REST `POST /wp/v2/media` → Modula `add-images`
 * via {@link uploadBrowserImageFilesToGallery}.
 */
import {
	forwardRef,
	useCallback,
	useImperativeHandle,
	useRef,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { uploadBrowserImageFilesToGallery } from '../../api/galleryUploadApi';
import { useTakeoverSaveStatus } from '../../context/TakeoverSaveStatusContext';

/**
 * @typedef {{ openFileDialog: () => void }} TakeoverImageUploaderHandle
 */

/**
 * @param {{
 *   galleryId: number,
 *   uploadPosition: string,
 *   onBusy: (busy: boolean) => void,
 *   onSuccess: () => void,
 *   onError: (message: string) => void,
 *   runPersistTask?: (fn: () => void | Promise<void>) => Promise<void>,
 * }} props
 * @param {import('@wordpress/element').Ref<TakeoverImageUploaderHandle>} ref
 */
function TakeoverImageUploader(
	{
		galleryId,
		uploadPosition,
		onBusy,
		onSuccess,
		onError,
		runPersistTask: runPersistTaskProp,
	},
	ref
) {
	const inputRef = useRef(null);
	const { runPersistTask: runPersistTaskFromContext } = useTakeoverSaveStatus();
	const runPersistTask = runPersistTaskProp ?? runPersistTaskFromContext;

	const processFiles = useCallback(
		async (fileList) => {
			if (!fileList?.length) {
				return;
			}
			const gid = Number(galleryId);
			if (!gid) {
				onError(
					__(
						'Save the gallery before uploading images.',
						'modula-best-grid-gallery'
					)
				);
				return;
			}
			onBusy(true);
			try {
				const { ids } = await uploadBrowserImageFilesToGallery(
					gid,
					fileList,
					{
						uploadPosition,
					},
					runPersistTask
				);
				if (!ids.length) {
					onError(
						__(
							'No images could be uploaded.',
							'modula-best-grid-gallery'
						)
					);
					return;
				}
				onSuccess();
			} catch (e) {
				const msg =
					e?.message ||
					e?.data?.message ||
					__(
						'Could not add images to the gallery.',
						'modula-best-grid-gallery'
					);
				onError(typeof msg === 'string' ? msg : String(msg));
			} finally {
				onBusy(false);
			}
		},
		[galleryId, uploadPosition, onBusy, onSuccess, onError, runPersistTask]
	);

	useImperativeHandle(ref, () => ({
		openFileDialog: () => {
			const el = inputRef.current;
			if (el instanceof HTMLInputElement) {
				el.click();
			}
		},
	}));

	const onInputChange = (e) => {
		const input = /** @type {HTMLInputElement} */ (e.target);
		/* Copy before clearing `value`: WebKit clears the live FileList when the input is reset. */
		const picked =
			input.files && input.files.length > 0
				? Array.from(input.files)
				: [];
		input.value = '';
		if (picked.length) {
			void processFiles(picked);
		}
	};

	return (
		<div className="modula-takeover-image-importer" aria-hidden="true">
			<input
				ref={inputRef}
				type="file"
				className="modula-takeover-image-importer__input"
				accept="image/*"
				multiple
				tabIndex={-1}
				onChange={onInputChange}
			/>
		</div>
	);
}

export default forwardRef(TakeoverImageUploader);
