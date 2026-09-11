import { __ } from '@wordpress/i18n';
import { humanTimeDiff } from '@wordpress/date';
import { Icon, columns, lock } from '@wordpress/icons';
import { getListingThumbnailUrls } from './getListingThumbnailUrls';
import { listingRowToFields } from './listingRowToFields';
import { shouldShowBetaEditorPrompt } from './listingBetaEditorPrompt';
import { ListingRowActionsMenu } from './ListingRowActionsMenu';
import { ListingRowHoverActions } from './ListingRowHoverActions';
import { ListingRowPreviewTrigger } from './ListingRowPreviewPopover';
import { proofingBadgeIcon } from './proofingBadgeIcon';
import { ShortcodeCell } from './ShortcodeCell';
import { StackedThumbnails } from './StackedThumbnails';

const STATUS_LABELS = {
	publish: __('Published', 'modula-best-grid-gallery'),
	draft: __('Draft', 'modula-best-grid-gallery'),
	private: __('Private', 'modula-best-grid-gallery'),
	trash: __('Trash', 'modula-best-grid-gallery'),
};

const BADGE_LABELS = {
	beta: __('v3', 'modula-best-grid-gallery'),
	album: __('Album', 'modula-best-grid-gallery'),
	proofing: __('Proofing', 'modula-best-grid-gallery'),
	inAlbum: __('In album', 'modula-best-grid-gallery'),
};

const ONLY_SHOW_ELEMENTS = [
	{ value: '1', label: __('Yes', 'modula-best-grid-gallery') },
];

/**
 * @param {import('./listingRowToFields').ListingBadgeId[]} badges
 */
function RowBadges({ badges }) {
	if (!badges.length) {
		return null;
	}
	return (
		<span className="modula-gallery-listing__badges">
			{badges.map((id) => (
				<span
					key={id}
					className={`modula-gallery-listing__badge modula-gallery-listing__badge--${id}`}
				>
					{id === 'album' ? (
						<Icon
							className="modula-gallery-listing__badge-icon"
							icon={columns}
							size={12}
						/>
					) : null}
					{id === 'proofing' ? (
						<Icon
							className="modula-gallery-listing__badge-icon"
							icon={proofingBadgeIcon}
							size={12}
						/>
					) : null}
					{BADGE_LABELS[id] || id}
				</span>
			))}
		</span>
	);
}

/**
 * Field definitions for the gallery listing DataViews.
 *
 * @param {{
 *   hasAlbums?: boolean,
 *   canUseBulkEditor?: boolean,
 *   albumTakeoverAvailable?: boolean,
 *   rowActionHandlers?: Object,
 *   requestGalleryEdit?: (item: Object) => void,
 *   requestQuickEdit?: (item: Object) => void,
 * }} [options]
 * @return {import('@wordpress/dataviews').Field[]}
 */
