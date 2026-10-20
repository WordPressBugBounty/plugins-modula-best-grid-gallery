import { __ } from '@wordpress/i18n';
import { fieldLabel } from '../model/settingsPageModel';
import { decodedText } from './serverText';

// The importer's field names (`Modula_Importer::add_importer_tab()`).
const SOURCE_FIELD = 'gallery_source';
const GALLERIES_FIELD = 'galleries_to_import';
const DELETE_FIELD = 'gallery_delete_source';
const GALLERIES_TYPE = 'checkbox_group';
const ERROR_TYPE = 'paragraph';

// The image chunk size `Modula_Ajax_Migrator::ajax_import_images()` uses.
const CHUNK_SIZE = 5;

// Chunks asked for one gallery before it fails (10,000 images), in case a
// migrator never reports the end of its images.
const MAX_CHUNKS = 2000;

/**
 * The source a field belongs to: the importer shows each source's fields
 * under the condition "gallery source is <slug>".
 *
 * @param {Object} field Config field.
 * @return {string|null} Source slug, or null for a field of every source.
 */
function sourceOfField(field) {
	const condition = (field.conditions ?? []).find(
		(item) => SOURCE_FIELD === item.field && '===' === item.comparison
	);

	return condition ? String(condition.value) : null;
}

/**
 * @param {Object} option Importer gallery option `{ label, value, imported }`.
 * @return {{ value: string, label: string, imported: boolean }} Gallery.
 */
function galleryOption(option) {
	return {
		value: String(option.value),
		label: decodedText(option.label),
		imported: true === option.imported,
	};
}

/**
 * One source with its galleries, the importer's reason when it could not
 * list them, the nonce its import calls carry, and whether it records the
 * galleries it imported.
 *
 * @param {Object}   option Source option `{ label, value }`.
 * @param {Object[]} fields Config fields.
 * @return {Object|null} Source, or null without a gallery list and nonce.
 */
function sourceOption(option, fields) {
	const slug = String(option.value);
	const sourceFields = fields.filter(
		(field) => slug === sourceOfField(field)
	);
	const list = sourceFields.find((field) => GALLERIES_TYPE === field.type);
	const hasList =
		undefined !== list &&
		Array.isArray(list.options) &&
		'string' === typeof list.nonce &&
		'' !== list.nonce;
	if (!hasList) {
		return null;
	}
	const error = sourceFields.find((field) => ERROR_TYPE === field.type);

	return {
		value: slug,
		label: decodedText(option.label),
		galleries: list.options.map(galleryOption),
		error: error ? decodedText(error.value) : null,
		nonce: list.nonce,
		recordsImported: true === list.records_imported,
	};
}

/**
 * The Migrate card's form from the importer's subtab config: each source
 * (the select's placeholder left out) with its galleries, the default of
 * "Delete source galleries after import", and the rows' labels.
 *
 * @param {{ fields?: Object[] }} config Card config.
 * @return {{ sources: Object[], deleteSource: boolean, labels: Object }|null} The form, or
 *         null when the config is not the importer's (no source select, or
 *         a source without its gallery list); the card then shows as
 *         unavailable.
 */
export function migrateForm(config) {
	const { fields = [] } = config;
	const select = fields.find(
		(field) => SOURCE_FIELD === field.name && 'select' === field.type
	);
	if (!select || !Array.isArray(select.options)) {
		return null;
	}

	const sources = select.options
		.filter((option) => '' !== String(option.value ?? ''))
		.map((option) => sourceOption(option, fields));
	if (sources.includes(null)) {
		return null;
	}
	const deleteField = fields.find((field) => DELETE_FIELD === field.name);

	return {
		sources,
		deleteSource: true === deleteField?.default,
		labels: {
			source: fieldLabel(config, SOURCE_FIELD),
			galleries: fieldLabel(config, GALLERIES_FIELD),
			deleteSource: fieldLabel(config, DELETE_FIELD),
		},
	};
}

/**
 * @typedef {Object} ImportJob
 * @property {string}   source          Source slug.
 * @property {string}   nonce           The importer's nonce.
 * @property {boolean}  recordsImported The source records its imported galleries.
 * @property {boolean}  deleteSource    Delete the source galleries after import.
 * @property {Object[]} galleries       Galleries to import `{ value, label }`.
 */

/**
 * The importer gave no usable answer: the request failed, admin-ajax
 * answered `-1` or `0` (the nonce check or the action failed), or the
 * images never ended.
 */
class ImportRequestError extends Error {}

/**
 * One admin-ajax call whose answer must be a JSON object.
 *
 * @param {Function} call admin-ajax call.
 * @param {Object}   data Request data.
 * @return {Promise<Object>} The answer.
 * @throws {ImportRequestError} When the request fails or the answer is not an object.
 */
async function importerCall(call, data) {
	let response;
	try {
		response = await call(data);
	} catch (error) {
		throw new ImportRequestError(error?.message, { cause: error });
	}
	if (null === response || 'object' !== typeof response) {
		throw new ImportRequestError(String(response));
	}

	return response;
}

