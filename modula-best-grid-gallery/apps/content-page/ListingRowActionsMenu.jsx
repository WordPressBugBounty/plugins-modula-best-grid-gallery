import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Icon,
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
import {
	ConfirmDialog,
	Menu,
	MenuGroup,
	MenuItem,
	PlanBadge,
	usePopoverClose,
} from 'admin-ui';
import { copyText } from 'admin-ui/copy-field/copyText';
import { getContentPageConfig } from './config';
import {
	getListingDestructiveConfirmButtonLabel,
	getListingDestructiveConfirmMessage,
	getListingDestructiveConfirmTitle,
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
 * The menu's groups. Items keep the menu open while their action runs
 * (disabled meanwhile) and close it when it ends, so it lives inside the
 * Menu, where `usePopoverClose` reaches it.
 *
 * @param {Object}                                                 props
 * @param {Object}                                                 props.item
 * @param {import('./listingRowActions').ListingRowActionDef[][]}  props.groups
 * @param {boolean}                                                props.disabled
 * @param {(actionId: string, close: () => void) => Promise<void>} props.onRun
 */
function RowActionItems({ item, groups, disabled, onRun }) {
	const close = usePopoverClose();

	return groups.map((group) => (
		<MenuGroup key={group.map((action) => action.id).join('-')}>
			{group.map((action) => {
				const icon = ACTION_ICONS[action.id];
				return (
					<MenuItem
						key={action.id}
						icon={icon ? <Icon icon={icon} size={18} /> : null}
						description={action.getDescription?.(item) || null}
						badge={
							action.showProBadge ? (
								<PlanBadge plan="PRO" tone="outline" lock />
							) : null
						}
						destructive={Boolean(action.isDestructive)}
						disabled={disabled}
						keepOpen
						onSelect={() => {
							void onRun(action.id, close);
						}}
					>
						{action.getLabel(item)}
					</MenuItem>
				);
			})}
		</MenuGroup>
	));
}

/**
 * @param {Object}                                                      props
 * @param {Object}                                                      props.item
 * @param {(item: Object) => Promise<{ id: number, editUrl?: string }>} [props.duplicateListingRow]
 * @param {(items: Object[]) => Promise<unknown>}                       [props.trashListingRows]
 * @param {(items: Object[]) => Promise<unknown>}                       [props.restoreListingRows]
 * @param {(items: Object[]) => Promise<unknown>}                       [props.deleteListingRows]
 * @param {(items: Object[]) => Promise<unknown>}                       [props.applyListingPreset]
 * @param {(item: Object) => void}                                      [props.requestGalleryEdit]
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
	const [open, setOpen] = useState(false);
	const [busyId, setBusyId] = useState(/** @type {string|null} */ (null));
	const [pendingConfirm, setPendingConfirm] = useState(
		/** @type {'trash'|'delete-permanently'|'restore-classic-editor'|null} */ (
			null
		)
	);
	const [confirmBusy, setConfirmBusy] = useState(false);
	const listingConfig = getContentPageConfig();
	const canUseStandalone = isStandaloneEntitled(listingConfig);
	const groups = getListingRowMenuGroups(item, {
		canUseStandalone,
		canUseApplyPreset: listingConfig.canUseApplyPreset,
		albumTakeoverAvailable: listingConfig.albumTakeoverAvailable,
	});

	if (groups.length === 0) {
		return null;
	}

	const runAction = async (actionId, close) => {
		if (busyId || pendingConfirm || confirmBusy) {
			return;
		}

		// The menu closes first; the confirm returns focus to its trigger.
		if (isListingDestructiveConfirmAction(actionId)) {
			close();
			setPendingConfirm(actionId);
			return;
		}

		// Apply preset opens Pro's modal dialog: the menu goes first.
		if (actionId === 'apply-preset') {
			close();
			if (typeof applyListingPreset === 'function') {
				await applyListingPreset([item]).catch(() => {
					// The listing shell reports the outcome.
				});
			}
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
			close();
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
			className="modula-content-page__row-actions"
			onClick={(event) => event.stopPropagation()}
			onMouseDown={(event) => event.stopPropagation()}
		>
			<Menu
				open={open}
				onOpenChange={setOpen}
				label={__('Actions', 'modula-best-grid-gallery')}
				align="end"
				trigger={(triggerProps) => (
					<button
						type="button"
						className="modula-content-page__row-actions-toggle"
						aria-label={__('Actions', 'modula-best-grid-gallery')}
						{...triggerProps}
					>
						<Icon icon={moreVertical} size={20} />
					</button>
				)}
			>
				<RowActionItems
					item={item}
					groups={groups}
					disabled={Boolean(busyId || pendingConfirm)}
					onRun={runAction}
				/>
			</Menu>
			{pendingConfirm ? (
				<ConfirmDialog
					open
					busy={confirmBusy}
					cancelOnOutsideClick
					title={getListingDestructiveConfirmTitle(pendingConfirm)}
					message={getListingDestructiveConfirmMessage(
						pendingConfirm,
						item
					)}
					confirmLabel={getListingDestructiveConfirmButtonLabel(
						pendingConfirm,
						item
					)}
					onConfirm={() => {
						void confirmDestructiveAction();
					}}
					onCancel={cancelDestructiveConfirm}
				/>
			) : null}
		</div>
	);
}
