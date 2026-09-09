import { __ } from '@wordpress/i18n';

/**
 * Top-level WP admin page tabs shared by Extensions / Insights.
 */
export const adminPageTabs = [
	{
		label: __('Getting Started', 'modula-best-grid-gallery'),
		slug: 'getting-started',
		href: 'edit.php?post_type=modula-gallery&page=wpchill-dashboard',
		type: 'link',
		target: false,
	},
	{
		label: __('About us', 'modula-best-grid-gallery'),
		slug: 'about-us',
		href: 'edit.php?post_type=modula-gallery&page=wpchill-dashboard&tab=about',
		type: 'link',
		target: false,
	},
	{
		label: __('Partners', 'modula-best-grid-gallery'),
		slug: 'partners',
		href: 'edit.php?post_type=modula-gallery&page=wpchill-dashboard&tab=partners',
		type: 'link',
		target: false,
	},
	{
		label: __('Extensions', 'modula-best-grid-gallery'),
		slug: 'extensions',
		href: 'edit.php?post_type=modula-gallery&page=modula-addons',
		type: 'link',
		target: false,
	},
	// {
	// 	label: __('Insights', 'modula-best-grid-gallery'),
	// 	slug: 'insights',
	// 	href: 'edit.php?post_type=modula-gallery&page=modula-insights',
	// 	type: 'link',
	// 	target: false,
	// },
];
