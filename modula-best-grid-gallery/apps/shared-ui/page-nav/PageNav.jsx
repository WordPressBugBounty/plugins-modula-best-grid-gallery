import './_page-nav.scss';

/**
 * @typedef {{
 *   label: string,
 *   slug: string,
 *   href?: string,
 *   type?: 'link' | 'button',
 *   target?: boolean,
 * }} PageNavItem
 */

/**
 * WP admin page tab strip (extensions, insights, general settings).
 * Self-includes styles so hosts that do not `@use` shared-ui/styles still look right.
 *
 * @param {Object}        props
 * @param {PageNavItem[]} [props.items=[]]
 * @param {string}        [props.activeTab]
 * @param {Function}      [props.onItemClick] `(slug: string) => void`
 * @param {string}        [props.className]
 */
export function PageNav({
	items = [],
	activeTab,
	onItemClick,
	className = '',
}) {
	const rootClass = ['modula-ui-page-nav', className]
		.filter(Boolean)
		.join(' ');

	return (
		<nav className={rootClass}>
			{items.map(
				({ label, slug, href, type = 'button', target = false }) => {
					const isLink = type === 'link';
					const classes =
						activeTab === slug ? 'is-active' : undefined;
					const handleClick =
						typeof onItemClick === 'function'
							? () => onItemClick(slug)
							: undefined;

					if (isLink) {
						return (
							<a
								key={slug}
								href={href || slug}
								target={target ? '_blank' : undefined}
								rel={target ? 'noopener noreferrer' : undefined}
								className={classes}
								onClick={handleClick}
							>
								{label}
							</a>
						);
					}

					return (
						<button
							key={slug}
							type="button"
							className={classes}
							onClick={handleClick}
						>
							{label}
						</button>
					);
				}
			)}
		</nav>
	);
}
