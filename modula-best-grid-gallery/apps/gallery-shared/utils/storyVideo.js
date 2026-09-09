/**
 * Story layout: detect Modula Video items and classify embed vs HTML5 (Pro + adapter).
 *
 * @package
 */

/**
 * @param {Object} itemData - Item from gallery JSON
 * @return {boolean}
 */
export function isStoryVideoItem(itemData) {
	if (!itemData) {
		return false;
	}
	const v = (
		itemData.videoUrl ??
		itemData.video_url ??
		itemData.videoSrc ??
		''
	).trim();
	return v !== '';
}

/**
 * @param {string} videoSrc - Playback URL (e.g. Modula `videoUrl`), not poster / data-full
 * @return {'youtube'|'vimeo'|'html5'|null}
 */
export function classifyStoryVideoKind(videoSrc) {
	if (!videoSrc || typeof videoSrc !== 'string') {
		return null;
	}
	const s = videoSrc.toLowerCase();
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
 * YouTube watch / share / shorts → video id for /embed/
 *
 * @param {string} raw
 * @return {string}
 */
export function extractYouTubeVideoId(raw) {
	const abs = ensureAbsoluteUrl(raw);
	if (!abs || typeof abs !== 'string') {
		return '';
	}
	try {
		const u = new URL(abs);
		const host = u.hostname.replace(/^www\./, '');
		if (host === 'youtu.be') {
			const id = u.pathname.replace(/^\//, '').split('/')[0];
			return id || '';
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
 * Vimeo page URL → numeric video id (player embed).
 *
 * @param {string} raw
 * @return {string}
 */
function extractVimeoVideoId(raw) {
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
 * iframe src with autoplay params (muted where required for autoplay policies).
 *
 * @param {string} videoSrc
 * @param {'youtube'|'vimeo'} kind
 * @return {string}
 */
export function buildStoryVideoEmbedUrl(videoSrc, kind) {
	const abs = ensureAbsoluteUrl(videoSrc);
	if (!abs) {
		return '';
	}
	if (kind === 'youtube') {
		const id = extractYouTubeVideoId(abs);
		if (!id) {
			return '';
		}
		const useNocookie = abs.toLowerCase().includes('youtube-nocookie.com');
		const base = useNocookie
			? 'https://www.youtube-nocookie.com/embed/'
			: 'https://www.youtube.com/embed/';
		const q = new URLSearchParams({
			autoplay: '1',
			mute: '1',
			playsinline: '1',
			rel: '0',
		});
		return `${base}${id}?${q.toString()}`;
	}
	if (kind === 'vimeo') {
		const vid = extractVimeoVideoId(abs);
		if (vid) {
			const q = new URLSearchParams({
				autoplay: '1',
				muted: '1',
			});
			return `https://player.vimeo.com/video/${vid}?${q.toString()}`;
		}
		try {
			const u = new URL(abs);
			u.searchParams.set('autoplay', '1');
			u.searchParams.set('muted', '1');
			return u.href;
		} catch {
			return '';
		}
	}
	return abs;
}
