import PlaceholderPatternControl from '../PlaceholderPatternControl';
import { isNil } from '../../../logic/isNil';

/**
 * @param {Object}           ctx
 * @param {Object}           ctx.control
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderPlaceholderPatternKind({
	control,
	value,
	onChange,
	disabled,
	help,
}) {
	return (
		<PlaceholderPatternControl
			control={control || {}}
			value={isNil(value) ? '' : value}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}
