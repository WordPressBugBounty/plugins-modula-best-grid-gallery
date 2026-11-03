/**
 * Pointer, touch and keyboard activation of a host's lightbox links, with the
 * "Mobile requires double-tap" gate (`config.doubleClick`).
 *
 * The gallery's tiles bind it through `bindModulaGalleryLightbox`; a host
 * whose links open something else than the clicked tile's gallery (the Pro
 * album's members) binds it with its own link resolver and open.
 *
 * @package
 */
import { galleryUsesFancyboxLightbox } from '../utils/resolveGalleryItemLink';

/**
 * @param {Object} config
 * @return {boolean} Whether a pointer must click or tap twice to open.
 */
function isDoubleClickToOpenEnabled(config) {
	const raw = config?.doubleClick ?? config?.mobileDoubleClick;
	return raw === true || raw === 1 || raw === '1';
}

/**
 * Touch / coarse-pointer events need a wider double-tap window than OS mouse double-clicks.
 *
 * @param {Event} event
 * @return {boolean} Whether the event comes from a touch or a pen.
 */
function isTouchLikeActivateEvent(event) {
	if (!event || typeof event !== 'object') {
		return false;
	}
	if (event.type === 'touchend' || event.type === 'touchstart') {
		return true;
	}
	if (event.pointerType === 'touch' || event.pointerType === 'pen') {
		return true;
	}
	if (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) {
		return true;
	}
	return false;
}

/**
 * @typedef {Object} ModulaLightboxActivation
 * @property {() => Object}                                                         config      The host's flat lightbox config, read on every event (`lightbox`, `doubleClick`).
 * @property {(event: Event) => HTMLElement|null}                                   resolveLink The lightbox link an event activates, or null to leave the event to the browser.
 * @property {(link: HTMLElement, options: { openedViaKeyboard: boolean }) => void} activate    Opens the lightbox for an activated link.
 */

/**
 * @param {HTMLElement}              hostEl
 * @param {ModulaLightboxActivation} handlers
 * @return {() => void} Removes the listeners and forgets a pending first tap.
 */
