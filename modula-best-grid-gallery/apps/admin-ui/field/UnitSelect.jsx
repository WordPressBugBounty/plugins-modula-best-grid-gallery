import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Menu, MenuItem } from '../menu/Menu';

/**
 * The editor's unit menu: the unit as dotted-underlined text after a number
 * (Range's unit box) that opens a menu of units. Editor selects
 * are menus, never native selects. It shows only the unit, so name it with
 * `aria-label` ("Gallery width unit").
 *
 * @param {Object}   props
 * @param {string[]} props.units
 * @param {string}   props.value
 * @param {Function} [props.onChange]   Receives the unit.
 * @param {boolean}  [props.disabled]
 * @param {string}   props.'aria-label' Names the button and the menu.
 */
export function UnitSelect({
	units,
	value,
	onChange,
	disabled = false,
	'aria-label': label,
}) {
	const [open, setOpen] = useState(false);

	return (
		<Menu
			open={open && !disabled}
			onOpenChange={setOpen}
			label={label}
			align="end"
			trigger={(triggerProps) => (
				<button
					{...triggerProps}
					type="button"
					className="modula-admin-unit-select"
					disabled={disabled}
					aria-label={sprintf(
						/* translators: 1: unit menu name, e.g. Gallery width unit, 2: chosen unit. */
						__('%1$s: %2$s', 'modula-best-grid-gallery'),
						label,
						value
					)}
				>
					{value}
				</button>
			)}
		>
			{units.map((unit) => (
				<MenuItem
					key={unit}
					checked={unit === value}
					onSelect={() => onChange?.(unit)}
				>
					{unit}
				</MenuItem>
			))}
		</Menu>
	);
}
