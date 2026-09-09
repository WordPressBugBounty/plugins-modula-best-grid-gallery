import { ToggleControl } from '@wordpress/components';

export default function ToggleField({
	fieldState,
	field,
	handleChange,
	disabled,
}) {
	return (
		<ToggleControl
			checked={
				fieldState.state.value === 'enabled' ||
				fieldState.state.value === true ||
				fieldState.state.value === 1 ||
				fieldState.state.value === 'true' ||
				fieldState.state.value === 'on' ||
				fieldState.state.value === '1'
			}
			onChange={(val) => handleChange(val)}
			disabled={disabled}
			label={field?.label || undefined}
			help={field?.description || undefined}
			__nextHasNoMarginBottom={true}
			__next40pxDefaultSize={true}
		/>
	);
}
