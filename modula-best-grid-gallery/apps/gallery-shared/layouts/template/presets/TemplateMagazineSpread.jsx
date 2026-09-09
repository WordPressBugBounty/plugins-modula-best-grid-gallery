/**
 * Magazine Spread — staggered images + headline and body copy (Pro).
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
export default function TemplateMagazineSpread({ slotted, config }) {
	return (
		<div className="modula-template__canvas modula-template__canvas--magazine-spread">
			<TemplateImageSlot
				itemData={slotted.leftLarge}
				config={config}
				slotId="leftLarge"
				className="modula-template__feature"
			/>
			<TemplateImageSlot
				itemData={slotted.centerTall}
				config={config}
				slotId="centerTall"
			/>
			<div className="modula-template__magazine-right">
				<TemplateContentSlot
					itemData={slotted.headline}
					config={config}
					slotId="headline"
					className="modula-template__headline"
				/>
				<TemplateImageSlot
					itemData={slotted.rightSmall}
					config={config}
					slotId="rightSmall"
				/>
				<TemplateContentSlot
					itemData={slotted.body}
					config={config}
					slotId="body"
					className="modula-template__body-copy"
				/>
			</div>
		</div>
	);
}
