import {
	getDeeplinkGalleryIdFromHash,
	MODERN_VISITOR_ROOT_PENDING_SELECTOR,
} from 'gallery-shared/loader';
import {
	BOOTSTRAP_FORCE_GRACE_MS,
	BOOTSTRAP_STALL_MS,
	resolveBootstrapStallAction,
} from './bootstrapStall';
import './loader.scss';
import { waitForGalleryLoad } from './waitForGalleryLoad';
import { loadGalleryStylesheet } from './loadGalleryStylesheet';
import { loadReactDependencies } from './loadReactDependencies';

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
let bootstrapApi = null;

/** @type {WeakMap<HTMLElement, IntersectionObserver>} */
const galleryObservers = new WeakMap();

/** @type {WeakSet<HTMLElement>} */
const destroyedGalleries = new WeakSet();

/**
 * Active attempts stay addressable by ID even while their element is detached.
 * Entries are released on completion, timeout or destruction.
 * @type {Map<HTMLElement, { promise: Promise<void>, controller: AbortController }>}
 */
const pendingLoads = new Map();

/** @type {WeakMap<HTMLElement, { loadRequestedAt: number, forceMountAttempted: boolean, timerId: number }>} */
const stallWatchdogs = new WeakMap();

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
 * @param {HTMLElement} element
 */
function clearStallWatchdog(element) {
	const existing = stallWatchdogs.get(element);
	if (existing?.timerId) {
		window.clearTimeout(existing.timerId);
	}
	stallWatchdogs.delete(element);
}

function cancelPendingLoad(element) {
	const attempt = pendingLoads.get(element);
	pendingLoads.delete(element);
	attempt?.controller.abort();
}

/**
 * @param {HTMLElement} element
 * @param {number} delayMs
 */
function scheduleStallCheck(element, delayMs) {
	const state = stallWatchdogs.get(element);
	if (!state) {
		return;
	}
	if (state.timerId) {
		window.clearTimeout(state.timerId);
	}
	state.timerId = window.setTimeout(() => {
		void onStallTick(element);
	}, delayMs);
}

/**
 * @param {HTMLElement} element
 */
async function onStallTick(element) {
	const state = stallWatchdogs.get(element);
	if (!state || destroyedGalleries.has(element)) {
		clearStallWatchdog(element);
		return;
	}

	const action = resolveBootstrapStallAction({
		now: Date.now(),
		loadRequestedAt: state.loadRequestedAt,
		initialized: element.classList.contains('modula-gallery-initialized'),
		pending: element.classList.contains(
			'modula-gallery--bootstrap-pending'
		),
		forceMountAttempted: state.forceMountAttempted,
	});

	if (action === 'none') {
		clearStallWatchdog(element);
		return;
	}

	if (action === 'wait') {
		const elapsed = Date.now() - state.loadRequestedAt;
		const nextIn = state.forceMountAttempted
			? Math.max(
					250,
					BOOTSTRAP_STALL_MS + BOOTSTRAP_FORCE_GRACE_MS - elapsed
				)
			: Math.max(250, BOOTSTRAP_STALL_MS - elapsed);
		scheduleStallCheck(element, nextIn);
		return;
	}

	if (action === 'force-mount') {
		state.forceMountAttempted = true;
		console.warn(
			'Modula: gallery still Loading after stall — forcing bootstrap mount'
		);
		scheduleStallCheck(element, BOOTSTRAP_FORCE_GRACE_MS);
		void mountWhenVisible(element, { fromStall: true });
		return;
	}

	if (action === 'show-error') {
		clearStallWatchdog(element);
		cancelPendingLoad(element);
		element.removeAttribute('data-modula-visible');
		console.error(
			'Modula: gallery bootstrap stalled with no successful mount'
		);
		showBootstrapError(element, loadingFailedMessage(), {
			withRetry: true,
		});
	}
}

/**
 * @param {HTMLElement} element
 */
function armStallWatchdog(element) {
	clearStallWatchdog(element);
	stallWatchdogs.set(element, {
		loadRequestedAt: Date.now(),
		forceMountAttempted: false,
		timerId: 0,
	});
	scheduleStallCheck(element, BOOTSTRAP_STALL_MS);
}

/**
 * @returns {Promise<import('./bootstrap').default>}
 */
function loadBootstrap(signal) {
	if (!bootstrapPromise) {
		bootstrapPromise = Promise.all([
			loadGalleryStylesheet(window.modulaGallery?.bootstrapStylesheet),
			loadReactDependencies().then(
				() =>
					import(
						/* webpackChunkName: "modula-gallery-bootstrap" */ './bootstrap'
					)
			),
		])
			.then(([, mod]) => {
				const api = mod.default ?? mod;
				bootstrapApi = api;
				return api;
			})
			.catch((err) => {
				bootstrapPromise = null;
				throw err;
			});
	}
	return waitForGalleryLoad(bootstrapPromise, signal);
}

