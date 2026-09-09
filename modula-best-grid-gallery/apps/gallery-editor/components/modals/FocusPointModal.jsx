/**
 * Set per-image focal point (object-position) in settings-editor live preview using react-easy-crop.
 */
import {
	getCreativeGalleryItemFocusAspect,
	itemUsesCustomGridLetterbox,
} from 'gallery-shared/preview';
import 'react-easy-crop/react-easy-crop.css';
import '../../styles/takeover/preview/_focus-point-modal.scss';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Notice, ToggleControl } from '@wordpress/components';
import { crop as cropIcon } from '@wordpress/icons';
import Cropper from 'react-easy-crop';
import { useSelector, useStore } from 'react-redux';
import { Button as SharedButton } from 'shared-ui';
import GalleryModal from '../gallery-modal/GalleryModal';
import SettingsPanelHeader from '../sidebar/settings-panel/SettingsPanelHeader';
import { useTakeoverSaveStatus } from '../../context/TakeoverSaveStatusContext';
import { useFocusPointMutations } from '../../hooks/useFocusPointMutations';
import { FOCUS_MATCH_LAYOUT_SESSION_KEY } from '../../utils/getFocusModalCropHints';
import { getCustomGridItemFocusAspect } from '../../utils/getCustomGridItemFocusAspect';
import FocusPointLetterboxPreview from './FocusPointLetterboxPreview';
import FocusPointLetterboxApplyConfirmModal from './FocusPointLetterboxApplyConfirmModal';
import { countOtherLetterboxEligibleImages } from '../../utils/applyLetterboxFitToGalleryImages';
import {
	computeFocusCropState,
	parseFocalFromItem,
	readMatchLayoutFromSession,
	resolveInitialCroppedAreaPercentages,
} from '../../utils/focusPointCrop';

/**
 * @param {Object}                                                                                                              props
 * @param {boolean}                                                                                                             props.isOpen
 * @param {() => void}                                                                                                          props.onClose
 * @param {number}                                                                                                              props.galleryId
 * @param {number|null}                                                                                                         props.storeIndex
 * @param {import('@tanstack/react-query').QueryClient}                                                                         props.queryClient
 * @param {import('@tanstack/react-query').QueryKey}                                                                            props.bootstrapQueryKey
 * @param {{ suggestedAspect: number|null, canLockToLayout: boolean, layoutHint: string|null, showMatchLayoutToggle: boolean }} [props.focusCropHints]
 * @param {boolean}                                                                                                             [props.embedded] When true, render in Image sidebar instead of GalleryModal.
 */
