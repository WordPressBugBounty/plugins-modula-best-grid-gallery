import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	clampSlotXForAnchorSide,
	getSlotAnchorPercent,
	getSlotMaxWidthPercent,
	getSlotTextAlign,
} from './hoverSlotRails';

const DRAG_THRESHOLD_PX = 5;
const GRID_STEP_PERCENT = 12.5; // 8x8 grid

/** Four arrows from center (cardinal "move" affordance). */
function HoverSlotMoveGlyph() {
	return (
		<svg
			className="modula-hover-builder-card__move-glyph"
			width={18}
			height={18}
			viewBox="0 0 24 24"
			aria-hidden="true"
			focusable="false"
		>
			<path
				d="M12 11 L12 4 M9 7 L12 4 L15 7"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M12 13 L12 20 M9 17 L12 20 L15 17"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M11 12 L4 12 M7 9 L4 12 L7 15"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M13 12 L20 12 M17 9 L20 12 L17 15"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/**
 * @param {{
 *   label: string,
 *   mediaRef: { current: HTMLElement | null },
 *   buildMode: boolean,
 *   selected: boolean,
 *   x: number,
 *   y: number,
 *   zIndex: number,
 *   onSelect: () => void,
 *   onCommit: (next: { x: number, y: number }) => void,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function HoverImageSlotChip({
	label,
	mediaRef,
	buildMode,
	selected,
	x,
	y,
	zIndex,
	onSelect,
	onCommit,
	children,
}) {
	/** @type {import('react').MutableRefObject<'idle' | 'pending' | 'dragging'>} */
	const phaseRef = useRef('idle');
	/** @type {import('react').MutableRefObject<{ clientX: number, clientY: number, pointerId: number } | null>} */
	const pendingRef = useRef(null);
	/** @type {import('react').MutableRefObject<'left' | 'center' | 'right' | null>} */
	const dragSideRef = useRef(null);
	/** @type {import('react').MutableRefObject<{ startClientX: number, startClientY: number, startAnchorXPx: number, startAnchorYPx: number, side: 'left' | 'center' | 'right' } | null>} */
	const dragStartRef = useRef(null);
	const suppressClickRef = useRef(false);
	const latest = useRef({ x, y });
	latest.current = { x, y };
	const onCommitRef = useRef(onCommit);
	const onSelectRef = useRef(onSelect);
	onCommitRef.current = onCommit;
	onSelectRef.current = onSelect;
	const lastDragPctRef = useRef(
		/** @type {{ x: number, y: number } | null} */ (null)
	);
	const slotElRef = useRef(/** @type {HTMLDivElement | null} */ (null));
	const slotMainRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
	const [dragPreview, setDragPreview] = useState(
		/** @type {{ x: number, y: number } | null} */ (null)
	);
	const [isDragging, setIsDragging] = useState(false);
	const windowMoveRef = useRef(
		/** @type {((e: PointerEvent) => void) | null} */ (null)
	);
	const windowEndRef = useRef(/** @type {(() => void) | null} */ (null));
	const userSelectPrevRef = useRef('');
	const dragLockActiveRef = useRef(false);
	const capturedPointerIdRef = useRef(/** @type {number | null} */ (null));

	const lockTextSelection = useCallback(() => {
		if (dragLockActiveRef.current || !document?.body) {
			return;
		}
		userSelectPrevRef.current = document.body.style.userSelect || '';
		document.body.style.userSelect = 'none';
		dragLockActiveRef.current = true;
	}, []);

	const unlockTextSelection = useCallback(() => {
		if (!dragLockActiveRef.current || !document?.body) {
			return;
		}
		document.body.style.userSelect = userSelectPrevRef.current;
		dragLockActiveRef.current = false;
	}, []);

	const detachWindowListeners = useCallback(() => {
		const mv = windowMoveRef.current;
		const en = windowEndRef.current;
		if (mv) {
			window.removeEventListener('pointermove', mv);
		}
		if (en) {
			window.removeEventListener('pointerup', en);
			window.removeEventListener('pointercancel', en);
		}
		windowMoveRef.current = null;
		windowEndRef.current = null;
	}, []);

	const windowPointerMove = useCallback(
		(e) => {
			const root = mediaRef.current;
			if (!root) {
				return;
			}
			const rect = root.getBoundingClientRect();
			if (rect.width < 1 || rect.height < 1) {
				return;
			}

			if (phaseRef.current === 'pending' && pendingRef.current) {
				const p = pendingRef.current;
				const dist = Math.hypot(
					e.clientX - p.clientX,
					e.clientY - p.clientY
				);
				if (dist >= DRAG_THRESHOLD_PX) {
					lockTextSelection();
					const side = dragSideRef.current;
					const slot = slotElRef.current;
					let startAnchorXPx = (latest.current.x / 100) * rect.width;
					let startAnchorYPx = (latest.current.y / 100) * rect.height;
					if (slot && side) {
						const sr = slot.getBoundingClientRect();
						startAnchorXPx =
							side === 'left'
								? sr.left - rect.left
								: side === 'right'
									? sr.right - rect.left
									: sr.left - rect.left + sr.width / 2;
						startAnchorYPx = sr.top - rect.top + sr.height / 2;
					}
					dragStartRef.current = {
						startClientX: p.clientX,
						startClientY: p.clientY,
						startAnchorXPx,
						startAnchorYPx,
						side: side || 'left',
					};
					pendingRef.current = null;
					phaseRef.current = 'dragging';
					setIsDragging(true);
				} else {
					return;
				}
			}

			if (phaseRef.current !== 'dragging' || !dragStartRef.current) {
				return;
			}
			const d = dragStartRef.current;
			const dxPx = e.clientX - d.startClientX;
			const dyPx = e.clientY - d.startClientY;
			let anchorX = d.startAnchorXPx + dxPx;
			let anchorY = d.startAnchorYPx + dyPx;
			const snapStepX = (rect.width * GRID_STEP_PERCENT) / 100;
			const snapStepY = (rect.height * GRID_STEP_PERCENT) / 100;
			if (!e.shiftKey && snapStepX > 0) {
				anchorX = Math.round(anchorX / snapStepX) * snapStepX;
			}
			if (!e.shiftKey && snapStepY > 0) {
				anchorY = Math.round(anchorY / snapStepY) * snapStepY;
			}
			anchorX = Math.min(rect.width, Math.max(0, anchorX));
			anchorY = Math.min(rect.height, Math.max(0, anchorY));
			const rawX = Math.round((anchorX / rect.width) * 100);
			const nx = clampSlotXForAnchorSide(rawX, d.side);
			const ny = Math.round((anchorY / rect.height) * 100);

			lastDragPctRef.current = { x: nx, y: ny };
			setDragPreview({ x: nx, y: ny });
		},
		[mediaRef, lockTextSelection]
	);

	const windowPointerEnd = useCallback(() => {
		const wasDragging = phaseRef.current === 'dragging';
		if (wasDragging && lastDragPctRef.current) {
			suppressClickRef.current = true;
			onCommitRef.current(lastDragPctRef.current);
		}
		const pid = capturedPointerIdRef.current;
		capturedPointerIdRef.current = null;
		const captureEl = slotElRef.current;
		if (captureEl && typeof pid === 'number') {
			try {
				if (captureEl.hasPointerCapture(pid)) {
					captureEl.releasePointerCapture(pid);
				}
			} catch {
				// ignore
			}
		}
		phaseRef.current = 'idle';
		pendingRef.current = null;
		dragStartRef.current = null;
		dragSideRef.current = null;
		lastDragPctRef.current = null;
		setDragPreview(null);
		setIsDragging(false);
		detachWindowListeners();
		unlockTextSelection();
	}, [detachWindowListeners, unlockTextSelection]);

	const onHandlePointerDown = useCallback(
		(e, side) => {
			if (!buildMode || e.button !== 0) {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			if (phaseRef.current !== 'idle') {
				return;
			}
			onSelectRef.current();
			phaseRef.current = 'pending';
			dragSideRef.current = side;
			pendingRef.current = {
				clientX: e.clientX,
				clientY: e.clientY,
				pointerId: e.pointerId,
			};
			windowMoveRef.current = windowPointerMove;
			windowEndRef.current = windowPointerEnd;
			window.addEventListener('pointermove', windowPointerMove);
			window.addEventListener('pointerup', windowPointerEnd);
			window.addEventListener('pointercancel', windowPointerEnd);
			capturedPointerIdRef.current = null;
			try {
				if (e.currentTarget instanceof HTMLElement) {
					e.currentTarget.setPointerCapture(e.pointerId);
					capturedPointerIdRef.current = e.pointerId;
				}
			} catch {
				// ignore
			}
		},
		[buildMode, windowPointerMove, windowPointerEnd]
	);

	useEffect(
		() => () => {
			detachWindowListeners();
			unlockTextSelection();
			phaseRef.current = 'idle';
			setIsDragging(false);
		},
		[detachWindowListeners, unlockTextSelection]
	);

	const onMainClick = useCallback((e) => {
		e.stopPropagation();
		if (suppressClickRef.current) {
			suppressClickRef.current = false;
			return;
		}
		onSelectRef.current();
	}, []);

	const posX = dragPreview ? dragPreview.x : x;
	const posY = dragPreview ? dragPreview.y : y;

	return (
		<div
			ref={slotElRef}
			className={`modula-hover-builder-card__image-slot${
				selected ? ' is-selected' : ''
			}${buildMode ? ' is-build' : ''}${
				isDragging ? ' is-dragging' : ''
			}`}
			style={{
				left: `${posX}%`,
				top: `${posY}%`,
				'--modula-hover-slot-anchor-x': getSlotAnchorPercent(posX),
				'--modula-hover-slot-max-width': `${getSlotMaxWidthPercent(posX)}%`,
				textAlign: getSlotTextAlign(posX),
				zIndex,
			}}
		>
			<button
				ref={slotMainRef}
				type="button"
				className="modula-hover-builder-card__image-slot-main"
				aria-pressed={selected}
				aria-label={sprintf(
					/* translators: %s: slot name (title, caption, social) */
					__(
						'Select %s — use edge or center handles to move it on the image',
						'modula-best-grid-gallery'
					),
					label
				)}
				onClick={onMainClick}
			>
				{children}
			</button>
			{buildMode ? (
				<>
					<button
						type="button"
						className="modula-hover-builder-card__image-slot-handle modula-hover-builder-card__image-slot-handle--left"
						aria-label={sprintf(
							/* translators: %s: slot name (title, caption, social) */
							__(
								'Drag %s from the left edge',
								'modula-best-grid-gallery'
							),
							label
						)}
						onPointerDown={(e) => onHandlePointerDown(e, 'left')}
						onLostPointerCapture={windowPointerEnd}
					>
						<HoverSlotMoveGlyph />
					</button>
					<button
						type="button"
						className="modula-hover-builder-card__image-slot-handle modula-hover-builder-card__image-slot-handle--right"
						aria-label={sprintf(
							/* translators: %s: slot name (title, caption, social) */
							__(
								'Drag %s from the right edge',
								'modula-best-grid-gallery'
							),
							label
						)}
						onPointerDown={(e) => onHandlePointerDown(e, 'right')}
						onLostPointerCapture={windowPointerEnd}
					>
						<HoverSlotMoveGlyph />
					</button>
					<button
						type="button"
						className="modula-hover-builder-card__image-slot-handle modula-hover-builder-card__image-slot-handle--center"
						aria-label={sprintf(
							/* translators: %s: slot name (title, caption, social) */
							__(
								'Drag %s from the center (keeps text centered)',
								'modula-best-grid-gallery'
							),
							label
						)}
						onPointerDown={(e) => onHandlePointerDown(e, 'center')}
						onLostPointerCapture={windowPointerEnd}
					>
						<HoverSlotMoveGlyph />
					</button>
				</>
			) : null}
		</div>
	);
}
