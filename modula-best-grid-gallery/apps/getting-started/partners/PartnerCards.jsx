import { __, sprintf } from '@wordpress/i18n';
import { NewTabButton } from '../page/NewTabButton';

/**
 * What a partner card offers: Installed when the plugin is active, else a
 * link to the partner's site. Nothing installs or activates from here.
 *
 * @param {Object}                            props
 * @param {import('./partnersData').Partner} props.partner
 * @param {string}                            props.titleId Id of the card's title, which names the link.
 */
function PartnerAction({ partner, titleId }) {
	if (partner.active) {
		return (
			<span className="modula-partners-badge">
				{__('Installed', 'modula-best-grid-gallery')}
			</span>
		);
	}

	if (!partner.url) {
		return null;
	}

	return (
		<NewTabButton href={partner.url} aria-describedby={titleId}>
			{__('Find more', 'modula-best-grid-gallery')}
		</NewTabButton>
	);
}

/**
 * One partner plugin: image, name, version, description and its action.
 *
 * @param {Object}                            props
 * @param {import('./partnersData').Partner} props.partner
 * @param {number}                            props.index   Position in the list, for the title's id.
 */
function PartnerCard({ partner, index }) {
	const titleId = `modula-partner-${index}`;

	return (
		<li className="modula-partner">
			<div className="modula-partner__head">
				{/* Decorative: the name follows. */}
				<img
					className="modula-partner__image"
					src={partner.image}
					alt=""
					width="56"
					height="56"
				/>
				<div>
					<h3 id={titleId} className="modula-partner__name">
						{partner.name}
					</h3>
					{partner.version ? (
						<p className="modula-partner__version">
							{sprintf(
								/* translators: %s: plugin version, e.g. 3.2.14. */
								__('Version %s', 'modula-best-grid-gallery'),
								partner.version
							)}
						</p>
					) : null}
				</div>
			</div>
			<p className="modula-partner__description">{partner.description}</p>
			<div className="modula-partner__action">
				<PartnerAction partner={partner} titleId={titleId} />
			</div>
		</li>
	);
}

/**
 * The partner plugin grid.
 *
 * @param {Object}                              props
 * @param {import('./partnersData').Partner[]} props.partners
 */
export function PartnerCards({ partners }) {
	return (
		<ul className="modula-partners">
			{/* The list is fixed for the page load, so its order is a stable key. */}
			{partners.map((partner, index) => (
				<PartnerCard key={index} partner={partner} index={index} />
			))}
		</ul>
	);
}
