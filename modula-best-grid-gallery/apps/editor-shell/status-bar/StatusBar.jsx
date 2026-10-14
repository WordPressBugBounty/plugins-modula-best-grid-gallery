/**
 * Canvas status bar — document facts (left) + last history step and undo/redo (right).
 */
import { Fragment } from '@wordpress/element';
import { Icon } from '@wordpress/icons';
import HistoryJumpControl from './HistoryJumpControl';
import { statusBarRedoIcon, statusBarUndoIcon } from './statusBarHistoryIcons';
import { getUndoRedoTitles } from './undoRedoTitles';

/**
 * Editor history as exposed by the owning editor's undo/redo stack.
 *
 * @typedef {Object} StatusBarHistory
 * @property {() => void}                 undo           Step back one entry.
 * @property {() => void}                 redo           Step forward one entry.
 * @property {boolean}                    canUndo        Whether a past entry exists.
 * @property {boolean}                    canRedo        Whether a future entry exists.
 * @property {string}                     lastStepLabel  Label of the current entry; empty hides the history control.
 * @property {string}                     undoStepLabel  Label of the entry Undo reverts.
 * @property {string}                     redoStepLabel  Label of the entry Redo reapplies.
 * @property {number}                     stackVersion   Changes whenever the stack changes.
 * @property {Array<Object>}              historyEntries Timeline rows (index, type, label, position, committedAt, change).
 * @property {(index: number) => unknown} jumpTo         Restore the entry at an index and drop later entries.
 * @property {number}                     undoableCount  Number of past entries.
 * @property {() => void}                 clearHistory   Empty the stack at the current entry.
 */

/**
 * @param {Object}                                           props
 * @param {string[]}                                         props.facts         Short document facts, already translated.
 * @param {StatusBarHistory}                                 props.history
 * @param {{ status: string, errorMessage?: string }}        props.saveStatus
 * @param {{ heading: string, clearConfirmMessage: string }} props.historyLabels History scope wording (e.g. Settings history).
 */
export default function StatusBar({
	facts,
	history,
	saveStatus,
	historyLabels,
}) {
	const { undoTitle, redoTitle } = getUndoRedoTitles(history);

	return (
		<div
			className="modula-takeover__status-bar"
			role="status"
			aria-live="polite"
		>
			<div className="modula-takeover__status-bar-facts">
				{facts.map((fact, index) => (
					<Fragment key={`${index}-${fact}`}>
						{index > 0 ? (
							<span
								className="modula-takeover__status-bar-sep"
								aria-hidden="true"
							>
								·
							</span>
						) : null}
						<span className="modula-takeover__status-bar-fact">
							{fact}
						</span>
					</Fragment>
				))}
			</div>
			<span
				className="modula-takeover__status-bar-spacer"
				aria-hidden="true"
			/>
			<div
				className="modula-takeover__status-bar-history"
				role="group"
				aria-label={historyLabels.heading}
			>
				<HistoryJumpControl
					history={history}
					saveStatus={saveStatus}
					labels={historyLabels}
				/>
				<button
					type="button"
					className="modula-takeover__status-bar-hbtn"
					aria-label={undoTitle}
					title={undoTitle}
					disabled={!history.canUndo}
					onClick={history.undo}
				>
					<Icon icon={statusBarUndoIcon} size={15} />
				</button>
				<button
					type="button"
					className="modula-takeover__status-bar-hbtn"
					aria-label={redoTitle}
					title={redoTitle}
					disabled={!history.canRedo}
					onClick={history.redo}
				>
					<Icon icon={statusBarRedoIcon} size={15} />
				</button>
			</div>
		</div>
	);
}
