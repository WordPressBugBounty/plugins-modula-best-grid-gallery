import { useCallback, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useModulaAiGenerateAltMutation } from '../query/useModulaAiGenerateAltMutation';
import { captionToPlainString } from '../utils/captionToPlainString';
import { getModulaAiSettingsAdminUrl } from '../utils/galleryAdminUrls';

/** @typedef {'title'|'alt'|'caption'} ImageMetadataAiField */
/** @typedef {'title'|'alt'|'caption'|'all'} ImageMetadataAiTarget */

export const IMAGE_METADATA_AI_FIELDS = /** @type {const} */ ([
	'title',
	'alt',
	'caption',
]);

/**
 * @param {ImageMetadataAiField} field
 * @return {'title'|'alt'|'description'}
 */
export function imageMetadataAiFormKey(field) {
	return field === 'caption' ? 'description' : field;
}

/**
 * @param {Record<string, unknown>} values
 * @param {ImageMetadataAiField} field
 */
export function isImageMetadataAiFieldEmpty(values, field) {
	const key = imageMetadataAiFormKey(field);
	const raw = values[key];
	if (field === 'caption') {
		return !captionToPlainString(raw).trim();
	}
	return !String(raw ?? '').trim();
}

/**
 * @param {unknown} data
 */
function normalizeAiDescriptorResult(data) {
	if (!data || data.failed) {
		return null;
	}
	return {
		title: captionToPlainString(data.title) || '',
		alt: data.altText || '',
		caption: captionToPlainString(data.caption) || '',
	};
}

/**
 * @param {ImageMetadataAiField} field
 * @param {{ title: string, alt: string, caption: string }} result
 */
function aiValueForField(field, result) {
	if (field === 'title') {
		return result.title;
	}
	if (field === 'alt') {
		return result.alt;
	}
	return result.caption;
}

/**
 * @param {Object}                                                          options
 * @param {number}                                                          options.attachmentId
 * @param {boolean}                                                         options.aiConfigured
 * @param {import('@tanstack/react-form').ReactFormExtendedApi<any>}        options.form
 * @param {Record<string, unknown>}                                         [options.editorConfig]
 */
export function useImageMetadataAiGeneration({
	attachmentId,
	aiConfigured,
	form,
	editorConfig,
}) {
	const mutation = useModulaAiGenerateAltMutation();
	const [aiStatus, setAiStatus] = useState(/** @type {'idle'|'success'|'error'} */ ('idle'));
	const [aiSuggestedFields, setAiSuggestedFields] = useState(
		/** @type {Set<string>} */ (new Set())
	);

	useEffect(() => {
		setAiStatus('idle');
		setAiSuggestedFields(new Set());
	}, [attachmentId]);

	const redirectToAiSettings = useCallback(() => {
		const url =
			getModulaAiSettingsAdminUrl(editorConfig) ||
			window.modulaHelper?.settings_url ||
			'/wp-admin/';
		window.location.href = url;
	}, [editorConfig]);

	const applyPatch = useCallback(
		(/** @type {Record<string, string>} */ patch) => {
			const prev = form.state.values;
			form.reset({ ...prev, ...patch });
			setAiSuggestedFields((prevSet) => {
				const next = new Set(prevSet);
				Object.keys(patch).forEach((key) => next.add(key));
				return next;
			});
			setAiStatus('success');
		},
		[form]
	);

	const runGenerate = useCallback(
		async (/** @type {ImageMetadataAiTarget} */ target) => {
			if (!aiConfigured) {
				redirectToAiSettings();
				return;
			}
			if (!attachmentId) {
				return;
			}

			setAiStatus('idle');

			try {
				const result = normalizeAiDescriptorResult(
					await mutation.mutateAsync(attachmentId)
				);
				if (!result) {
					setAiStatus('error');
					return;
				}

				const values = form.state.values;

				if (target === 'all') {
					const emptyFields = IMAGE_METADATA_AI_FIELDS.filter((field) =>
						isImageMetadataAiFieldEmpty(values, field)
					);

					if (emptyFields.length === 0) {
						// eslint-disable-next-line no-alert
						const ok = window.confirm(
							__(
								'This will replace existing title, alt text and caption. Continue?',
								'modula-best-grid-gallery'
							)
						);
						if (!ok) {
							return;
						}
					}

					/** @type {Record<string, string>} */
					const patch = {};
					const fieldsToApply =
						emptyFields.length === 0
							? IMAGE_METADATA_AI_FIELDS
							: emptyFields;

					for (const field of fieldsToApply) {
						const nextValue = aiValueForField(field, result);
						if (!nextValue) {
							continue;
						}
						patch[imageMetadataAiFormKey(field)] = nextValue;
					}

					if (!Object.keys(patch).length) {
						setAiStatus('error');
						return;
					}

					applyPatch(patch);
					return;
				}

				const nextValue = aiValueForField(target, result);
				if (!nextValue) {
					setAiStatus('error');
					return;
				}

				applyPatch({
					[imageMetadataAiFormKey(target)]: nextValue,
				});
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error(e);
				setAiStatus('error');
			}
		},
		[
			aiConfigured,
			attachmentId,
			mutation,
			form,
			applyPatch,
			redirectToAiSettings,
		]
	);

	return {
		aiBusy: mutation.isPending,
		aiStatus,
		aiSuggestedFields,
		generateAllMetadata: () => runGenerate('all'),
		generateField: (/** @type {ImageMetadataAiField} */ field) =>
			runGenerate(field),
		redirectToAiSettings,
	};
}
