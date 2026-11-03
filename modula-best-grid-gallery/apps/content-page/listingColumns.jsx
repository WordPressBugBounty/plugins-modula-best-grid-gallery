import { __, sprintf } from '@wordpress/i18n';
import { humanTimeDiff } from '@wordpress/date';
import { Icon, columns } from '@wordpress/icons';
import { LockIcon, StatusDot, TableHoverLine } from 'admin-ui';
import { listingRowToFields } from './listingRowToFields';
import { ListingCover } from './ListingCover';
import { shouldShowBetaEditorPrompt } from './listingBetaEditorPrompt';
import { ListingRowActionsMenu } from './ListingRowActionsMenu';
import { ListingRowHoverActions } from './ListingRowHoverActions';
import { ListingRowPreviewTrigger } from './ListingRowPreviewPopover';
import { proofingBadgeIcon } from './proofingBadgeIcon';
import { ShortcodeCell } from './ShortcodeCell';
import {
	getListingStatusFilterOptions,
	getListingStatusLabel,
	getListingTypeFilterOptions,
} from './listingTable';
import {
	applyListingStatusFilter,
	applyListingTypeFilter,
	getListingColumnFilters,
	isListingStatusFilterAvailable,
} from './listingToolbarView';

const BADGE_LABELS = {
	proExpired: __('PRO expired', 'modula-best-grid-gallery'),
	beta: __('v3', 'modula-best-grid-gallery'),
	album: __('Album', 'modula-best-grid-gallery'),
	proofing: __('Proofing', 'modula-best-grid-gallery'),
	inAlbum: __('In album', 'modula-best-grid-gallery'),
	draft: __('Draft', 'modula-best-grid-gallery'),
};

const BADGE_ICONS = {
	album: columns,
	proofing: proofingBadgeIcon,
};

/**
 * PRO expired carries admin-ui's lock, as the license expired banner does;
 * the other icons are WordPress icons.
 *
 * @param {Object}                                        props
 * @param {import('./listingRowToFields').ListingBadgeId} props.id
 */
function BadgeIcon({ id }) {
	if (id === 'proExpired') {
		return (
			<span
				className="modula-content-page__badge-icon"
				aria-hidden="true"
			>
				<LockIcon size={12} />
			</span>
		);
	}
	if (!BADGE_ICONS[id]) {
		return null;
	}
	return (
		<Icon
			className="modula-content-page__badge-icon"
			icon={BADGE_ICONS[id]}
			size={12}
		/>
	);
}

/**
 * @param {Object}                                          props
 * @param {import('./listingRowToFields').ListingBadgeId[]} props.badges
 */
function RowBadges({ badges }) {
	if (!badges.length) {
		return null;
	}
	return (
		<span className="modula-content-page__badges">
			{badges.map((id) => (
				<span
					key={id}
					className={`modula-content-page__badge modula-content-page__badge--${id}`}
				>
					<BadgeIcon id={id} />
					{BADGE_LABELS[id] || id}
				</span>
			))}
		</span>
	);
}

/**
 * Gallery cell: cover (opening the row preview), title with badges, and the
 * item count line that the hover actions replace.
 *
 * @param {Object} props
 * @param {Object} props.item
 * @param {Object} props.options From getListingColumns().
 */
function ListingGalleryCell({ item, options }) {
	const { badges, title, itemsPrimary } = listingRowToFields(item, {
		proExpiredTypeKeys: options.proExpiredTypeKeys,
	});
	const isTrash = item.status === 'trash';
	const previewable =
		(item.type === 'gallery' || item.type === 'album') && !isTrash;
	const cover = <ListingCover item={item} />;
	const { requestGalleryEdit } = options;
	const showEditPrompt = shouldShowBetaEditorPrompt(item, {
		albumTakeoverAvailable: options.albumTakeoverAvailable,
	});

	const onTitleClick = (event) => {
		if (!showEditPrompt || !requestGalleryEdit) {
			return;
		}
		event.preventDefault();
		requestGalleryEdit(item);
	};

	return (
		<div className="modula-content-page__gallery-cell">
			{previewable ? (
				<ListingRowPreviewTrigger
					item={item}
					requestGalleryEdit={requestGalleryEdit}
					className="modula-content-page__row-preview-trigger--cover"
				>
					{cover}
				</ListingRowPreviewTrigger>
			) : (
				cover
			)}
			<div className="modula-content-page__gallery-meta">
				<span className="modula-content-page__title-row">
					{isTrash ? (
						<span className="modula-content-page__title is-trash">
							{title}
						</span>
					) : (
						<a
							className="modula-content-page__title"
							href={item.editUrl || '#'}
							onClick={onTitleClick}
						>
							{title}
						</a>
					)}
					<RowBadges badges={badges} />
				</span>
				<TableHoverLine
					hover={
						<ListingRowHoverActions
							item={item}
							canUseBulkEditor={options.canUseBulkEditor}
							requestGalleryEdit={requestGalleryEdit}
							requestQuickEdit={options.requestQuickEdit}
							duplicateListingRow={
								options.rowActionHandlers.duplicateListingRow
							}
							trashListingRows={
								options.rowActionHandlers.trashListingRows
							}
							restoreListingRows={
								options.rowActionHandlers.restoreListingRows
							}
							deleteListingRows={
								options.rowActionHandlers.deleteListingRows
							}
							onSaveAsPresetUpsell={options.onSaveAsPresetUpsell}
						/>
					}
				>
					{itemsPrimary}
				</TableHoverLine>
			</div>
		</div>
	);
}

