import FilterNameListControl from '../FilterNameListControl';
import MediaAttachmentControl from '../MediaAttachmentControl';
import MediaUrlControl from '../MediaUrlControl';
import DefaultActiveFilterSelectControl from '../DefaultActiveFilterSelectControl';

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
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
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderMediaAttachmentKind({
	controlId,
	label,
	value,
	onChange,
	disabled,
	control,
}) {
	return (
		<MediaAttachmentControl
			id={controlId}
			label={label}
			value={value}
			onChange={onChange}
			disabled={disabled}
			control={control}
		/>
	);
}

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderMediaUrlKind({
	controlId,
	value,
	onChange,
	disabled,
	control,
	help,
}) {
	return (
		<MediaUrlControl
			id={controlId}
			value={value}
			onChange={onChange}
			disabled={disabled}
			control={control}
			help={help}
		/>
	);
}

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderDefaultActiveFilterKind({
	controlId,
	label,
	value,
	onChange,
	disabled,
	help,
}) {
	return (
		<DefaultActiveFilterSelectControl
			id={controlId}
			label={label}
			value={value}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}
