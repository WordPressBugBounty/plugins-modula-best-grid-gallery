/**
 * Modula Gallery - React bootstrap (loaded by loader.js when galleries are visible).
 * Bootstrap: DOM JSON (default) or REST (data-modula-bootstrap="rest").
 *
 * @package
 */
import {
	Gallery,
	GalleryErrorBoundary,
	buildPreloadedState,
	closeModulaLightbox,
	createGalleryStore,
	fetchGalleryBootstrap,
	getBootstrapMode,
	isModulaLightboxActiveForGalleryElement,
	parseGalleryPostId,
	resolveGalleryDataFromDom,
} from 'gallery-shared/runtime';
import './index.scss';
import { __ } from '@wordpress/i18n';
import { createRoot } from '@wordpress/element';
import { Provider } from 'react-redux';
import {
	clearGalleryShellInlineHide,
	revealGalleryChrome,
	waitForGalleryChromeStyles,
} from './galleryShellVisibility';

const galleryRoots = new Map();

/** @type {WeakSet<HTMLElement>} */
const mountingElements = new WeakSet();

/** @type {Promise<void>} */
let initGalleriesChain = Promise.resolve();

const PENDING_SELECTOR =
	'.modula.modula-gallery:not(.modula-gallery-initialized)';

/**
 * @param {boolean} [forceAll] When true, mount every pending gallery (manual init).
 * @returns {string}
 */
function pendingGallerySelector(forceAll = false) {
	if (forceAll) {
		return PENDING_SELECTOR;
	}
	return `${PENDING_SELECTOR}[data-modula-visible="1"]`;
}

/**
 * @param {HTMLElement} element
 */
function clearPendingChrome(element) {
	element.classList.remove('modula-gallery--bootstrap-pending');
	const loading = element.querySelector('.modula-gallery__bootstrap-loading');
	if (loading) {
		loading.remove();
	}
}

function showGalleryBootstrapError(element, message) {
	element.classList.add('modula-gallery--bootstrap-pending');
	let loading = element.querySelector('.modula-gallery__bootstrap-loading');
	if (!loading) {
		loading = document.createElement('div');
		loading.className = 'modula-gallery__bootstrap-loading';
		element.appendChild(loading);
	}
	loading.setAttribute('role', 'alert');
	loading.textContent = message;
}

/**
 * @param {number} postId
 * @param {string} align
 * @return {Promise<Object>}
 */
async function fetchGalleryBootstrapWithRetry(postId, align) {
	const opts = { align: align || undefined };
	try {
		return await fetchGalleryBootstrap(postId, opts);
	} catch (_firstErr) {
		await new Promise((resolve) => {
			window.setTimeout(resolve, 500);
		});
		return fetchGalleryBootstrap(postId, opts);
	}
}

function syncBodyGalleryClass() {
	if (typeof document === 'undefined') {
		return;
	}
	if (galleryRoots.size > 0) {
		document.body.classList.add('modula-best-grid-gallery');
		return;
	}
	document.body.classList.remove('modula-best-grid-gallery');
}

function revealGalleryInstance(element, store, galleryData) {
	clearGalleryShellInlineHide(element);
	element.classList.add('modula-gallery-initialized');
	clearPendingChrome(element);
	mountingElements.delete(element);
	syncBodyGalleryClass();

	waitForGalleryChromeStyles().then(() => {
		revealGalleryChrome(element);
		requestAnimationFrame(() => {
			document.dispatchEvent(
				new CustomEvent('modula:gallery:mounted', {
					detail: {
						element,
						store,
						galleryData,
					},
					bubbles: true,
				})
			);
		});
	});
}

function remountGalleryInstance(element) {
	const instanceKey = element.dataset?.modulaInstanceId;
	const entry = instanceKey ? galleryRoots.get(instanceKey) : null;
	if (entry?.root) {
		entry.root.unmount();
		galleryRoots.delete(instanceKey);
	}
	mountingElements.delete(element);
	element.classList.remove('modula-gallery-initialized');
	element.classList.remove('modula-gallery--bootstrap-pending');
	element.removeAttribute('data-modula-instance-id');
	delete element._modulaRoot;
	delete element._modulaStore;
	syncBodyGalleryClass();
	element.dataset.modulaVisible = '1';
	void initGalleries({ forceAll: false });
}

/**
 * @param {HTMLElement} element
 * @return {boolean}
 */
function isGalleryMountCommitted(element) {
	return (
		element.classList.contains('modula-gallery-initialized') ||
		Boolean(element._modulaRoot) ||
		mountingElements.has(element)
	);
}

