import { RangeControl } from '@wordpress/components';

export default function RangeSelect({
	fieldState,
	field,
	handleChange,
	className,
}) {
	return (
		<RangeControl
			className={`modula_input_range ${className || ''}`}
			initialPosition={fieldState.state.value}
			value={fieldState.state.value}
			onChange={(val) => handleChange(val)}
			max={field?.max || 100}
			min={field?.min || 0}
			__nextHasNoMarginBottom={true}
			__next40pxDefaultSize={true}
			label={field.label}
			help={field.description}
		/>
	);
}
