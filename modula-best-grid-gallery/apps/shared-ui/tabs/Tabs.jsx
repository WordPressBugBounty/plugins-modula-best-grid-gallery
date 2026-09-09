/**
 * @typedef {{ value: string, label: string, dirty?: boolean, disabled?: boolean }} TabsOption
 */

/**
 * Text tabs (device switchers, etc.) — not the chrome-track Segmented control.
 * Active tab: line border + accent circle. Dirty is class-only (no dot on inactive).
 *
 * @param {Object}       props
 * @param {TabsOption[]} props.options
 * @param {string}       props.value
 * @param {Function}     props.onChange Receives option value string
 * @param {boolean}      [props.disabled]
 * @param {string}       [props.className]
 * @param {string}       [props['aria-label']]
 */
export function Tabs({
	options = [],
	value,
	onChange,
	disabled = false,
	className = '',
	'aria-label': ariaLabel,
}) {
	const classes = ['modula-ui-tabs', className].filter(Boolean).join(' ');

	return (
		<div className={classes} role="tablist" aria-label={ariaLabel}>
			{options.map((opt) => {
				const key = String(opt.value);
				const isActive = String(value) === key;
				const isDisabled = disabled || Boolean(opt.disabled);
				const dirty = Boolean(opt.dirty);
				return (
					<button
						key={key}
						type="button"
						role="tab"
						className={[
							'modula-ui-tabs__tab',
							isActive ? 'is-active' : '',
							dirty ? 'is-dirty' : '',
						]
							.filter(Boolean)
							.join(' ')}
						aria-selected={isActive}
						disabled={isDisabled}
						onClick={() => {
							if (!isDisabled && typeof onChange === 'function') {
								onChange(key);
							}
						}}
					>
						{isActive ? (
							<span
								className="modula-ui-tabs__dot"
								aria-hidden="true"
							/>
						) : null}
						<span className="modula-ui-tabs__label">
							{opt.label}
						</span>
					</button>
				);
			})}
		</div>
	);
}
