/**
 * The editor save control beside the save state: Save (and Cmd/Ctrl+S), plus
 * Retry after a failed save. It reads only the editor save session and renders
 * nothing in an editor that mounts none.
 */
import { useEffect, useLayoutEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { displayShortcut } from '@wordpress/keycodes';
import { Button } from 'admin-ui';
import { useEditorSaveSession } from '../save-status/EditorSaveSessionContext';

/**
 * @param {{ status: string, hasUnsavedChanges: boolean }} session
 * @return {boolean} Whether Save has anything to send now.
 */
function canSave(session) {
	return session.hasUnsavedChanges && session.status !== 'saving';
}

/**
 * @param {KeyboardEvent} event
 * @return {boolean} Cmd+S on macOS, Ctrl+S elsewhere, without Shift or Alt.
 */
function isSaveShortcut(event) {
	return (
		(event.metaKey || event.ctrlKey) &&
		!event.shiftKey &&
		!event.altKey &&
		String(event.key).toLowerCase() === 's'
	);
}

/**
 * Cmd/Ctrl+S saves while the session has unsaved changes. In the editor it
 * never opens the browser's save dialog, even with nothing to save; it also
 * works from a text field, as Save does.
 *
 * @param {ReturnType<typeof useEditorSaveSession>} session
 */
function useSaveShortcut(session) {
	const sessionRef = useRef(session);
	// The latest session for the key handler, kept out of render.
	useLayoutEffect(() => {
		sessionRef.current = session;
	}, [session]);
	const hasSession = Boolean(session);

	useEffect(() => {
		if (!hasSession) {
			return undefined;
		}
		const onKeyDown = (event) => {
			if (!isSaveShortcut(event)) {
				return;
			}
			event.preventDefault();
			const current = sessionRef.current;
			if (current && canSave(current)) {
				void current.save();
			}
		};
		window.addEventListener('keydown', onKeyDown, true);
		return () => window.removeEventListener('keydown', onKeyDown, true);
	}, [hasSession]);
}

export default function TopBarSaveControl() {
	const session = useEditorSaveSession();
	useSaveShortcut(session);
	if (!session) {
		return null;
	}

	return (
		<div className="modula-takeover__topbar-save">
			{session.status === 'error' ? (
				<Button
					variant="ghost"
					className="modula-takeover__topbar-save-retry"
					onClick={() => void session.retry()}
				>
					{__('Retry', 'modula-best-grid-gallery')}
				</Button>
			) : null}
			<Button
				variant="primary"
				className="modula-takeover__topbar-save-button"
				data-testid="editor-save"
				disabled={!canSave(session)}
				title={displayShortcut.primary('s')}
				onClick={() => void session.save()}
			>
				{__('Save', 'modula-best-grid-gallery')}
			</Button>
		</div>
	);
}
