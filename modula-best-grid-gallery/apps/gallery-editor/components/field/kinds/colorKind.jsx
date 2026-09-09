import CompactColorControl from '../CompactColorControl';

/**
 * @param {Object}           ctx
 * @param {Object}           [ctx.control]
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderColorKind({ control, value, onChange, disabled, help }) {
	const enableAlpha = Boolean(control?.acceptAlpha);
	const clearable = Boolean(control?.clearable);
	return (
		<div
			className={`modula-settings-editor__color-picker modula-settings-editor__color-picker--swatch${
				disabled ? ' is-disabled' : ''
			}`}
			aria-disabled={disabled || undefined}
		>
			<CompactColorControl
				value={value}
				onChange={onChange}
				disabled={disabled}
				enableAlpha={enableAlpha}
				clearable={clearable}
				variant="swatch"
			/>
			{help ? (
				<p className="modula-settings-editor__color-picker-help">
					{help}
				</p>
			) : null}
		</div>
	);
}
