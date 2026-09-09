import formRules from '../data/form-rules.json';
import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';
import { getByPath } from './getByPath';
import { resolveProGateLock } from './proGateLock';
import { isWpTruthy } from './wpTruthy';

/**
 * @param {{
 *   path?: string,
 *   eq?: string|boolean,
 *   in?: string[],
 *   truthy?: boolean,
 *   neq?: string|boolean,
 *   all?: Array<{ path?: string, eq?: string|boolean, in?: string[], truthy?: boolean, all?: unknown[], any?: unknown[] }>,
 *   any?: Array<{ path?: string, eq?: string|boolean, in?: string[], truthy?: boolean, all?: unknown[], any?: unknown[] }>,
 * }} when Rule condition (`all` = AND, `any` = OR of sub-conditions).
 * @param {Record<string, Record<string, unknown>>}                                                                                 grouped Current grouped settings.
 * @return {boolean} Whether the rule’s condition matches the current grouped state.
 */
export function evaluateWhen(when, grouped) {
	if (!when) {
		return true;
	}
	if (Array.isArray(when.all) && when.all.length > 0) {
		return when.all.every((w) => evaluateWhen(w, grouped));
	}
	if (Array.isArray(when.any) && when.any.length > 0) {
		return when.any.some((w) => evaluateWhen(w, grouped));
	}
	if (!when.path) {
		return true;
	}
	const value = getByPath(grouped, when.path);
	const normStr = (v) =>
		v === null || v === undefined ? '' : String(v).trim();
	if (when.neq !== undefined) {
		return normStr(value) !== normStr(when.neq);
	}
	if (when.truthy === true) {
		return isWpTruthy(value);
	}
	if (when.in && Array.isArray(when.in)) {
		const cur = normStr(value);
		return when.in.some((x) => normStr(x) === cur);
	}
	if (when.eq !== undefined) {
		if (when.eq === true) {
			return isWpTruthy(value);
		}
		if (when.eq === false) {
			return !isWpTruthy(value);
		}
		return normStr(value) === normStr(when.eq);
	}
	return true;
}

/**
 * Whether `schema.editorDisabledWhen` matches (control should be disabled, row stays visible).
 *
 * @param {Object|null|undefined}                   schemaObj Field schema from form export.
 * @param {Record<string, Record<string, unknown>>} grouped   Current grouped settings.
 * @return {boolean}
 */
export function isEditorDisabledWhen(schemaObj, grouped) {
	if (!schemaObj || typeof schemaObj !== 'object') {
		return false;
	}
	const when = schemaObj.editorDisabledWhen;
	if (!when || typeof when !== 'object') {
		return false;
	}
	return evaluateWhen(when, grouped);
}

/**
 * Whether `schema.editorVisibleWhen` matches (row hidden when false).
 *
 * @param {Object|null|undefined}                   schemaObj Field schema from form export.
 * @param {Record<string, Record<string, unknown>>} grouped   Current grouped settings.
 * @return {boolean}
 */
export function isEditorVisibleWhen(schemaObj, grouped) {
	if (!schemaObj || typeof schemaObj !== 'object') {
		return true;
	}
	const when = schemaObj.editorVisibleWhen;
	if (!when || typeof when !== 'object') {
		return true;
	}
	return evaluateWhen(when, grouped);
}

/**
 * Whether a schema field should show, given optional pathPattern rules.
 *
 * @param {{ groupedPath: string }}                 field   Schema field descriptor.
 * @param {Record<string, Record<string, unknown>>} grouped Current editor state.
 * @return {boolean} True if no rule hides this field path, or `when` passes.
 */
export function isFieldVisible(field, grouped) {
	const path = field.groupedPath || '';
	const schemaObj =
		field.schema && typeof field.schema === 'object' ? field.schema : null;
	// Editor-only: control lives elsewhere (e.g. preview chrome) — keep in form state, hide sidebar row.
	if (schemaObj && schemaObj.editorOmitFromSettingsSidebar === true) {
		return false;
	}

	const editor = getModulaSettingsEditorConfig();
	const isPro = Boolean(editor?.isPro);
	// Lite: only fields that declare `editorShowInLite` in the v2 document are gated.
	// Absent key = visible in Lite (default). `false` = hidden, `true` = shown.
	if (
		!isPro &&
		field.schema &&
		typeof field.schema === 'object' &&
		Object.prototype.hasOwnProperty.call(field.schema, 'editorShowInLite')
	) {
		return field.schema.editorShowInLite === true;
	}

	// Pro: hide dependent settings when the extension is off-plan or disabled (e.g. Speed Up).
	if (isPro && field.schema && typeof field.schema === 'object') {
		const slug = field.schema.editorRequiresExtensionEnabled;
		if (typeof slug === 'string' && slug.trim() !== '') {
			const { allowed } = resolveProGateLock(
				{ kind: 'requiresExtension', extensionSlug: slug.trim() },
				editor
			);
			if (!allowed) {
				return false;
			}
		}
	}

	if (!isEditorVisibleWhen(schemaObj, grouped)) {
		return false;
	}

	const rules = formRules.visibility;
	if (!Array.isArray(rules) || rules.length === 0) {
		return true;
	}
	for (const rule of rules) {
		if (!rule.pathPattern) {
			continue;
		}
		try {
			const re = new RegExp(rule.pathPattern);
			if (!re.test(path)) {
				continue;
			}
			return evaluateWhen(rule.when, grouped);
		} catch {
			continue;
		}
	}
	return true;
}
