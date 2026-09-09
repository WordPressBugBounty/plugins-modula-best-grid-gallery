import { ToggleControl } from '@wordpress/components';

export default function ToggleOptionsField({
	fieldState,
	field,
	handleChange,
	trueValue = 'enabled',
	falseValue = 'disabled',
	disabled = false,
}) {
	const isChecked = fieldState.state.value === trueValue;
	const handleToggle = (checked) => {
		handleChange(checked ? trueValue : falseValue);
	};
	return (
		<>
			<ToggleControl
				checked={isChecked}
				onChange={handleToggle}
				disabled={disabled}
				label={field.label}
				help={field?.description}
				__nextHasNoMarginBottom={true}
				__next40pxDefaultSize={true}
			/>
		</>
	);
}
