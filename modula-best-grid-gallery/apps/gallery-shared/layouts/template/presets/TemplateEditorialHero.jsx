/**
 * Editorial Hero — center copy + four corner images (Pro).
 *
 * @package
 */

import TemplateImageSlot from '../TemplateImageSlot';
import TemplateContentSlot from '../TemplateContentSlot';

/**
 * @param {Object} props
 * @param {Record<string, unknown|null>} props.slotted
 * @param {Object} props.config
 */
export default function TemplateEditorialHero({ slotted, config }) {
	return (
		<div className="modula-template__canvas modula-template__canvas--editorial-hero">
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
			<TemplateContentSlot
				itemData={slotted.center}
				config={config}
				slotId="center"
				className="modula-template__hero-copy"
			/>
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
		</div>
	);
}
