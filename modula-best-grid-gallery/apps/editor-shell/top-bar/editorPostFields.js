/**
 * An editor document's post fields, title and status, as a part of the editor
 * save session (ADR 0059). A rename or a status choice shows at once and stays
 * an unsaved change until the editor save writes it. The gallery editor and
 * the Albums editor share this model.
 *
 * A new document is an auto-draft until its first editor save. That save
 * always writes both fields, first (the editor's first-save order): the status
 * shown in the menu (what the server would promote the auto-draft to, from the
 * editor config's `postFirstSave`) and the title, or the server's fallback
 * title when the author kept the placeholder. So the document leaves
 * auto-draft with the chosen status before any content write could promote it.
 */
import { isAllowedEditorDocumentStatus } from './editorPostDocument';

/**
 * @typedef {Object} EditorPostFieldsSnapshot
 * @property {string} title       Title shown in the top bar, as typed.
 * @property {string} status      Status shown in the menu.
 * @property {string} statusLabel Its label.
 */

/**
 * @typedef {Object} EditorPostFieldsRequest
 * @property {string} [title]  Trimmed title to store.
 * @property {string} [status] Editor document status to store.
 */

/**
 * @param {string}                                    status
 * @param {string}                                    fallback
 * @param {Array<{ value?: string, label?: string }>} choices
 * @return {string} The menu label of `status`.
 */
function labelOf(status, fallback, choices) {
	const row = Array.isArray(choices)
		? choices.find((choice) => choice?.value === status)
		: null;
	return typeof row?.label === 'string' && row.label !== ''
		? row.label
		: fallback || status;
}

/**
 * @param {Object}                                    args
 * @param {string}                                    args.title         Title the editor opened with.
 * @param {string}                                    args.status        Stored status (`auto-draft` for a new document).
 * @param {string}                                    args.statusLabel   Its label.
 * @param {Array<{ value?: string, label?: string }>} args.statusChoices Status menu rows.
 * @param {{ title: string, status: string }|null}    args.firstSave     What the first save stores without edits; null once the document was saved.
 * @return {Object} Post fields: `getSnapshot`, `subscribe`, `setTitle`, `commitTitle`, `setStatus`, `hasUnsavedChanges`, `getRecoverySnapshot`, `restoreRecoverySnapshot`, `isNeverSaved`, `save`.
 */
export function createEditorPostFields({
	title,
	status,
	statusLabel,
	statusChoices,
	firstSave,
}) {
	let neverSaved = Boolean(firstSave);
	const fallbackTitle = String(firstSave?.title ?? '');
	// A filtered promote status the editor menu cannot write (e.g. pending) falls back to Draft, never public.
	const firstSaveStatus = isAllowedEditorDocumentStatus(firstSave?.status)
		? firstSave.status
		: 'draft';
	const openingStatus = neverSaved ? firstSaveStatus : String(status || '');

	/** The stored values, or for a never-saved document what it opened with. */
	const saved = {
		title: String(title || ''),
		status: openingStatus,
	};
	/** @type {EditorPostFieldsSnapshot} */
	let snapshot = {
		title: saved.title,
		status: openingStatus,
		statusLabel: labelOf(
			openingStatus,
			neverSaved ? '' : statusLabel,
			statusChoices
		),
	};
	const listeners = new Set();

	/** @param {Partial<EditorPostFieldsSnapshot>} next */
	function update(next) {
		const merged = { ...snapshot, ...next };
		if (
			merged.title === snapshot.title &&
			merged.status === snapshot.status &&
			merged.statusLabel === snapshot.statusLabel
		) {
			return;
		}
		snapshot = merged;
		listeners.forEach((listener) => listener());
	}

	/** @return {boolean} Whether the trimmed title is a rename; an empty one is not. */
	function isTitleChanged() {
		const typed = snapshot.title.trim();
		return typed !== '' && typed !== saved.title.trim();
	}

	function isStatusChanged() {
		return snapshot.status !== saved.status;
	}

	/** @return {EditorPostFieldsRequest} What the next save writes; empty when nothing. */
	function buildRequest() {
		if (neverSaved) {
			return {
				title: isTitleChanged() ? snapshot.title.trim() : fallbackTitle,
				status: snapshot.status,
			};
		}
		/** @type {EditorPostFieldsRequest} */
		const request = {};
		if (isTitleChanged()) {
			request.title = snapshot.title.trim();
		}
		if (isStatusChanged()) {
			request.status = snapshot.status;
		}
		return request;
	}

	return {
		/** @return {EditorPostFieldsSnapshot} The shown fields; a new object after each change. */
		getSnapshot: () => snapshot,

		/**
		 * @param {() => void} listener Called when the shown fields change.
		 * @return {() => void} Unsubscribes.
		 */
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},

		/** @param {string} value Title as typed. */
		setTitle(value) {
			update({ title: String(value ?? '') });
		},

		/**
		 * End a rename: trims it, or puts the saved title back when it is empty.
		 *
		 * @param {string} [value] Title from the field; the typed one when omitted.
		 */
		commitTitle(value) {
			const typed = (
				typeof value === 'string' ? value : snapshot.title
			).trim();
			update({ title: typed === '' ? saved.title : typed });
		},

		/**
		 * @param {string} slug  An editor document status.
		 * @param {string} label Its menu label.
		 */
		setStatus(slug, label) {
			if (!isAllowedEditorDocumentStatus(slug)) {
				return;
			}
			update({
				status: slug,
				statusLabel: labelOf(slug, label, statusChoices),
			});
		},

		hasUnsavedChanges: () => isTitleChanged() || isStatusChanged(),

		/** @return {{ title: string, status: string }} The shown fields, for the recovery copy. */
		getRecoverySnapshot: () => ({
			title: snapshot.title,
			status: snapshot.status,
		}),

		/**
		 * Restore: show the copied title and status as unsaved changes. The
		 * saved fields and whether the document was ever saved come from the
		 * server (`postFirstSave`), never from the copy. A field the copy does
		 * not hold in a usable form is left as it is.
		 *
		 * @param {unknown} copied `{ title, status }` from `getRecoverySnapshot`.
		 */
		restoreRecoverySnapshot(copied) {
			if (typeof copied?.title === 'string') {
				update({ title: copied.title });
			}
			if (isAllowedEditorDocumentStatus(copied?.status)) {
				update({
					status: copied.status,
					statusLabel: labelOf(copied.status, '', statusChoices),
				});
			}
		},

		/** @return {boolean} Whether the document is still an auto-draft that no save took out. */
		isNeverSaved: () => neverSaved,

		/**
		 * Write what is unsaved (on a first save, both fields). The values sent
		 * become the saved ones; an edit made during the request stays unsaved.
		 *
		 * @param {(request: EditorPostFieldsRequest) => Promise<unknown>} writePost Rejects on failure.
		 * @return {Promise<void>} Rejects with the write's error; nothing changes then.
		 */
		async save(writePost) {
			const request = buildRequest();
			if (Object.keys(request).length === 0) {
				return;
			}
			const titleAtRequest = snapshot.title;
			await writePost(request);
			if (typeof request.title === 'string') {
				saved.title = request.title;
			}
			if (typeof request.status === 'string') {
				saved.status = request.status;
			}
			neverSaved = false;
			// The fallback title is stored now: show it unless the author typed meanwhile.
			if (snapshot.title === titleAtRequest && request.title) {
				update({ title: request.title });
			}
		},
	};
}
