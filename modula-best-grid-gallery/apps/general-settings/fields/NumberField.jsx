import { TextControl } from '@wordpress/components';

export default function NumberField({
	fieldState,
	field,
	handleChange,
	className,
}) {
	return (
		<TextControl
			type="number"
			className={`modula_input_text ${className || ''}`}
			min={field.min}
			max={field.max}
			value={fieldState.state.value}
			onChange={(val) => handleChange(val)}
			__nextHasNoMarginBottom={true}
			__next40pxDefaultSize={true}
			label={field.label}
			help={field.description}
		/>
	);
}
