/**
 * Fixed-position prompt when navigating prev/next with unsaved gallery item edits.
 * Rendered above the gallery modal shell (z-index 1000001).
 */
import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { createPortal } from 'react-dom';
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';

/** Above `.modula-gallery-modal` (1000000). */
const NAV_UNSAVED_PROMPT_Z_INDEX = 1000001;

/**
 * @param {DOMRect} rect
 * @return {{ top: number, left: number }}
 */
function menuPositionFromAnchor(rect) {
	return {
		top: rect.bottom + 8,
		left: rect.left,
	};
}

/**
 * @param {Object}                       props
 * @param {HTMLElement|null}             props.anchorEl Button that opened the prompt.
 * @param {() => void}                   props.onClose
 * @param {() => void | Promise<void>}   props.onSaveAndContinue
 * @param {() => void}                   props.onContinueWithoutSaving
 * @param {boolean}                      props.busy
 */
export default function GalleryItemEditNavUnsavedPopover({
	anchorEl,
	onClose,
	onSaveAndContinue,
	onContinueWithoutSaving,
	busy,
}) {
	const menuRef = useRef(/** @type {HTMLDivElement|null} */ (null));
	const [menuPosition, setMenuPosition] = useState(
		/** @type {{ top: number, left: number } | null} */ (null)
	);

	useLayoutEffect(() => {
		if (!anchorEl) {
			setMenuPosition(null);
			return undefined;
		}
		const updatePosition = () => {
			setMenuPosition(
				menuPositionFromAnchor(anchorEl.getBoundingClientRect())
			);
		};
		updatePosition();
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		return () => {
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [anchorEl]);

	useEffect(() => {
		if (!anchorEl) {
			return undefined;
		}
		const onKey = (e) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [anchorEl, onClose]);

	useEffect(() => {
		if (!anchorEl) {
			return undefined;
		}
		const onDoc = (e) => {
			const target = e.target;
			if (!(target instanceof Node)) {
				return;
			}
			if (
				anchorEl.contains(target) ||
				menuRef.current?.contains(target)
			) {
				return;
			}
			onClose();
		};
		document.addEventListener('mousedown', onDoc, true);
		return () => document.removeEventListener('mousedown', onDoc, true);
	}, [anchorEl, onClose]);

	if (!anchorEl || !menuPosition || typeof document === 'undefined') {
		return null;
	}

	return createPortal(
		<div
			ref={menuRef}
			className="modula-gallery-item-edit-nav-unsaved-popover"
			role="dialog"
			aria-modal="false"
			aria-label={__('Unsaved changes', 'modula-best-grid-gallery')}
			style={{
				position: 'fixed',
				top: menuPosition.top,
				left: menuPosition.left,
				zIndex: NAV_UNSAVED_PROMPT_Z_INDEX,
			}}
		>
			<div className="modula-gallery-item-edit-nav-unsaved-popover__inner">
				<p className="modula-gallery-item-edit-nav-unsaved-popover__message">
					{__(
						'You have unsaved changes on this item.',
						'modula-best-grid-gallery'
					)}
				</p>
				<div className="modula-gallery-item-edit-nav-unsaved-popover__actions">
					<Button
						variant="primary"
						className="modula-gallery-item-edit-nav-unsaved-popover__action"
						onClick={() => void onSaveAndContinue()}
						isBusy={busy}
						disabled={busy}
					>
						{__('Save and continue', 'modula-best-grid-gallery')}
					</Button>
					<Button
						variant="secondary"
						className="modula-gallery-item-edit-nav-unsaved-popover__action"
						onClick={onContinueWithoutSaving}
						disabled={busy}
					>
						{__(
							'Continue without saving',
							'modula-best-grid-gallery'
						)}
					</Button>
				</div>
			</div>
		</div>,
		document.body
	);
}
