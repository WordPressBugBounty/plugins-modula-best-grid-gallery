/**
 * Fixed content-block slot for template layouts.
 *
 * @package
 */

import EmbeddedGalleryItem from '../../components/EmbeddedGalleryItem';

/**
 * @param {Object} props
 * @param {unknown|null} props.itemData
 * @param {Object} props.config
 * @param {string} props.slotId
 * @param {string} [props.className]
 */
export default function TemplateContentSlot({
	itemData,
	config,
	slotId,
	className = '',
}) {
	if (!itemData) {
		return null;
	}

	return (
		<div
			className={`modula-template__slot modula-template__slot--content modula-template__slot--${slotId} ${className}`.trim()}
		>
			<EmbeddedGalleryItem itemData={itemData} config={config} />
		</div>
	);
}
