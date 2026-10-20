import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useQueryClient } from '@tanstack/react-query';
import {
	AdminPage,
	AdminUiRoot,
	ConfirmDialog,
	Notice,
	NotificationsBell,
	PageHeader,
	PageTabs,
	Segmented,
	Toast,
	WPCHILL_NOTIFICATIONS_ROUTE,
} from 'admin-ui';
import { LicenseCard } from 'license-card';
import {
	EXTENSIONS_QUERY_KEY,
	useExtensionsQuery,
} from './query/useExtensionsQuery';
import {
	EXTENSION_FILTERS,
	emptyFilterMessage,
	filterCounts,
	filterLabel,
	visibleGroups,
} from './model/extensionsPageModel';
import { focusAfterChange } from './model/extensionChanges';
import { ExtensionsTable } from './page/ExtensionsTable';
import { ExtensionsSkeleton } from './page/ExtensionsSkeleton';
import { useExtensionChanges } from './page/useExtensionChanges';
import { refreshAdminMenu } from './menu/adminMenu';

/**
 * The header bell's avatar (the WPChill bear), which the admin assets print
 * only when the WPChill notification center is loaded. The bell shows only
 * for a non-empty string.
 *
 * @return {*} Image address as printed, or null when none was.
 */
function notificationsIcon() {
	return window.modulaExtensionsNotifications?.iconUrl ?? null;
}

/**
 * Whether the page shows the license card: the admin assets print it only
 * with Compatible Pro, the only case with a license to manage.
 *
 * @return {boolean} Whether it does.
 */
function hasLicenseCard() {
	return true === window.modulaExtensionsPage?.licenseCard;
}

/**
 * The element a focus request names, inside the filtered extensions.
 *
 * @param {HTMLElement}                                    container
 * @param {import('./model/extensionChanges').FocusTarget} target
 * @return {HTMLElement|null} Element, or null when it is gone.
 */
function focusTargetElement(container, target) {
	if ('switch' === target.kind) {
		return container.querySelector(
			`[data-extension-switch="${target.slug}"]`
		);
	}

	return container.querySelector(
		'.modula-extensions-filter [aria-pressed="true"]'
	);
}

/**
 * The All / Active / Inactive filter and the table it narrows, with the
 * switches and group actions that turn extensions on and off.
 *
 * @param {Object}                                            props
 * @param {import('./model/extensionsPageModel').PlanGroup[]} props.groups
 */
function FilteredExtensions({ groups }) {
	const [filter, setFilter] = useState('all');
	const changes = useExtensionChanges();
	const containerRef = useRef(null);
	const { focusTarget, clearFocusTarget } = changes;
	const counts = filterCounts(groups);
	const visible = visibleGroups(groups, filter);
	const options = EXTENSION_FILTERS.map((value) => ({
		value,
		label: filterLabel(value),
		count: counts[value],
	}));
	const controls = {
		pendingChange: changes.pendingChange,
		isBusy: changes.isBusy,
		onRequest: (change) =>
			changes.request(
				change,
				change ? focusAfterChange(visible, change, filter) : null
			),
	};

	// When the filter hides the row or group just changed, its control leaves
	// the page: focus moves on as the save lands, instead of falling to the body.
	useEffect(() => {
		if (!focusTarget) {
			return;
		}
		focusTargetElement(containerRef.current, focusTarget)?.focus();
		clearFocusTarget();
	}, [focusTarget, clearFocusTarget]);

	return (
		<div ref={containerRef} className="modula-extensions-list">
			<Segmented
				className="modula-extensions-filter"
				aria-label={__('Show', 'modula-best-grid-gallery')}
				options={options}
				value={filter}
				onChange={setFilter}
			/>
			<ExtensionsTable
				groups={visible}
				emptyMessage={emptyFilterMessage(filter)}
				controls={controls}
			/>
			{changes.confirmation ? (
				<ConfirmDialog open {...changes.confirmation} />
			) : null}
			<Toast
				message={changes.toast.message}
				tone={changes.toast.tone}
				onDismiss={changes.dismissToast}
			/>
		</div>
	);
}

/**
 * Page content for the load state: placeholders, the load error, or the
 * extensions.
 *
 * @param {ReturnType<typeof useExtensionsQuery>} query
 * @return {import('react').ReactNode} Content.
 */
function pageContent(query) {
	if (query.isPending) {
		return <ExtensionsSkeleton />;
	}

	// A failed refetch after a change keeps the list it already has.
	if (query.isError && undefined === query.data) {
		return (
			<Notice tone="error" role="alert">
				{__(
					'The extensions could not be loaded. Reload the page to try again.',
					'modula-best-grid-gallery'
				)}
			</Notice>
		);
	}

	return <FilteredExtensions groups={query.data} />;
}

export default function ExtensionsPage() {
	const query = useExtensionsQuery();
	const queryClient = useQueryClient();
	// A new or removed license changes the plan: which extensions are
	// available, and which modules add Modula menu entries.
	const onLicenseChange = () => {
		queryClient.invalidateQueries({ queryKey: EXTENSIONS_QUERY_KEY });
		refreshAdminMenu();
	};
	const header = (
		<PageHeader title={__('Extensions', 'modula-best-grid-gallery')}>
			<NotificationsBell
				iconSrc={notificationsIcon()}
				route={WPCHILL_NOTIFICATIONS_ROUTE}
			/>
		</PageHeader>
	);

	return (
		<AdminUiRoot className="modula-extensions-page">
			<AdminPage
				header={header}
				tabs={<PageTabs current="extensions" />}
				lead={
					hasLicenseCard() ? (
						<div className="modula-extensions-license">
							<LicenseCard onLicenseChange={onLicenseChange} />
						</div>
					) : null
				}
				title={__('All extensions', 'modula-best-grid-gallery')}
			>
				{pageContent(query)}
			</AdminPage>
		</AdminUiRoot>
	);
}
