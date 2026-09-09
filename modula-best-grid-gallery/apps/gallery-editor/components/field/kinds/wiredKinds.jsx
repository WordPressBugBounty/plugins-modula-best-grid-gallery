import FilterNameListControl from '../FilterNameListControl';
import MediaAttachmentControl from '../MediaAttachmentControl';
import MediaUrlControl from '../MediaUrlControl';
import DefaultActiveFilterSelectControl from '../DefaultActiveFilterSelectControl';

/**
 * @param {Object}           ctx
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderFilterNameListKind({ value, onChange, disabled, help }) {
	return (
		<FilterNameListControl
			value={value}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}

/**
 * @param {Object}   ctx
 * @param {Object}   ctx.control
 * @param {*}        ctx.value
 * @param {Function} ctx.onChange
 * @param {boolean}  ctx.disabled
 */
export function renderMediaAttachmentKind({
	value,
	onChange,
	disabled,
	control,
}) {
	return (
		<MediaAttachmentControl
			value={value}
			onChange={onChange}
			disabled={disabled}
			control={control}
		/>
	);
}

/**
 * @param {Object}           ctx
 * @param {Object}           ctx.control
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderMediaUrlKind({
	value,
	onChange,
	disabled,
	control,
	help,
}) {
	return (
		<MediaUrlControl
			value={value}
			onChange={onChange}
			disabled={disabled}
			control={control}
			help={help}
		/>
	);
}

/**
 * @param {Object}           ctx
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderDefaultActiveFilterKind({
	value,
	onChange,
	disabled,
	help,
}) {
	return (
		<DefaultActiveFilterSelectControl
			value={value}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}
