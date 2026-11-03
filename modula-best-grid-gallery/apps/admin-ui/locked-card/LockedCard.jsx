import { __, sprintf } from '@wordpress/i18n';
import { Button } from '../button/Button';
import { LockIcon } from '../icons/icons';
import { SettingsCard } from '../settings-card/SettingsCard';

/**
 * @typedef {'plan' | 'outline' | 'solid'} PlanBadgeTone
 */

/**
 * Plan pill: the plan name after a card title (Trio, Business, Starter), or
 * the editor's PRO pill with a lock. `outline` is the quiet pill in a
 * section header; `solid` is the dark pill on a locked setting. With
 * `onClick` it is a button (it opens the upsell), so give it an
 * `aria-label` that says what it does ("Image focus needs PRO. See plans").
 *
 * @param {Object}        props
 * @param {string}        props.plan          Plan name, or "PRO".
 * @param {PlanBadgeTone} [props.tone='plan']
 * @param {boolean}       [props.lock]        Lock icon before the name.
 * @param {Function}      [props.onClick]
 * @param {string}        [props.className]
 */
export function PlanBadge({
	plan,
	tone = 'plan',
	lock = false,
	onClick,
	className = '',
	...rest
}) {
	const classes = [
		'modula-admin-plan-badge',
		`is-${tone}`,
		onClick ? 'is-action' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');
	const content = (
		<>
			{lock ? <LockIcon size={11} strokeWidth={2.4} /> : null}
			{plan}
		</>
	);

	if (!onClick) {
		return (
			<span className={classes} {...rest}>
				{content}
			</span>
		);
	}

	return (
		<button type="button" className={classes} onClick={onClick} {...rest}>
			{content}
		</button>
	);
}

/**
 * A Pro-owned settings card shown in Lite: the real controls stay visible but
 * a disabled fieldset turns them all off natively, and a footer row offers
 * the upgrade.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.title
 * @param {string}                    props.plan        Plan name for the badge and footer.
 * @param {string}                    props.upgradeHref
 * @param {import('react').ReactNode} [props.note]
 * @param {import('react').ReactNode} props.children    The card's rows, rendered disabled.
 */
export function LockedCard({
	title,
	plan,
	upgradeHref,
	note = null,
	children,
}) {
	const footer = (
		<div className="modula-admin-locked__footer">
			<span className="modula-admin-locked__lock" aria-hidden="true">
				<LockIcon />
			</span>
			<span className="modula-admin-locked__text">
				{sprintf(
					/* translators: %s: plan name, e.g. Trio. */
					__(
						'Available with the %s plan.',
						'modula-best-grid-gallery'
					),
					plan
				)}
			</span>
			<Button
				variant="primary"
				href={upgradeHref}
				target="_blank"
				rel="noopener noreferrer"
			>
				{__('Upgrade', 'modula-best-grid-gallery')}
				<span className="modula-admin-sr-only">
					{__('(opens in a new tab)', 'modula-best-grid-gallery')}
				</span>
			</Button>
		</div>
	);

	return (
		<SettingsCard
			title={title}
			badge={<PlanBadge plan={plan} />}
			note={note}
			footer={footer}
			className="is-locked"
		>
			<fieldset className="modula-admin-locked__fieldset" disabled>
				{children}
			</fieldset>
		</SettingsCard>
	);
}
