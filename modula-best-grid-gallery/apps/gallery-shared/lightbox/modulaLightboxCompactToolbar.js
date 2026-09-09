/**
 * Compact lightbox toolbar for mobile / tablet — overflow menu for secondary actions.
 *
 * @package
 */

export const MODULA_TOOLBAR_MORE_KEY = 'modulaMore';

const MORE_BUTTON_TPL =
	'<button type="button" class="f-button modula-lightbox-toolbar-more" data-modula-toolbar-more title="{{MORE}}">' +
	'<svg tabindex="-1" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">' +
	'<circle cx="5" cy="12" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="19" cy="12" r="1.75"/>' +
	'</svg></button>';

/** Built-in Fancybox carousel toolbar templates (subset used by Modula). */
const BUILTIN_TOOLBAR_ITEM_TPLS = {
	toggleFull: {
		tpl: '<button data-panzoom-action="toggleFull" class="f-button" title="{{TOGGLE_FULL}}"><svg><g><line x1="11" y1="8" x2="11" y2="14"></line></g><circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.35-4.35M8 11h6"/></svg></button>',
	},
	download: {
		tpl: '<button data-carousel-download class="f-button" title="{{DOWNLOAD}}"><svg><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12"/></svg></button>',
	},
	thumbs: {
		tpl: '<button data-thumbs-action="toggle" class="f-button" title="{{TOGGLE_THUMBS}}"><svg><rect width="18" height="14" x="3" y="3" rx="2"/><path d="M4 21h1M9 21h1M14 21h1M19 21h1"/></svg></button>',
	},
	fullscreen: {
		tpl: '<button data-fullscreen-action="toggle" class="f-button" title="{{TOGGLE_FULLSCREEN}}"><svg><g><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></g><g><path d="M15 19v-2a2 2 0 0 1 2-2h2M15 5v2a2 2 0 0 0 2 2h2M5 15h2a2 2 0 0 1 2 2v2M5 9h2a2 2 0 0 0 2-2V5"/></g></svg></button>',
	},
	autoplay: {
		tpl: '<button data-autoplay-action="toggle" class="f-button" title="{{TOGGLE_AUTOPLAY}}"><svg><g><path d="M5 3.5 19 12 5 20.5Z"/></g><g><path d="M8 4v15M17 4v15"/></g></svg></button>',
	},
	close: {
		tpl: '<button class="f-button" title="{{CLOSE}}" data-fancybox-close><svg tabindex="-1" width="24" height="24" viewBox="0 0 24 24"><path d="M19.286 4.714 4.714 19.286M4.714 4.714l14.572 14.572" /></svg></button>',
	},
};

const COMPACT_TOOLBAR_PRIMARY_RIGHT = new Set(['close']);

/** Fallback labels when the control has no title attribute. */
const OVERFLOW_ITEM_FALLBACK_LABELS = {
	toggleComments: 'Comments',
	downloadAll: 'Download all',
	share: 'Share',
	toggleFull: 'Zoom',
	download: 'Download',
	thumbs: 'Thumbnails',
	fullscreen: 'Fullscreen',
	autoplay: 'Slideshow',
	close: 'Close',
};

/**
 * @param {string} key
 * @param {HTMLElement} control
 * @returns {string}
 */
function resolveOverflowItemLabel(key, control) {
	const fromTitle = control.getAttribute('title')?.trim();
	if (fromTitle) {
		return fromTitle;
	}
	return OVERFLOW_ITEM_FALLBACK_LABELS[key] || key;
}

/**
 * @param {HTMLElement} control
 * @param {string} label
 */
function appendOverflowItemLabel(control, label) {
	control.classList.add('modula-lightbox-toolbar-overflow__row');
	const labelEl = document.createElement('span');
	labelEl.className = 'modula-lightbox-toolbar-overflow__label';
	labelEl.textContent = label;
	control.append(labelEl);
}

/**
 * @param {object} [context]
 * @returns {boolean}
 */
