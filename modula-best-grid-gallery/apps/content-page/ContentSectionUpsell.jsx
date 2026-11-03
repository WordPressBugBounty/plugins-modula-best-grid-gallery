import { UpsellPanel } from 'admin-ui';
import { getSectionUpsell } from './contentSections';

/**
 * A Pro-only content section without Pro: its section upsell in place of the
 * list, upgrading through the bootstrap's `upgradeUrl`.
 *
 * @param {Object} props
 * @param {string} props.section    Albums, Proofing, Presets or Licenses.
 * @param {string} props.imagesUrl  Base URL of the example images.
 * @param {string} props.upgradeUrl
 */
export function ContentSectionUpsell({ section, imagesUrl, upgradeUrl }) {
	const upsell = getSectionUpsell(section, imagesUrl);
	if (!upsell) {
		return null;
	}

	return (
		<div className="modula-content-page__upsell">
			<UpsellPanel {...upsell} upgradeUrl={upgradeUrl} />
		</div>
	);
}
