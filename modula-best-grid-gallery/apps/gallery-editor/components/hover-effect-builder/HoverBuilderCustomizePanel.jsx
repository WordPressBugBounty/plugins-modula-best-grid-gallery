import { useId } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Chip, SettingsRow, Toggle, rowHelpId } from 'admin-ui';
import { ItemEditCard, SelectMenuControl } from 'editor-shell';
import LiteUpsellCard from '../upsell/LiteUpsellCard';
import HoverBuilderMotionSection from './HoverBuilderMotionSection';
import HoverBuilderPresetJsonSection from './HoverBuilderPresetJsonSection';

const OVERLAY_SLOT_IDS = ['title', 'caption', 'social'];

/**
 * @param {{
 *   form: import('../../form/GallerySettingsFormContext').GallerySettingsForm,
 *   liteUpsell: import('../../logic/liteUpsell').LiteUpsell|null,
 *   buildMode: boolean,
 *   selectedTarget: string,
 *   selectedTargetLabel: string,
 *   setSelectedTarget: (id: 'card' | 'title' | 'caption' | 'social') => void,
 *   linkedOverlaySlots: string[],
 *   linkedOverlaySlotIds: string[],
 *   isSlotLinked: (slotId: string) => boolean,
 *   toggleLinkedSlot: (slotId: string, nextChecked: boolean) => void,
 *   selectAllLinkedSlots: () => void,
 *   clearLinkedSlots: () => void,
 *   slotLabels: Record<string, string>,
 *   targetRows: Array<{ id: string, label: string, disabled?: boolean, hint?: string }>,
 *   showTitleSlot: boolean,
 *   showCaptionSlot: boolean,
 *   showSocialSlot: boolean,
 *   captionBelowImage?: boolean,
 *   currentBuilder: Record<string, unknown>,
 *   currentHoverColor: string,
 *   currentHoverOpacity: number,
 * }} props
 */
export default function HoverBuilderCustomizePanel({
	form,
	liteUpsell,
	buildMode,
	selectedTarget,
	selectedTargetLabel,
	setSelectedTarget,
	linkedOverlaySlots,
	linkedOverlaySlotIds,
	isSlotLinked,
	toggleLinkedSlot,
	selectAllLinkedSlots,
	clearLinkedSlots,
	slotLabels,
	targetRows,
	showTitleSlot,
	showCaptionSlot,
	showSocialSlot,
	captionBelowImage = false,
	currentBuilder,
	currentHoverColor,
	currentHoverOpacity,
}) {
	const linkIdPrefix = useId();
	const layerFieldId = useId();
	const linkToggleId = (slotId) => `${linkIdPrefix}-link-${slotId}`;

	// Lite: the upsell stands in for the builder (`resolveProCoreUpsell` has none in Pro).
	if (liteUpsell) {
		return (
			<ItemEditCard title={__('Customize', 'modula-best-grid-gallery')}>
				<LiteUpsellCard upsell={liteUpsell} variant="section" />
			</ItemEditCard>
		);
	}

	/**
	 * A layer the tile does not show (hidden title, caption below the
	 * image, social off) cannot be picked.
	 *
	 * @param {{ id: string, disabled?: boolean }} row
	 * @return {boolean} True when the layer is unavailable.
	 */
	const isLayerUnavailable = (row) =>
		row.disabled === true ||
		(row.id === 'title' && !showTitleSlot) ||
		(row.id === 'caption' && !showCaptionSlot) ||
		(row.id === 'social' && !showSocialSlot);

	// The badge says why a layer is off; which layers are linked shows on the
	// Move together switches.
	const layerOptions = targetRows.map((row) => {
		const unavailable = isLayerUnavailable(row);
		return {
			value: row.id,
			label: row.label,
			disabled: unavailable,
			badge: unavailable ? row.hint : undefined,
		};
	});

	return (
		<>
			{captionBelowImage ? (
				<p className="modula-gallery-takeover__hover-builder-hint">
					{__(
						'Titles and captions are currently displayed below the image. Text layers are disabled in the hover builder.',
						'modula-best-grid-gallery'
					)}
				</p>
			) : null}
			{buildMode ? (
				<>
					<ItemEditCard>
						<SettingsRow
							label={__('Layer', 'modula-best-grid-gallery')}
							controlId={layerFieldId}
							labelElement="span"
							help={__(
								'Select a layer, then choose its entrance animation below.',
								'modula-best-grid-gallery'
							)}
						>
							<SelectMenuControl
								id={layerFieldId}
								label={__('Layer', 'modula-best-grid-gallery')}
								describedBy={rowHelpId(layerFieldId)}
								value={selectedTarget}
								groups={[
									{ id: 'default', options: layerOptions },
								]}
								onChange={(nextId) => {
									const row = targetRows.find(
										(r) => r.id === nextId
									);
									if (row && !isLayerUnavailable(row)) {
										setSelectedTarget(row.id);
									}
								}}
							/>
						</SettingsRow>
					</ItemEditCard>

					<ItemEditCard
						title={__('Move together', 'modula-best-grid-gallery')}
					>
						<p className="modula-gallery-takeover__hover-builder-help">
							{__(
								'Choose 2 or 3 layers. Dragging one selected layer moves the whole group on both axes.',
								'modula-best-grid-gallery'
							)}
						</p>
						<div className="modula-gallery-takeover__hover-builder-link-actions">
							<Button
								variant="link"
								onClick={selectAllLinkedSlots}
							>
								{__('Select all', 'modula-best-grid-gallery')}
							</Button>
							<Button
								variant="link"
								onClick={clearLinkedSlots}
								disabled={linkedOverlaySlots.length === 0}
							>
								{__('Clear all', 'modula-best-grid-gallery')}
							</Button>
							{linkedOverlaySlotIds.length > 1 ? (
								<Chip>
									{sprintf(
										/* translators: %d: number of linked layers */
										__(
											'%d linked',
											'modula-best-grid-gallery'
										),
										linkedOverlaySlotIds.length
									)}
								</Chip>
							) : null}
						</div>
						{OVERLAY_SLOT_IDS.map((slotId) => (
							<SettingsRow
								key={slotId}
								label={slotLabels[slotId]}
								controlId={linkToggleId(slotId)}
							>
								<Toggle
									id={linkToggleId(slotId)}
									checked={isSlotLinked(slotId)}
									onChange={(next) =>
										toggleLinkedSlot(slotId, next)
									}
								/>
							</SettingsRow>
						))}
					</ItemEditCard>

					<HoverBuilderMotionSection
						form={form}
						selectedTarget={selectedTarget}
						selectedTargetLabel={selectedTargetLabel}
						linkedOverlaySlots={linkedOverlaySlots}
					/>
					<HoverBuilderPresetJsonSection
						form={form}
						currentBuilder={currentBuilder}
						currentHoverColor={currentHoverColor}
						currentHoverOpacity={currentHoverOpacity}
					/>
				</>
			) : null}
		</>
	);
}
