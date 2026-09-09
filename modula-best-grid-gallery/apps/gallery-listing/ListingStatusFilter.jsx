import { useMemo, useState } from '@wordpress/element';
import { columns, funnel, lock, video } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import {
	ListingDropdown,
	ListingDropdownCheckboxItem,
	ListingDropdownDivider,
	ListingDropdownRadioItem,
	ListingDropdownSectionLabel,
	ListingDropdownToolbarTrigger,
} from './ListingDropdown';
import { proofingBadgeIcon } from './proofingBadgeIcon';
import {
	LISTING_STATUS_ALL,
	applyListingStatusFilter,
	getListingOnlyShowFields,
	getListingStatusTriggerLabel,
	getListingStatusValue,
	isListingOnlyShowFilterActive,
	setListingOnlyShowFilter,
} from './listingToolbarView';

/** @typedef {import('./viewToListingQuery').ListingView} ListingView */

/**
 * @typedef {Object} ListingStatusCounts
 * @property {number} everything
 * @property {number} publish
 * @property {number} draft
 * @property {number} private
 * @property {number} trash
 */

/**
 * @param {{
 *   view: ListingView,
 *   onChangeView: (view: ListingView) => void,
 *   statusCounts?: ListingStatusCounts|null,
 *   hasAlbums?: boolean,
 *   isPro?: boolean,
 * }} props
 */
export function ListingStatusFilter({
	view,
	onChangeView,
	statusCounts = null,
	hasAlbums = false,
	isPro = false,
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const statusValue = getListingStatusValue(view);
	const triggerLabel = useMemo(() => {
		const key = getListingStatusTriggerLabel(statusValue);
		const labels = {
			'All statuses': __('All statuses', 'modula-best-grid-gallery'),
			Published: __('Published', 'modula-best-grid-gallery'),
			Drafts: __('Drafts', 'modula-best-grid-gallery'),
			Private: __('Private', 'modula-best-grid-gallery'),
			'In the trash': __('In the trash', 'modula-best-grid-gallery'),
		};
		return labels[key] || labels['All statuses'];
	}, [statusValue]);

	const showOptions = useMemo(
		() => [
			{
				value: LISTING_STATUS_ALL,
				label: __('Everything', 'modula-best-grid-gallery'),
				countKey: 'everything',
			},
			{
				value: 'publish',
				label: __('Published', 'modula-best-grid-gallery'),
				countKey: 'publish',
			},
			{
				value: 'draft',
				label: __('Drafts', 'modula-best-grid-gallery'),
				countKey: 'draft',
			},
			{
				value: 'private',
				label: __('Private', 'modula-best-grid-gallery'),
				countKey: 'private',
			},
			{
				value: 'trash',
				label: __('In the trash', 'modula-best-grid-gallery'),
				countKey: 'trash',
			},
		],
		[]
	);

	const onlyShowOptions = useMemo(() => {
		/** @type {Record<string, { label: string, icon: import('@wordpress/icons').IconType }>} */
		const byField = {
			rowType: {
				label: __('Albums', 'modula-best-grid-gallery'),
				icon: columns,
			},
			hasProofing: {
				label: __('With proofing', 'modula-best-grid-gallery'),
				icon: proofingBadgeIcon,
			},
			hasPassword: {
				label: __('Password protected', 'modula-best-grid-gallery'),
				icon: lock,
			},
			hasVideos: {
				label: __('With videos', 'modula-best-grid-gallery'),
				icon: video,
			},
		};
		return getListingOnlyShowFields({ hasAlbums, isPro })
			.map((field) => {
				const meta = byField[field];
				return meta ? { field, ...meta } : null;
			})
			.filter(Boolean);
	}, [hasAlbums, isPro]);

	return (
		<ListingDropdown
			className="modula-listing-dropdown__menu--status"
			placement="bottom-start"
			open={menuOpen}
			onToggle={setMenuOpen}
			renderToggle={({ isOpen, onToggle }) => (
				<ListingDropdownToolbarTrigger
					className="modula-gallery-listing__toolbar-filter modula-gallery-listing__toolbar-filter--status"
					icon={funnel}
					label={triggerLabel}
					isOpen={isOpen}
					onToggle={onToggle}
				/>
			)}
			renderContent={() => (
				<>
					<ListingDropdownSectionLabel
						label={__('Show', 'modula-best-grid-gallery')}
					/>
					{showOptions.map((option) => (
						<ListingDropdownRadioItem
							key={option.value}
							label={option.label}
							isSelected={statusValue === option.value}
							count={
								statusCounts
									? statusCounts[option.countKey]
									: null
							}
							onSelect={() => {
								onChangeView(
									applyListingStatusFilter(view, option.value)
								);
								setMenuOpen(false);
							}}
						/>
					))}
					{onlyShowOptions.length > 0 ? (
						<>
							<ListingDropdownDivider />
							<ListingDropdownSectionLabel
								label={__(
									'Only show',
									'modula-best-grid-gallery'
								)}
							/>
							{onlyShowOptions.map((option) => (
								<ListingDropdownCheckboxItem
									key={option.field}
									label={option.label}
									icon={option.icon}
									checked={isListingOnlyShowFilterActive(
										view,
										option.field
									)}
									onToggle={() =>
										onChangeView(
											setListingOnlyShowFilter(
												view,
												option.field,
												!isListingOnlyShowFilterActive(
													view,
													option.field
												)
											)
										)
									}
								/>
							))}
						</>
					) : null}
				</>
			)}
		/>
	);
}
