/**
 * Modula Settings page model: which section an address opens, what search
 * finds, and what Save sends. Pure functions.
 *
 * Pending edits are kept by option name, each holding the option's whole
 * value, because the save route replaces the stored option.
 */
import { decodedText } from '../cards/serverText';

/**
 * Legacy `?tab=` values (the old main tabs) by the section that replaced them.
 */
const LEGACY_TAB_SECTIONS = {
	display: 'galleries',
	optimization: 'performance',
	protection: 'protection',
	social_media: 'connections',
	ai: 'ai',
	diagnostics: 'diagnostics',
	migrate: 'migrate',
	image_proofing: 'email',
};

/**
 * Config field types that show text or run an action rather than hold a
 * setting; their labels ("INFO", "Status") are not setting names.
 */
const DISPLAY_FIELD_TYPES = ['paragraph', 'button'];

/**
 * Most search results shown at once, so the list stays readable in the nav.
 */
const SEARCH_RESULT_LIMIT = 12;

/**
 * @param {Object} field Config field.
 * @return {boolean} Whether the field holds a setting with a name to find.
 */
function isNamedSetting(field) {
	return (
		!DISPLAY_FIELD_TYPES.includes(field.type) &&
		'string' === typeof field.label
	);
}

/**
 * Labels of the settings among config fields, sub-fields included.
 *
 * @param {Object[]|undefined|null} fields Config fields.
 * @return {string[]} Labels, in display order.
 */
function settingLabels(fields) {
	if (!Array.isArray(fields)) {
		return [];
	}

	return fields.flatMap((field) => [
		...(isNamedSetting(field) ? [field.label] : []),
		...settingLabels(field.fields),
	]);
}

/**
 * Names a section can be found by: its own, its cards' and their settings'
 * labels, as plain text, each once ignoring case (the role matrix repeats
 * every capability per role).
 *
 * @param {Object} section Projected settings section.
 * @return {Map<string, string>} Name by its lowercase key, in display order.
 */
function sectionNames(section) {
	const names = new Map();
	[
		section.label,
		...section.cards.flatMap((card) => [
			card.label,
			...settingLabels(card.config?.fields),
		]),
	]
		.map(decodedText)
		.filter((name) => '' !== name.trim())
		.forEach((name) => {
			const key = name.toLowerCase();
			if (!names.has(key)) {
				names.set(key, name);
			}
		});

	return names;
}

/**
 * Search entries for the projected settings: each section, card and
 * setting by its name, with the path of the section that holds it.
 *
 * @param {Object[]} groups Projected settings groups → sections → cards.
 * @return {Object[]} Entries `{ id, label, sectionId, path }`, in display order.
 */
export function buildSearchIndex(groups) {
	return groups.flatMap((group) =>
		group.sections.flatMap((section) => {
			const path = `${decodedText(group.label)} / ${decodedText(
				section.label
			)}`;

			return [...sectionNames(section)].map(([key, label]) => ({
				id: `${section.id}:${key}`,
				label,
				sectionId: section.id,
				path,
			}));
		})
	);
}

/**
 * Entries whose name contains the query, ignoring case: the first
 * SEARCH_RESULT_LIMIT in display order.
 *
 * @param {Object[]} index Entries from buildSearchIndex().
 * @param {string}   query What the site admin typed.
 * @return {Object[]|null} Matching entries; null for a blank query, which is no search.
 */
export function searchSettings(index, query) {
	const needle = query.trim().toLowerCase();
	if ('' === needle) {
		return null;
	}

	return index
		.filter((entry) => entry.label.toLowerCase().includes(needle))
		.slice(0, SEARCH_RESULT_LIMIT);
}

/**
 * Section an address opens: `?section=` when it exists, else the section a
 * legacy `?tab=` maps to when that exists, else the first section.
 *
 * @param {{ section?: string|null, tab?: string|null }} address
 * @param {string[]}                                     sectionIds In display order.
 * @return {string|null} Section id, or null when there are no sections.
 */
export function resolveSectionId({ section, tab }, sectionIds) {
	if (0 === sectionIds.length) {
		return null;
	}
	if (sectionIds.includes(section)) {
		return section;
	}

	const aliased = Object.hasOwn(LEGACY_TAB_SECTIONS, tab)
		? LEGACY_TAB_SECTIONS[tab]
		: null;

	return sectionIds.includes(aliased) ? aliased : sectionIds[0];
}

