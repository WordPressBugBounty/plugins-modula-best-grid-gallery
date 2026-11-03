/**
 * How a settings panel row names the settings it renders, so Setting search
 * can land on it: the row element carries their anchors (grouped paths) in
 * one space-separated attribute.
 */

const ANCHOR_ATTRIBUTE = 'data-setting-paths';

/**
 * @param {string[]} anchors
 * @return {Record<string, string>} Props for the row element.
 */
export function settingAnchorProps(anchors) {
	return { [ANCHOR_ATTRIBUTE]: anchors.join(' ') };
}

/**
 * @param {Element} container
 * @param {string}  anchor
 * @return {Element|null} The row that renders the setting.
 */
export function findSettingRow(container, anchor) {
	return container.querySelector(
		`[${ANCHOR_ATTRIBUTE}~="${window.CSS.escape(anchor)}"]`
	);
}
