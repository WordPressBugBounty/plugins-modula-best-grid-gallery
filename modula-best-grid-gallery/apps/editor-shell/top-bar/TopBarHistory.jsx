/**
 * Header column above the settings panel: the save state opens the History
 * popover (history jump), followed by Undo and Redo.
 */
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { displayShortcut } from '@wordpress/keycodes';
import { ConfirmDialog, Popover, usePopoverClose } from 'admin-ui';
import {
	formatHistoryRelativeTime,
	groupHistoryTimelineEntries,
} from '../history/historyTimeline';
import { historyIcon, redoIcon, undoIcon } from '../history/historyIcons';
import { getUndoRedoTitles } from '../history/undoRedoTitles';
import { useSaveStatusLabel } from './saveStatusLabel';
import { chevronDownIcon, closeIcon } from './topBarIcons';

/** `jumpTo` index of the document before any entry ("Original settings"). */
const ORIGINAL_HISTORY_INDEX = -1;

/** @typedef {import('../history/editorHistory').EditorHistory} EditorHistory */
/** @typedef {import('../history/editorHistory').HistoryLabels} HistoryLabels */

/**
 * @param {{ status: string }} saveStatus
 * @return {string} State modifier class for the save state.
 */
function saveStateClass({ status }) {
	if (status === 'error') {
		return 'is-error';
	}
	if (status === 'saving' || status === 'unsaved') {
		return 'is-busy';
	}
	return 'is-saved';
}

/**
 * @param {{ value: { kind: 'color', color: string } | { kind: 'text', text: string } | null | undefined }} props
 */
function HistoryValueChip({ value }) {
	if (!value) {
		return null;
	}
	if (value.kind === 'color') {
		return (
			<span
				className="modula-takeover__history-swatch"
				style={{ backgroundColor: value.color }}
				title={value.color}
				aria-label={value.color}
			/>
		);
	}
	return <span className="modula-takeover__history-value">{value.text}</span>;
}

/**
 * @param {{ entry: Object }} props
 */
function HistoryEntrySummary({ entry }) {
	const change = entry.change;
	if (entry.type === 'settings' && change?.mode === 'single') {
		return (
			<span className="modula-takeover__history-entry-main">
				<span className="modula-takeover__history-entry-field">
					{change.fieldLabel}
				</span>
				<span className="modula-takeover__history-entry-diff">
					<HistoryValueChip value={change.from} />
					<span aria-hidden="true">→</span>
					<HistoryValueChip value={change.to} />
				</span>
			</span>
		);
	}
	if (entry.type === 'settings' && change?.mode === 'multi') {
		return (
			<span className="modula-takeover__history-entry-main">
				{sprintf(
					/* translators: %d: number of settings changed in one undo step */
					__('%d settings changed', 'modula-best-grid-gallery'),
					change.count || 0
				)}
			</span>
		);
	}
	return (
		<span className="modula-takeover__history-entry-main">
			{entry.label}
		</span>
	);
}

/**
 * One timeline row; the current entry takes focus when the popover opens.
 *
 * @param {Object}     props
 * @param {Object}     props.entry     Timeline row (index, type, label, position, committedAt, change); the original-settings row has no committedAt, so no time.
 * @param {number}     props.frozenNow Clock the relative times are measured against.
 * @param {() => void} props.onSelect
 */
function HistoryTimelineEntry({ entry, frozenNow, onSelect }) {
	const isCurrent = entry.position === 'current';
	const relative = Number.isFinite(entry.committedAt)
		? formatHistoryRelativeTime(entry.committedAt, frozenNow)
		: '';

	return (
		<li>
			<button
				type="button"
				className={`modula-takeover__history-entry is-${entry.position}`}
				aria-current={isCurrent ? 'step' : undefined}
				data-autofocus={isCurrent ? 'true' : undefined}
				onClick={onSelect}
			>
				<span
					className="modula-takeover__history-node"
					aria-hidden="true"
				/>
				<span className="modula-takeover__history-entry-body">
					<span className="modula-takeover__history-entry-row">
						<HistoryEntrySummary entry={entry} />
						{isCurrent ? (
							<span className="modula-takeover__history-current">
								{__('Current', 'modula-best-grid-gallery')}
							</span>
						) : null}
					</span>
					{relative ? (
						<span className="modula-takeover__history-entry-time">
							{relative}
						</span>
					) : null}
				</span>
			</button>
		</li>
	);
}

/**
 * Popover body. Choosing an entry restores it and closes the popover;
 * Clear history closes it and asks for confirmation.
 *
 * @param {Object}        props
 * @param {EditorHistory} props.history
 * @param {HistoryLabels} props.labels
 * @param {string}        props.saveLabel
 * @param {() => void}    props.onClearRequest
 */
