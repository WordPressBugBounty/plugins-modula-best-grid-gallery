/**
 * Status-bar last-step control → history timeline popover.
 */
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { displayShortcut } from '@wordpress/keycodes';
import { __experimentalConfirmDialog as ConfirmDialog } from '@wordpress/components';
import {
	formatHistoryRelativeTime,
	groupHistoryTimelineEntries,
} from './historyTimeline';
import { statusBarRedoIcon, statusBarUndoIcon } from './statusBarHistoryIcons';
import { getUndoRedoTitles } from './undoRedoTitles';
import { getSaveStatusLabel } from '../top-bar/saveStatusLabel';

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
				className="modula-takeover__status-bar-history-swatch"
				style={{ backgroundColor: value.color }}
				title={value.color}
				aria-label={value.color}
			/>
		);
	}
	return (
		<span className="modula-takeover__status-bar-history-value">
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
			<span className="modula-takeover__status-bar-history-entry-main">
				<span className="modula-takeover__status-bar-history-entry-field">
					{change.fieldLabel}
				</span>
				<span className="modula-takeover__status-bar-history-entry-diff">
					<HistoryValueChip value={change.from} />
					<span
						className="modula-takeover__status-bar-history-entry-arrow"
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
			<span className="modula-takeover__status-bar-history-entry-main">
				{sprintf(
					/* translators: %d: number of settings changed in one undo step */
					__('%d settings changed', 'modula-best-grid-gallery'),
					change.count || 0
				)}
			</span>
		);
	} else {
		body = (
			<span className="modula-takeover__status-bar-history-entry-main">
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
						? 'modula-takeover__status-bar-history-entry is-current'
						: `modula-takeover__status-bar-history-entry is-${entry.position}`
				}
				aria-current={isCurrent ? 'step' : undefined}
				onClick={onSelect}
			>
				<span
					className="modula-takeover__status-bar-history-node"
					aria-hidden="true"
				/>
				<span className="modula-takeover__status-bar-history-entry-body">
					<span className="modula-takeover__status-bar-history-entry-row">
						{body}
						{isCurrent ? (
							<span className="modula-takeover__status-bar-history-current-badge">
								{__('Current', 'modula-best-grid-gallery')}
							</span>
						) : null}
					</span>
					{relative ? (
						<span className="modula-takeover__status-bar-history-entry-time">
							{relative}
						</span>
					) : null}
				</span>
			</button>
		</li>
	);
}

/**
 * @param {Object}                                           props
 * @param {import('./StatusBar').StatusBarHistory}           props.history
 * @param {{ status: string, errorMessage?: string }}        props.saveStatus
 * @param {{ heading: string, clearConfirmMessage: string }} props.labels
 */
export default function HistoryJumpControl({ history, saveStatus, labels }) {
	const {
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
	} = history;
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

	const saveLabel = getSaveStatusLabel(saveStatus);

	const subtitle = sprintf(
		/* translators: 1: undoable history step count, 2: save status label */
		__('%1$d changes · %2$s', 'modula-best-grid-gallery'),
		n,
		saveLabel
	);

	const { undoTitle, redoTitle } = getUndoRedoTitles({
		undoStepLabel,
		redoStepLabel,
		canRedo,
	});

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
		<div ref={wrapRef} className="modula-takeover__status-bar-jump">
			<button
				type="button"
				ref={triggerRef}
				key={`step-${stackVersion}-${lastStepLabel}`}
				className="modula-takeover__status-bar-step"
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
					className="modula-takeover__status-bar-history-popover"
					role="dialog"
					aria-labelledby={headingId}
				>
					<header className="modula-takeover__status-bar-history-popover-header">
						<div className="modula-takeover__status-bar-history-popover-title-row">
							<h2
								id={headingId}
								className="modula-takeover__status-bar-history-popover-heading"
							>
								{labels.heading}
							</h2>
							<div
								className="modula-takeover__status-bar-history-popover-actions"
								role="group"
								aria-label={__(
									'Undo and redo',
									'modula-best-grid-gallery'
								)}
							>
								<button
									type="button"
									className="modula-takeover__status-bar-hbtn"
									aria-label={undoTitle}
									title={undoTitle}
									disabled={!canUndo}
									onClick={undo}
								>
									<Icon icon={statusBarUndoIcon} size={15} />
								</button>
								<button
									type="button"
									className="modula-takeover__status-bar-hbtn"
									aria-label={redoTitle}
									title={redoTitle}
									disabled={!canRedo}
									onClick={redo}
								>
									<Icon icon={statusBarRedoIcon} size={15} />
								</button>
							</div>
						</div>
						<p className="modula-takeover__status-bar-history-popover-subtitle">
							{subtitle}
						</p>
					</header>
					<div className="modula-takeover__status-bar-history-timeline">
						{groups.map((group) => (
							<section
								key={group.key}
								className="modula-takeover__status-bar-history-group"
								aria-label={group.heading}
							>
								<h3 className="modula-takeover__status-bar-history-group-heading">
									{group.heading}
								</h3>
								<ul className="modula-takeover__status-bar-history-list">
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
					<footer className="modula-takeover__status-bar-history-popover-footer">
						<span className="modula-takeover__status-bar-history-shortcut">
							{shortcutHint}
						</span>
						<button
							type="button"
							className="modula-takeover__status-bar-history-clear"
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
				{labels.clearConfirmMessage}
			</ConfirmDialog>
		</div>
	);
}
