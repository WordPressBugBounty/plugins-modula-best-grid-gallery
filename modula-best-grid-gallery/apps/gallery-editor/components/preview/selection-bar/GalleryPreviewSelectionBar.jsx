/**
 * Top selection action bar — count + Set filters / Watermark / Replace / Remove / Done.
 */
import { useCallback, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';
import { Button, TextInput } from 'shared-ui';
import { getModulaSettingsEditorConfig } from '../../../config/modulaSettingsEditorConfig';
import {
	boundGalleryAllowsReplace,
	getBoundGalleryRemoveCopy,
	getBoundGallerySummaryFromEditor,
} from '../../../utils/boundGalleryChromePolicy';
import { useGalleryPreviewAdminActionsOptional } from '../../../hooks/useGalleryPreviewAdminActionsOptional';
import { useWatermarkRegistration } from '../../../hooks/useWatermarkRegistration';
import { resolveProGateLock } from '../../../logic/proGateLock';
import WatermarkActionButtonSlot from '../../field/WatermarkActionButtonSlot';
import SelectionBarActionButton from './SelectionBarActionButton';
import SelectionBarMenu from './SelectionBarMenu';
import SelectionBarMenuFooter from './SelectionBarMenuFooter';
import SelectionBarMenuHeading from './SelectionBarMenuHeading';
import SelectionBarMenuItem from './SelectionBarMenuItem';
import {
	selectionBarFiltersIcon,
	selectionBarFilterAllIcon,
	selectionBarFilterEmptyIcon,
	selectionBarFilterPartialIcon,
	selectionBarMediaLibraryIcon,
	selectionBarPlusIcon,
	selectionBarReplaceIcon,
	selectionBarTrashIcon,
	selectionBarWatermarkIcon,
} from './selectionBarIcons';
import { useSelectionBarModel } from './useSelectionBarModel';

/** @typedef {'filters' | 'watermark' | 'replace' | null} SelectionBarOpenMenu */

/**
 * @param {{
 *   galleryId?: number,
 *   onNavigateCategory?: (name: string) => void,
 *   runPreviewItemMutation?: (task: () => void | Promise<void>) => Promise<void>,
 * }} props
 */
export default function GalleryPreviewSelectionBar({
	galleryId = 0,
	onNavigateCategory,
	runPreviewItemMutation,
}) {
	const editor = getModulaSettingsEditorConfig();
	const adminActions = useGalleryPreviewAdminActionsOptional();
	const watermarkRegistration = useWatermarkRegistration();
	const model = useSelectionBarModel({
		galleryId,
		runPreviewItemMutation,
	});
	const [openMenu, setOpenMenu] = useState(
		/** @type {SelectionBarOpenMenu} */ (null)
	);
	const [addingFilter, setAddingFilter] = useState(false);
	const [newFilterName, setNewFilterName] = useState('');
	const [removeBusy, setRemoveBusy] = useState(false);

	const closeMenu = useCallback(() => {
		setOpenMenu(null);
		setAddingFilter(false);
		setNewFilterName('');
	}, []);

	const toggleMenu = useCallback((id) => {
		setOpenMenu((prev) => (prev === id ? null : id));
		if (id !== 'filters') {
			setAddingFilter(false);
			setNewFilterName('');
		}
	}, []);

	if (!model.hasSelection || model.selectedCount === 0) {
		return null;
	}

	const showFilters = resolveProGateLock(
		{ kind: 'requiresPro' },
		editor
	).allowed;
	const showWatermark =
		resolveProGateLock(
			{ kind: 'requiresExtension', extensionSlug: 'modula-watermark' },
			editor
		).allowed && Boolean(watermarkRegistration?.ActionButton);

	const countLabel = sprintf(
		/* translators: %d: number of selected images */
		_n(
			'%d image selected',
			'%d images selected',
			model.selectedCount,
			'modula-best-grid-gallery'
		),
		model.selectedCount
	);

	const replaceEnabled =
		model.selectedCount >= 1 &&
		boundGalleryAllowsReplace(
			getBoundGallerySummaryFromEditor(editor)
		);
	const removeCopy = getBoundGalleryRemoveCopy(
		getBoundGallerySummaryFromEditor(editor),
		{ isSourceImage: true }
	);

	const onReplaceFromLibrary = async () => {
		if (!replaceEnabled || !adminActions?.openReplaceMedia) {
			return;
		}
		closeMenu();
		const didReplace = await adminActions.openReplaceMedia(
			model.selectedStoreIndices
		);
		if (didReplace) {
			model.tileSelection?.clear?.();
		}
	};

	const onRemove = async () => {
		if (!adminActions?.removeItem || removeBusy) {
			return;
		}
		setRemoveBusy(true);
		try {
			const indices = [...model.selectedStoreIndices].sort(
				(a, b) => b - a
			);
			for (const idx of indices) {
				await adminActions.removeItem(idx);
			}
			model.tileSelection?.clear?.();
		} finally {
			setRemoveBusy(false);
		}
	};

	const commitNewFilter = async () => {
		const name = newFilterName.trim();
		if (!name) {
			setAddingFilter(false);
			setNewFilterName('');
			return;
		}
		await model.addNewFilterToSelection(name);
		setAddingFilter(false);
		setNewFilterName('');
	};

	const filterIconForState = (state) => {
		if (state === 'all') {
			return selectionBarFilterAllIcon;
		}
		if (state === 'partial') {
			return selectionBarFilterPartialIcon;
		}
		return selectionBarFilterEmptyIcon;
	};

	return (
		<div
			className="modula-gallery-takeover__selection-bar"
			role="toolbar"
			aria-label={__('Selection actions', 'modula-best-grid-gallery')}
		>
			<span className="modula-gallery-takeover__selection-bar-count">
				{countLabel}
			</span>
			<span className="modula-gallery-takeover__selection-bar-spacer" />

			{showFilters ? (
				<div className="modula-gallery-takeover__selection-bar-menu-wrap">
					<SelectionBarActionButton
						icon={selectionBarFiltersIcon}
						chevron
						aria-haspopup="menu"
						aria-expanded={openMenu === 'filters'}
						title={__(
							'Set filters on the selected images',
							'modula-best-grid-gallery'
						)}
						onClick={() => toggleMenu('filters')}
					>
						{__('Set filters', 'modula-best-grid-gallery')}
					</SelectionBarActionButton>
					<SelectionBarMenu
						open={openMenu === 'filters'}
						onClose={closeMenu}
					>
						<SelectionBarMenuHeading>
							{__(
								'Filters on the selection',
								'modula-best-grid-gallery'
							)}
						</SelectionBarMenuHeading>
						{model.galleryFilterNames.length === 0 ? (
							<p className="modula-gallery-takeover__selection-bar-wm-now">
								{__(
									'No filters yet. Add one below.',
									'modula-best-grid-gallery'
								)}
							</p>
						) : (
							model.galleryFilterNames.map((name) => {
								const { state, hitCount } =
									model.getFilterState(name);
								return (
									<SelectionBarMenuItem
										key={name}
										icon={filterIconForState(state)}
										iconClassName={
											state === 'none' ? '' : 'is-accent'
										}
										count={`${hitCount}/${model.selectedCount}`}
										disabled={model.filterBusy}
										onClick={() => {
											model.toggleFilterOnSelection(name);
										}}
									>
										{name}
									</SelectionBarMenuItem>
								);
							})
						)}
						{addingFilter ? (
							<div className="modula-gallery-takeover__selection-bar-menu-new">
								<TextInput
									value={newFilterName}
									onChange={setNewFilterName}
									placeholder={__(
										'Filter name',
										'modula-best-grid-gallery'
									)}
									disabled={model.filterBusy}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											commitNewFilter();
										}
										if (e.key === 'Escape') {
											e.preventDefault();
											setAddingFilter(false);
											setNewFilterName('');
										}
									}}
								/>
							</div>
						) : null}
						<SelectionBarMenuFooter>
							{!addingFilter ? (
								<Button
									type="button"
									variant="plain"
									mini
									className="modula-gallery-takeover__selection-bar-chip-add"
									disabled={model.filterBusy}
									onClick={() => setAddingFilter(true)}
								>
									<span aria-hidden="true">
										<Icon
											icon={selectionBarPlusIcon}
											size={11}
										/>
									</span>
									{__(
										'New filter',
										'modula-best-grid-gallery'
									)}
								</Button>
							) : (
								<Button
									type="button"
									variant="plain"
									mini
									disabled={model.filterBusy}
									onClick={commitNewFilter}
								>
									{__('Add', 'modula-best-grid-gallery')}
								</Button>
							)}
							<SelectionBarActionButton
								onClick={() => {
									closeMenu();
									onNavigateCategory?.('filters');
								}}
							>
								{__(
									'Manage all',
									'modula-best-grid-gallery'
								)}
							</SelectionBarActionButton>
						</SelectionBarMenuFooter>
					</SelectionBarMenu>
				</div>
			) : null}

			{showWatermark ? (
				<div className="modula-gallery-takeover__selection-bar-menu-wrap">
					<SelectionBarActionButton
						icon={selectionBarWatermarkIcon}
						chevron
						aria-haspopup="menu"
						aria-expanded={openMenu === 'watermark'}
						title={__(
							'Apply the watermark to the selected images',
							'modula-best-grid-gallery'
						)}
						onClick={() => toggleMenu('watermark')}
					>
						{__('Watermark', 'modula-best-grid-gallery')}
					</SelectionBarActionButton>
					<SelectionBarMenu
						open={openMenu === 'watermark'}
						onClose={closeMenu}
					>
						<SelectionBarMenuHeading>
							{__('Watermark', 'modula-best-grid-gallery')}
						</SelectionBarMenuHeading>
						<div className="modula-gallery-takeover__selection-bar-wm-now">
							{sprintf(
								/* translators: %s: watermark type summary */
								__('Current: %s', 'modula-best-grid-gallery'),
								model.watermarkSummary
							)}
						</div>
						<div className="modula-gallery-takeover__selection-bar-wm-actions">
							<WatermarkActionButtonSlot
								action="apply_watermark"
								buttonLabel={sprintf(
									/* translators: %d: number of images */
									__(
										'Apply to selection (%d)',
										'modula-best-grid-gallery'
									),
									model.attachmentIds.length
								)}
								disabled={model.attachmentIds.length === 0}
								imageIds={model.attachmentIds}
								mini
							/>
							<WatermarkActionButtonSlot
								action="remove_watermark"
								buttonLabel={sprintf(
									/* translators: %d: number of images */
									__(
										'Strip from selection (%d)',
										'modula-best-grid-gallery'
									),
									model.attachmentIds.length
								)}
								disabled={model.attachmentIds.length === 0}
								imageIds={model.attachmentIds}
								mini
							/>
						</div>
						<SelectionBarMenuFooter
							note={__(
								'Re-processes the files',
								'modula-best-grid-gallery'
							)}
						>
							<SelectionBarActionButton
								onClick={() => {
									closeMenu();
									onNavigateCategory?.('protection');
								}}
							>
								{__('Change it', 'modula-best-grid-gallery')}
							</SelectionBarActionButton>
						</SelectionBarMenuFooter>
					</SelectionBarMenu>
				</div>
			) : null}

			{replaceEnabled ? (
			<div className="modula-gallery-takeover__selection-bar-menu-wrap">
				<SelectionBarActionButton
					icon={selectionBarReplaceIcon}
					chevron
					disabled={!replaceEnabled}
					aria-haspopup="menu"
					aria-expanded={openMenu === 'replace'}
					title={__(
						'Replace the selected images',
						'modula-best-grid-gallery'
					)}
					onClick={() => {
						if (!replaceEnabled) {
							return;
						}
						toggleMenu('replace');
					}}
				>
					{__('Replace', 'modula-best-grid-gallery')}
				</SelectionBarActionButton>
				<SelectionBarMenu
					open={openMenu === 'replace' && replaceEnabled}
					onClose={closeMenu}
					align="end"
				>
					<SelectionBarMenuHeading>
						{__('Replace with', 'modula-best-grid-gallery')}
					</SelectionBarMenuHeading>
					<SelectionBarMenuItem
						icon={selectionBarMediaLibraryIcon}
						onClick={onReplaceFromLibrary}
					>
						{__('The media library', 'modula-best-grid-gallery')}
					</SelectionBarMenuItem>
					<SelectionBarMenuFooter
						note={__(
							'Clears the caption and alt text',
							'modula-best-grid-gallery'
						)}
					/>
				</SelectionBarMenu>
			</div>
			) : null}

			<SelectionBarActionButton
				icon={selectionBarTrashIcon}
				danger
				disabled={removeBusy || !adminActions?.removeItem}
				confirm={removeCopy.confirmLabel}
				title={removeCopy.actionLabel}
				onClick={onRemove}
			>
				{removeCopy.isHide
					? __('Hide', 'modula-best-grid-gallery')
					: __('Remove', 'modula-best-grid-gallery')}
			</SelectionBarActionButton>

			<span
				className="modula-gallery-takeover__selection-bar-divider"
				aria-hidden="true"
			/>

			<SelectionBarActionButton onClick={() => model.exitMode()}>
				{__('Done', 'modula-best-grid-gallery')}
			</SelectionBarActionButton>
		</div>
	);
}
