/**
 * Takeover Lightbox category: auto-open Fancybox preview scoped to the preview column.
 * The gallery editor feeds it the gallery's items and settings; the Pro albums
 * editor feeds it member covers and its lightbox settings in the gallery's
 * grouped shape. Code-split: each editor loads it lazily.
 */
import { useEffect, useMemo, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { buildLightboxPreviewSlides } from '../utils/buildLightboxPreviewSlides';
import { collectGalleryImageRowsForLightboxPreview } from '../utils/collectGalleryImageRowsForLightboxPreview';
import {
	isLightboxOpenAllowedOnPreviewViewport,
	lightboxCaptionPositionCssVars,
	lightboxPreviewBackgroundColor,
	lightboxPreviewDynamicStyles,
	lightboxPreviewShowNavigation,
	lightboxSettingsToFancyboxOpts,
} from '../utils/lightboxSettingsToFancyboxOpts';
import {
	getLightboxCarouselToolbarSignature,
	getLightboxPreviewStructuralSignature,
} from './lightboxPreviewLivePatch';
import {
	applyModulaLightboxPreviewPatch,
	closeModulaLightboxPreview,
	getModulaLightboxPreviewInstance,
	getModulaLightboxPreviewSlideIndex,
	openModulaLightboxPreview,
} from './modulaLightboxPreviewRuntime';
import './_lightbox-preview-panel.scss';

const REOPEN_DEBOUNCE_MS = 120;

/**
 * @param {{
 *   items: unknown[],
 *   groupedSettings: object,
 *   galleryId: number,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 *   shareButtons?: Record<string, string>,
 *   exifCaption?: import('../utils/exifCaption').ExifCaptionConfig,
 * }} props `shareButtons`: network → share button HTML, from `Modula_Helper::render_lightbox_share_template()` (the gallery editor config's `lightboxShareButtons`). `exifCaption`: the EXIF line's icon and month names, from Pro (the gallery editor config's `exifCaption`); without it the captions show no EXIF.
 */
export default function LightboxPreviewPanel({
	items,
	groupedSettings,
	galleryId,
	previewViewport,
	shareButtons,
	exifCaption,
}) {
	const hostRef = useRef(null);
	const slidesRef = useRef([]);
	const lightboxOptsRef = useRef({});
	const shareButtonsRef = useRef(shareButtons);
	const lastStructuralSignatureRef = useRef('');
	const lastSoftSignatureRef = useRef('');
	const openRequestIdRef = useRef(0);
	const imageRows = useMemo(
		() => collectGalleryImageRowsForLightboxPreview(items),
		[items]
	);
	const slides = useMemo(
		() =>
			buildLightboxPreviewSlides(imageRows, groupedSettings, {
				exifCaption,
			}),
		[imageRows, groupedSettings, exifCaption]
	);
	const lightboxOpts = useMemo(
		() =>
			lightboxSettingsToFancyboxOpts(groupedSettings, {
				galleryId,
				previewViewport,
				editorPreview: true,
			}),
		[groupedSettings, galleryId, previewViewport]
	);

	const previewBackgroundColor = useMemo(
		() => lightboxPreviewBackgroundColor(groupedSettings),
		[groupedSettings]
	);

	const openOn = groupedSettings?.lightbox?.openOn || 'both';
	const openAllowed = isLightboxOpenAllowedOnPreviewViewport(
		openOn,
		previewViewport
	);
	const showNav = lightboxPreviewShowNavigation(groupedSettings);
	const captionPositionStyle =
		lightboxCaptionPositionCssVars(groupedSettings);
	const hostStyle = lightboxPreviewDynamicStyles(groupedSettings);

	const structuralSignature = useMemo(() => {
		const base = getLightboxPreviewStructuralSignature(
			slides,
			groupedSettings,
			previewViewport
		);
		const toolbar = getLightboxCarouselToolbarSignature(
			lightboxOpts?.Carousel
		);
		return `${base}\n${toolbar}`;
	}, [slides, groupedSettings, previewViewport, lightboxOpts]);
	const softSignature = useMemo(
		() =>
			JSON.stringify({
				lightbox: softSignatureFromOpts(lightboxOpts),
				previewBackgroundColor,
			}),
		[lightboxOpts, previewBackgroundColor]
	);

	slidesRef.current = slides;
	lightboxOptsRef.current = lightboxOpts;
	shareButtonsRef.current = shareButtons;

	useEffect(() => {
		return () => {
			closeModulaLightboxPreview();
		};
	}, []);

	useEffect(() => {
		if (!openAllowed || slides.length === 0) {
			closeModulaLightboxPreview();
			lastStructuralSignatureRef.current = '';
			lastSoftSignatureRef.current = '';
			return undefined;
		}

		const host = hostRef.current;
		if (!host) {
			return undefined;
		}

		const timer = window.setTimeout(() => {
			const requestId = ++openRequestIdRef.current;
			const structuralChanged =
				lastStructuralSignatureRef.current !== structuralSignature;
			const softChanged = lastSoftSignatureRef.current !== softSignature;
			const hasInstance = Boolean(getModulaLightboxPreviewInstance());

			if (structuralChanged || !hasInstance) {
				const startIndex = getModulaLightboxPreviewSlideIndex();
				closeModulaLightboxPreview();
				openModulaFancyboxInHost({
					host,
					slides: slidesRef.current,
					opts: lightboxOptsRef.current,
					startIndex,
					previewBackgroundColor,
					previewViewport,
					shareButtons: shareButtonsRef.current,
					openPreview: openModulaLightboxPreview,
				});
				if (openRequestIdRef.current === requestId) {
					lastStructuralSignatureRef.current = structuralSignature;
					lastSoftSignatureRef.current = softSignature;
				}
				return;
			}

			if (softChanged) {
				const patched = applyModulaLightboxPreviewPatch({
					lightboxOpts: lightboxOptsRef.current,
					previewBackgroundColor,
					previewViewport,
					shareButtons: shareButtonsRef.current,
					slideCount: slidesRef.current.length,
				});
				if (!patched) {
					const startIndex = getModulaLightboxPreviewSlideIndex();
					closeModulaLightboxPreview();
					openModulaFancyboxInHost({
						host,
						slides: slidesRef.current,
						opts: lightboxOptsRef.current,
						startIndex,
						previewBackgroundColor,
						previewViewport,
						shareButtons: shareButtonsRef.current,
						openPreview: openModulaLightboxPreview,
					});
					if (openRequestIdRef.current === requestId) {
						lastStructuralSignatureRef.current =
							structuralSignature;
						lastSoftSignatureRef.current = softSignature;
					}
					return;
				}
				if (openRequestIdRef.current === requestId) {
					lastSoftSignatureRef.current = softSignature;
				}
			}
		}, REOPEN_DEBOUNCE_MS);

		return () => {
			window.clearTimeout(timer);
		};
	}, [
		openAllowed,
		structuralSignature,
		softSignature,
		previewBackgroundColor,
		previewViewport,
		slides.length,
	]);

	if (slides.length === 0) {
		return (
			<div className="modula-gallery-takeover__lightbox-preview modula-gallery-takeover__lightbox-preview--empty">
				<p>
					{__(
						'Add images to the gallery to preview the lightbox.',
						'modula-best-grid-gallery'
					)}
				</p>
			</div>
		);
	}

	if (!openAllowed) {
		return (
			<div className="modula-gallery-takeover__lightbox-preview modula-gallery-takeover__lightbox-preview--gated">
				<p>
					{__(
						'Lightbox is not configured to open on this preview device. Change “Open lightbox on” or switch the preview viewport.',
						'modula-best-grid-gallery'
					)}
				</p>
				{imageRows[0]?.src ? (
					<img
						className="modula-gallery-takeover__lightbox-preview-sample"
						src={imageRows[0].src}
						alt={imageRows[0].alt || ''}
					/>
				) : null}
			</div>
		);
	}

	return (
		<div className="modula-best-grid-gallery modula-gallery-takeover__lightbox-preview-wrap">
			<div
				ref={hostRef}
				className={`modula-best-grid-gallery modula-gallery-takeover__lightbox-preview${
					showNav
						? ''
						: ' modula-gallery-takeover__lightbox-preview--hide-nav'
				}`}
				style={{
					...hostStyle,
					...captionPositionStyle,
				}}
				data-gallery-id={galleryId}
			/>
		</div>
	);
}

/**
 * JSON-safe lightbox opts for change detection (strip functions).
 *
 * @param {Object} opts
 * @return {string}
 */
function softSignatureFromOpts(opts) {
	return JSON.stringify(opts, (_key, value) =>
		typeof value === 'function' ? undefined : value
	);
}

/**
 * @param {{
 *   host: HTMLElement,
 *   slides: Array<{ src: string, opts?: object }>,
 *   opts: object,
 *   startIndex: number,
 *   previewBackgroundColor: string,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 *   shareButtons?: Record<string, string>,
 *   openPreview: (slides: unknown[], opts: object, index: number, shareButtons?: Record<string, string>) => void,
 * }} args
 */
function openModulaFancyboxInHost({
	host,
	slides,
	opts,
	startIndex,
	previewBackgroundColor,
	previewViewport,
	shareButtons,
	openPreview,
}) {
	const mergedOpts = {
		...opts,
		parentEl: host,
		previewBackgroundColor,
		previewViewport,
		trapFocus: false,
		autoFocus: false,
		placeFocusBack: false,
		mainClass: [
			opts.mainClass,
			'modula-gallery-takeover__lightbox-preview-container',
		]
			.filter(Boolean)
			.join(' '),
	};

	openPreview(
		slides,
		mergedOpts,
		startIndex >= 0 ? startIndex : 0,
		shareButtons
	);
}
