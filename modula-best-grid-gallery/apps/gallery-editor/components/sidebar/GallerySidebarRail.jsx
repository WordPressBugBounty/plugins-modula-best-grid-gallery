/**
 * Redesign isolation — category rail + settings panel column (no preview canvas).
 *
 * HoverEffectBuilderProvider lives on GalleryTakeoverShell (aux + nested share it).
 */
import { useCallback, useState } from '@wordpress/element';
import { TakeoverSidebar } from 'editor-shell';
import TakeoverSidebarNavV2 from './TakeoverSidebarNavV2';
import SettingsPanel from './settings-panel/SettingsPanel';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';

/**
 * @param {Object}                 props
 * @param {string}                 props.activeCategory
 * @param {(name: string) => void} props.setActiveCategory
 */
export default function GallerySidebarRail({
	activeCategory,
	setActiveCategory,
}) {
	const itemEdit = useGalleryItemEditSidebar();
	// Setting search lives here so switching the rail tab clears it.
	const [searchQuery, setSearchQuery] = useState('');

	const selectCategory = useCallback(
		(name) => {
			// Like "Back to settings": the panel goes, the tile stays selected.
			if (itemEdit?.isOpen) {
				itemEdit.back();
			}
			setSearchQuery('');
			setActiveCategory(name);
		},
		[itemEdit, setActiveCategory]
	);

	return (
		<TakeoverSidebar
			rail={
				<TakeoverSidebarNavV2
					activeCategory={activeCategory}
					onActiveCategoryChange={selectCategory}
					onSelect={selectCategory}
				/>
			}
		>
			<SettingsPanel
				activeCategory={activeCategory}
				onSelectCategory={selectCategory}
				searchQuery={searchQuery}
				onSearchQueryChange={setSearchQuery}
			/>
		</TakeoverSidebar>
	);
}