export default function FocusPointModal({
	isOpen,
	onClose,
	galleryId,
	storeIndex,
	queryClient,
	bootstrapQueryKey,
	focusCropHints = {
		suggestedAspect: null,
		canLockToLayout: false,
		layoutHint: null,
		showMatchLayoutToggle: false,
	},
	embedded = false,
}) {
	const store = useStore();
	const { runPersistTask } = useTakeoverSaveStatus();
	const reduxItems = useSelector((s) => s.items.items);
	const galleryConfig = useSelector((s) => s.gallery.config);
	const gallerySettings = useSelector((s) => s.gallery.settings);
	const galleryMetadata = useSelector((s) => s.gallery.metadata);
	const reduxGalleryId = useSelector((s) => s.gallery.galleryId ?? 0);

	const item = useMemo(() => {
		if (!isOpen || storeIndex === null || storeIndex === undefined) {
			return null;
		}
		const row = reduxItems[storeIndex];
		if (!row) {
			return null;
		}
		return row;
	}, [isOpen, storeIndex, reduxItems]);

	const previewSrc = item?.thumbnail || item?.src || item?.url || '';
	const filename =
		item?.filename || item?.name || item?.title || previewSrc || '';
	const attachmentId = item?.id ? String(item.id) : '';

	const galleryType = useSelector((s) => s.gallery.config?.type);

	const {
		suggestedAspect,
		canLockToLayout,
		layoutHint,
		showMatchLayoutToggle,
		showLetterboxToggle,
	} = useMemo(() => {
		if (galleryType === 'custom-grid' && item) {
			const cg = getCustomGridItemFocusAspect(item);
			if (cg) {
				return {
					suggestedAspect: cg.ratio,
					canLockToLayout: true,
					layoutHint: cg.label,
					showMatchLayoutToggle: true,
					showLetterboxToggle: true,
				};
			}
		}
		if (galleryType === 'creative-gallery' && item) {
			const cg = getCreativeGalleryItemFocusAspect({
				item,
				items: reduxItems,
				config: galleryConfig,
				galleryId: galleryId || reduxGalleryId,
				settings: gallerySettings,
				metadata: galleryMetadata,
			});
			if (cg) {
				return {
					suggestedAspect: cg.ratio,
					canLockToLayout: true,
					layoutHint: cg.label,
					showMatchLayoutToggle: true,
					showLetterboxToggle: false,
				};
			}
		}
		return {
			...focusCropHints,
			showLetterboxToggle: false,
		};
	}, [
		galleryType,
		item,
		focusCropHints,
		reduxItems,
		galleryConfig,
		gallerySettings,
		galleryMetadata,
		galleryId,
		reduxGalleryId,
	]);

	const [letterboxFit, setLetterboxFit] = useState(() =>
		itemUsesCustomGridLetterbox(item)
	);
	const [letterboxApplyConfirmOpen, setLetterboxApplyConfirmOpen] =
		useState(false);
	const letterboxFocalRef = useRef(
		/** @type {{ x: number, y: number }|undefined} */ (undefined)
	);
	const [letterboxFocal, setLetterboxFocal] = useState(
		() => parseFocalFromItem(item) ?? { x: 0.5, y: 0.5 }
	);

	useEffect(() => {
		if (!isOpen || !item) {
			return;
		}
		setLetterboxFit(itemUsesCustomGridLetterbox(item));
		setLetterboxFocal(parseFocalFromItem(item) ?? { x: 0.5, y: 0.5 });
		letterboxFocalRef.current = undefined;
		setLetterboxApplyConfirmOpen(false);
	}, [isOpen, item, storeIndex]);

	const otherLetterboxCount = useMemo(
		() => countOtherLetterboxEligibleImages(reduxItems, item?.id),
		[reduxItems, item?.id]
	);

	const sessionKey = `${storeIndex}-${item?.id ?? ''}`;

	const [matchLayout, setMatchLayout] = useState(() =>
		readMatchLayoutFromSession(
			showMatchLayoutToggle,
			canLockToLayout,
			suggestedAspect
		)
	);
	const [persistError, setPersistError] = useState('');
	/** Photo natural aspect (width/height) — used when Match tile shape is off. */
	const [imageAspect, setImageAspect] = useState(
		/** @type {number|null} */ (null)
	);

	useEffect(() => {
		if (
			!showMatchLayoutToggle ||
			!canLockToLayout ||
			suggestedAspect === null ||
			suggestedAspect === undefined
		) {
			setMatchLayout(false);
		}
	}, [showMatchLayoutToggle, canLockToLayout, suggestedAspect]);

	useEffect(() => {
		setImageAspect(null);
	}, [sessionKey]);

	const cropperAspect = useMemo(() => {
		if (
			matchLayout &&
			suggestedAspect !== null &&
			suggestedAspect !== undefined
		) {
			return suggestedAspect;
		}
		// Match off: lock to the photo's own shape (not a free/resizable frame).
		if (
			typeof imageAspect === 'number' &&
			Number.isFinite(imageAspect) &&
			imageAspect > 0
		) {
			return imageAspect;
		}
		return undefined;
	}, [matchLayout, suggestedAspect, imageAspect]);

	const setMatchLayoutPersist = useCallback((next) => {
		setMatchLayout(next);
		try {
			sessionStorage.setItem(
				FOCUS_MATCH_LAYOUT_SESSION_KEY,
				next ? '1' : '0'
			);
		} catch {
			// ignore
		}
	}, []);
	const lastAreaRef = useRef(
		/** @type {import('react-easy-crop').Area|undefined} */ (undefined)
	);

	const initialCroppedAreaPercentages = useMemo(
		() => resolveInitialCroppedAreaPercentages(isOpen, galleryId, item),
		[isOpen, galleryId, item]
	);

	const initialCropZoom = useMemo(
		() => computeFocusCropState(item, initialCroppedAreaPercentages),
		[item, initialCroppedAreaPercentages]
	);
	const [crop, setCrop] = useState(initialCropZoom.crop);
	const [zoom, setZoom] = useState(initialCropZoom.zoom);

	useEffect(() => {
		if (!item) {
			return;
		}
		const next = computeFocusCropState(item, initialCroppedAreaPercentages);
		setCrop(next.crop);
		setZoom(next.zoom);
		lastAreaRef.current = initialCroppedAreaPercentages ?? undefined;
		// eslint-disable-next-line react-hooks/exhaustive-deps -- reframe only on aspect / restored % (image switch remounts via key).
	}, [cropperAspect, initialCroppedAreaPercentages]);

	const syncCroppedAreaToRef = useCallback((croppedAreaPercentages) => {
		lastAreaRef.current = croppedAreaPercentages;
	}, []);

	const handleMediaLoaded = useCallback((mediaSize) => {
		const nw = Number(mediaSize?.naturalWidth);
		const nh = Number(mediaSize?.naturalHeight);
		if (Number.isFinite(nw) && Number.isFinite(nh) && nw > 0 && nh > 0) {
			setImageAspect(nw / nh);
		}
	}, []);

	const handleLetterboxFocalChange = useCallback((next) => {
		letterboxFocalRef.current = next;
		setLetterboxFocal(next);
	}, []);

	const { saveMutation, clearMutation } = useFocusPointMutations({
		galleryId,
		storeIndex,
		item,
		store,
		runPersistTask,
		queryClient,
		bootstrapQueryKey,
		onClose,
		lastAreaRef,
		letterboxFit,
		letterboxFocalRef,
		setPersistError,
	});

	const busy = saveMutation.isPending || clearMutation.isPending;

	const handleApplyClick = useCallback(() => {
		if (letterboxFit && otherLetterboxCount > 0) {
			setLetterboxApplyConfirmOpen(true);
			return;
		}
		saveMutation.mutate({ applyToAll: false });
	}, [letterboxFit, otherLetterboxCount, saveMutation]);

	const handleApplyThisImageOnly = useCallback(() => {
		setLetterboxApplyConfirmOpen(false);
		saveMutation.mutate({ applyToAll: false });
	}, [saveMutation]);

	const handleApplyLetterboxToAll = useCallback(() => {
		setLetterboxApplyConfirmOpen(false);
		saveMutation.mutate({ applyToAll: true });
	}, [saveMutation]);

	const subtitleParts = [];
	if (filename) {
		subtitleParts.push(filename);
	}
	if (attachmentId) {
		subtitleParts.push(
			sprintf(
				/* translators: %s: attachment id */
				__('ID: %s', 'modula-best-grid-gallery'),
				attachmentId
			)
		);
	}

	if (storeIndex === null || storeIndex === undefined) {
		return null;
	}

	const focusBody = (
		<>
			{persistError ? (
				<Notice
					status="error"
					isDismissible
					onRemove={() => setPersistError('')}
				>
					{persistError}
				</Notice>
			) : null}
			<p className="modula-focus-point-modal__help">
				{letterboxFit
					? __(
							'The full photo fits inside the tile. Use the preview below to choose alignment when empty space appears above or below the image.',
							'modula-best-grid-gallery'
						)
					: __(
							'Drag the image and use the zoom controls or scroll wheel to frame the subject. Save stores focal point and crop so the preview and front-end match your framing.',
							'modula-best-grid-gallery'
						)}
			</p>
			{showLetterboxToggle ? (
				<div className="modula-focus-point-modal__match-layout">
					<ToggleControl
						__nextHasNoMarginBottom
						label={__(
							'Show entire image in tile (letterbox)',
							'modula-best-grid-gallery'
						)}
						help={__(
							'When on, the full photo is visible inside the tile. Empty space may appear when the tile shape differs from the photo.',
							'modula-best-grid-gallery'
						)}
						checked={letterboxFit}
						onChange={setLetterboxFit}
					/>
				</div>
			) : null}
			{showMatchLayoutToggle && !letterboxFit ? (
				<div className="modula-focus-point-modal__match-layout">
					<ToggleControl
						__nextHasNoMarginBottom
						label={sprintf(
							/* translators: %s: aspect label e.g. 1:1 or 9:16 */
							__(
								'Match tile shape (%s)',
								'modula-best-grid-gallery'
							),
							layoutHint || String(suggestedAspect)
						)}
						help={
							matchLayout
								? sprintf(
										/* translators: %s: aspect label e.g. 1:1 */
										__(
											"Crop frame matches gallery cells (%s). Turn off to use the photo's own shape.",
											'modula-best-grid-gallery'
										),
										layoutHint || String(suggestedAspect)
									)
								: __(
										"Crop frame follows the photo's aspect ratio. The gallery tile still uses its own shape; this chooses which part of the photo is shown.",
										'modula-best-grid-gallery'
									)
						}
						checked={matchLayout}
						onChange={setMatchLayoutPersist}
					/>
				</div>
			) : null}
			{!previewSrc ? (
				<Notice status="warning" isDismissible={false}>
					{__(
						'No image URL for this item.',
						'modula-best-grid-gallery'
					)}
				</Notice>
			) : letterboxFit ? (
				<FocusPointLetterboxPreview
					src={previewSrc}
					aspectRatio={suggestedAspect}
					layoutHint={layoutHint}
					focal={letterboxFocal}
					onFocalChange={handleLetterboxFocalChange}
				/>
			) : (
				<div className="modula-focus-point-modal__crop-wrap">
					<Cropper
						key={`${sessionKey}-${cropperAspect ?? 'pending'}`}
						image={previewSrc}
						crop={crop}
						zoom={zoom}
						aspect={cropperAspect}
						onCropChange={setCrop}
						onZoomChange={setZoom}
						onCropComplete={syncCroppedAreaToRef}
						onCropAreaChange={syncCroppedAreaToRef}
						onMediaLoaded={handleMediaLoaded}
						initialCroppedAreaPercentages={
							initialCroppedAreaPercentages
						}
						minZoom={1}
						maxZoom={4}
						showGrid
						objectFit="contain"
					/>
				</div>
			)}
		</>
	);

	const letterboxConfirm = (
		<FocusPointLetterboxApplyConfirmModal
			isOpen={letterboxApplyConfirmOpen}
			isBusy={saveMutation.isPending}
			otherCount={otherLetterboxCount}
			onCancel={() => setLetterboxApplyConfirmOpen(false)}
			onApplyThisOnly={handleApplyThisImageOnly}
			onApplyAll={handleApplyLetterboxToAll}
		/>
	);

	if (embedded) {
		return (
			<>
				<div className="modula-settings-panel modula-gallery-item-focus-panel">
					<SettingsPanelHeader
						title={__('Image focus', 'modula-best-grid-gallery')}
						description={
							subtitleParts.length
								? subtitleParts.join(' • ')
								: __(
										'Frame this tile for the gallery layout.',
										'modula-best-grid-gallery'
									)
						}
						isNested
						parentTitle={__('Image', 'modula-best-grid-gallery')}
						onBack={onClose}
					/>
					<div className="modula-settings-panel__scroll modula-gallery-item-focus-panel__scroll modula-focus-point-modal__content">
						{focusBody}
					</div>
					<div className="modula-gallery-item-focus-panel__footer">
						<SharedButton
							variant="ghost"
							mini
							disabled={!previewSrc || busy || !item}
							onClick={() => clearMutation.mutate()}
						>
							{__('Reset crop', 'modula-best-grid-gallery')}
						</SharedButton>
						<div className="modula-gallery-item-focus-panel__footer-end">
							<SharedButton
								variant="ghost"
								mini
								disabled={busy}
								onClick={onClose}
							>
								{__('Cancel', 'modula-best-grid-gallery')}
							</SharedButton>
							<SharedButton
								variant="primary"
								mini
								disabled={!previewSrc || busy || !item}
								onClick={handleApplyClick}
							>
								{saveMutation.isPending
									? __(
											'Applying…',
											'modula-best-grid-gallery'
										)
									: __(
											'Apply crop',
											'modula-best-grid-gallery'
										)}
							</SharedButton>
						</div>
					</div>
				</div>
				{letterboxConfirm}
			</>
		);
	}

	return (
		<>
			<GalleryModal
				isOpen={isOpen}
				onClose={onClose}
				size="large"
				titleId="modula-focus-point-modal-title"
				title={__('Crop image', 'modula-best-grid-gallery')}
				subtitle={subtitleParts.length ? subtitleParts.join(' • ') : ''}
				icon={cropIcon}
				panelClassName="modula-focus-point-modal__panel"
				bodyClassName="modula-focus-point-modal__content"
				bodyOverflow="auto"
				footerLeft={
					<Button
						variant="link"
						className="modula-gallery-modal__footer-link"
						onClick={() => clearMutation.mutate()}
						isBusy={clearMutation.isPending}
						disabled={!previewSrc || busy || !item}
					>
						{__('Reset crop', 'modula-best-grid-gallery')}
					</Button>
				}
				footerRight={
					<>
						<Button
							variant="tertiary"
							className="modula-gallery-modal__footer-cancel"
							onClick={onClose}
							disabled={busy}
						>
							{__('Cancel', 'modula-best-grid-gallery')}
						</Button>
						<Button
							variant="primary"
							className="modula-gallery-modal__footer-primary"
							onClick={handleApplyClick}
							isBusy={saveMutation.isPending}
							disabled={!previewSrc || busy || !item}
						>
							{__('Apply crop', 'modula-best-grid-gallery')}
						</Button>
					</>
				}
			>
				{focusBody}
			</GalleryModal>
			{letterboxConfirm}
		</>
	);
}