function isPlainObject(value) {
	return null !== value && 'object' === typeof value && !Array.isArray(value);
}

/**
 * Deep merge for option values: objects merge key by key, anything else
 * (scalars, lists) is replaced by the newer value.
 *
 * @param {*} base
 * @param {*} update
 * @return {*} Merged copy; neither argument is changed.
 */
function mergeValue(base, update) {
	if (!isPlainObject(base) || !isPlainObject(update)) {
		return structuredClone(update);
	}

	const merged = structuredClone(base);
	Object.entries(update).forEach(([key, value]) => {
		merged[key] = mergeValue(merged[key], value);
	});

	return merged;
}

/**
 * Records an edit: `value` is what a card now holds for the whole option.
 * A second card writing the same option adds its keys instead of dropping
 * the first card's.
 *
 * @param {Object} pending Pending edits by option.
 * @param {string} option  Option name.
 * @param {*}      value   The card's whole value for that option.
 * @return {Object} New pending edits.
 */
export function addPendingEdit(pending, option, value) {
	return {
		...pending,
		[option]: Object.hasOwn(pending, option)
			? mergeValue(pending[option], value)
			: structuredClone(value),
	};
}

/**
 * @param {Object} pending Pending edits by option.
 * @return {boolean} Whether there is anything to save.
 */
export function hasPendingEdits(pending) {
	return Object.keys(pending).length > 0;
}

/**
 * Body of the general-settings POST: every changed option, whole.
 *
 * @param {Object} pending Pending edits by option.
 * @return {Object} Option values by option name.
 */
export function buildSavePayload(pending) {
	return structuredClone(pending);
}

/**
 * The whole option after one field changes: its stored value, the pending
 * edits already made to it, then the new field value.
 *
 * @param {Object} stored  The option's stored value.
 * @param {Object} pending Pending edits by option.
 * @param {string} option  Option name.
 * @param {string} field   Field path inside the option; dots nest (`gallery.slug`).
 * @param {*}      value   New field value.
 * @return {Object} Whole option value to record.
 */
export function editedOption(stored, pending, option, field, value) {
	const edited = withPendingValues({ [option]: stored }, pending)[option];
	assignAtPath(edited, field.split('.'), value);

	return edited;
}

/**
 * Sets `value` at `path` inside `target`, creating the objects on the way.
 *
 * @param {Object}   target
 * @param {string[]} path
 * @param {*}        value
 */
function assignAtPath(target, path, value) {
	const parent = path.slice(0, -1).reduce((node, key) => {
		if (!isPlainObject(node[key])) {
			node[key] = {};
		}
		return node[key];
	}, target);
	parent[path[path.length - 1]] = value;
}

/**
 * The fields of a config field that hold stored values: a combo's and a
 * role's sub-fields (and the role's own toggle), the sub-fields of display
 * and action kinds, or the field itself.
 *
 * @param {Object} field
 * @return {Object[]} Value fields.
 */
function valueFields(field) {
	switch (field.type) {
		case 'role':
			return [field, ...(field.fields || [])];
		case 'combo':
		case 'button':
		case 'paragraph':
		case 'oauth':
		case 'credentials_group':
			return field.fields || [];
		default:
			return [field];
	}
}

/**
 * Every field of a card config by name, combo sub-fields included (display
 * fields such as paragraphs too, unlike the stored values).
 *
 * @param {{ fields?: Object[] }} config Card config.
 * @return {Object} Field by name.
 */
export function fieldsByName({ fields = [] }) {
	return Object.fromEntries(
		fields
			.flatMap((field) =>
				'combo' === field.type ? field.fields || [] : [field]
			)
			.filter((field) => field.name)
			.map((field) => [field.name, field])
	);
}

/**
 * A field's label as plain text: the name a card's row shows and search
 * finds, defined once by the settings class.
 *
 * @param {{ fields?: Object[] }} config Card config.
 * @param {string}                name   Field name.
 * @return {string} The label; empty when the config has no such field.
 */
