import { useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Checkbox } from '../checkbox/Checkbox';

/**
 * @typedef {{ id: string, label: string }} MatrixColumn
 */

/**
 * One cell: a boolean is a checkbox; `{ checked, disabled: true }` is a
 * checkbox the row cannot change (its Access is off); null or a missing key
 * means the permission does not apply to that row.
 *
 * @typedef {boolean|null|{ checked: boolean, disabled: true }} MatrixCellValue
 */

/**
 * @typedef {{ id: string, label: string, cells: Record<string, MatrixCellValue> }} MatrixRow
 */

/**
 * Show-more footer text, by number of hidden rows.
 *
 * @param {number} hiddenCount
 * @return {string} Label.
 */
function defaultShowMoreLabel(hiddenCount) {
	return sprintf(
		/* translators: %d: number of hidden rows. */
		_n(
			'Show %d more',
			'Show %d more',
			hiddenCount,
			'modula-best-grid-gallery'
		),
		hiddenCount
	);
}

/**
 * Grid of checkboxes with row and column headers (the Roles matrix). The
 * first `collapsedRows` rows show until the footer reveals the rest. Wide
 * grids scroll sideways inside the card.
 *
 * @param {Object}         props
 * @param {string}         props.label             Accessible name of the table.
 * @param {string}         props.cornerLabel       Header of the row-header column, e.g. "Role".
 * @param {MatrixColumn[]} props.columns
 * @param {MatrixRow[]}    props.rows
 * @param {Function}       props.onChange          Receives (rowId, columnId, nextBoolean).
 * @param {number}         [props.collapsedRows=4]
 * @param {Function}       [props.showMoreLabel]   Receives the hidden row count.
 * @param {string}         [props.showFewerLabel]
 */
export function Matrix({
	label,
	cornerLabel,
	columns,
	rows,
	onChange,
	collapsedRows = 4,
	showMoreLabel = defaultShowMoreLabel,
	showFewerLabel = __('Show fewer', 'modula-best-grid-gallery'),
}) {
	const [expanded, setExpanded] = useState(false);
	const hiddenCount = Math.max(0, rows.length - collapsedRows);
	const visibleRows = expanded ? rows : rows.slice(0, collapsedRows);
	const gridStyle = {
		'--modula-admin-matrix-columns': columns.length,
	};

	return (
		<div className="modula-admin-matrix">
			<div className="modula-admin-matrix__scroll">
				<div
					className="modula-admin-matrix__table"
					role="table"
					aria-label={label}
					style={gridStyle}
				>
					<div
						className="modula-admin-matrix__row is-head"
						role="row"
					>
						<span role="columnheader">{cornerLabel}</span>
						{columns.map((column) => (
							<span
								key={column.id}
								className="modula-admin-matrix__column"
								role="columnheader"
							>
								{column.label}
							</span>
						))}
					</div>
					{visibleRows.map((row) => (
						<div
							key={row.id}
							className="modula-admin-matrix__row"
							role="row"
						>
							<span
								className="modula-admin-matrix__row-label"
								role="rowheader"
							>
								{row.label}
							</span>
							{columns.map((column) => (
								<span
									key={column.id}
									className="modula-admin-matrix__cell"
									role="cell"
								>
									<MatrixCell
										value={row.cells[column.id]}
										label={sprintf(
											/* translators: 1: row name (a role), 2: column name (a permission). */
											__(
												'%1$s: %2$s',
												'modula-best-grid-gallery'
											),
											row.label,
											column.label
										)}
										onChange={(next) =>
											onChange(row.id, column.id, next)
										}
									/>
								</span>
							))}
						</div>
					))}
				</div>
			</div>
			{hiddenCount > 0 ? (
				<button
					type="button"
					className="modula-admin-matrix__more"
					aria-expanded={expanded}
					onClick={() => setExpanded(!expanded)}
				>
					{expanded ? showFewerLabel : showMoreLabel(hiddenCount)}
				</button>
			) : null}
		</div>
	);
}

/**
 * @param {MatrixCellValue} value
 * @return {{ checked: boolean, disabled: boolean }|null} Checkbox state, or null when not applicable.
 */
function cellCheckbox(value) {
	if ('boolean' === typeof value) {
		return { checked: value, disabled: false };
	}
	if (null !== value && 'object' === typeof value) {
		return { checked: true === value.checked, disabled: true };
	}

	return null;
}

/**
 * @param {Object}          props
 * @param {MatrixCellValue} props.value
 * @param {string}          props.label    Accessible name: "Row: Column".
 * @param {Function}        props.onChange
 */
function MatrixCell({ value, label, onChange }) {
	const checkbox = cellCheckbox(value);

	if (null === checkbox) {
		return (
			<span className="modula-admin-matrix__na">
				<span aria-hidden="true">–</span>
				<span className="modula-admin-sr-only">
					{__('Not applicable', 'modula-best-grid-gallery')}
				</span>
			</span>
		);
	}

	return (
		<Checkbox
			checked={checkbox.checked}
			disabled={checkbox.disabled}
			onChange={onChange}
			aria-label={label}
		/>
	);
}
