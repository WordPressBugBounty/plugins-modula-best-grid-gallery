/**
 * Asymmetric Trio — large left portrait + right stack (Lite).
 *
 * @package
 */

import TemplateImageSlot from '../TemplateImageSlot';

/**
 * @param {Object} props
 * @param {Record<string, unknown|null>} props.slotted
 * @param {Object} props.config
 */
export default function TemplateAsymmetricTrio({ slotted, config }) {
	return (
		<div className="modula-template__canvas modula-template__canvas--asymmetric-trio">
			<TemplateImageSlot
				itemData={slotted.leftPortrait}
				config={config}
				slotId="leftPortrait"
				className="modula-template__feature"
			/>
			<div className="modula-template__col modula-template__col--right">
				<TemplateImageSlot
					itemData={slotted.rightTop}
					config={config}
					slotId="rightTop"
				/>
				<TemplateImageSlot
					itemData={slotted.rightBottom}
					config={config}
					slotId="rightBottom"
				/>
			</div>
		</div>
	);
}
