/**
 * Single schema field bound to TanStack Form via dotted name (group.key).
 */

import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { validateFieldValue } from '../../logic/validateFieldValue';
import { humanizeKey } from '../../logic/humanizeKey';
import { useGalleryTypeChangeConfirm } from '../../hooks/useGalleryTypeChangeConfirm';
import { useGalleryTypeChangeContext } from '../../context/GalleryTypeChangeContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import FieldControl from '../field/FieldControl';
import EditorUpsellBlurb from '../upsell/EditorUpsellBlurb';
import SpeedupHelpBlurb from '../upsell/SpeedupHelpBlurb';
import GalleryTypeChangeConfirmModal from '../modals/GalleryTypeChangeConfirmModal';
import FieldHelpInfoTip from './FieldHelpInfoTip';
import SchemaFieldDirtyChrome from './SchemaFieldDirtyChrome';
import SchemaFieldRowToggleGrid from './SchemaFieldRowToggleGrid';
import SchemaFieldRowToggleWithNestedGrid from './SchemaFieldRowToggleWithNestedGrid';
import ExifResultPreview from '../field/ExifResultPreview';
import DeeplinkUrlPreview from '../field/DeeplinkUrlPreview';
import GalleryDefaultsShellField from '../field/GalleryDefaultsShellField';
import InstagramAccountSlot from '../field/InstagramAccountSlot';
import {
	getLightboxUpsellExtensionSlugs,
	resolveExtensionUpsellBarrier,
	resolveOmitControlInLite,
} from '../../logic/proGateLock';
import { applyGroupedFieldWrite } from '../../logic/groupedFieldWrite';
import { getByPath } from '../../logic/getByPath';
import {
	isSettingsValueAtDefault,
	resetSettingsFieldValue,
} from '../../logic/settingsFieldDefault';
import { isEditorDisabledWhen } from '../../logic/fieldVisibility';
import HoverEffectPresetRow from '../hover-effect-builder/HoverEffectPresetRow';

/**
 * @param {Object}             props
 * @param {string}             props.groupKey
 * @param {Object}             props.field
 * @param {boolean}            props.disabled
 * @param {'default'|'inline'|'controlOnly'|'stacked'} [props.variant] inline = cell inside a composite row; controlOnly = control without label (device tabs); stacked = label above control
 * @param {boolean}            [props.hierarchicalIndent] Child field under a collapsible group
 */
