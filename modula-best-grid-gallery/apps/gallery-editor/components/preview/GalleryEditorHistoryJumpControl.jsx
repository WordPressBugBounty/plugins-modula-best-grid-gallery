/**
 * Status-bar last-step control → Settings history timeline popover.
 */
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { displayShortcut } from '@wordpress/keycodes';
import { __experimentalConfirmDialog as ConfirmDialog } from '@wordpress/components';
import { useTakeoverSaveStatus } from '../../context/TakeoverSaveStatusContext';
import {
	formatHistoryRelativeTime,
	groupHistoryTimelineEntries,
} from '../../utils/galleryEditorHistoryPresentation';
import {
	statusBarRedoIcon,
	statusBarUndoIcon,
} from '../../utils/statusBarHistoryIcons';

/**
 * @param {{ kind: 'color', color: string } | { kind: 'text', text: string } | null | undefined} value
 */
function HistoryValueChip({ value }) {
	if (!value) {
		return null;
	}
	if (value.kind === 'color') {
		return (
			<span
				className="modula-gallery-takeover__status-bar-history-swatch"
				style={{ backgroundColor: value.color }}
				title={value.color}
				aria-label={value.color}
			/>
		);
	}
	return (
		<span className="modula-gallery-takeover__status-bar-history-value">
			{value.text}
		</span>
	);
}

/**
 * @param {{
 *   entry: {
 *     index: number,
 *     type: 'settings'|'layout',
 *     label: string,
 *     position: 'past'|'current'|'future',
 *     committedAt?: number,
 *     change?: {
 *       mode: 'single'|'multi',
 *       fieldLabel?: string,
 *       count?: number,
 *       from?: { kind: 'color', color: string } | { kind: 'text', text: string },
 *       to?: { kind: 'color', color: string } | { kind: 'text', text: string },
 *     },
 *   },
 *   frozenNow: number,
 *   buttonRef?: import('react').Ref<HTMLButtonElement>,
 *   onSelect: () => void,
 * }} props
 */
function HistoryTimelineEntry({ entry, frozenNow, buttonRef, onSelect }) {
	const isCurrent = entry.position === 'current';
	const change = entry.change;
	const relative = formatHistoryRelativeTime(
		Number.isFinite(entry.committedAt) ? entry.committedAt : frozenNow,
		frozenNow
	);

	let body = null;
	if (entry.type === 'settings' && change?.mode === 'single') {
		body = (
			<span className="modula-gallery-takeover__status-bar-history-entry-main">
				<span className="modula-gallery-takeover__status-bar-history-entry-field">
					{change.fieldLabel}
				</span>
				<span className="modula-gallery-takeover__status-bar-history-entry-diff">
					<HistoryValueChip value={change.from} />
					<span
						className="modula-gallery-takeover__status-bar-history-entry-arrow"
						aria-hidden="true"
					>
						→
					</span>
					<HistoryValueChip value={change.to} />
				</span>
			</span>
		);
	} else if (entry.type === 'settings' && change?.mode === 'multi') {
		body = (
			<span className="modula-gallery-takeover__status-bar-history-entry-main">
				{sprintf(
					/* translators: %d: number of settings changed in one undo step */
					__('%d settings changed', 'modula-best-grid-gallery'),
					change.count || 0
				)}
			</span>
		);
	} else {
		body = (
			<span className="modula-gallery-takeover__status-bar-history-entry-main">
				{entry.label}
			</span>
		);
	}

	return (
		<li>
			<button
				type="button"
				ref={buttonRef}
				className={
					isCurrent
						? 'modula-gallery-takeover__status-bar-history-entry is-current'
						: `modula-gallery-takeover__status-bar-history-entry is-${entry.position}`
				}
				aria-current={isCurrent ? 'step' : undefined}
				onClick={onSelect}
			>
				<span
					className="modula-gallery-takeover__status-bar-history-node"
					aria-hidden="true"
				/>
				<span className="modula-gallery-takeover__status-bar-history-entry-body">
					<span className="modula-gallery-takeover__status-bar-history-entry-row">
						{body}
						{isCurrent ? (
							<span className="modula-gallery-takeover__status-bar-history-current-badge">
								{__('Current', 'modula-best-grid-gallery')}
							</span>
						) : null}
					</span>
					{relative ? (
						<span className="modula-gallery-takeover__status-bar-history-entry-time">
							{relative}
						</span>
					) : null}
				</span>
			</button>
		</li>
	);
}

