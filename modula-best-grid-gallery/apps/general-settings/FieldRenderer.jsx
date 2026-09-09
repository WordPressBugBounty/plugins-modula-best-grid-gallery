import ToggleField from './fields/ToggleField';
import ToggleOptionsField from './fields/ToggleOptionsField';
import SelectField from './fields/SelectField';
import TextField from './fields/TextField';
import NumberField from './fields/NumberField';
import RadioField from './fields/RadioField';
import TextareaField from './fields/TextareaField';
import CodeEditorField from './fields/CodeEditorField';
import RadioGroupField from './fields/RadioGroupField';
import RangeSelect from './fields/RangeSelect';
import ImageField from './fields/ImageSelectField';
import ImportCheckboxGroupField from './fields/ImportCheckboxGroupField';
import PostPickerField from './fields/PostPickerField';
import Paragraph from './fields/Paragraph';

const FieldRenderer = ({
	field,
	fieldState,
	handleChange,
	disabled = false,
}) => {
	const isDisabled = disabled || field.readonly || field.disabled;

	switch (field.type) {
		case 'toggle':
			return (
				<ToggleField
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
					disabled={isDisabled}
				/>
			);
		case 'options_toggle':
			return (
				<ToggleOptionsField
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
					trueValue={field.trueValue}
					falseValue={field.falseValue}
					disabled={isDisabled}
				/>
			);
		case 'select':
			return (
				<SelectField
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
					disabled={isDisabled}
				/>
			);
		case 'text':
			return (
				<TextField
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
					disabled={isDisabled}
				/>
			);
		case 'number':
			return (
				<NumberField
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
					disabled={isDisabled}
				/>
			);
		case 'radio':
			return (
				<RadioField
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
				/>
			);
		case 'textarea':
			return (
				<TextareaField
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
				/>
			);
		case 'code_editor':
			return (
				<CodeEditorField
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
				/>
			);
		case 'ia_radio':
			return (
				<RadioGroupField
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
				/>
			);
		case 'range_select':
			return (
				<RangeSelect
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
				/>
			);
		case 'image_select':
			return (
				<ImageField
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
				/>
			);
		case 'checkbox_group':
			return (
				<ImportCheckboxGroupField
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
				/>
			);
		case 'post_picker':
			return (
				<PostPickerField
					fieldState={fieldState}
					field={field}
					handleChange={(val) =>
						handleChange(fieldState, field.name, val)
					}
					disabled={isDisabled}
				/>
			);
		case 'paragraph':
			return <Paragraph fieldState={fieldState} field={field} />;
		default:
			return null;
	}
};

export default FieldRenderer;
