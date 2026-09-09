/**
 * V2 hub control only — no duplicate labels or descriptions.
 */
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { validateFieldValue } from '../../logic/validateFieldValue';
import { useGalleryTypeChangeConfirm } from '../../hooks/useGalleryTypeChangeConfirm';
import { useGalleryTypeChangeContext } from '../../context/GalleryTypeChangeContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import FieldControl from '../field/FieldControl';
import EditorUpsellBlurb from '../upsell/EditorUpsellBlurb';
import GalleryTypeChangeConfirmModal from '../modals/GalleryTypeChangeConfirmModal';
import { applyGroupedFieldWrite } from '../../logic/groupedFieldWrite';
import {
	getLightboxUpsellExtensionSlugs,
	resolveExtensionUpsellBarrier,
	resolveOmitControlInLite,
	shouldHideFieldForPanelUpsell,
} from '../../logic/proGateLock';

/**
 * @param {Object}  props
 * @param {string}  props.groupKey
 * @param {Object}  props.field
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.showUpsell] Show schema upsell blurb under control.
 */
export default function HubV2FieldControl({
	groupKey,
	field,
	disabled = false,
	showUpsell = true,
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
	const disabledByLiteSchema =
		!isPro && schemaObj && schemaObj.editorDisabledInLite === true;
	const omitControlInLite = resolveOmitControlInLite(schemaObj, editor);
	const controlDisabled =
		disabled || disabledByLiteSchema || omitControlInLite;

	const fieldValidators = {
		onChange: ({ value: v }) => {
			const r = validateFieldValue(field, v);
			return r.valid ? undefined : r.message;
		},
	};

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

	return (
		<>
			<form.Field name={fieldName} validators={fieldValidators}>
				{(fieldApi) => (
					<>
						{omitControlInLite ? (
							<EditorUpsellBlurb field={field} />
						) : (
							<>
								<div id={`modula-field-${field.groupedPath}`}>
									<FieldControl
										field={field}
										value={fieldApi.state.value}
										onChange={resolveOnChange(fieldApi)}
										disabled={controlDisabled}
									/>
								</div>
								{showUpsell ? (
									<EditorUpsellBlurb field={field} />
								) : null}
							</>
						)}
						{fieldApi.state.meta.isTouched &&
						fieldApi.state.meta.errors?.length > 0 ? (
							<p
								className="modula-settings-editor__field-error"
								role="alert"
							>
								{fieldApi.state.meta.errors[0]}
							</p>
						) : null}
					</>
				)}
			</form.Field>
			{galleryTypeConfirmModal}
		</>
	);
}
