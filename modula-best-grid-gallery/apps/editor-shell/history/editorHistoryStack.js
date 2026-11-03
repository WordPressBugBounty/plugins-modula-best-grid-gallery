/**
 * Editor history (gallery and Albums editors): typed settings, layout and
 * item steps on one stack.
 *
 * Settings and layout steps are snapshots. An item step (an image removed
 * from a gallery, members removed from an album) is a change instead: undo
 * and redo hand it back with the direction to apply, since the catalog itself
 * is not snapshotted here. Each editor owns its change's shape.
 *
 * @package
 */

/**
 * @typedef {'settings'|'layout'|'items'} EditorStepType
 * @typedef {{ direction: 'undo'|'redo', change: unknown }} EditorItemsOp
 */

export const EDITOR_HISTORY_MAX_PAST = 50;

/**
 * @param {unknown} value
 * @return {any} Deep clone, or undefined.
 */
function cloneJson(value) {
	if (value === undefined) {
		return undefined;
	}
	return JSON.parse(JSON.stringify(value));
}

/**
 * @param {number} index
 * @param {number} cursor
 * @return {'past'|'current'|'future'} Position relative to the current cursor.
 */
function stepPosition(index, cursor) {
	if (index < cursor) {
		return 'past';
	}
	if (index === cursor) {
		return 'current';
	}
	return 'future';
}

/**
 * @param {{
 *   maxPast?: number,
 *   initialSettings?: Record<string, Record<string, unknown>>,
 *   initialLayout?: Record<string, unknown>,
 * }} [opts]
 */
