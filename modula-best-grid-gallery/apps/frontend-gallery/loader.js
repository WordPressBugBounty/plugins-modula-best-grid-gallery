import {
	getDeeplinkGalleryIdFromHash,
} from 'gallery-shared/runtime';
import './loader.scss';

const GALLERY_SELECTOR =
	'.modula.modula-gallery:not(.modula-gallery-initialized)';
const ROOT_MARGIN = '200px 0px';

if (
	typeof window !== 'undefined' &&
	window.modulaGallery?.publicPath &&
	typeof __webpack_public_path__ !== 'undefined'
) {
	__webpack_public_path__ = window.modulaGallery.publicPath;
}

/** @type {Promise<import('./bootstrap').default>|null} */
let bootstrapPromise = null;

/** @type {WeakMap<HTMLElement, IntersectionObserver>} */
const galleryObservers = new WeakMap();

/** @type {WeakSet<HTMLElement>} */
const destroyedGalleries = new WeakSet();

/**
 * @returns {string}
 */
function loadingMessage() {
	if (
		typeof window !== 'undefined' &&
		window.modulaGallery?.strings?.loadingGallery
	) {
		return window.modulaGallery.strings.loadingGallery;
	}
	return 'Loading gallery…';
}

/**
 * @param {HTMLElement} element
 */
function showPendingState(element) {
	if (element.classList.contains('modula-gallery--bootstrap-pending')) {
		return;
	}
	element.classList.add('modula-gallery--bootstrap-pending');
	if (element.querySelector('.modula-gallery__bootstrap-loading')) {
		return;
	}
	const loading = document.createElement('div');
	loading.className = 'modula-gallery__bootstrap-loading';
	loading.setAttribute('role', 'status');
	loading.setAttribute('aria-busy', 'true');
	loading.textContent = loadingMessage();
	element.appendChild(loading);
}

/**
 * @returns {string}
 */
function loadingFailedMessage() {
	if (
		typeof window !== 'undefined' &&
		window.modulaGallery?.strings?.loadingFailed
	) {
		return window.modulaGallery.strings.loadingFailed;
	}
	return 'Could not load gallery.';
}

/**
 * @returns {string}
 */
function tryAgainLabel() {
	if (
		typeof window !== 'undefined' &&
		window.modulaGallery?.strings?.tryAgain
	) {
		return window.modulaGallery.strings.tryAgain;
	}
	return 'Try again';
}

/**
 * @param {HTMLElement} element
 */
function showBootstrapError(element, message, { withRetry = false } = {}) {
	element.classList.add('modula-gallery--bootstrap-pending');
	element.innerHTML = '';
	const wrap = document.createElement('div');
	wrap.className = 'modula-gallery__bootstrap-loading';
	wrap.setAttribute('role', 'alert');

	const text = document.createElement('p');
	text.className = 'modula-gallery__bootstrap-error-text';
	text.textContent = message;
	wrap.appendChild(text);

	if (withRetry) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'modula-gallery__bootstrap-retry';
		button.textContent = tryAgainLabel();
		button.addEventListener('click', () => {
			element.innerHTML = '';
			element.classList.remove('modula-gallery--bootstrap-pending');
			bootstrapPromise = null;
			scheduleGallery(element);
		});
		wrap.appendChild(button);
	}

	element.appendChild(wrap);
}

/**
 * Reset cached bootstrap chunk promise (exported for retry UI).
 */
export function resetGalleryBootstrapPromise() {
	bootstrapPromise = null;
}

/**
 * @param {HTMLElement} element
 */
function markVisible(element) {
	element.dataset.modulaVisible = '1';
}

/**
 * @returns {Promise<import('./bootstrap').default>}
 */
function loadBootstrap() {
	if (!bootstrapPromise) {
		bootstrapPromise = import(
			/* webpackChunkName: "modula-gallery-bootstrap" */ './bootstrap'
		)
			.then((mod) => {
				const api = mod.default ?? mod;
				if (typeof window !== 'undefined') {
					window.ModulaGallery = api;
					window.ModulaGalleryInit = api.initAllGalleries;
					window.ModulaGalleryDestroy = api.destroyGallery;
					window.ModulaGalleryGetInstance = api.getGalleryInstance;
				}
				return api;
			})
			.catch((err) => {
				bootstrapPromise = null;
				throw err;
			});
	}
	return bootstrapPromise;
}

/**
 * @param {HTMLElement} element
 */
async function mountWhenVisible(element) {
	if (destroyedGalleries.has(element)) {
		return;
	}
	markVisible(element);
	try {
		const api = await loadBootstrap();
		await api.initGalleries();
	} catch (err) {
		console.error('Modula: gallery bootstrap failed', err);
		showBootstrapError(element, loadingFailedMessage(), {
			withRetry: true,
		});
	}
}

/**
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isElementInViewport(element) {
	const rect = element.getBoundingClientRect();
	const margin = 200;
	return (
		rect.bottom >= -margin &&
		rect.top <=
			(window.innerHeight || document.documentElement.clientHeight) +
				margin &&
		rect.right >= 0 &&
		rect.width > 0
	);
}

/**
 * @param {HTMLElement} element
 * @param {() => void} onVisible
 */
function observeGallery(element, onVisible) {
	if (destroyedGalleries.has(element)) {
		return;
	}
	if (isElementInViewport(element)) {
		onVisible();
		return;
	}
	if (!('IntersectionObserver' in window)) {
		onVisible();
		return;
	}
	const existing = galleryObservers.get(element);
	if (existing) {
		existing.disconnect();
	}
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) {
					continue;
				}
				observer.unobserve(entry.target);
				galleryObservers.delete(entry.target);
				if (!destroyedGalleries.has(entry.target)) {
					onVisible();
				}
			}
		},
		{ rootMargin: ROOT_MARGIN, threshold: 0 }
	);
	galleryObservers.set(element, observer);
	observer.observe(element);
}

/**
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function shouldEagerMountForDeeplink(element) {
	if (typeof window === 'undefined') {
		return false;
	}
	const hashGalleryId = getDeeplinkGalleryIdFromHash(window.location.hash);
	if (!hashGalleryId) {
		return false;
	}
	const id = element.id || '';
	const match = id.match(/^modula-(.+)$/i);
	const elementGalleryId = match
		? String(match[1])
		: element.getAttribute('data-gallery-id') || '';
	return (
		elementGalleryId !== '' &&
		String(elementGalleryId).replace(/^jtg-?/, '') === hashGalleryId
	);
}

/**
 * @param {HTMLElement} element
 */
function scheduleGallery(element) {
	if (
		element.classList.contains('modula-gallery-initialized') ||
		destroyedGalleries.has(element)
	) {
		return;
	}
	showPendingState(element);
	if (shouldEagerMountForDeeplink(element)) {
		void mountWhenVisible(element);
		return;
	}
	observeGallery(element, () => {
		void mountWhenVisible(element);
	});
}

function onGalleryDestroyed(event) {
	const el = event.detail?.element;
	if (!(el instanceof HTMLElement)) {
		return;
	}
	destroyedGalleries.add(el);
	const observer = galleryObservers.get(el);
	if (observer) {
		observer.disconnect();
		galleryObservers.delete(el);
	}
}

document.addEventListener('modula:gallery:destroyed', onGalleryDestroyed);

function scanGalleries() {
	document.querySelectorAll(GALLERY_SELECTOR).forEach(scheduleGallery);
}

function onReady() {
	scanGalleries();
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', onReady);
} else {
	onReady();
}
