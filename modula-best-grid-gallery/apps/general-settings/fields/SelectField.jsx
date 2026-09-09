import { SelectControl } from '@wordpress/components';

export default function SelectField({
	fieldState,
	field,
	handleChange,
	className,
	disabled,
}) {
	return (
		<>
			<SelectControl
				className={`modula_input_select ${className || ''}`}
				value={fieldState.state.value}
				options={field.options.map((option) => ({
					label: option.label,
					value: option.value,
				}))}
				onChange={(val) => handleChange(val)}
				disabled={disabled}
				label={field.label}
				readOnly={field?.readonly ?? false}
				help={field.description}
				__nextHasNoMarginBottom={true}
				__next40pxDefaultSize={true}
			/>
		</>
	);
}
