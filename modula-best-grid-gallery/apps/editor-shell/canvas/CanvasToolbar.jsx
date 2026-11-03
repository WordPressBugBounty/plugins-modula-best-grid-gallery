/**
 * Canvas toolbar above the artboard: document actions on the left, the Add
 * split on the right. The device switch floats on the canvas
 * (`CanvasDevicePill`, rendered by `TakeoverLayout`).
 */
import { Notice, Spinner } from 'admin-ui';

/**
 * Moves focus to the toolbar's first action (Done selecting in Selection
 * mode). A control that goes with the selection (Clear, or an action that
 * empties it) calls this before it disappears or turns disabled, so focus
 * stays in the toolbar.
 *
 * @param {Element} control A control inside the toolbar's actions.
 */
export function focusCanvasToolbarFirstAction(control) {
	control
		.closest('.modula-takeover__canvas-toolbar-left')
		?.querySelector('button')
		?.focus();
}

/**
 * @param {Object}                    props
 * @param {import('react').ReactNode} [props.actions]              Toolbar actions (`CanvasToolbarActionButton`s).
 * @param {string}                    [props.busyMessage]          Live status shown after the actions (e.g. upload progress).
 * @param {import('react').ReactNode} [props.addSplit]             Omitted when the document cannot add content in the current mode.
 * @param {string}                    [props.errorNotice]          Dismissible error above the toolbar row.
 * @param {() => void}                [props.onDismissErrorNotice]
 * @param {import('react').ReactNode} [props.children]             Non-visual helpers mounted with the toolbar (file inputs, dialogs).
 */
export default function CanvasToolbar({
	actions = null,
	busyMessage = '',
	addSplit = null,
	errorNotice = '',
	onDismissErrorNotice,
	children = null,
}) {
	return (
		<div className="modula-takeover__canvas-toolbar">
			{errorNotice ? (
				<Notice
					className="modula-takeover__canvas-toolbar-notice"
					tone="error"
					role="alert"
					onDismiss={onDismissErrorNotice}
				>
					{errorNotice}
				</Notice>
			) : null}
			{children}

			<div className="modula-takeover__canvas-toolbar-row">
				<div className="modula-takeover__canvas-toolbar-left">
					{actions}
					{busyMessage ? (
						<div
							className="modula-takeover__canvas-toolbar-uploading"
							role="status"
							aria-live="polite"
							aria-atomic="true"
						>
							<Spinner />
							<span>{busyMessage}</span>
						</div>
					) : null}
				</div>

				{addSplit ? (
					<div className="modula-takeover__canvas-toolbar-right">
						{addSplit}
					</div>
				) : null}
			</div>
		</div>
	);
}
