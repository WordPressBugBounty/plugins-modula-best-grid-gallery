/**
 * Modula Gallery - Story layout (Instagram-style full-bleed slides, segments + tap nav)
 *
 * @package
 */
import './fancyappsCarouselStyles';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { useSelector } from 'react-redux';
import { Carousel, Autoplay, Lazyload } from '@fancyapps/ui';
import StoryItem from '../components/StoryItem';
import StoryChrome from '../components/StoryChrome';
import { storySettingsToCarousel } from '../utils/storySettingsToCarousel';
import { isStoryVideoItem } from '../utils/storyVideo';
import { galleryItemRowKey } from '../utils/galleryItemIdentity';
import {
	applyReducedMotionToCarouselOptions,
	shouldSuppressGalleryMotion,
} from '../utils/reducedMotion';

/**
 * @param {*} api - Fancyapps Carousel instance.
 * @return {number}
 */
function readStorySlideIndex(api) {
	const page = api.getPage?.();
	// Prefer page index (authoritative for Autoplay); slide[0].index can lag during transitions.
	if (page && typeof page.index === 'number' && Number.isFinite(page.index)) {
		return page.index;
	}
	const slides = page?.slides;
	if (
		Array.isArray(slides) &&
		slides[0] &&
		typeof slides[0].index === 'number'
	) {
		return slides[0].index;
	}
	const visible = api.getVisibleSlides?.();
	if (
		Array.isArray(visible) &&
		visible[0] &&
		typeof visible[0].index === 'number'
	) {
		return visible[0].index;
	}
	return 0;
}

