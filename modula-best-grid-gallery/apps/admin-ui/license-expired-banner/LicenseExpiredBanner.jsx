import { __, _n, sprintf } from '@wordpress/i18n';
import { Button } from '../button/Button';
import { LockIcon } from '../icons/icons';

/**
 * @typedef {'canvas' | 'page'} LicenseExpiredBannerVariant
 */

/**
 * The editor's lines under "PRO license expired", by license state.
 *
 * @param {string} licenseState
 * @return {string} '' when the license has not expired.
 */
function canvasLine(licenseState) {
	switch (licenseState) {
		case 'renewal_grace':
			return __(
				'Your PRO features still work for a short while. Renew to keep them.',
				'modula-best-grid-gallery'
			);
		case 'expired':
			return __(
				'PRO features are locked until you renew.',
				'modula-best-grid-gallery'
			);
		default:
			return '';
	}
}

/**
 * The Content page's sentence after "Your PRO license expired.", by license
 * state. In renewal grace the galleries can still be edited, so it does not
 * say they are locked.
 *
 * @param {string} licenseState
 * @param {number} count        Galleries that use PRO features.
 * @return {string} '' when the license has not expired.
 */
function pageLine(licenseState, count) {
	switch (licenseState) {
		case 'renewal_grace':
			return sprintf(
				/* translators: %d: number of galleries. */
				_n(
					'%d gallery uses PRO features. You can still edit it for a short while. Renew to keep editing it.',
					'%d galleries use PRO features. You can still edit them for a short while. Renew to keep editing them.',
					count,
					'modula-best-grid-gallery'
				),
				count
			);
		case 'expired':
			return sprintf(
				/* translators: %d: number of galleries. */
				_n(
					'%d gallery uses PRO features. Visitors still see it, but you can’t edit it until you renew.',
					'%d galleries use PRO features. Visitors still see them, but you can’t edit them until you renew.',
					count,
					'modula-best-grid-gallery'
				),
				count
			);
		default:
			return '';
	}
}

/**
 * The banner while the site's Modula PRO license has expired, in renewal
 * grace (its features still work) and after it. `canvas` is the gallery
 * editor's strip under the canvas toolbar: a lock in a dark circle, "PRO
 * license expired" and a line. `page` is the Content page's box above the
 * toolbar ("6 · Content – Lite"): one sentence with the number of galleries
 * that use PRO features. Any other `licenseState` renders nothing; the
 * caller decides whether a license exists at all.
 *
 * Renew PRO opens `renewHref` in a new tab.
 *
 * @param {Object}                      props
 * @param {string}                      props.licenseState       `expired` or `renewal_grace`.
 * @param {string}                      props.renewHref
 * @param {LicenseExpiredBannerVariant} [props.variant='canvas']
 * @param {number}                      [props.count=0]          `page` only: galleries that use PRO features.
 * @param {string}                      [props.className]        Placement in the host layout.
 */
export function LicenseExpiredBanner({
	licenseState,
	renewHref,
	variant = 'canvas',
	count = 0,
	className = '',
}) {
	const isPage = 'page' === variant;
	const line = isPage
		? pageLine(licenseState, count)
		: canvasLine(licenseState);
	if ('' === line) {
		return null;
	}
	const classes = ['modula-admin-license-banner', `is-${variant}`, className]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classes} role="status">
			<span
				className="modula-admin-license-banner__lock"
				aria-hidden="true"
			>
				<LockIcon size={isPage ? 18 : 15} />
			</span>
			{isPage ? (
				<p className="modula-admin-license-banner__text">
					<strong>
						{__(
							'Your PRO license expired.',
							'modula-best-grid-gallery'
						)}
					</strong>{' '}
					{line}
				</p>
			) : (
				<div className="modula-admin-license-banner__text">
					<strong>
						{__('PRO license expired', 'modula-best-grid-gallery')}
					</strong>
					<span>{line}</span>
				</div>
			)}
			<Button
				variant="primary"
				href={renewHref}
				target="_blank"
				rel="noopener noreferrer"
				className="modula-admin-license-banner__renew"
			>
				{__('Renew PRO', 'modula-best-grid-gallery')}
				<span className="modula-admin-sr-only">
					{__('(opens in a new tab)', 'modula-best-grid-gallery')}
				</span>
			</Button>
		</div>
	);
}
