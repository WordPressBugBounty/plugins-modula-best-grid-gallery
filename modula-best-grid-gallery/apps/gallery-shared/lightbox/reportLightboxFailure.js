/**
 * User-visible feedback when the lazy-loaded lightbox pipeline fails.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';

/** @type {WeakMap<HTMLElement, ReturnType<typeof setTimeout>>} */
const clearTimers = new WeakMap();

const AUTO_CLEAR_MS = 5000;

/**
 * @param {HTMLElement|null|undefined} hostEl Gallery React host or root gallery element.
 * @param {unknown}                    err    Caught error.
 * @param {() => void}                 [retry] Repeat the failed action.
 */
export function reportLightboxFailure(hostEl, err, retry) {
	// eslint-disable-next-line no-console
	console.error('Modula: lightbox failed to open', err);

	const galleryRoot =
		hostEl?.closest?.('.modula.modula-gallery') ||
		hostEl?.parentElement?.closest?.('.modula.modula-gallery') ||
		null;
	if (!galleryRoot) {
		return;
	}

	const existingTimer = clearTimers.get(galleryRoot);
	if (existingTimer) {
		window.clearTimeout(existingTimer);
		clearTimers.delete(galleryRoot);
	}

	let notice = galleryRoot.querySelector('.modula-gallery__lightbox-error');
	if (!notice) {
		notice = document.createElement('div');
		notice.className = 'modula-gallery__lightbox-error';
		notice.setAttribute('role', 'alert');
		notice.setAttribute('aria-live', 'polite');
		galleryRoot.appendChild(notice);
	}

	notice.textContent = __(
		'Could not open the lightbox. Please try again.',
		'modula-best-grid-gallery'
	);
	galleryRoot.classList.add('modula-gallery--lightbox-error');
	if (retry) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'modula-gallery__error-boundary-retry';
		button.textContent = __('Retry lightbox', 'modula-best-grid-gallery');
		button.addEventListener('click', retry);
		notice.appendChild(document.createElement('br'));
		notice.appendChild(button);
		return;
	}

	const timer = window.setTimeout(() => {
		clearLightboxFailureNotice(galleryRoot);
	}, AUTO_CLEAR_MS);
	clearTimers.set(galleryRoot, timer);
}

/**
 * @param {HTMLElement} galleryRoot
 */
export function clearLightboxFailureNotice(galleryRoot) {
	if (!galleryRoot) {
		return;
	}
	const timer = clearTimers.get(galleryRoot);
	if (timer) {
		window.clearTimeout(timer);
		clearTimers.delete(galleryRoot);
	}
	galleryRoot.classList.remove('modula-gallery--lightbox-error');
	const notice = galleryRoot.querySelector('.modula-gallery__lightbox-error');
	if (notice) {
		notice.remove();
	}
}
