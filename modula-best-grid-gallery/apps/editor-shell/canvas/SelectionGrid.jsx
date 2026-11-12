/**
 * Selection mode (canvas "1 · Editor"): the canvas body gives way to a grid of
 * square checkbox thumbnails, one per item the editor lets the user pick. A
 * click or Space toggles a thumbnail; the editor's toggle receives Shift for a
 * range. Styled by `_selection-grid.scss`.
 */

/**
 * @typedef {{ key: number, src: string, name: string }} SelectionGridThumb
 */

/**
 * @param {Object}                                                props
 * @param {SelectionGridThumb[]}                                  props.thumbs     Items in canvas order; `name` is each checkbox's accessible name.
 * @param {string}                                                props.label      The group's accessible name ("Select images").
 * @param {(key: number) => boolean}                              props.isSelected
 * @param {(key: number, options: { shiftKey: boolean }) => void} props.onToggle
 */
export default function SelectionGrid({ thumbs, label, isSelected, onToggle }) {
	// The canvas body clips; the grid scrolls in its own region, as the
	// editor's preview does in every other canvas mode.
	return (
		<div className="modula-takeover__selection-grid-scroll">
			<div
				className="modula-takeover__selection-grid"
				role="group"
				aria-label={label}
			>
				{thumbs.map((thumb) => (
					<button
						key={thumb.key}
						type="button"
						role="checkbox"
						aria-checked={isSelected(thumb.key)}
						aria-label={thumb.name}
						className="modula-takeover__selection-thumb"
						onClick={(event) =>
							onToggle(thumb.key, { shiftKey: event.shiftKey })
						}
					>
						{thumb.src ? (
							<img src={thumb.src} alt="" loading="lazy" />
						) : null}
						<span
							className="modula-takeover__selection-thumb-check"
							aria-hidden="true"
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								focusable="false"
							>
								<path d="M5 12l5 5 9-10" />
							</svg>
						</span>
					</button>
				))}
			</div>
		</div>
	);
}
