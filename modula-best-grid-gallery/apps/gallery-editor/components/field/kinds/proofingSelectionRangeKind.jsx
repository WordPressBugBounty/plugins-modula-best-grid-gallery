import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { useGalleryImageCount } from '../../../hooks/useGalleryImageCount';
import { proofingSelectionSliderMax } from '../../../logic/proofingSelectionCoupling';
import { renderRangeKind } from './rangeKind';

/**
 * Minimum and maximum proofing selection: the range slider, bounded by the
 * gallery's image count (and the minimum by a finite maximum) once the
 * count is known. Until then the schema's bounds apply.
 *
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
function ProofingSelectionRange(ctx) {
	const { form } = useGallerySettingsFormBundle();
	const imageCount = useGalleryImageCount();

	if (!imageCount.isKnown) {
		return renderRangeKind(ctx);
	}

	return (
		<form.Subscribe selector={(s) => s.values?.proofing?.maxSelection}>
			{(maxSelection) =>
				renderRangeKind({
					...ctx,
					control: {
						...ctx.control,
						min: 0,
						max: proofingSelectionSliderMax(
							ctx.field?.groupedPath,
							imageCount.count,
							maxSelection
						),
					},
				})
			}
		</form.Subscribe>
	);
}

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderProofingSelectionRangeKind(ctx) {
	return <ProofingSelectionRange {...ctx} />;
}
