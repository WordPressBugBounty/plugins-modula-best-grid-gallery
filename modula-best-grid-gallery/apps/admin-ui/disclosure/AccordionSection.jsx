import { useId } from '@wordpress/element';
import { ChevronDownIcon } from '../icons/icons';
import { ResetButton } from '../reset-button/ResetButton';

/**
 * The bordered list that holds AccordionSections ("More settings"), with a
 * divider between sections.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children    AccordionSections.
 * @param {string}                    [props.className]
 */
export function Accordion({ children, className = '' }) {
	return (
		<div
			className={['modula-admin-accordion', className]
				.filter(Boolean)
				.join(' ')}
		>
			{children}
		</div>
	);
}

/**
 * A section that expands in place: a heading whose button (title, badge,
 * chevron) toggles the panel and exposes `aria-expanded`. With `onReset`, a
 * reset dot before the button resets the section; it sits outside the
 * button, so each is its own tab stop. The panel stays mounted but hidden
 * while closed.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.title
 * @param {boolean}                   props.open
 * @param {Function}                  props.onOpenChange     Receives the next boolean.
 * @param {import('react').ReactNode} [props.icon]           Decorative icon first in the header, e.g. `<SubgroupIcon />` on a box of dependent settings.
 * @param {import('react').ReactNode} [props.badge]          After the title, inside the toggle button, so not interactive: `<PlanBadge tone="outline" lock plan="PRO" />` without `onClick`.
 * @param {Function}                  [props.onReset]        Shows the reset dot; render it only while the section has changes.
 * @param {string}                    [props.resetLabel]     Required with `onReset` ("Reset Lightbox to defaults").
 * @param {2|3|4|5|6}                 [props.headingLevel=3]
 * @param {import('react').ReactNode} props.children
 */
export function AccordionSection({
	title,
	open,
	onOpenChange,
	icon = null,
	badge = null,
	onReset,
	resetLabel = '',
	headingLevel = 3,
	children,
}) {
	const panelId = `modula-admin-accordion-${useId()}`;
	const Heading = `h${headingLevel}`;

	return (
		<section
			className={[
				'modula-admin-accordion__section',
				open ? 'is-open' : '',
			]
				.filter(Boolean)
				.join(' ')}
		>
			<div className="modula-admin-accordion__head">
				{icon ? (
					<span
						className="modula-admin-accordion__icon"
						aria-hidden="true"
					>
						{icon}
					</span>
				) : null}
				{onReset ? (
					<ResetButton label={resetLabel} onReset={onReset} />
				) : null}
				<Heading className="modula-admin-accordion__heading">
					<button
						type="button"
						className="modula-admin-accordion__toggle"
						aria-expanded={open}
						aria-controls={panelId}
						onClick={() => onOpenChange(!open)}
					>
						<span className="modula-admin-accordion__title">
							{title}
						</span>
						{badge}
						<span
							className="modula-admin-accordion__chevron"
							aria-hidden="true"
						>
							<ChevronDownIcon />
						</span>
					</button>
				</Heading>
			</div>
			<div
				id={panelId}
				className="modula-admin-accordion__panel"
				hidden={!open}
			>
				{children}
			</div>
		</section>
	);
}
