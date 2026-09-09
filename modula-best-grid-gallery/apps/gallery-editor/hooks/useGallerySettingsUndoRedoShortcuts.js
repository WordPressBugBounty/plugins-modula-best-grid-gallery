import { useEffect, useRef } from '@wordpress/element';
import { useGallerySettingsFormBundle } from '../form/GallerySettingsFormContext';
import { isModulaSettingsCommandPaletteKeyScope } from '../utils/isModulaSettingsCommandPaletteKeyScope';

function isTextEditingTarget(target) {
	if (!target || typeof target !== 'object') {
		return false;
	}
	const node = /** @type {{ nodeType?: number; tagName?: string }} */ (
		target
	);
	if (node.nodeType !== 1 || !node.tagName) {
		return false;
	}
	const tag = String(node.tagName);
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
		return true;
	}
	return Boolean(node.isContentEditable);
}

/**
 * Ctrl/Cmd+Z undo, Shift+Ctrl/Cmd+Z (and Ctrl+Y) redo when focus is not in a native text field.
 *
 * `useEffect` + `document.addEventListener` is appropriate here (global keyboard scope + cleanup),
 * not a “sync state from props” anti-pattern — see React docs / use-effect-killer “Legitimate usages”.
 */
export function useGallerySettingsUndoRedoShortcuts() {
	const { undoRedo } = useGallerySettingsFormBundle();
	const undoRedoRef = useRef(undoRedo);
	undoRedoRef.current = undoRedo;

	useEffect(() => {
		const onKey = (e) => {
			if (!isModulaSettingsCommandPaletteKeyScope(e.target)) {
				return;
			}
			if (isTextEditingTarget(e.target)) {
				return;
			}
			const ur = undoRedoRef.current;
			/* Windows-style redo */
			if (
				e.ctrlKey &&
				!e.metaKey &&
				!e.shiftKey &&
				!e.altKey &&
				(e.key === 'y' || e.key === 'Y')
			) {
				if (!ur.canRedo) {
					return;
				}
				e.preventDefault();
				e.stopPropagation();
				ur.redo();
				return;
			}
			const mod = e.metaKey || e.ctrlKey;
			if (!mod) {
				return;
			}
			const k = String(e.key).toLowerCase();
			if (k !== 'z') {
				return;
			}
			if (e.altKey) {
				return;
			}
			if (e.shiftKey) {
				if (!ur.canRedo) {
					return;
				}
				e.preventDefault();
				e.stopPropagation();
				ur.redo();
				return;
			}
			if (!ur.canUndo) {
				return;
			}
			e.preventDefault();
			e.stopPropagation();
			ur.undo();
		};
		document.addEventListener('keydown', onKey, true);
		return () => document.removeEventListener('keydown', onKey, true);
	}, []);
}
