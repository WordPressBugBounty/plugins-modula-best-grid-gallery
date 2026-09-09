/**
 * Native Modula lightbox zoom (Fancybox v6) — no jQuery / elevateZoom.
 *
 * @package
 */

/** @type {Record<number, string>} elevateZoom position parity */
const ELEVATE_POSITION_TO_CORNER = {
	11: 'upper-left',
	1: 'upper-right',
	9: 'lower-left',
	3: 'lower-right',
};

/**
 * @param {*} value
 * @returns {boolean}
 */
function truthy(value) {
	if (value === true || value === 1 || value === '1') {
		return true;
	}
	if (typeof value === 'string' && value.toLowerCase().trim() === 'true') {
		return true;
	}
	return false;
}

/**
 * @param {unknown} fancybox
 * @returns {object|null}
 */
function resolveMzoomFromFancybox(fancybox) {
	if (!fancybox || typeof fancybox !== 'object') {
		return null;
	}
	if (typeof fancybox.option === 'function') {
		const fromOption = fancybox.option('mzoom');
		if (fromOption && typeof fromOption === 'object') {
			return fromOption;
		}
	}
	const options =
		fancybox.options ||
		(typeof fancybox.getOptions === 'function'
			? fancybox.getOptions()
			: null);
	if (options?.mzoom && typeof options.mzoom === 'object') {
		return options.mzoom;
	}
	return null;
}

/**
 * @param {object} mzoom Legacy ezPlus-shaped options from settings / PHP.
 * @returns {object|null}
 */
export function normalizeMzoomToNativeOpts(mzoom) {
	if (!mzoom || typeof mzoom !== 'object') {
		return null;
	}

	const zoomType =
		typeof mzoom.zoomType === 'string' && mzoom.zoomType !== ''
			? mzoom.zoomType === 'basic'
				? 'window'
				: mzoom.zoomType
			: 'window';

	const positionNum = parseInt(mzoom.zoomWindowPosition ?? 11, 10);
	const corner = ELEVATE_POSITION_TO_CORNER[positionNum] || 'upper-left';

	const windowSize = parseInt(mzoom.zoomWindowWidth ?? 200, 10) || 200;
	const lensSize = parseInt(mzoom.lensSize ?? 200, 10) || 200;
	const lensShape =
		typeof mzoom.lensShape === 'string' && mzoom.lensShape !== ''
			? mzoom.lensShape
			: 'round';

	return {
		zoomType,
		zoomOnHover: truthy(mzoom.zoomOnHover),
		windowWidth: windowSize,
		windowHeight:
			parseInt(mzoom.zoomWindowHeight ?? windowSize, 10) || windowSize,
		lensSize,
		lensShape,
		windowCorner: corner,
		tint: mzoom.tint !== false && zoomType !== 'lens',
		tintColor:
			typeof mzoom.tintColour === 'string' && mzoom.tintColour !== ''
				? mzoom.tintColour
				: '#666666',
		tintOpacity:
			typeof mzoom.tintOpacity === 'number' ? mzoom.tintOpacity : 0,
		zoomLevel: Math.max(2, Math.min(4, windowSize / 80)),
	};
}

/**
 * @param {HTMLElement} container
 * @returns {HTMLImageElement|null}
 */
function resolveDomLightboxImage(container) {
	const img = container.querySelector(
		'.fancybox__slide.is-selected img.f-panzoom__content:not(.is-clone), .fancybox__slide.is-selected img:not(.is-clone), .f-panzoom__viewport img.f-panzoom__content:not(.is-clone), img.f-panzoom__content:not(.is-clone)'
	);
	return img instanceof HTMLImageElement ? img : null;
}

/**
 * @param {unknown} fancybox
 * @param {HTMLElement} container
 * @returns {{ image: HTMLImageElement, slide: object|null, panzoom: object|null }|null}
 */
function resolveSlideContext(fancybox, container) {
	const slide =
		typeof fancybox.getSlide === 'function' ? fancybox.getSlide() : null;

	if (slide && slide.type && slide.type !== 'image') {
		return null;
	}

	let image = null;
	if (slide?.imageEl instanceof HTMLImageElement) {
		image = slide.imageEl;
	} else if (slide?.contentEl) {
		const fromContent = slide.contentEl.querySelector(
			'img.f-panzoom__content:not(.is-clone), img.fancybox-image, img'
		);
		if (fromContent instanceof HTMLImageElement) {
			image = fromContent;
		}
	}

	if (!image) {
		image = resolveDomLightboxImage(container);
	}

	if (!image) {
		return null;
	}

	const panzoom = slide?.panzoomRef || slide?.panzoom || null;

	return { image, slide, panzoom };
}

