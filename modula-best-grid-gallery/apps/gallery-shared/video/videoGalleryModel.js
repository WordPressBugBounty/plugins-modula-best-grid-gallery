/**
 * Video gallery: normalize items, classify sources, posters, autoplay flags.
 *
 * @package
 */

/**
 * True if URL is likely a video embed or file (not a static image poster).
 * Mirrors PHP `Modula_Frontend_Adapter::is_probable_modula_video_playback_url`.
 *
 * @param {unknown} url
 * @return {boolean}
 */
export function isProbableModulaVideoPlaybackUrl(url) {
	const u = String(url || '')
		.trim()
		.toLowerCase();
	if (!u) {
		return false;
	}
	if (
		u.includes('youtu.be') ||
		u.includes('youtube.com') ||
		u.includes('youtube-nocookie.com')
	) {
		return true;
	}
	if (u.includes('vimeo.com') || u.includes('player.vimeo')) {
		return true;
	}
	return /\.(mp4|webm|ogv|ogg)(\?|#|$)/i.test(u);
}

/**
 * Playback URL for a gallery row. Never falls back to image href/url.
 *
 * @param {Object} item
 * @return {string}
 */
export function getItemVideoUrl(item) {
	if (!item || typeof item !== 'object') {
		return '';
	}
	const explicit = String(
		item.videoUrl ?? item.video_url ?? item.videoSrc ?? ''
	).trim();
	if (explicit) {
		return explicit;
	}

	const imgAttrs = item.imgAttributes || item.img_attributes || {};
	const linkAttrs = item.linkAttributes || item.link_attributes || {};
	const candidates = [
		typeof imgAttrs['data-full'] === 'string' ? imgAttrs['data-full'] : '',
		typeof linkAttrs['data-full'] === 'string'
			? linkAttrs['data-full']
			: '',
	];
	for (const candidate of candidates) {
		const trimmed = String(candidate || '').trim();
		if (trimmed && isProbableModulaVideoPlaybackUrl(trimmed)) {
			return trimmed;
		}
	}
	return '';
}

/**
 * @param {Object} item
 * @return {boolean}
 */
export function isVideoGalleryItem(item) {
	return getItemVideoUrl(item) !== '';
}

/**
 * Whether settings-editor preview chrome should use video copy (edit/remove/actions).
 *
 * @param {unknown}                 item
 * @param {string|undefined|null}   galleryType `gallery.config.type` / `general.type`
 * @return {boolean}
 */
export function isGalleryPreviewVideoItem(item, galleryType) {
	if (galleryType === 'video') {
		return true;
	}
	return isVideoGalleryItem(item);
}

/**
 * @param {unknown} items
 * @return {Object[]}
 */
export function filterVideoGalleryItems(items) {
	if (!Array.isArray(items)) {
		return [];
	}
	return items.filter(isVideoGalleryItem);
}

/**
 * @param {string} raw
 * @return {string}
 */
function ensureAbsoluteUrl(raw) {
	if (!raw || typeof raw !== 'string') {
		return '';
	}
	if (raw.startsWith('//')) {
		return `https:${raw}`;
	}
	return raw;
}

/**
 * @param {string} raw
 * @return {string}
 */
export function extractYouTubeVideoId(raw) {
	const abs = ensureAbsoluteUrl(raw);
	if (!abs) {
		return '';
	}
	try {
		const u = new URL(abs);
		const host = u.hostname.replace(/^www\./, '');
		if (host === 'youtu.be') {
			return u.pathname.replace(/^\//, '').split('/')[0] || '';
		}
		if (!host.includes('youtube.com')) {
			return '';
		}
		const path = u.pathname || '';
		const embedMatch = path.match(/^\/embed\/([^/?]+)/);
		if (embedMatch) {
			return embedMatch[1];
		}
		const shortsMatch = path.match(/^\/shorts\/([^/?]+)/);
		if (shortsMatch) {
			return shortsMatch[1];
		}
		const v = u.searchParams.get('v');
		return (v && String(v)) || '';
	} catch {
		return '';
	}
}

/**
 * @param {string} raw
 * @return {string}
 */
export function extractVimeoVideoId(raw) {
	const abs = ensureAbsoluteUrl(raw);
	if (!abs) {
		return '';
	}
	try {
		const u = new URL(abs);
		if (u.hostname.includes('player.vimeo.com')) {
			const m = u.pathname.match(/\/video\/(\d+)/);
			return m ? m[1] : '';
		}
		if (u.hostname.includes('vimeo.com')) {
			const parts = u.pathname.split('/').filter(Boolean);
			const last = parts[parts.length - 1];
			if (last && /^\d+$/.test(last)) {
				return last;
			}
		}
	} catch {
		// ignore
	}
	return '';
}

/**
 * @param {string} videoUrl
 * @return {'youtube'|'vimeo'|'html5'}
 */
export function classifyVideoKind(videoUrl) {
	if (!videoUrl || typeof videoUrl !== 'string') {
		return 'html5';
	}
	const s = videoUrl.toLowerCase();
	if (
		s.includes('youtu.be') ||
		s.includes('youtube.com') ||
		s.includes('youtube-nocookie.com')
	) {
		return 'youtube';
	}
	if (s.includes('vimeo.com') || s.includes('player.vimeo')) {
		return 'vimeo';
	}
	return 'html5';
}

/**
 * @param {Object} item
 * @return {string}
 */
export function getVideoPoster(item) {
	if (!item || typeof item !== 'object') {
		return '';
	}
	return String(
		item.video_thumbnail ??
			item.videoThumbnail ??
			item.thumbnail ??
			item.src ??
			item.image?.src ??
			''
	).trim();
}

const VIDEO_FILE_URL_RE = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;

/**
 * Poster / tile image URL for a video row (never the playback URL).
 *
 * @param {Object} item
 * @param {{ video_thumbnail?: string, video_url?: string }} [overrides]
 * @return {string}
 */
export function resolveVideoPosterDisplayUrl(item, overrides = {}) {
	const videoUrl = String(
		overrides.video_url ?? getItemVideoUrl(item) ?? ''
	).trim();
	const videoThumb = String(
		overrides.video_thumbnail ?? item?.video_thumbnail ?? ''
	).trim();
	if (videoThumb) {
		return videoThumb;
	}
	const candidates = [item?.thumbnail, item?.src, item?.url, item?.full]
		.map((value) => String(value ?? '').trim())
		.filter(Boolean);
	for (const candidate of candidates) {
		if (videoUrl && candidate === videoUrl) {
			continue;
		}
		if (VIDEO_FILE_URL_RE.test(candidate)) {
			continue;
		}
		return candidate;
	}
	return '';
}

/**
 * Sync poster/display URLs on a preview Redux row (thumbnail, src, imgAttributes, …).
 *
 * @param {Object} item
 * @param {{ video_thumbnail?: string, video_url?: string }} [overrides]
 * @return {Object}
 */
export function applyVideoPosterFieldsToPreviewItem(item, overrides = {}) {
	if (!item || typeof item !== 'object') {
		return item;
	}
	const playbackUrl = String(
		overrides.video_url ?? getItemVideoUrl(item) ?? ''
	).trim();
	if (!playbackUrl) {
		return item;
	}
	const displayUrl = resolveVideoPosterDisplayUrl(item, overrides);
	if (!displayUrl) {
		return item;
	}
	const videoThumb =
		String(
			overrides.video_thumbnail ?? item.video_thumbnail ?? ''
		).trim() || displayUrl;
	const imgAttributes = {
		...(item.imgAttributes &&
		typeof item.imgAttributes === 'object' &&
		!Array.isArray(item.imgAttributes)
			? item.imgAttributes
			: {}),
		src: displayUrl,
		srcset: displayUrl,
		'data-src': displayUrl,
	};
	const next = {
		...item,
		video_url: playbackUrl,
		video_thumbnail: videoThumb,
		thumbnail: displayUrl,
		src: displayUrl,
		url: displayUrl,
		full: displayUrl,
		imgAttributes,
	};
	if (
		item.img_attributes !== undefined &&
		typeof item.img_attributes === 'object' &&
		!Array.isArray(item.img_attributes)
	) {
		next.img_attributes = { ...item.img_attributes, ...imgAttributes };
	}
	return next;
}

/**
 * @param {Object} item
 * @param {boolean} galleryDefault
 * @param {'autoplay_lightbox'|'loop_video'|'autoplay_thumbnail'} field
 * @return {boolean}
 */
function resolveItemTriStateFlag(item, galleryDefault, field) {
	const raw = item?.[field];
	if (raw === '1' || raw === 1 || raw === true || raw === 'on') {
		return true;
	}
	if (raw === '0' || raw === 0 || raw === false || raw === 'off') {
		return false;
	}
	return !!galleryDefault;
}

/**
 * Append autoplay/loop query params for lightbox / embed playback.
 *
 * @param {string} rawUrl
 * @param {{ autoplay?: boolean, loop?: boolean, mute?: boolean }} [flags]
 * @return {string}
 */
export function formatVideoPlaybackUrl(rawUrl, flags = {}) {
	const abs = ensureAbsoluteUrl(String(rawUrl || '').trim());
	if (!abs) {
		return '';
	}
	const kind = classifyVideoKind(abs);
	const autoplay = !!flags.autoplay;
	const loop = !!flags.loop;
	const mute = flags.mute !== false && autoplay;

	try {
		if (kind === 'youtube') {
			const id = extractYouTubeVideoId(abs);
			if (!id) {
				return abs;
			}
			const u = new URL(`https://www.youtube.com/embed/${id}`);
			if (autoplay) {
				u.searchParams.set('autoplay', '1');
			}
			if (mute) {
				u.searchParams.set('mute', '1');
			}
			if (loop) {
				u.searchParams.set('loop', '1');
				u.searchParams.set('playlist', id);
			}
			u.searchParams.set('playsinline', '1');
			u.searchParams.set('rel', '0');
			return u.toString();
		}
		if (kind === 'vimeo') {
			const id = extractVimeoVideoId(abs);
			if (!id) {
				return abs;
			}
			const u = new URL(`https://player.vimeo.com/video/${id}`);
			if (autoplay) {
				u.searchParams.set('autoplay', '1');
			}
			if (mute) {
				u.searchParams.set('muted', '1');
			}
			if (loop) {
				u.searchParams.set('loop', '1');
			}
			return u.toString();
		}
		// HTML5 / hosted — Fancybox uses the file URL; loop/autoplay via slide opts.
		return abs;
	} catch {
		return abs;
	}
}

/**
 * @param {Object} item
 * @param {Object} [videoSettings] config.video
 * @return {{ autoplay: boolean, loop: boolean }}
 */
export function resolveItemLightboxVideoFlags(item, videoSettings = {}) {
	return {
		autoplay: resolveItemTriStateFlag(
			item,
			!!videoSettings.autoplayVideos,
			'autoplay_lightbox'
		),
		loop: resolveItemTriStateFlag(
			item,
			!!videoSettings.loopVideos,
			'loop_video'
		),
	};
}

/**
 * @param {Object}  item
 * @param {boolean} galleryAutoplay
 * @return {boolean}
 */
export function resolveItemAutoplayThumbnail(item, galleryAutoplay) {
	const raw = item.autoplay_thumbnail ?? item.autoplayThumbnail;
	if (raw === '1' || raw === 1 || raw === true || raw === 'on') {
		return true;
	}
	if (raw === '0' || raw === 0 || raw === false || raw === 'off') {
		return false;
	}
	return !!galleryAutoplay;
}

/**
 * @param {Object} item
 * @param {Object} galleryConfig
 * @return {Object|null}
 */
export function normalizeVideoGalleryItem(item, galleryConfig = {}) {
	const playbackUrl = getItemVideoUrl(item);
	if (!playbackUrl) {
		return null;
	}

	const videoSettings = galleryConfig.video || {};
	let kind = classifyVideoKind(playbackUrl);
	const explicit = String(
		item.video_type ?? item.videoType ?? ''
	).toLowerCase();
	if (explicit === 'hosted' || explicit === 'self' || explicit === 'html5') {
		kind = 'html5';
	} else if (explicit === 'youtube') {
		kind = 'youtube';
	} else if (explicit === 'vimeo') {
		kind = 'vimeo';
	}

	return {
		item,
		playbackUrl,
		kind,
		youtubeId: kind === 'youtube' ? extractYouTubeVideoId(playbackUrl) : '',
		vimeoId: kind === 'vimeo' ? extractVimeoVideoId(playbackUrl) : '',
		poster: getVideoPoster(item),
		autoplayThumbnail: resolveItemAutoplayThumbnail(
			item,
			videoSettings.autoplayThumbnail
		),
		title: String(item.video_title ?? item.title ?? '').trim(),
	};
}

/**
 * @param {unknown} items
 * @param {Object} galleryConfig
 * @return {Object[]}
 */
export function normalizeVideoGalleryItems(items, galleryConfig = {}) {
	return filterVideoGalleryItems(items)
		.map((item) => normalizeVideoGalleryItem(item, galleryConfig))
		.filter(Boolean);
}

/**
 * @param {Object} config
 * @return {'right'|'bottom'}
 */
export function resolvePlaylistPosition(config) {
	const pos = config?.video?.playlistPosition;
	return pos === 'bottom' ? 'bottom' : 'right';
}
