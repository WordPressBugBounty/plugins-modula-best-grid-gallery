import {
	forwardRef,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';

/**
 * @typedef {{
 *   value: string,
 *   label: string,
 *   icon?: import('react').ReactNode,
 *   disabled?: boolean,
 *   badge?: string,
 * }} MenuSelectOption
 */

/**
 * @typedef {{
 *   id: string,
 *   label?: string,
 *   options: MenuSelectOption[],
 * }} MenuSelectGroup
 */

/**
 * @param {MenuSelectOption[]} options
 * @param {MenuSelectGroup[]|undefined} groups
 * @return {MenuSelectGroup[]}
 */
function resolveGroups(options, groups) {
	if (Array.isArray(groups) && groups.length > 0) {
		return groups.filter(
			(group) =>
				group &&
				Array.isArray(group.options) &&
				group.options.length > 0
		);
	}
	if (Array.isArray(options) && options.length > 0) {
		return [{ id: 'default', label: '', options }];
	}
	return [];
}

/**
 * @param {MenuSelectGroup[]} groups
 * @param {string} currentKey
 * @return {MenuSelectOption|null}
 */
function findSelectedOption(groups, currentKey) {
	for (let g = 0; g < groups.length; g++) {
		const list = groups[g].options;
		for (let i = 0; i < list.length; i++) {
			if (String(list[i].value) === currentKey) {
				return list[i];
			}
		}
	}
	return null;
}

/**
 * Custom select — trigger + flyout menu (grouped rows, optional icons).
 *
 * Search is intentionally not built in; pass `menuHeader` later for a search field.
 *
 * @param {Object} props
 * @param {MenuSelectOption[]} [props.options] Flat list (ignored when `groups` is set)
 * @param {MenuSelectGroup[]} [props.groups] Grouped options with optional section labels
 * @param {string} [props.value]
 * @param {Function} [props.onChange] Receives string value
 * @param {boolean} [props.disabled]
 * @param {string} [props.help]
 * @param {string} [props.className]
 * @param {string} [props.id]
 * @param {string} [props.listLabel] aria-label for the menu
 * @param {string} [props.placeholder] Label when value is empty / unknown
 * @param {import('react').ReactNode} [props.menuHeader] Optional content above the option list
 */
export const MenuSelect = forwardRef(function MenuSelect(
	{
		options = [],
		groups: groupsProp,
		value = '',
		onChange,
		disabled = false,
		help,
		className = '',
		id: idProp,
		listLabel = 'Select option',
		placeholder = 'Select…',
		menuHeader = null,
		...rest
	},
	ref
) {
	const genId = useId();
	const id = idProp || `modula-ui-menu-select-${genId}`;
	const listId = `${id}-menu`;
	const rootRef = useRef(/** @type {HTMLDivElement|null} */ (null));
	const [open, setOpen] = useState(false);

	const groups = useMemo(
		() => resolveGroups(options, groupsProp),
		[options, groupsProp]
	);

	const currentKey =
		value === null || value === undefined ? '' : String(value);
	const selected = findSelectedOption(groups, currentKey);
	const triggerLabel = selected?.label || placeholder;
	const triggerIcon = selected?.icon ?? null;

	const close = useCallback(() => setOpen(false), []);

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const onDocPointer = (event) => {
			const root = rootRef.current;
			if (!root || !(event.target instanceof Node)) {
				return;
			}
			if (!root.contains(event.target)) {
				close();
			}
		};
		const onKey = (event) => {
			if (event.key === 'Escape') {
				close();
			}
		};
		document.addEventListener('mousedown', onDocPointer);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocPointer);
			document.removeEventListener('keydown', onKey);
		};
	}, [open, close]);

	const classes = ['modula-ui-menu-select', className]
		.filter(Boolean)
		.join(' ');

	return (
		<div
			ref={(node) => {
				rootRef.current = node;
				if (typeof ref === 'function') {
					ref(node);
				} else if (ref) {
					ref.current = node;
				}
			}}
			className={classes}
			{...rest}
		>
			<button
				type="button"
				id={id}
				className="modula-ui-menu-select__trigger"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={listId}
				disabled={disabled}
				onClick={() => {
					if (!disabled) {
						setOpen((was) => !was);
					}
				}}
			>
				{triggerIcon ? (
					<span
						className="modula-ui-menu-select__trigger-icon"
						aria-hidden="true"
					>
						{triggerIcon}
					</span>
				) : null}
				<span className="modula-ui-menu-select__trigger-label">
					{triggerLabel}
				</span>
				<span
					className="modula-ui-menu-select__caret"
					aria-hidden="true"
				/>
			</button>
			{open ? (
				<div className="modula-ui-menu-select__menu" id={listId}>
					{menuHeader ? (
						<div className="modula-ui-menu-select__menu-header">
							{menuHeader}
						</div>
					) : null}
					<ul
						className="modula-ui-menu-select__list"
						role="listbox"
						aria-label={listLabel}
					>
						{groups.map((group) => (
							<li
								key={group.id}
								className="modula-ui-menu-select__group"
								role="none"
							>
								{group.label ? (
									<div
										className="modula-ui-menu-select__group-label"
										role="presentation"
									>
										{group.label}
									</div>
								) : null}
								<ul
									className="modula-ui-menu-select__group-list"
									role="group"
									aria-label={group.label || undefined}
								>
									{group.options.map((opt) => {
										const key = String(opt.value);
										const isSelected = key === currentKey;
										const optDisabled =
											Boolean(opt.disabled) || disabled;
										return (
											<li
												key={key}
												className="modula-ui-menu-select__item"
												role="presentation"
											>
												<button
													type="button"
													role="option"
													aria-selected={isSelected}
													disabled={optDisabled}
													className={`modula-ui-menu-select__option${
														isSelected
															? ' is-selected'
															: ''
													}${
														optDisabled
															? ' is-disabled'
															: ''
													}`}
													onClick={() => {
														if (optDisabled) {
															return;
														}
														if (
															typeof onChange ===
															'function'
														) {
															onChange(key);
														}
														close();
													}}
												>
													{opt.icon ? (
														<span
															className="modula-ui-menu-select__option-icon"
															aria-hidden="true"
														>
															{opt.icon}
														</span>
													) : null}
													<span className="modula-ui-menu-select__option-label-wrap">
														<span className="modula-ui-menu-select__option-label">
															{opt.label}
														</span>
														{opt.badge ? (
															<span
																className="modula-ui-menu-select__option-badge"
																aria-hidden="true"
															>
																{opt.badge}
															</span>
														) : null}
													</span>
													{isSelected ? (
														<span
															className="modula-ui-menu-select__option-check"
															aria-hidden="true"
														/>
													) : null}
												</button>
											</li>
										);
									})}
								</ul>
							</li>
						))}
					</ul>
				</div>
			) : null}
			{help ? (
				<p className="modula-ui-menu-select__help">{help}</p>
			) : null}
		</div>
	);
});
