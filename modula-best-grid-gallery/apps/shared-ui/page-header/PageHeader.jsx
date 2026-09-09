import defaultLogo from '../../../assets/images/modula-logo-black.webp';
import './_page-header.scss';

/**
 * WP admin page logo bar (extensions, insights, general settings).
 * Self-includes styles so hosts that do not `@use` shared-ui/styles still look right.
 *
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props.logoSrc]
 * @param {string} [props.logoAlt]
 */
export function PageHeader({
	className = '',
	logoSrc = defaultLogo,
	logoAlt = 'modula logo',
}) {
	const classes = ['modula-ui-page-header', className]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classes}>
			<div className="modula-ui-page-header__logo">
				<img src={logoSrc} alt={logoAlt} />
			</div>
		</div>
	);
}
