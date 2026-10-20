import { Fragment } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	AdminPage,
	AdminUiRoot,
	Nav,
	NavHeading,
	NavItem,
	NavSkeleton,
	NotificationsBell,
	PageHeader,
	SearchField,
	SearchResults,
	Skeleton,
	SkeletonCard,
	Toast,
	WPCHILL_NOTIFICATIONS_ROUTE,
} from 'admin-ui';
import { useTabsQuery } from './query/useTabsQuery';
import { SectionCards } from './page/SectionCards';
import { useGlobalSave } from './page/useGlobalSave';
import { useSectionAddress } from './page/useSectionAddress';
import { useSettingsSearch } from './page/useSettingsSearch';
import { useUnsavedChangesGuard } from './page/useUnsavedChangesGuard';

/**
 * The header bell's avatar (the WPChill bear), which the settings class
 * prints only when the WPChill notification center is loaded. The bell
 * shows only for a non-empty string.
 *
 * @return {*} Image address as printed, or null when none was.
 */
function notificationsIcon() {
	return window.modulaSettingsNotifications?.iconUrl ?? null;
}

/**
 * Sections of every group, in display order, each with its group label.
 *
 * @param {Object[]} groups Projected settings groups.
 * @return {Object[]} Sections.
 */
function sectionsOf(groups) {
	return groups.flatMap((group) =>
		group.sections.map((section) => ({
			...section,
			groupLabel: group.label,
		}))
	);
}

/**
 * Content title, such as "General / Galleries".
 *
 * @param {Object|undefined} section Open section; undefined when none loaded.
 * @return {string} Title.
 */
function sectionTitle(section) {
	if (!section) {
		return __('Settings', 'modula-best-grid-gallery');
	}

	return sprintf(
		/* translators: 1: settings group, 2: settings section. */
		__('%1$s / %2$s', 'modula-best-grid-gallery'),
		section.groupLabel,
		section.label
	);
}

/**
 * Content title while the sections load: a placeholder bar, named for
 * screen readers.
 *
 * @return {import('react').ReactNode} Title.
 */
function loadingTitle() {
	return (
		<>
			<span className="modula-admin-sr-only">
				{__('Loading settings…', 'modula-best-grid-gallery')}
			</span>
			<Skeleton width={220} height={22} />
		</>
	);
}

export default function SettingsPage() {
	const { data: groups = [], isPending, isError } = useTabsQuery();
	const sections = sectionsOf(groups);
	const [sectionId, openSection] = useSectionAddress(
		sections.map((section) => section.id)
	);
	const { saveState, hasEdits, save, toast, dismissToast } = useGlobalSave();
	useUnsavedChangesGuard(hasEdits);
	const search = useSettingsSearch(groups, openSection);

	const current = sections.find((section) => section.id === sectionId);
	const header = (
		<PageHeader
			title={__('Settings', 'modula-best-grid-gallery')}
			saveState={saveState}
			onSave={save}
		>
			<NotificationsBell
				iconSrc={notificationsIcon()}
				route={WPCHILL_NOTIFICATIONS_ROUTE}
			/>
		</PageHeader>
	);
	const searchField = isPending ? null : (
		<SearchField
			label={__('Find a setting', 'modula-best-grid-gallery')}
			placeholder={__('Find a setting…', 'modula-best-grid-gallery')}
			value={search.query}
			onChange={search.setQuery}
			resultCount={search.results?.length ?? null}
			inputRef={search.inputRef}
		/>
	);
	const navItems = groups.map((group) => (
		<Fragment key={group.id}>
			<NavHeading>{group.label}</NavHeading>
			{group.sections.map((section) => (
				<NavItem
					key={section.id}
					current={section.id === sectionId}
					onClick={() => openSection(section.id)}
				>
					{section.label}
				</NavItem>
			))}
		</Fragment>
	));
	const nav = (
		<Nav
			label={__('Settings sections', 'modula-best-grid-gallery')}
			search={searchField}
		>
			{isPending ? <NavSkeleton /> : null}
			{null === search.results ? (
				navItems
			) : (
				<SearchResults
					results={search.results}
					onSelect={search.choose}
				/>
			)}
		</Nav>
	);

	return (
		<AdminUiRoot className="modula-settings-page">
			<AdminPage
				header={header}
				nav={nav}
				title={isPending ? loadingTitle() : sectionTitle(current)}
			>
				{isPending ? (
					<>
						<SkeletonCard rows={3} />
						<SkeletonCard rows={2} />
					</>
				) : null}
				{current ? <SectionCards section={current} /> : null}
				{isError ? (
					<p role="alert">
						{__(
							'Modula Settings could not be loaded. Reload the page to try again.',
							'modula-best-grid-gallery'
						)}
					</p>
				) : null}
			</AdminPage>
			<Toast
				message={toast.message}
				tone={toast.tone}
				onDismiss={dismissToast}
			/>
		</AdminUiRoot>
	);
}
