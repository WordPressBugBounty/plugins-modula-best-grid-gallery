import { decodeEntities } from '@wordpress/html-entities';

/**
 * Server copy as plain text: the settings classes send labels and messages
 * HTML-escaped (`esc_html`), and the cards render them as text.
 *
 * @param {*} html Server text, HTML-escaped.
 * @return {string} The text, decoded.
 */
export function decodedText(html) {
	return decodeEntities(String(html ?? ''));
}