class ModulaNativeZoomSession {
	/**
	 * @param {object} fancybox
	 * @param {object} opts
	 */
	constructor(fancybox, opts) {
		this.fancybox = fancybox;
		this.opts = opts;
		this.active = Boolean(opts.zoomOnHover);
		this.toggleBound = false;
		this.image = null;
		this.panzoom = null;
		this.pointerTarget = null;
		this.lensEl = null;
		this.windowEl = null;
		this.innerOverlayEl = null;
		this.tintEl = null;
		this.rafId = 0;
		this.onPointerEnter = this.onPointerEnter.bind(this);
		this.onPointerLeave = this.onPointerLeave.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onToggleClick = this.onToggleClick.bind(this);
		this.onImageLoad = this.onImageLoad.bind(this);
	}

	/**
	 * @returns {HTMLElement|null}
	 */
	getContainer() {
		const container =
			this.fancybox.container ||
			(typeof this.fancybox.getContainer === 'function'
				? this.fancybox.getContainer()
				: null);
		return container instanceof HTMLElement ? container : null;
	}

	attach() {
		this.bindSlide(0);
	}

	bindSlide(attempt = 0) {
		this.teardownSlide();

		const container = this.getContainer();
		if (!container) {
			if (attempt < 60) {
				requestAnimationFrame(() => this.bindSlide(attempt + 1));
			}
			return;
		}

		const context = resolveSlideContext(this.fancybox, container);
		if (!context) {
			if (attempt < 60) {
				requestAnimationFrame(() => this.bindSlide(attempt + 1));
			}
			return;
		}

		this.image = context.image;
		this.panzoom = context.panzoom;
		this.pointerTarget =
			context.image.closest('.f-panzoom__viewport') ||
			context.image.closest('.fancybox__content') ||
			context.image;

		if (!context.image.complete || context.image.naturalWidth <= 0) {
			context.image.addEventListener('load', this.onImageLoad, {
				once: true,
			});
			return;
		}

		this.setupForImage();
	}

	onImageLoad() {
		this.setupForImage();
	}

	setupForImage() {
		if (!this.image || !this.pointerTarget || !this.getContainer()) {
			return;
		}

		if (!this.opts.zoomOnHover) {
			this.bindToolbarToggle();
		} else {
			this.active = true;
		}

		this.pointerTarget.addEventListener('mouseenter', this.onPointerEnter);
		this.pointerTarget.addEventListener('mouseleave', this.onPointerLeave);
		this.pointerTarget.addEventListener('mousemove', this.onPointerMove);
		this.image.classList.add('modula-native-zoom-image');
	}

	bindToolbarToggle() {
		if (this.toggleBound) {
			return;
		}
		const container = this.getContainer();
		const button = container?.querySelector(
			'.modula-fancybox-elevatezoom-button'
		);
		if (!button) {
			return;
		}
		button.addEventListener('click', this.onToggleClick);
		this.toggleBound = true;
	}

	onToggleClick(event) {
		event.preventDefault();
		event.stopPropagation();
		this.active = !this.active;
		const container = this.getContainer();
		const button = container?.querySelector(
			'.modula-fancybox-elevatezoom-button'
		);
		button?.classList.toggle('is-active', this.active);
		if (!this.active) {
			this.hideOverlays();
			this.resetInnerZoom();
		}
	}

	onPointerEnter() {
		if (!this.opts.zoomOnHover) {
			return;
		}
		this.active = true;
	}

	onPointerLeave() {
		if (!this.opts.zoomOnHover) {
			return;
		}
		this.active = false;
		this.hideOverlays();
		this.resetInnerZoom();
	}

	onPointerMove(event) {
		if (!this.active || !this.image) {
			return;
		}
		if (this.rafId) {
			cancelAnimationFrame(this.rafId);
		}
		this.rafId = requestAnimationFrame(() => {
			this.rafId = 0;
			this.updateZoom(event);
		});
	}

	/**
	 * @param {MouseEvent} event
	 */
	updateZoom(event) {
		const image = this.image;
		if (!image) {
			return;
		}

		const rect = image.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) {
			return;
		}

		const offsetX = Math.min(
			Math.max(event.clientX - rect.left, 0),
			rect.width
		);
		const offsetY = Math.min(
			Math.max(event.clientY - rect.top, 0),
			rect.height
		);
		const ratioX = offsetX / rect.width;
		const ratioY = offsetY / rect.height;

		if (this.opts.zoomType === 'inner') {
			this.applyInnerZoom(event, ratioX, ratioY, rect);
			return;
		}

		if (this.opts.zoomType === 'lens') {
			this.applyLensZoom(offsetX, offsetY, rect, ratioX, ratioY);
			return;
		}

