/**
 * Toggle field: row 1 = switch; row 2 = full-width upsell / validation (sidebar grid).
 */

import FieldControl from '../field/FieldControl';
import EditorUpsellBlurb from '../upsell/EditorUpsellBlurb';

/**
 * @param {Object}                              props
 * @param {Object}                              props.form                   TanStack Form from settings bundle.
 * @param {string}                              props.fieldName              Dotted field name (group.key).
 * @param {Object}                              props.field                  Form schema field descriptor.
 * @param {Object}                              props.fieldValidators        TanStack Field validators object.
 * @param {boolean}                             props.controlDisabled
 * @param {function(object): function(*): void} props.makeOnChange           (fieldApi) => onChange
 * @param {Object|null}                         props.schemaObj              field.schema when object
 * @param {boolean}                             props.isPro
 * @param {{ blocked: boolean }}                props.extensionUpsellBarrier
 */
export default function SchemaFieldRowToggleGrid({
	form,
	fieldName,
	field,
	fieldValidators,
	controlDisabled,
	makeOnChange,
	schemaObj,
	isPro,
	extensionUpsellBarrier,
}) {
	return (
		<form.Field name={fieldName} validators={fieldValidators}>
			{(fieldApi) => {
				const err =
					fieldApi.state.meta.isTouched &&
					fieldApi.state.meta.errors?.length > 0
						? fieldApi.state.meta.errors[0]
						: null;
				const showFoot =
					Boolean(err) ||
					(schemaObj &&
						schemaObj.editorLightboxLiteUpsell &&
						(!isPro || extensionUpsellBarrier.blocked));
				return (
					<div className="modula-settings-editor__field-toggle-grid-bridge">
						<div className="modula-settings-editor__field-control-col modula-settings-editor__field-control-col--toggle-inline">
							<div id={`modula-field-${field.groupedPath}`}>
								<FieldControl
									field={field}
									value={fieldApi.state.value}
									onChange={makeOnChange(fieldApi)}
									disabled={controlDisabled}
								/>
							</div>
						</div>
						{showFoot ? (
							<div className="modula-settings-editor__field-toggle-foot">
								<EditorUpsellBlurb field={field} />
								{err ? (
									<p
										className="modula-settings-editor__field-error"
										role="alert"
									>
										{err}
									</p>
								) : null}
							</div>
						) : null}
					</div>
				);
			}}
		</form.Field>
	);
}
