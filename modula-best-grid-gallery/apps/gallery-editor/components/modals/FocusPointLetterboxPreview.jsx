/**
 * Custom grid letterbox preview: tile aspect + object-fit contain alignment picker.
 */
import { useCallback, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * @param {Object}   props
 * @param {string}   props.src
 * @param {number}   props.aspectRatio Tile width / height in grid units.
 * @param {string}   [props.layoutHint] e.g. "3:2"
 * @param {{ x: number, y: number }} props.focal Normalized alignment 0–1.
 * @param {(next: { x: number, y: number }) => void} props.onFocalChange
 */
export default function FocusPointLetterboxPreview({
	src,
	aspectRatio,
	layoutHint = '',
	focal,
	onFocalChange,
}) {
	const wrapRef = useRef(null);

	const setFocalFromPointer = useCallback(
		(clientX, clientY) => {
			const el = wrapRef.current;
			if (!el) {
				return;
			}
			const rect = el.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) {
				return;
			}
			const x = Math.min(
				1,
				Math.max(0, (clientX - rect.left) / rect.width)
			);
			const y = Math.min(
				1,
				Math.max(0, (clientY - rect.top) / rect.height)
			);
			onFocalChange({ x, y });
		},
		[onFocalChange]
	);

	const onPointerDown = useCallback(
		(event) => {
			event.preventDefault();
			setFocalFromPointer(event.clientX, event.clientY);

			const onMove = (moveEvent) => {
				setFocalFromPointer(moveEvent.clientX, moveEvent.clientY);
			};
			const onUp = () => {
				window.removeEventListener('pointermove', onMove);
				window.removeEventListener('pointerup', onUp);
			};
			window.addEventListener('pointermove', onMove);
			window.addEventListener('pointerup', onUp);
		},
		[setFocalFromPointer]
	);

	if (!src || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
		return null;
	}

	const objectPosition = `${focal.x * 100}% ${focal.y * 100}%`;

	return (
		<div className="modula-focus-point-modal__letterbox">
			<p className="modula-focus-point-modal__letterbox-hint">
				{__(
					'Click or drag on the preview to choose where the image sits inside the tile. Gray areas are empty space (letterboxing).',
					'modula-best-grid-gallery'
				)}
			</p>
			<div
				ref={wrapRef}
				className="modula-focus-point-modal__letterbox-wrap"
				style={{ aspectRatio: String(aspectRatio) }}
				onPointerDown={onPointerDown}
				role="presentation"
			>
				{layoutHint ? (
					<span
						className="modula-focus-point-modal__letterbox-aspect"
						aria-hidden="true"
					>
						{layoutHint}
					</span>
				) : null}
				<img
					src={src}
					alt=""
					className="modula-focus-point-modal__letterbox-img"
					style={{ objectPosition }}
					draggable={false}
				/>
			</div>
		</div>
	);
}
