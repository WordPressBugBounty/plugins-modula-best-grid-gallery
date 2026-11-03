import { useId } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button } from '../button/Button';
import { CheckIcon } from '../icons/icons';
import { PlanBadge } from '../locked-card/LockedCard';

/**
 * @typedef {Object} UpsellPanelImage
 * @property {string}  src       An example picture's URL.
 * @property {string}  [caption] Shown under the image; none leaves it bare.
 * @property {boolean} [picked]  A green check on the image (a client's pick in Proofing).
 */

/**
 * The section upsell ("6 · Content – Lite"): what a Pro-only content
 * section shows without Pro. The PRO pill, title, text, the benefits with
 * checks, the plan that includes it ("Included in Trio") and the upgrade
 * link, beside three example images. No prices.
 *
 * The images only illustrate the text, so they are hidden from assistive
 * technology. The upgrade link opens `upgradeUrl` in a new tab.
 *
 * @param {Object}             props
 * @param {string}             props.title
 * @param {string}             props.text
 * @param {string[]}           props.benefits     Four in the design.
 * @param {UpsellPanelImage[]} props.images       Three in the design.
 * @param {string}             props.plan         Plan name, e.g. "Trio".
 * @param {string}             props.upgradeUrl
 * @param {string}             [props.licenseUrl] Adds "I already have a license key".
 * @param {string}             [props.note]       Muted line under the actions (the money-back guarantee).
 */
export function UpsellPanel({
	title,
	text,
	benefits,
	images,
	plan,
	upgradeUrl,
	licenseUrl = '',
	note = '',
}) {
	const titleId = `modula-admin-upsell-panel-title-${useId()}`;

	return (
		<section
			className="modula-admin-upsell-panel"
			aria-labelledby={titleId}
		>
			<div className="modula-admin-upsell-panel__copy">
				<PlanBadge
					plan={__('PRO', 'modula-best-grid-gallery')}
					tone="outline"
					lock
				/>
				<h2 id={titleId} className="modula-admin-upsell-panel__title">
					{title}
				</h2>
				<p className="modula-admin-upsell-panel__text">{text}</p>
				<ul className="modula-admin-upsell-panel__benefits">
					{benefits.map((benefit) => (
						<li key={benefit}>
							<CheckIcon size={18} />
							{benefit}
						</li>
					))}
				</ul>
				<p className="modula-admin-upsell-panel__plan">
					{sprintf(
						/* translators: %s: plan name, e.g. Trio. */
						__('Included in %s', 'modula-best-grid-gallery'),
						plan
					)}
				</p>
				<div className="modula-admin-upsell-panel__actions">
					<Button
						variant="primary"
						href={upgradeUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="modula-admin-upsell-panel__cta"
					>
						{sprintf(
							/* translators: %s: plan name, e.g. Trio. */
							__('Get %s', 'modula-best-grid-gallery'),
							plan
						)}
						<span className="modula-admin-sr-only">
							{__(
								'(opens in a new tab)',
								'modula-best-grid-gallery'
							)}
						</span>
					</Button>
					{licenseUrl ? (
						<Button variant="link" href={licenseUrl}>
							{__(
								'I already have a license key',
								'modula-best-grid-gallery'
							)}
						</Button>
					) : null}
				</div>
				{note ? (
					<p className="modula-admin-upsell-panel__note">{note}</p>
				) : null}
			</div>
			<div
				className="modula-admin-upsell-panel__images"
				aria-hidden="true"
			>
				{/* A fixed list, and two examples may share a picture. */}
				{images.map((image, index) => (
					<figure
						key={index}
						className="modula-admin-upsell-panel__image"
					>
						<div className="modula-admin-upsell-panel__frame">
							<img src={image.src} alt="" />
							{image.picked ? (
								<span className="modula-admin-upsell-panel__picked">
									<CheckIcon size={14} />
								</span>
							) : null}
						</div>
						{image.caption ? (
							<figcaption>{image.caption}</figcaption>
						) : null}
					</figure>
				))}
			</div>
		</section>
	);
}
