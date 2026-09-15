/**
 * Slider number companion: draft while typing, clamp into [min, max] after debounce/flush.
 *
 * @package
 */

/** Typing pause before the number companion commits a clamped value (ms). */
export const SLIDER_NUMBER_DEBOUNCE_MS = 400;

/**
 * Parse a number-input draft and clamp into [min, max].
 *
 * @param {unknown} raw
 * @param {number}  min
 * @param {number}  max
 * @return {number} Value in [min, max], or min when the draft is not numeric.
 */
export function resolveSliderNumberCommit(raw, min, max) {
	const safeMin = Number(min);
	const n = Number(raw);
	if (!Number.isFinite(n)) {
		return Number.isFinite(safeMin) ? safeMin : 0;
	}
	const safeMax = Number(max);
	return Math.min(safeMax, Math.max(safeMin, n));
}

/**
 * @param {Object}   options
 * @param {number}   options.min
 * @param {number}   options.max
 * @param {Function} options.onChange
 * @param {number}   [options.delayMs]
 * @return {{ schedule: Function, flush: Function, commitNow: Function, cancel: Function, setBounds: Function }} Number-input commit session.
 */
export function createSliderNumberCommit({
	min,
	max,
	onChange,
	delayMs = SLIDER_NUMBER_DEBOUNCE_MS,
}) {
	let currentMin = min;
	let currentMax = max;
	let timerId = null;
	let pendingRaw = null;

	function emitResolved(raw) {
		if (typeof onChange !== 'function') {
			return;
		}
		onChange(resolveSliderNumberCommit(raw, currentMin, currentMax));
	}

	function clearTimer() {
		if (timerId === null) {
			return;
		}
		clearTimeout(timerId);
		timerId = null;
	}

	function commitPending() {
		if (pendingRaw === null) {
			clearTimer();
			return;
		}
		const rawToCommit = pendingRaw;
		pendingRaw = null;
		clearTimer();
		emitResolved(rawToCommit);
	}

	return {
		/**
		 * Number-field keystroke: keep the draft and restart the debounce.
		 *
		 * @param {unknown} raw
		 */
		schedule(raw) {
			pendingRaw = raw;
			clearTimer();
			timerId = setTimeout(() => {
				timerId = null;
				commitPending();
			}, delayMs);
		},

		/**
		 * Blur: commit the pending draft immediately.
		 */
		flush() {
			commitPending();
		},

		/**
		 * Range thumb: drop any number draft and emit a clamped value now.
		 *
		 * @param {unknown} raw
		 */
		commitNow(raw) {
			pendingRaw = null;
			clearTimer();
			emitResolved(raw);
		},

		/**
		 * Discard a pending draft without emitting.
		 */
		cancel() {
			pendingRaw = null;
			clearTimer();
		},

		/**
		 * Keep clamp bounds in sync when the Slider min/max props change.
		 *
		 * @param {number} nextMin
		 * @param {number} nextMax
		 */
		setBounds(nextMin, nextMax) {
			currentMin = nextMin;
			currentMax = nextMax;
		},
	};
}
