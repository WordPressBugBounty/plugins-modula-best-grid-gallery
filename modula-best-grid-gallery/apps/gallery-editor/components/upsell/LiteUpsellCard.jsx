/**
 * Lite upsell in the settings panel (canvas "5 · Editor – Lite"): a locked
 * section's mini card (why, the plan line, the call to action and the
 * guarantee) or a locked rail tab's card (PRO pill, heading, pitch,
 * checklist, plan line, call to action, guarantee and the license key link).
 * The copy, plan and links come from `resolveLiteUpsell` /
 * `resolveCategoryLiteLock`; a part without a source is left out.
 */
import { __ } from '@wordpress/i18n';
import { Button, CheckIcon, PlanBadge } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';
import { litePlanLine } from '../../logic/liteUpsell';

/**
 * @param {Object}                                      props
 * @param {import('../../logic/liteUpsell').LiteUpsell} props.upsell
 * @param {'section'|'tab'}                             props.variant
 * @param {string}                                      [props.title] Tab card heading when the upsell has none.
 */
export default function LiteUpsellCard({ upsell, variant, title = '' }) {
	const heading = upsell.title || title;
	const isTab = variant === 'tab';
	const message = (isTab && upsell.pitch) || upsell.message || upsell.pitch;
	const planLine = litePlanLine(upsell.plan);

	return (
		<AdminUiScope>
			<div className={`modula-lite-upsell is-${variant}`}>
				{isTab ? (
					<>
						<span className="modula-lite-upsell__badge">
							<PlanBadge
								tone="outline"
								lock
								plan={__('PRO', 'modula-best-grid-gallery')}
							/>
						</span>
						{heading ? (
							<h3 className="modula-lite-upsell__title">
								{heading}
							</h3>
						) : null}
					</>
				) : null}
				<p className="modula-lite-upsell__message">{message}</p>
				{isTab && upsell.points.length > 0 ? (
					<ul className="modula-lite-upsell__points">
						{upsell.points.map((point) => (
							<li
								key={point.label}
								className="modula-lite-upsell__point"
							>
								<span className="modula-lite-upsell__check">
									<CheckIcon size={16} />
								</span>
								<span className="modula-lite-upsell__point-label">
									{point.label}
								</span>
								{point.tag ? (
									<span className="modula-lite-upsell__point-tag">
										{point.tag}
									</span>
								) : null}
							</li>
						))}
					</ul>
				) : null}
				{planLine ? (
					<span className="modula-lite-upsell__plan">{planLine}</span>
				) : null}
				<div className="modula-lite-upsell__actions">
					<Button
						variant="primary"
						href={upsell.href}
						target="_blank"
						rel="noopener noreferrer"
						className="modula-lite-upsell__cta"
					>
						{upsell.ctaLabel}
						<span className="modula-admin-sr-only">
							{__(
								'(opens in a new tab)',
								'modula-best-grid-gallery'
							)}
						</span>
					</Button>
					{upsell.guarantee ? (
						<span className="modula-lite-upsell__guarantee">
							{upsell.guarantee}
						</span>
					) : null}
					{isTab && upsell.licenseKeyUrl ? (
						<a
							className="modula-lite-upsell__license"
							href={upsell.licenseKeyUrl}
						>
							{__(
								'I already have a license key',
								'modula-best-grid-gallery'
							)}
						</a>
					) : null}
				</div>
			</div>
		</AdminUiScope>
	);
}
