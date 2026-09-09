/**
 * Minimal Feature — centered hero + supporting pair (Lite).
 *
 * @package
 */

import TemplateImageSlot from '../TemplateImageSlot';

/**
 * @param {Object} props
 * @param {Record<string, unknown|null>} props.slotted
 * @param {Object} props.config
 */
export default function TemplateMinimalFeature({ slotted, config }) {
	return (
		<div className="modula-template__canvas modula-template__canvas--minimal-feature">
			<TemplateImageSlot
				itemData={slotted.hero}
				config={config}
				slotId="hero"
				className="modula-template__hero"
			/>
			<div className="modula-template__row modula-template__row--support">
				<TemplateImageSlot
					itemData={slotted.supportLeft}
					config={config}
					slotId="supportLeft"
				/>
				<TemplateImageSlot
					itemData={slotted.supportRight}
					config={config}
					slotId="supportRight"
				/>
			</div>
		</div>
	);
}
