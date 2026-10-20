import { __ } from '@wordpress/i18n';

/**
 * @typedef {'getting-started' | 'about-us' | 'partners' | 'extensions'} PageTabSlug
 */

/**
 * The four Modula pages the tab row joins, in order. Their URLs predate the
 * redesign (bookmarks and the onboarding redirect use them) and are relative
 * to wp-admin, where every admin page lives.
 *
 * @return {{ slug: PageTabSlug, label: string, href: string }[]} Pages.
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
 * Tab row under the page header that links the Getting Started, About us,
 * Partners and Extensions pages. The tabs are ordinary links with full page
 * loads, not the in-page WAI-ARIA `Tabs`; the current page is marked with
 * `aria-current="page"`.
 *
 * @param {Object}      props
 * @param {PageTabSlug} props.current The page being shown.
 */
export function PageTabs({ current }) {
	return (
		<nav
			className="modula-admin-page-tabs"
			aria-label={__('Modula pages', 'modula-best-grid-gallery')}
		>
			<ul className="modula-admin-page-tabs__list">
				{modulaPages().map((page) => (
					<li key={page.slug}>
						<a
							className="modula-admin-page-tabs__tab"
							href={page.href}
							aria-current={
								current === page.slug ? 'page' : undefined
							}
						>
							{page.label}
						</a>
					</li>
				))}
			</ul>
		</nav>
	);
}
