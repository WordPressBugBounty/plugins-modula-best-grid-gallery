/**
 * Compact-tile title/caption popover.
 * Desktop: hover anywhere on the tile — panel follows the cursor.
 * Touch: long-press the tile to show caption (short tap still opens lightbox).
 *
 * Cursor / press position updates mutate the portaled node directly to avoid
 * React re-render loops on mousemove.
 *
 * @param {Object}  props
 * @param {boolean} [props.showTitle]
 * @param {boolean} [props.showDescription]
 * @param {string}  [props.title]
 * @param {string}  [props.descriptionHtml]
 * @return {import('react').ReactElement|null}
 */
import {
	createPortal,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { useCoarsePointer } from '../hooks/useCompactCaptionTile';

const PANEL_OFFSET_PX = 14;
const PANEL_MAX_WIDTH_PX = 280;
const LONG_PRESS_MS = 480;
const LONG_PRESS_MOVE_PX = 12;

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {{ width: number, height: number }} size
 * @return {{ left: number, top: number }}
 */
function clampPanelPosition(clientX, clientY, size) {
	const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
	const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
	const width = size.width || PANEL_MAX_WIDTH_PX;
	const height = size.height || 80;
	let left = clientX + PANEL_OFFSET_PX;
	let top = clientY + PANEL_OFFSET_PX;
	if (left + width > vw - 8) {
		left = Math.max(8, clientX - width - PANEL_OFFSET_PX);
	}
	if (top + height > vh - 8) {
		top = Math.max(8, clientY - height - PANEL_OFFSET_PX);
	}
	return { left, top };
}

export default function GalleryItemCaptionPopover({
	showTitle = false,
	showDescription = false,
	title = '',
	descriptionHtml = '',
}) {
	const isTouch = useCoarsePointer();
	const [open, setOpen] = useState(false);
	const [panelNode, setPanelNode] = useState(null);
	const rootRef = useRef(null);
	const panelNodeRef = useRef(null);
	const panelSizeRef = useRef({ width: 0, height: 0 });
	const lastPointerRef = useRef({ x: 0, y: 0 });
	const longPressTimerRef = useRef(null);
	const longPressOriginRef = useRef({ x: 0, y: 0 });
	const suppressClickRef = useRef(false);
	const panelId = useId();

	const clearLongPressTimer = useCallback(() => {
		if (longPressTimerRef.current !== null) {
			window.clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
		}
	}, []);

	const setPanelRef = useCallback((node) => {
		panelNodeRef.current = node;
		setPanelNode(node);
	}, []);

	const applyPanelPosition = useCallback((clientX, clientY) => {
		lastPointerRef.current = { x: clientX, y: clientY };
		const node = panelNodeRef.current;
		if (!node) {
			return;
		}
		const { left, top } = clampPanelPosition(
			clientX,
			clientY,
			panelSizeRef.current
		);
		node.style.left = `${left}px`;
		node.style.top = `${top}px`;
	}, []);

	useLayoutEffect(() => {
		if (!open || !panelNode) {
			return undefined;
		}
		applyPanelPosition(lastPointerRef.current.x, lastPointerRef.current.y);
		const measure = () => {
			const rect = panelNode.getBoundingClientRect();
			const next = {
				width: Math.round(rect.width),
				height: Math.round(rect.height),
			};
			if (
				next.width === panelSizeRef.current.width &&
				next.height === panelSizeRef.current.height
			) {
				return;
			}
			panelSizeRef.current = next;
			applyPanelPosition(
				lastPointerRef.current.x,
				lastPointerRef.current.y
			);
		};
		measure();
		if (typeof ResizeObserver === 'undefined') {
			return undefined;
		}
		const observer = new ResizeObserver(measure);
		observer.observe(panelNode);
		return () => {
			observer.disconnect();
		};
	}, [open, panelNode, title, descriptionHtml, applyPanelPosition]);

	// Dismiss touch caption on outside tap.
	useEffect(() => {
		if (!isTouch || !open) {
			return undefined;
		}
		const onPointerDown = (event) => {
			const target = event.target;
			if (
				target instanceof Element &&
				target.closest('[data-modula-caption-popover]')
			) {
				return;
			}
			setOpen(false);
		};
		document.addEventListener('pointerdown', onPointerDown, true);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, true);
		};
	}, [isTouch, open]);

	// Desktop: whole-tile hover.
	useEffect(() => {
		if (isTouch) {
			return undefined;
		}
		const host = rootRef.current?.closest('.modula-item');
		if (!host) {
			return undefined;
		}
		const onEnter = (event) => {
			lastPointerRef.current = {
				x: event.clientX,
				y: event.clientY,
			};
			setOpen(true);
		};
		const onMove = (event) => {
			applyPanelPosition(event.clientX, event.clientY);
		};
		const onLeave = () => {
			setOpen(false);
		};
		host.addEventListener('mouseenter', onEnter);
		host.addEventListener('mousemove', onMove);
		host.addEventListener('mouseleave', onLeave);
		return () => {
			host.removeEventListener('mouseenter', onEnter);
			host.removeEventListener('mousemove', onMove);
			host.removeEventListener('mouseleave', onLeave);
		};
	}, [isTouch, applyPanelPosition]);

	// Touch: long-press on the tile (no permanent “i” button).
	useEffect(() => {
		if (!isTouch) {
			return undefined;
		}
		const host = rootRef.current?.closest('.modula-item');
		if (!host) {
			return undefined;
		}

		const onPointerDown = (event) => {
			if (event.pointerType === 'mouse') {
				return;
			}
			clearLongPressTimer();
			longPressOriginRef.current = {
				x: event.clientX,
				y: event.clientY,
			};
			lastPointerRef.current = {
				x: event.clientX,
				y: event.clientY,
			};
			longPressTimerRef.current = window.setTimeout(() => {
				longPressTimerRef.current = null;
				suppressClickRef.current = true;
				setOpen(true);
			}, LONG_PRESS_MS);
		};

		const onPointerMove = (event) => {
			if (longPressTimerRef.current === null) {
				return;
			}
			const dx = event.clientX - longPressOriginRef.current.x;
			const dy = event.clientY - longPressOriginRef.current.y;
			if (dx * dx + dy * dy > LONG_PRESS_MOVE_PX * LONG_PRESS_MOVE_PX) {
				clearLongPressTimer();
			}
		};

		const onPointerEnd = () => {
			clearLongPressTimer();
		};

		const onClickCapture = (event) => {
			if (!suppressClickRef.current) {
				return;
			}
			suppressClickRef.current = false;
			event.preventDefault();
			event.stopPropagation();
		};

		const onContextMenu = (event) => {
			if (open || suppressClickRef.current) {
				event.preventDefault();
			}
		};

		host.addEventListener('pointerdown', onPointerDown);
		host.addEventListener('pointermove', onPointerMove);
		host.addEventListener('pointerup', onPointerEnd);
		host.addEventListener('pointercancel', onPointerEnd);
		host.addEventListener('click', onClickCapture, true);
		host.addEventListener('contextmenu', onContextMenu);

		return () => {
			clearLongPressTimer();
			host.removeEventListener('pointerdown', onPointerDown);
			host.removeEventListener('pointermove', onPointerMove);
			host.removeEventListener('pointerup', onPointerEnd);
			host.removeEventListener('pointercancel', onPointerEnd);
			host.removeEventListener('click', onClickCapture, true);
			host.removeEventListener('contextmenu', onContextMenu);
		};
	}, [isTouch, open, clearLongPressTimer]);

	if (!showTitle && !showDescription) {
		return null;
	}

	const rootClass = [
		'modula-caption-popover',
		isTouch
			? 'modula-caption-popover--touch'
			: 'modula-caption-popover--hover',
		open ? 'is-open' : '',
	]
		.filter(Boolean)
		.join(' ');

	const panel = open
		? createPortal(
				<div
					ref={setPanelRef}
					id={panelId}
					className={[
						'modula-caption-popover__panel',
						'is-open',
						isTouch ? 'modula-caption-popover__panel--touch' : '',
					]
						.filter(Boolean)
						.join(' ')}
					data-modula-caption-popover=""
					role="tooltip"
					aria-label={__(
						'Image title and caption',
						'modula-best-grid-gallery'
					)}
					style={{ left: '0px', top: '0px' }}
				>
					{showTitle ? (
						<div className="modula-caption-popover__title jtg-title">
							{title}
						</div>
					) : null}
					{showDescription ? (
						<div
							className="modula-caption-popover__description description jtg-description"
							dangerouslySetInnerHTML={{
								__html: String(descriptionHtml),
							}}
						/>
					) : null}
				</div>,
				document.body
			)
		: null;

	return (
		<div
			ref={rootRef}
			className={rootClass}
			data-modula-caption-popover=""
			aria-hidden="true"
		>
			{panel}
		</div>
	);
}
