/**
 * Middle-column auxiliary UI for a single form field.
 * Routes by control kind; select splits into catalog vs list paths (no mixed ternaries).
 */
import { __ } from '@wordpress/i18n';
import '../../styles/takeover/preview/_aux-form-field.scss';
import { getEnrichedFieldByGroupedPath } from '../../data/formSchema';
import { isFieldVisible } from '../../logic/fieldVisibility';
import { humanizeKey } from '../../logic/humanizeKey';
import { validateFieldValue } from '../../logic/validateFieldValue';
import {
	getLightboxUpsellExtensionSlugs,
	resolveExtensionUpsellBarrier,
} from '../../logic/proGateLock';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import EditorUpsellBlurb from '../upsell/EditorUpsellBlurb';
import { useTakeoverAuxiliaryPanel } from '../../context/TakeoverAuxiliaryPanelContext';
import SelectCatalogAuxiliaryPanel from './SelectCatalogAuxiliaryPanel';
import SelectListAuxiliaryPanel from './SelectListAuxiliaryPanel';
import { normalizeOptionImages, UnsupportedAuxiliaryFallback } from './shared';

/**
 * @param {{ groupedPath: string }} props
 */
export default function FormFieldAuxiliaryPanel({ groupedPath }) {
	const { form } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();
	const { closePanel } = useTakeoverAuxiliaryPanel();
	const isPro = Boolean(editor.isPro);

	const hit = getEnrichedFieldByGroupedPath(groupedPath);
	if (!hit) {
		return (
			<div
				className="modula-gallery-takeover__aux-form-field modula-gallery-takeover__aux-form-field--error"
				role="region"
				aria-label={__('Field settings', 'modula-best-grid-gallery')}
			>
				<p className="modula-gallery-takeover__aux-form-field-error">
					{__(
						'This setting could not be loaded. Use the sidebar control instead.',
						'modula-best-grid-gallery'
					)}
				</p>
			</div>
		);
	}

	const { groupId, field } = hit;
	const fieldName = `${groupId}.${field.groupedKey}`;
	const label =
		typeof field.editorLabel === 'string' && field.editorLabel !== ''
			? field.editorLabel
			: humanizeKey(field.groupedKey);
	const editorDescription =
		typeof field.editorDescription === 'string' &&
		field.editorDescription !== ''
			? field.editorDescription
			: '';
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
	const omitControlInLite =
		schemaObj &&
		schemaObj.editorOmitControlInLite === true &&
		(!isPro || (isPro && extensionUpsellBarrier.blocked));

	const fieldValidators = {
		onChange: ({ value: v }) => {
			const r = validateFieldValue(field, v);
			return r.valid ? undefined : r.message;
		},
	};
	return (
		<form.Subscribe selector={(s) => s.values}>
			{(values) => {
				const visible = isFieldVisible(field, values);
				if (!visible) {
					return (
						<div
							className="modula-gallery-takeover__aux-form-field modula-gallery-takeover__aux-form-field--error"
							role="region"
							aria-label={label}
						>
							<p className="modula-gallery-takeover__aux-form-field-error">
								{__(
									'This setting is hidden for the current gallery options. Change gallery type or rules, or use the sidebar.',
									'modula-best-grid-gallery'
								)}
							</p>
							<p className="modula-gallery-takeover__aux-form-field-fallback">
								<a href={`#modula-field-${field.groupedPath}`}>
									{__(
										'Jump to this field in the sidebar',
										'modula-best-grid-gallery'
									)}
								</a>
							</p>
						</div>
					);
				}

				if (omitControlInLite) {
					return (
						<div
							className="modula-gallery-takeover__aux-form-field"
							role="region"
							aria-label={label}
						>
							<header className="modula-gallery-takeover__aux-form-field-head">
								<h2 className="modula-gallery-takeover__aux-form-field-title">
									{label}
								</h2>
							</header>
							<div className="modula-gallery-takeover__aux-form-field-body">
								<form.Field name={fieldName}>
									{() => <EditorUpsellBlurb field={field} />}
								</form.Field>
							</div>
						</div>
					);
				}

				const kind = field.control?.kind;

				if (kind === 'select') {
					const options = field.control?.options;
					const optionLabels = field.control?.optionLabels || {};
					const optionImages = normalizeOptionImages(
						field.control?.optionImages
					);
					if (!Array.isArray(options) || options.length === 0) {
						return (
							<UnsupportedAuxiliaryFallback
								label={label}
								groupedPath={field.groupedPath}
							/>
						);
					}
					const selectProps = {
						form,
						fieldName,
						fieldValidators,
						label,
						editorDescription,
						options,
						optionLabels,
						disabledByLiteSchema,
					};
					if (optionImages) {
						return (
							<SelectCatalogAuxiliaryPanel
								{...selectProps}
								optionImages={optionImages}
								onClosePanel={closePanel}
							/>
						);
					}
					return (
						<SelectListAuxiliaryPanel
							{...selectProps}
							onClosePanel={closePanel}
						/>
					);
				}

				return (
					<UnsupportedAuxiliaryFallback
						label={label}
						groupedPath={field.groupedPath}
					/>
				);
			}}
		</form.Subscribe>
	);
}
