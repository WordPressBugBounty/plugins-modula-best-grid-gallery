import { FOCUS_MATCH_LAYOUT_SESSION_KEY } from './getFocusModalCropHints';

/**
 * @param {boolean}               showMatchLayoutToggle
 * @param {boolean}               canLockToLayout
 * @param {number|null|undefined} suggestedAspect
 */
export function readMatchLayoutFromSession(
	showMatchLayoutToggle,
	canLockToLayout,
	suggestedAspect
) {
	if (
		!showMatchLayoutToggle ||
		!canLockToLayout ||
		suggestedAspect === null ||
		suggestedAspect === undefined
	) {
		return false;
	}
	try {
		const v = sessionStorage.getItem(FOCUS_MATCH_LAYOUT_SESSION_KEY);
		if (v === '0') {
			return false;
		}
		if (v === '1') {
			return true;
		}
	} catch {
		// ignore
	}
	return true;
}

/**
 * @param {Object|null}                                   item
 * @param {import('react-easy-crop').Area|undefined|null} initialCroppedAreaPercentages
 */
export function computeFocusCropState(item, initialCroppedAreaPercentages) {
	if (!item) {
		return { crop: { x: 0, y: 0 }, zoom: 1 };
	}
	const focal = parseFocalFromItem(item);
	const restorePct =
		initialCroppedAreaPercentages !== undefined &&
		initialCroppedAreaPercentages !== null;
	let crop = { x: 0, y: 0 };
	if (!restorePct && focal) {
		crop = cropFromFocal(focal.x, focal.y);
	}
	return { crop, zoom: 1 };
}

/**
 * @param {Object|null} item Redux row or null.
 * @return {{ x: number, y: number }|null} Normalized focal or null.
 */
export function parseFocalFromItem(item) {
	if (!item) {
		return null;
	}
	const x = parseFloat(item.focal_x);
	const y = parseFloat(item.focal_y);
	if (Number.isFinite(x) && Number.isFinite(y)) {
		return {
			x: Math.min(1, Math.max(0, x)),
			y: Math.min(1, Math.max(0, y)),
		};
	}
	return null;
}

/**
 * Center of visible crop in normalized image coordinates (0–1).
 *
 * @param {import('react-easy-crop').Area|undefined} area Percentages 0–100.
 */
export function focalFromCroppedArea(area) {
	if (
		!area ||
		typeof area.width !== 'number' ||
		typeof area.height !== 'number' ||
		area.width <= 0 ||
		area.height <= 0
	) {
		return { x: 0.5, y: 0.5 };
	}
	const cx = area.x + area.width / 2;
	const cy = area.y + area.height / 2;
	return {
		x: Math.min(1, Math.max(0, cx / 100)),
		y: Math.min(1, Math.max(0, cy / 100)),
	};
}

/**
 * Initial crop so the saved focal (0–1) is centered in the viewport (zoom 1).
 *
 * @param {number} fx
 * @param {number} fy
 */
export function cropFromFocal(fx, fy) {
	return {
		x: 50 - fx * 100,
		y: 50 - fy * 100,
	};
}

/**
 * @param {number}                galleryId
 * @param {Object|null|undefined} item
 */
export function getFocusCropStorageKey(galleryId, item) {
	if (!galleryId || !item) {
		return null;
	}
	const id = item.id;
	if (id === undefined || id === null || id === '') {
		return null;
	}
	return `modula-focus-crop-area:v1:${galleryId}:${String(id)}`;
}

export function readFocusCropAreaFromSession(storageKey) {
	if (!storageKey || typeof sessionStorage === 'undefined') {
		return null;
	}
	try {
		const raw = sessionStorage.getItem(storageKey);
		if (!raw) {
			return null;
		}
		const data = JSON.parse(raw);
		const area = data?.area;
		if (
			!area ||
			typeof area.x !== 'number' ||
			typeof area.y !== 'number' ||
			typeof area.width !== 'number' ||
			typeof area.height !== 'number' ||
			area.width <= 0 ||
			area.height <= 0
		) {
			return null;
		}
		return area;
	} catch {
		return null;
	}
}

export function writeFocusCropAreaToSession(storageKey, area) {
	if (!storageKey || typeof sessionStorage === 'undefined' || !area) {
		return;
	}
	try {
		sessionStorage.setItem(storageKey, JSON.stringify({ area }));
	} catch {
		// Quota or private mode — focal_x/y are still saved.
	}
}

export function clearFocusCropAreaFromSession(storageKey) {
	if (!storageKey || typeof sessionStorage === 'undefined') {
		return;
	}
	try {
		sessionStorage.removeItem(storageKey);
	} catch {
		// ignore
	}
}

/**
 * @param {import('react-easy-crop').Area|undefined|null} area
 * @param {{ x: number, y: number }|null|undefined}       focal
 */
export function storedAreaMatchesFocal(area, focal) {
	if (!focal || !area) {
		return false;
	}
	const c = focalFromCroppedArea(area);
	return Math.abs(c.x - focal.x) <= 0.035 && Math.abs(c.y - focal.y) <= 0.035;
}

/**
 * @param {Object|null|undefined} item
 */
export function focalCropPercentagesFromItem(item) {
	if (!item) {
		return null;
	}
	const x = parseFloat(item.focal_crop_x);
	const y = parseFloat(item.focal_crop_y);
	const w = parseFloat(item.focal_crop_w);
	const h = parseFloat(item.focal_crop_h);
	if (
		![x, y, w, h].every(Number.isFinite) ||
		w <= 0 ||
		h <= 0 ||
		x < 0 ||
		y < 0 ||
		x + w > 1.0001 ||
		y + h > 1.0001
	) {
		return null;
	}
	return {
		x: x * 100,
		y: y * 100,
		width: w * 100,
		height: h * 100,
	};
}

/**
 * @param {Object|null|undefined} item
 */
export function getFocalCrop01FromItem(item) {
	if (!item) {
		return null;
	}
	const x = parseFloat(item.focal_crop_x);
	const y = parseFloat(item.focal_crop_y);
	const w = parseFloat(item.focal_crop_w);
	const h = parseFloat(item.focal_crop_h);
	if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
		return null;
	}
	return {
		focal_crop_x: Math.min(1, Math.max(0, x)),
		focal_crop_y: Math.min(1, Math.max(0, y)),
		focal_crop_w: Math.min(1, Math.max(1e-6, w)),
		focal_crop_h: Math.min(1, Math.max(1e-6, h)),
	};
}

/**
 * Resolve initial cropped area percentages from server row or session fallback.
 *
 * @param {boolean}                                       isOpen
 * @param {number}                                        galleryId
 * @param {Object|null|undefined}                         item
 */
export function resolveInitialCroppedAreaPercentages(isOpen, galleryId, item) {
	if (!isOpen || !item) {
		return undefined;
	}
	const focal = parseFocalFromItem(item);
	if (!focal) {
		return undefined;
	}
	const fromServer = focalCropPercentagesFromItem(item);
	if (fromServer) {
		return fromServer;
	}
	const key = getFocusCropStorageKey(galleryId, item);
	const stored = readFocusCropAreaFromSession(key);
	if (!stored) {
		return undefined;
	}
	if (focal && !storedAreaMatchesFocal(stored, focal)) {
		return undefined;
	}
	return stored;
}
