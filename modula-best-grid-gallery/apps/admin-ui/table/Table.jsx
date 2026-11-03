import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { Checkbox } from '../checkbox/Checkbox';
import { ChevronDownIcon } from '../icons/icons';
import { Menu, MenuItem } from '../menu/Menu';
import { Skeleton } from '../skeleton/Skeleton';
import {
	selectAllState,
	selectionAfterSelectAll,
	toggleValue,
} from './tableSelection';

// Whether the pointer is over the row or focus is inside it.
const RowActiveContext = createContext(false);

const FOCUSABLE =
	'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

// Skeleton bar widths, so the loading rows do not look identical.
const LOADING_WIDTHS = ['62%', '48%', '70%', '54%', '40%'];

/**
 * @typedef {Object} TableColumnFilterOption
 * @property {string}                    value   What the filter's `onChange` receives.
 * @property {string}                    label   Item text.
 * @property {number}                    [count] Read out after the label.
 * @property {import('react').ReactNode} [icon]  Decorative, before the label.
 */

/**
 * @typedef {Object} TableColumnFilter
 * @property {string}                    label      Menu name ("Filter by type").
 * @property {TableColumnFilterOption[]} options    The checkbox items.
 * @property {string[]}                  value      Checked option values; empty means no filter.
 * @property {Function}                  onChange   Receives the next values.
 * @property {string}                    clearLabel Shown while the filter is active ("Clear filter").
 * @property {string}                    [allLabel] Adds a first item, checked while nothing is, that clears ("All types").
 * @property {number}                    [allCount] Read out after `allLabel`.
 */

/**
 * @typedef {Object} TableColumn
 * @property {string}                    id       Column key.
 * @property {import('react').ReactNode} label    Head text, drawn in capitals.
 * @property {Function}                  render   Receives the row, returns the cell.
 * @property {string}                    [width]  CSS width; columns without one share the rest.
 * @property {TableColumnFilter}         [filter] Makes the head a column filter trigger.
 */

/**
 * @typedef {Object} TableSelection
 * @property {Array}    selectedIds    Ids of the selected rows, on this page or not.
 * @property {Function} onChange       Receives the next selected ids and `{ selectAll }`, true when the head checkbox made the change.
 * @property {string}   selectAllLabel Names the head checkbox.
 * @property {Function} rowLabel       Receives the row, returns the name of its checkbox.
 * @property {Function} [isSelectable] Receives the row; false leaves it without a checkbox and out of select-all.
 */

/**
 * A head that opens its column filter: a menu of checkbox items that stays
 * open while options are picked. The head is marked while the filter is
 * active, with the number of checked options; Clear empties it and closes.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.label
 * @param {TableColumnFilter}         props.filter
 */
function ColumnFilter({ label, filter }) {
	const [open, setOpen] = useState(false);
	const isActive = filter.value.length > 0;

	return (
		<Menu
			open={open}
			onOpenChange={setOpen}
			label={filter.label}
			trigger={(triggerProps) => (
				<button
					type="button"
					{...triggerProps}
					className={[
						'modula-admin-table__filter',
						isActive ? 'is-active' : '',
					]
						.filter(Boolean)
						.join(' ')}
				>
					{label}
					<ChevronDownIcon />
					{isActive ? (
						<span className="modula-admin-table__filter-count">
							{filter.value.length}
						</span>
					) : null}
				</button>
			)}
		>
			{filter.allLabel ? (
				<MenuItem
					toggle
					keepOpen
					checked={!isActive}
					badge={<FilterCount count={filter.allCount} />}
					onSelect={() => filter.onChange([])}
				>
					{filter.allLabel}
				</MenuItem>
			) : null}
			{filter.options.map((option) => (
				<MenuItem
					key={option.value}
					toggle
					keepOpen
					checked={filter.value.includes(option.value)}
					icon={option.icon}
					badge={<FilterCount count={option.count} />}
					onSelect={() =>
						filter.onChange(toggleValue(filter.value, option.value))
					}
				>
					{option.label}
				</MenuItem>
			))}
			{isActive ? (
				<div className="modula-admin-table__filter-clear">
					<MenuItem onSelect={() => filter.onChange([])}>
						{filter.clearLabel}
					</MenuItem>
				</div>
			) : null}
		</Menu>
	);
}

/**
 * @param {Object} props
 * @param {number} [props.count]
 */
function FilterCount({ count }) {
	if (undefined === count) {
		return null;
	}

	return <span className="modula-admin-table__option-count">{count}</span>;
}

