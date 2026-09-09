/**
 * Lookbook Ladder — five images on a vertical stagger (Pro).
 *
 * @package
 */

import TemplateImageSlot from '../TemplateImageSlot';

/**
 * @param {Object} props
 * @param {Record<string, unknown|null>} props.slotted
 * @param {Object} props.config
 */
export default function TemplateLookbookLadder({ slotted, config }) {
	return (
		<div className="modula-template__canvas modula-template__canvas--lookbook-ladder">
			{['step0', 'step1', 'step2', 'step3', 'step4'].map((slotId) => (
				<TemplateImageSlot
					key={slotId}
					itemData={slotted[slotId]}
					config={config}
					slotId={slotId}
				/>
			))}
		</div>
	);
}