/**
 * @param {{
 *   lastStepLabel: string,
 *   stackVersion: number,
 *   historyEntries: Array<{
 *     index: number,
 *     type: 'settings'|'layout',
 *     label: string,
 *     position: 'past'|'current'|'future',
 *     committedAt?: number,
 *     change?: unknown,
 *   }>,
 *   jumpTo: (index: number) => unknown,
 *   undo: () => void,
 *   redo: () => void,
 *   canUndo: boolean,
 *   canRedo: boolean,
 *   undoStepLabel: string,
 *   redoStepLabel: string,
 *   undoableCount: number,
 *   clearHistory: () => void,
 * }} props
 */
export default function GalleryEditorHistoryJumpControl({
	lastStepLabel,
	stackVersion,
	historyEntries,
	jumpTo,
	undo,
	redo,
	canUndo,
	canRedo,
	undoStepLabel,
	redoStepLabel,
	undoableCount,
	clearHistory,
}) {
	const [open, setOpen] = useState(false);
	const [frozenNow, setFrozenNow] = useState(() => Date.now());
	const [confirmClearOpen, setConfirmClearOpen] = useState(false);
	const wrapRef = useRef(/** @type {HTMLDivElement|null} */ (null));
	const triggerRef = useRef(/** @type {HTMLButtonElement|null} */ (null));
	const currentEntryRef = useRef(
		/** @type {HTMLButtonElement|null} */ (null)
	);
	const dialogId = useId();
	const headingId = `${dialogId}-heading`;
	const { status, errorMessage } = useTakeoverSaveStatus();

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		setFrozenNow(Date.now());
	}, [open]);

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const focusTimer = window.setTimeout(() => {
			currentEntryRef.current?.focus();
		}, 0);
		const onDoc = (e) => {
			if (confirmClearOpen) {
				return;
			}
			const el = wrapRef.current;
			if (el && e.target instanceof Node && !el.contains(e.target)) {
				setOpen(false);
			}
		};
		const onKey = (e) => {
			if (e.key === 'Escape') {
				if (confirmClearOpen) {
					return;
				}
				setOpen(false);
				triggerRef.current?.focus();
			}
		};
		const t = window.setTimeout(() => {
			document.addEventListener('mousedown', onDoc, true);
			document.addEventListener('keydown', onKey);
		}, 0);
		return () => {
			window.clearTimeout(focusTimer);
			window.clearTimeout(t);
			document.removeEventListener('mousedown', onDoc, true);
			document.removeEventListener('keydown', onKey);
		};
	}, [open, confirmClearOpen]);

	if (!lastStepLabel) {
		return null;
	}

	const entries = Array.isArray(historyEntries) ? historyEntries : [];
	const groups = groupHistoryTimelineEntries(entries, frozenNow);
	const n = typeof undoableCount === 'number' ? undoableCount : 0;

	let saveLabel = __('Saved', 'modula-best-grid-gallery');
	if (status === 'error' && errorMessage) {
		saveLabel = errorMessage;
	} else if (status === 'saving') {
		saveLabel = __('Saving…', 'modula-best-grid-gallery');
	} else if (status === 'unsaved') {
		saveLabel = __('Unsaved changes', 'modula-best-grid-gallery');
	}

	const subtitle = sprintf(
		/* translators: 1: undoable history step count, 2: save status label */
		__('%1$d changes · %2$s', 'modula-best-grid-gallery'),
		n,
		saveLabel
	);

	const undoTitle = undoStepLabel
		? sprintf(
				/* translators: %s: description of the settings change to undo */
				__('Undo: %s', 'modula-best-grid-gallery'),
				undoStepLabel
			)
		: __('Undo', 'modula-best-grid-gallery');
	const redoTitle = redoStepLabel
		? sprintf(
				/* translators: %s: description of the settings change to redo */
				__('Redo: %s', 'modula-best-grid-gallery'),
				redoStepLabel
			)
		: canRedo
			? __('Redo', 'modula-best-grid-gallery')
			: __('Nothing to redo', 'modula-best-grid-gallery');

	const shortcut = displayShortcut.primary('z');
	const shortcutHint = sprintf(
		/* translators: %s: keyboard shortcut (⌘Z or Ctrl+Z) */
		__('%s to step back', 'modula-best-grid-gallery'),
		shortcut
	);

	const closePopover = () => {
		setOpen(false);
		triggerRef.current?.focus();
	};

	return (
		<div ref={wrapRef} className="modula-gallery-takeover__status-bar-jump">
			<button
				type="button"
				ref={triggerRef}
				key={`step-${stackVersion}-${lastStepLabel}`}
				className="modula-gallery-takeover__status-bar-step"
				aria-expanded={open}
				aria-haspopup="dialog"
				aria-controls={open ? dialogId : undefined}
				title={lastStepLabel}
				onClick={() => setOpen((v) => !v)}
			>
				{lastStepLabel}
			</button>
			{open && entries.length > 0 ? (
				<div
					id={dialogId}
					className="modula-gallery-takeover__status-bar-history-popover"
					role="dialog"
					aria-labelledby={headingId}
				>
					<header className="modula-gallery-takeover__status-bar-history-popover-header">
						<div className="modula-gallery-takeover__status-bar-history-popover-title-row">
							<h2
								id={headingId}
								className="modula-gallery-takeover__status-bar-history-popover-heading"
							>
								{__(
									'Settings history',
									'modula-best-grid-gallery'
								)}
							</h2>
							<div
								className="modula-gallery-takeover__status-bar-history-popover-actions"
								role="group"
								aria-label={__(
									'Undo and redo',
									'modula-best-grid-gallery'
								)}
							>
								<button
									type="button"
									className="modula-gallery-takeover__status-bar-hbtn"
									aria-label={undoTitle}
									title={undoTitle}
									disabled={!canUndo}
									onClick={undo}
								>
									<Icon icon={statusBarUndoIcon} size={15} />
								</button>
								<button
									type="button"
									className="modula-gallery-takeover__status-bar-hbtn"
									aria-label={redoTitle}
									title={redoTitle}
									disabled={!canRedo}
									onClick={redo}
								>
									<Icon icon={statusBarRedoIcon} size={15} />
								</button>
							</div>
						</div>
						<p className="modula-gallery-takeover__status-bar-history-popover-subtitle">
							{subtitle}
						</p>
					</header>
					<div className="modula-gallery-takeover__status-bar-history-timeline">
						{groups.map((group) => (
							<section
								key={group.key}
								className="modula-gallery-takeover__status-bar-history-group"
								aria-label={group.heading}
							>
								<h3 className="modula-gallery-takeover__status-bar-history-group-heading">
									{group.heading}
								</h3>
								<ul className="modula-gallery-takeover__status-bar-history-list">
									{group.entries.map((entry) => {
										const isCurrent =
											entry.position === 'current';
										return (
											<HistoryTimelineEntry
												key={`${entry.index}-${entry.label}`}
												entry={entry}
												frozenNow={frozenNow}
												buttonRef={
													isCurrent
														? currentEntryRef
														: undefined
												}
												onSelect={() => {
													if (isCurrent) {
														closePopover();
														return;
													}
													jumpTo(entry.index);
													closePopover();
												}}
											/>
										);
									})}
								</ul>
							</section>
						))}
					</div>
					<footer className="modula-gallery-takeover__status-bar-history-popover-footer">
						<span className="modula-gallery-takeover__status-bar-history-shortcut">
							{shortcutHint}
						</span>
						<button
							type="button"
							className="modula-gallery-takeover__status-bar-history-clear"
							disabled={n === 0}
							onClick={() => setConfirmClearOpen(true)}
						>
							{__('Clear history', 'modula-best-grid-gallery')}
						</button>
					</footer>
				</div>
			) : null}
			<ConfirmDialog
				isOpen={confirmClearOpen}
				onConfirm={() => {
					setConfirmClearOpen(false);
					clearHistory();
					closePopover();
				}}
				onCancel={() => setConfirmClearOpen(false)}
				confirmButtonText={__(
					'Clear history',
					'modula-best-grid-gallery'
				)}
			>
				{__(
					'Clear settings history? Past and future steps are removed. Your current settings stay as they are.',
					'modula-best-grid-gallery'
				)}
			</ConfirmDialog>
		</div>
	);
}