/**
 * One body row. It is active while the pointer is over it or focus is
 * inside it, which swaps its TableHoverLines.
 *
 * @param {Object}                    props
 * @param {Object}                    props.row
 * @param {TableColumn[]}             props.columns
 * @param {TableSelection}            [props.selection]
 * @param {boolean}                   props.isSelectable
 * @param {boolean}                   props.isSelected
 * @param {Function}                  props.onToggle
 * @param {import('react').ReactNode} [props.expansion]
 */
function BodyRow({
	row,
	columns,
	selection,
	isSelectable,
	isSelected,
	onToggle,
	expansion,
}) {
	const [isPointerIn, setPointerIn] = useState(false);
	const [hasFocus, setHasFocus] = useState(false);
	const isActive = isPointerIn || hasFocus;

	return (
		<RowActiveContext.Provider value={isActive}>
			<tr
				className={[
					'modula-admin-table__row',
					isActive ? 'is-active' : '',
					isSelected ? 'is-selected' : '',
				]
					.filter(Boolean)
					.join(' ')}
				onMouseEnter={() => setPointerIn(true)}
				onMouseLeave={() => setPointerIn(false)}
				onFocus={() => setHasFocus(true)}
				onBlur={(event) => {
					if (!event.currentTarget.contains(event.relatedTarget)) {
						setHasFocus(false);
					}
				}}
			>
				{selection ? (
					<td className="modula-admin-table__select">
						{isSelectable ? (
							<Checkbox
								checked={isSelected}
								onChange={onToggle}
								aria-label={selection.rowLabel(row)}
							/>
						) : null}
					</td>
				) : null}
				{columns.map((column) => (
					<td key={column.id}>{column.render(row)}</td>
				))}
			</tr>
			{expansion}
		</RowActiveContext.Provider>
	);
}

/**
 * The row under an expanded row (Quick Edit). It traps nothing: Tab leaves
 * it like any other content. Opening moves focus to its
 * `[data-autofocus="true"]` or first control; Escape asks to close (not
 * the one that ends an IME composition), and
 * closing returns focus to where it was when the row opened, unless the
 * user has already moved it elsewhere.
 *
 * @param {Object}                    props
 * @param {number}                    props.colSpan
 * @param {Function}                  [props.onClose]
 * @param {import('react').ReactNode} props.children
 */
