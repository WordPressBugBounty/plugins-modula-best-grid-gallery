import PlaceholderPatternControl from '../PlaceholderPatternControl';
import { isNil } from '../../../logic/isNil';

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderPlaceholderPatternKind({
	control,
	controlId,
	value,
	onChange,
	disabled,
	help,
}) {
	return (
		<PlaceholderPatternControl
			id={controlId}
			control={control || {}}
			value={isNil(value) ? '' : value}
			onChange={onChange}
			disabled={disabled}
			help={help}
		/>
	);
}
