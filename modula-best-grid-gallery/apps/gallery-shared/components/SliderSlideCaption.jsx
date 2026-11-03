/**
 * Slider active-slide caption (title + description) with four placement variants.
 *
 * @package
 */

import {
	normalizeSliderCaptionPosition,
	sliderCaptionElementId,
} from '../utils/sliderCaptionPosition';
import {
	ITEM_DESCRIPTION_CLASS_NAME,
	ITEM_TITLE_CLASS_NAME,
} from '../utils/itemChromeLegacyCssAliases';
import { sanitizeCaptionHtml } from '../utils/sanitizeCaptionHtml';

/**
 * The gradient behind a caption inside the slide (`_slider-slide-caption.scss`),
 * drawn before it in the slide's image wrapper.
 *
 * @return {import('react').JSX.Element} The scrim.
 */
export function SliderSlideCaptionScrim() {
	return <div className="slider-image-info__scrim" aria-hidden="true" />;
}

/**
 * @param {Object}        props
 * @param {string}        [props.position]         Raw or normalized placement slug.
 * @param {string}        [props.title]
 * @param {string}        [props.description]      Caption HTML; sanitized here, since the canvas passes unsaved text.
 * @param {boolean}       [props.hideTitle]
 * @param {boolean}       [props.hideDescription]
 * @param {string|number} [props.imageId]          Attachment id for `id` / aria wiring.
 * @param {Object}        [props.titleStyle]       Inline title style, for a caller without the gallery's dynamic CSS.
 * @param {Object}        [props.descriptionStyle] Inline description style, as `titleStyle`.
 */
export default function SliderSlideCaption({
	position = 'bot_outside',
	title = '',
	description = '',
	hideTitle = false,
	hideDescription = false,
	imageId,
	titleStyle,
	descriptionStyle,
}) {
	const hasTitle = !hideTitle && String(title || '').trim() !== '';
	const hasDescription =
		!hideDescription && String(description || '').trim() !== '';

	if (!hasTitle && !hasDescription) {
		return null;
	}

	const pos = normalizeSliderCaptionPosition(position);
	const captionId = sliderCaptionElementId(imageId);

	return (
		<figcaption
			className={`slider-image-info slider-image-info--${pos} ${pos}`}
			{...(captionId ? { id: captionId } : {})}
		>
			{hasTitle ? (
				<div className={ITEM_TITLE_CLASS_NAME} style={titleStyle}>
					{title}
				</div>
			) : null}
			{hasDescription ? (
				<p
					className={`${ITEM_DESCRIPTION_CLASS_NAME} description`}
					style={descriptionStyle}
					dangerouslySetInnerHTML={{
						__html: sanitizeCaptionHtml(description),
					}}
				/>
			) : null}
		</figcaption>
	);
}
