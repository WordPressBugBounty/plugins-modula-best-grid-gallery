/**
 * Top-level category list for sidebar layout V2 — fixed icon + short label rail.
 */

import { useLayoutEffect, useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { SETTINGS_EDITOR_CATEGORIES } from '../../constants/editorStructure';
import { TAKEOVER_CATEGORY_ICONS } from '../../constants/takeoverCategoryIcons';
import { getVisibleCategories } from '../../logic/categoryVisibility';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { getSidebarRailNavLabel } from '../../constants/sidebarRailLabels';
import SidebarRailFooter from './SidebarRailFooter';

/**
 * @param {Object}                 props
 * @param {string}                 props.activeCategory
 * @param {(name: string) => void} props.onActiveCategoryChange
 * @param {(name: string) => void} props.onSelect
 * @param {string}                 [props.docsUrl]
 */
export default function TakeoverSidebarNavV2({
	activeCategory,
	onActiveCategoryChange,
	onSelect,
	docsUrl = '',
}) {
	const { form } = useGallerySettingsFormBundle();

	return (
		<form.Subscribe
			selector={(s) => ({
				general: {
					type: s.values?.general?.type,
				},
			})}
		>
			{(values) => (
				<TakeoverSidebarNavV2Inner
					values={values}
					activeCategory={activeCategory}
					onActiveCategoryChange={onActiveCategoryChange}
					onSelect={onSelect}
					docsUrl={docsUrl}
				/>
			)}
		</form.Subscribe>
	);
}

/**
 * @param {Object}                                  props
 * @param {Record<string, Record<string, unknown>>} props.values
 * @param {string}                                  props.activeCategory
 * @param {(name: string) => void}                  props.onActiveCategoryChange
 * @param {(name: string) => void}                  props.onSelect
 * @param {string}                                  props.docsUrl
 */
function TakeoverSidebarNavV2Inner({
	values,
	activeCategory,
	onActiveCategoryChange,
	onSelect,
	docsUrl,
}) {
	const visible = useMemo(
		() => getVisibleCategories(SETTINGS_EDITOR_CATEGORIES, values),
		[values]
	);

	useLayoutEffect(() => {
		if (visible.length === 0) {
			return;
		}
		if (!visible.some((c) => c.name === activeCategory)) {
			onActiveCategoryChange(visible[0].name);
		}
	}, [visible, activeCategory, onActiveCategoryChange]);

	return (
		<div className="modula-gallery-takeover__sidebar-v2-nav-wrap">
			<nav
				className="modula-gallery-takeover__sidebar-v2-nav"
				aria-label={__('Settings sections', 'modula-best-grid-gallery')}
			>
				<ul className="modula-gallery-takeover__sidebar-v2-list">
					{visible.map((cat) => {
						const isActive = cat.name === activeCategory;
						const categoryIcon = TAKEOVER_CATEGORY_ICONS[cat.name];
						const accessibleName = sprintf(
							/* translators: %s: settings section title. */
							__('Open %s settings', 'modula-best-grid-gallery'),
							cat.title
						);
						return (
							<li
								key={cat.name}
								className={`modula-gallery-takeover__sidebar-v2-item${
									isActive ? ' is-active' : ''
								}`}
							>
								<button
									type="button"
									className="modula-gallery-takeover__sidebar-v2-nav-btn"
									onClick={() => onSelect(cat.name)}
									aria-current={
										isActive ? 'true' : undefined
									}
									aria-label={accessibleName}
								>
									<span
										className="modula-gallery-takeover__sidebar-v2-nav-icon-wrap"
										aria-hidden="true"
									>
										{categoryIcon ? (
											<Icon
												icon={categoryIcon}
												size={20}
												className="modula-gallery-takeover__sidebar-v2-nav-icon"
											/>
										) : null}
									</span>
									<span
										className="modula-gallery-takeover__sidebar-v2-nav-title"
										aria-hidden="true"
									>
										{getSidebarRailNavLabel(cat)}
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
