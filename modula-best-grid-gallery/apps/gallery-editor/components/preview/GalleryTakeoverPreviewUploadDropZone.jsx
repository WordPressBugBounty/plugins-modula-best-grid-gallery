/**
 * Takeover live preview: drop target for adding images at the start or end of the gallery.
 * Idle / loading / complete UI; optional drag-and-drop when `interactive` and `onFilesSelected` are set.
 */
import { useCallback, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Spinner } from '@wordpress/components';
import { Icon, check } from '@wordpress/icons';

/**
 * @param {number | undefined} current
 * @param {number | undefined} total
 * @return {{ current: number, total: number } | null} Clamped progress or null when total is invalid.
 */
function normalizeUploadProgress(current, total) {
	const t = Number(total);
	if (!Number.isFinite(t) || t < 1) {
		return null;
	}
	let c = Number(current);
	if (!Number.isFinite(c)) {
		c = 1;
	}
	const ti = Math.min(9999, Math.max(1, Math.floor(t)));
	const ci = Math.min(ti, Math.max(1, Math.floor(c)));
	return { current: ci, total: ti };
}

/**
 * @param {{
 *   placement?: 'start' | 'end' | 'empty',
 *   status?: 'idle' | 'loading' | 'complete',
 *   uploadCurrent?: number,
 *   uploadTotal?: number,
 *   interactive?: boolean,
 *   onFilesSelected?: (files: FileList | File[]) => void,
 *   idleCaption?: string,
 *   completeCaption?: string,
 *   regionLabel?: string,
 * }} props
 */
