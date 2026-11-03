/**
 * Redesign settings panel — section heading (STRUCTURE, CONTENT, …).
 */

/**
 * @param {Object}                    props
 * @param {string}                    props.label
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
				<h3 className="modula-settings-panel__section-heading">
					{heading}
				</h3>
			) : null}
			<div className="modula-settings-panel__section-body">
				{children}
			</div>
		</section>
	);
}
