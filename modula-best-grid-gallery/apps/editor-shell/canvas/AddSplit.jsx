/**
 * Add split: primary add action + caret menu of grouped add sources, on
 * admin-ui's Menu (arrow keys, Escape and focus return come from it).
 * Without a primary action it renders one menu trigger instead (menu-only).
 */
import { useState } from '@wordpress/element';
import { Icon, chevronDown, plus } from '@wordpress/icons';
import { Menu, MenuGroup, MenuItem, PlanBadge } from 'admin-ui';
import { useRegisterCanvasPrimaryAdd } from './CanvasPrimaryAddContext';

/**
 * @typedef {Object} AddSplitRow
 * @property {string}                                               id         Stable row key.
 * @property {string}                                               label      Visible menu label.
 * @property {import('react').ReactElement}                         icon       Row icon.
 * @property {boolean}                                              actionable False renders the row disabled.
 * @property {{ text: string, hint: string, variant: string }|null} [badge]    Requirement badge for unavailable rows; `pro` draws the PRO pill.
 */

/**
 * @param {Object}                                                    props
 * @param {string}                                                    props.mainLabel   Primary action label (e.g. Add images), or the menu trigger's visible label.
 * @param {() => void}                                                [props.onPrimary] Omit for menu-only mode: one trigger that always opens the menu.
 * @param {string}                                                    props.caretLabel  Accessible name of the caret, or of the menu-only trigger; also the menu's name.
 * @param {Array<{ id: string, label: string, rows: AddSplitRow[] }>} props.menuGroups
 * @param {(row: AddSplitRow) => void}                                props.onSelectRow Called when a row is chosen; the menu then closes and focus returns to its trigger.
 */
export default function AddSplit({
	mainLabel,
	onPrimary,
	caretLabel,
	menuGroups,
	onSelectRow,
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	// The empty canvas's "Add images" runs the same action.
	useRegisterCanvasPrimaryAdd(onPrimary);

	const items = (rows) =>
		rows.map((row) => (
			<AddSplitMenuItem
				key={row.id}
				row={row}
				onSelect={() => onSelectRow(row)}
			/>
		));

	return (
		<div className="modula-takeover__preview-add-split">
			{onPrimary ? (
				<button
					type="button"
					className="modula-takeover__preview-add-split-main"
					onClick={onPrimary}
				>
					<Icon icon={plus} size={18} />
					<span>{mainLabel}</span>
				</button>
			) : null}
			<Menu
				open={menuOpen}
				onOpenChange={setMenuOpen}
				label={caretLabel}
				align="end"
				trigger={(triggerProps) =>
					onPrimary ? (
						<button
							type="button"
							className="modula-takeover__preview-add-split-caret"
							aria-label={caretLabel}
							{...triggerProps}
						>
							<Icon icon={chevronDown} size={18} />
						</button>
					) : (
						<button
							type="button"
							className="modula-takeover__preview-add-split-main"
							aria-label={caretLabel}
							{...triggerProps}
						>
							<Icon icon={plus} size={18} />
							<span>{mainLabel}</span>
							<Icon icon={chevronDown} size={18} />
						</button>
					)
				}
			>
				{menuGroups.map((group) =>
					group.label ? (
						<MenuGroup key={group.id} label={group.label}>
							{items(group.rows)}
						</MenuGroup>
					) : (
						items(group.rows)
					)
				)}
			</Menu>
		</div>
	);
}

/**
 * A disabled row keeps its requirement: the PRO pill or a short note, and
 * the hint for screen readers.
 *
 * @param {Object}      props
 * @param {AddSplitRow} props.row
 * @param {() => void}  props.onSelect
 */
function AddSplitMenuItem({ row, onSelect }) {
	const { actionable, badge } = row;
	let badgeNode = null;
	if (badge?.variant === 'pro') {
		badgeNode = <PlanBadge plan={badge.text} tone="outline" lock />;
	} else if (badge) {
		badgeNode = (
			<span className="modula-takeover__preview-add-menu-note">
				{badge.text}
			</span>
		);
	}

	return (
		<MenuItem
			icon={<Icon icon={row.icon} size={16} />}
			badge={badgeNode}
			disabled={!actionable}
			onSelect={onSelect}
		>
			{row.label}
			{!actionable && badge?.hint ? (
				<span className="modula-admin-sr-only">{` ${badge.hint}`}</span>
			) : null}
		</MenuItem>
	);
}
