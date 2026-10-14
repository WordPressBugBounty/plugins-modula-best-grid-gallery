/**
 * Category rail — fixed icon + short label per visible category, then the rail footer.
 */
import { useLayoutEffect } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import SidebarRailFooter from './SidebarRailFooter';

/**
 * @param {{ title?: string }} category
 * @return {string} Visible rail caption.
 */
const titleAsRailLabel = (category) =>
	typeof category?.title === 'string' ? category.title : '';

/**
 * @param {Object}                                                props
 * @param {Array<{ name: string, title: string }>}                props.categories             Categories visible for the current document.
 * @param {string}                                                props.activeCategory
 * @param {(name: string) => void}                                props.onActiveCategoryChange Called when the active category is no longer visible.
 * @param {(name: string) => void}                                props.onSelect
 * @param {Record<string, import('react').ReactElement>}          [props.icons]                Category name → rail icon.
 * @param {(category: { name: string, title: string }) => string} [props.getRailLabel]         Short caption under the icon.
 * @param {string}                                                [props.docsUrl]              Help destination in the rail footer.
 */
export default function SidebarRailNav({
	categories,
	activeCategory,
	onActiveCategoryChange,
	onSelect,
	icons = {},
	getRailLabel = titleAsRailLabel,
	docsUrl = '',
}) {
	useLayoutEffect(() => {
		if (categories.length === 0) {
			return;
		}
		if (!categories.some((c) => c.name === activeCategory)) {
			onActiveCategoryChange(categories[0].name);
		}
	}, [categories, activeCategory, onActiveCategoryChange]);

	return (
		<div className="modula-takeover__sidebar-v2-nav-wrap">
			<nav
				className="modula-takeover__sidebar-v2-nav"
				aria-label={__('Settings sections', 'modula-best-grid-gallery')}
			>
				<ul className="modula-takeover__sidebar-v2-list">
					{categories.map((cat) => {
						const isActive = cat.name === activeCategory;
						const categoryIcon = icons[cat.name];
						const accessibleName = sprintf(
							/* translators: %s: settings section title. */
							__('Open %s settings', 'modula-best-grid-gallery'),
							cat.title
						);
						return (
							<li
								key={cat.name}
								className={`modula-takeover__sidebar-v2-item${
									isActive ? ' is-active' : ''
								}`}
							>
								<button
									type="button"
									className="modula-takeover__sidebar-v2-nav-btn"
									onClick={() => onSelect(cat.name)}
									aria-current={isActive ? 'true' : undefined}
									aria-label={accessibleName}
								>
									<span
										className="modula-takeover__sidebar-v2-nav-icon-wrap"
										aria-hidden="true"
									>
										{categoryIcon ? (
											<Icon
												icon={categoryIcon}
												size={20}
												className="modula-takeover__sidebar-v2-nav-icon"
											/>
										) : null}
									</span>
									<span
										className="modula-takeover__sidebar-v2-nav-title"
										aria-hidden="true"
									>
										{getRailLabel(cat)}
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</nav>
			<SidebarRailFooter docsUrl={docsUrl} />
		</div>
	);
}
