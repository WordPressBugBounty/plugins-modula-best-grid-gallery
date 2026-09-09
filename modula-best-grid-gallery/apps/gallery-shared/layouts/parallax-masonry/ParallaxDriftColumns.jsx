/**
 * Masonry columns with parallax Y driven imperatively (RAF, no per-frame React state).
 *
 * @package
 */

import {
	memo,
	forwardRef,
	useRef,
	useEffect,
	useLayoutEffect,
	useCallback,
} from '@wordpress/element';
import GalleryItem from '../../components/GalleryItem';
import { galleryItemRowKey } from '../../utils/galleryItemIdentity';
import { shouldSuppressGalleryMotion } from '../../utils/reducedMotion';
import { PHASE_OFFSET } from './constants';

const ParallaxDriftColumns = memo(
	forwardRef(function ParallaxDriftColumns(
		{
			columns,
			speeds,
			offsets,
			amplitudeFactors,
			freq,
			amplitudeBaseRef,
			config,
			metadata,
		},
		forwardedRef
	) {
		const columnElsRef = useRef([]);
		const motionRef = useRef({
			speeds,
			offsets,
			amplitudeFactors,
			freq,
			n: 0,
		});
		const startTimeRef = useRef(performance.now());

		useLayoutEffect(() => {
			motionRef.current = {
				speeds,
				offsets,
				amplitudeFactors,
				freq,
				n: columns.length,
			};
		}, [speeds, offsets, amplitudeFactors, freq, columns.length]);

		const setWrapperRef = useCallback(
			(el) => {
				if (typeof forwardedRef === 'function') {
					forwardedRef(el);
				} else if (forwardedRef) {
					forwardedRef.current = el;
				}
			},
			[forwardedRef]
		);

		useEffect(() => {
			startTimeRef.current = performance.now();
		}, [columns.length, speeds, offsets, amplitudeFactors, freq]);

		useEffect(() => {
			const els = columnElsRef.current;
			const n = motionRef.current.n;

			if (shouldSuppressGalleryMotion(config, metadata)) {
				for (let i = 0; i < n; i++) {
					const el = els[i];
					if (el) {
						el.style.transform = 'translate3d(0, 0, 0)';
					}
				}
				return undefined;
			}

			let rafId;
			const tick = (now) => {
				const t = now - startTimeRef.current;
				const {
					speeds: sp,
					offsets: off,
					amplitudeFactors: af,
					freq: fr,
					n: colCount,
				} = motionRef.current;
				const ampB = amplitudeBaseRef.current;
				for (let i = 0; i < colCount; i++) {
					const el = els[i];
					if (!el) {
						continue;
					}
					const speed = sp[i] ?? 1;
					const offset = off[i] ?? 0;
					const factor = af[i] ?? 1;
					const amplitude = ampB * factor;
					const angle = t * fr * speed + PHASE_OFFSET;
					const s = Math.sin(angle);
					const eased = s * s;
					const raw = offset - eased * amplitude;
					const ty = Math.min(raw, 0);
					el.style.transform = `translate3d(0, ${ty}px, 0)`;
				}
				rafId = window.requestAnimationFrame(tick);
			};
			rafId = window.requestAnimationFrame(tick);
			return () => {
				if (rafId) {
					window.cancelAnimationFrame(rafId);
				}
			};
			// amplitudeBaseRef: stable ref from parent; .current updated without re-subscribing RAF
		}, [
			amplitudeBaseRef,
			config?.respectReducedMotion,
			metadata?.displayContext,
		]);

		const setColumnRef = useCallback(
			(index) => (el) => {
				columnElsRef.current[index] = el;
			},
			[]
		);

		return (
			<div
				ref={setWrapperRef}
				className="modula-parallax-masonry-columns"
			>
				{columns.map((columnItems, colIndex) => (
					<div
						key={colIndex}
						ref={setColumnRef(colIndex)}
						className="modula-parallax-masonry-column"
					>
						{columnItems.map((item, itemIdx) => (
							<div
								key={`${colIndex}-${galleryItemRowKey(item, itemIdx)}`}
								className="modula-parallax-masonry-item"
							>
								<GalleryItem
									itemData={item}
									config={config}
									style={{ width: '100%' }}
								/>
							</div>
						))}
					</div>
				))}
			</div>
		);
	})
);

ParallaxDriftColumns.displayName = 'ParallaxDriftColumns';

export default ParallaxDriftColumns;
