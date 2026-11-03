/**
 * Document title heading with a Rename button that swaps in an input.
 * Enter or blur saves the draft; Escape drops it.
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import { Icon } from '@wordpress/icons';
import { pencilIcon } from './topBarIcons';

// `<main>` names itself after the title (`aria-labelledby`).
const TITLE_ID = 'modula-takeover-topbar-title';

/**
 * @param {Object}                  props
 * @param {string}                  props.title
 * @param {string}                  props.placeholder     Shown for an empty title.
 * @param {string}                  props.inputLabel      Accessible name of the input.
 * @param {string}                  props.renameLabel     Accessible name of the Rename button.
 * @param {boolean}                 props.canRename       False until the document exists, or while renaming is locked.
 * @param {(title: string) => void} props.onTitleChange   Receives the saved draft.
 * @param {(value: string) => void} [props.onTitleCommit] Persists the saved draft.
 */
export default function TopBarTitle({
	title,
	placeholder,
	inputLabel,
	renameLabel,
	canRename,
	onTitleChange,
	onTitleCommit,
}) {
	// The draft is null outside rename mode.
	const [draft, setDraft] = useState(/** @type {string|null} */ (null));
	const inputRef = useRef(/** @type {HTMLInputElement|null} */ (null));
	const renameRef = useRef(/** @type {HTMLButtonElement|null} */ (null));
	// Enter and Escape unmount the focused input, which can still report a
	// blur; the first ending wins.
	const isEditingRef = useRef(false);
	const returnFocusRef = useRef(false);
	const isEditing = draft !== null;

	useEffect(() => {
		if (isEditing) {
			inputRef.current?.focus();
			inputRef.current?.select();
			return;
		}
		if (returnFocusRef.current) {
			returnFocusRef.current = false;
			renameRef.current?.focus();
		}
	}, [isEditing]);

	const startRename = () => {
		isEditingRef.current = true;
		setDraft(title);
	};

	/**
	 * @param {{ save: boolean, value: string, returnFocus: boolean }} ending
	 */
	const endRename = ({ save, value, returnFocus }) => {
		if (!isEditingRef.current) {
			return;
		}
		isEditingRef.current = false;
		returnFocusRef.current = returnFocus;
		setDraft(null);
		if (save) {
			onTitleChange(value);
			onTitleCommit?.(value);
		}
	};

	if (isEditing) {
		return (
			<input
				ref={inputRef}
				id={TITLE_ID}
				type="text"
				className="modula-takeover__topbar-title-input"
				value={draft}
				placeholder={placeholder}
				aria-label={inputLabel}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={(event) =>
					endRename({
						save: true,
						value: event.currentTarget.value,
						returnFocus: false,
					})
				}
				onKeyDown={(event) => {
					if (event.key !== 'Enter' && event.key !== 'Escape') {
						return;
					}
					event.preventDefault();
					// Escape ends the rename only, not an enclosing panel.
					event.stopPropagation();
					endRename({
						save: event.key === 'Enter',
						value: event.currentTarget.value,
						returnFocus: true,
					});
				}}
			/>
		);
	}

	return (
		<>
			<h1
				id={TITLE_ID}
				className={
					title
						? 'modula-takeover__topbar-title-heading'
						: 'modula-takeover__topbar-title-heading is-placeholder'
				}
				title={title}
			>
				{title || placeholder}
			</h1>
			{canRename ? (
				<button
					ref={renameRef}
					type="button"
					className="modula-takeover__topbar-rename"
					aria-label={renameLabel}
					title={renameLabel}
					onClick={startRename}
				>
					<Icon icon={pencilIcon} size={14} />
				</button>
			) : null}
		</>
	);
}
