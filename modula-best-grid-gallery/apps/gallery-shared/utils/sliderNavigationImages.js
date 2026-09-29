/** Load the navigation file after Fancyapps has measured its thumbnail slot. */
export const sliderNavigationThumbTemplate =
	'<button type="button" aria-label="Slide to #{{page}}"><img class="modula-slider-nav-image" draggable="false" alt="" data-modula-thumb-index="{{index}}" /></button>';

export function bindSliderNavigationImages(carousel, items, config) {
	let observer;
	let thumbnailCarousel;
	let attachSlide;
	let detachSlide;
	const disconnect = () => {
		observer?.disconnect();
		if (thumbnailCarousel) {
			thumbnailCarousel.off('attachSlideEl', attachSlide);
			thumbnailCarousel.off('detachSlideEl', detachSlide);
		}
	};
	const mount = () => {
		disconnect();
		const container = carousel.getPlugins().Thumbs?.getContainer();
		if (!container) {
			return;
		}
		const update = (img) => {
			const index = Number(img.dataset.modulaThumbIndex);
			const item = items[index];
			const choices = item?.sliderThumbnailChoices;
			let thumbnail = choices
				? choices[config.sliderCarousel?.thumbnailSize] || choices.auto
				: item?.sliderThumbnail;
			// Unsaved custom dimensions must not reuse a crop from the previous save.
			if (
				choices &&
				thumbnail?.customKey &&
				thumbnail.customKey !==
					config.sliderCarousel?.thumbnailCustomKey
			) {
				thumbnail = choices.auto;
			}
			const src = thumbnail?.src ?? carousel.getSlides()[index]?.thumbSrc;
			const rect = img.getBoundingClientRect();
			if (!src || rect.width <= 0 || rect.height <= 0) {
				return;
			}
			// object-fit:cover can need more source pixels than the clipped strip width.
			const ratio =
				thumbnail?.height > 0 ? thumbnail.width / thumbnail.height : 1;
			img.sizes = `${Math.ceil(Math.max(rect.width, rect.height * ratio))}px`;
			img.loading = config.lazyLoad ? 'lazy' : 'eager';
			if (thumbnail?.srcset) {
				img.srcset = thumbnail.srcset;
			}
			img.dataset.thumbnailSource = thumbnail?.source || 'legacy';
			if (img.getAttribute('src') !== src) {
				img.src = src;
			}
		};
		observer = new ResizeObserver((entries) => {
			entries.forEach(({ target }) => update(target));
		});
		const watch = (img) => {
			update(img);
			observer.observe(img);
		};
		thumbnailCarousel = carousel.getPlugins().Thumbs?.getCarousel();
		attachSlide = (_api, slide) => {
			slide.el
				?.querySelectorAll('[data-modula-thumb-index]')
				.forEach(watch);
		};
		detachSlide = (_api, slide) => {
			slide.el
				?.querySelectorAll('[data-modula-thumb-index]')
				.forEach((img) => observer.unobserve(img));
		};
		thumbnailCarousel?.on('attachSlideEl', attachSlide);
		thumbnailCarousel?.on('detachSlideEl', detachSlide);
		container.querySelectorAll('[data-modula-thumb-index]').forEach(watch);
	};
	carousel.on('thumbs:ready', mount);
	return () => {
		carousel.off('thumbs:ready', mount);
		disconnect();
	};
}
