/**
 * The settings a field's options hang under (`nestedUnder` drills, the
 * canvas "kids" of a toggle), as the gallery editor and the Albums editor
 * draw them. A headless box (no header) leaves its reset to the host row.
 */

/**
 * @typedef {Object} ResetState
 * @property {boolean}    isDirty Whether any field differs from its default (shows the reset dot).
 * @property {() => void} reset   Restores the defaults.
 */

/**
 * A section of dependents hangs under the setting it depends on
 * (`nestedUnder`): it opens by default, and its header shows ↳ (canvas
 * "↳ On phones and tablets").
 *
 * @param {Object} section Navigation `drill`.
 * @return {boolean} Whether it holds the dependents of a host setting.
 */
export function isDependentsSection(section) {
	return typeof section.nestedUnder === 'string';
}

/**
 * @typedef {Object} ShownSectionContent
 * @property {number} rows     Field rows the section shows now (a per-device row counts once).
 * @property {number} sections Sections it shows inside it.
 */

/**
 * Dependents that come down to one row draw as that row, indented under its
 * host with ↳, without a box or a title (canvas `buildFields`: a single kid
 * with no box of its own). Two rows or more, or a section inside, keep the
 * box. Counting what a section shows walks its fields, so it runs only for a
 * dependents section.
 *
 * @param {Object}                    section    Navigation `drill`.
 * @param {() => ShownSectionContent} countShown What the section shows now.
 * @return {boolean} Whether the dependents draw as one ↳ row.
 */
export function isSingleRowDependents(section, countShown) {
	if (!isDependentsSection(section)) {
		return false;
	}
	const shown = countShown();
	return shown.rows === 1 && shown.sections === 0;
}

/**
 * @typedef {{ kind: 'fields', paths: string[] } | { kind: 'entry', entry: Object }} SectionBlock
 */

/**
 * What a section shows now, counted as the panel draws it: each run of
 * fields adds the rows it draws, and any other entry (a nested section, a
 * note) counts as a section, since it is not a row.
 *
 * @param {SectionBlock[]}              blocks       The section's shown blocks (each editor's `groupSectionItems`).
 * @param {(paths: string[]) => number} countRunRows Rows a run of fields draws (each editor's `getNestedStackRows`).
 * @return {ShownSectionContent} Shown rows and sections.
 */
export function countShownBlocks(blocks, countRunRows) {
	const shown = { rows: 0, sections: 0 };
	for (const block of blocks) {
		if (block.kind === 'fields') {
			shown.rows += countRunRows(block.paths);
			continue;
		}
		shown.sections += 1;
	}
	return shown;
}

/**
 * Headless sections by the host field they hang under. A headless section
 * with no host (gallery Interact › Share) carries no row reset, so it is
 * left out.
 *
 * @param {Object[]} items Submenu or drill `items`.
 * @return {Map<string, Object>} Host grouped path → headless drill.
 */
export function findHeadlessDependents(items) {
	const byHost = new Map();
	for (const entry of items) {
		if (
			entry?.type === 'drill' &&
			entry.headless === true &&
			isDependentsSection(entry)
		) {
			byHost.set(entry.nestedUnder, entry);
		}
	}
	return byHost;
}

/**
 * A host field's row reset: its own reset, extended to its headless box
 * (the box has no header to carry one).
 *
 * @param {ResetState}           own        The field's own reset.
 * @param {ResetState|undefined} dependents Reset of the headless box under it, if any.
 * @return {ResetState} What the row's reset dot shows and does.
 */
export function hostRowReset(own, dependents) {
	if (!dependents) {
		return own;
	}
	return {
		isDirty: own.isDirty || dependents.isDirty,
		reset: () => {
			own.reset();
			dependents.reset();
		},
	};
}
