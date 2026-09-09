/**
 * Hover effect drill — preset Select + Customize opens aux (customize-only).
 */
import { __ } from '@wordpress/i18n';
import { Button, Select } from 'shared-ui';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { useTakeoverSidebarStack } from '../../context/TakeoverSidebarStackContext';
import { getHoverBuilderEntitlements } from '../../utils/hoverBuilderEntitlements';
import { applyHoverPreset, HOVER_BUILDER_PRESETS } from './hoverBuilderPresets';
import {
	isHoverPresetCustomized,
	resolveHoverPresetDisplayLabel,
	resolveHoverPresetSelectValue,
	shouldShowHoverCustomizeButton,
} from './resolveHoverPresetLabel';

/**
 * @param {Object} props
 * @param {Object} [props.field]
 * @param {string} [props.labelId]
 */
export default function HoverEffectPresetRow({ field, labelId }) {
	const { form } = useGallerySettingsFormBundle();
	const config = useModulaSettingsEditorConfig();
	const { setTopFrameAuxiliaryPanel } = useTakeoverSidebarStack();
	const isPro = Boolean(config?.isPro);
	const { freePresetCount } = getHoverBuilderEntitlements(config);
	const label =
		(typeof field?.editorLabel === 'string' && field.editorLabel) ||
		(typeof field?.label === 'string' && field.label) ||
		__('Hover effect', 'modula-best-grid-gallery');
	const titleId =
		labelId ||
		`modula-settings-panel-hover-preset-${String(
			field?.groupedPath || 'hover.effectBuilder'
		).replace(/[^a-z0-9.-]/gi, '-')}`;

	return (
		<form.Subscribe
			selector={(s) => ({
				builder: s.values?.hover?.builder,
			})}
		>
			{({ builder }) => {
				const selectValue = resolveHoverPresetSelectValue(builder);
				const customized = isHoverPresetCustomized(builder);
				const showCustomize = shouldShowHoverCustomizeButton(builder);
				const options = HOVER_BUILDER_PRESETS.map(
					(preset, presetIndex) => {
						const isLocked =
							!isPro && presetIndex >= freePresetCount;
						let optionLabel = preset.label;
						if (customized && preset.id === selectValue) {
							optionLabel =
								resolveHoverPresetDisplayLabel(builder);
						} else if (isLocked) {
							optionLabel = `${preset.label} — ${__(
								'Pro',
								'modula-best-grid-gallery'
							)}`;
						}
						return {
							value: preset.id,
							label: optionLabel,
							disabled: isLocked,
						};
					}
				);
				if (selectValue === '') {
					options.unshift({
						value: '',
						label: __('Custom', 'modula-best-grid-gallery'),
						disabled: true,
					});
				}

				return (
					<div className="modula-settings-editor__field-row modula-settings-editor__field-row--stacked modula-settings-panel__hover-preset-block">
						<label
							className="modula-settings-panel__select-row-label"
							htmlFor={titleId}
						>
							{label}
						</label>
						<Select
							id={titleId}
							options={options}
							value={selectValue}
							aria-label={label}
							onChange={(nextId) => {
								const preset = HOVER_BUILDER_PRESETS.find(
									(p) => p.id === nextId
								);
								if (!preset) {
									return;
								}
								const presetIndex =
									HOVER_BUILDER_PRESETS.indexOf(preset);
								if (!isPro && presetIndex >= freePresetCount) {
									return;
								}
								const base =
									builder && typeof builder === 'object'
										? builder
										: {};
								const nextBuilder = applyHoverPreset(
									base,
									preset
								);
								form.setFieldValue(
									'hover.builder',
									nextBuilder
								);
								form.setFieldValue(
									'hover.dimOverlay',
									!!nextBuilder.dimOverlay
								);
								if (preset.hover) {
									form.setFieldValue(
										'hover.hoverColor',
										preset.hover.hoverColor
									);
									form.setFieldValue(
										'hover.hoverOpacity',
										preset.hover.hoverOpacity
									);
								}
								// Fresh preset replaces the customize session.
								setTopFrameAuxiliaryPanel(null);
							}}
						/>
						{showCustomize ? (
							<div className="modula-settings-panel__hover-preset-actions">
								<Button
									variant="ghost"
									className="modula-settings-panel__hover-preset-customize"
									onClick={() => {
										setTopFrameAuxiliaryPanel({
											kind: 'hoverEffectBuilder',
											mode: 'customizeOnly',
										});
									}}
								>
									{__(
										'Customize',
										'modula-best-grid-gallery'
									)}
								</Button>
							</div>
						) : null}
					</div>
				);
			}}
		</form.Subscribe>
	);
}
