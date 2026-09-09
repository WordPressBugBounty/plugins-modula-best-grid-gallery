import { __, sprintf } from '@wordpress/i18n';
import { useEffect, useRef } from '@wordpress/element';
import {
	applyHoverPreset,
	getMatchingPresetId,
	HOVER_BUILDER_PRESETS,
} from './hoverBuilderPresets';
import { getHoverBuilderEntitlements } from '../../utils/hoverBuilderEntitlements';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';

/**
 * @param {{ form: import('../../form/GallerySettingsFormContext').GallerySettingsForm, isPro: boolean }} props
 */
export default function HoverBuilderPresetsPanel({ form, isPro }) {
	const config = useModulaSettingsEditorConfig();
	const { freePresetCount } = getHoverBuilderEntitlements(config);
	const listRef = useRef(/** @type {HTMLDivElement|null} */ (null));
	const didScrollRef = useRef(false);

	return (
		<section className="modula-gallery-takeover__reorder-setup-block modula-gallery-takeover__hover-builder-presets-panel">
			<h3 className="modula-gallery-takeover__reorder-setup-title">
				{__('Presets', 'modula-best-grid-gallery')}
			</h3>
			<div className="modula-gallery-takeover__reorder-setup-body">
				<p className="modula-gallery-takeover__hover-builder-layer-help">
					{__(
						'Start from a preset, then fine-tune anything you want.',
						'modula-best-grid-gallery'
					)}
				</p>
				<form.Field name="hover.builder">
					{(builderField) => {
						const builder =
							builderField.state.value &&
							typeof builderField.state.value === 'object'
								? builderField.state.value
								: {};
						const activePresetId = getMatchingPresetId(builder);

						return (
							<HoverBuilderPresetsList
								form={form}
								builder={builder}
								builderField={builderField}
								activePresetId={activePresetId}
								isPro={isPro}
								freePresetCount={freePresetCount}
								listRef={listRef}
								didScrollRef={didScrollRef}
							/>
						);
					}}
				</form.Field>
			</div>
		</section>
	);
}

/**
 * @param {Object} props
 */
function HoverBuilderPresetsList({
	form,
	builder,
	builderField,
	activePresetId,
	isPro,
	freePresetCount,
	listRef,
	didScrollRef,
}) {
	useEffect(() => {
		if (didScrollRef.current || !activePresetId) {
			return;
		}
		const root = listRef.current;
		if (!root) {
			return;
		}
		const active = root.querySelector(
			'.modula-gallery-takeover__hover-builder-preset-btn.is-active'
		);
		if (!(active instanceof HTMLElement)) {
			return;
		}
		didScrollRef.current = true;
		active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}, [activePresetId, didScrollRef, listRef]);

	return (
		<div
			ref={listRef}
			className="modula-gallery-takeover__hover-builder-presets"
		>
			{HOVER_BUILDER_PRESETS.map((preset, presetIndex) => {
				const isActive = activePresetId === preset.id;
				const isLocked = !isPro && presetIndex >= freePresetCount;
				const lockedLabel = sprintf(
					/* translators: %s: hover preset name */
					__(
						'%s (Pro preset — upgrade to unlock)',
						'modula-best-grid-gallery'
					),
					preset.label
				);
				return (
					<button
						key={preset.id}
						type="button"
						className={`modula-gallery-takeover__hover-builder-preset-btn${
							isActive ? ' is-active' : ''
						}${isLocked ? ' is-locked' : ''}`}
						aria-pressed={isActive}
						aria-label={isLocked ? lockedLabel : preset.label}
						aria-describedby={
							isLocked
								? `hover-preset-pro-${preset.id}`
								: undefined
						}
						disabled={isLocked}
						onClick={() => {
							if (isLocked) {
								return;
							}
							const nextBuilder = applyHoverPreset(
								builder,
								preset
							);
							builderField.handleChange(nextBuilder);
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
						}}
					>
						<span className="modula-gallery-takeover__hover-builder-preset-label-row">
							<span className="modula-gallery-takeover__hover-builder-preset-label">
								{preset.label}
							</span>
							{isLocked ? (
								<span
									id={`hover-preset-pro-${preset.id}`}
									className="modula-gallery-takeover__hover-builder-inline-badge modula-gallery-takeover__hover-builder-inline-badge--pro"
								>
									{__('Pro', 'modula-best-grid-gallery')}
								</span>
							) : null}
						</span>
						<span className="modula-gallery-takeover__hover-builder-preset-description">
							{preset.description}
						</span>
					</button>
				);
			})}
		</div>
	);
}
