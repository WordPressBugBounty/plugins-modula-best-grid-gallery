import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from '@wordpress/element';
import { useForm } from '@tanstack/react-form';
import { captionToPlainString } from '../utils/captionToPlainString';
import { useWpMediaAttachmentQuery } from '../query/useWpMediaAttachmentQuery';
import {
	focusedImageMetadataProtectedFieldName,
	shouldApplyImageMetadataExternalReset,
} from '../utils/imageMetadataAutosavePolicy';

const EMPTY_VALUES = {
	title: '',
	alt: '',
	description: '',
	link: '',
	target: '0',
	halign: 'center',
	valign: 'middle',
	filters: '',
	togglelightbox: '0',
	hide_title: '0',
	video_url: '',
	video_thumbnail: '',
	autoplay_thumbnail: 'inherit',
	autoplay_lightbox: 'inherit',
	loop_video: 'inherit',
	exif_camera: '',
	exif_lens: '',
	exif_focal_length: '',
	exif_shutter_speed: '',
	exif_aperture: '',
	exif_iso: '',
	exif_date: '',
};

function triStateFromItem(v, fallback) {
	if (v === undefined || v === null || v === '') {
		return fallback;
	}
	const s = String(v).toLowerCase();
	if (s === 'inherit' || s === 'on' || s === 'off') {
		return s;
	}
	return fallback;
}

/**
 * @param {Object|null} item Redux gallery row.
 * @return {typeof EMPTY_VALUES}
 */
export function defaultImageMetadataValuesFromItem(item) {
	if (!item) {
		return { ...EMPTY_VALUES };
	}
	return buildValuesFromItem(item);
}

/**
 * @param {Object} item
 * @return {typeof EMPTY_VALUES}
 */
function buildValuesFromItem(item) {
	return {
		...EMPTY_VALUES,
		title: captionToPlainString(item.title),
		alt: item.alt || '',
		description:
			captionToPlainString(item.description) ||
			captionToPlainString(item.caption) ||
			'',
		link: item.link || '',
		target: String(item.target ?? '0'),
		halign: item.halign || 'center',
		valign: item.valign || 'middle',
		filters: item.filters || '',
		togglelightbox: String(item.togglelightbox ?? '0'),
		hide_title: String(item.hide_title ?? '0'),
		video_url: item.video_url || '',
		video_thumbnail:
			item.video_thumbnail ||
			item.videoThumbnailUrl ||
			item.video_thumbnail_url ||
			'',
		autoplay_thumbnail: triStateFromItem(
			item.autoplay_thumbnail,
			'inherit'
		),
		autoplay_lightbox: triStateFromItem(item.autoplay_lightbox, 'inherit'),
		loop_video: triStateFromItem(item.loop_video, 'inherit'),
		exif_camera: item.exif_camera || '',
		exif_lens: item.exif_lens || '',
		exif_focal_length: item.exif_focal_length || '',
		exif_shutter_speed: item.exif_shutter_speed || '',
		exif_aperture: item.exif_aperture || '',
		exif_iso: item.exif_iso || '',
		exif_date: item.exif_date || '',
	};
}

/**
 * @param {typeof EMPTY_VALUES} prev
 * @param {Object}              m    WP media REST object.
 * @param {Object|null}         item
 * @return {typeof EMPTY_VALUES}
 */
function mergeWpMediaTitleAltDescription(prev, m, item) {
	const titleFromItem = captionToPlainString(item?.title);
	const descriptionFromItem =
		captionToPlainString(item?.description) ||
		captionToPlainString(item?.caption) ||
		'';

	return {
		...prev,
		title: titleFromItem || captionToPlainString(m.title) || '',
		// Gallery row wins over cached WP attachment (per-gallery overrides).
		alt: item?.alt ?? m.alt_text ?? '',
		description:
			descriptionFromItem || captionToPlainString(m.caption) || '',
	};
}

/**
 * TanStack Form for image metadata modal + WP media hydration via TanStack Query.
 *
 * @param {boolean}     isOpen
 * @param {number|null} storeIndex
 * @param {Object|null} item
 * @param {number}      attachmentId
 */
export function useImageMetadataForm(isOpen, storeIndex, item, attachmentId) {
	const itemRef = useRef(item);
	itemRef.current = item;

	const mediaQuery = useWpMediaAttachmentQuery(attachmentId, {
		enabled: isOpen && Boolean(attachmentId),
	});

	const itemFingerprint =
		isOpen && item && storeIndex !== null && storeIndex !== undefined
			? `${storeIndex}:${item.id}`
			: '';

	const valuesFromItem = useMemo(() => {
		if (!itemFingerprint || !item) {
			return { ...EMPTY_VALUES };
		}
		return buildValuesFromItem(item);
	}, [itemFingerprint, item]);

	const form = useForm({
		defaultValues: valuesFromItem,
	});

	const itemFingerprintRef = useRef(/** @type {string|null} */ (null));
	const mediaHydratedFingerprintRef = useRef('');

	useLayoutEffect(() => {
		if (!itemFingerprint) {
			itemFingerprintRef.current = itemFingerprint;
			return;
		}
		if (itemFingerprint === itemFingerprintRef.current) {
			return;
		}
		itemFingerprintRef.current = itemFingerprint;
		const row = itemRef.current;
		if (row) {
			form.reset(buildValuesFromItem(row));
		}
	}, [itemFingerprint, form]);

	useEffect(() => {
		if (
			!mediaQuery.isSuccess ||
			!mediaQuery.data ||
			Number(mediaQuery.data.id) !== attachmentId
		) {
			return;
		}
		if (!itemFingerprint) {
			mediaHydratedFingerprintRef.current = '';
			return;
		}
		// Base must come from the gallery row, not form.state: `reset` from the
		// fingerprint effect may not have flushed before this effect runs, so
		// `form.state.values` can still be EMPTY_VALUES and would wipe toggles.
		const base = defaultImageMetadataValuesFromItem(itemRef.current);
		const merged = mergeWpMediaTitleAltDescription(
			base,
			mediaQuery.data,
			itemRef.current
		);
		const isNewRow =
			itemFingerprint !== mediaHydratedFingerprintRef.current;
		if (isNewRow) {
			mediaHydratedFingerprintRef.current = itemFingerprint;
			form.reset(merged);
			return;
		}
		const focused = focusedImageMetadataProtectedFieldName(
			typeof document !== 'undefined' ? document.activeElement : null
		);
		if (
			!shouldApplyImageMetadataExternalReset({
				focusedProtectedKey: focused,
				currentValues: form.state.values,
				incomingValues: merged,
			})
		) {
			return;
		}
		form.reset(merged);
		// `form` is stable from useForm; omit from deps to avoid redundant resets.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- form.reset only
	}, [
		isOpen,
		itemFingerprint,
		mediaQuery.isSuccess,
		mediaQuery.dataUpdatedAt,
		attachmentId,
	]);

	return { form, mediaQuery };
}