export default function StoryLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	/** Same as PHP bootstrap `metadata.staticStoryLayout` for story + settings editor (no Fancy Carousel). */
	const useStaticStoryLayout = useSelector(
		(s) =>
			s.gallery.metadata?.displayContext === 'settings-editor-preview' ||
			s.gallery.metadata?.staticStoryLayout === true
	);
	const metadata = useSelector((s) => s.gallery.metadata);
	const itemsRef = useRef(null);
	const apiRef = useRef(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const suppressMotion = shouldSuppressGalleryMotion(config, metadata);

	const defaultStory = useMemo(() => storySettingsToCarousel({}), []);

	const { carouselOptions, useAutoplayPlugin } = useMemo(() => {
		const sc = config?.storyCarousel;
		let options = {
			...defaultStory.carouselOptions,
			...(sc?.carouselOptions || {}),
		};
		let autoplay =
			sc?.useAutoplayPlugin !== undefined
				? !!sc.useAutoplayPlugin
				: defaultStory.useAutoplayPlugin;
		if (suppressMotion) {
			options = applyReducedMotionToCarouselOptions(options);
			autoplay = false;
		}
		return {
			carouselOptions: options,
			useAutoplayPlugin: autoplay,
		};
	}, [config.storyCarousel, defaultStory, suppressMotion]);

	const optionsSignature = useMemo(
		() => JSON.stringify(carouselOptions),
		[carouselOptions]
	);

	/**
	 * Fancy Carousel mutates DOM under the ref root; force a clean subtree when order changes
	 * so React does not call insertBefore against carousel-moved nodes (e.g. after reorder).
	 */
	/** Include index so duplicate attachment IDs and permutations remount Fancy Carousel reliably. */
	const carouselItemsMountKey = useMemo(
		() =>
			Array.isArray(items)
				? items
						.map((it, i) => `${i}:${galleryItemRowKey(it, i)}`)
						.join('|')
				: '',
		[items]
	);

	useEffect(() => {
		if (useStaticStoryLayout) {
			return undefined;
		}
		const mainEl = itemsRef.current;
		if (!mainEl || !Array.isArray(items) || items.length === 0) {
			return undefined;
		}

		const plugins = {};
		if (carouselOptions.Lazyload) {
			plugins.Lazyload = Lazyload;
		}
		if (useAutoplayPlugin) {
			plugins.Autoplay = Autoplay;
		}

		const mainInstance = Carousel(mainEl, carouselOptions, plugins).init();
		apiRef.current = mainInstance;

		const syncAutoplayForVideoSlide = (slideIndex) => {
			if (!useAutoplayPlugin) {
				return;
			}
			const autoplay = mainInstance.getPlugins?.()?.Autoplay;
			if (!autoplay || typeof autoplay.pause !== 'function') {
				return;
			}
			const idx =
				typeof slideIndex === 'number'
					? slideIndex
					: readStorySlideIndex(mainInstance);
			const current = items[idx];
			if (current && isStoryVideoItem(current)) {
				autoplay.pause();
			} else if (typeof autoplay.resume === 'function') {
				autoplay.resume();
			}
		};

		const syncIndexFromApi = () => {
			const idx = readStorySlideIndex(mainInstance);
			setActiveIndex(idx);
			syncAutoplayForVideoSlide(idx);
		};
		// change: (api, newPageIndex, prevPageIndex?) — use index so video pause/resume matches the visible slide
		mainInstance.on('change', (_carousel, newPageIndex) => {
			const idx =
				typeof newPageIndex === 'number'
					? newPageIndex
					: readStorySlideIndex(mainInstance);
			setActiveIndex(idx);
			syncAutoplayForVideoSlide(idx);
		});
		// Autoplay.resume() no-ops until isSettled(); re-sync after transition completes.
		mainInstance.on('settle', () => {
			syncAutoplayForVideoSlide(readStorySlideIndex(mainInstance));
		});
		mainInstance.on('ready', syncIndexFromApi);
		syncIndexFromApi();

		if (typeof mainInstance.refresh === 'function') {
			mainInstance.refresh();
			if (typeof window !== 'undefined') {
				window.requestAnimationFrame(() => {
					mainInstance.refresh?.();
				});
			}
		}

		return () => {
			apiRef.current = null;
			mainInstance.destroy();
		};
	}, [
		items,
		optionsSignature,
		carouselOptions,
		useAutoplayPlugin,
		useStaticStoryLayout,
	]);

	const goPrev = useCallback(() => {
		apiRef.current?.prev?.();
	}, []);
	const goNext = useCallback(() => {
		apiRef.current?.next?.();
	}, []);
	const goToIndex = useCallback(
		(index) => {
			const api = apiRef.current;
			if (!api || typeof index !== 'number' || !Number.isFinite(index)) {
				return;
			}
			const max = (Array.isArray(items) ? items.length : 0) - 1;
			if (max < 0) {
				return;
			}
			const target = Math.max(0, Math.min(index, max));
			if (target === readStorySlideIndex(api)) {
				return;
			}
			api.goTo?.(target);
		},
		[items]
	);

	const count = Array.isArray(items) ? items.length : 0;

	if (useStaticStoryLayout) {
		return (
			<div className="modula-story modula-story--editor-preview">
				<div className="modula-story__frame modula-story__frame--editor-preview">
					<div className="modula-items modula-story-editor-stack">
						{Array.isArray(items) &&
							items.map((item, idx) => (
								<StoryItem
									key={`story-editor-${galleryItemRowKey(item, idx)}`}
									itemData={item}
									config={config}
									isActive={false}
									isEditorStack
								/>
							))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="modula-story">
			<div className="modula-story__frame">
				<StoryChrome
					total={count}
					activeIndex={activeIndex}
					onPrev={goPrev}
					onNext={goNext}
					onGoTo={goToIndex}
				/>
				<div
					className="modula-items modula-story-carousel f-carousel"
					ref={itemsRef}
					key={carouselItemsMountKey}
				>
					{Array.isArray(items) &&
						items.map((item, idx) => (
							<StoryItem
								key={`story-${galleryItemRowKey(item, idx)}`}
								itemData={item}
								config={config}
								isActive={idx === activeIndex}
							/>
						))}
				</div>
			</div>
		</div>
	);
}
