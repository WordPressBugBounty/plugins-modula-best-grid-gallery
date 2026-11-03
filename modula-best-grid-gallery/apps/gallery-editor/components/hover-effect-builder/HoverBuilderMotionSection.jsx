import { useId } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Chip, Range, SettingsRow } from 'admin-ui';
import { ItemEditCard, SelectMenuControl } from 'editor-shell';
import { getAnimationPrimitives } from '../../data/animationCatalog';
import { FieldValidationError } from './FieldValidationError';

/**
 * @param {'card'|'graphic'|'layer'} kind Animation catalog primitive kind.
 * @return {{ value: string, label: string }[]} Menu options in catalog order.
 */
function primitiveOptions(kind) {
	return getAnimationPrimitives(kind).map(({ id, label }) => ({
		value: id,
		label,
	}));
}

const CARD_OPTIONS = primitiveOptions('card');

const GRAPHIC_OPTIONS = primitiveOptions('graphic');

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

const ENTER_OPTIONS = primitiveOptions('layer');

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
 * A menu select under its label: the panel's column row, since the builder
 * column is too narrow for a select beside these labels. The trigger is a
 * button, which a `<label>` cannot name, so the label is a span and the menu
 * select names itself.
 *
 * @param {Object}                              props
 * @param {string}                              props.id
 * @param {string}                              props.label
 * @param {string}                              props.value
 * @param {{ value: string, label: string }[]} props.options
 * @param {Function}                            props.onChange Receives the option value.
 */
function MotionSelectField({ id, label, value, options, onChange }) {
	return (
		<SettingsRow label={label} controlId={id} labelElement="span" stacked>
			<SelectMenuControl
				id={id}
				label={label}
				value={value}
				groups={[{ id: 'default', options }]}
				onChange={onChange}
			/>
		</SettingsRow>
	);
}

/**
 * A timing slider as the panel draws one: label and value box on one line,
 * the slider under them.
 *
 * @param {Object}   props
 * @param {string}   props.id
 * @param {string}   props.label
 * @param {number}   props.value
 * @param {Function} props.onChange Receives the number.
 * @param {number}   props.min
 * @param {number}   props.max
 * @param {number}   props.step
 */
function MotionRangeField({ id, label, value, onChange, min, max, step }) {
	return (
		<div className="modula-gallery-takeover__hover-builder-range-row">
			<SettingsRow label={label} controlId={id}>
				<Range
					id={id}
					value={value}
					onChange={onChange}
					min={min}
					max={max}
					step={step}
				/>
			</SettingsRow>
		</div>
	);
}

/**
 * @param {Object}                            props
 * @param {any}                               props.form
 * @param {'card'|'title'|'caption'|'social'} props.selectedTarget
 * @param {string}                            props.selectedTargetLabel
 * @param {string[]}                          props.linkedOverlaySlots
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
		<ItemEditCard title={motionSectionHeading(selectedTarget)}>
			<form.Field name="hover.builder">
				{(builderField) => {
					const builder =
						builderField.state.value &&
						typeof builderField.state.value === 'object'
							? builderField.state.value
							: {};
					const currentValue =
						selectedTarget === 'card'
							? builder.cardTreatment || 'none'
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
							<p className="modula-gallery-takeover__hover-builder-help">
								{__(
									'When linked layers are selected, changing entrance animation updates the whole linked group.',
									'modula-best-grid-gallery'
								)}
							</p>
							{groupedMotionTarget ? (
								<div className="modula-gallery-takeover__hover-builder-chips">
									<Chip>
										{sprintf(
											/* translators: %d: number of linked layers */
											__(
												'Applies to %d linked layers',
												'modula-best-grid-gallery'
											),
											linkedSlots.length
										)}
									</Chip>
								</div>
							) : null}
							<MotionSelectField
								id={presetFieldId}
								label={sprintf(
									/* translators: %s: selected layer name */
									__(
										'Preset for %s',
										'modula-best-grid-gallery'
									),
									selectedTargetLabel
								)}
								value={currentValue}
								options={motionOptions}
								onChange={applyMotionValue}
							/>
							{selectedTarget === 'card' ? (
								<>
									<MotionSelectField
										id={graphicFieldId}
										label={__(
											'Graphic element',
											'modula-best-grid-gallery'
										)}
										value={builder.graphicElement || 'none'}
										options={GRAPHIC_OPTIONS}
										onChange={(next) =>
											builderField.handleChange({
												...builder,
												graphicElement: next || 'none',
											})
										}
									/>
									<MotionSelectField
										id={graphicVisibilityFieldId}
										label={__(
											'Graphic visibility',
											'modula-best-grid-gallery'
										)}
										value={
											builder.graphicVisibility ||
											'on-hover'
										}
										options={GRAPHIC_VISIBILITY_OPTIONS}
										onChange={(next) =>
											builderField.handleChange({
												...builder,
												graphicVisibility:
													next === 'always'
														? 'always'
														: 'on-hover',
											})
										}
									/>
								</>
							) : (
								<MotionSelectField
									id={visibilityFieldId}
									label={__(
										'Layer visibility',
										'modula-best-grid-gallery'
									)}
									value={visibilityValue}
									options={VISIBILITY_OPTIONS}
									onChange={applyVisibilityValue}
								/>
							)}
							<MotionRangeField
								id={durationFieldId}
								label={__(
									'Duration (ms)',
									'modula-best-grid-gallery'
								)}
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
							<MotionRangeField
								id={delayFieldId}
								label={__(
									'Base delay (ms)',
									'modula-best-grid-gallery'
								)}
								value={delayValue}
								onChange={(next) =>
									applyTimingValue('Delay', next, 0, 600, 0)
								}
								min={0}
								max={600}
								step={10}
							/>
							{isCardTarget ? null : (
								<MotionRangeField
									id={staggerFieldId}
									label={__(
										'Layer stagger (ms)',
										'modula-best-grid-gallery'
									)}
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
							)}
							<FieldValidationError fieldApi={builderField} />
						</>
					);
				}}
			</form.Field>
		</ItemEditCard>
	);
}
