/**
 * Split Stack — left stack (landscape + portrait) + right hero (Lite).
 *
 * Matches the editorial wireframe: two left tiles stacked, one large right
 * tile top-aligned and shorter than the left column.
 *
 * @package
 */

import TemplateImageSlot from '../TemplateImageSlot';

/**
 * @param {Object} props
 * @param {Record<string, unknown|null>} props.slotted
 * @param {Object} props.config
 */
export default function TemplateSplitStack({ slotted, config }) {
	return (
		<div className="modula-template__canvas modula-template__canvas--split-stack">
			<div className="modula-template__col modula-template__col--left">
				<TemplateImageSlot
					itemData={slotted.leftTop}
					config={config}
					slotId="leftTop"
				/>
				<TemplateImageSlot
					itemData={slotted.leftBottom}
					config={config}
					slotId="leftBottom"
				/>
			</div>
			<TemplateImageSlot
				itemData={slotted.rightHero}
				config={config}
				slotId="rightHero"
				className="modula-template__hero"
			/>
		</div>
	);
}
