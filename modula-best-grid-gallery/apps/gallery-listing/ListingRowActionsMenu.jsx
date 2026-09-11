import { useState } from '@wordpress/element';
import { __experimentalConfirmDialog as ConfirmDialog } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import {
	arrowRight,
	backup,
	copy,
	edit,
	layout,
	moreVertical,
	pages,
	reusableBlock,
	seen,
	trash,
	undo,
} from '@wordpress/icons';
import { copyText } from './copyText';
import { getGalleryListingConfig } from './config';
import {
	ListingDropdown,
	ListingDropdownActionItem,
	ListingDropdownDivider,
	ListingDropdownIconToggle,
} from './ListingDropdown';
import {
	getListingDestructiveConfirmButtonLabel,
	getListingDestructiveConfirmMessage,
	isListingDestructiveConfirmAction,
} from './listingDestructiveConfirm';
import { getListingRowMenuGroups } from './listingRowActions';
import {
	getViewOnSiteClickTarget,
	isStandaloneEntitled,
} from './listingStandaloneGate';

/** @type {Record<string, import('@wordpress/icons').IconType>} */
const ACTION_ICONS = {
	edit,
	'try-new-editor': layout,
	'convert-new-editor': arrowRight,
	'restore-classic-editor': backup,
	view: seen,
	'copy-shortcode': copy,
	duplicate: pages,
	'apply-preset': reusableBlock,
	trash,
	restore: undo,
	'delete-permanently': trash,
};

/**
 * @param {Object} props
 * @param {Object} props.item
 * @param {(item: Object) => Promise<{ id: number, editUrl?: string }>} [props.duplicateListingRow]
 * @param {(items: Object[]) => Promise<unknown>} [props.trashListingRows]
 * @param {(items: Object[]) => Promise<unknown>} [props.restoreListingRows]
 * @param {(items: Object[]) => Promise<unknown>} [props.deleteListingRows]
 * @param {(items: Object[]) => Promise<unknown>} [props.applyListingPreset]
 * @param {(item: Object) => void} [props.requestGalleryEdit]
 * @param {(item: Object) => Promise<{ id: number, editUrl?: string }>} [props.tryBetaGallery]
 * @param {(item: Object) => Promise<{ id: number, editUrl?: string }>} [props.convertBetaGallery]
 * @param {(item: Object) => Promise<{ id: number, editUrl?: string }>} [props.restoreClassicEditor]
 */