export function bindModulaLightboxActivation(
	hostEl,
	{ config, resolveLink, activate }
) {
	/** @type {{ link: HTMLElement, at: number }|null} */
	let pendingDoubleOpen = null;
	/** Ignore the compatibility mouse click that follows a handled touchend. */
	let suppressClickUntil = 0;
	const DOUBLE_OPEN_MS_MOUSE = 350;
	const DOUBLE_OPEN_MS_TOUCH = 500;

	function clearPendingDoubleOpen() {
		pendingDoubleOpen = null;
	}

	/**
	 * @param {HTMLElement}         link
	 * @param {{ touch?: boolean }} [options]
	 * @return {boolean} True when this activation should open the lightbox.
	 */
	function consumeDoubleClickGate(link, options = {}) {
		if (!isDoubleClickToOpenEnabled(config())) {
			clearPendingDoubleOpen();
			return true;
		}
		const touch = Boolean(options.touch);
		const windowMs = touch ? DOUBLE_OPEN_MS_TOUCH : DOUBLE_OPEN_MS_MOUSE;
		const now =
			typeof performance !== 'undefined' ? performance.now() : Date.now();
		if (
			pendingDoubleOpen &&
			pendingDoubleOpen.link === link &&
			now - pendingDoubleOpen.at <= windowMs
		) {
			clearPendingDoubleOpen();
			return true;
		}
		pendingDoubleOpen = { link, at: now };
		window.setTimeout(() => {
			if (pendingDoubleOpen?.link === link) {
				clearPendingDoubleOpen();
			}
		}, windowMs + 50);
		return false;
	}

	/**
	 * @param {Event}       event
	 * @param {HTMLElement} link
	 * @return {boolean} True when this click or tap should open the lightbox.
	 */
	function shouldOpenFromPointerEvent(event, link) {
		if (!isDoubleClickToOpenEnabled(config())) {
			return true;
		}
		const touch = isTouchLikeActivateEvent(event);
		/*
		 * Mouse: prefer native click.detail (2 on the second click of a double-click).
		 * Touch: detail is always 1 — use a timed double-tap gate with a wider window.
		 */
		if (!touch && typeof event.detail === 'number' && event.detail > 0) {
			clearPendingDoubleOpen();
			return event.detail >= 2;
		}
		return consumeDoubleClickGate(link, { touch });
	}

	function onMouseDown(event) {
		if (event.button !== 0) {
			return;
		}
		/*
		 * preventDefault on touch-derived mousedown often swallows the following
		 * click on mobile — keep it mouse-only (focus-within hover cleanup).
		 */
		if (isTouchLikeActivateEvent(event)) {
			return;
		}
		const link = resolveLink(event);
		if (!link) {
			return;
		}
		if (!galleryUsesFancyboxLightbox(config()?.lightbox)) {
			return;
		}
		event.preventDefault();
	}

	/**
	 * @param {Event}                                                event
	 * @param {{ fromTouchEnd?: boolean, skipDoubleGate?: boolean }} [options]
	 */
	function onActivate(event, options = {}) {
		const target = event.target;
		if (
			target instanceof window.Element &&
			target.closest('.modula-selection-handle')
		) {
			return;
		}
		const link = resolveLink(event);
		if (!link) {
			return;
		}
		event.preventDefault();

		const openedViaKeyboard = event.type === 'keydown';
		// Keyboard must open on first Enter/Space (a11y). Double-click gate is pointer-only.
		if (
			!openedViaKeyboard &&
			!options.skipDoubleGate &&
			!shouldOpenFromPointerEvent(event, link)
		) {
			return;
		}

		if (options.fromTouchEnd) {
			suppressClickUntil =
				(typeof performance !== 'undefined'
					? performance.now()
					: Date.now()) + 700;
		}
		activate(link, { openedViaKeyboard });
	}

	function onClick(event) {
		const now =
			typeof performance !== 'undefined' ? performance.now() : Date.now();
		if (now < suppressClickUntil) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		/*
		 * When double-tap mode is on, touchend owns the gesture so the
		 * compatibility click does not reset / fight the pending tap state.
		 */
		if (
			isTouchLikeActivateEvent(event) &&
			isDoubleClickToOpenEnabled(config())
		) {
			event.preventDefault();
			return;
		}
		onActivate(event);
	}

	function onTouchEnd(event) {
		if (!isDoubleClickToOpenEnabled(config())) {
			return;
		}
		// Multi-touch / remaining fingers — ignore.
		if (event.touches && event.touches.length > 0) {
			return;
		}
		const target = event.target;
		if (
			target instanceof window.Element &&
			target.closest('.modula-selection-handle')
		) {
			return;
		}
		const link = resolveLink(event);
		if (!link) {
			return;
		}
		if (!galleryUsesFancyboxLightbox(config()?.lightbox)) {
			return;
		}

		/*
		 * Claim the gesture so the browser does not zoom / synthesize a late
		 * click that would look like a new first tap.
		 */
		if (event.cancelable) {
			event.preventDefault();
		}

		if (!consumeDoubleClickGate(link, { touch: true })) {
			suppressClickUntil =
				(typeof performance !== 'undefined'
					? performance.now()
					: Date.now()) + 700;
			return;
		}

		onActivate(event, { fromTouchEnd: true, skipDoubleGate: true });
	}

	function onKeyDown(event) {
		if (event.key !== 'Enter' && event.key !== ' ') {
			return;
		}
		onActivate(event);
	}

	hostEl.addEventListener('mousedown', onMouseDown);
	hostEl.addEventListener('click', onClick);
	hostEl.addEventListener('touchend', onTouchEnd, { passive: false });
	hostEl.addEventListener('keydown', onKeyDown);
	return () => {
		clearPendingDoubleOpen();
		hostEl.removeEventListener('mousedown', onMouseDown);
		hostEl.removeEventListener('click', onClick);
		hostEl.removeEventListener('touchend', onTouchEnd);
		hostEl.removeEventListener('keydown', onKeyDown);
	};
}
