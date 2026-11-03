/**
 * A setting Lite locks (`editorOmitControlInLite` with a Lite upsell): its
 * label and a PRO pill that opens the upsell popover next to it, in place of
 * the row. Any other setting renders its own row (`children`).
 */
import { __, sprintf } from '@wordpress/i18n';
import { PlanBadge } from 'admin-ui';
import { AdminUiScope, DependentRowIcon } from 'editor-shell';
import { useOpenLiteUpsell } from '../../../context/LiteUpsellContext';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import { resolveHubV2FieldLabel } from '../../../constants/sidebarV2Meta';
import { resolveLiteUpsell } from '../../../logic/liteUpsell';
import { resolveOmitControlInLite } from '../../../logic/proGateLock';

/**
 * @param {Object}                    props
 * @param {Object}                    props.field    Enriched schema field.
 * @param {import('react').ReactNode} props.children The setting's row.
 */
export default function SettingsPanelLiteLock({ field, children }) {
	const editor = useModulaSettingsEditorConfig();
	const openLiteUpsell = useOpenLiteUpsell();
	const upsell =
		openLiteUpsell && resolveOmitControlInLite(field.schema, editor)
			? resolveLiteUpsell(field.schema, editor)
			: null;
	if (!upsell) {
		return children;
	}
	const label = resolveHubV2FieldLabel(field);

	return (
		<div className="modula-settings-panel__locked-row">
			<DependentRowIcon />
			<span className="modula-settings-panel__locked-row-label">
				{label}
			</span>
			<AdminUiScope>
				<PlanBadge
					tone="solid"
					lock
					plan={__('PRO', 'modula-best-grid-gallery')}
					aria-label={sprintf(
						/* translators: %s: setting name. */
						__(
							'%s needs PRO. See what it includes',
							'modula-best-grid-gallery'
						),
						label
					)}
					aria-haspopup="dialog"
					onClick={(event) =>
						openLiteUpsell(
							{ ...upsell, feature: label },
							event.currentTarget
						)
					}
				/>
			</AdminUiScope>
		</div>
	);
}
