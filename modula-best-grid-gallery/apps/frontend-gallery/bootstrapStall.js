/**
 * Decide what the modern visitor loader should do when a gallery stays pending.
 * Pure seam for “Loading…” must not hang forever with zero recovery.
 *
 * @package
 */

/** @typedef {'wait' | 'force-mount' | 'show-error' | 'none'} BootstrapStallAction */

export const BOOTSTRAP_STALL_MS = 8000;
export const BOOTSTRAP_FORCE_GRACE_MS = 4000;

/**
 * @param {{
 *   now: number,
 *   scheduledAt: number,
 *   initialized: boolean,
 *   pending: boolean,
 *   forceMountAttempted: boolean,
 *   stallMs?: number,
 *   forceGraceMs?: number,
 * }} state
 * @returns {BootstrapStallAction}
 */
export function resolveBootstrapStallAction(state) {
	const {
		now,
		scheduledAt,
		initialized,
		pending,
		forceMountAttempted,
		stallMs = BOOTSTRAP_STALL_MS,
		forceGraceMs = BOOTSTRAP_FORCE_GRACE_MS,
	} = state;

	if (initialized || !pending) {
		return 'none';
	}

	const elapsed = now - scheduledAt;
	if (elapsed < stallMs) {
		return 'wait';
	}

	if (!forceMountAttempted) {
		return 'force-mount';
	}

	if (elapsed < stallMs + forceGraceMs) {
		return 'wait';
	}

	return 'show-error';
}
