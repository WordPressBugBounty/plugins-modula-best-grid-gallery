import { useEffect, useState } from '@wordpress/element';

/**
 * @template T
 * @param {T}      value   Value to debounce.
 * @param {number} delayMs Delay in milliseconds.
 * @return {T} Debounced value after the delay elapses without further changes.
 */
export function useDebouncedValue(value, delayMs) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const t = window.setTimeout(() => setDebounced(value), delayMs);
		return () => window.clearTimeout(t);
	}, [value, delayMs]);
	return debounced;
}
