/**
 * Redesign settings panel — section heading (STRUCTURE, CONTENT, …).
 */
import { SectionHeading } from 'shared-ui';

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {import('react').ReactNode} [props.children]
 */
export default function SettingsPanelSection({ label, children }) {
	const heading = typeof label === 'string' ? label.trim() : '';
	if (!heading && !children) {
		return null;
	}

	return (
		<section className="modula-settings-panel__section">
			{heading ? (
				<SectionHeading className="modula-settings-panel__section-heading">
					{heading}
				</SectionHeading>
			) : null}
			<div className="modula-settings-panel__section-body">
				{children}
			</div>
		</section>
	);
}
