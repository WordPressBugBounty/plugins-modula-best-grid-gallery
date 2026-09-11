/**
 * Gallery editor post document — status + slug field contract shared with listing Quick edit.
 *
 * CPT REST fields: `{ title?, status?, slug? }` with status limited to
 * `publish` | `draft` | `private`.
 */

/** @type {readonly ['publish', 'draft', 'private']} */
export const EDITOR_DOCUMENT_STATUSES = Object.freeze([
	'publish',
	'draft',
	'private',
]);

/**
 * @param {unknown} status
 * @return {status is 'publish'|'draft'|'private'}
 */
export function isAllowedEditorDocumentStatus(status) {
	return (
		typeof status === 'string' &&
		EDITOR_DOCUMENT_STATUSES.includes(
			/** @type {'publish'|'draft'|'private'} */ (status)
		)
	);
}

/**
 * Restrict bootstrap / config status choices to the editor document allowlist.
 *
 * @param {Array<{ value?: string, label?: string }>|null|undefined} choices
 * @return {Array<{ value: string, label: string }>}
 */
export function filterEditorDocumentStatusChoices(choices) {
	if (!Array.isArray(choices)) {
		return [];
	}
	const out = [];
	for (const row of choices) {
		const value = typeof row?.value === 'string' ? row.value : '';
		if (!isAllowedEditorDocumentStatus(value)) {
			continue;
		}
		const label =
			typeof row?.label === 'string' && row.label !== ''
				? row.label
				: value;
		out.push({ value, label });
	}
	return out;
}

/**
 * Build a partial CPT REST body for editor document writes.
 *
 * @param {{ title?: string, status?: string, slug?: string }} patch
 * @return {{ title?: string, status?: string, slug?: string }}
 */
export function buildGalleryPostDocumentPatch(patch) {
	/** @type {{ title?: string, status?: string, slug?: string }} */
	const data = {};

	if (typeof patch?.title === 'string') {
		data.title = patch.title;
	}
	if (typeof patch?.status === 'string') {
		if (!isAllowedEditorDocumentStatus(patch.status)) {
			throw new Error(
				`Editor document status must be one of: ${EDITOR_DOCUMENT_STATUSES.join(
					', '
				)}.`
			);
		}
		data.status = patch.status;
	}
	if (typeof patch?.slug === 'string') {
		data.slug = patch.slug;
	}

	if (Object.keys(data).length === 0) {
		throw new Error('Editor document patch is empty.');
	}

	return data;
}

/**
 * Seed editor permalink chrome from settings-editor bootstrap config.
 *
 * @param {{
 *   postSlug?: string,
 *   permalinkPrefix?: string,
 *   permalinkSuffix?: string,
 *   viewUrl?: string,
 * }|null|undefined} config
 * @return {{ slug: string, permalinkPrefix: string, permalinkSuffix: string, viewUrl: string }}
 */
export function editorConfigToPermalinkSeed(config) {
	return {
		slug: typeof config?.postSlug === 'string' ? config.postSlug : '',
		permalinkPrefix:
			typeof config?.permalinkPrefix === 'string'
				? config.permalinkPrefix
				: '',
		permalinkSuffix:
			typeof config?.permalinkSuffix === 'string'
				? config.permalinkSuffix
				: '',
		viewUrl: typeof config?.viewUrl === 'string' ? config.viewUrl : '',
	};
}
