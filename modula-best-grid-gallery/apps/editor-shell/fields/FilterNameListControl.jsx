/**
 * A filter name list (`filters.filters`) as chips (rename, count, remove),
 * then a "New filter" field and Add (canvas), in the gallery editor and the
 * Albums editor. Each editor counts what carries each filter and says what
 * happens to its items when names are removed or a rename ends.
 *
 * Styles: `styles/_filter-name-list.scss`.
 */

import { __, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { Button, Chip, TextInput } from 'admin-ui';

/**
 * @param {unknown} value
 * @return {string[]} The list's rows, as text.
 */
function normalizeFilterList(value) {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.map((x) => String(x));
}

/**
 * A blank row is not a filter: the schema default `['']` is a placeholder and
 * the save drops blanks.
 *
 * @param {string} row
 * @return {boolean} Whether the row holds a filter name.
 */
function isFilterName(row) {
	return row.trim() !== '';
}

/**
 * @param {string[]} list
 * @return {boolean} Whether any row holds a filter name.
 */
function hasFilterNames(list) {
	return list.some(isFilterName);
}

/**
 * @param {string[]} list
 * @return {string[]} Trimmed, non-empty names.
 */
function filterNames(list) {
	return list.filter(isFilterName).map((row) => row.trim());
}

/**
 * @param {Object}                                  props
 * @param {unknown}                                 props.value            `filters.filters` — string[]
 * @param {Function}                                props.onChange
 * @param {boolean}                                 props.disabled
 * @param {string}                                  [props.help]
 * @param {Map<string, number>}                     props.usageByFilter    How many items carry each name.
 * @param {string}                                  props.listLabel        Names the chip list.
 * @param {(name: string, count: number) => string} props.renameLabel      Names a chip's rename button.
 * @param {(removedNames: string[]) => void}        [props.onNamesRemoved] Names removed from the list (a chip's ×).
 * @param {() => void}                              [props.onRenameDone]   A chip's rename ended (blur or Enter).
 */
export default function FilterNameListControl({
	value,
	onChange,
	disabled,
	help,
	usageByFilter,
	listLabel,
	renameLabel,
	onNamesRemoved,
	onRenameDone,
}) {
	const list = normalizeFilterList(value);
	const [editingIndex, setEditingIndex] = useState(
		/** @type {number|null} */ (null)
	);
	const [draft, setDraft] = useState('');
	// Blank rows draw no chip, while the row being renamed stays open even
	// when its text is cleared. Rows keep their list indexes, so rename and
	// remove reach the stored row.
	const isChipRow = ({ row, index }) =>
		isFilterName(row) || index === editingIndex;
	const chipRows = list
		.map((row, index) => ({ row, index }))
		.filter(isChipRow);

	const commit = (next, { notifyRemoved = true } = {}) => {
		const normalized = normalizeFilterList(next);
		const nextNames = filterNames(normalized);
		const removedNames = filterNames(list).filter(
			(name) => !nextNames.includes(name)
		);

		onChange(normalized.length === 0 ? [] : normalized);

		if (notifyRemoved && removedNames.length > 0 && onNamesRemoved) {
			onNamesRemoved(removedNames);
		}
	};

	// Once the last name is removed or renamed to blank, the list is cleared
	// on purpose (`[]`): blank rows alone read as the placeholder, and the
	// save keeps the stored names over them.
	const endRename = () => {
		setEditingIndex(null);
		if (!hasFilterNames(list)) {
			commit([]);
		}
		if (onRenameDone) {
			onRenameDone();
		}
	};

	const updateAt = (index, raw) => {
		const next = [...list];
		next[index] = raw;
		commit(next, { notifyRemoved: false });
	};

	// A blank or repeated name cannot be added: Add stays disabled and the
	// draft stays to fix.
	const draftName = draft.trim();
	const canAddDraft =
		draftName !== '' && !filterNames(list).includes(draftName);
	const addDraft = () => {
		if (!canAddDraft) {
			return;
		}
		commit([...list, draftName], { notifyRemoved: false });
		setDraft('');
	};

	const removeAt = (index) => {
		if (editingIndex === index) {
			setEditingIndex(null);
		} else if (editingIndex !== null && editingIndex > index) {
			setEditingIndex(editingIndex - 1);
		}
		const next = list.filter((_, j) => j !== index);
		commit(hasFilterNames(next) ? next : []);
	};

	// The field's help lives in the row's ⓘ tip (canvas); only an explicit
	// `help` shows under the chips.
	const helperText = typeof help === 'string' ? help.trim() : '';

	return (
		<div className="modula-settings-editor__filter-name-list modula-settings-editor__filter-name-list--chips">
			{chipRows.length > 0 ? (
				<div
					className="modula-settings-editor__filter-name-list-chips"
					role="list"
					aria-label={listLabel}
				>
					{chipRows.map(({ row, index }) => {
						if (editingIndex === index) {
							return (
								<div
									key={`filter-edit-${index}`}
									className="modula-settings-editor__filter-name-list-chip-edit"
									role="listitem"
								>
									<TextInput
										value={row}
										disabled={disabled}
										// Focus follows the click on the chip into its rename field.
										// eslint-disable-next-line jsx-a11y/no-autofocus
										autoFocus
										aria-label={__(
											'Filter name',
											'modula-best-grid-gallery'
										)}
										placeholder={__(
											'Filter name',
											'modula-best-grid-gallery'
										)}
										onChange={(v) => updateAt(index, v)}
										onBlur={endRename}
										onKeyDown={(event) => {
											if (event.key === 'Enter') {
												event.preventDefault();
												endRename();
											}
											if (event.key === 'Escape') {
												event.preventDefault();
												setEditingIndex(null);
											}
										}}
									/>
								</div>
							);
						}

						const label = row.trim();
						const count = usageByFilter.get(label) ?? 0;
						return (
							<span
								key={`filter-chip-${index}`}
								className="modula-settings-editor__filter-name-list-chip-wrap"
								role="listitem"
							>
								<Chip
									className="modula-settings-editor__filter-name-list-chip"
									disabled={disabled}
									removeLabel={sprintf(
										/* translators: %s: filter label */
										__(
											'Remove filter %s',
											'modula-best-grid-gallery'
										),
										label
									)}
									onRemove={
										disabled
											? undefined
											: () => removeAt(index)
									}
								>
									<button
										type="button"
										className="modula-settings-editor__filter-name-list-chip-edit"
										disabled={disabled}
										aria-label={renameLabel(label, count)}
										onClick={() => setEditingIndex(index)}
									>
										{label}
										<span
											className="modula-settings-editor__filter-name-list-chip-count"
											aria-hidden="true"
										>
											{count}
										</span>
									</button>
								</Chip>
							</span>
						);
					})}
				</div>
			) : null}
			{/* Not a <form>: both editors already sit in WP's post form. */}
			<div className="modula-settings-editor__filter-name-list-add">
				<TextInput
					value={draft}
					disabled={disabled}
					aria-label={__(
						'New filter name',
						'modula-best-grid-gallery'
					)}
					placeholder={__('New filter', 'modula-best-grid-gallery')}
					onChange={setDraft}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							addDraft();
						}
					}}
				/>
				<Button disabled={disabled || !canAddDraft} onClick={addDraft}>
					{__('Add', 'modula-best-grid-gallery')}
				</Button>
			</div>
			{helperText ? (
				<p className="modula-settings-editor__filter-name-list-help">
					{helperText}
				</p>
			) : null}
		</div>
	);
}