		this.applyWindowZoom(rect, ratioX, ratioY);
	}

	/**
	 * @param {MouseEvent} event
	 * @param {number} ratioX
	 * @param {number} ratioY
	 */
	/**
	 * @param {MouseEvent} event
	 * @param {number} ratioX
	 * @param {number} ratioY
	 * @param {DOMRect} rect
	 */
	applyInnerZoom(event, ratioX, ratioY, rect) {
		const container = this.getContainer();
		const image = this.image;
		if (!container || !image) {
			return;
		}

		const containerRect = container.getBoundingClientRect();
		const overlay = this.ensureInnerOverlayEl(container);

		overlay.style.left = `${rect.left - containerRect.left}px`;
		overlay.style.top = `${rect.top - containerRect.top}px`;
		overlay.style.width = `${rect.width}px`;
		overlay.style.height = `${rect.height}px`;
		overlay.style.display = 'block';

		applyBackgroundZoom(
			overlay,
			image,
			this.opts.zoomLevel,
			ratioX,
			ratioY,
			rect.width,
			rect.height
		);
	}

	resetInnerZoom() {
		if (this.innerOverlayEl) {
			this.innerOverlayEl.style.display = 'none';
		}
		if (this.panzoom && typeof this.panzoom.execute === 'function') {
			this.panzoom.execute('reset');
		}
		if (!this.image) {
			return;
		}
		this.image.style.transform = '';
		this.image.style.transformOrigin = '';
	}

	/**
	 * @param {number} offsetX
	 * @param {number} offsetY
	 * @param {DOMRect} rect
	 * @param {number} ratioX
	 * @param {number} ratioY
	 */
	applyLensZoom(offsetX, offsetY, rect, ratioX, ratioY) {
		const container = this.getContainer();
		const image = this.image;
		if (!container || !image) {
			return;
		}

		const lens = this.ensureLensEl(container);
		const size = this.opts.lensSize;
		const scale = this.opts.zoomLevel;
		const containerRect = container.getBoundingClientRect();

		const left =
			eventClientToContainer(rect.left + offsetX, containerRect.left) -
			size / 2;
		const top =
			eventClientToContainer(rect.top + offsetY, containerRect.top) -
			size / 2;

		lens.style.width = `${size}px`;
		lens.style.height = `${size}px`;
		lens.style.left = `${left}px`;
		lens.style.top = `${top}px`;
		lens.style.display = 'block';

		applyBackgroundZoom(lens, image, scale, ratioX, ratioY, size, size);
	}

	/**
	 * @param {DOMRect} rect
	 * @param {number} ratioX
	 * @param {number} ratioY
	 */
	applyWindowZoom(rect, ratioX, ratioY) {
		const container = this.getContainer();
		const image = this.image;
		if (!container || !image) {
			return;
		}

		const windowEl = this.ensureWindowEl(container);
		const scale = this.opts.zoomLevel;
		const width = this.opts.windowWidth;
		const height = this.opts.windowHeight;

		windowEl.style.width = `${width}px`;
		windowEl.style.height = `${height}px`;
		windowEl.style.display = 'block';

		if (this.opts.tint && this.opts.tintOpacity > 0) {
			const tint = this.ensureTintEl(container);
			tint.style.backgroundColor = this.opts.tintColor;
			tint.style.opacity = String(this.opts.tintOpacity);
			tint.style.display = 'block';
		}

		applyBackgroundZoom(
			windowEl,
			image,
			scale,
			ratioX,
			ratioY,
			width,
			height
		);
	}

	/**
	 * @param {HTMLElement} container
	 * @returns {HTMLElement}
	 */
	ensureInnerOverlayEl(container) {
		if (this.innerOverlayEl) {
			return this.innerOverlayEl;
		}
		const overlay = document.createElement('div');
		overlay.className = 'modula-native-zoom-inner';
		container.appendChild(overlay);
		this.innerOverlayEl = overlay;
		return overlay;
	}

	/**
	 * @param {HTMLElement} container
	 * @returns {HTMLElement}
	 */
	ensureLensEl(container) {
		if (this.lensEl) {
			return this.lensEl;
		}
		const lens = document.createElement('div');
		lens.className = `modula-native-zoom-lens modula-native-zoom-lens--${this.opts.lensShape}`;
		container.appendChild(lens);
		this.lensEl = lens;
		return lens;
	}

	/**
	 * @param {HTMLElement} container
	 * @returns {HTMLElement}
	 */
	ensureWindowEl(container) {
		if (this.windowEl) {
			return this.windowEl;
		}
		const windowEl = document.createElement('div');
		windowEl.className = `modula-native-zoom-window modula-native-zoom-window--${this.opts.windowCorner}`;
		container.appendChild(windowEl);
		this.windowEl = windowEl;
		return windowEl;
	}

	/**
	 * @param {HTMLElement} container
	 * @returns {HTMLElement}
	 */
	ensureTintEl(container) {
		if (this.tintEl) {
			return this.tintEl;
		}
		const tint = document.createElement('div');
		tint.className = 'modula-native-zoom-tint';
		container.appendChild(tint);
		this.tintEl = tint;
		return tint;
	}

	hideOverlays() {
		if (this.lensEl) {
			this.lensEl.style.display = 'none';
		}
		if (this.windowEl) {
			this.windowEl.style.display = 'none';
		}
		if (this.innerOverlayEl) {
			this.innerOverlayEl.style.display = 'none';
		}
		if (this.tintEl) {
			this.tintEl.style.display = 'none';
		}
	}

	teardownSlide() {
		if (this.rafId) {
			cancelAnimationFrame(this.rafId);
			this.rafId = 0;
		}
		if (this.pointerTarget) {
			this.pointerTarget.removeEventListener(
				'mouseenter',
				this.onPointerEnter
			);
			this.pointerTarget.removeEventListener(
				'mouseleave',
				this.onPointerLeave
			);
			this.pointerTarget.removeEventListener(
				'mousemove',
				this.onPointerMove
			);
		}
		if (this.image) {
			this.image.removeEventListener('load', this.onImageLoad);
			this.image.classList.remove('modula-native-zoom-image');
			this.resetInnerZoom();
		}
		this.image = null;
		this.panzoom = null;
		this.pointerTarget = null;
		this.hideOverlays();
	}

	detach() {
		this.teardownSlide();
		const container = this.getContainer();
		if (this.toggleBound && container) {
			const button = container.querySelector(
				'.modula-fancybox-elevatezoom-button'
			);
			button?.removeEventListener('click', this.onToggleClick);
			button?.classList.remove('is-active');
		}
		this.toggleBound = false;
		this.lensEl?.remove();
		this.windowEl?.remove();
		this.innerOverlayEl?.remove();
		this.tintEl?.remove();
		this.lensEl = null;
		this.windowEl = null;
		this.innerOverlayEl = null;
		this.tintEl = null;
	}
}