export default function SchemaFieldRow({
	groupKey,
	field,
	disabled,
	variant = 'default',
	hierarchicalIndent = false,
}) {
	const { form } = useGallerySettingsFormBundle();
	const sharedGalleryTypeConfirm = useGalleryTypeChangeContext();
	const confirmHookPath =
		sharedGalleryTypeConfirm && field.groupedPath === 'general.type'
			? '__modula_gt_noop__'
			: field.groupedPath;
	const localGalleryTypeConfirm =
		useGalleryTypeChangeConfirm(confirmHookPath);
	const galleryTypeFlow =
		sharedGalleryTypeConfirm && field.groupedPath === 'general.type'
			? sharedGalleryTypeConfirm
			: localGalleryTypeConfirm;
	const { makeOnChange } = galleryTypeFlow;
	const fieldName = `${groupKey}.${field.groupedKey}`;
	const resolveOnChange = (fieldApi) =>
		field.groupedPath === 'general.type'
			? makeOnChange(fieldApi)
			: (v) => {
					applyGroupedFieldWrite(form, {
						fieldName,
						groupedPath: field.groupedPath,
						value: v,
					});
				};
	const label =
		typeof field.editorLabel === 'string' && field.editorLabel !== ''
			? field.editorLabel
			: humanizeKey(field.groupedKey);

	const indentLegacy = hierarchicalIndent;
	const compactStack = Boolean(field.editorUi?.compactStack);
	const editor = useModulaSettingsEditorConfig();
	const isPro = Boolean(editor.isPro);
	const schemaObj =
		field.schema && typeof field.schema === 'object' ? field.schema : null;
	const lightboxUpsellCfg =
		schemaObj && typeof schemaObj.editorLightboxLiteUpsell === 'object'
			? schemaObj.editorLightboxLiteUpsell
			: null;
	const extensionUpsellSlugs = lightboxUpsellCfg
		? getLightboxUpsellExtensionSlugs(lightboxUpsellCfg)
		: [];
	const extensionUpsellBarrier = resolveExtensionUpsellBarrier(
		extensionUpsellSlugs,
		editor
	);
	const isToggleWithNestedRow =
		field.control?.kind === 'toggleWithNested' &&
		field.control?.sidebarNestedPanel &&
		typeof field.control.sidebarNestedPanel.title === 'string' &&
		Array.isArray(field.control.sidebarNestedPanel.groupedPaths) &&
		field.control.sidebarNestedPanel.groupedPaths.length > 0;
	const disabledByLiteSchema =
		!isPro && schemaObj && schemaObj.editorDisabledInLite === true;
	const omitControlInLite = resolveOmitControlInLite(schemaObj, editor);
	/** Whole-group Lite read-only — dims the row (`--locked`). Not used for per-field `editorDisabledInLite`. */
	const rowLocked = disabled;
	const controlDisabled =
		disabled || disabledByLiteSchema || omitControlInLite;

	if (field.control?.kind === 'hoverEffectBuilder') {
		return (
			<HoverEffectPresetRow
				field={field}
				labelId={`modula-settings-field-${String(field.groupedPath || 'hover.effectBuilder').replace(/[^a-z0-9.-]/gi, '-')}`}
			/>
		);
	}

	if (field.control?.kind === 'heading') {
		const compactHeading = Boolean(field.editorUi?.compactHeading);
		const baseClass = `modula-settings-editor__field-row modula-settings-editor__field-row--section-heading${
			compactHeading
				? ' modula-settings-editor__field-row--compact-heading'
				: ''
		}${rowLocked ? ' modula-settings-editor__field-row--locked' : ''}`;
		const headingInner = (
			<form.Field name={fieldName}>
				{() => (
					<div className="modula-settings-editor__section-heading-inner">
						<span className="modula-settings-editor__section-heading-label">
							{label}
						</span>
						<FieldHelpInfoTip
							field={field}
							path={field.groupedPath}
						/>
					</div>
				)}
			</form.Field>
		);
		if (
			schemaObj?.editorDisabledWhen &&
			typeof schemaObj.editorDisabledWhen === 'object'
		) {
			return (
				<form.Subscribe selector={(s) => s.values}>
					{(values) => (
						<div
							className={`${baseClass}${
								isEditorDisabledWhen(schemaObj, values)
									? ' modula-settings-editor__field-row--disabled-when'
									: ''
							}`}
						>
							{headingInner}
						</div>
					)}
				</form.Subscribe>
			);
		}
		return <div className={baseClass}>{headingInner}</div>;
	}

	if (field.control?.kind === 'infoCallout') {
		const calloutText =
			typeof field.editorDescription === 'string' &&
			field.editorDescription.trim() !== ''
				? field.editorDescription.trim()
				: label;
		const baseClass = `modula-settings-editor__field-row modula-settings-editor__field-row--info-callout${
			rowLocked ? ' modula-settings-editor__field-row--locked' : ''
		}`;
		const calloutInner = (
			<form.Field name={fieldName}>
				{() => (
					<p className="modula-settings-editor__info-callout">
						<span
							className="modula-settings-editor__info-callout-icon"
							aria-hidden="true"
						>
							i
						</span>
						<span className="modula-settings-editor__info-callout-text">
							{calloutText}
						</span>
					</p>
				)}
			</form.Field>
		);
		if (
			schemaObj?.editorDisabledWhen &&
			typeof schemaObj.editorDisabledWhen === 'object'
		) {
			return (
				<form.Subscribe selector={(s) => s.values}>
					{(values) => (
						<div
							className={`${baseClass}${
								isEditorDisabledWhen(schemaObj, values)
									? ' modula-settings-editor__field-row--disabled-when'
									: ''
							}`}
						>
							{calloutInner}
						</div>
					)}
				</form.Subscribe>
			);
		}
		return <div className={baseClass}>{calloutInner}</div>;
	}

	if (field.control?.kind === 'speedupHelp') {
		return (
			<div className="modula-settings-editor__field-row modula-settings-editor__field-row--help-only">
				<SpeedupHelpBlurb />
			</div>
		);
	}

	if (field.control?.kind === 'exifResultPreview') {
		const baseClass =
			'modula-settings-editor__field-row modula-settings-editor__field-row--exif-result';
		const previewInner = (
			<form.Field name={fieldName}>
				{() => <ExifResultPreview />}
			</form.Field>
		);
		if (
			schemaObj?.editorDisabledWhen &&
			typeof schemaObj.editorDisabledWhen === 'object'
		) {
			return (
				<form.Subscribe selector={(s) => s.values}>
					{(values) => (
						<div
							className={`${baseClass}${
								isEditorDisabledWhen(schemaObj, values)
									? ' modula-settings-editor__field-row--disabled-when'
									: ''
							}`}
						>
							{previewInner}
						</div>
					)}
				</form.Subscribe>
			);
		}
		return <div className={baseClass}>{previewInner}</div>;
	}

	if (field.control?.kind === 'deeplinkUrlPreview') {
		const baseClass =
			'modula-settings-editor__field-row modula-settings-editor__field-row--deeplink-url';
		const previewInner = (
			<form.Field name={fieldName}>
				{() => <DeeplinkUrlPreview />}
			</form.Field>
		);
		if (
			schemaObj?.editorDisabledWhen &&
			typeof schemaObj.editorDisabledWhen === 'object'
		) {
			return (
				<form.Subscribe selector={(s) => s.values}>
					{(values) => (
						<div
							className={`${baseClass}${
								isEditorDisabledWhen(schemaObj, values)
									? ' modula-settings-editor__field-row--disabled-when'
									: ''
							}`}
						>
							{previewInner}
						</div>
					)}
				</form.Subscribe>
			);
		}
		return <div className={baseClass}>{previewInner}</div>;
	}

	if (field.control?.kind === 'galleryDefaultsShell') {
		if (omitControlInLite) {
			return (
				<div className="modula-settings-editor__field-row modula-settings-editor__field-row--gallery-defaults-shell">
					<form.Field name={fieldName}>
						{() => <EditorUpsellBlurb field={field} />}
					</form.Field>
				</div>
			);
		}
		return (
			<div className="modula-settings-editor__field-row modula-settings-editor__field-row--gallery-defaults-shell">
				<form.Field name={fieldName}>
					{() => <GalleryDefaultsShellField />}
				</form.Field>
			</div>
		);
	}

	if (field.control?.kind === 'instagramAccount') {
		return (
			<div className="modula-settings-editor__field-row modula-settings-editor__field-row--instagram-account">
				<form.Field name={fieldName}>
					{() => <InstagramAccountSlot />}
				</form.Field>
			</div>
		);
	}

	if (omitControlInLite && variant === 'default' && !isToggleWithNestedRow) {
		return (
			<div
				className={`modula-settings-editor__field-row modula-settings-editor__field-row--full-width${
					rowLocked
						? ' modula-settings-editor__field-row--locked'
						: ''
				}`}
			>
				<div className="modula-settings-editor__field-control-col modula-settings-editor__field-control-col--span-all">
					<form.Field name={fieldName}>
						{() => <EditorUpsellBlurb field={field} />}
					</form.Field>
				</div>
			</div>
		);
	}

	if (omitControlInLite && variant === 'inline' && !isToggleWithNestedRow) {
		return (
			<div
				className={`modula-settings-editor__inline-field${
					indentLegacy
						? ' modula-settings-editor__inline-field--hierarchy'
						: ''
				}`}
			>
				<div className="modula-settings-editor__inline-field-control">
					<form.Field name={fieldName}>
						{() => <EditorUpsellBlurb field={field} />}
					</form.Field>
				</div>
			</div>
		);
	}

	const isToggleRow = field.control?.kind === 'toggle';
	const disabledWhenRule =
		schemaObj?.editorDisabledWhen &&
		typeof schemaObj.editorDisabledWhen === 'object'
			? schemaObj.editorDisabledWhen
			: null;

	const fieldValidators = {
		onChange: ({ value: v }) => {
			const r = validateFieldValue(field, v);
			return r.valid ? undefined : r.message;
		},
	};

	/**
	 * @param {boolean} [disabledByWhen]
	 */
	const renderControlBlock = (disabledByWhen = false) => (
		<form.Field name={fieldName} validators={fieldValidators}>
			{(fieldApi) => (
				<>
					<div id={`modula-field-${field.groupedPath}`}>
						<FieldControl
							field={field}
							value={fieldApi.state.value}
							onChange={resolveOnChange(fieldApi)}
							disabled={controlDisabled || disabledByWhen}
						/>
					</div>
					<EditorUpsellBlurb field={field} />
					{fieldApi.state.meta.isTouched &&
						fieldApi.state.meta.errors?.length > 0 && (
							<p
								className="modula-settings-editor__field-error"
								role="alert"
							>
								{fieldApi.state.meta.errors[0]}
							</p>
						)}
				</>
			)}
		</form.Field>
	);

	const controlBlock = disabledWhenRule ? (
		<form.Subscribe selector={(s) => s.values}>
			{(values) =>
				renderControlBlock(isEditorDisabledWhen(schemaObj, values))
			}
		</form.Subscribe>
	) : (
		renderControlBlock(false)
	);

	const galleryTypeConfirmModal =
		field.groupedPath === 'general.type' && !sharedGalleryTypeConfirm ? (
			<GalleryTypeChangeConfirmModal
				isOpen={localGalleryTypeConfirm.galleryTypeConfirmOpen}
				isBusy={localGalleryTypeConfirm.galleryTypeConfirmBusy}
				onCancel={
					localGalleryTypeConfirm.handleGalleryTypeConfirmCancel
				}
				onConfirm={localGalleryTypeConfirm.handleGalleryTypeConfirm}
			/>
		) : null;

	if (
		field.editorHideRowLabel &&
		(variant === 'default' || variant === 'stacked')
	) {
		return (
			<>
				<div
					className={`modula-settings-editor__field-row${
						variant === 'stacked'
							? ' modula-settings-editor__field-row--stacked'
							: ''
					} modula-settings-editor__field-row--control-only${
						rowLocked
							? ' modula-settings-editor__field-row--locked'
							: ''
					}`}
				>
					<div className="modula-settings-editor__field-control-col modula-settings-editor__field-control-col--span-all">
						{controlBlock}
					</div>
				</div>
				{galleryTypeConfirmModal}
			</>
		);
	}

	if (variant === 'controlOnly') {
		return (
			<>
				<div
					className={`modula-settings-editor__field-row modula-settings-editor__field-row--control-only${
						rowLocked
							? ' modula-settings-editor__field-row--locked'
							: ''
					}`}
				>
					<div className="modula-settings-editor__field-control-col modula-settings-editor__field-control-col--span-all">
						{controlBlock}
					</div>
				</div>
				{galleryTypeConfirmModal}
			</>
		);
	}

	if (variant === 'inline') {
		return (
			<>
				<form.Subscribe selector={(s) => s.values}>
					{(values) => (
						<div
							className={`modula-settings-editor__inline-field${
								indentLegacy
									? ' modula-settings-editor__inline-field--hierarchy'
									: ''
							}`}
						>
							<div className="modula-settings-editor__inline-field-label-line">
								<SchemaFieldDirtyChrome
									dirty={
										!isSettingsValueAtDefault(
											getByPath(
												values,
												field.groupedPath
											),
											field.schema
										)
									}
									onReset={() => {
										resetSettingsFieldValue(
											form,
											fieldName,
											field.schema,
											field.groupedPath
										);
									}}
								>
									<span className="modula-settings-editor__field-label-with-tip">
										<label
											className="modula-settings-editor__inline-field-label"
											htmlFor={`modula-field-${field.groupedPath}`}
										>
											{label}
										</label>
										<FieldHelpInfoTip
											field={field}
											path={field.groupedPath}
										/>
									</span>
								</SchemaFieldDirtyChrome>
							</div>
							<div className="modula-settings-editor__inline-field-control">
								{controlBlock}
							</div>
						</div>
					)}
				</form.Subscribe>
				{galleryTypeConfirmModal}
			</>
		);
	}

	if (
		(variant === 'default' || variant === 'stacked') &&
		isToggleWithNestedRow
	) {
		return (
			<>
				<div
					className={`modula-settings-editor__field-row${
						variant === 'stacked'
							? ' modula-settings-editor__field-row--stacked'
							: ''
					}${
						rowLocked
							? ' modula-settings-editor__field-row--locked'
							: ''
					}${indentLegacy ? ' modula-settings-editor__field-row--hierarchy' : ''}${
						compactStack
							? ' modula-settings-editor__field-row--compact-stack'
							: ''
					} modula-settings-editor__field-row--toggle modula-settings-editor__field-row--toggle-nested`}
				>
					<SchemaFieldRowToggleWithNestedGrid
						label={label}
						form={form}
						fieldName={fieldName}
						field={field}
						fieldValidators={fieldValidators}
						controlDisabled={controlDisabled}
						makeOnChange={resolveOnChange}
						schemaObj={schemaObj}
						isPro={isPro}
						extensionUpsellBarrier={extensionUpsellBarrier}
						sidebarNestedPanel={field.control.sidebarNestedPanel}
					/>
				</div>
				{galleryTypeConfirmModal}
			</>
		);
	}

	return (
		<form.Subscribe selector={(s) => s.values}>
			{(values) => {
				const disabledByWhen = disabledWhenRule
					? isEditorDisabledWhen(schemaObj, values)
					: false;
				return (
					<>
						<div
							className={`modula-settings-editor__field-row${
								variant === 'stacked'
									? ' modula-settings-editor__field-row--stacked'
									: ''
							}${
								rowLocked
									? ' modula-settings-editor__field-row--locked'
									: ''
							}${
								disabledByWhen
									? ' modula-settings-editor__field-row--disabled-when'
									: ''
							}${indentLegacy ? ' modula-settings-editor__field-row--hierarchy' : ''}${
								compactStack
									? ' modula-settings-editor__field-row--compact-stack'
									: ''
							}${isToggleRow ? ' modula-settings-editor__field-row--toggle' : ''}`}
						>
							<div className="modula-settings-editor__field-label-col">
								<div className="modula-settings-editor__field-label-line">
									<SchemaFieldDirtyChrome
										dirty={
											!isSettingsValueAtDefault(
												getByPath(
													values,
													field.groupedPath
												),
												field.schema
											)
										}
										onReset={() => {
											resetSettingsFieldValue(
												form,
												fieldName,
												field.schema,
												field.groupedPath
											);
										}}
									>
										<span className="modula-settings-editor__field-label-with-tip">
											<label
												className="modula-settings-editor__field-label"
												htmlFor={`modula-field-${field.groupedPath}`}
											>
												{label}
											</label>
											<FieldHelpInfoTip
												field={field}
												path={field.groupedPath}
											/>
										</span>
									</SchemaFieldDirtyChrome>
								</div>
							</div>
							{isToggleRow ? (
								<SchemaFieldRowToggleGrid
									form={form}
									fieldName={fieldName}
									field={field}
									fieldValidators={fieldValidators}
									controlDisabled={
										controlDisabled || disabledByWhen
									}
									makeOnChange={resolveOnChange}
									schemaObj={schemaObj}
									isPro={isPro}
									extensionUpsellBarrier={
										extensionUpsellBarrier
									}
								/>
							) : (
								<div className="modula-settings-editor__field-control-col">
									{renderControlBlock(disabledByWhen)}
								</div>
							)}
						</div>
						{galleryTypeConfirmModal}
					</>
				);
			}}
		</form.Subscribe>
	);
}
