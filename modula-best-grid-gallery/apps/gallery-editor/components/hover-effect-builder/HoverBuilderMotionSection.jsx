import { useId } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { FieldStack, Select, Slider } from 'shared-ui';
import { FieldValidationError } from '../form-field-auxiliary/shared';

const CARD_OPTIONS = [
	{ value: 'none', label: __('None', 'modula-best-grid-gallery') },
	{ value: 'zoom', label: __('Zoom image', 'modula-best-grid-gallery') },
	{ value: 'grayscale', label: __('Grayscale', 'modula-best-grid-gallery') },
	{ value: 'lift', label: __('Lift', 'modula-best-grid-gallery') },
];

const GRAPHIC_OPTIONS = [
	{ value: 'none', label: __('None', 'modula-best-grid-gallery') },
	{ value: 'frame', label: __('Frame', 'modula-best-grid-gallery') },
	{ value: 'diamond', label: __('Diamond', 'modula-best-grid-gallery') },
];

const GRAPHIC_VISIBILITY_OPTIONS = [
	{
		value: 'on-hover',
		label: __('Show on hover', 'modula-best-grid-gallery'),
	},
	{
		value: 'always',
		label: __('Always visible', 'modula-best-grid-gallery'),
	},
];

const ENTER_OPTIONS = [
	{ value: 'none', label: __('None', 'modula-best-grid-gallery') },
	{ value: 'fade', label: __('Fade in', 'modula-best-grid-gallery') },
	{ value: 'slide-up', label: __('Slide up', 'modula-best-grid-gallery') },
	{
		value: 'slide-down',
		label: __('Slide down', 'modula-best-grid-gallery'),
	},
	{
		value: 'slide-left',
		label: __('Slide left', 'modula-best-grid-gallery'),
	},
	{
		value: 'slide-right',
		label: __('Slide right', 'modula-best-grid-gallery'),
	},
	{ value: 'blur-in', label: __('Blur in', 'modula-best-grid-gallery') },
	{ value: 'scale', label: __('Scale in', 'modula-best-grid-gallery') },
];

const VISIBILITY_OPTIONS = [
	{
		value: 'on-hover',
		label: __('Show on hover', 'modula-best-grid-gallery'),
	},
	{
		value: 'always',
		label: __('Always visible', 'modula-best-grid-gallery'),
	},
	{
		value: 'hide-on-hover',
		label: __('Hide on hover', 'modula-best-grid-gallery'),
	},
	{
		value: 'hidden',
		label: __('Hidden', 'modula-best-grid-gallery'),
	},
];

function motionSectionHeading(target) {
	if (target === 'card') {
		return __('Tile animation', 'modula-best-grid-gallery');
	}
	return __('Layer animation', 'modula-best-grid-gallery');
}

/**
 * @param {Object} props
 * @param {any} props.form
 * @param {'card'|'title'|'caption'|'social'} props.selectedTarget
 * @param {string} props.selectedTargetLabel
 * @param {string[]} props.linkedOverlaySlots
 */
