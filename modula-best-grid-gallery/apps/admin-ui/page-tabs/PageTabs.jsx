import { __ } from '@wordpress/i18n';

/**
 * @typedef {'getting-started' | 'about-us' | 'partners' | 'extensions'} PageTabSlug
 */

/**
 * @typedef {Object} PageTab
 * @property {string}                    slug    Matched against `current`; passed to `onSelect`.
 * @property {string}                    label   Tab text.
 * @property {string}                    [href]  A link to another page; without it the tab is a button that calls `onSelect`.
 * @property {number|null}               [count] Shown after the label, as "(24)".
 * @property {import('react').ReactNode} [badge] After the label (a `PlanBadge` without `onClick`).
 */

/**
 * The four Modula pages the tab row joins, in order. Their URLs predate the
 * redesign (bookmarks and the onboarding redirect use them) and are relative
 * to wp-admin, where every admin page lives.
 *
 * @return {PageTab[]} Pages.
 */
function modulaPages() {
	return [
		{
			slug: 'getting-started',
			label: __('Getting Started', 'modula-best-grid-gallery'),
			href: 'edit.php?post_type=modula-gallery&page=wpchill-dashboard',
		},
		{
			slug: 'about-us',
			label: __('About us', 'modula-best-grid-gallery'),
			href: 'edit.php?post_type=modula-gallery&page=wpchill-dashboard&tab=about',
		},
		{
			slug: 'partners',
			label: __('Partners', 'modula-best-grid-gallery'),
			href: 'edit.php?post_type=modula-gallery&page=wpchill-dashboard&tab=partners',
		},
		{
			slug: 'extensions',
			label: __('Extensions', 'modula-best-grid-gallery'),
			href: 'edit.php?post_type=modula-gallery&page=modula-addons',
		},
	];
}

/**
 * Tab row under the page header. By default it links the Getting Started,
 * About us, Partners and Extensions pages. A page with its own sections (the
 * Content page) passes `tabs`: a tab with `href` is a link, one without is a
 * button that calls `onSelect` and switches the view in place. They are not
 * the in-page WAI-ARIA `Tabs`, which own their panels; the current one is
 * marked with `aria-current="page"`.
 *
 * @param {Object}                 props
 * @param {string}                 props.current    The tab shown (a `PageTabSlug` for the default pages).
 * @param {PageTab[]}              [props.tabs]     Own tabs, in place of the four pages.
 * @param {string}                 [props.label]    Names the row; "Modula pages" by default.
 * @param {(slug: string) => void} [props.onSelect] A tab without `href` was chosen.
 */
export function PageTabs({ current, tabs, label, onSelect }) {
	return (
		<nav
			className="modula-admin-page-tabs"
			aria-label={label || __('Modula pages', 'modula-best-grid-gallery')}
		>
			<ul className="modula-admin-page-tabs__list">
				{(tabs || modulaPages()).map((tab) => (
					<li key={tab.slug}>
						<PageTabItem
							tab={tab}
							isCurrent={current === tab.slug}
							onSelect={onSelect}
						/>
					</li>
				))}
			</ul>
		</nav>
	);
}

/**
 * @param {Object}                 props
 * @param {PageTab}                props.tab
 * @param {boolean}                props.isCurrent
 * @param {(slug: string) => void} [props.onSelect]
 */
function PageTabItem({ tab, isCurrent, onSelect }) {
	const content = (
		<>
			{tab.label}
			{tab.badge || null}
			{Number.isInteger(tab.count) ? (
				<span className="modula-admin-page-tabs__count">
					({tab.count})
				</span>
			) : null}
		</>
	);
	const ariaCurrent = isCurrent ? 'page' : undefined;

	if (tab.href) {
		return (
			<a
				className="modula-admin-page-tabs__tab"
				href={tab.href}
				aria-current={ariaCurrent}
			>
				{content}
			</a>
		);
	}

	return (
		<button
			type="button"
			className="modula-admin-page-tabs__tab"
			aria-current={ariaCurrent}
			onClick={() => onSelect?.(tab.slug)}
		>
			{content}
		</button>
	);
}
