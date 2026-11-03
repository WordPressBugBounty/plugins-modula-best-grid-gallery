import {
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '../button/Button';
import { CloseIcon, LockIcon } from '../icons/icons';
import { placeUpsellPopover } from './placeUpsellPopover';

/**
 * The small upsell a locked row or option opens (canvas "5 · Editor –
 * Lite"): a lock, what is locked and the plan line, then "Not now" and the
 * call to action, a link that opens in a new tab. It sits next to `anchor`
 * (`placeUpsellPopover`) with no dim, and the page stays usable.
 *
 * Opening moves focus to Close. Escape, Close and "Not now" return focus to
 * the anchor; a click outside (the anchor included) or Tab out of it leaves
 * focus where it went. Each of them calls `onClose`; the caller owns `open`.
 *
 * @param {Object}           props
 * @param {boolean}          props.open
 * @param {HTMLElement|null} props.anchor   The row or pill that opened it.
 * @param {string}           props.title    What is locked, e.g. "Zoom is part of Modula Business".
 * @param {string}           [props.line]   The plan line, e.g. "Included in Business".
 * @param {string}           props.ctaLabel
 * @param {string}           props.ctaHref
 * @param {Function}         props.onClose
 */
export function UpsellPopover({
	open,
	anchor,
	title,
	line = '',
	ctaLabel,
	ctaHref,
	onClose,
}) {
	const panelRef = useRef(null);
	const [position, setPosition] = useState(null);
	const id = useId();
	const titleId = `modula-admin-upsell-title-${id}`;
	const lineId = `modula-admin-upsell-line-${id}`;
	// The document listeners live while it is open; they read the latest callback.
	const onCloseRef = useRef(onClose);

	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);

	useLayoutEffect(() => {
		if (!open) {
			setPosition(null);
			return undefined;
		}
		const panel = panelRef.current;
		const view = panel.ownerDocument.defaultView;
		const place = () =>
			setPosition(
				placeUpsellPopover(
					anchor?.isConnected ? anchor.getBoundingClientRect() : null,
					{ width: panel.offsetWidth, height: panel.offsetHeight },
					{ width: view.innerWidth, height: view.innerHeight }
				)
			);
		place();
		// Scrolling the settings panel moves the anchor: follow it.
		view.addEventListener('resize', place);
		view.addEventListener('scroll', place, true);

		return () => {
			view.removeEventListener('resize', place);
			view.removeEventListener('scroll', place, true);
		};
		// New text changes its height, so it is placed again.
	}, [open, anchor, title, line]);

	const placed = position !== null;

	// Until it is placed it is hidden, and a hidden button takes no focus.
	useEffect(() => {
		if (open && placed) {
			panelRef.current
				.querySelector('[data-upsell-popover="close"]')
				.focus();
		}
	}, [open, placed]);

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const panel = panelRef.current;
		// The anchor counts as outside: a menu button opens its own menu, and
		// a pill clicked again opens the popover afresh.
		const closeOnOutsidePointer = (event) => {
			if (!panel.contains(event.target)) {
				onCloseRef.current();
			}
		};
		const doc = panel.ownerDocument;
		doc.addEventListener('pointerdown', closeOnOutsidePointer);

		return () =>
			doc.removeEventListener('pointerdown', closeOnOutsidePointer);
	}, [open]);

	if (!open) {
		return null;
	}

	const dismiss = () => {
		if (anchor?.isConnected) {
			anchor.focus();
		}
		onClose();
	};

	const onKeyDown = (event) => {
		if ('Escape' === event.key) {
			// Only the popover closes, not a dialog or panel around it.
			event.preventDefault();
			event.stopPropagation();
			dismiss();
		}
	};

	const onBlur = (event) => {
		const next = event.relatedTarget;
		// A null target (a click on plain page) is left to the pointer listener.
		if (next && !panelRef.current.contains(next)) {
			onClose();
		}
	};

	return (
		// A non-modal `<dialog open>`: window Escape handlers stand aside for
		// `dialog[open]` (isEventInOpenDialog). It closes on Escape and when
		// focus leaves it (APG dialog pattern).
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
		<dialog
			open
			ref={panelRef}
			aria-labelledby={titleId}
			aria-describedby={line ? lineId : undefined}
			className="modula-admin-upsell-popover"
			style={position ?? { visibility: 'hidden' }}
			onKeyDown={onKeyDown}
			onBlur={onBlur}
		>
			<div className="modula-admin-upsell-popover__head">
				<span
					className="modula-admin-upsell-popover__lock"
					aria-hidden="true"
				>
					<LockIcon />
				</span>
				<div className="modula-admin-upsell-popover__text">
					<h2
						id={titleId}
						className="modula-admin-upsell-popover__title"
					>
						{title}
					</h2>
					{line ? (
						<p
							id={lineId}
							className="modula-admin-upsell-popover__line"
						>
							{line}
						</p>
					) : null}
				</div>
				<button
					type="button"
					className="modula-admin-upsell-popover__close"
					data-upsell-popover="close"
					aria-label={__('Close', 'modula-best-grid-gallery')}
					onClick={dismiss}
				>
					<CloseIcon size={16} />
				</button>
			</div>
			<div className="modula-admin-upsell-popover__actions">
				<Button variant="link" onClick={dismiss}>
					{__('Not now', 'modula-best-grid-gallery')}
				</Button>
				<Button
					variant="primary"
					href={ctaHref}
					target="_blank"
					rel="noopener noreferrer"
				>
					{ctaLabel}
					<span className="modula-admin-sr-only">
						{__('(opens in a new tab)', 'modula-best-grid-gallery')}
					</span>
				</Button>
			</div>
		</dialog>
	);
}
