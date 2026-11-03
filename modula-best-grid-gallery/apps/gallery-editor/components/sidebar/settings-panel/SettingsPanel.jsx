/**
 * Redesign settings panel column — Setting search over the category's hub
 * and "More settings" sections. Image edit replaces it (a settings-column
 * takeover).
 */
import { useMemo, useRef, useState } from '@wordpress/element';
import { useRevealSettingRow } from 'editor-shell';
import { SETTINGS_EDITOR_CATEGORIES } from '../../../constants/editorStructure';
import { useGalleryItemEditSidebar } from '../../../context/GalleryItemEditSidebarContext';
import { useSettingsPanelSections } from '../../../context/SettingsPanelSectionsContext';
import SettingSearch from './SettingSearch';
import SettingsPanelBody from './SettingsPanelBody';
import GalleryItemEditPanel from '../../gallery-item-edit-panel/GalleryItemEditPanel';
import GalleryItemFocusPanel from '../../gallery-item-edit-panel/GalleryItemFocusPanel';
import GalleryItemContentBlockPanel from '../../gallery-item-edit-panel/GalleryItemContentBlockPanel';
import { usePreviewReduxStoreItems } from '../../../hooks/usePreviewReduxStoreItems';
import {
	isContentBlockGalleryItemRow,
	isEmbeddedGalleryItemRow,
} from '../../../utils/embeddedGalleryItems';
import GalleryItemShortcodePanel from '../../gallery-item-edit-panel/GalleryItemShortcodePanel';

/**
 * @param {Object}                 props
 * @param {string}                 props.activeCategory
 * @param {(name: string) => void} props.onSelectCategory    Switches the rail tab (and clears the search).
 * @param {string}                 props.searchQuery
 * @param {(next: string) => void} props.onSearchQueryChange
 */
export default function SettingsPanel({
	activeCategory,
	onSelectCategory,
	searchQuery,
	onSearchQueryChange,
}) {
	const itemEdit = useGalleryItemEditSidebar();
	const { setSectionOpen } = useSettingsPanelSections();
	const scrollRef = useRef(null);
	const [revealTarget, setRevealTarget] = useState(null);
	useRevealSettingRow(scrollRef, revealTarget);
	const previewItems = usePreviewReduxStoreItems(
		Boolean(itemEdit?.isOpen && itemEdit.storeIndex !== null)
	);

	const category = useMemo(
		() => SETTINGS_EDITOR_CATEGORIES.find((c) => c.name === activeCategory),
		[activeCategory]
	);

	/**
	 * Lands on a search result: its category, its sections open, its row.
	 *
	 * @param {import('../../../logic/settingSearch').SettingSearchResult} result
	 */
	const chooseSetting = (result) => {
		result.sectionKeys.forEach((key) => setSectionOpen(key, true));
		onSelectCategory(result.categoryName);
		setRevealTarget({ anchor: result.anchor });
	};

	if (itemEdit?.isOpen && itemEdit.storeIndex !== null) {
		const editItem = previewItems[itemEdit.storeIndex];
		if (isContentBlockGalleryItemRow(editItem)) {
			return (
				<GalleryItemContentBlockPanel
					key={`cb-${itemEdit.storeIndex}`}
					storeIndex={itemEdit.storeIndex}
				/>
			);
		}
		if (isEmbeddedGalleryItemRow(editItem)) {
			return (
				<GalleryItemShortcodePanel
					key={`shortcode-${itemEdit.storeIndex}`}
					storeIndex={itemEdit.storeIndex}
				/>
			);
		}
		if (itemEdit.view === 'focus') {
			return (
				<GalleryItemFocusPanel
					key={`focus-${itemEdit.storeIndex}`}
					storeIndex={itemEdit.storeIndex}
				/>
			);
		}
		return (
			<GalleryItemEditPanel
				key={itemEdit.storeIndex}
				storeIndex={itemEdit.storeIndex}
			/>
		);
	}

	if (!category) {
		return null;
	}

	return (
		<div className="modula-settings-panel">
			<SettingSearch
				query={searchQuery}
				onQueryChange={onSearchQueryChange}
				onChoose={chooseSetting}
			>
				{/* The canvas shows no category title; the rail names it. */}
				<h2 className="screen-reader-text">{category.title}</h2>
				<div className="modula-settings-panel__scroll" ref={scrollRef}>
					<SettingsPanelBody category={category} />
				</div>
			</SettingSearch>
		</div>
	);
}
