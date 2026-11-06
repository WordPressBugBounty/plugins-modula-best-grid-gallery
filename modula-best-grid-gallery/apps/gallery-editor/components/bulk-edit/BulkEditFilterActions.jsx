/**
 * Bulk edit footer: "Add filter (N)" and "Remove filter (N)" on the ticked
 * rows. Add opens a search over the gallery's filters that can also name a
 * new one (the row's "+ Add" search); Remove lists the filters the ticked
 * rows carry. Both write the draft, so the rows count as modified and
 * "Discard changes" / "Save all and close" apply.
 */
import { useId, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Menu, MenuItem, Popover, TokenPicker } from 'admin-ui';
import {
	filterListNames,
	filterNameFromSuggestion,
	filterTokenSuggestions,
} from 'editor-shell/logic';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import {
	bulkEditAddFilterPatches,
	bulkEditFilterNamesOnRows,
	bulkEditRemoveFilterPatches,
} from './bulkEditFilters';

/**
 * @typedef {import('./bulkEditFilters').BulkEditRowField} BulkEditRowField
 * @typedef {import('./bulkEditFilters').BulkEditFilterPatch} BulkEditFilterPatch
 */

/**
 * Plus / minus glyphs, drawn like admin-ui's stroke icons and the watermark
 * buttons beside them. Decorative: the button is named by its label.
 *
 * @param {{ d: string }} props
 */
function FilterActionIcon({ d }) {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<path d={d} />
		</svg>
	);
}

/**
 * @param {string} name
 * @return {string} Label of the result that adds a new filter.
 */
function addNewFilterLabel(name) {
	return sprintf(
		/* translators: %s: filter name the user typed. */
		__('Add “%s”', 'modula-best-grid-gallery'),
		name
	);
}

/**
 * Before typing, the search lists every gallery filter.
 *
 * @param {string}   query
 * @param {string[]} names The gallery's filter names.
 * @return {Array<{ value: string, label: string }>} Search results.
 */
function addFilterResults(query, names) {
	if (String(query).trim() === '') {
		return names.map((name) => ({ value: name, label: name }));
	}
	return filterTokenSuggestions({
		query,
		names,
		tokens: [],
		addLabel: addNewFilterLabel,
	});
}

/**
 * @param {Object}                 props
 * @param {string}                 props.label
 * @param {boolean}                props.disabled
 * @param {(name: string) => void} props.onPick
 */
function AddFilterPopover({ label, disabled, onPick }) {
	const searchId = `modula-bulk-edit-add-filter-${useId()}`;
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const { form: galleryForm } = useGallerySettingsFormBundle();

	const setOpenAndReset = (next) => {
		setOpen(next);
		if (!next) {
			setQuery('');
		}
	};

	return (
		<Popover
			open={open}
			onOpenChange={setOpenAndReset}
			label={__('Add filter', 'modula-best-grid-gallery')}
			side="top"
			align="end"
			focusOnOpen
			className="modula-bulk-edit__filter-popover"
			trigger={(triggerProps) => (
				<Button
					{...triggerProps}
					disabled={disabled}
					icon={<FilterActionIcon d="M12 5v14M5 12h14" />}
				>
					{label}
				</Button>
			)}
		>
			<galleryForm.Subscribe selector={(s) => s.values.filters?.filters}>
				{(galleryFilters) => (
					<TokenPicker
						id={searchId}
						tokens={[]}
						query={query}
						onQueryChange={setQuery}
						suggestions={addFilterResults(
							query,
							filterListNames(galleryFilters)
						)}
						onPick={(option) => {
							onPick(filterNameFromSuggestion(option.value));
							setOpenAndReset(false);
						}}
						removeLabel={(name) => name}
						placeholder={__(
							'Filter name',
							'modula-best-grid-gallery'
						)}
						aria-label={__(
							'Filter to add',
							'modula-best-grid-gallery'
						)}
					/>
				)}
			</galleryForm.Subscribe>
		</Popover>
	);
}

/**
 * @param {Object}                 props
 * @param {string}                 props.label
 * @param {string[]}               props.names    Filters the ticked rows carry.
 * @param {boolean}                props.disabled
 * @param {(name: string) => void} props.onPick
 */
function RemoveFilterMenu({ label, names, disabled, onPick }) {
	const [open, setOpen] = useState(false);
	return (
		<Menu
			open={open}
			onOpenChange={setOpen}
			label={__('Remove filter', 'modula-best-grid-gallery')}
			side="top"
			align="end"
			trigger={(triggerProps) => (
				<Button
					{...triggerProps}
					disabled={disabled}
					icon={<FilterActionIcon d="M5 12h14" />}
				>
					{label}
				</Button>
			)}
		>
			{names.map((name) => (
				<MenuItem key={name} onSelect={() => onPick(name)}>
					{name}
				</MenuItem>
			))}
		</Menu>
	);
}

/**
 * @param {Object}                                  props
 * @param {Object[]}                                props.tickedRows
 * @param {BulkEditRowField}                        props.getRowField
 * @param {(rowKey: string, patch: Object) => void} props.patchRow
 * @param {boolean}                                 props.busy
 */
export default function BulkEditFilterActions({
	tickedRows,
	getRowField,
	patchRow,
	busy,
}) {
	const count = tickedRows.length;
	const namesOnRows = bulkEditFilterNamesOnRows(tickedRows, getRowField);

	/** @param {BulkEditFilterPatch[]} patches */
	const applyPatches = (patches) => {
		for (const { rowKey, filters } of patches) {
			patchRow(rowKey, { filters });
		}
	};

	return (
		<>
			<AddFilterPopover
				label={sprintf(
					/* translators: %d: number of ticked images */
					__('Add filter (%d)', 'modula-best-grid-gallery'),
					count
				)}
				disabled={busy || count === 0}
				onPick={(name) =>
					applyPatches(
						bulkEditAddFilterPatches(tickedRows, getRowField, name)
					)
				}
			/>
			<RemoveFilterMenu
				label={sprintf(
					/* translators: %d: number of ticked images */
					__('Remove filter (%d)', 'modula-best-grid-gallery'),
					count
				)}
				names={namesOnRows}
				disabled={busy || namesOnRows.length === 0}
				onPick={(name) =>
					applyPatches(
						bulkEditRemoveFilterPatches(
							tickedRows,
							getRowField,
							name
						)
					)
				}
			/>
		</>
	);
}
