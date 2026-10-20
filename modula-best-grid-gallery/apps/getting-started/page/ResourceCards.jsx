import { __ } from '@wordpress/i18n';
import { Button } from 'admin-ui';
import { NewTabButton } from './NewTabButton';
import {
	DocumentationIcon,
	ExtensionsIcon,
	GalleriesIcon,
	SettingsIcon,
} from './icons';

/**
 * @typedef {Object} Resource
 * @property {string}                    key         Which resource.
 * @property {import('react').ReactNode} icon        Decorative icon.
 * @property {string}                    title       Resource name.
 * @property {string}                    description What it is for.
 * @property {string}                    action      The card's one action.
 * @property {string|undefined}          href        Where the action leads.
 * @property {boolean}                   external    Whether it leaves wp-admin (new tab).
 */

/**
 * The four places to begin, in order. Only Documentation leaves wp-admin.
 *
 * @param {Partial<import('./pageData').GettingStartedLinks>} links
 * @return {Resource[]} Resources.
 */
function resources(links) {
	return [
		{
			key: 'documentation',
			icon: <DocumentationIcon />,
			title: __('Documentation', 'modula-best-grid-gallery'),
			description: __(
				'Become familiar with our plugin by reading the documentation.',
				'modula-best-grid-gallery'
			),
			action: __('View Documentation', 'modula-best-grid-gallery'),
			href: links.documentation,
			external: true,
		},
		{
			key: 'settings',
			icon: <SettingsIcon />,
			title: __('Settings', 'modula-best-grid-gallery'),
			description: __(
				'Explore the full potential of what Modula can offer you.',
				'modula-best-grid-gallery'
			),
			action: __('View Settings', 'modula-best-grid-gallery'),
			href: links.settings,
			external: false,
		},
		{
			key: 'galleries',
			icon: <GalleriesIcon />,
			title: __('Galleries', 'modula-best-grid-gallery'),
			description: __(
				'Create your amazing gallery using Modula.',
				'modula-best-grid-gallery'
			),
			action: __('View Galleries', 'modula-best-grid-gallery'),
			href: links.galleries,
			external: false,
		},
		{
			key: 'extensions',
			icon: <ExtensionsIcon />,
			title: __('Extensions', 'modula-best-grid-gallery'),
			description: __(
				'Enhance your Modula experience by installing fantastic extensions.',
				'modula-best-grid-gallery'
			),
			action: __('View Extensions', 'modula-best-grid-gallery'),
			href: links.extensions,
			external: false,
		},
	];
}

/**
 * One resource: icon, title, what it is for, and its action.
 *
 * @param {Object}   props
 * @param {Resource} props.resource
 */
function ResourceCard({ resource }) {
	return (
		<li className="modula-getting-started-resource">
			<span className="modula-getting-started-resource__icon">
				{resource.icon}
			</span>
			<h3 className="modula-getting-started-resource__title">
				{resource.title}
			</h3>
			<p className="modula-getting-started-resource__description">
				{resource.description}
			</p>
			<div className="modula-getting-started-resource__action">
				{resource.external ? (
					<NewTabButton href={resource.href}>
						{resource.action}
					</NewTabButton>
				) : (
					<Button href={resource.href}>{resource.action}</Button>
				)}
			</div>
		</li>
	);
}

/**
 * The Documentation, Settings, Galleries and Extensions cards.
 *
 * @param {Object}                                            props
 * @param {Partial<import('./pageData').GettingStartedLinks>} props.links
 */
export function ResourceCards({ links }) {
	return (
		<ul className="modula-getting-started-resources">
			{resources(links).map((resource) => (
				<ResourceCard key={resource.key} resource={resource} />
			))}
		</ul>
	);
}
