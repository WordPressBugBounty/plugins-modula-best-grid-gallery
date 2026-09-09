/**
 * Takeover Hover: preview card with gallery aspect ratio, free-position slots on the image (build),
 * and Build / Preview toggle to simulate hover.
 */
import { editorCaptionsAreBelowImage } from '../../utils/editorCaptionsAreBelowImage';
import { useEffect, useId, useMemo, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useHoverEffectBuilder } from '../../context/HoverEffectBuilderContext';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { getHoverBuilderPreviewAspectCss } from '../../utils/getHoverBuilderPreviewAspectCss';
import HoverBuilderSlotChips from './HoverBuilderSlotChips';
import {
	buildCommittedSlotPositions,
	buildHoverBuilderItemClassName,
	buildHoverBuilderItemStyle,
	getHoverBuilderCardState,
	getSlotOrderFromPositions,
} from './hoverBuilderCardHelpers';
import {
	chipPlainPreviewText,
	getCaptionsTypographyStyle,
} from './hoverBuilderUtils';

/**
 * @param {{
 *   hideTitle: boolean,
 *   hideDesc: boolean,
 *   socialOn: boolean,
 *   selectedTarget: string,
 *   setSelectedTarget: (id: string) => void,
 * }} props
 */
function HoverBuilderSelectionSync({
	hideTitle,
	hideDesc,
	socialOn,
	selectedTarget,
	setSelectedTarget,
}) {
	useEffect(() => {
		if (hideTitle && selectedTarget === 'title') {
			setSelectedTarget('card');
		}
		if (hideDesc && selectedTarget === 'caption') {
			setSelectedTarget('card');
		}
		if (!socialOn && selectedTarget === 'social') {
			setSelectedTarget('card');
		}
	}, [hideTitle, hideDesc, socialOn, selectedTarget, setSelectedTarget]);

	return null;
}

/**
 * @param {{
 *   sampleImageSrc: string,
 *   sampleImageAlt?: string,
 *   previewItemTitle?: string,
 *   previewItemDescription?: string,
 * }} props
 */
