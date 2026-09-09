/**
 * Plain select auxiliary: list body + shared head with close (same chrome as catalog/reorder).
 */
import AuxiliaryPanelHeadWithClose from './AuxiliaryPanelHeadWithClose';
import { FieldValidationError, getSelectOptionLabel } from './shared';

/** @param {Record<string, unknown>} props */
export default function SelectListAuxiliaryPanel({
	form,
	fieldName,
	fieldValidators,
	label,
	editorDescription,
	options,
	optionLabels,
	disabledByLiteSchema,
	onClosePanel,
}) {
	return (
		<div
			className="modula-gallery-takeover__aux-form-field"
			role="region"
			aria-label={label}
		>
			<AuxiliaryPanelHeadWithClose
				title={label}
				description={editorDescription || undefined}
				onClose={onClosePanel}
			/>
			<form.Field name={fieldName} validators={fieldValidators}>
				{(fieldApi) => (
					<div className="modula-gallery-takeover__aux-form-field-body">
						<ul
							className="modula-gallery-takeover__aux-form-field-list"
							aria-label={label}
						>
							{options.map((opt) => {
								const key = String(opt);
								const optLabel = getSelectOptionLabel(
									optionLabels,
									opt
								);
								const isSel =
									String(fieldApi.state.value ?? '') === key;
								return (
									<li key={key}>
										<button
											type="button"
											className={`modula-gallery-takeover__aux-form-field-option${
												isSel ? ' is-selected' : ''
											}`}
											disabled={disabledByLiteSchema}
											onClick={() =>
												fieldApi.handleChange(key)
											}
										>
											<span className="modula-gallery-takeover__aux-form-field-option-label">
												{optLabel}
											</span>
										</button>
									</li>
								);
							})}
						</ul>
						<FieldValidationError fieldApi={fieldApi} />
					</div>
				)}
			</form.Field>
		</div>
	);
}
