/**
 * Hover effect builder body for the takeover auxiliary column.
 * Shell chrome (`AuxiliaryPanel`) is provided by the host; this is domain content only.
 * No duplicate panel head — nested sidebar already titles “Hover effect”.
 * It opens on Customize (the panel's preset select picks presets).
 */
import { editorCaptionsAreBelowImage } from '../../utils/editorCaptionsAreBelowImage';
import { useEffect, useMemo } from '@wordpress/element';
import '../../styles/takeover/preview/_hover-effect-builder.scss';
import { __ } from '@wordpress/i18n';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useHoverEffectBuilder } from '../../context/HoverEffectBuilderContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import HoverBuilderCanvasModeNav from './HoverBuilderCanvasModeNav';
import HoverBuilderCustomizePanel from './HoverBuilderCustomizePanel';
import HoverBuilderBelowImageNotice from './HoverBuilderBelowImageNotice';
import { AdminUiScope } from 'editor-shell';
import { resolveProCoreUpsell } from '../../logic/liteUpsell';

const OVERLAY_SLOT_IDS = ['title', 'caption', 'social'];

/**
 * @param {Object}  props
 * @param {boolean} [props.showCanvasChrome] Build/Preview tabs (needs live preview card).
 */
export default function HoverEffectBuilderAuxiliaryPanel({
	showCanvasChrome = false,
}) {
	const { form } = useGallerySettingsFormBundle();
	const config = useModulaSettingsEditorConfig();
	const {
		selectedTarget,
		setSelectedTarget,
		builderViewMode,
		setBuilderViewMode,
		linkedOverlaySlots,
		setLinkedOverlaySlots,
	} = useHoverEffectBuilder();
	const buildMode = !showCanvasChrome || builderViewMode === 'build';
	const previewMode = showCanvasChrome && builderViewMode === 'preview';
	const linkedSlots = Array.isArray(linkedOverlaySlots)
		? linkedOverlaySlots
		: [];
	const linkedOverlaySlotIds = linkedSlots.filter((id) =>
		OVERLAY_SLOT_IDS.includes(id)
	);
	const isSlotLinked = (slotId) => linkedSlots.includes(slotId);
	const toggleLinkedSlot = (slotId, nextChecked) => {
		const base = linkedSlots.filter((id) => OVERLAY_SLOT_IDS.includes(id));
		if (nextChecked) {
			if (!base.includes(slotId)) {
				setLinkedOverlaySlots([...base, slotId]);
			}
			return;
		}
		setLinkedOverlaySlots(base.filter((id) => id !== slotId));
	};
	const selectAllLinkedSlots = () =>
		setLinkedOverlaySlots([...OVERLAY_SLOT_IDS]);
	const clearLinkedSlots = () => setLinkedOverlaySlots([]);

	// The canvas opens on Build each time the builder opens.
	useEffect(() => {
		setBuilderViewMode('build');
	}, [setBuilderViewMode]);

	const slotLabels = useMemo(
		() => ({
			card: __('Image & tile', 'modula-best-grid-gallery'),
			title: __('Title', 'modula-best-grid-gallery'),
			caption: __('Caption', 'modula-best-grid-gallery'),
			social: __('Social', 'modula-best-grid-gallery'),
		}),
		[]
	);
	const selectedTargetLabel = slotLabels[selectedTarget] || slotLabels.title;

	const targetRows = useMemo(
		() => [
			{
				id: /** @type {const} */ ('card'),
				label: slotLabels.card,
				disabled: false,
				hint: '',
			},
			{
				id: /** @type {const} */ ('title'),
				label: slotLabels.title,
				disabled: false,
				hint: __(
					'Turn on the gallery title under Captions to edit this.',
					'modula-best-grid-gallery'
				),
				belowImageHint: __(
					'Rendered below image',
					'modula-best-grid-gallery'
				),
			},
			{
				id: /** @type {const} */ ('caption'),
				label: slotLabels.caption,
				disabled: false,
				hint: __(
					'Turn on the gallery description under Captions to edit this.',
					'modula-best-grid-gallery'
				),
				belowImageHint: __(
					'Rendered below image',
					'modula-best-grid-gallery'
				),
			},
			{
				id: /** @type {const} */ ('social'),
				label: slotLabels.social,
				disabled: false,
				hint: __(
					'Enable social icons under Sharing to edit this.',
					'modula-best-grid-gallery'
				),
			},
		],
		[slotLabels]
	);

	const liteUpsell = resolveProCoreUpsell(
		{
			needsProMessage: __(
				'Install and activate Modula Pro to unlock full hover customization and advanced controls.',
				'modula-best-grid-gallery'
			),
			ctaLabel: __('Get Pro', 'modula-best-grid-gallery'),
			pricingQuery:
				'utm_source=upsell&utm_medium=gallery-editor&utm_campaign=hover-effects',
		},
		config
	);

	return (
		<form.Subscribe
			selector={(s) => ({
				captions: s.values?.captions,
				galleryType: s.values?.general?.type,
				social: s.values?.social,
				hover: s.values?.hover,
			})}
		>
			{({ captions, galleryType, social, hover }) => {
				const captionBelowImage = editorCaptionsAreBelowImage(
					captions,
					galleryType
				);
				const showTitleSlot =
					captions?.hideTitle !== true && !captionBelowImage;
				const showCaptionSlot =
					captions?.hideDescription !== true && !captionBelowImage;
				const showSocialSlot = social?.enableSocial === true;
				const currentBuilder =
					hover?.builder && typeof hover.builder === 'object'
						? hover.builder
						: {};
				const currentHoverColor =
					typeof hover?.hoverColor === 'string'
						? hover.hoverColor
						: 'rgba(0,0,0,.5)';
				const currentHoverOpacity = Number.isFinite(
					Number(hover?.hoverOpacity)
				)
					? Number(hover.hoverOpacity)
					: 50;

				// One admin-ui scope for the whole column: the auxiliary column
				// sits outside the sidebar's, and the cards take its tokens.
				return (
					<AdminUiScope>
						<div
							className="modula-gallery-takeover__reorder-panel modula-gallery-takeover__reorder-panel--hover-builder"
							role="region"
							aria-label={__(
								'Hover effect builder',
								'modula-best-grid-gallery'
							)}
						>
							<div className="modula-gallery-takeover__reorder-body modula-gallery-takeover__hover-builder-body">
								<HoverBuilderBelowImageNotice
									captions={captions}
									galleryType={galleryType}
									compact
									className="modula-gallery-takeover__hover-builder-below-image-notice--sidebar"
								/>
								{showCanvasChrome ? (
									<>
										<HoverBuilderCanvasModeNav
											previewMode={previewMode}
											setBuilderViewMode={
												setBuilderViewMode
											}
										/>
										{previewMode ? (
											<p className="modula-gallery-takeover__hover-builder-hint">
												{__(
													'Switch to Build to edit layers, motion, and preset import.',
													'modula-best-grid-gallery'
												)}
											</p>
										) : null}
									</>
								) : null}
								<HoverBuilderCustomizePanel
									form={form}
									liteUpsell={liteUpsell}
									buildMode={buildMode}
									selectedTarget={selectedTarget}
									selectedTargetLabel={selectedTargetLabel}
									setSelectedTarget={setSelectedTarget}
									linkedOverlaySlots={linkedOverlaySlots}
									linkedOverlaySlotIds={linkedOverlaySlotIds}
									isSlotLinked={isSlotLinked}
									toggleLinkedSlot={toggleLinkedSlot}
									selectAllLinkedSlots={selectAllLinkedSlots}
									clearLinkedSlots={clearLinkedSlots}
									slotLabels={slotLabels}
									targetRows={targetRows.map((row) => {
										if (
											!captionBelowImage ||
											(row.id !== 'title' &&
												row.id !== 'caption')
										) {
											return row;
										}
										return {
											...row,
											disabled: true,
											hint:
												row.belowImageHint ||
												__(
													'Rendered below image',
													'modula-best-grid-gallery'
												),
										};
									})}
									captionBelowImage={captionBelowImage}
									showTitleSlot={showTitleSlot}
									showCaptionSlot={showCaptionSlot}
									showSocialSlot={showSocialSlot}
									currentBuilder={currentBuilder}
									currentHoverColor={currentHoverColor}
									currentHoverOpacity={currentHoverOpacity}
								/>
							</div>
						</div>
					</AdminUiScope>
				);
			}}
		</form.Subscribe>
	);
}
