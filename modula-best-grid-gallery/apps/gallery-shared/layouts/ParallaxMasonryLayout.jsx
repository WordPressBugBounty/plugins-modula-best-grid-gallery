/**
 * Modula Gallery - Parallax masonry layout (full-page style)
 *
 * Column count matches masonry; motion presets; RAF-driven drift (see parallax-masonry/).
 *
 * @package
 */
import {
	useRef,
	useState,
	useEffect,
	useMemo,
	useCallback,
} from '@wordpress/element';
import { useSelector, shallowEqual } from 'react-redux';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { useParallaxColumnCount } from '../hooks/useParallaxColumnCount';
import { isParallaxOverlayOn } from '../utils/settingsToConfig';
import {
	getParallaxMotionForColumns,
	PARALLAX_MOTION_PRESET_DEFAULT,
} from '../utils/parallaxMasonryPresets';
import { DEFAULT_PARALLAX_OVERLAY_BG } from './parallax-masonry/constants';
import { computeAmplitudeBase } from './parallax-masonry/computeAmplitudeBase';
import ParallaxDriftColumns from './parallax-masonry/ParallaxDriftColumns';
import ParallaxMasonryChrome from './parallax-masonry/ParallaxMasonryChrome';

export default function ParallaxMasonryLayout() {
	const items = useSelector((s) => s.items.items, shallowEqual);
	const config = useSelector((s) => s.gallery.config);
	const metadata = useSelector((s) => s.gallery.metadata);
	const { containerRef, containerWidth } = useContainerWidth(0);

	const [sizes, setSizes] = useState({ viewH: 0, contentH: 0 });
	const containerNodeRef = useRef(null);
	const columnsWrapperRef = useRef(null);
	const resizeRafRef = useRef(null);

	const columnCount = useParallaxColumnCount(config);
	const gutter = parseInt(config?.gutter ?? 10, 10);

	const parallaxOverlayEnabled = useMemo(
		() => isParallaxOverlayOn(config?.parallaxOverlayEnabled),
		[config?.parallaxOverlayEnabled]
	);

	const parallaxOverlayBackground =
		typeof config?.parallaxOverlayBackground === 'string' &&
		config.parallaxOverlayBackground.trim() !== ''
			? config.parallaxOverlayBackground.trim()
			: DEFAULT_PARALLAX_OVERLAY_BG;

	const parallaxOverlayFadeColor = useMemo(() => {
		const raw = parallaxOverlayBackground;
		const rgbaMatch = raw.match(
			/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i
		);
		if (rgbaMatch) {
			const r = Math.max(
				0,
				Math.min(255, parseInt(rgbaMatch[1], 10) || 0)
			);
			const g = Math.max(
				0,
				Math.min(255, parseInt(rgbaMatch[2], 10) || 0)
			);
			const b = Math.max(
				0,
				Math.min(255, parseInt(rgbaMatch[3], 10) || 0)
			);
			return `rgb(${r}, ${g}, ${b})`;
		}
		const hexMatch = raw.match(/#([0-9a-f]{6}|[0-9a-f]{3})/i);
		if (hexMatch && hexMatch[0]) {
			return hexMatch[0];
		}
		return '#000000';
	}, [parallaxOverlayBackground]);

	const parallaxCaption = useMemo(() => {
		return typeof config?.parallaxCaption === 'string'
			? config.parallaxCaption.trim()
			: '';
	}, [config?.parallaxCaption]);

	const motionPresetId =
		typeof config?.parallaxMotionPreset === 'string' &&
		config.parallaxMotionPreset.trim() !== ''
			? config.parallaxMotionPreset.trim().toLowerCase()
			: PARALLAX_MOTION_PRESET_DEFAULT;

	const { speeds, offsets, amplitudeFactors, freq } = useMemo(
		() => getParallaxMotionForColumns(motionPresetId, columnCount),
		[motionPresetId, columnCount]
	);

	const columnWidth =
		containerWidth > 0
			? (containerWidth - (columnCount - 1) * gutter) / columnCount
			: 0;

	const columns = useMemo(() => {
		const list = Array.isArray(items) ? items : [];
		const cols = Array.from({ length: columnCount }, () => []);
		list.forEach((item, i) => {
			cols[i % columnCount].push(item);
		});
		return cols;
	}, [items, columnCount]);

	const scheduleMeasure = useCallback(() => {
		if (resizeRafRef.current !== null) {
			return;
		}
		resizeRafRef.current = window.requestAnimationFrame(() => {
			resizeRafRef.current = null;
			const viewfinder = containerNodeRef.current;
			const columnsEl = columnsWrapperRef.current;
			if (!viewfinder || !columnsEl) {
				return;
			}
			const viewH = viewfinder.clientHeight;
			const contentH = columnsEl.scrollHeight;
			setSizes((prev) =>
				prev.viewH === viewH && prev.contentH === contentH
					? prev
					: { viewH, contentH }
			);
		});
	}, []);

	useEffect(() => {
		const viewfinder = containerNodeRef.current;
		const columnsEl = columnsWrapperRef.current;
		if (!viewfinder || !columnsEl) {
			return;
		}
		scheduleMeasure();
		const ro = new ResizeObserver(scheduleMeasure);
		ro.observe(viewfinder);
		ro.observe(columnsEl);
		return () => {
			ro.disconnect();
			if (resizeRafRef.current !== null) {
				window.cancelAnimationFrame(resizeRafRef.current);
				resizeRafRef.current = null;
			}
		};
	}, [items, columnCount, scheduleMeasure]);

	const amplitudeBase = useMemo(
		() => computeAmplitudeBase(sizes.viewH, sizes.contentH),
		[sizes.viewH, sizes.contentH]
	);

	const amplitudeBaseRef = useRef(amplitudeBase);
	amplitudeBaseRef.current = amplitudeBase;

	return (
		<div
			ref={(el) => {
				containerRef(el);
				containerNodeRef.current = el;
			}}
			className={
				'modula-items modula-parallax-masonry' +
				(parallaxOverlayEnabled
					? ''
					: ' modula-parallax-masonry--no-overlay')
			}
			style={{
				'--modula-parallax-gutter': `${gutter}px`,
				'--modula-parallax-column-width': `${columnWidth}px`,
				'--modula-parallax-fade-color': parallaxOverlayFadeColor,
			}}
		>
			<ParallaxMasonryChrome
				parallaxOverlayEnabled={parallaxOverlayEnabled}
				parallaxOverlayBackground={parallaxOverlayBackground}
				parallaxCaption={parallaxCaption}
			/>
			<ParallaxDriftColumns
				ref={columnsWrapperRef}
				columns={columns}
				speeds={speeds}
				offsets={offsets}
				amplitudeFactors={amplitudeFactors}
				freq={freq}
				amplitudeBaseRef={amplitudeBaseRef}
				config={config}
				metadata={metadata}
			/>
		</div>
	);
}
