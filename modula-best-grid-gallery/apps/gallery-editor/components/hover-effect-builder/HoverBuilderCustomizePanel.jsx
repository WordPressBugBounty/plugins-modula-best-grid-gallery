import { __, sprintf } from '@wordpress/i18n';
import { ActionRow, Button, SettingsRow, Switch } from 'shared-ui';
import HoverBuilderMotionSection from './HoverBuilderMotionSection';
import HoverBuilderPresetJsonSection from './HoverBuilderPresetJsonSection';

const OVERLAY_SLOT_IDS = ['title', 'caption', 'social'];

/**
 * @param {{
 *   form: import('../../form/GallerySettingsFormContext').GallerySettingsForm,
 *   isPro: boolean,
 *   upgradeUrl: string,
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
	isPro,
	upgradeUrl,
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
	if (!isPro) {
		return (
			<section className="modula-gallery-takeover__reorder-setup-block">
				<h3 className="modula-gallery-takeover__reorder-setup-title">
					{__('Customize', 'modula-best-grid-gallery')}
				</h3>
				<div className="modula-gallery-takeover__reorder-setup-body">
					<div className="modula-settings-editor__editor-upsell">
						<h3 className="modula-settings-editor__editor-upsell-heading">
							{__(
								'Customize requires Modula Pro',
								'modula-best-grid-gallery'
							)}
						</h3>
						<p className="modula-settings-editor__editor-upsell-text">
							{__(
								'Install and activate Modula Pro to unlock full hover customization and advanced controls.',
								'modula-best-grid-gallery'
							)}
						</p>
						<div className="modula-settings-editor__editor-upsell-actions">
							<Button
								variant="primary"
								href={upgradeUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="modula-settings-editor__editor-upsell-btn modula-settings-editor__editor-upsell-btn--primary"
							>
								{__('Get Pro', 'modula-best-grid-gallery')}
							</Button>
						</div>
					</div>
				</div>
			</section>
		);
	}

	return (
		<>
			{captionBelowImage ? (
				<p className="modula-gallery-takeover__hover-builder-canvas-hint">
					{__(
						'Titles and captions are currently displayed below the image. Text layers are disabled in the hover builder.',
						'modula-best-grid-gallery'
					)}
				</p>
			) : null}
			{buildMode ? (
				<>
					<section className="modula-gallery-takeover__reorder-setup-block">
						<h3 className="modula-gallery-takeover__reorder-setup-title">
							{__('Layer', 'modula-best-grid-gallery')}
						</h3>
						<div className="modula-gallery-takeover__reorder-setup-body">
							<p className="modula-gallery-takeover__hover-builder-layer-help">
								{__(
									'Select a layer, then choose its entrance animation below.',
									'modula-best-grid-gallery'
								)}
							</p>
							<ul
								className="modula-gallery-takeover__reorder-setup-sort-list modula-gallery-takeover__hover-builder-layer-list"
								aria-label={__(
									'Hover layer',
									'modula-best-grid-gallery'
								)}
							>
								{targetRows.map((row) => {
									const disabled =
										row.disabled === true ||
										(row.id === 'title' &&
											!showTitleSlot) ||
										(row.id === 'caption' &&
											!showCaptionSlot) ||
										(row.id === 'social' &&
											!showSocialSlot);
									const isSel = selectedTarget === row.id;
									return (
										<li key={row.id}>
											<button
												type="button"
												className={`modula-gallery-takeover__reorder-setup-sort-btn${
													isSel ? ' is-selected' : ''
												}${
													disabled
														? ' is-disabled'
														: ''
												}`}
												disabled={disabled}
												title={
													disabled
														? row.hint
														: undefined
												}
												aria-pressed={isSel}
												aria-label={
													disabled && row.hint
														? `${row.label} — ${row.hint}`
														: row.label
												}
												onClick={() => {
													if (!disabled) {
														setSelectedTarget(
															row.id
														);
													}
												}}
											>
												<span className="modula-gallery-takeover__reorder-setup-sort-row">
													<span className="modula-gallery-takeover__reorder-setup-sort-label">
														{row.label}
													</span>
													{row.id !== 'card' &&
													isSlotLinked(row.id) ? (
														<span className="modula-gallery-takeover__hover-builder-inline-badge modula-gallery-takeover__hover-builder-inline-badge--subtle">
															{__(
																'linked',
																'modula-best-grid-gallery'
															)}
														</span>
													) : null}
												</span>
											</button>
										</li>
									);
								})}
							</ul>
						</div>
					</section>

					<section className="modula-gallery-takeover__reorder-setup-block">
						<h3 className="modula-gallery-takeover__reorder-setup-title">
							{__('Move together', 'modula-best-grid-gallery')}
						</h3>
						<div className="modula-gallery-takeover__reorder-setup-body">
							<p className="modula-gallery-takeover__hover-builder-layer-help">
								{__(
									'Choose 2 or 3 layers. Dragging one selected layer moves the whole group on both axes.',
									'modula-best-grid-gallery'
								)}
							</p>
							{linkedOverlaySlotIds.length > 1 ? (
								<div className="modula-gallery-takeover__hover-builder-link-overlay-actions">
									<span className="modula-gallery-takeover__hover-builder-inline-badge">
										{sprintf(
											/* translators: %d: number of linked layers */
											__(
												'%d linked',
												'modula-best-grid-gallery'
											),
											linkedOverlaySlotIds.length
										)}
									</span>
								</div>
							) : null}
							<div className="modula-gallery-takeover__hover-builder-link-overlay-actions">
								<ActionRow>
									<Button
										type="button"
										variant="plain"
										onClick={selectAllLinkedSlots}
									>
										{__(
											'Select all',
											'modula-best-grid-gallery'
										)}
									</Button>
									<Button
										type="button"
										variant="plain"
										onClick={clearLinkedSlots}
										disabled={
											linkedOverlaySlots.length === 0
										}
									>
										{__(
											'Clear all',
											'modula-best-grid-gallery'
										)}
									</Button>
								</ActionRow>
							</div>
							<div className="modula-gallery-takeover__hover-builder-link-fields">
								{OVERLAY_SLOT_IDS.map((slotId) => (
									<SettingsRow
										key={slotId}
										className="modula-gallery-takeover__hover-builder-link-row"
										label={slotLabels[slotId]}
										end={
											<Switch
												checked={isSlotLinked(slotId)}
												showStatus
												onChange={(next) =>
													toggleLinkedSlot(
														slotId,
														!!next
													)
												}
											/>
										}
									/>
								))}
							</div>
						</div>
					</section>

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
