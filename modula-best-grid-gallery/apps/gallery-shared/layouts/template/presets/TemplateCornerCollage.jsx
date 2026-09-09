/**
 * Corner Collage — five images framing open center space (Pro).
 *
 * @package
 */

import TemplateImageSlot from '../TemplateImageSlot';

/**
 * @param {Object} props
 * @param {Record<string, unknown|null>} props.slotted
 * @param {Object} props.config
 */
export default function TemplateCornerCollage({ slotted, config }) {
	return (
		<div className="modula-template__canvas modula-template__canvas--corner-collage">
			<TemplateImageSlot
				itemData={slotted.topLeft}
				config={config}
				slotId="topLeft"
			/>
			<TemplateImageSlot
				itemData={slotted.topRight}
				config={config}
				slotId="topRight"
			/>
			<div className="modula-template__breathing-room" aria-hidden="true" />
			<TemplateImageSlot
				itemData={slotted.bottomLeft}
				config={config}
				slotId="bottomLeft"
			/>
			<TemplateImageSlot
				itemData={slotted.bottomRight}
				config={config}
				slotId="bottomRight"
			/>
			<TemplateImageSlot
				itemData={slotted.accent}
				config={config}
				slotId="accent"
			/>
		</div>
	);
}