/**
 * @param {number} client
 * @param {number} containerOrigin
 * @returns {number}
 */
function eventClientToContainer(client, containerOrigin) {
	return client - containerOrigin;
}

/**
 * @param {HTMLElement} target
 * @param {HTMLImageElement} image
 * @param {number} scale
 * @param {number} ratioX
 * @param {number} ratioY
 * @param {number} viewWidth
 * @param {number} viewHeight
 */
function applyBackgroundZoom(
	target,
	image,
	scale,
	ratioX,
	ratioY,
	viewWidth,
	viewHeight
) {
	const src = image.currentSrc || image.src;
	if (!src) {
		return;
	}

	const naturalWidth = image.naturalWidth || 1;
	const naturalHeight = image.naturalHeight || 1;
	const bgWidth = naturalWidth * scale;
	const bgHeight = naturalHeight * scale;

	const posX = ratioX * bgWidth - viewWidth / 2;
	const posY = ratioY * bgHeight - viewHeight / 2;

	target.style.backgroundImage = `url("${src.replace(/"/g, '\\"')}")`;
	target.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
	target.style.backgroundPosition = `-${posX}px -${posY}px`;
}

/**
 * @param {unknown} fancybox
 */
export function attachModulaNativeLightboxZoom(fancybox) {
	if (
		typeof window !== 'undefined' &&
		window.matchMedia('(pointer: coarse)').matches
	) {
		return;
	}

	const mzoom = resolveMzoomFromFancybox(fancybox);
	const opts = normalizeMzoomToNativeOpts(mzoom);
	if (!opts) {
		return;
	}

	detachModulaNativeLightboxZoom(fancybox);
	fancybox.modulaNativeZoom = new ModulaNativeZoomSession(fancybox, opts);
	fancybox.modulaNativeZoom.attach();
}

/**
 * @param {unknown} fancybox
 */
export function detachModulaNativeLightboxZoom(fancybox) {
	if (!fancybox?.modulaNativeZoom) {
		return;
	}
	fancybox.modulaNativeZoom.detach();
	fancybox.modulaNativeZoom = null;
}

/**
 * @param {unknown} fancybox
 */
export function refreshModulaNativeLightboxZoom(fancybox) {
	if (!fancybox?.modulaNativeZoom) {
		attachModulaNativeLightboxZoom(fancybox);
		return;
	}
	fancybox.modulaNativeZoom.bindSlide(0);
}
