import { useId } from '@wordpress/element';
import { CheckIcon } from '../icons/icons';
import { Popover, usePopoverClose } from '../popover/Popover';
import { menuIndexForKey } from './menuKeys';

/**
 * Moves focus between the enabled items of the menu the key was pressed in.
 *
 * @param {import('react').KeyboardEvent} event
 */
function moveMenuFocus(event) {
	const items = [
		...event.currentTarget.querySelectorAll(
			'[role^="menuitem"]:not(:disabled)'
		),
	];
	const next = menuIndexForKey(
		event.key,
		items.indexOf(event.target),
		items.length
	);
	if (null === next) {
		return;
	}
	event.preventDefault();
	items[next].focus();
}

/**
 * A menu button's menu (Status, Add from, Columns): a Popover with
 * `role="menu"`. Opening focuses the checked item, or the first; arrow keys,
 * Home and End move between items; choosing an item closes the menu and
 * returns focus to the trigger. Escape, Tab or a click outside close it.
 *
 * @param {Object}                    props
 * @param {boolean}                   props.open
 * @param {Function}                  props.onOpenChange Receives the next boolean.
 * @param {Function}                  props.trigger      Receives the trigger props; see Popover.
 * @param {string}                    props.label        Menu name.
 * @param {'start'|'end'}             [props.align]
 * @param {'bottom'|'top'}            [props.side]
 * @param {import('react').ReactNode} props.children     MenuItems and MenuGroups.
 */
export function Menu({
	open,
	onOpenChange,
	trigger,
	label,
	align,
	side,
	children,
}) {
	return (
		<Popover
			open={open}
			onOpenChange={onOpenChange}
			trigger={trigger}
			label={label}
			role="menu"
			align={align}
			side={side}
			className="modula-admin-menu"
			onKeyDown={moveMenuFocus}
		>
			{children}
		</Popover>
	);
}

/**
 * A group of menu items, with a divider above it after the first group. A
 * `label` heads it ("Upload", "Library"); without one the divider alone
 * sets it apart (a row's ⋮ menu).
 *
 * @param {Object}                    props
 * @param {string}                    [props.label]
 * @param {import('react').ReactNode} props.children
 */
export function MenuGroup({ label = '', children }) {
	const labelId = `modula-admin-menu-group-${useId()}`;
	const hasLabel = '' !== label;

	return (
		<div
			className="modula-admin-menu__group"
			role="group"
			aria-labelledby={hasLabel ? labelId : undefined}
		>
			{hasLabel ? (
				<div id={labelId} className="modula-admin-menu__group-label">
					{label}
				</div>
			) : null}
			{children}
		</div>
	);
}

/**
 * One menu choice. With `checked` it is a `menuitemradio` (one of a set,
 * such as Published / Draft) and shows a check when chosen. With `checked`
 * and `toggle` it is a `menuitemcheckbox` (Columns: show one column or not)
 * and draws a checkbox before the label. Items are not tab stops: the menu
 * moves focus with the arrow keys.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 * @param {Function}                  [props.onSelect]
 * @param {boolean}                   [props.checked]     Makes it a radio item.
 * @param {boolean}                   [props.toggle]      With `checked`, makes it a checkbox item instead.
 * @param {import('react').ReactNode} [props.icon]        Decorative icon before the label.
 * @param {import('react').ReactNode} [props.badge]       After the label, e.g. a PlanBadge without `onClick` (it sits inside the item button).
 * @param {import('react').ReactNode} [props.description] Muted line under the label.
 * @param {Function}                  [props.onHighlight] Called when the pointer enters the item or focus reaches it, e.g. to preview it.
 * @param {boolean}                   [props.disabled]
 * @param {boolean}                   [props.keepOpen]    Choosing leaves the menu open (a column filter's checkboxes, several picks in a row).
 * @param {boolean}                   [props.destructive] Drawn in the danger colour (Move to trash).
 */
export function MenuItem({
	children,
	onSelect,
	checked,
	toggle = false,
	icon = null,
	badge = null,
	description = null,
	onHighlight,
	disabled = false,
	keepOpen = false,
	destructive = false,
}) {
	const close = usePopoverClose();
	const isChecked = undefined !== checked;
	const isCheckbox = isChecked && toggle;
	let role = 'menuitem';
	if (isCheckbox) {
		role = 'menuitemcheckbox';
	} else if (isChecked) {
		role = 'menuitemradio';
	}

	return (
		<button
			type="button"
			role={role}
			className={[
				'modula-admin-menu__item',
				destructive ? 'is-destructive' : '',
			]
				.filter(Boolean)
				.join(' ')}
			tabIndex={-1}
			aria-checked={isChecked ? checked : undefined}
			data-autofocus={checked ? 'true' : undefined}
			disabled={disabled}
			onClick={() => {
				onSelect?.();
				if (!keepOpen) {
					close();
				}
			}}
			onMouseEnter={onHighlight}
			onFocus={onHighlight}
		>
			{isCheckbox ? (
				<span
					className={[
						'modula-admin-menu__box',
						checked ? 'is-checked' : '',
					]
						.filter(Boolean)
						.join(' ')}
					aria-hidden="true"
				>
					<CheckIcon />
				</span>
			) : null}
			{icon ? (
				<span className="modula-admin-menu__icon" aria-hidden="true">
					{icon}
				</span>
			) : null}
			{description ? (
				<span className="modula-admin-menu__label has-description">
					<span>{children}</span>
					<span className="modula-admin-menu__description">
						{description}
					</span>
				</span>
			) : (
				<span className="modula-admin-menu__label">{children}</span>
			)}
			{badge}
			{checked && !isCheckbox ? (
				<span className="modula-admin-menu__check" aria-hidden="true">
					<CheckIcon />
				</span>
			) : null}
		</button>
	);
}
