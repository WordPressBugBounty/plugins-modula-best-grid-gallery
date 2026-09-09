/**
 * Fancybox v6 right-click / drag protection (legacy Images.protected parity).
 *
 * Pro still sets Images.protected on the legacy Fancybox path via
 * modula_fancybox_options — this module is modern-stack only.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { showModulaProtectionNotice } from '../utils/modulaProtectionNotice';

/**
 * @param {unknown} fancybox
 * @returns {boolean}
 */
function isImagesProtectedEnabled(fancybox) {
	if (!fancybox || typeof fancybox !== 'object') {
		return false;
	}
	if (typeof fancybox.option === 'function') {
		return Boolean(fancybox.option('modulaImagesProtected'));
	}
	const options =
		typeof fancybox.getOptions === 'function'
			? fancybox.getOptions()
			: fancybox.options;
	return Boolean(options?.modulaImagesProtected);
}

/**
 * @param {HTMLElement} container
 */
function protectVideosInContainer(container) {
	container.querySelectorAll('video').forEach((video) => {
		if (!(video instanceof HTMLVideoElement)) {
			return;
		}
		video.setAttribute('oncontextmenu', 'return false');
		video.disablePictureInPicture = true;
		const existing = video.getAttribute('controlsList') || '';
		if (!/\bnodownload\b/.test(existing)) {
			video.setAttribute(
				'controlsList',
				existing ? `${existing} nodownload` : 'nodownload'
			);
		}
	});
}

/**
 * Overlay blocks casual "Save image as…" on the image surface (legacy Fancybox).
 *
 * @param {HTMLElement} container
 */
function ensureProtectionOverlays(container) {
	const surfaces = container.querySelectorAll(
		'.fancybox__slide .f-panzoom, .fancybox__slide .f-zoomable, .f-carousel__slide .f-panzoom, .f-carousel__slide .f-zoomable'
	);

	surfaces.forEach((surface) => {
		if (!(surface instanceof HTMLElement)) {
			return;
		}
		if (surface.querySelector(':scope > .fancybox-protected')) {
			return;
		}
		// Do not cover HTML5 video controls — videos use oncontextmenu instead.
		if (
			surface.querySelector('video') ||
			surface.tagName === 'VIDEO' ||
			surface.classList.contains('fancybox__html5video')
		) {
			return;
		}
		const hasImage =
			surface.tagName === 'IMG' ||
			surface.querySelector('img') instanceof HTMLImageElement;
		if (!hasImage) {
			return;
		}

		const overlay = document.createElement('div');
		overlay.className = 'fancybox-protected';
		overlay.setAttribute('aria-hidden', 'true');
		surface.appendChild(overlay);
	});
}

/**
 * @param {unknown} fancybox
 * @return {string}
 */
function resolveProtectionMessage(fancybox) {
	const options =
		typeof fancybox?.getOptions === 'function'
			? fancybox.getOptions()
			: fancybox?.options;
	const fromOpts =
		typeof options?.modulaProtectionMessage === 'string'
			? options.modulaProtectionMessage.trim()
			: '';
	if (fromOpts) {
		return fromOpts;
	}
	return __(
		'This content is protected.',
		'modula-best-grid-gallery'
	);
}

/**
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance} fancybox
 */
export function attachModulaLightboxImageProtection(fancybox) {
	if (!isImagesProtectedEnabled(fancybox)) {
		return;
	}

	const container = fancybox.getContainer?.();
	if (!(container instanceof HTMLElement)) {
		return;
	}

	if (!fancybox.modulaImageProtection) {
		const message = resolveProtectionMessage(fancybox);
		const onContextMenu = (event) => {
			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}
			if (
				target.closest(
					'img, video, picture, canvas, .fancybox-protected, .f-panzoom__content, .f-panzoom, .f-zoomable, .fancybox__content'
				)
			) {
				event.preventDefault();
				showModulaProtectionNotice(message);
			}
		};
		const onDragStart = (event) => {
			const target = event.target;
			if (
				target instanceof HTMLImageElement ||
				target instanceof HTMLVideoElement
			) {
				event.preventDefault();
				showModulaProtectionNotice(message);
			}
		};

		container.addEventListener('contextmenu', onContextMenu);
		container.addEventListener('dragstart', onDragStart);
		container.classList.add('modula-fancybox-images-protected');

		fancybox.modulaImageProtection = {
			container,
			onContextMenu,
			onDragStart,
		};
	}

	protectVideosInContainer(container);
	ensureProtectionOverlays(container);
}

/**
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance} fancybox
 */
export function refreshModulaLightboxImageProtection(fancybox) {
	attachModulaLightboxImageProtection(fancybox);
}

/**
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance} fancybox
 */
export function detachModulaLightboxImageProtection(fancybox) {
	const state = fancybox?.modulaImageProtection;
	if (!state?.container || !state.onContextMenu || !state.onDragStart) {
		fancybox.modulaImageProtection = null;
		return;
	}

	state.container.removeEventListener('contextmenu', state.onContextMenu);
	state.container.removeEventListener('dragstart', state.onDragStart);
	state.container.classList.remove('modula-fancybox-images-protected');
	state.container
		.querySelectorAll('.fancybox-protected')
		.forEach((node) => node.remove());
	fancybox.modulaImageProtection = null;
}
