import { __ } from '@wordpress/i18n';

/**
 * Design labels of the compression types, by stored value. `disabled` has no
 * segment: the Compression toggle turns compression off.
 *
 * @return {Object<string, string>} Label by value.
 */
function choiceLabels() {
	return {
		lossless: __('Lossless', 'modula-best-grid-gallery'),
		lossy: __('Lossy', 'modula-best-grid-gallery'),
		glossy: __('Glossy', 'modula-best-grid-gallery'),
	};
}

/**
 * Segmented choices for a compression select of the settings class: the
 * server's values, in its order, with the design's labels. Values the design
 * has no segment for are left out.
 *
 * @param {{ value: string }[]|undefined} options The select field's options.
 * @return {{ value: string, label: string }[]} Segmented options.
 */
export function compressionChoices(options = []) {
	const labels = choiceLabels();

	return options
		.filter((option) => Object.hasOwn(labels, option.value))
		.map((option) => ({
			value: option.value,
			label: labels[option.value],
		}));
}