export default function GalleryTakeoverPreviewUploadDropZone({
	placement = 'start',
	status = 'idle',
	uploadCurrent,
	uploadTotal,
	interactive = false,
	onFilesSelected,
	idleCaption = '',
	completeCaption = '',
	regionLabel = '',
}) {
	const [dragActive, setDragActive] = useState(false);
	const dragDepthRef = useRef(0);

	const canAcceptDrop =
		Boolean(interactive) &&
		status === 'idle' &&
		typeof onFilesSelected === 'function';

	const isFileDrag = useCallback((e) => {
		const types = e.dataTransfer?.types;
		if (!types) {
			return false;
		}
		const list = Array.from(types);
		if (list.includes('Files')) {
			return true;
		}
		return list.some(
			(t) =>
				t === 'application/x-moz-file' ||
				t === 'application/x-moz-filelist'
		);
	}, []);

	/**
	 * dragenter + dragover must call preventDefault() or the browser treats the
	 * document as the drop target and opens local files on drop (navigation).
	 */
	const onDragEnter = useCallback(
		(e) => {
			if (!isFileDrag(e)) {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			if (!canAcceptDrop) {
				return;
			}
			dragDepthRef.current += 1;
			setDragActive(true);
		},
		[canAcceptDrop, isFileDrag]
	);

	const onDragLeave = useCallback(
		(e) => {
			if (!canAcceptDrop) {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			dragDepthRef.current -= 1;
			if (dragDepthRef.current <= 0) {
				dragDepthRef.current = 0;
				setDragActive(false);
			}
		},
		[canAcceptDrop]
	);

	const onDragOver = useCallback(
		(e) => {
			if (!isFileDrag(e)) {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = canAcceptDrop ? 'copy' : 'none';
			}
		},
		[canAcceptDrop, isFileDrag]
	);

	const onDrop = useCallback(
		(e) => {
			/* Always cancel default so dropping images never navigates the tab. */
			e.preventDefault();
			e.stopPropagation();
			dragDepthRef.current = 0;
			setDragActive(false);
			if (!canAcceptDrop || !onFilesSelected) {
				return;
			}
			const { files } = e.dataTransfer;
			if (files?.length) {
				onFilesSelected(files);
			}
		},
		[canAcceptDrop, onFilesSelected]
	);

	const isStart = placement === 'start';
	const isEmpty = placement === 'empty';
	const ariaLabel =
		regionLabel ||
		(isEmpty
			? __('Drop zone: add images to gallery', 'modula-best-grid-gallery')
			: isStart
				? __(
						'Drop zone: add images at the start of the gallery',
						'modula-best-grid-gallery'
					)
				: __(
						'Drop zone: add images at the end of the gallery',
						'modula-best-grid-gallery'
					));

	const captionIdle =
		idleCaption ||
		(isEmpty
			? __(
					'Drop images here to add them to your gallery.',
					'modula-best-grid-gallery'
				)
			: isStart
				? __(
						'Drop images here to add them at the start of the gallery.',
						'modula-best-grid-gallery'
					)
				: __(
						'Drop images here to add them at the end of the gallery.',
						'modula-best-grid-gallery'
					));

	const captionComplete =
		completeCaption ||
		(isEmpty
			? __('Images added to gallery.', 'modula-best-grid-gallery')
			: isStart
				? __(
						'Images added at the start of the gallery.',
						'modula-best-grid-gallery'
					)
				: __(
						'Images added at the end of the gallery.',
						'modula-best-grid-gallery'
					));

	const placementModifier =
		placement === 'end'
			? 'modula-gallery-takeover__preview-upload-dropzone--end'
			: placement === 'empty'
				? 'modula-gallery-takeover__preview-upload-dropzone--empty'
				: 'modula-gallery-takeover__preview-upload-dropzone--start';

	const statusModifier = `modula-gallery-takeover__preview-upload-dropzone--status-${status}`;

	const dragModifier = dragActive
		? 'modula-gallery-takeover__preview-upload-dropzone--drag-active'
		: '';

	const progress =
		status === 'loading'
			? normalizeUploadProgress(uploadCurrent, uploadTotal)
			: null;

	const loadingCaption =
		progress !== null
			? sprintf(
					/* translators: 1: current file number (1-based), 2: total file count */
					_n(
						'Uploading %1$d image of %2$d',
						'Uploading %1$d images of %2$d',
						progress.current,
						'modula-best-grid-gallery'
					),
					progress.current,
					progress.total
				)
			: __('Uploading images…', 'modula-best-grid-gallery');

	return (
		<div
			className={[
				'modula-gallery-takeover__preview-upload-dropzone',
				placementModifier,
				statusModifier,
				dragModifier,
			]
				.filter(Boolean)
				.join(' ')}
			role="region"
			aria-label={ariaLabel}
			aria-busy={status === 'loading'}
			onDragEnter={onDragEnter}
			onDragLeave={onDragLeave}
			onDragOver={onDragOver}
			onDrop={onDrop}
		>
			<div className="modula-gallery-takeover__preview-upload-dropzone__inner">
				{status === 'idle' ? (
					<p className="modula-gallery-takeover__preview-upload-dropzone__text">
						{captionIdle}
					</p>
				) : null}

				{status === 'loading' ? (
					<div
						className="modula-gallery-takeover__preview-upload-dropzone__row"
						role="status"
						aria-live="polite"
						aria-atomic="true"
					>
						<Spinner />
						<span className="modula-gallery-takeover__preview-upload-dropzone__text modula-gallery-takeover__preview-upload-dropzone__text--strong">
							{loadingCaption}
						</span>
					</div>
				) : null}

				{status === 'complete' ? (
					<div
						className="modula-gallery-takeover__preview-upload-dropzone__row modula-gallery-takeover__preview-upload-dropzone__row--complete"
						role="status"
						aria-live="polite"
						aria-atomic="true"
					>
						<span
							className="modula-gallery-takeover__preview-upload-dropzone__icon-check"
							aria-hidden
						>
							<Icon icon={check} size={20} />
						</span>
						<span className="modula-gallery-takeover__preview-upload-dropzone__text modula-gallery-takeover__preview-upload-dropzone__text--complete">
							{captionComplete}
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
}
