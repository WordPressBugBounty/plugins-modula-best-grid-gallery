import { __ } from '@wordpress/i18n';
import { PageTabs, PlanBadge } from 'admin-ui';

/**
 * The content sections as tabs under the header. All, Galleries, Albums and
 * Proofing switch the list in place, as do the section upsells without Pro
 * (PRO pill, no count); Presets and Licenses link to Pro's screens.
 *
 * @param {Object}                                       props
 * @param {import('./contentSections').ContentSection[]} props.sections
 * @param {string}                                       props.current  Section shown.
 * @param {(slug: string) => void}                       props.onSelect
 */
export function ContentSectionTabs({ sections, current, onSelect }) {
	const pill = (
		<PlanBadge
			plan={__('PRO', 'modula-best-grid-gallery')}
			tone="outline"
			lock
		/>
	);

	return (
		<PageTabs
			current={current}
			label={__('Content sections', 'modula-best-grid-gallery')}
			onSelect={onSelect}
			tabs={sections.map((section) => ({
				slug: section.slug,
				label: section.label,
				href: section.href,
				count: section.count,
				badge: section.upsell ? pill : null,
			}))}
		/>
	);
}
