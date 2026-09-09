/**
 * Spread object keys as string attributes (e.g. for DOM elements).
 * Skips null and undefined values.
 *
 * @param {Object} attrs - Key/value map
 * @return {Object} New object with string values only, null/undefined omitted
 */
export function spreadAttrs(attrs) {
	if (attrs === null || attrs === undefined || typeof attrs !== 'object') {
		return {};
	}
	const result = {};
	Object.keys(attrs).forEach((key) => {
		const value = attrs[key];
		if (value !== null && value !== undefined) {
			if (key === 'class' && Array.isArray(value)) {
				result[key] = value
					.map((v) => String(v).trim())
					.filter(Boolean)
					.join(' ');
			} else {
				result[key] = String(value);
			}
		}
	});
	return result;
}

/**
 * Map HTML-style keys from spreadAttrs (or similar) to valid React DOM prop names.
 *
 * @param {Object} attrs
 * @return {Object}
 */
export function normalizeReactDomProps(attrs) {
	if (attrs === null || attrs === undefined || typeof attrs !== 'object') {
		return {};
	}
	const out = { ...attrs };
	if (Object.prototype.hasOwnProperty.call(out, 'tabindex')) {
		const raw = out.tabindex;
		delete out.tabindex;
		const n = parseInt(String(raw), 10);
		out.tabIndex = Number.isFinite(n) ? n : raw;
	}
	if (Object.prototype.hasOwnProperty.call(out, 'class')) {
		const cls = String(out.class).trim();
		delete out.class;
		if (cls) {
			const existing =
				out.className !== null && out.className !== undefined
					? String(out.className).trim()
					: '';
			out.className = [existing, cls].filter(Boolean).join(' ').trim();
		}
	}
	return out;
}

/**
 * Merge className from normalized PHP attrs with extra class tokens (link_classes / img_classes).
 *
 * @param {Object} attrs - From normalizeReactDomProps(spreadAttrs(...))
 * @param {string[]|string} extraClasses - Array of class strings, or single string
 * @return {Object} attrs without duplicate class keys; single className when non-empty
 */
export function mergeReactClassNameProps(attrs, extraClasses) {
	if (!attrs || typeof attrs !== 'object') {
		attrs = {};
	}
	const { className: fromAttrs, ...rest } = attrs;
	const tokens = new Set();
	const pushTokens = (chunk) => {
		if (chunk === null || chunk === undefined || chunk === '') {
			return;
		}
		String(chunk)
			.split(/\s+/)
			.filter(Boolean)
			.forEach((t) => tokens.add(t));
	};
	pushTokens(fromAttrs);
	if (Array.isArray(extraClasses)) {
		extraClasses.forEach((c) => pushTokens(c));
	} else {
		pushTokens(extraClasses);
	}
	const className = [...tokens].join(' ');
	return className ? { ...rest, className } : { ...rest };
}
