import { useLayoutEffect, useRef, useState } from '@wordpress/element';

/**
 * Visual-only guides; the active layout owns all placement decisions.
 * @param {Object}      props           Resolved layout guidance.
 * @param {Object}      props.metrics   Pixel cell sizes, gutters and padding.
 * @param {string|null} props.gesture   Active drag or resize.
 * @param {Object|null} props.rectangle Engine-resolved cell rectangle.
 */
export default function InteractionGridGuide({ metrics, gesture, rectangle }) {
	const guideRef = useRef(null);
	const [viewportHeight, setViewportHeight] = useState(0);
	const visible = Boolean(gesture && rectangle && metrics);
	useLayoutEffect(() => {
		if (!visible) {
			setViewportHeight(0);
			return;
		}
		const surface = guideRef.current?.parentElement;
		let viewport = surface?.parentElement;
		while (
			viewport &&
			!/auto|scroll/.test(getComputedStyle(viewport).overflowY)
		) {
			viewport = viewport.parentElement;
		}
		if (!surface || !viewport) {
			return;
		}
		const measure = () => {
			const bounds = surface.getBoundingClientRect();
			const scale = surface.offsetWidth
				? bounds.width / surface.offsetWidth
				: 1;
			setViewportHeight(
				Math.max(
					0,
					Math.floor(
						(viewport.getBoundingClientRect().bottom - bounds.top) /
							(scale || 1)
					)
				)
			);
		};
		measure();
		const observer =
			typeof ResizeObserver === 'undefined'
				? null
				: new ResizeObserver(measure);
		observer?.observe(viewport);
		observer?.observe(surface);
		viewport.addEventListener('scroll', measure);
		window.addEventListener('resize', measure);
		return () => {
			observer?.disconnect();
			viewport.removeEventListener('scroll', measure);
			window.removeEventListener('resize', measure);
		};
	}, [visible]);
	if (!gesture || !rectangle || !metrics) {
		return null;
	}
	const {
		columnWidth,
		rowHeight,
		gutterX = 0,
		gutterY = 0,
		paddingX = 0,
		paddingY = 0,
	} = metrics;
	const pitchX = columnWidth + gutterX;
	const pitchY = rowHeight + gutterY;
	/*
	 * The editor's canvas selection token, as on the Freeform selection frame.
	 * It is defined on the editor app root; both hosts render inside it.
	 */
	const gridLineColor =
		'color-mix(in srgb, var(--mod-se-selection) 27%, transparent)';
	return (
		<div
			ref={guideRef}
			data-modula-grid-guide={gesture}
			aria-hidden="true"
			style={{
				position: 'absolute',
				inset: 0,
				minHeight: viewportHeight,
				pointerEvents: 'none',
			}}
		>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					borderBottom: `1px solid ${gridLineColor}`,
					boxSizing: 'border-box',
					backgroundImage: `linear-gradient(to right, ${gridLineColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridLineColor} 1px, transparent 1px)`,
					backgroundSize: `${pitchX}px ${pitchY}px`,
					backgroundPosition: `${paddingX}px ${paddingY}px`,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: paddingX + rectangle.x * pitchX,
					top: paddingY + rectangle.y * pitchY,
					width: rectangle.w * pitchX - gutterX,
					height: rectangle.h * pitchY - gutterY,
					border: '2px dashed var(--mod-se-selection)',
					boxSizing: 'border-box',
					zIndex: 10000,
				}}
			>
				<span
					data-modula-grid-span
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						// The Freeform size badge's look (`_freeform-selection.scss`).
						padding: '2px 7px',
						borderRadius: 4,
						color: 'var(--mod-se-selection-ink)',
						background: 'var(--mod-se-selection)',
						fontFamily: 'var(--mod-se-font-mono)',
						fontSize: 11.5,
						whiteSpace: 'nowrap',
					}}
				>
					{rectangle.w} × {rectangle.h}
				</span>
			</div>
		</div>
	);
}