export function ListingRowActionsMenu({
	item,
	duplicateListingRow,
	trashListingRows,
	restoreListingRows,
	deleteListingRows,
	applyListingPreset,
	requestGalleryEdit,
	tryBetaGallery,
	convertBetaGallery,
	restoreClassicEditor,
}) {
	const [busyId, setBusyId] = useState(/** @type {string|null} */ (null));
	const [pendingConfirm, setPendingConfirm] = useState(
		/** @type {'trash'|'delete-permanently'|'restore-classic-editor'|null} */ (
			null
		)
	);
	const [confirmBusy, setConfirmBusy] = useState(false);
	const listingConfig = getGalleryListingConfig();
	const canUseStandalone = isStandaloneEntitled(listingConfig);
	const groups = getListingRowMenuGroups(item, {
		canUseStandalone,
		canUseApplyPreset: listingConfig.canUseApplyPreset,
		albumTakeoverAvailable: listingConfig.albumTakeoverAvailable,
	});

	if (groups.length === 0) {
		return null;
	}

	const runAction = async (actionId, onClose) => {
		if (busyId || pendingConfirm || confirmBusy) {
			return;
		}

		const def = groups.flat().find((entry) => entry.id === actionId);
		if (!def) {
			onClose();
			return;
		}

		if (isListingDestructiveConfirmAction(actionId)) {
			onClose();
			setPendingConfirm(actionId);
			return;
		}

		setBusyId(actionId);
		try {
			switch (actionId) {
				case 'edit':
					if (typeof requestGalleryEdit === 'function') {
						requestGalleryEdit(item);
					} else if (item.editUrl) {
						window.location.href = item.editUrl;
					}
					break;
				case 'try-new-editor':
					if (typeof tryBetaGallery === 'function') {
						const result = await tryBetaGallery(item);
						if (result?.editUrl) {
							window.location.href = result.editUrl;
						}
					}
					break;
				case 'convert-new-editor':
					if (typeof convertBetaGallery === 'function') {
						const result = await convertBetaGallery(item);
						if (result?.editUrl) {
							window.location.href = result.editUrl;
						}
					}
					break;
				case 'view': {
					const target = getViewOnSiteClickTarget(
						listingConfig,
						item.viewUrl
					);
					if (target.url) {
						window.open(
							target.url,
							'_blank',
							'noopener,noreferrer'
						);
					}
					break;
				}
				case 'copy-shortcode':
					if (item.shortcode) {
						await copyText(item.shortcode);
					}
					break;
				case 'duplicate':
					if (typeof duplicateListingRow === 'function') {
						await duplicateListingRow(item);
					}
					break;
				case 'apply-preset':
					if (typeof applyListingPreset === 'function') {
						// Close the ⋮ before opening the modal so outside-click
						// from menu teardown does not cancel Apply preset.
						setBusyId(null);
						onClose();
						await new Promise((resolve) => {
							window.setTimeout(resolve, 0);
						});
						await applyListingPreset([item]);
						return;
					}
					break;
				case 'restore':
					if (typeof restoreListingRows === 'function') {
						await restoreListingRows([item]);
					}
					break;
				default:
					break;
			}
		} catch (e) {
			// Leave the user on the listing; toast comes later.
		} finally {
			setBusyId(null);
			onClose();
		}
	};

	const cancelDestructiveConfirm = () => {
		if (confirmBusy) {
			return;
		}
		setPendingConfirm(null);
	};

	const confirmDestructiveAction = async () => {
		if (!pendingConfirm || confirmBusy) {
			return;
		}

		setConfirmBusy(true);
		try {
			if (pendingConfirm === 'trash') {
				if (typeof trashListingRows === 'function') {
					await trashListingRows([item]);
				}
			} else if (pendingConfirm === 'restore-classic-editor') {
				if (typeof restoreClassicEditor === 'function') {
					await restoreClassicEditor(item);
				}
			} else if (typeof deleteListingRows === 'function') {
				await deleteListingRows([item]);
			}
			setPendingConfirm(null);
		} catch (e) {
			// Keep the dialog open; toast comes later.
		} finally {
			setConfirmBusy(false);
		}
	};

	return (
		<div
			className="modula-gallery-listing__row-actions"
			onClick={(event) => event.stopPropagation()}
			onMouseDown={(event) => event.stopPropagation()}
		>
			<ListingDropdown
				className="modula-listing-dropdown__menu--actions"
				placement="bottom-start"
				renderToggle={({ isOpen, onToggle }) => (
					<ListingDropdownIconToggle
						className="modula-gallery-listing__row-actions-toggle"
						icon={moreVertical}
						label={__('Actions', 'modula-best-grid-gallery')}
						isOpen={isOpen}
						onToggle={onToggle}
					/>
				)}
				renderContent={({ onClose }) => (
					<>
						{groups.map((group, groupIndex) => (
							<div
								key={group.map((action) => action.id).join('-')}
							>
								{groupIndex > 0 ? (
									<ListingDropdownDivider />
								) : null}
								{group.map((action) => {
									const icon = ACTION_ICONS[action.id];
									const description =
										action.getDescription?.(item);
									return (
										<ListingDropdownActionItem
											key={action.id}
											icon={icon}
											label={action.getLabel(item)}
											description={description}
											showProBadge={Boolean(
												action.showProBadge
											)}
											isDestructive={Boolean(
												action.isDestructive
											)}
											disabled={Boolean(
												busyId || pendingConfirm
											)}
											onClick={() =>
												runAction(action.id, onClose)
											}
										/>
									);
								})}
							</div>
						))}
					</>
				)}
			/>
			<ConfirmDialog
				isOpen={Boolean(pendingConfirm)}
				isBusy={confirmBusy}
				confirmButtonText={
					pendingConfirm
						? getListingDestructiveConfirmButtonLabel(
								pendingConfirm,
								item
							)
						: undefined
				}
				onConfirm={() => {
					void confirmDestructiveAction();
				}}
				onCancel={cancelDestructiveConfirm}
			>
				{pendingConfirm
					? getListingDestructiveConfirmMessage(pendingConfirm, item)
					: null}
			</ConfirmDialog>
		</div>
	);
}
