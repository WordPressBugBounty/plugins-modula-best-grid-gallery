/**
 * A select drawn as a menu button: grouped options with icons and lock
 * hints, on admin-ui's Menu. Every select in the settings panel of the
 * gallery editor and the Albums editor uses it. The trigger looks like the
 * canvas's native select: a filled ▾ caret, as wide as its longest option
 * (rows clamp it to 150–190px). Choosing an option closes the menu and
 * returns focus to it. Each editor styles it under its own class block with
 * the `select-menu` mixin (`editor-shell/styles/select-menu`).
 */
import { Fragment, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Menu, MenuGroup, MenuItem } from 'admin-ui';

/**
 * @typedef {Object} SelectMenuOption
 * @property {string}                    value         Stored value.
 * @property {string}                    label         Option name.
 * @property {import('react').ReactNode} [icon]        Drawn before the label, in the menu and the trigger.
 * @property {boolean}                   [disabled]    Locked by plan or extension.
 * @property {import('react').ReactNode} [badge]       Why it is locked: a hint ("(Pro required)") or a PRO pill.
 * @property {string}                    [description] Line under the option's label in the menu.
 */

/**
 * @typedef {{ id: string, label?: string, options: SelectMenuOption[] }} SelectMenuGroup
 */

/**
 * @param {SelectMenuGroup[]} groups
 * @param {string}            value
 * @return {SelectMenuOption|null} The chosen option.
 */
function findOption(groups, value) {
	for (const group of groups) {
		const hit = group.options.find((option) => option.value === value);
		if (hit) {
			return hit;
		}
	}
	return null;
}

/**
 * @param {Object}            props
 * @param {string}            props.id
 * @param {string}            props.label          Setting name; names the menu and the button.
 * @param {string}            props.value
 * @param {SelectMenuGroup[]} props.groups         Groups without a label render as plain items.
 * @param {Function}          props.onChange       Receives the option value.
 * @param {boolean}           [props.disabled]
 * @param {string}            [props.placeholder]  Shown when no option matches the value.
 * @param {string}            [props.className]
 * @param {string}            [props.describedBy]  Id of the help line under the control.
 * @param {Function}          [props.onHighlight]  Receives the value of the option the pointer or focus reaches (the Motion menus' peek).
 * @param {Function}          [props.onOpenChange] Receives whether the menu opened or closed (the peek stops on close).
 * @param {string}            [props.classBlock]   The editor's class block; classes read `<block>__select-menu…`.
 */
export default function SelectMenuControl({
	id,
	label,
	value,
	groups,
	onChange,
	disabled = false,
	placeholder = '',
	className = '',
	describedBy,
	onHighlight,
	onOpenChange,
	classBlock = 'modula-settings-editor',
}) {
	const [open, setOpen] = useState(false);
	const menuClass = `${classBlock}__select-menu`;
	const visibleGroups = groups.filter((group) => group.options.length > 0);
	const current = findOption(visibleGroups, value);
	const currentLabel =
		current?.label ||
		placeholder ||
		__('Select option', 'modula-best-grid-gallery');
	const optionLabels = [
		...new Set(
			visibleGroups.flatMap((group) =>
				group.options.map((option) => option.label)
			)
		),
	];

	const renderItem = (option) => (
		<MenuItem
			key={option.value}
			checked={option.value === value}
			icon={option.icon}
			disabled={option.disabled === true}
			description={option.description || null}
			onHighlight={
				onHighlight ? () => onHighlight(option.value) : undefined
			}
			badge={
				option.badge ? (
					<span className={`${menuClass}-hint`}>{option.badge}</span>
				) : null
			}
			onSelect={() => onChange(option.value)}
		>
			{option.label}
		</MenuItem>
	);

	return (
		<div className={[menuClass, className].filter(Boolean).join(' ')}>
			<Menu
				open={open && !disabled}
				onOpenChange={(next) => {
					setOpen(next);
					onOpenChange?.(next);
				}}
				label={label}
				trigger={(triggerProps) => (
					<button
						{...triggerProps}
						id={id}
						type="button"
						className={`${menuClass}-trigger`}
						disabled={disabled}
						aria-describedby={describedBy}
						aria-label={sprintf(
							/* translators: 1: setting name, 2: chosen option. */
							__('%1$s: %2$s', 'modula-best-grid-gallery'),
							label,
							currentLabel
						)}
					>
						{current?.icon ? (
							<span
								className={`${menuClass}-icon`}
								aria-hidden="true"
							>
								{current.icon}
							</span>
						) : null}
						{/* Every label sits in one grid cell, so the trigger is as
						wide as the longest option, like a native select. */}
						<span className={`${menuClass}-value`}>
							<span className={`${menuClass}-current`}>
								{currentLabel}
							</span>
							{optionLabels.map((optionLabel) => (
								<span
									key={optionLabel}
									className={`${menuClass}-sizer`}
									aria-hidden="true"
								>
									{optionLabel}
								</span>
							))}
						</span>
						<svg
							className={`${menuClass}-caret`}
							width="10"
							height="5"
							viewBox="0 0 10 5"
							aria-hidden="true"
							focusable="false"
						>
							<path d="M0 0h10L5 5z" />
						</svg>
					</button>
				)}
			>
				{visibleGroups.map((group) =>
					group.label ? (
						<MenuGroup key={group.id} label={group.label}>
							{group.options.map(renderItem)}
						</MenuGroup>
					) : (
						<Fragment key={group.id}>
							{group.options.map(renderItem)}
						</Fragment>
					)
				)}
			</Menu>
		</div>
	);
}
