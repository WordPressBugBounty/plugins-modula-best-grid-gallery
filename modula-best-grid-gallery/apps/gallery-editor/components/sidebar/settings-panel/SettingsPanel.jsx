/**
 * Redesign settings panel column — header + hub body (skeleton: drills only).
 * Image edit and Sort & order replace the hub (settings-column takeovers).
 */
import { useMemo } from '@wordpress/element';
import { SETTINGS_EDITOR_CATEGORIES } from '../../../constants/editorStructure';
import {
	getSidebarV2CategoryPanelDesc,
	getSidebarV2DrillDescription,
} from '../../../constants/sidebarV2Meta';
import { useTakeoverSidebarStack } from '../../../context/TakeoverSidebarStackContext';
import { useGalleryItemEditSidebar } from '../../../context/GalleryItemEditSidebarContext';
import { useGalleryReorderSidebar } from '../../../context/GalleryReorderSidebarContext';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import { resolveGalleryAdminPostId } from '../../../utils/resolveGalleryAdminPostId';
import SettingsPanelHeader from './SettingsPanelHeader';
import SettingsPanelBody from './SettingsPanelBody';
import GalleryItemEditPanel from '../../gallery-item-edit-panel/GalleryItemEditPanel';
import GalleryItemFocusPanel from '../../gallery-item-edit-panel/GalleryItemFocusPanel';
import GalleryItemContentBlockPanel from '../../gallery-item-edit-panel/GalleryItemContentBlockPanel';
import GalleryReorderPanel from '../../gallery-reorder/GalleryReorderPanel';
import { usePreviewReduxStoreItems } from '../../../hooks/usePreviewReduxStoreItems';
import { isContentBlockGalleryItemRow } from '../../../utils/embeddedGalleryItems';

/**
 * @param {Object}                 props
 * @param {string}                 props.activeCategory
 * @param {(name: string) => void} props.setActiveCategory
 */
export default function SettingsPanel({ activeCategory, setActiveCategory }) {
	const { stack, stackDepth, popFrame, clearStack } =
		useTakeoverSidebarStack();
	const itemEdit = useGalleryItemEditSidebar();
	const reorderSidebar = useGalleryReorderSidebar();
	const editor = useModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(editor);
	const previewItems = usePreviewReduxStoreItems(
		Boolean(itemEdit?.isOpen && itemEdit.storeIndex !== null)
	);

	const category = useMemo(
		() => SETTINGS_EDITOR_CATEGORIES.find((c) => c.name === activeCategory),
		[activeCategory]
	);

	const activeCategoryTitle = category?.title ?? activeCategory;
	const nestedFrameTitle = stack[stack.length - 1]?.title ?? '';
	const nestedFrameHelp = stack[stack.length - 1]?.hubHelp ?? '';
	const isNested = stackDepth > 0;

	const description = useMemo(() => {
		if (isNested) {
			return getSidebarV2DrillDescription(
				nestedFrameTitle,
				nestedFrameHelp
			);
		}
		if (!category) {
			return '';
		}
		return getSidebarV2CategoryPanelDesc(
			category.name,
			category.description
		);
	}, [category, isNested, nestedFrameTitle, nestedFrameHelp]);

	if (reorderSidebar?.isOpen && galleryId) {
		return <GalleryReorderPanel galleryId={galleryId} />;
	}

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
			<SettingsPanelHeader
				title={isNested ? nestedFrameTitle : activeCategoryTitle}
				description={description}
				isNested={isNested}
				parentTitle={activeCategoryTitle}
				onBack={() => {
					if (stackDepth > 0) {
						popFrame();
						return;
					}
					clearStack();
				}}
			/>
			<div className="modula-settings-panel__scroll">
				<SettingsPanelBody
					category={category}
					onExitCategory={setActiveCategory}
				/>
			</div>
		</div>
	);
}
