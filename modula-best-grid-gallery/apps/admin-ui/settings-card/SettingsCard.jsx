import { useId } from '@wordpress/element';
import { SubgroupIcon } from '../icons/icons';

/**
 * Id of a SettingsRow's help text, for the control's `aria-describedby`.
 *
 * @param {string} controlId
 * @return {string} Help element id.
 */
export function rowHelpId(controlId) {
	return `${controlId}-help`;
}

/**
 * Id of a SettingsRow's label, for controls that a `<label for>` cannot name
 * (Segmented, CopyField): pass it as their `aria-labelledby`.
 *
 * @param {string} controlId
 * @return {string} Label element id.
 */
export function rowLabelId(controlId) {
	return `${controlId}-label`;
}

/**
 * Id of a SettingsRow's description (the line under its label), for the
 * control's `aria-describedby`.
 *
 * @param {string} controlId
 * @return {string} Description element id.
 */
export function rowDescriptionId(controlId) {
	return `${controlId}-description`;
}

/**
 * A settings card: a titled section with a bordered body of rows.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.badge]     Shown after the title (plan badge).
 * @param {import('react').ReactNode} [props.note]      Help text under the card.
 * @param {import('react').ReactNode} [props.footer]    Last row of the body, outside the content.
 * @param {string}                    [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function SettingsCard({
	title,
	badge = null,
	note = null,
	footer = null,
	className = '',
	children,
}) {
	const titleId = `modula-admin-card-${useId()}`;

	return (
		<section
			className={['modula-admin-card', className]
				.filter(Boolean)
				.join(' ')}
			aria-labelledby={titleId}
		>
			<div className="modula-admin-card__head">
				<h3 id={titleId} className="modula-admin-card__title">
					{title}
				</h3>
				{badge}
			</div>
			<div className="modula-admin-card__body">
				{children}
				{footer}
			</div>
			{note ? <p className="modula-admin-card__note">{note}</p> : null}
		</section>
	);
}

/**
 * One setting inside a card: label on the left, control on the right.
 * `stacked` puts the label above a full-width control (textarea).
 *
 * The label is a `<label for={controlId}>`, so give the control that id.
 * With `labelElement="span"` it becomes a span with `rowLabelId(controlId)`
 * for controls named by `aria-labelledby`.
 *
 * `description` is a short line under the label, in the label column (a
 * status, or a link such as "Get a key"); `help` spans the row below it.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.label
 * @param {string}                    props.controlId
 * @param {import('react').ReactNode} [props.description]  Shown under the label with `rowDescriptionId(controlId)`.
 * @param {import('react').ReactNode} [props.help]         Shown under the row with `rowHelpId(controlId)`.
 * @param {boolean}                   [props.stacked]
 * @param {'label'|'span'}            [props.labelElement]
 * @param {import('react').ReactNode} props.children
 */
export function SettingsRow({
	label,
	controlId,
	description = null,
	help = null,
	stacked = false,
	labelElement = 'label',
	children,
}) {
	const classes = ['modula-admin-row', stacked ? 'is-stacked' : '']
		.filter(Boolean)
		.join(' ');
	const labelNode =
		'span' === labelElement ? (
			<span
				id={rowLabelId(controlId)}
				className="modula-admin-row__label"
			>
				{label}
			</span>
		) : (
			<label htmlFor={controlId} className="modula-admin-row__label">
				{label}
			</label>
		);
	const heading = description ? (
		<div className="modula-admin-row__heading">
			{labelNode}
			<span
				id={rowDescriptionId(controlId)}
				className="modula-admin-row__description"
			>
				{description}
			</span>
		</div>
	) : (
		labelNode
	);

	return (
		<div className={classes}>
			<div className="modula-admin-row__main">
				{heading}
				<div className="modula-admin-row__control">{children}</div>
			</div>
			{help ? (
				<p id={rowHelpId(controlId)} className="modula-admin-row__help">
					{help}
				</p>
			) : null}
		</div>
	);
}

/**
 * Nested group of rows inside a card, shown when a parent setting is on
 * (Gallery address, License details).
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} props.children
 */
export function SettingsGroup({ title, children }) {
	const titleId = `modula-admin-group-${useId()}`;

	return (
		<div
			className="modula-admin-group"
			role="group"
			aria-labelledby={titleId}
		>
			<div id={titleId} className="modula-admin-group__head">
				<SubgroupIcon />
				{title}
			</div>
			{children}
		</div>
	);
}
