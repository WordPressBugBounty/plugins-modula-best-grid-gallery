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
					borderBottom: '1px solid #2271b144',
					boxSizing: 'border-box',
					backgroundImage:
						'linear-gradient(to right, #2271b144 1px, transparent 1px), linear-gradient(to bottom, #2271b144 1px, transparent 1px)',
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
					border: '2px dashed #2271b1',
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
						padding: '2px 6px',
						borderRadius: 3,
						color: '#fff',
						background: '#2271b1',
						fontSize: 12,
						whiteSpace: 'nowrap',
					}}
				>
					{rectangle.w} × {rectangle.h}
				</span>
			</div>
		</div>
	);
}
