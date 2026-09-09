import FieldRenderer from '../FieldRenderer';
import ButtonField from './ButtonField';
import styles from './ComboField.module.scss';

export function ComboField({
	option,
	field,
	form,
	handleChange,
	evaluateConditions,
}) {
	return (
		<>
			{field.fields.map((item, index) => {
				const isVisible = evaluateConditions(item.conditions);

				if (item.type === 'button') {
					return (
						<ButtonField
							key={index}
							field={item}
							disabled={!isVisible}
						/>
					);
				}

				if (!isVisible) {
					return null;
				}

				const sizeClass = item.size ? styles[item.size] : '';

				return (
					<div
						key={item?.name || index}
						className={`${styles.comboFieldItem} ${sizeClass}`}
					>
						<form.Field
							name={option ? `${option}.${item.name}` : item.name}
						>
							{(fieldState) => (
								<FieldRenderer
									field={item}
									fieldState={fieldState}
									handleChange={handleChange}
									disabled={!isVisible}
									description={field.description}
								/>
							)}
						</form.Field>
					</div>
				);
			})}
		</>
	);
}
