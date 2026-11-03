/**
 * @typedef {Object} PresetTile
 * @property {string}                    value         Reported to `onChange`.
 * @property {string}                    label         Tile text and name.
 * @property {string}                    [description] Line under the label.
 * @property {import('react').ReactNode} [preview]     Decorative picture above the label.
 * @property {import('react').ReactNode} [badge]       After the label, e.g. a PlanBadge (without `onClick`) for a locked preset.
 * @property {boolean}                   [disabled]    Turns this tile off.
 */

/**
 * One-of-several choice drawn as a grid of tiles (hover effects, layouts,
 * presets). Like Segmented, each tile is a pressed button, so name the group
 * with `aria-label` or `aria-labelledby`. A locked preset stays clickable
 * and shows its badge; the caller decides what picking it does (the upsell).
 *
 * @param {Object}       props
 * @param {PresetTile[]} props.options
 * @param {string}       props.value
 * @param {Function}     props.onChange    Receives the tile value.
 * @param {2|3|4}        [props.columns=2]
 * @param {boolean}      [props.disabled]
 * @param {string}       [props.className]
 */
export function PresetTiles({
	options = [],
	value,
	onChange,
	columns = 2,
	disabled = false,
	className = '',
	...rest
}) {
	return (
		<div
			className={[
				'modula-admin-preset-tiles',
				`has-${columns}-columns`,
				className,
			]
				.filter(Boolean)
				.join(' ')}
			role="group"
			{...rest}
		>
			{options.map((option) => {
				const optionValue = String(option.value);
				const isActive = String(value) === optionValue;

				return (
					<button
						key={optionValue}
						type="button"
						className={
							isActive
								? 'modula-admin-preset-tiles__tile is-active'
								: 'modula-admin-preset-tiles__tile'
						}
						aria-pressed={isActive}
						disabled={disabled || option.disabled === true}
						onClick={() => onChange?.(optionValue)}
					>
						{option.preview ? (
							<span
								className="modula-admin-preset-tiles__preview"
								aria-hidden="true"
							>
								{option.preview}
							</span>
						) : null}
						<span className="modula-admin-preset-tiles__label">
							{option.label}
							{option.badge ?? null}
						</span>
						{option.description ? (
							<span className="modula-admin-preset-tiles__description">
								{option.description}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}
