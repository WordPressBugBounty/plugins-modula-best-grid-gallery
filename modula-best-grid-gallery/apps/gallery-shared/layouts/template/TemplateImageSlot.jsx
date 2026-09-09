/**
 * Fixed image slot for template layouts.
 *
 * @package
 */

import GalleryItem from '../../components/GalleryItem';

/**
 * @param {Object} props
 * @param {unknown|null} props.itemData
 * @param {Object} props.config
 * @param {string} props.slotId
 * @param {string} [props.className]
 */
export default function TemplateImageSlot({
	itemData,
	config,
	slotId,
	className = '',
}) {
	if (!itemData) {
		return (
			<div
				className={`modula-template__slot modula-template__slot--image modula-template__slot--${slotId} modula-template__slot--empty ${className}`.trim()}
				aria-hidden="true"
			/>
		);
	}

	return (
		<div
			className={`modula-template__slot modula-template__slot--image modula-template__slot--${slotId} ${className}`.trim()}
		>
			<GalleryItem
				itemData={itemData}
				config={config}
				fillSlot
				imageWrapperClass="modula-template__media"
				style={{
					position: 'absolute',
					inset: 0,
					width: '100%',
					height: '100%',
				}}
			/>
		</div>
	);
}
