/**
 * Editorial Cluster — six-image magazine collage (Pro).
 *
 * @package
 */

import TemplateImageSlot from '../TemplateImageSlot';

/**
 * @param {Object} props
 * @param {Record<string, unknown|null>} props.slotted
 * @param {Object} props.config
 */
export default function TemplateEditorialCluster({ slotted, config }) {
	return (
		<div className="modula-template__canvas modula-template__canvas--editorial-cluster">
			{['a', 'b', 'c', 'd', 'e', 'f'].map((slotId) => (
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