/**
 * Type cell: the product type name; clicking it filters the list to it.
 *
 * @param {Object}   props
 * @param {Object}   props.item
 * @param {Function} props.onFilterType Receives the row's product type key.
 */
function ListingTypeCell({ item, onFilterType }) {
	const name = item.productTypeName || item.layoutLabel || '';
	if (!name) {
		return '—';
	}
	if (!item.productType) {
		return <span className="modula-content-page__type">{name}</span>;
	}
	const label = sprintf(
		/* translators: %s: gallery or album type, e.g. Masonry. */
		__('Show only %s', 'modula-best-grid-gallery'),
		name
	);

	return (
		<button
			type="button"
			className="modula-content-page__type is-filter"
			aria-label={label}
			title={label}
			onClick={() => onFilterType(item.productType)}
		>
			{name}
		</button>
	);
}

/**
 * @param {Object} props
 * @param {Object} props.item
 */
function ListingUpdatedCell({ item }) {
	if (!item.updatedAt) {
		return '—';
	}
	try {
		return humanTimeDiff(item.updatedAt, Date.now());
	} catch (e) {
		return item.updatedAt;
	}
}

/**
 * Columns of the content table: Gallery, Type (column filter), Shortcode,
 * Status (column filter on All), Updated and the ⋮ row actions.
 *
 * @param {{
 *   view: import('./viewToListingQuery').ListingView,
 *   onChangeView: (view: import('./viewToListingQuery').ListingView) => void,
 *   productTypes?: import('./listingTable').ListingProductType[]|null,
 *   proExpiredTypeKeys?: string[],
 *   canUseBulkEditor?: boolean,
 *   albumTakeoverAvailable?: boolean,
 *   rowActionHandlers: Object,
 *   requestGalleryEdit?: (item: Object) => void,
 *   requestQuickEdit?: (item: Object) => void,
 *   onSaveAsPresetUpsell?: () => void,
 * }} options
 * @return {import('admin-ui/table/Table').TableColumn[]} Table columns.
 */
export function getListingColumns(options) {
	const { view, onChangeView, productTypes } = options;
	const columnFilters = getListingColumnFilters(view);
	const clearLabel = __('Clear filter', 'modula-best-grid-gallery');

	return [
		{
			id: 'gallery',
			label: __('Gallery', 'modula-best-grid-gallery'),
			render: (item) => (
				<ListingGalleryCell item={item} options={options} />
			),
		},
		{
			id: 'type',
			label: __('Type', 'modula-best-grid-gallery'),
			width: '170px',
			filter: {
				label: __('Filter by type', 'modula-best-grid-gallery'),
				options: getListingTypeFilterOptions(
					productTypes,
					columnFilters.type
				),
				value: columnFilters.type,
				onChange: (keys) =>
					onChangeView(applyListingTypeFilter(view, keys)),
				clearLabel,
				allLabel: __('All types', 'modula-best-grid-gallery'),
			},
			render: (item) => (
				<ListingTypeCell
					item={item}
					onFilterType={(key) =>
						onChangeView(applyListingTypeFilter(view, [key]))
					}
				/>
			),
		},
		{
			id: 'shortcode',
			label: __('Shortcode', 'modula-best-grid-gallery'),
			width: '230px',
			render: (item) => <ShortcodeCell item={item} />,
		},
		{
			id: 'status',
			label: __('Status', 'modula-best-grid-gallery'),
			width: '130px',
			filter: isListingStatusFilterAvailable(view)
				? {
						label: __(
							'Filter by status',
							'modula-best-grid-gallery'
						),
						options: getListingStatusFilterOptions().map(
							(option) => ({
								...option,
								icon: <StatusDot status={option.value} />,
							})
						),
						value: columnFilters.status,
						onChange: (statuses) =>
							onChangeView(
								applyListingStatusFilter(view, statuses)
							),
						clearLabel,
					}
				: undefined,
			render: (item) => (
				<StatusDot
					status={item.status}
					label={getListingStatusLabel(item.status)}
					hint={
						item.hasPassword ? (
							<span className="modula-content-page__password-hint">
								<LockIcon />
								{__('Password', 'modula-best-grid-gallery')}
							</span>
						) : null
					}
				/>
			),
		},
		{
			id: 'updated',
			label: __('Updated', 'modula-best-grid-gallery'),
			width: '150px',
			render: (item) => <ListingUpdatedCell item={item} />,
		},
		{
			id: 'actions',
			label: (
				<span className="modula-admin-sr-only">
					{__('Actions', 'modula-best-grid-gallery')}
				</span>
			),
			width: '56px',
			render: (item) => (
				<ListingRowActionsMenu
					item={item}
					{...options.rowActionHandlers}
				/>
			),
		},
	];
}