export function fieldLabel(config, name) {
	return decodedText(fieldsByName(config)[name]?.label);
}

/**
 * A card's stored values, as the settings class sent them in its fields:
 * under the card's option, or by field name for cards without one. Dotted
 * names (`gallery.slug`) nest.
 *
 * @param {{ option?: string, fields?: Object[] }} config Card config.
 * @return {Object} Values by option (or field name).
 */
export function cardDefaultValues({ option, fields = [] }) {
	const values = {};
	fields.flatMap(valueFields).forEach((field) => {
		if (!field.name) {
			return;
		}
		const path = option
			? [option, ...field.name.split('.')]
			: field.name.split('.');
		assignAtPath(values, path, field.default ?? '');
	});

	return values;
}

/**
 * A value inside card values by dotted field name (`gallery.slug`).
 *
 * @param {Object} values
 * @param {string} path   Dotted field name.
 * @return {*} The value; undefined when a part is missing.
 */
export function valueAtPath(values, path) {
	return path.split('.').reduce((node, key) => node?.[key], values);
}

/**
 * Field condition comparisons, as the settings class and Pro send them.
 */
const CONDITION_COMPARISONS = {
	'===': (a, b) => a === b,
	'!==': (a, b) => a !== b,
	'>': (a, b) => a > b,
	'<': (a, b) => a < b,
	'>=': (a, b) => a >= b,
	'<=': (a, b) => a <= b,
};

/**
 * Whether a field with these conditions shows: every condition compares a
 * card value (dotted path inside the card's values) with its `value`. An
 * unknown comparison hides the field.
 *
 * @param {{ field: string, comparison: string, value: * }[]|undefined} conditions
 * @param {Object}                                                      values     The card's current values.
 * @return {boolean} Whether the field shows.
 */
export function conditionsMet(conditions, values) {
	if (!Array.isArray(conditions)) {
		return true;
	}

	return conditions.every(({ field, comparison, value }) => {
		if (!Object.hasOwn(CONDITION_COMPARISONS, comparison)) {
			return false;
		}
		return CONDITION_COMPARISONS[comparison](
			valueAtPath(values, field) ?? null,
			value
		);
	});
}

/**
 * A boolean field's stored value as the save route keeps it: the
 * rest_sanitize_boolean() and PHP truthiness rules, so legacy rows (`''`,
 * `'0'`, `'false'`) read as off.
 *
 * @param {*} stored Value from the option row.
 * @return {boolean} Whether the setting is on.
 */
export function storedBoolean(stored) {
	if ('string' === typeof stored) {
		return !['', '0', 'false'].includes(stored.toLowerCase());
	}

	return Boolean(stored);
}

/**
 * Pending edits left after a save: options changed again while the save
 * ran keep their newer value.
 *
 * @param {Object} pending Pending edits now.
 * @param {Object} saved   The payload that was saved.
 * @return {Object} Pending edits still unsaved.
 */
export function withoutSaved(pending, saved) {
	return Object.fromEntries(
		Object.entries(pending).filter(
			([option, value]) =>
				!Object.hasOwn(saved, option) ||
				JSON.stringify(saved[option]) !== JSON.stringify(value)
		)
	);
}

/**
 * Text to show for a failed save. apiFetch rejects with the parsed body: a
 * WordPress error `{ code, message }`, or the route's plain string.
 *
 * @param {*}      error
 * @param {string} fallback Shown when the error carries no message.
 * @return {string} Message.
 */
export function saveErrorMessage(error, fallback) {
	if ('string' === typeof error && '' !== error) {
		return error;
	}
	if ('string' === typeof error?.message && '' !== error.message) {
		return error.message;
	}

	return fallback;
}

/**
 * A card's stored values with its pending edits on top, so a card that
 * remounts (after switching sections) shows the edits it had.
 *
 * @param {Object} defaults Stored values by option, for one card.
 * @param {Object} pending  Pending edits by option, for the whole page.
 * @return {Object} Values by option, limited to the card's options.
 */
export function withPendingValues(defaults, pending) {
	const values = structuredClone(defaults);
	Object.keys(values).forEach((option) => {
		if (Object.hasOwn(pending, option)) {
			values[option] = mergeValue(values[option], pending[option]);
		}
	});

	return values;
}
