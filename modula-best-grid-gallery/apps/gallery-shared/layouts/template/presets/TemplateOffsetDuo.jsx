/**
 * Offset Duo — wide banner + Z-shaped pair below (Lite).
 *
 * @package
 */

import TemplateImageSlot from '../TemplateImageSlot';

/**
 * @param {Object} props
 * @param {Record<string, unknown|null>} props.slotted
 * @param {Object} props.config
 */
export default function TemplateOffsetDuo({ slotted, config }) {
	return (
		<div className="modula-template__canvas modula-template__canvas--offset-duo">
			<TemplateImageSlot
				itemData={slotted.banner}
				config={config}
				slotId="banner"
				className="modula-template__banner"
			/>
			<div className="modula-template__row modula-template__row--split">
				<TemplateImageSlot
					itemData={slotted.leftTall}
					config={config}
					slotId="leftTall"
				/>
				<TemplateImageSlot
					itemData={slotted.rightSmall}
					config={config}
					slotId="rightSmall"
				/>
			</div>
		</div>
	);
}