function mountGalleryInstance(element, galleryData) {
	if (isGalleryMountCommitted(element)) {
		return;
	}
	mountingElements.add(element);

	try {
		const preloadedState = buildPreloadedState(galleryData, element);
		const store = createGalleryStore(preloadedState);
		const root = createRoot(element);
		root.render(
			<Provider store={store}>
				<GalleryErrorBoundary
					galleryElement={element}
					onRetry={remountGalleryInstance}
				>
					<Gallery />
				</GalleryErrorBoundary>
			</Provider>
		);

		const instanceKey =
			element.id ||
			`modula-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		galleryRoots.set(instanceKey, { root, store });
		element.dataset.modulaInstanceId = instanceKey;
		element._modulaRoot = root;
		element._modulaStore = store;

		// Reveal after React commits so we do not flash an empty initialized shell.
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				revealGalleryInstance(element, store, galleryData);
			});
		});
	} catch (err) {
		mountingElements.delete(element);
		delete element._modulaRoot;
		delete element._modulaStore;
		throw err;
	}
}

/**
 * @param {{ forceAll?: boolean }} [options]
 */
async function initGalleriesInner(options = {}) {
	const forceAll = options.forceAll === true;
	const elements = document.querySelectorAll(
		pendingGallerySelector(forceAll)
	);

	for (const element of elements) {
		if (isGalleryMountCommitted(element)) {
			continue;
		}

		const mode = getBootstrapMode(element);
		let galleryData;

		if (mode === 'rest') {
			const postId = parseGalleryPostId(element);
			if (!postId) {
				console.warn(
					'Modula: data-modula-bootstrap="rest" needs id="modula-{id}" or numeric data-gallery-id.'
				);
				continue;
			}

			clearGalleryShellInlineHide(element);
			element.classList.add('modula-gallery--bootstrap-pending');
			const loading = document.createElement('div');
			loading.className = 'modula-gallery__bootstrap-loading';
			loading.setAttribute('role', 'status');
			loading.textContent = __(
				'Loading gallery…',
				'modula-best-grid-gallery'
			);
			element.appendChild(loading);

			try {
				const align =
					element.getAttribute('data-modula-align') ||
					(typeof window !== 'undefined'
						? window.modulaGallery?.align
						: '') ||
					'';
				galleryData = await fetchGalleryBootstrapWithRetry(
					postId,
					align
				);
			} catch (err) {
				console.error('Modula: bootstrap fetch failed', err);
				mountingElements.delete(element);
				loading.textContent = __(
					'Could not load gallery.',
					'modula-best-grid-gallery'
				);
				element.classList.remove('modula-gallery--bootstrap-pending');
				continue;
			}

			clearPendingChrome(element);
		} else {
			const resolved = resolveGalleryDataFromDom(element);
			if (resolved.status === 'parse_error') {
				showGalleryBootstrapError(
					element,
					__(
						'Could not load gallery data.',
						'modula-best-grid-gallery'
					)
				);
				continue;
			}
			if (resolved.status === 'missing') {
				showGalleryBootstrapError(
					element,
					__(
						'Could not load gallery data.',
						'modula-best-grid-gallery'
					)
				);
				continue;
			}
			galleryData = resolved.data;
		}

		mountGalleryInstance(element, galleryData);
	}
}

/**
 * Serialize gallery mounts so concurrent visibility callbacks cannot call
 * `createRoot()` twice on the same container before init completes.
 *
 * @param {{ forceAll?: boolean }} [options]
 * @returns {Promise<void>}
 */
function initGalleries(options = {}) {
	initGalleriesChain = initGalleriesChain
		.then(() => initGalleriesInner(options))
		.catch((err) => {
			console.error('Modula: gallery init failed', err);
		});
	return initGalleriesChain;
}

function destroyGallery(identifier) {
	let galleryId = null;
	let targetEl = null;
	if (typeof identifier === 'string') {
		galleryId = identifier;
	} else if (identifier instanceof HTMLElement) {
		targetEl = identifier;
		galleryId = identifier.dataset?.modulaInstanceId || null;
	}
	if (!galleryId) {
		return;
	}

	if (targetEl && isModulaLightboxActiveForGalleryElement(targetEl)) {
		closeModulaLightbox();
	}

	const entry = galleryRoots.get(galleryId);
	if (entry?.root) {
		entry.root.unmount();
		galleryRoots.delete(galleryId);
	}
	syncBodyGalleryClass();
	if (targetEl) {
		mountingElements.delete(targetEl);
		document.dispatchEvent(
			new CustomEvent('modula:gallery:destroyed', {
				detail: { element: targetEl },
				bubbles: true,
			})
		);
		targetEl.classList.remove('modula-gallery-initialized');
		targetEl.classList.remove('modula-gallery--bootstrap-pending');
		targetEl.removeAttribute('data-modula-instance-id');
		targetEl.removeAttribute('data-modula-visible');
		delete targetEl._modulaRoot;
		delete targetEl._modulaStore;
	}
}

function getGalleryInstance(identifier) {
	const galleryId =
		typeof identifier === 'string'
			? identifier
			: identifier?.dataset?.modulaInstanceId;
	const entry = galleryId ? galleryRoots.get(galleryId) : null;
	return entry?.store ?? null;
}

/**
 * Manual init (e.g. dynamic shortcode injection) — mounts all pending galleries.
 */
function initAllGalleries() {
	return initGalleries({ forceAll: true });
}

const api = {
	initGalleries: () => initGalleries({ forceAll: false }),
	initAllGalleries,
	destroyGallery,
	getGalleryInstance,
};

export { initGalleries, initAllGalleries, destroyGallery, getGalleryInstance };
export default api;
