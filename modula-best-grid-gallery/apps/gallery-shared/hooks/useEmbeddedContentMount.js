/**
 * After React inserts embedded shortcode/body HTML, let WP plugins re-init (forms, embeds).
 *
 * @package
 */

import { useEffect, useRef } from '@wordpress/element';

/**
 * @param {string}  html             Markup passed to dangerouslySetInnerHTML.
 * @param {Object}  itemData         Bootstrap embedded row.
 * @param {boolean} isEditorPreview  Settings-editor preview — skip mount hooks.
 */
export function useEmbeddedContentMount(html, itemData, isEditorPreview) {
	const containerRef = useRef(null);
	const embeddedKey = itemData?.embeddedId ?? itemData?.id ?? '';

	useEffect(() => {
		const el = containerRef.current;
		if (!el || isEditorPreview || !html) {
			return undefined;
		}

		const wp = typeof window !== 'undefined' ? window.wp : null;
		wp?.hooks?.doAction?.('modula_embedded_content_mounted', el, itemData);

		const jq = typeof window !== 'undefined' ? window.jQuery : null;
		if (jq) {
			jq(el).trigger('modula_embedded_content_mounted');
			jq(document).trigger('modula_embedded_content_mounted', [el]);
		}

		return undefined;
	}, [html, isEditorPreview, embeddedKey]);

	return containerRef;
}
