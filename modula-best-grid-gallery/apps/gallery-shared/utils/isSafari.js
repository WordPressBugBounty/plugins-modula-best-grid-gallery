/**
 * True for desktop and mobile Safari (WebKit), excluding Chromium/Firefox/Edge iOS shells.
 *
 * @return {boolean}
 */
export function isSafariBrowser() {
	if (typeof navigator === 'undefined') {
		return false;
	}
	const ua = navigator.userAgent;
	return (
		/Safari/i.test(ua) &&
		!/(Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg|OPR|Opera)/i.test(ua)
	);
}