export function resolveModulaLightboxCompactToolbar(context = {}) {
	if (typeof context.compactToolbar === 'boolean') {
		return context.compactToolbar;
	}

	const previewViewport = context.previewViewport;
	if (previewViewport === 'mobile' || previewViewport === 'tablet') {
		return true;
	}

	if (
		context.isMobile === true ||
		/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
			typeof navigator !== 'undefined' ? navigator.userAgent : ''
		)
	) {
		return true;
	}

	if (typeof window !== 'undefined') {
		return window.matchMedia('(max-width: 768px)').matches;
	}

	return false;
}

/**
 * @param {object} carousel
 * @returns {{ carousel: object, overflowKeys: string[] }}
 */
export function applyCompactCarouselToolbar(carousel) {
	const toolbar = carousel?.Toolbar;
	if (!toolbar?.enabled || !toolbar.display) {
		return { carousel, overflowKeys: [] };
	}

	const right = Array.isArray(toolbar.display.right)
		? [...toolbar.display.right]
		: [];
	const overflowKeys = right.filter(
		(key) => !COMPACT_TOOLBAR_PRIMARY_RIGHT.has(key)
	);

	if (overflowKeys.length === 0) {
		return { carousel, overflowKeys: [] };
	}

	const nextRight = [];
	if (overflowKeys.length > 0) {
		nextRight.push(MODULA_TOOLBAR_MORE_KEY);
	}
	/* Close stays last even if a later caller appends overflow keys. */
	if (right.includes('close')) {
		nextRight.push('close');
	}

	carousel.Toolbar = {
		...toolbar,
		display: {
			...toolbar.display,
			right: nextRight,
		},
		items: {
			...(toolbar.items || {}),
			[MODULA_TOOLBAR_MORE_KEY]: {
				tpl: MORE_BUTTON_TPL,
			},
		},
	};

	return { carousel, overflowKeys };
}

/**
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance} fancybox
 * @param {string} key
 * @param {object} itemConfig
 */
function wireCompactToolbarOverflowItem(fancybox, key, itemConfig) {
	if (key === 'toggleComments') {
		return () => {
			const layoutContainer = document.querySelector(
				'.fancybox__container.has-modula-comments'
			);
			if (layoutContainer instanceof HTMLElement) {
				layoutContainer.classList.toggle('sidebar-hidden');
			}
		};
	}

	if (key === 'share' && typeof itemConfig?.click === 'function') {
		return (event) => {
			const carousel = fancybox.getCarousel?.();
			if (carousel) {
				itemConfig.click(carousel, event);
			}
		};
	}

	return null;
}

/**
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance} fancybox
 * @param {HTMLElement} anchor
 * @param {{ overflowKeys?: string[], items?: Record<string, { tpl?: string, click?: Function }> }} config
 */
function openCompactToolbarOverflowPanel(fancybox, anchor, config) {
	const carousel = fancybox.getCarousel?.();
	const container = fancybox.getContainer?.();
	if (!carousel || !(container instanceof HTMLElement)) {
		return;
	}

	closeCompactToolbarOverflowPanel(container);

	const panel = document.createElement('div');
	panel.className = 'modula-lightbox-toolbar-overflow';
	panel.setAttribute('role', 'menu');
	panel.dataset.modulaToolbarOverflow = '1';

	const localize = (tpl) => {
		if (typeof carousel.localize === 'function') {
			return carousel.localize(tpl);
		}
		return tpl;
	};

	for (const key of config.overflowKeys || []) {
		const customItem = config.items?.[key];
		const builtinItem = BUILTIN_TOOLBAR_ITEM_TPLS[key];
		const tpl = customItem?.tpl || builtinItem?.tpl;
		if (!tpl) {
			continue;
		}

		let html = localize(tpl);
		html = html
			.split('<svg>')
			.join(
				'<svg tabindex="-1" width="24" height="24" viewBox="0 0 24 24">'
			);

		const wrapper = document.createElement('div');
		wrapper.className = 'modula-lightbox-toolbar-overflow__item';
		wrapper.setAttribute('role', 'none');
		wrapper.innerHTML = html;

		const control = wrapper.querySelector('.f-button, a.f-button');
		if (!(control instanceof HTMLElement)) {
			continue;
		}

		control.setAttribute('role', 'menuitem');
		control.dataset.modulaToolbarOverflowItem = key;
		appendOverflowItemLabel(
			control,
			resolveOverflowItemLabel(key, control)
		);

		if (key === 'toggleComments') {
			control.id = 'modula-comments-toggle';
		}

		const customClick = wireCompactToolbarOverflowItem(
			fancybox,
			key,
			customItem
		);
		if (customClick) {
			control.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				customClick(event);
				closeCompactToolbarOverflowPanel(container);
			});
		} else if (
			key === 'downloadAll' &&
			control instanceof HTMLAnchorElement
		) {
			control.addEventListener('click', () => {
				closeCompactToolbarOverflowPanel(container);
			});
		} else {
			control.addEventListener('click', () => {
				closeCompactToolbarOverflowPanel(container);
			});
		}

		panel.append(wrapper);
	}

	const column = anchor.closest('.f-carousel__toolbar__column.is-right');
	const host = column instanceof HTMLElement ? column : anchor.parentElement;
	if (!(host instanceof HTMLElement)) {
		return;
	}

	host.classList.add('modula-lightbox-toolbar-overflow-host');
	host.append(panel);
	anchor.setAttribute('aria-expanded', 'true');
	container.classList.add('modula-lightbox-toolbar-overflow-open');
}