function ExpansionRow({ colSpan, onClose, children }) {
	const panelRef = useRef(null);

	useEffect(() => {
		const panel = panelRef.current;
		const doc = panel.ownerDocument;
		const opener = doc.activeElement;
		const initial =
			panel.querySelector('[data-autofocus="true"]') ??
			panel.querySelector(FOCUSABLE);
		initial?.focus();

		return () => {
			const current = doc.activeElement;
			const focusWasInside =
				!current || current === doc.body || panel.contains(current);
			if (focusWasInside && opener?.isConnected) {
				opener.focus();
			}
		};
	}, []);

	return (
		<tr className="modula-admin-table__expansion">
			<td colSpan={colSpan}>
				{/* Escape bubbles from the controls inside; the row itself is not interactive. */}
				{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
				<div
					ref={panelRef}
					onKeyDown={(event) => {
						// An Escape that ends an IME composition is not a close.
						if (
							'Escape' === event.key &&
							!event.nativeEvent.isComposing &&
							onClose
						) {
							event.preventDefault();
							onClose();
						}
					}}
				>
					{children}
				</div>
			</td>
		</tr>
	);
}

/**
 * A data table (the Content page's list): capitalised column heads, rows
 * that tint on hover, optional row checkboxes with a select-all head, column
 * filter heads, an expansion row under one row, and loading and empty
 * states. It knows nothing about what the rows are; columns render them.
 *
 * The select-all checkbox is indeterminate while some shown rows are
 * selected; using it selects every shown row when none is, and clears
 * otherwise. Rows that `selection.isSelectable` turns down have no checkbox
 * and take no part in select-all.
 *
 * @param {Object}                    props
 * @param {string}                    props.label              Names the table.
 * @param {TableColumn[]}             props.columns
 * @param {Object[]}                  props.rows
 * @param {Function}                  props.getRowId           Receives a row, returns its id.
 * @param {TableSelection}            [props.selection]        Adds the checkbox column.
 * @param {*}                         [props.expandedRowId]    Row whose expansion row shows.
 * @param {Function}                  [props.renderExpansion]  Receives that row, returns the expansion's content.
 * @param {Function}                  [props.onExpansionClose] Called on Escape inside the expansion.
 * @param {boolean}                   [props.loading]          Skeleton rows instead of rows.
 * @param {number}                    [props.loadingRows]
 * @param {import('react').ReactNode} [props.emptyMessage]     Shown when there are no rows.
 */
export function Table({
	label,
	columns,
	rows,
	getRowId,
	selection,
	expandedRowId = null,
	renderExpansion,
	onExpansionClose,
	loading = false,
	loadingRows = 5,
	emptyMessage = null,
}) {
	const rowIds = rows.map(getRowId);
	const colSpan = columns.length + (selection ? 1 : 0);
	const isRowSelectable = (row) =>
		!!selection && (!selection.isSelectable || selection.isSelectable(row));
	// Select-all reads and sets only the rows that have a checkbox.
	const selectableIds = rows.filter(isRowSelectable).map(getRowId);
	const allState = selection
		? selectAllState(selectableIds, selection.selectedIds)
		: 'none';

	const renderBody = () => {
		if (loading) {
			return Array.from({ length: loadingRows }, (_, index) => (
				<tr
					key={index}
					className="modula-admin-table__row is-loading"
					aria-hidden="true"
				>
					{selection ? (
						<td className="modula-admin-table__select" />
					) : null}
					{columns.map((column, columnIndex) => (
						<td key={column.id}>
							<Skeleton
								width={
									LOADING_WIDTHS[
										(index + columnIndex) %
											LOADING_WIDTHS.length
									]
								}
							/>
						</td>
					))}
				</tr>
			));
		}
		if (0 === rows.length) {
			return (
				<tr>
					<td className="modula-admin-table__empty" colSpan={colSpan}>
						{emptyMessage}
					</td>
				</tr>
			);
		}

		return rows.map((row, index) => {
			const rowId = rowIds[index];
			const isExpanded =
				null !== expandedRowId && expandedRowId === rowId;
			return (
				<BodyRow
					key={rowId}
					row={row}
					columns={columns}
					selection={selection}
					isSelectable={isRowSelectable(row)}
					isSelected={
						!!selection && selection.selectedIds.includes(rowId)
					}
					onToggle={() =>
						selection.onChange(
							toggleValue(selection.selectedIds, rowId),
							{ selectAll: false }
						)
					}
					expansion={
						isExpanded && renderExpansion ? (
							<ExpansionRow
								colSpan={colSpan}
								onClose={onExpansionClose}
							>
								{renderExpansion(row)}
							</ExpansionRow>
						) : null
					}
				/>
			);
		});
	};

	return (
		<table
			className="modula-admin-table"
			aria-label={label}
			aria-busy={loading || undefined}
		>
			<colgroup>
				{selection ? (
					<col className="modula-admin-table__select-col" />
				) : null}
				{columns.map((column) => (
					<col
						key={column.id}
						style={
							column.width ? { width: column.width } : undefined
						}
					/>
				))}
			</colgroup>
			<thead>
				<tr>
					{selection ? (
						<th className="modula-admin-table__select" scope="col">
							<Checkbox
								checked={'all' === allState}
								indeterminate={'some' === allState}
								disabled={loading || 0 === selectableIds.length}
								aria-label={selection.selectAllLabel}
								onChange={() =>
									selection.onChange(
										selectionAfterSelectAll(
											selectableIds,
											selection.selectedIds
										),
										{ selectAll: true }
									)
								}
							/>
						</th>
					) : null}
					{columns.map((column) => (
						<th key={column.id} scope="col">
							{column.filter ? (
								<ColumnFilter
									label={column.label}
									filter={column.filter}
								/>
							) : (
								column.label
							)}
						</th>
					))}
				</tr>
			</thead>
			<tbody>{renderBody()}</tbody>
		</table>
	);
}

/**
 * A cell's second line held for its row's hover (the item count that row
 * actions replace): `children` rest there, `hover` takes their place while
 * the row is hovered or has focus. Both share one slot, so the row keeps its
 * height. The hover content stays focusable while hidden, and focusing it
 * shows it.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.hover
 * @param {import('react').ReactNode} [props.children]
 */
export function TableHoverLine({ hover, children = null }) {
	const isActive = useContext(RowActiveContext);

	return (
		<span
			className={[
				'modula-admin-table__hover-line',
				isActive ? 'is-active' : '',
			]
				.filter(Boolean)
				.join(' ')}
		>
			<span
				className="modula-admin-table__hover-rest"
				aria-hidden={isActive || undefined}
			>
				{children}
			</span>
			<span className="modula-admin-table__hover-actions">{hover}</span>
		</span>
	);
}