export function getListingFields({
	hasAlbums = false,
	canUseBulkEditor = false,
	albumTakeoverAvailable = false,
	rowActionHandlers = {},
	requestGalleryEdit,
	requestQuickEdit,
} = {}) {
	const { trashListingRows, restoreListingRows, deleteListingRows } =
		rowActionHandlers;
	const fields = [
		{
			id: 'preview',
			label: __('Preview', 'modula-best-grid-gallery'),
			enableSorting: false,
			getValue: ({ item }) => getListingThumbnailUrls(item)[0] || '',
			render: ({ item }) => {
				const previewable =
					(item.type === 'gallery' || item.type === 'album') &&
					item.status !== 'trash';
				const thumbs = <StackedThumbnails item={item} />;

				return (
					<div className="modula-gallery-listing__primary-media">
						<ListingRowActionsMenu item={item} {...rowActionHandlers} />
						{previewable ? (
							<ListingRowPreviewTrigger
								item={item}
								requestGalleryEdit={requestGalleryEdit}
								className="modula-gallery-listing__row-preview-trigger--thumbs"
							>
								{thumbs}
							</ListingRowPreviewTrigger>
						) : (
							thumbs
						)}
					</div>
				);
			},
		},
		{
			id: 'gallery',
			label: __('Gallery', 'modula-best-grid-gallery'),
			enableHiding: false,
			enableSorting: true,
			getValue: ({ item }) => listingRowToFields(item).title,
			render: ({ item }) => {
				const { badges, title } = listingRowToFields(item);
				const showEditPrompt = shouldShowBetaEditorPrompt(item, {
					albumTakeoverAvailable,
				});
				const onTitleClick = (event) => {
					event.stopPropagation();
					if (!showEditPrompt || !requestGalleryEdit) {
						return;
					}
					event.preventDefault();
					requestGalleryEdit(item);
				};

				return (
					<div className="modula-gallery-listing__gallery-meta">
						<div className="modula-gallery-listing__title-row">
							<a
								className="modula-gallery-listing__title"
								href={item.editUrl || '#'}
								onClick={onTitleClick}
							>
								{title}
							</a>
							<RowBadges badges={badges} />
						</div>
						{item.layoutLabel ? (
							<span className="modula-gallery-listing__layout">
								{item.layoutLabel}
							</span>
						) : null}
						<ListingRowHoverActions
							item={item}
							canUseBulkEditor={canUseBulkEditor}
							requestGalleryEdit={requestGalleryEdit}
							requestQuickEdit={requestQuickEdit}
							trashListingRows={trashListingRows}
							restoreListingRows={restoreListingRows}
							deleteListingRows={deleteListingRows}
						/>
					</div>
				);
			},
		},
		{
			id: 'items',
			label: __('Items', 'modula-best-grid-gallery'),
			enableSorting: false,
			getValue: ({ item }) => item.items?.total ?? 0,
			render: ({ item }) => {
				const { itemsPrimary, itemsSecondary } =
					listingRowToFields(item);
				return (
					<div className="modula-gallery-listing__items">
						<span className="modula-gallery-listing__items-primary">
							{itemsPrimary}
						</span>
						{itemsSecondary ? (
							<span className="modula-gallery-listing__items-secondary">
								{itemsSecondary}
							</span>
						) : null}
					</div>
				);
			},
		},
		{
			id: 'shortcodes',
			label: __('Shortcodes', 'modula-best-grid-gallery'),
			enableSorting: false,
			getValue: ({ item }) => listingRowToFields(item).shortcode,
			render: ({ item }) => <ShortcodeCell item={item} />,
		},
		{
			id: 'status',
			label: __('Status', 'modula-best-grid-gallery'),
			enableSorting: false,
			elements: [
				{
					value: 'publish',
					label: STATUS_LABELS.publish,
				},
				{
					value: 'draft',
					label: STATUS_LABELS.draft,
				},
				{
					value: 'private',
					label: STATUS_LABELS.private,
				},
				{
					value: 'trash',
					label: STATUS_LABELS.trash,
				},
			],
			filterBy: {
				operators: ['isAny'],
			},
			getValue: ({ item }) => item.status,
			render: ({ item }) => {
				const { status } = listingRowToFields(item);
				return (
					<div className="modula-gallery-listing__status-cell">
						<span className="modula-gallery-listing__status">
							<span
								className="modula-gallery-listing__status-leading"
								aria-hidden
							>
								<span
									className={`modula-gallery-listing__status-dot modula-gallery-listing__status-dot--${status}`}
								/>
							</span>
							{STATUS_LABELS[status] || status}
						</span>
						{item.hasPassword ? (
							<span className="modula-gallery-listing__password-hint">
								<span
									className="modula-gallery-listing__status-leading"
									aria-hidden
								>
									<Icon
										className="modula-gallery-listing__password-hint-icon"
										icon={lock}
									/>
								</span>
								{__('Password', 'modula-best-grid-gallery')}
							</span>
						) : null}
					</div>
				);
			},
		},
		{
			id: 'updated',
			label: __('Updated', 'modula-best-grid-gallery'),
			enableSorting: true,
			getValue: ({ item }) => item.updatedAt,
			render: ({ item }) => {
				if (!item.updatedAt) {
					return '—';
				}
				try {
					return humanTimeDiff(item.updatedAt, Date.now());
				} catch (e) {
					return item.updatedAt;
				}
			},
		},
		{
			id: 'created',
			label: __('Created', 'modula-best-grid-gallery'),
			enableSorting: true,
			getValue: ({ item }) => item.createdAt,
			render: ({ item }) => {
				if (!item.createdAt) {
					return '—';
				}
				try {
					return humanTimeDiff(item.createdAt, Date.now());
				} catch (e) {
					return item.createdAt;
				}
			},
		},
		{
			id: 'author',
			label: __('Author', 'modula-best-grid-gallery'),
			enableSorting: false,
			getValue: ({ item }) => item.author?.name || '',
			render: ({ item }) => item.author?.name || '—',
		},
		{
			id: 'rowType',
			label: __('Type', 'modula-best-grid-gallery'),
			enableSorting: false,
			enableHiding: false,
			elements: [
				{
					value: 'gallery',
					label: __('Galleries', 'modula-best-grid-gallery'),
				},
				{
					value: 'album',
					label: __('Albums', 'modula-best-grid-gallery'),
				},
			],
			filterBy: {
				operators: ['is'],
			},
			getValue: ({ item }) => item.type,
		},
		{
			id: 'hasProofing',
			label: __('Proofing', 'modula-best-grid-gallery'),
			enableSorting: false,
			enableHiding: false,
			elements: ONLY_SHOW_ELEMENTS,
			filterBy: {
				operators: ['is'],
			},
			getValue: ({ item }) => (item.hasProofing ? '1' : '0'),
		},
		{
			id: 'hasPassword',
			label: __('Password protected', 'modula-best-grid-gallery'),
			enableSorting: false,
			enableHiding: false,
			elements: ONLY_SHOW_ELEMENTS,
			filterBy: {
				operators: ['is'],
			},
			getValue: ({ item }) => (item.hasPassword ? '1' : '0'),
		},
		{
			id: 'hasVideos',
			label: __('Videos', 'modula-best-grid-gallery'),
			enableSorting: false,
			enableHiding: false,
			elements: ONLY_SHOW_ELEMENTS,
			filterBy: {
				operators: ['is'],
			},
			getValue: ({ item }) =>
				Number(item.items?.videos) > 0 ? '1' : '0',
		},
	];

	if (!hasAlbums) {
		return fields.filter((field) => field.id !== 'rowType');
	}

	return fields;
}
