/**
 * Redesign isolation — category rail + settings panel column (no preview canvas).
 *
 * Full two-column sidebar + CategoryPanelContentV2 is quarantined under `legacy/`.
 * HoverEffectBuilderProvider lives on GalleryTakeoverShell (aux + nested share it).
 */
import { useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import TakeoverSidebarNavV2 from './TakeoverSidebarNavV2';
import SettingsPanel from './settings-panel/SettingsPanel';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import { useGalleryReorderSidebar } from '../../context/GalleryReorderSidebarContext';
import { useTakeoverSidebarStack } from '../../context/TakeoverSidebarStackContext';

/**
 * @param {Object}                 props
 * @param {string}                 props.activeCategory
 * @param {(name: string) => void} props.setActiveCategory
 * @param {string}                 [props.docsUrl]
 */
export default function GallerySidebarRail({
	activeCategory,
	setActiveCategory,
	docsUrl = '',
}) {
	const itemEdit = useGalleryItemEditSidebar();
	const reorderSidebar = useGalleryReorderSidebar();
	const { clearStack } = useTakeoverSidebarStack();

	const selectCategory = useCallback(
		(name) => {
			if (itemEdit?.isOpen) {
				itemEdit.close();
			}
			if (reorderSidebar?.isOpen) {
				reorderSidebar.close();
			}
			clearStack();
			setActiveCategory(name);
		},
		[clearStack, itemEdit, reorderSidebar, setActiveCategory]
	);

	return (
		<aside
			className="modula-gallery-takeover__sidebar modula-gallery-takeover__sidebar--v2"
			aria-label={__('Settings', 'modula-best-grid-gallery')}
		>
			<div className="modula-gallery-takeover__sidebar-body modula-gallery-takeover__sidebar-body--v2">
				<div className="modula-gallery-takeover__sidebar-v2-columns">
					<div className="modula-gallery-takeover__sidebar-v2-nav-column">
						<TakeoverSidebarNavV2
							activeCategory={activeCategory}
							onActiveCategoryChange={selectCategory}
							onSelect={selectCategory}
							docsUrl={docsUrl}
						/>
					</div>
					<div className="modula-gallery-takeover__sidebar-v2-settings-column">
						<SettingsPanel
							activeCategory={activeCategory}
							setActiveCategory={selectCategory}
						/>
					</div>
				</div>
			</div>
		</aside>
	);
}
