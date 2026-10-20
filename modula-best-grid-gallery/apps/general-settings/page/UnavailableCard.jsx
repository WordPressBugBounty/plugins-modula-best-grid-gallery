import { __ } from '@wordpress/i18n';
import { CardFrame } from './CardFrame';
import { useDevelopmentError } from './useDevelopmentError';

/**
 * A card whose config lacks the fields it draws (Lite and Pro releases out
 * of step, or a filter that changed the config): its title and lock, with
 * a message instead of controls, so it never renders blank.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function UnavailableCard({ card }) {
	useDevelopmentError(
		`Modula Settings: the "${card.id}" card got a config it cannot draw.`
	);

	return (
		<CardFrame card={card}>
			<p className="modula-settings-card-message">
				{__(
					'These settings cannot be shown here. Make sure Modula and Modula PRO are up to date.',
					'modula-best-grid-gallery'
				)}
			</p>
		</CardFrame>
	);
}