/**
 * @param {HTMLElement} element
 * @param {{ fromStall?: boolean }} [options]
 */
function mountWhenVisible(element, options = {}) {
	if (
		destroyedGalleries.has(element) ||
		element.classList.contains('modula-gallery-initialized')
	) {
		return Promise.resolve();
	}
	const pending = pendingLoads.get(element);
	if (pending) {
		return pending.promise;
	}
	const attempt = { promise: null, controller: new AbortController() };
	pendingLoads.set(element, attempt);
	galleryObservers.get(element)?.disconnect();
	galleryObservers.delete(element);
	showPendingState(element);
	if (!options.fromStall) {
		armStallWatchdog(element);
	}
	markVisible(element);
	attempt.promise = performMount(element, attempt);
	return attempt.promise;
}

async function performMount(element, attempt) {
	try {
		const { signal } = attempt.controller;
		const api = await loadBootstrap(signal);
		if (
			pendingLoads.get(element) !== attempt ||
			destroyedGalleries.has(element)
		) {
			return;
		}
		await api.initGalleries({ element, signal });
		if (
			pendingLoads.get(element) !== attempt ||
			destroyedGalleries.has(element)
		) {
			return;
		}
		if (
			!element.classList.contains('modula-gallery-initialized') &&
			!element._modulaRoot
		) {
			throw new Error('Gallery mount did not commit');
		}
		clearStallWatchdog(element);
	} catch (err) {
		if (
			pendingLoads.get(element) !== attempt ||
			destroyedGalleries.has(element)
		) {
			return;
		}
		console.error('Modula: gallery bootstrap failed', err);
		clearStallWatchdog(element);
		showBootstrapError(element, loadingFailedMessage(), {
			withRetry: true,
		});
	} finally {
		if (pendingLoads.get(element) === attempt) {
			pendingLoads.delete(element);
		}
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
				if (
					!entry.isIntersecting ||
					!isElementInViewport(entry.target)
				) {
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
	if (
		element.dataset.modulaLazyLoad === '0' ||
		shouldEagerMountForDeeplink(element)
	) {
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
	cancelPendingLoad(el);
	el.classList.remove('modula-gallery--bootstrap-pending');
	el.removeAttribute('data-modula-visible');
	el.querySelector('.modula-gallery__bootstrap-loading')?.remove();
	clearStallWatchdog(el);
	const observer = galleryObservers.get(el);
	if (observer) {
		observer.disconnect();
		galleryObservers.delete(el);
	}
}

document.addEventListener('modula:gallery:destroyed', onGalleryDestroyed);

// Keep the public lifecycle available even when every gallery is still dormant.
function initGalleries({ forceAll = false } = {}) {
	const selector = forceAll
		? MODERN_VISITOR_ROOT_PENDING_SELECTOR
		: `${MODERN_VISITOR_ROOT_PENDING_SELECTOR}[data-modula-visible="1"]`;
	return Promise.all(
		Array.from(document.querySelectorAll(selector), (element) =>
			mountWhenVisible(element)
		)
	);
}

function destroyGallery(identifier) {
	const element =
		typeof identifier === 'string'
			? document.getElementById(identifier) ||
				Array.from(pendingLoads.keys()).find(
					(pending) => pending.id === identifier
				)
			: identifier;
	if (bootstrapApi) {
		bootstrapApi.destroyGallery(element || identifier);
		return;
	}
	if (element instanceof HTMLElement) {
		document.dispatchEvent(
			new CustomEvent('modula:gallery:destroyed', {
				detail: { element },
				bubbles: true,
			})
		);
	}
}

const api = {
	initGalleries,
	initAllGalleries: () => initGalleries({ forceAll: true }),
	destroyGallery,
	getGalleryInstance: (identifier) =>
		bootstrapApi?.getGalleryInstance(identifier) ?? null,
};
window.ModulaGallery = api;
window.ModulaGalleryInit = api.initAllGalleries;
window.ModulaGalleryDestroy = api.destroyGallery;
window.ModulaGalleryGetInstance = api.getGalleryInstance;

function scanGalleries() {
	document
		.querySelectorAll(MODERN_VISITOR_ROOT_PENDING_SELECTOR)
		.forEach(scheduleGallery);
}

function onReady() {
	scanGalleries();
}

window.addEventListener('hashchange', () => {
	document
		.querySelectorAll(MODERN_VISITOR_ROOT_PENDING_SELECTOR)
		.forEach((element) => {
			if (shouldEagerMountForDeeplink(element)) {
				void mountWhenVisible(element);
			}
		});
});

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', onReady);
} else {
	onReady();
}