export default function HoverBuilderMotionSection({
	form,
	selectedTarget,
	selectedTargetLabel,
	linkedOverlaySlots,
}) {
	const presetFieldId = useId();
	const graphicFieldId = useId();
	const graphicVisibilityFieldId = useId();
	const visibilityFieldId = useId();
	const durationFieldId = useId();
	const delayFieldId = useId();
	const staggerFieldId = useId();

	return (
		<section className="modula-gallery-takeover__reorder-setup-block">
			<form.Field name="hover.builder">
				{(builderField) => {
					const builder =
						builderField.state.value &&
						typeof builderField.state.value === 'object'
							? builderField.state.value
							: {};
					const currentValue =
						selectedTarget === 'card'
							? builder.cardTreatment || 'zoom'
							: selectedTarget === 'title'
								? builder.titleEnter || 'fade'
								: selectedTarget === 'caption'
									? builder.captionEnter || 'fade'
									: builder.socialEnter || 'fade';
					const motionOptions =
						selectedTarget === 'card'
							? CARD_OPTIONS
							: ENTER_OPTIONS;
					const isCardTarget = selectedTarget === 'card';
					const linkedSlots = Array.isArray(linkedOverlaySlots)
						? linkedOverlaySlots
						: [];
					const groupedMotionTarget =
						!isCardTarget && linkedSlots.length > 1;

					const applyMotionValue = (next) => {
						const slug =
							typeof next === 'string' && next.trim() !== ''
								? next.trim()
								: 'none';
						if (selectedTarget === 'card') {
							builderField.handleChange({
								...builder,
								cardTreatment: slug,
							});
							return;
						}
						if (!groupedMotionTarget) {
							builderField.handleChange({
								...builder,
								[`${selectedTarget}Enter`]: slug,
							});
							return;
						}
						builderField.handleChange({
							...builder,
							titleEnter: linkedSlots.includes('title')
								? slug
								: builder.titleEnter,
							captionEnter: linkedSlots.includes('caption')
								? slug
								: builder.captionEnter,
							socialEnter: linkedSlots.includes('social')
								? slug
								: builder.socialEnter,
						});
					};

					const readTiming = (kind, fallback) => {
						const sourceKey =
							selectedTarget === 'card'
								? `cardEnter${kind}Ms`
								: `${selectedTarget}Enter${kind}Ms`;
						const raw = Number(builder[sourceKey]);
						return Number.isFinite(raw) ? raw : fallback;
					};

					const durationValue = readTiming('Duration', 280);
					const delayValue = readTiming('Delay', 0);
					const staggerValue = readTiming('Stagger', 45);

					const applyTimingValue = (
						kind,
						next,
						min,
						max,
						fallback
					) => {
						const n = Number(next);
						const safe = Number.isFinite(n)
							? Math.min(max, Math.max(min, Math.round(n)))
							: fallback;
						const nextBuilder = { ...builder };
						if (selectedTarget === 'card') {
							nextBuilder[`cardEnter${kind}Ms`] = safe;
						} else if (groupedMotionTarget) {
							linkedSlots.forEach((slotId) => {
								nextBuilder[`${slotId}Enter${kind}Ms`] = safe;
							});
						} else {
							nextBuilder[`${selectedTarget}Enter${kind}Ms`] =
								safe;
						}
						builderField.handleChange(nextBuilder);
					};

					const visibilityKey = `${selectedTarget}Visibility`;
					const visibilityValue =
						selectedTarget === 'card'
							? 'on-hover'
							: typeof builder[visibilityKey] === 'string'
								? builder[visibilityKey]
								: 'on-hover';

					const applyVisibilityValue = (next) => {
						const slug =
							typeof next === 'string' && next.trim() !== ''
								? next.trim()
								: 'on-hover';
						if (selectedTarget === 'card') {
							return;
						}
						if (!groupedMotionTarget) {
							builderField.handleChange({
								...builder,
								[visibilityKey]: slug,
							});
							return;
						}
						builderField.handleChange({
							...builder,
							titleVisibility: linkedSlots.includes('title')
								? slug
								: builder.titleVisibility,
							captionVisibility: linkedSlots.includes('caption')
								? slug
								: builder.captionVisibility,
							socialVisibility: linkedSlots.includes('social')
								? slug
								: builder.socialVisibility,
						});
					};

					return (
						<>
							<h3 className="modula-gallery-takeover__reorder-setup-title">
								{motionSectionHeading(selectedTarget)}
							</h3>
							<div className="modula-gallery-takeover__reorder-setup-body">
								<p className="modula-gallery-takeover__hover-builder-layer-help">
									{__(
										'When linked layers are selected, changing entrance animation updates the whole linked group.',
										'modula-best-grid-gallery'
									)}
								</p>
								<div className="modula-gallery-takeover__hover-builder-motion modula-settings-editor__inline-field-control">
									{groupedMotionTarget ? (
										<div className="modula-gallery-takeover__hover-builder-motion-badge-wrap">
											<span className="modula-gallery-takeover__hover-builder-inline-badge">
												{sprintf(
													/* translators: %d: number of linked layers */
													__(
														'Applies to %d linked layers',
														'modula-best-grid-gallery'
													),
													linkedSlots.length
												)}
											</span>
										</div>
									) : null}
									<FieldStack
										label={sprintf(
											/* translators: %s: selected layer name */
											__(
												'Preset for %s',
												'modula-best-grid-gallery'
											),
											selectedTargetLabel
										)}
										htmlFor={presetFieldId}
									>
										<Select
											id={presetFieldId}
											value={currentValue}
											options={motionOptions}
											onChange={applyMotionValue}
										/>
									</FieldStack>
									{selectedTarget === 'card' ? (
										<>
											<FieldStack
												label={__(
													'Graphic element',
													'modula-best-grid-gallery'
												)}
												htmlFor={graphicFieldId}
											>
												<Select
													id={graphicFieldId}
													value={
														builder.graphicElement ||
														'none'
													}
													options={GRAPHIC_OPTIONS}
													onChange={(next) =>
														builderField.handleChange(
															{
																...builder,
																graphicElement:
																	next ||
																	'none',
															}
														)
													}
												/>
											</FieldStack>
											<FieldStack
												label={__(
													'Graphic visibility',
													'modula-best-grid-gallery'
												)}
												htmlFor={
													graphicVisibilityFieldId
												}
											>
												<Select
													id={
														graphicVisibilityFieldId
													}
													value={
														builder.graphicVisibility ||
														'on-hover'
													}
													options={
														GRAPHIC_VISIBILITY_OPTIONS
													}
													onChange={(next) =>
														builderField.handleChange(
															{
																...builder,
																graphicVisibility:
																	next ===
																	'always'
																		? 'always'
																		: 'on-hover',
															}
														)
													}
												/>
											</FieldStack>
										</>
									) : (
										<FieldStack
											label={__(
												'Layer visibility',
												'modula-best-grid-gallery'
											)}
											htmlFor={visibilityFieldId}
										>
											<Select
												id={visibilityFieldId}
												value={visibilityValue}
												options={VISIBILITY_OPTIONS}
												onChange={applyVisibilityValue}
											/>
										</FieldStack>
									)}
									<FieldStack
										label={__(
											'Duration (ms)',
											'modula-best-grid-gallery'
										)}
										htmlFor={durationFieldId}
									>
										<Slider
											id={durationFieldId}
											value={durationValue}
											onChange={(next) =>
												applyTimingValue(
													'Duration',
													next,
													120,
													1200,
													280
												)
											}
											min={120}
											max={1200}
											step={10}
										/>
									</FieldStack>
									<FieldStack
										label={__(
											'Base delay (ms)',
											'modula-best-grid-gallery'
										)}
										htmlFor={delayFieldId}
									>
										<Slider
											id={delayFieldId}
											value={delayValue}
											onChange={(next) =>
												applyTimingValue(
													'Delay',
													next,
													0,
													600,
													0
												)
											}
											min={0}
											max={600}
											step={10}
										/>
									</FieldStack>
									{isCardTarget ? null : (
										<FieldStack
											label={__(
												'Layer stagger (ms)',
												'modula-best-grid-gallery'
											)}
											htmlFor={staggerFieldId}
										>
											<Slider
												id={staggerFieldId}
												value={staggerValue}
												onChange={(next) =>
													applyTimingValue(
														'Stagger',
														next,
														0,
														300,
														45
													)
												}
												min={0}
												max={300}
												step={5}
											/>
										</FieldStack>
									)}
									<FieldValidationError
										fieldApi={builderField}
									/>
								</div>
							</div>
						</>
					);
				}}
			</form.Field>
		</section>
	);
}
