import { LockedCard, SettingsCard } from 'admin-ui';
import { decodedText } from '../cards/serverText';
import { planLabel, upgradeUrl } from './plan';

/**
 * The frame of a rebuilt card: a LockedCard (plan badge, disabled controls,
 * Upgrade) when the card is locked, else a SettingsCard.
 *
 * The title is the projected card label, the name search finds the card by.
 *
 * @param {Object}                    props
 * @param {Object}                    props.card     Projected settings card.
 * @param {import('react').ReactNode} [props.title]  Title of a card the label does not name (a card shown in its place).
 * @param {import('react').ReactNode} [props.note]   Help text under the card.
 * @param {import('react').ReactNode} props.children Card rows.
 */
export function CardFrame({
	card,
	title = decodedText(card.label),
	note = null,
	children,
}) {
	if (card.locked) {
		return (
			<LockedCard
				title={title}
				plan={planLabel(card.badge)}
				upgradeHref={upgradeUrl(card.id)}
				note={note}
			>
				{children}
			</LockedCard>
		);
	}

	return (
		<SettingsCard title={title} note={note}>
			{children}
		</SettingsCard>
	);
}