/**
 * @param {HTMLElement} container
 */
function closeCompactToolbarOverflowPanel(container) {
	container
		.querySelectorAll('.modula-lightbox-toolbar-overflow')
		.forEach((node) => node.remove());
	container
		.querySelectorAll('[data-modula-toolbar-more][aria-expanded="true"]')
		.forEach((node) => {
			node.setAttribute('aria-expanded', 'false');
		});
	container.classList.remove('modula-lightbox-toolbar-overflow-open');
}

let compactToolbarEscapeListenerBound = false;

/**
 * @param {KeyboardEvent} event
 */
function onCompactToolbarDocumentKeydown(event) {
	if (event.key !== 'Escape') {
		return;
	}
	document
		.querySelectorAll(
			'.fancybox__container.modula-lightbox-toolbar-overflow-open'
		)
		.forEach((node) => {
			if (node instanceof HTMLElement) {
				closeCompactToolbarOverflowPanel(node);
			}
		});
}

/**
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance} fancybox
 */
export function attachModulaLightboxCompactToolbar(fancybox) {
	const config = fancybox.getOptions?.()?.modulaCompactToolbar;
	if (!config?.overflowKeys?.length) {
		return;
	}

	const container = fancybox.getContainer?.();
	const moreButton = container?.querySelector('[data-modula-toolbar-more]');
	if (
		!(container instanceof HTMLElement) ||
		!(moreButton instanceof HTMLElement)
	) {
		return;
	}

	if (moreButton.dataset.modulaOverflowBound === '1') {
		return;
	}
	moreButton.dataset.modulaOverflowBound = '1';
	moreButton.setAttribute('aria-haspopup', 'menu');
	moreButton.setAttribute('aria-expanded', 'false');

	moreButton.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();

		const isOpen = container.classList.contains(
			'modula-lightbox-toolbar-overflow-open'
		);
		if (isOpen) {
			closeCompactToolbarOverflowPanel(container);
			return;
		}

		openCompactToolbarOverflowPanel(fancybox, moreButton, config);
	});

	if (!compactToolbarEscapeListenerBound) {
		compactToolbarEscapeListenerBound = true;
		document.addEventListener('keydown', onCompactToolbarDocumentKeydown);
	}

	if (container.dataset.modulaOverflowDismissBound !== '1') {
		container.dataset.modulaOverflowDismissBound = '1';

		container.addEventListener('click', (event) => {
			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}
			if (
				target.closest('[data-modula-toolbar-more]') ||
				target.closest('.modula-lightbox-toolbar-overflow')
			) {
				return;
			}
			closeCompactToolbarOverflowPanel(container);
		});
	}
}

/**
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance} fancybox
 */
export function detachModulaLightboxCompactToolbar(fancybox) {
	const container = fancybox.getContainer?.();
	if (container instanceof HTMLElement) {
		closeCompactToolbarOverflowPanel(container);
	}
}
