/**
 * Redesign settings panel — exit cross-link (Elsewhere → Interaction).
 */
import { __ } from '@wordpress/i18n';
import { Icon, external } from '@wordpress/icons';

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.targetLabel
 * @param {() => void} props.onActivate
 */
export default function SettingsPanelExitRow({
	label,
	targetLabel,
	onActivate,
}) {
	return (
		<button
			type="button"
			className="modula-settings-panel__exit-row"
			onClick={onActivate}
		>
			<span className="modula-settings-panel__exit-row-label">
				{label}
			</span>
			<span className="modula-settings-panel__exit-row-target">
				{targetLabel || __('Open', 'modula-best-grid-gallery')}
				<Icon icon={external} size={14} aria-hidden="true" />
			</span>
		</button>
	);
}
