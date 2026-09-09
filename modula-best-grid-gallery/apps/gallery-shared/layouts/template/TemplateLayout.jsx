/**
 * Template gallery layout — routes to handcrafted preset components.
 *
 * @package
 */

import { useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useSelector } from 'react-redux';
import { mapTemplateItems } from './templateDefinitions';
import { useTemplateViewport } from './useTemplateViewport';
import { isSettingsEditorPreview } from '../../utils/displayContext';
import TemplateSplitStack from './presets/TemplateSplitStack';
import TemplateAsymmetricTrio from './presets/TemplateAsymmetricTrio';
import TemplateOffsetDuo from './presets/TemplateOffsetDuo';
import TemplateMinimalFeature from './presets/TemplateMinimalFeature';
import TemplateEditorialHero from './presets/TemplateEditorialHero';
import TemplateMagazineSpread from './presets/TemplateMagazineSpread';
import TemplateLookbookLadder from './presets/TemplateLookbookLadder';
import TemplateCornerCollage from './presets/TemplateCornerCollage';
import TemplatePortfolioStatement from './presets/TemplatePortfolioStatement';
import TemplateEditorialCluster from './presets/TemplateEditorialCluster';

/** @type {Record<string, import('react').ComponentType<{ slotted: Record<string, unknown|null>, config: object }>>} */
const TEMPLATE_PRESETS = {
	'split-stack': TemplateSplitStack,
	'asymmetric-trio': TemplateAsymmetricTrio,
	'offset-duo': TemplateOffsetDuo,
	'minimal-feature': TemplateMinimalFeature,
	'editorial-hero': TemplateEditorialHero,
	'magazine-spread': TemplateMagazineSpread,
	'lookbook-ladder': TemplateLookbookLadder,
	'corner-collage': TemplateCornerCollage,
	'portfolio-statement': TemplatePortfolioStatement,
	'editorial-cluster': TemplateEditorialCluster,
};

export default function TemplateLayout() {
	const items = useSelector((s) => s.items.items);
	const config = useSelector((s) => s.gallery.config);
	const metadata = useSelector((s) => s.gallery.metadata || {});
	const slug = String(
		config?.template?.templateLayout || 'split-stack'
	).trim();
	const Preset = TEMPLATE_PRESETS[slug] || TemplateSplitStack;
	const viewport = useTemplateViewport(config);

	const { slotted, overflowCount } = useMemo(
		() => mapTemplateItems(items, slug),
		[items, slug]
	);

	const showOverflowNotice =
		isSettingsEditorPreview(metadata) && overflowCount > 0;

	return (
		<div
			className={[
				'modula-items',
				'modula-template',
				`modula-template--${slug}`,
				`modula-template--vp-${viewport}`,
			].join(' ')}
			data-template-viewport={viewport}
		>
			{showOverflowNotice ? (
				<p className="modula-template__overflow-notice" role="status">
					{sprintf(
						/* translators: %d: number of hidden gallery images */
						__(
							'This template shows a fixed number of slots. %d extra image(s) are hidden on the front end.',
							'modula-best-grid-gallery'
						),
						overflowCount
					)}
				</p>
			) : null}
			<Preset slotted={slotted} config={config} />
		</div>
	);
}
