/**
 * The canvas toolbar's Sort (canvas "1 · Editor"): "Sort · <order> ⌄" opens a
 * popover with Sort by, where new items go, and the way into the editor's
 * reorder view. The editor owns its sort modes, their save, the Start/End
 * row and the reorder view; `useCanvasSortPopover` owns the popover's open
 * state and the hand-off to the reorder view.
 */
import { useCallback, useId, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { Button, ChoiceList, Notice, Popover } from 'admin-ui';
import CanvasToolbarActionButton from './CanvasToolbarActionButton';
import {
	canvasReorderIcon,
	canvasSortChevronIcon,
	canvasSortIcon,
} from './canvasSortIcons';

const TRIGGER_CLASS = 'modula-takeover__sort-trigger';

/**
 * @typedef {Object} CanvasSortPopoverState
 * @property {boolean}                            open                   Whether the popover is open.
 * @property {(next: boolean) => void}            setOpen                Opens or closes it.
 * @property {import('react').RefObject<Element>} rootRef                Holds the Sort button, which takes focus back.
 * @property {() => void}                         openReorder            Closes the popover and opens the reorder view.
 * @property {() => void}                         openReorderIfStillOpen The same, unless the popover was closed meanwhile.
 */

/**
 * @param {() => void} onOpenReorder Opens the editor's reorder view.
 * @return {CanvasSortPopoverState} For `CanvasSortPopover`'s `popover`.
 */
export function useCanvasSortPopover(onOpenReorder) {
	const [open, setOpen] = useState(false);
	// A manual sort's save resolves later; it reads whether the popover is
	// still open.
	const openRef = useRef(false);
	const rootRef = useRef(null);

	const setPopoverOpen = useCallback((next) => {
		openRef.current = next;
		setOpen(next);
	}, []);

	// The focused control unmounts with the popover, so focus goes back to
	// the Sort button, as on Escape.
	const openReorder = useCallback(() => {
		setPopoverOpen(false);
		rootRef.current?.querySelector(`.${TRIGGER_CLASS}`)?.focus();
		onOpenReorder();
	}, [onOpenReorder, setPopoverOpen]);

	// As with the old Sort & order panel: closed before the save resolved,
	// it opens nothing.
	const openReorderIfStillOpen = useCallback(() => {
		if (openRef.current) {
			openReorder();
		}
	}, [openReorder]);

	return {
		open,
		setOpen: setPopoverOpen,
		rootRef,
		openReorder,
		openReorderIfStillOpen,
	};
}

/**
 * @param {Object}                                                props
 * @param {CanvasSortPopoverState}                                props.popover          From `useCanvasSortPopover`.
 * @param {{ id: string, label: string, toolbarLabel: string }[]} props.sortModes        `label` in Sort by; `toolbarLabel` after "Sort ·".
 * @param {string}                                                props.currentMode      A `sortModes` id; anything else (not loaded yet) shows "Sort" alone and checks none.
 * @param {(mode: string) => void}                                props.onChoose         A click, Space or Enter on a mode; focus alone never chooses.
 * @param {import('react').ReactNode}                             props.insertPosition   The editor's Start/End row.
 * @param {boolean}                                               props.canReorder       Shows "Open drag-and-drop reorder".
 * @param {boolean}                                               [props.disabled]
 * @param {string}                                                [props.errorMessage]   The save's error, shown in the popover.
 * @param {() => void}                                            [props.onDismissError]
 * @param {import('react').ReactNode}                             [props.children]       The editor's reorder view (a dialog), beside the popover.
 */
export default function CanvasSortPopover({
	popover,
	sortModes,
	currentMode,
	onChoose,
	insertPosition,
	canReorder,
	disabled = false,
	errorMessage = '',
	onDismissError,
	children,
}) {
	const headingId = `modula-takeover-sort-heading-${useId()}`;
	const currentRow = sortModes.find((row) => row.id === currentMode);

	return (
		<span ref={popover.rootRef} className="modula-takeover__sort">
			<Popover
				open={popover.open}
				onOpenChange={popover.setOpen}
				label={__('Sort and order', 'modula-best-grid-gallery')}
				className="modula-takeover__sort-popover"
				trigger={(triggerProps) => (
					<CanvasToolbarActionButton
						icon={canvasSortIcon}
						disabled={disabled}
						className={TRIGGER_CLASS}
						{...triggerProps}
					>
						{__('Sort', 'modula-best-grid-gallery')}
						{currentRow ? (
							<>
								{' '}
								<span className="modula-takeover__sort-trigger-mode">
									· {currentRow.toolbarLabel}
								</span>
							</>
						) : null}
						<span
							className="modula-takeover__sort-trigger-chevron"
							aria-hidden="true"
						>
							<Icon icon={canvasSortChevronIcon} size={14} />
						</span>
					</CanvasToolbarActionButton>
				)}
			>
				{errorMessage ? (
					<Notice
						tone="error"
						role="alert"
						onDismiss={onDismissError}
						className="modula-takeover__sort-popover-notice"
					>
						{errorMessage}
					</Notice>
				) : null}
				<span
					id={headingId}
					className="modula-takeover__sort-popover-heading"
				>
					{__('Sort by', 'modula-best-grid-gallery')}
				</span>
				<ChoiceList
					aria-labelledby={headingId}
					options={sortModes.map((row) => ({
						value: row.id,
						label: row.label,
					}))}
					value={currentMode}
					onChange={onChoose}
				/>
				<div className="modula-takeover__sort-popover-insert">
					{insertPosition}
				</div>
				{canReorder ? (
					<div className="modula-takeover__sort-popover-reorder">
						<Button
							variant="primary"
							icon={<Icon icon={canvasReorderIcon} size={16} />}
							onClick={popover.openReorder}
						>
							{__(
								'Open drag-and-drop reorder',
								'modula-best-grid-gallery'
							)}
						</Button>
					</div>
				) : null}
			</Popover>
			{children}
		</span>
	);
}
