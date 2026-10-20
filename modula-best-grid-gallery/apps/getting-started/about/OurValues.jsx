import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	CommitmentIcon,
	FunIcon,
	IntegrityIcon,
	LearningIcon,
	PassionIcon,
	TeamworkIcon,
} from './valueIcons';

/**
 * @typedef {Object} Value
 * @property {string}                    key         Which value.
 * @property {import('react').ReactNode} icon        Decorative icon.
 * @property {string}                    title       Value name.
 * @property {string}                    description What it means to WPChill.
 */

/**
 * WPChill's six values, in order.
 *
 * @return {Value[]} Values.
 */
function values() {
	return [
		{
			key: 'commitment',
			icon: <CommitmentIcon />,
			title: __('Commitment', 'modula-best-grid-gallery'),
			description: __(
				'It is powered by a deep need to help others and build a customer-centric culture.',
				'modula-best-grid-gallery'
			),
		},
		{
			key: 'passion',
			icon: <PassionIcon />,
			title: __('Passion', 'modula-best-grid-gallery'),
			description: __(
				'We love our work & craft and allow it to define us. We take pride in the work we deliver.',
				'modula-best-grid-gallery'
			),
		},
		{
			key: 'learning',
			icon: <LearningIcon />,
			title: __('Learning', 'modula-best-grid-gallery'),
			description: __(
				'Honing our craft, staying ahead of the curve, and over-delivering on all fronts.',
				'modula-best-grid-gallery'
			),
		},
		{
			key: 'teamwork',
			icon: <TeamworkIcon />,
			title: __('Teamwork', 'modula-best-grid-gallery'),
			description: __(
				'We are working together to deliver the best possible customer experience and product.',
				'modula-best-grid-gallery'
			),
		},
		{
			key: 'fun',
			icon: <FunIcon />,
			title: __('Fun', 'modula-best-grid-gallery'),
			description: __(
				'Setting a fun environment where ideas can take shape is a vital part of the creation process.',
				'modula-best-grid-gallery'
			),
		},
		{
			key: 'integrity',
			icon: <IntegrityIcon />,
			title: __('Integrity', 'modula-best-grid-gallery'),
			description: __(
				'Acting with solid ethics is a priority for everyone representing the organization.',
				'modula-best-grid-gallery'
			),
		},
	];
}

/**
 * "Our values": a titled grid of one card per value. It uses the settings
 * card's heading, with the cards in place of the card body.
 */
export function OurValues() {
	const titleId = `modula-about-us-values-${useId()}`;

	return (
		<section className="modula-admin-card" aria-labelledby={titleId}>
			<div className="modula-admin-card__head">
				<h3 id={titleId} className="modula-admin-card__title">
					{__('Our values', 'modula-best-grid-gallery')}
				</h3>
			</div>
			<ul className="modula-about-us-values">
				{values().map((value) => (
					<li key={value.key} className="modula-about-us-value">
						<span className="modula-about-us-value__icon">
							{value.icon}
						</span>
						<h4 className="modula-about-us-value__title">
							{value.title}
						</h4>
						<p className="modula-about-us-value__description">
							{value.description}
						</p>
					</li>
				))}
			</ul>
		</section>
	);
}