function HistoryPanel({ history, labels, saveLabel, onClearRequest }) {
	const closePopover = usePopoverClose();
	// Relative times stay frozen while the popover is open.
	const [frozenNow] = useState(() => Date.now());
	const groups = groupHistoryTimelineEntries(
		history.historyEntries,
		frozenNow
	);
	const undoableCount = history.undoableCount || 0;
	// The checkpoint before the first entry, so a clean document still shows
	// where it stands; choosing it restores the document as it opened (or as
	// Clear history left it).
	const originalEntry = {
		index: ORIGINAL_HISTORY_INDEX,
		label: __('Original settings', 'modula-best-grid-gallery'),
		position: undoableCount === 0 ? 'current' : 'past',
	};
	const selectEntry = (entry) => {
		if (entry.position !== 'current') {
			history.jumpTo(entry.index);
		}
		closePopover();
	};

	return (
		<>
			<div className="modula-takeover__history-header">
				<div>
					<h2 className="modula-takeover__history-heading">
						{labels.heading}
					</h2>
					<p className="modula-takeover__history-subtitle">
						{sprintf(
							/* translators: 1: undoable history step count, 2: save status label */
							__(
								'%1$d changes · %2$s',
								'modula-best-grid-gallery'
							),
							undoableCount,
							saveLabel
						)}
					</p>
				</div>
				<button
					type="button"
					className="modula-takeover__history-close"
					aria-label={__('Close history', 'modula-best-grid-gallery')}
					onClick={closePopover}
				>
					<Icon icon={closeIcon} size={14} />
				</button>
			</div>
			<div className="modula-takeover__history-timeline">
				<ul className="modula-takeover__history-list">
					<HistoryTimelineEntry
						entry={originalEntry}
						frozenNow={frozenNow}
						onSelect={() => selectEntry(originalEntry)}
					/>
				</ul>
				{groups.map((group) => (
					<section
						key={group.key}
						className="modula-takeover__history-group"
						aria-label={group.heading}
					>
						<h3 className="modula-takeover__history-group-heading">
							{group.heading}
						</h3>
						<ul className="modula-takeover__history-list">
							{group.entries.map((entry) => (
								<HistoryTimelineEntry
									key={`${entry.index}-${entry.label}`}
									entry={entry}
									frozenNow={frozenNow}
									onSelect={() => selectEntry(entry)}
								/>
							))}
						</ul>
					</section>
				))}
			</div>
			<div className="modula-takeover__history-footer">
				<span className="modula-takeover__history-shortcut">
					{sprintf(
						/* translators: %s: keyboard shortcut (⌘Z or Ctrl+Z) */
						__('%s to step back', 'modula-best-grid-gallery'),
						displayShortcut.primary('z')
					)}
				</span>
				<button
					type="button"
					className="modula-takeover__history-clear"
					disabled={undoableCount === 0}
					onClick={() => {
						closePopover();
						onClearRequest();
					}}
				>
					{__('Clear history', 'modula-best-grid-gallery')}
				</button>
			</div>
		</>
	);
}

/**
 * @param {Object}        props
 * @param {EditorHistory} props.history
 */
function UndoRedoButtons({ history }) {
	const { undoTitle, redoTitle } = getUndoRedoTitles(history);

	return (
		<div
			className="modula-takeover__topbar-undo-redo"
			role="group"
			aria-label={__('Undo and redo', 'modula-best-grid-gallery')}
		>
			<button
				type="button"
				className="modula-takeover__topbar-undo-redo-btn"
				aria-label={undoTitle}
				title={undoTitle}
				disabled={!history.canUndo}
				onClick={history.undo}
			>
				<Icon icon={undoIcon} size={18} />
			</button>
			<span
				className="modula-takeover__topbar-undo-redo-sep"
				aria-hidden="true"
			/>
			<button
				type="button"
				className="modula-takeover__topbar-undo-redo-btn"
				aria-label={redoTitle}
				title={redoTitle}
				disabled={!history.canRedo}
				onClick={history.redo}
			>
				<Icon icon={redoIcon} size={18} />
			</button>
		</div>
	);
}

/**
 * Without `history` (a document with no undo stack) only the save state shows.
 *
 * @param {Object}                                    props
 * @param {{ status: string, errorMessage?: string }} props.saveStatus
 * @param {EditorHistory|null}                        [props.history]
 * @param {HistoryLabels|null}                        [props.labels]   Required with `history`.
 */
export default function TopBarHistory({
	saveStatus,
	history = null,
	labels = null,
}) {
	const [open, setOpen] = useState(false);
	const [confirmClearOpen, setConfirmClearOpen] = useState(false);
	const saveLabel = useSaveStatusLabel(saveStatus);
	// `data-save-status` gives tests the state without depending on the copy.
	const saveState = (
		<span
			className="modula-takeover__topbar-save-status"
			data-save-status={saveStatus.status}
			aria-live="polite"
			aria-busy={saveStatus.status === 'saving'}
		>
			{saveLabel}
		</span>
	);

	if (!history) {
		return (
			<div className="modula-takeover__topbar-history">
				<span
					className={`modula-takeover__topbar-history-trigger ${saveStateClass(
						saveStatus
					)}`}
				>
					<Icon icon={historyIcon} size={15} />
					{saveState}
				</span>
			</div>
		);
	}

	// The popover opens on a clean document too: it then shows "Original settings".
	return (
		<div className="modula-takeover__topbar-history">
			<Popover
				open={open}
				onOpenChange={setOpen}
				label={labels.heading}
				className="modula-takeover__history-popover"
				trigger={(triggerProps) => (
					<button
						type="button"
						className={`modula-takeover__topbar-history-trigger ${saveStateClass(
							saveStatus
						)}`}
						{...triggerProps}
						title={labels.heading}
					>
						<Icon icon={historyIcon} size={15} />
						{saveState}
						<span className="modula-admin-sr-only">
							{labels.heading}
						</span>
						<Icon icon={chevronDownIcon} size={12} />
					</button>
				)}
			>
				<HistoryPanel
					history={history}
					labels={labels}
					saveLabel={saveLabel}
					onClearRequest={() => setConfirmClearOpen(true)}
				/>
			</Popover>
			<span className="modula-takeover__topbar-history-spacer" />
			<UndoRedoButtons history={history} />
			<ConfirmDialog
				open={confirmClearOpen}
				title={__('Clear history?', 'modula-best-grid-gallery')}
				message={labels.clearConfirmMessage}
				confirmLabel={__('Clear history', 'modula-best-grid-gallery')}
				onConfirm={() => {
					setConfirmClearOpen(false);
					history.clearHistory();
				}}
				onCancel={() => setConfirmClearOpen(false)}
			/>
		</div>
	);
}
