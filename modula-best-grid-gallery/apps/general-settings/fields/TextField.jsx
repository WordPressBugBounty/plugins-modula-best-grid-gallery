import { TextControl } from '@wordpress/components';

export default function TextField({
	fieldState,
	field,
	handleChange,
	disabled = false,
}) {
	return (
		<TextControl
			type={field.inputType || 'text'}
			value={fieldState.state.value || ''}
			label={field.label}
			placeholder={field.placeholder}
			onChange={(val) => handleChange(val)}
			disabled={disabled}
			readOnly={field.readonly}
			help={
				field?.description ? (
					<span
						dangerouslySetInnerHTML={{
							__html: field.description,
						}}
					/>
				) : null
			}
			__nextHasNoMarginBottom={true}
			__next40pxDefaultSize={true}
		/>
	);
}
