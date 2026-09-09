/**
 * Slider active-slide caption (title + description) with four placement variants.
 *
 * @package
 */

import {
	normalizeSliderCaptionPosition,
	sliderCaptionElementId,
} from '../utils/sliderCaptionPosition';

/**
 * @param {Object} props
 * @param {string} [props.position]     Raw or normalized placement slug.
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {boolean} [props.hideTitle]
 * @param {boolean} [props.hideDescription]
 * @param {string|number} [props.imageId] Attachment id for `id` / aria wiring.
 */
export default function SliderSlideCaption({
	position = 'bot_outside',
	title = '',
	description = '',
	hideTitle = false,
	hideDescription = false,
	imageId,
}) {
	const pos = normalizeSliderCaptionPosition(position);
	const hasTitle = !hideTitle && String(title || '').trim() !== '';
	const hasDescription =
		!hideDescription && String(description || '').trim() !== '';

	if (!hasTitle && !hasDescription) {
		return null;
	}

	const captionId = sliderCaptionElementId(imageId);

	return (
		<figcaption
			className={`slider-image-info slider-image-info--${pos} ${pos}`}
			{...(captionId ? { id: captionId } : {})}
		>
			{hasTitle ? <div className="modula-title">{title}</div> : null}
			{hasDescription ? (
				<p className="description">{description}</p>
			) : null}
		</figcaption>
	);
}
