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
	cancelModulaGalleryLightboxOpen,
	createGalleryStore,
	fetchGalleryBootstrap,
	getBootstrapMode,
	getLayoutLoader,
	isModulaLightboxActiveForGalleryElement,
	MODERN_VISITOR_ROOT_PENDING_SELECTOR,
	parseGalleryPostId,
	resolveGalleryDataFromDom,
	resolveGalleryLayoutType,
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
import { waitForGalleryLoad } from './waitForGalleryLoad';

const galleryRoots = new Map();

/** @type {WeakSet<HTMLElement>} */
const mountingElements = new WeakSet();

/** @type {WeakSet<HTMLElement>} */
const destroyedElements = new WeakSet();

/** @type {WeakMap<HTMLElement, Promise<void>>} */
const loadingElements = new WeakMap();

/**
 * @param {boolean} [forceAll] When true, mount every pending gallery (manual init).
 * @returns {string}
 */
function pendingGallerySelector(forceAll = false) {
	if (forceAll) {
		return MODERN_VISITOR_ROOT_PENDING_SELECTOR;
	}
	return `${MODERN_VISITOR_ROOT_PENDING_SELECTOR}[data-modula-visible="1"]`;
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
async function fetchGalleryBootstrapWithRetry(postId, align, signal) {
	const opts = { align: align || undefined, signal };
	try {
		return await fetchGalleryBootstrap(postId, opts);
	} catch (_firstErr) {
		if (signal?.aborted) {
			throw _firstErr;
		}
		await new Promise((resolve, reject) => {
			const onAbort = () => {
				window.clearTimeout(timer);
				reject(signal.reason);
			};
			const timer = window.setTimeout(() => {
				signal?.removeEventListener('abort', onAbort);
				resolve();
			}, 500);
			signal?.addEventListener('abort', onAbort, { once: true });
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
	if (element._modulaStore !== store || !element.isConnected) {
		return;
	}
	clearGalleryShellInlineHide(element);
	element.classList.add('modula-gallery-initialized');
	clearPendingChrome(element);
	mountingElements.delete(element);
	syncBodyGalleryClass();

	waitForGalleryChromeStyles().then(() => {
		if (element._modulaStore !== store || !element.isConnected) {
			return;
		}
		revealGalleryChrome(element);
		requestAnimationFrame(() => {
			if (element._modulaStore !== store || !element.isConnected) {
				return;
			}
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

async function mountGalleryInstance(element, galleryData, signal) {
	const preloadedState = buildPreloadedState(galleryData, element);
	await waitForGalleryLoad(
		getLayoutLoader(
			resolveGalleryLayoutType(preloadedState.gallery.config)
		)(),
		signal
	);
	if (
		signal?.aborted ||
		destroyedElements.has(element) ||
		!element.isConnected ||
		isGalleryMountCommitted(element)
	) {
		return;
	}
	mountingElements.add(element);

	try {
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
		galleryRoots.set(instanceKey, { root, store, element });
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
 * @param {HTMLElement} element
 * @param {{ signal?: AbortSignal }} [options]
 */
async function initGallery(element, { signal } = {}) {
	if (
		signal?.aborted ||
		destroyedElements.has(element) ||
		!element.isConnected ||
		isGalleryMountCommitted(element)
	) {
		return;
	}

	const mode = getBootstrapMode(element);
	let galleryData;

	if (mode === 'rest') {
		const postId = parseGalleryPostId(element);
		if (!postId) {
			console.warn(
				'Modula: data-modula-bootstrap="rest" needs id="modula-{id}" or numeric data-gallery-id.'
			);
			return;
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
				align,
				signal
			);
		} catch (err) {
			if (
				signal?.aborted ||
				destroyedElements.has(element) ||
				!element.isConnected
			) {
				return;
			}
			console.error('Modula: bootstrap fetch failed', err);
			mountingElements.delete(element);
			loading.textContent = __(
				'Could not load gallery.',
				'modula-best-grid-gallery'
			);
			element.classList.remove('modula-gallery--bootstrap-pending');
			return;
		}

		if (
			signal?.aborted ||
			destroyedElements.has(element) ||
			!element.isConnected
		) {
			return;
		}
	} else {
		const resolved = resolveGalleryDataFromDom(element);
		if (resolved.status === 'parse_error') {
			showGalleryBootstrapError(
				element,
				__('Could not load gallery data.', 'modula-best-grid-gallery')
			);
			return;
		}
		if (resolved.status === 'missing') {
			showGalleryBootstrapError(
				element,
				__('Could not load gallery data.', 'modula-best-grid-gallery')
			);
			return;
		}
		galleryData = resolved.data;
	}

	await mountGalleryInstance(element, galleryData, signal);
}

/**
 * Deduplicate each gallery's load without blocking other galleries behind it.
 *
 * @param {{ forceAll?: boolean, element?: HTMLElement, signal?: AbortSignal }} [options]
 * @returns {Promise<void[]>}
 */
function initGalleries(options = {}) {
	const elements = options.element
		? [options.element]
		: Array.from(
				document.querySelectorAll(
					pendingGallerySelector(options.forceAll)
				)
			);
	return Promise.all(
		elements.map((element) => {
			const existing = loadingElements.get(element);
			if (existing) {
				return existing;
			}
			const load = initGallery(element, options).finally(() => {
				if (loadingElements.get(element) === load) {
					loadingElements.delete(element);
				}
			});
			loadingElements.set(element, load);
			return load;
		})
	);
}

function destroyGallery(identifier) {
	const targetEl =
		typeof identifier === 'string'
			? galleryRoots.get(identifier)?.element ||
				document.getElementById(identifier)
			: identifier;
	if (!(targetEl instanceof HTMLElement)) {
		return;
	}
	const galleryId = targetEl.dataset?.modulaInstanceId || targetEl.id;
	destroyedElements.add(targetEl);
	cancelModulaGalleryLightboxOpen(targetEl);

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
	initGalleries,
	initAllGalleries,
	destroyGallery,
	getGalleryInstance,
};

export { initGalleries, initAllGalleries, destroyGallery, getGalleryInstance };
export default api;
