/**
 * Add split: primary add action + caret menu of grouped add sources.
 * Without a primary action it renders one menu trigger instead (menu-only).
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, chevronDown, plus } from '@wordpress/icons';

/**
 * @typedef {Object} AddSplitRow
 * @property {string}                                               id         Stable row key.
 * @property {string}                                               label      Visible menu label.
 * @property {import('react').ReactElement}                         icon       Row icon.
 * @property {boolean}                                              actionable False renders the row disabled.
 * @property {{ text: string, hint: string, variant: string }|null} [badge]    Requirement badge for unavailable rows.
 */

/**
 * @param {Object}                                                    props
 * @param {string}                                                    props.mainLabel   Primary action label (e.g. Add images), or the menu trigger's visible label.
 * @param {() => void}                                                [props.onPrimary] Omit for menu-only mode: one trigger that always opens the menu.
 * @param {string}                                                    props.caretLabel  Accessible name of the caret, or of the menu-only trigger.
 * @param {Array<{ id: string, label: string, rows: AddSplitRow[] }>} props.menuGroups
 * @param {(row: AddSplitRow) => void}                                props.onSelectRow Called after the menu closes.
 */
export default function AddSplit({
	mainLabel,
	onPrimary,
	caretLabel,
	menuGroups,
	onSelectRow,
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const wrapRef = useRef(null);

	useEffect(() => {
		if (!menuOpen) {
			return undefined;
		}
		const onDoc = (e) => {
			const el = wrapRef.current;
			if (el && e.target instanceof Node && !el.contains(e.target)) {
				setMenuOpen(false);
			}
		};
		const onKey = (e) => {
			if (e.key === 'Escape') {
				setMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', onDoc, true);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc, true);
			document.removeEventListener('keydown', onKey);
		};
	}, [menuOpen]);

	const toggleMenu = () => setMenuOpen((o) => !o);

	return (
		<div ref={wrapRef} className="modula-takeover__preview-add-split">
			<div className="modula-takeover__preview-add-split-inner">
				{onPrimary ? (
					<>
						<button
							type="button"
							className="modula-takeover__preview-add-split-main"
							onClick={onPrimary}
						>
							<Icon icon={plus} size={16} />
							<span>{mainLabel}</span>
						</button>
						<button
							type="button"
							className="modula-takeover__preview-add-split-caret"
							aria-expanded={menuOpen}
							aria-haspopup="menu"
							onClick={toggleMenu}
						>
							<Icon icon={chevronDown} size={16} />
							<span className="screen-reader-text">
								{caretLabel}
							</span>
						</button>
					</>
				) : (
					<button
						type="button"
						className="modula-takeover__preview-add-split-main"
						aria-label={caretLabel}
						aria-expanded={menuOpen}
						aria-haspopup="menu"
						onClick={toggleMenu}
					>
						<Icon icon={plus} size={16} />
						<span>{mainLabel}</span>
						<Icon icon={chevronDown} size={16} />
					</button>
				)}
			</div>
			{menuOpen ? (
				<ul className="modula-takeover__preview-add-menu" role="menu">
					{menuGroups.map((group) => (
						<li
							key={group.id}
							className="modula-takeover__preview-add-menu-group"
							role="none"
						>
							{group.label ? (
								<div
									className="modula-takeover__preview-add-menu-group-label"
									role="presentation"
								>
									{group.label}
								</div>
							) : null}
							<ul
								className="modula-takeover__preview-add-menu-group-list"
								role="group"
								aria-label={group.label || undefined}
							>
								{group.rows.map((row) => (
									<AddSplitMenuItem
										key={row.id}
										row={row}
										onSelect={() => {
											setMenuOpen(false);
											onSelectRow(row);
										}}
									/>
								))}
							</ul>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}

/**
 * @param {Object}      props
 * @param {AddSplitRow} props.row
 * @param {() => void}  props.onSelect
 */
function AddSplitMenuItem({ row, onSelect }) {
	const { actionable, badge } = row;
	const ariaHint =
		!actionable && badge
			? sprintf(
					/* translators: 1: action label, 2: requirement note */
					__('%1$s — %2$s', 'modula-best-grid-gallery'),
					row.label,
					badge.hint
				)
			: undefined;

	return (
		<li className="modula-takeover__preview-add-menu-item" role="none">
			<button
				type="button"
				className={
					actionable
						? 'modula-takeover__preview-add-menu-btn'
						: 'modula-takeover__preview-add-menu-btn is-disabled'
				}
				role="menuitem"
				disabled={!actionable}
				aria-label={ariaHint}
				title={badge && !actionable ? badge.hint : undefined}
				onClick={() => {
					if (actionable) {
						onSelect();
					}
				}}
			>
				<span
					className="modula-takeover__preview-add-menu-icon"
					aria-hidden="true"
				>
					<Icon icon={row.icon} size={15} />
				</span>
				<span className="modula-takeover__preview-add-menu-label-wrap">
					<span className="modula-takeover__preview-add-menu-label">
						{row.label}
					</span>
					{badge ? (
						<span
							className={`modula-takeover__preview-add-menu-badge is-${badge.variant}`}
							aria-hidden="true"
						>
							{badge.text}
						</span>
					) : null}
				</span>
			</button>
		</li>
	);
}
