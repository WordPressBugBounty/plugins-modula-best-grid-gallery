import { Dropdown } from '@wordpress/components';
import { Icon, check } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';

/**
 * Shared listing dropdown shell (row actions, toolbar filters).
 *
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props.popoverClassName]
 * @param {'bottom-start'|'bottom-end'} [props.placement]
 * @param {boolean} [props.open] Controlled open state.
 * @param {(nextOpen: boolean) => void} [props.onToggle] Controlled open callback.
 * @param {(args: { isOpen: boolean, onToggle: () => void }) => import('react').ReactNode} props.renderToggle
 * @param {(args: { onClose: () => void }) => import('react').ReactNode} props.renderContent
 */
export function ListingDropdown({
	className = '',
	popoverClassName = 'modula-listing-dropdown__popover',
	placement = 'bottom-start',
	open,
	onToggle,
	renderToggle,
	renderContent,
}) {
	return (
		<Dropdown
			open={open}
			onToggle={onToggle}
			popoverProps={{
				placement,
				className: popoverClassName,
			}}
			renderToggle={renderToggle}
			renderContent={({ onClose }) => (
				<div
					className={['modula-listing-dropdown__menu', className]
						.filter(Boolean)
						.join(' ')}
				>
					{renderContent({ onClose })}
				</div>
			)}
		/>
	);
}

/**
 * @param {Object} props
 * @param {import('@wordpress/icons').IconType} props.icon
 * @param {string} props.label
 * @param {boolean} props.isOpen
 * @param {() => void} props.onToggle
 * @param {string} [props.className]
 */
export function ListingDropdownToolbarTrigger({
	icon,
	label,
	isOpen,
	onToggle,
	className = '',
}) {
	return (
		<button
			type="button"
			className={[
				'modula-listing-dropdown__toolbar-trigger',
				className,
				isOpen ? 'is-open' : '',
			]
				.filter(Boolean)
				.join(' ')}
			onClick={onToggle}
			aria-expanded={isOpen}
			aria-haspopup="menu"
		>
			<span
				className="modula-listing-dropdown__toolbar-trigger-icon"
				aria-hidden
			>
				<Icon icon={icon} size={16} />
			</span>
			<span className="modula-listing-dropdown__toolbar-trigger-label">
				{label}
			</span>
			<span
				className="modula-listing-dropdown__toolbar-trigger-caret"
				aria-hidden
			/>
		</button>
	);
}

/**
 * @param {Object} props
 * @param {import('@wordpress/icons').IconType} props.icon
 * @param {string} props.label
 * @param {boolean} props.isOpen
 * @param {() => void} props.onToggle
 * @param {string} [props.className]
 */
export function ListingDropdownIconToggle({
	icon,
	label,
	isOpen,
	onToggle,
	className = '',
}) {
	return (
		<button
			type="button"
			className={[
				'modula-listing-dropdown__icon-toggle',
				className,
				isOpen ? 'is-open' : '',
			]
				.filter(Boolean)
				.join(' ')}
			onClick={onToggle}
			aria-expanded={isOpen}
			aria-haspopup="menu"
			aria-label={label}
		>
			<Icon icon={icon} size={20} />
		</button>
	);
}

/**
 * @param {{ label: string }} props
 */
export function ListingDropdownSectionLabel({ label }) {
	return (
		<div
			className="modula-listing-dropdown__section-label"
			role="presentation"
		>
			{label}
		</div>
	);
}

export function ListingDropdownDivider() {
	return (
		<div className="modula-listing-dropdown__divider" role="separator" />
	);
}

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {boolean} [props.isSelected]
 * @param {number|string|null} [props.count]
 * @param {() => void} props.onSelect
 */
export function ListingDropdownRadioItem({
	label,
	isSelected = false,
	count = null,
	onSelect,
}) {
	return (
		<button
			type="button"
			role="menuitemradio"
			aria-checked={isSelected}
			className={[
				'modula-listing-dropdown__radio-item',
				isSelected ? 'is-selected' : '',
			]
				.filter(Boolean)
				.join(' ')}
			onClick={(event) => {
				event.stopPropagation();
				onSelect();
			}}
		>
			{isSelected ? (
				<span
					className="modula-listing-dropdown__radio-item-check"
					aria-hidden
				>
					<Icon icon={check} size={12} />
				</span>
			) : (
				<span
					className="modula-listing-dropdown__radio-item-spacer"
					aria-hidden
				/>
			)}
			<span className="modula-listing-dropdown__radio-item-label">
				{label}
			</span>
			{count !== null && count !== undefined ? (
				<span className="modula-listing-dropdown__radio-item-count">
					{count}
				</span>
			) : null}
		</button>
	);
}

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {boolean} props.checked
 * @param {import('@wordpress/icons').IconType} [props.icon]
 * @param {() => void} props.onToggle
 */
export function ListingDropdownCheckboxItem({
	label,
	checked,
	icon,
	onToggle,
}) {
	return (
		<button
			type="button"
			role="menuitemcheckbox"
			aria-checked={checked}
			className={[
				'modula-listing-dropdown__checkbox-item',
				checked ? 'is-checked' : '',
			]
				.filter(Boolean)
				.join(' ')}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				onToggle();
			}}
			onMouseDown={(event) => {
				event.stopPropagation();
			}}
		>
			<span
				className="modula-listing-dropdown__checkbox-box"
				aria-hidden
			/>
			{icon ? (
				<span
					className="modula-listing-dropdown__checkbox-icon"
					aria-hidden
				>
					<Icon icon={icon} size={16} />
				</span>
			) : null}
			<span className="modula-listing-dropdown__checkbox-label">
				{label}
			</span>
		</button>
	);
}

/**
 * @param {Object} props
 * @param {import('@wordpress/icons').IconType} [props.icon]
 * @param {string} props.label
 * @param {string} [props.description]
 * @param {boolean} [props.showProBadge]
 * @param {boolean} [props.isDestructive]
 * @param {boolean} [props.disabled]
 * @param {() => void} props.onClick
 */
export function ListingDropdownActionItem({
	icon,
	label,
	description,
	showProBadge = false,
	isDestructive = false,
	disabled = false,
	onClick,
}) {
	return (
		<button
			type="button"
			role="menuitem"
			className={[
				'modula-listing-dropdown__action-item',
				description ? 'has-description' : '',
				isDestructive ? 'is-destructive' : '',
			]
				.filter(Boolean)
				.join(' ')}
			disabled={disabled}
			onClick={onClick}
		>
			{icon ? (
				<span
					className="modula-listing-dropdown__action-item-icon"
					aria-hidden
				>
					<Icon icon={icon} size={20} />
				</span>
			) : null}
			<span className="modula-listing-dropdown__action-item-text">
				<span className="modula-listing-dropdown__action-item-label-row">
					<span className="modula-listing-dropdown__action-item-label">
						{label}
					</span>
					{showProBadge ? (
						<span className="modula-listing-dropdown__pro-badge">
							{__('Pro', 'modula-best-grid-gallery')}
						</span>
					) : null}
				</span>
				{description ? (
					<span className="modula-listing-dropdown__action-item-description">
						{description}
					</span>
				) : null}
			</span>
		</button>
	);
}
