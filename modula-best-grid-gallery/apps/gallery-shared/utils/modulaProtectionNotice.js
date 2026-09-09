/**
 * Visitor-facing Image Guardian toast (deterrent, not DRM).
 *
 * @package
 */

const HIDE_MS = 2800;
let hideTimer = null;
let throttleUntil = 0;
/** @type {HTMLDivElement|null} */
let el = null;

function ensureStyle() {
	if (document.getElementById('modula-protection-notice-style')) {
		return;
	}
	const style = document.createElement('style');
	style.id = 'modula-protection-notice-style';
	style.textContent = `
.modula-protection-notice{position:fixed;z-index:100000;left:50%;bottom:28px;max-width:min(420px,calc(100vw - 32px));padding:12px 16px;margin:0;transform:translateX(-50%) translateY(12px);opacity:0;pointer-events:none;box-sizing:border-box;border:1px solid rgba(255,255,255,.12);border-radius:2px;background:#1d1e22;color:#f3f3f4;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;font-weight:500;line-height:1.4;text-align:center;box-shadow:0 1px 2px rgb(0 0 0 / 35%),0 12px 28px -8px rgb(0 0 0 / 55%);transition:opacity .2s ease,transform .2s ease}
.modula-protection-notice.is-visible{opacity:1;transform:translateX(-50%) translateY(0)}
`;
	document.head.appendChild(style);
}

function ensureEl() {
	ensureStyle();
	if (el && document.body.contains(el)) {
		return el;
	}
	el = document.createElement('div');
	el.className = 'modula-protection-notice';
	el.setAttribute('role', 'status');
	el.setAttribute('aria-live', 'polite');
	document.body.appendChild(el);
	return el;
}

/**
 * @param {string} [message]
 * @param {string} [fallback]
 */
export function showModulaProtectionNotice(message, fallback) {
	const text =
		typeof message === 'string' && message.trim() !== ''
			? message.trim()
			: typeof fallback === 'string' && fallback.trim() !== ''
				? fallback.trim()
				: '';
	if (!text || typeof document === 'undefined') {
		return;
	}

	if (
		typeof window !== 'undefined' &&
		window.ModulaProtectionNotice &&
		typeof window.ModulaProtectionNotice.show === 'function' &&
		window.ModulaProtectionNotice.__modulaNative !== true
	) {
		window.ModulaProtectionNotice.show(text);
		return;
	}

	const now = Date.now();
	if (now < throttleUntil) {
		return;
	}
	throttleUntil = now + 400;

	const node = ensureEl();
	node.textContent = text;
	node.classList.add('is-visible');

	if (hideTimer) {
		window.clearTimeout(hideTimer);
	}
	hideTimer = window.setTimeout(() => {
		node.classList.remove('is-visible');
	}, HIDE_MS);
}

/**
 * Expose for legacy / site-wide scripts when this bundle loads first.
 */
export function installModulaProtectionNoticeGlobal() {
	if (typeof window === 'undefined') {
		return;
	}
	if (
		window.ModulaProtectionNotice &&
		typeof window.ModulaProtectionNotice.show === 'function'
	) {
		return;
	}
	window.ModulaProtectionNotice = {
		__modulaNative: true,
		show: (message) => showModulaProtectionNotice(message),
	};
}
