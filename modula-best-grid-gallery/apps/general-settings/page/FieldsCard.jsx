import { CardFrame } from './CardFrame';
import { FieldRows } from './FieldRow';
import { UnavailableCard } from './UnavailableCard';
import { useCardValues } from './useCardValues';

/**
 * A card drawn from its config fields alone, with their own labels and
 * help: Pro's Image Guardian (no design), and any card a filter adds that
 * has no card of its own. A field shows while its conditions hold.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function FieldsCard({ card }) {
	const { values, setValue } = useCardValues(card);
	const fields = card.config.fields || [];

	if (0 === fields.length) {
		return <UnavailableCard card={card} />;
	}

	return (
		<CardFrame card={card}>
			<FieldRows
				fields={fields}
				values={values}
				setValue={setValue}
				// image_guardian → modula-image-guardian
				idPrefix={`modula-${card.id.replaceAll('_', '-')}`}
			/>
		</CardFrame>
	);
}
