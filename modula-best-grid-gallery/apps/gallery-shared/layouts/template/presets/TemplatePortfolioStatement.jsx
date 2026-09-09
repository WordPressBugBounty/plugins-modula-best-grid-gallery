/**
 * Portfolio Statement — left statement + right image cluster (Pro).
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
export default function TemplatePortfolioStatement({ slotted, config }) {
	return (
		<div className="modula-template__canvas modula-template__canvas--portfolio-statement">
			<TemplateContentSlot
				itemData={slotted.statement}
				config={config}
				slotId="statement"
				className="modula-template__statement"
			/>
			<div className="modula-template__cluster">
				<TemplateImageSlot
					itemData={slotted.imgA}
					config={config}
					slotId="imgA"
				/>
				<TemplateImageSlot
					itemData={slotted.imgB}
					config={config}
					slotId="imgB"
				/>
				<TemplateImageSlot
					itemData={slotted.imgC}
					config={config}
					slotId="imgC"
				/>
				<TemplateImageSlot
					itemData={slotted.imgD}
					config={config}
					slotId="imgD"
				/>
			</div>
		</div>
	);
}