/**
 * The attachments of one source gallery, chunk by chunk, until the
 * migrator reports the end of its images.
 *
 * @param {ImportJob} job
 * @param {Object}    item Gallery `{ value, label }`.
 * @param {Function}  call admin-ajax call.
 * @return {Promise<Object[]>} Attachments.
 * @throws {ImportRequestError} When a chunk fails or the images never end.
 */
async function galleryAttachments(job, item, call) {
	let attachments = [];
	for (let chunk = 0; chunk < MAX_CHUNKS * CHUNK_SIZE; chunk += CHUNK_SIZE) {
		const response = await importerCall(call, {
			action: 'modula_ajax_import_images',
			id: item.value,
			nonce: job.nonce,
			chunk,
			source: job.source,
		});
		attachments = attachments.concat(response.attachments ?? []);
		if (response.end_of_array) {
			return attachments;
		}
	}

	throw new ImportRequestError('The images never ended.');
}

/**
 * Imports one gallery: its attachments, then the source's import action.
 *
 * @param {ImportJob} job
 * @param {Object}    item Gallery `{ value, label }`.
 * @param {Function}  call admin-ajax call.
 * @return {Promise<{ success: boolean, message: string, modulaId: * }>}
 *         The result, with the new Modula gallery's id.
 */
async function importGallery(job, item, call) {
	const attachments = await galleryAttachments(job, item, call);
	const response = await importerCall(call, {
		action: `modula_importer_${job.source}_gallery_import`,
		id: item.value,
		nonce: job.nonce,
		clean: cleanValue(job),
		gallery_title: item.label,
		attachments,
		source: job.source,
	});
	const success = true === response.success;

	return {
		success,
		// A success message is the importer's check icon; the card shows
		// its own "Imported" state instead.
		message: success
			? ''
			: decodedText(response.message) ||
				__('The gallery was not imported.', 'modula-best-grid-gallery'),
		modulaId: response.modula_gallery_id,
	};
}

/**
 * Imports one gallery, turning a failed request into that gallery's
 * failure so the next gallery still imports.
 *
 * @param {ImportJob} job
 * @param {Object}    item Gallery `{ value, label }`.
 * @param {Function}  call admin-ajax call.
 * @return {Promise<{ success: boolean, message: string, modulaId: * }>}
 *         The result.
 */
async function importGalleryOrFail(job, item, call) {
	try {
		return await importGallery(job, item, call);
	} catch (error) {
		if (!(error instanceof ImportRequestError)) {
			throw error;
		}

		return {
			success: false,
			message: __(
				'The import request failed. Reload the page and try again.',
				'modula-best-grid-gallery'
			),
			modulaId: null,
		};
	}
}

/**
 * The migrators delete their galleries only for `clean=delete`.
 *
 * @param {ImportJob} job
 * @return {'delete'|'keep'} The `clean` value.
 */
function cleanValue(job) {
	return job.deleteSource ? 'delete' : 'keep';
}

/**
 * The source's request to record which galleries it imported, as source
 * gallery id => Modula gallery id, so it lists them as imported.
 *
 * @param {ImportJob}         job
 * @param {Object<string, *>} modulaIds Modula gallery id by source gallery.
 * @return {Object} Request data.
 */
function recordRequest(job, modulaIds) {
	const galleries = Object.fromEntries(
		Object.entries(modulaIds).map(([value, id]) => [
			`galleries[${value}]`,
			id,
		])
	);

	return {
		action: `modula_importer_${job.source}_gallery_imported_update`,
		nonce: job.nonce,
		clean: cleanValue(job),
		source: job.source,
		...galleries,
	};
}

/**
 * Imports the chosen galleries one after another, as the importer expects,
 * then records the imported ones with a source that keeps a record.
 *
 * A failed gallery does not stop the run. A failed record rejects, after
 * every gallery has been reported.
 *
 * @param {ImportJob} job
 * @param {Object}    deps
 * @param {Function}  deps.call       admin-ajax call resolving to the JSON answer.
 * @param {Function}  deps.record     admin-ajax call for the record; the
 *                                    migrators answer with a URL, not JSON.
 * @param {Function}  [deps.onResult] Gets `(value, result)` as each gallery finishes.
 * @return {Promise<Object<string, { success: boolean, message: string }>>}
 *         Result by gallery value.
 */
export async function runImport(job, { call, record, onResult = () => {} }) {
	const results = {};
	const modulaIds = {};
	for (const item of job.galleries) {
		const { modulaId, ...result } = await importGalleryOrFail(
			job,
			item,
			call
		);
		results[item.value] = result;
		onResult(item.value, result);
		if (result.success) {
			modulaIds[item.value] = modulaId;
		}
	}

	if (job.recordsImported && 0 < Object.keys(modulaIds).length) {
		await record(recordRequest(job, modulaIds));
	}

	return results;
}