export default function HoverEffectBuilderCard({
	sampleImageSrc,
	sampleImageAlt = '',
	previewItemTitle = '',
	previewItemDescription = '',
}) {
	const { form } = useGallerySettingsFormBundle();
	const {
		selectedTarget,
		setSelectedTarget,
		builderViewMode,
		linkedOverlaySlots,
	} = useHoverEffectBuilder();
	const listId = useId();
	const mediaRef = useRef(/** @type {HTMLDivElement | null} */ (null));

	const slotLabels = useMemo(
		() => ({
			title: __('Title', 'modula-best-grid-gallery'),
			caption: __('Caption', 'modula-best-grid-gallery'),
			social: __('Social', 'modula-best-grid-gallery'),
		}),
		[]
	);

	const buildMode = builderViewMode === 'build';
	const previewMode = builderViewMode === 'preview';

	return (
		<form.Subscribe
			selector={(s) => ({
				grouped: s.values,
				captions: s.values?.captions,
				galleryType: s.values?.general?.type,
				social: s.values?.social,
				hover: s.values?.hover,
			})}
		>
			{({ grouped, captions, galleryType, social, hover }) => {
				const aspectCss = getHoverBuilderPreviewAspectCss(grouped);

				return (
					<form.Field name="hover.builder">
						{(bField) => {
							const builder =
								bField.state.value &&
								typeof bField.state.value === 'object'
									? bField.state.value
									: {};
							const cardState = getHoverBuilderCardState(builder);
							const { positions, dimOverlayOn } = cardState;
							const captionBelowImage =
								editorCaptionsAreBelowImage(
									captions,
									galleryType
								);
							const itemClassName =
								buildHoverBuilderItemClassName({
									...cardState,
									captionBelowImage,
									forceHover: previewMode,
								});
							const visualSlotOrder =
								getSlotOrderFromPositions(positions);

							const hoverColorRaw =
								typeof hover?.hoverColor === 'string'
									? hover.hoverColor.trim()
									: '';
							const hoverColor =
								hoverColorRaw || 'rgba(0,0,0,.5)';
							const hoverOpacityNum = Number(hover?.hoverOpacity);
							const hoverOpacityPct = Number.isFinite(
								hoverOpacityNum
							)
								? Math.min(
										100,
										Math.max(0, Math.round(hoverOpacityNum))
									)
								: 50;
							const dimOverlayItemStyle =
								buildHoverBuilderItemStyle({
									builder,
									positions,
									dimOverlayOn,
									hoverColor,
									hoverOpacityPct,
								});
							const hideTitle = captions?.hideTitle === true;
							const hideDesc = captions?.hideDescription === true;
							const socialOn = social?.enableSocial === true;

							const showTitleSlot =
								!hideTitle && !captionBelowImage;
							const showCaptionSlot =
								!hideDesc && !captionBelowImage;
							const showSocialSlot = socialOn;

							const titleFromRow =
								chipPlainPreviewText(previewItemTitle);
							const captionFromRow = chipPlainPreviewText(
								previewItemDescription
							);
							const titleText =
								titleFromRow ||
								__('Sample title', 'modula-best-grid-gallery');
							const captionText =
								captionFromRow ||
								__(
									'Sample caption text',
									'modula-best-grid-gallery'
								);

							const titleTypographyStyle =
								getCaptionsTypographyStyle(captions, 'title');
							const captionTypographyStyle =
								getCaptionsTypographyStyle(captions, 'caption');

							const zForSlot = (slot) => {
								const i = visualSlotOrder.indexOf(slot);
								return 10 + (i >= 0 ? i : 0);
							};

							const commitPos = (slot, next) => {
								const nextPos = buildCommittedSlotPositions(
									positions,
									slot,
									next,
									linkedOverlaySlots
								);
								bField.handleChange({
									...builder,
									slotPositions: nextPos,
								});
							};

							return (
								<div className="modula-hover-builder-card-wrap">
									<HoverBuilderSelectionSync
										hideTitle={hideTitle}
										hideDesc={hideDesc}
										socialOn={socialOn}
										selectedTarget={selectedTarget}
										setSelectedTarget={setSelectedTarget}
									/>
									<span
										className="screen-reader-text"
										aria-live="polite"
										id={listId}
									>
										{selectedTarget === 'card'
											? __(
													'Card selected',
													'modula-best-grid-gallery'
												)
											: sprintf(
													/* translators: %s: slot id */
													__(
														'%s slot selected',
														'modula-best-grid-gallery'
													),
													slotLabels[
														selectedTarget
													] ?? selectedTarget
												)}
									</span>
									<div
										className={`modula-hover-builder-card-shell${
											buildMode ? ' is-build-mode' : ''
										}${
											previewMode
												? ' is-preview-mode'
												: ''
										}`}
									>
										<div
											className={itemClassName}
											style={dimOverlayItemStyle}
										>
											<div className="modula-item-content">
												<div
													ref={mediaRef}
													className="modula-hover-builder-card__media"
													style={{
														aspectRatio: aspectCss,
													}}
												>
													<button
														type="button"
														className="modula-hover-builder-card__select-card"
														aria-pressed={
															selectedTarget ===
															'card'
														}
														onClick={() =>
															setSelectedTarget(
																'card'
															)
														}
													>
														<span className="screen-reader-text">
															{__(
																'Select card hover treatment',
																'modula-best-grid-gallery'
															)}
														</span>
														{sampleImageSrc ? (
															<img
																className="modula-image pic"
																src={
																	sampleImageSrc
																}
																alt={
																	sampleImageAlt
																}
																loading="lazy"
																decoding="async"
															/>
														) : (
															<div
																className="modula-hover-builder-card__media-placeholder"
																role="img"
																aria-label={__(
																	'Preview placeholder',
																	'modula-best-grid-gallery'
																)}
															/>
														)}
													</button>
													<div
														className="modula-item-overlay"
														aria-hidden="true"
													/>
													{buildMode ? (
														<div
															className="modula-hover-builder-card__build-grid"
															aria-hidden="true"
														/>
													) : null}
													<HoverBuilderSlotChips
														mediaRef={mediaRef}
														buildMode={buildMode}
														selectedTarget={
															selectedTarget
														}
														setSelectedTarget={
															setSelectedTarget
														}
														slotLabels={slotLabels}
														positions={positions}
														showTitleSlot={
															showTitleSlot
														}
														showCaptionSlot={
															showCaptionSlot
														}
														showSocialSlot={
															showSocialSlot
														}
														zForSlot={zForSlot}
														onCommit={commitPos}
														titleText={titleText}
														titleTypographyStyle={
															titleTypographyStyle
														}
														captionText={
															captionText
														}
														captionTypographyStyle={
															captionTypographyStyle
														}
														social={social}
													/>
												</div>
											</div>
										</div>
									</div>
								</div>
							);
						}}
					</form.Field>
				);
			}}
		</form.Subscribe>
	);
}
