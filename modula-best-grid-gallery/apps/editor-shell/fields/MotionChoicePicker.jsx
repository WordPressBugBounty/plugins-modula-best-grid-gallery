/**
 * The Motion tab's Entrance and Hover menus (`motion.entrance`,
 * `motion.hover`), in the gallery editor and the Albums editor: a menu
 * select of the catalog's choices, with the recommendation first and the PRO
 * pill on locked presets. The Entrance menu adds a replay button joined to
 * the menu's end, and plays the option the pointer or focus rests on (peek).
 * Each editor builds the options (gallery-shared `createMotionCatalog`) and
 * says what replay and peek play on its canvas.
 */
import { useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { PlanBadge } from 'admin-ui';
import SelectMenuControl from './SelectMenuControl';

/** A highlighted option plays once the pointer rests on it (the design's peek delay). */
const PEEK_DELAY_MS = 250;

/** The artboard's replay arrow. */
const ReplayIcon = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		focusable="false"
	>
		<path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
		<path d="M3 3v5h5" />
	</svg>
);

/**
 * @typedef {Object} MotionChoicePickerReplay
 * @property {string}     label    Names the button ("Replay Flip wave").
 * @property {() => void} onReplay Plays the chosen entrance again.
 */

/**
 * @param {Object}                                                             props
 * @param {string}                                                             props.id
 * @param {string}                                                             props.label         Setting name.
 * @param {string}                                                             props.value         Stored choice.
 * @param {import('gallery-shared/motion/motionCatalog').MotionChoiceOption[]} props.options       The menu, from gallery-shared `createMotionCatalog`.
 * @param {Function}                                                           props.onChange
 * @param {boolean}                                                            [props.disabled]
 * @param {string}                                                             [props.describedBy]
 * @param {string}                                                             [props.classBlock]  The editor's class block (`SelectMenuControl`).
 * @param {MotionChoicePickerReplay|null}                                      [props.replay]      The replay button; none without it.
 * @param {(choice: string) => void}                                           [props.onPeek]      Plays a highlighted option.
 */
export default function MotionChoicePicker({
	id,
	label,
	value,
	options,
	onChange,
	disabled = false,
	describedBy,
	classBlock,
	replay = null,
	onPeek,
}) {
	const peekTimerRef = useRef(0);
	const cancelPeek = () => window.clearTimeout(peekTimerRef.current);
	useEffect(() => cancelPeek, []);

	const peek = onPeek
		? (choice) => {
				cancelPeek();
				peekTimerRef.current = window.setTimeout(
					() => onPeek(choice),
					PEEK_DELAY_MS
				);
			}
		: undefined;

	const menu = (
		<SelectMenuControl
			id={id}
			label={label}
			value={value}
			classBlock={classBlock}
			groups={[
				{
					id: 'default',
					options: options.map((option) => ({
						...option,
						badge: option.pro ? (
							<PlanBadge
								tone="outline"
								lock
								plan={__('PRO', 'modula-best-grid-gallery')}
							/>
						) : undefined,
					})),
				},
			]}
			onChange={onChange}
			onHighlight={peek}
			onOpenChange={(open) => {
				if (!open) {
					cancelPeek();
				}
			}}
			disabled={disabled}
			describedBy={describedBy}
		/>
	);

	if (!replay) {
		return menu;
	}
	return (
		<div className="modula-settings-panel__entrance-picker">
			{menu}
			<button
				type="button"
				className="modula-settings-panel__entrance-replay"
				aria-label={replay.label}
				title={replay.label}
				disabled={disabled}
				onClick={replay.onReplay}
			>
				<ReplayIcon />
			</button>
		</div>
	);
}