export function createEditorHistory(opts = {}) {
	const maxPast =
		typeof opts.maxPast === 'number' && opts.maxPast > 0
			? opts.maxPast
			: EDITOR_HISTORY_MAX_PAST;

	let initialSettings = cloneJson(opts.initialSettings ?? {});
	let initialLayout = cloneJson(opts.initialLayout ?? {});
	/** @type {Array<{ id: number, type: EditorStepType, label: string, settings?: Record<string, Record<string, unknown>>, layout?: Record<string, unknown>, itemChange?: unknown, committedAt: number, change?: unknown }>} */
	let steps = [];
	let cursor = -1;
	let lastStepId = 0;

	/**
	 * @param {number} index Step index, or -1 for the initial checkpoint.
	 */
	function snapshotAt(index) {
		let settings = cloneJson(initialSettings);
		let layout = cloneJson(initialLayout);
		const last = Math.min(index, steps.length - 1);
		let type = /** @type {EditorStepType|null} */ (null);
		for (let i = 0; i <= last; i++) {
			const step = steps[i];
			type = step.type;
			if (step.type === 'settings' && step.settings) {
				settings = cloneJson(step.settings);
			}
			if (step.type === 'layout' && step.layout) {
				layout = { ...layout, ...cloneJson(step.layout) };
			}
		}
		return { type, settings, layout };
	}

	function labelAtCursor() {
		if (cursor < 0) {
			return '';
		}
		return steps[cursor]?.label || '';
	}

	function currentType() {
		if (cursor < 0) {
			return null;
		}
		return steps[cursor]?.type ?? null;
	}

	function trimPast() {
		while (steps.length > maxPast) {
			const dropped = steps.shift();
			if (dropped?.type === 'settings' && dropped.settings) {
				initialSettings = cloneJson(dropped.settings);
			}
			if (dropped?.type === 'layout' && dropped.layout) {
				initialLayout = {
					...initialLayout,
					...cloneJson(dropped.layout),
				};
			}
			cursor -= 1;
		}
		if (cursor < -1) {
			cursor = -1;
		}
	}

	/**
	 * @param {{ type: EditorStepType, label: string, settings?: Record<string, Record<string, unknown>>, layout?: Record<string, unknown>, itemChange?: unknown, committedAt?: number, change?: unknown }} step
	 * @return {number} Id of the committed step.
	 */
	function commit(step) {
		steps = steps.slice(0, cursor + 1);
		const committedAt =
			typeof step.committedAt === 'number' &&
			Number.isFinite(step.committedAt)
				? step.committedAt
				: Date.now();
		lastStepId += 1;
		steps.push({
			id: lastStepId,
			type: step.type,
			label: String(step.label || ''),
			settings:
				step.type === 'settings'
					? cloneJson(step.settings ?? {})
					: undefined,
			layout:
				step.type === 'layout'
					? cloneJson(step.layout ?? {})
					: undefined,
			itemChange:
				step.type === 'items' ? cloneJson(step.itemChange) : undefined,
			committedAt,
			change: step.type === 'settings' ? step.change : undefined,
		});
		cursor = steps.length - 1;
		trimPast();
		return lastStepId;
	}

	/**
	 * Item changes to apply, in order, to move the cursor from `from` to `to`.
	 *
	 * @param {number} from
	 * @param {number} to
	 * @return {EditorItemsOp[]} Newest first going back; oldest first going forward.
	 */
	function itemsOpsBetween(from, to) {
		const goingBack = to < from;
		// Going back undoes from..to+1; going forward redoes from+1..to.
		const crossed = goingBack
			? steps.slice(to + 1, from + 1).reverse()
			: steps.slice(from + 1, to + 1);
		return crossed
			.filter((step) => step.type === 'items')
			.map((step) => ({
				direction: goingBack ? 'undo' : 'redo',
				change: cloneJson(step.itemChange),
			}));
	}

	/**
	 * @param {EditorStepType|null}                                                                    type
	 * @param {{ settings: Record<string, Record<string, unknown>>, layout: Record<string, unknown> }} snap
	 * @param {EditorItemsOp[]}                                                                        items
	 */
	function restoreResult(type, snap, items) {
		return {
			type,
			settings: cloneJson(snap.settings),
			layout: cloneJson(snap.layout),
			items,
		};
	}

	return {
		/**
		 * @param {{ label: string, settings: Record<string, Record<string, unknown>>, committedAt?: number, change?: unknown }} args
		 */
		commitSettingsStep(args) {
			commit({
				type: 'settings',
				label: args?.label,
				settings: args?.settings,
				committedAt: args?.committedAt,
				change: args?.change,
			});
		},
		/**
		 * @param {{ label: string, layout: Record<string, unknown>, committedAt?: number }} args
		 * @return {boolean} False when the slice matches the current layout (no step).
		 */
		commitLayoutStep(args) {
			const layout = cloneJson(args?.layout ?? {});
			const current = snapshotAt(cursor).layout;
			try {
				if (JSON.stringify(current) === JSON.stringify(layout)) {
					return false;
				}
			} catch {
				// Fall through and commit when serialization fails.
			}
			commit({
				type: 'layout',
				label: args?.label,
				layout,
				committedAt: args?.committedAt,
			});
			return true;
		},
		/**
		 * @param {{ label: string, change: unknown, committedAt?: number }} args
		 * @return {number} Step id, for `currentStepId()` checks.
		 */
		commitItemsStep(args) {
			return commit({
				type: 'items',
				label: args?.label,
				itemChange: args?.change,
				committedAt: args?.committedAt,
			});
		},
		undo() {
			if (cursor < 0) {
				return null;
			}
			const type = currentType();
			const items = itemsOpsBetween(cursor, cursor - 1);
			cursor -= 1;
			return restoreResult(type, snapshotAt(cursor), items);
		},
		redo() {
			if (cursor + 1 >= steps.length) {
				return null;
			}
			const items = itemsOpsBetween(cursor, cursor + 1);
			cursor += 1;
			return restoreResult(steps[cursor].type, snapshotAt(cursor), items);
		},
		/**
		 * Restore the snapshot at `index` and drop every step after it. Index -1
		 * is the initial checkpoint (History's "Original settings").
		 *
		 * @param {number} index
		 * @return {{ type: EditorStepType|null, settings: Record<string, Record<string, unknown>>, layout: Record<string, unknown>, items: EditorItemsOp[] }|null} Restored world, or null when the index is current or invalid.
		 */
		jumpTo(index) {
			if (
				!Number.isInteger(index) ||
				index < -1 ||
				index >= steps.length
			) {
				return null;
			}
			if (index === cursor) {
				return null;
			}
			const items = itemsOpsBetween(cursor, index);
			steps = steps.slice(0, index + 1);
			cursor = index;
			return restoreResult(currentType(), snapshotAt(cursor), items);
		},
		dropLayoutSteps() {
			const atCursor = snapshotAt(cursor);
			initialLayout = cloneJson(atCursor.layout);
			const kept = [];
			let newCursor = -1;
			for (let i = 0; i < steps.length; i++) {
				if (steps[i].type === 'layout') {
					continue;
				}
				kept.push(steps[i]);
				if (i <= cursor) {
					newCursor = kept.length - 1;
				}
			}
			steps = kept;
			cursor = newCursor;
		},
		listEntries() {
			return steps.map((step, index) => ({
				index,
				type: step.type,
				label: step.label,
				position: stepPosition(index, cursor),
				committedAt: step.committedAt,
				change: step.change,
			}));
		},
		/**
		 * Empty the stack while keeping the current document as the sole checkpoint.
		 * Does not mutate form or preview by itself.
		 */
		clear() {
			const snap = snapshotAt(cursor);
			initialSettings = cloneJson(snap.settings);
			initialLayout = cloneJson(snap.layout);
			steps = [];
			cursor = -1;
		},
		canUndo() {
			return cursor >= 0;
		},
		/**
		 * @return {number|null} Id of the step at the cursor, or null at the checkpoint.
		 */
		currentStepId() {
			return cursor >= 0 ? steps[cursor].id : null;
		},
		canRedo() {
			return cursor + 1 < steps.length;
		},
		/**
		 * Undoable step count (History popover subtitle `N changes`).
		 *
		 * @return {number}
		 */
		undoableCount() {
			return cursor + 1;
		},
		lastStepLabel() {
			return labelAtCursor();
		},
		undoStepLabel() {
			return labelAtCursor();
		},
		redoStepLabel() {
			return steps[cursor + 1]?.label || '';
		},
		/**
		 * @param {{ settings?: Record<string, Record<string, unknown>>, layout?: Record<string, unknown> }} [args]
		 */
		syncCheckpoint(args = {}) {
			initialSettings = cloneJson(args.settings ?? {});
			initialLayout = cloneJson(args.layout ?? {});
			steps = [];
			cursor = -1;
		},
		/**
		 * @param {{ settings?: Record<string, Record<string, unknown>> }} [args]
		 */
		adoptCheckpoint(args = {}) {
			if (args.settings !== undefined) {
				let folded = false;
				for (let i = cursor; i >= 0; i--) {
					if (steps[i].type === 'settings') {
						steps[i] = {
							...steps[i],
							settings: cloneJson(args.settings),
						};
						folded = true;
						break;
					}
				}
				if (!folded) {
					initialSettings = cloneJson(args.settings);
				}
			}
		},
		/**
		 * Seed the layout baseline before a canvas change.
		 * Before any layout step: replace the baseline.
		 * After layout steps exist: only add ids missing from the cumulative layout
		 * (so single-id lock steps can undo a second item).
		 *
		 * @param {Record<string, unknown>|null|undefined} layout
		 */
		adoptLayoutCheckpoint(layout) {
			const incoming = layout && typeof layout === 'object' ? layout : {};
			if (!steps.some((step) => step.type === 'layout')) {
				initialLayout = cloneJson(incoming);
				return;
			}
			const current = snapshotAt(cursor).layout;
			/** @type {Record<string, unknown>} */
			const missingCells = {};
			for (const [id, cell] of Object.entries(incoming)) {
				if (!Object.prototype.hasOwnProperty.call(current, id)) {
					missingCells[id] = cell;
				}
			}
			if (Object.keys(missingCells).length === 0) {
				return;
			}
			initialLayout = { ...initialLayout, ...cloneJson(missingCells) };
		},
	};
}
