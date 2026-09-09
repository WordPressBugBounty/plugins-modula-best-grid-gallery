/**
 * Select auxiliary using the reorder “catalog” shell (image thumbnails + shared head).
 * Path distinct from {@link SelectListAuxiliaryPanel}.
 */
import { __ } from '@wordpress/i18n';
import { resolveModulaPluginAssetUrl } from '../../utils/resolveModulaPluginAssetUrl';
import AuxiliaryPanelHeadWithClose from './AuxiliaryPanelHeadWithClose';
import { FieldValidationError, getSelectOptionLabel } from './shared';

/** @param {Record<string, unknown>} props */
export default function SelectCatalogAuxiliaryPanel({
	form,
	fieldName,
	fieldValidators,
	label,
	editorDescription,
	options,
	optionLabels,
	optionImages,
	disabledByLiteSchema,
	onClosePanel,
	sectionTitle = __(
		'Select license type',
		'modula-best-grid-gallery'
	),
}) {
	return (
		<div
			className="modula-gallery-takeover__reorder-panel"
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
					<div className="modula-gallery-takeover__reorder-body modula-gallery-takeover__reorder-body--setup">
						<section className="modula-gallery-takeover__reorder-setup-block">
							<h3 className="modula-gallery-takeover__reorder-setup-title">
								{sectionTitle}
							</h3>
							<ul
								className="modula-gallery-takeover__reorder-setup-sort-list"
								aria-label={label}
							>
								{options.map((opt) => {
									const key = String(opt);
									const optLabel = getSelectOptionLabel(
										optionLabels,
										opt
									);
									const rawImg = optionImages[key];
									const thumbSrc =
										typeof rawImg === 'string' &&
										rawImg !== ''
											? resolveModulaPluginAssetUrl(rawImg)
											: '';
									const isSel =
										String(fieldApi.state.value ?? '') ===
										key;
									return (
										<li key={key}>
											<button
												type="button"
												className={`modula-gallery-takeover__reorder-license-btn${
													isSel ? ' is-selected' : ''
												}`}
												disabled={disabledByLiteSchema}
												onClick={() =>
													fieldApi.handleChange(key)
												}
											>
												{thumbSrc ? (
													<img
														className="modula-gallery-takeover__reorder-license-btn__thumb"
														src={thumbSrc}
														alt=""
														decoding="async"
														loading="lazy"
													/>
												) : null}
												<span className="modula-gallery-takeover__reorder-license-btn__label">
													{optLabel}
												</span>
											</button>
										</li>
									);
								})}
							</ul>
						</section>
						<FieldValidationError fieldApi={fieldApi} />
					</div>
				)}
			</form.Field>
		</div>
	);
}
