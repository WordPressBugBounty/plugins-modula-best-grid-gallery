/**
 * Hover effect builder body for the takeover auxiliary column.
 * Shell chrome (`AuxiliaryPanel`) is provided by the host; this is domain content only.
 * No duplicate panel head — nested sidebar already titles “Hover effect”.
 *
 * When `mode === 'customizeOnly'` (opened from panel Customize), skip Presets tab.
 */
import { editorCaptionsAreBelowImage } from '../../utils/editorCaptionsAreBelowImage';
import { useEffect, useMemo, useState } from '@wordpress/element';
import '../../styles/takeover/preview/_hover-effect-builder.scss';
import { __ } from '@wordpress/i18n';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useHoverEffectBuilder } from '../../context/HoverEffectBuilderContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { getHoverBuilderEntitlements } from '../../utils/hoverBuilderEntitlements';
import HoverBuilderTabNav from './HoverBuilderTabNav';
import HoverBuilderCanvasModeNav from './HoverBuilderCanvasModeNav';
import HoverBuilderPresetsPanel from './HoverBuilderPresetsPanel';
import HoverBuilderCustomizePanel from './HoverBuilderCustomizePanel';
import HoverBuilderBelowImageNotice from './HoverBuilderBelowImageNotice';
import { appendQuery, withV3Utm } from 'gallery-shared/utils/withV3Utm';

const OVERLAY_SLOT_IDS = ['title', 'caption', 'social'];

/**
 * @param {Object} props
 * @param {boolean} [props.showCanvasChrome] Build/Preview tabs (needs live preview card).
 * @param {'customizeOnly'} [props.mode]
 */
export default function HoverEffectBuilderAuxiliaryPanel({
	showCanvasChrome = false,
	mode,
}) {
	const customizeOnly = mode === 'customizeOnly';
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
	const [activeTab, setActiveTab] = useState(
		customizeOnly ? 'customize' : 'presets'
	);

	useEffect(() => {
		if (customizeOnly) {
			setActiveTab('customize');
			setBuilderViewMode('build');
		}
	}, [customizeOnly, setBuilderViewMode]);

	useEffect(() => {
		if (customizeOnly) {
			return;
		}
		if (!showCanvasChrome) {
			if (activeTab === 'customize') {
				setBuilderViewMode('build');
			}
			return;
		}
		if (activeTab === 'presets') {
			setBuilderViewMode('preview');
		}
	}, [activeTab, showCanvasChrome, setBuilderViewMode, customizeOnly]);

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

	const isPro = Boolean(config?.isPro);
	const { customizeTabEnabled } = getHoverBuilderEntitlements(config);
	const upgradeUrl = withV3Utm(
		typeof config?.upgradeUrl === 'string' && config.upgradeUrl !== ''
			? appendQuery(
					config.upgradeUrl,
					'utm_source=upsell&utm_medium=gallery-editor&utm_campaign=hover-effects'
				)
			: 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=gallery-editor&utm_campaign=hover-effects'
	);

	const showCustomizeContent = customizeOnly || activeTab === 'customize';
	const showPresetsContent = !customizeOnly && activeTab === 'presets';

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

				return (
					<div
						className="modula-gallery-takeover__reorder-panel modula-gallery-takeover__reorder-panel--setup modula-gallery-takeover__reorder-panel--hover-builder"
						role="region"
						aria-label={__(
							'Hover effect builder',
							'modula-best-grid-gallery'
						)}
					>
						<div className="modula-gallery-takeover__reorder-body modula-gallery-takeover__reorder-body--setup">
							<HoverBuilderBelowImageNotice
								captions={captions}
								galleryType={galleryType}
								compact
								className="modula-gallery-takeover__hover-builder-below-image-notice--sidebar"
							/>
							{!customizeOnly ? (
								<HoverBuilderTabNav
									activeTab={activeTab}
									customizeTabEnabled={customizeTabEnabled}
									onSelectPresets={() => {
										setActiveTab('presets');
										if (showCanvasChrome) {
											setBuilderViewMode('preview');
										}
									}}
									onSelectCustomize={() => {
										if (customizeTabEnabled) {
											setActiveTab('customize');
											setBuilderViewMode('build');
										}
									}}
								/>
							) : null}
							{showCanvasChrome &&
							showCustomizeContent &&
							(customizeOnly || customizeTabEnabled) ? (
								<>
									<HoverBuilderCanvasModeNav
										buildMode={buildMode}
										previewMode={previewMode}
										setBuilderViewMode={setBuilderViewMode}
									/>
									{previewMode ? (
										<p className="modula-gallery-takeover__hover-builder-canvas-hint">
											{__(
												'Switch to Build to edit layers, motion, and preset import.',
												'modula-best-grid-gallery'
											)}
										</p>
									) : null}
								</>
							) : null}
							{showPresetsContent ? (
								<HoverBuilderPresetsPanel
									form={form}
									isPro={isPro}
								/>
							) : null}
							{showCustomizeContent ? (
								<HoverBuilderCustomizePanel
									form={form}
									isPro={isPro}
									upgradeUrl={upgradeUrl}
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
							) : null}
						</div>
					</div>
				);
			}}
		</form.Subscribe>
	);
}
