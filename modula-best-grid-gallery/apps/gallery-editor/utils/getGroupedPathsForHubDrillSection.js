import { getEnrichedFieldByGroupedPath } from '../data/formSchema';
import { getGroupedPathsForSchemaGroupDrill } from './getGroupedPathsForSchemaGroupDrill';

/**
 * Paths for a hub `drill` section.
 *
 * Explicit `groupedPaths` from editor navigation: keep every known schema path (do not pre-filter by
 * `isFieldVisible`). The nested stack re-evaluates visibility on each render so fields that depend on
 * gallery type (e.g. uniform-grid tile aspect) appear after the user changes type without re-opening
 * the drill from a stale path list.
 *
 * `group`-based drills: include every schema path in the group (except
 * `omitFromSchemaGroupDrill`); nested panels filter by `isFieldVisible` on each render.
 *
 * @param {Object}                                  section Hub drill section from `hubSections`
 * @param {Record<string, Record<string, unknown>>} values  Form values
 * @return {string[]} Paths in navigation order (explicit list) or visible group fields.
 */
function collectKnownSchemaPaths(pathList) {
	const out = [];
	if (!Array.isArray(pathList)) {
		return out;
	}
	for (const p of pathList) {
		if (typeof p !== 'string') {
			continue;
		}
		const path = p.trim();
		if (!path) {
			continue;
		}
		const hit = getEnrichedFieldByGroupedPath(path);
		if (hit) {
			out.push(path);
		}
	}
	return out;
}

/**
 * @param {string[]} paths
 * @return {string[]}
 */
function dedupeGroupedPaths(paths) {
	const seen = new Set();
	/** @type {string[]} */
	const out = [];
	for (const path of paths) {
		if (!path || seen.has(path)) {
			continue;
		}
		seen.add(path);
		out.push(path);
	}
	return out;
}

export function getGroupedPathsForHubDrillSection(section, values) {
	if (
		Array.isArray(section.groupedPaths) &&
		section.groupedPaths.length > 0
	) {
		return collectKnownSchemaPaths(section.groupedPaths);
	}
	/** @type {string[]} */
	let out = collectKnownSchemaPaths(section.prependGroupedPaths);
	if (typeof section.group === 'string' && section.group !== '') {
		out = out.concat(
			getGroupedPathsForSchemaGroupDrill(section.group, values)
		);
	}
	return dedupeGroupedPaths(out);
}
