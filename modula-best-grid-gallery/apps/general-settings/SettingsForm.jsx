import { useForm, useStore } from '@tanstack/react-form';
import FieldRenderer from './FieldRenderer';
import AiSettingsForm from './ai-settings/ai-settings-form';
import ButtonField from './fields/ButtonField';
import Paragraph from './fields/Paragraph';
import { ComboField } from './fields/ComboField';
import { RoleField } from './fields/RoleField';
import UpsellBlock from './UpsellBlock';
import useStateContext from './context/useStateContext';
import { setOptions } from './context/actions';
import LockedForm from './LockedForm';
import styles from './SettingsForm.module.scss';
import OAuthField from './fields/OAuthField';
import SubmenuToggle from './SubMenuToggle';
import CredentialsGroup from './fields/CredentialsGroup';

function setDefaultValue(acc, option, name, defaultValue) {
	if (!name) {
		return acc;
	}

	if (name.includes('.')) {
		const [parent, child] = name.split('.');
		if (option) {
			acc[option] = acc[option] || {};
			acc[option][parent] = acc[option][parent] || {};
			acc[option][parent][child] = defaultValue ?? '';
		} else {
			acc[parent] = acc[parent] || {};
			acc[parent][child] = defaultValue ?? '';
		}
	} else if (option) {
		acc[option] = acc[option] || {};
		acc[option][name] = defaultValue ?? '';
	} else {
		acc[name] = defaultValue ?? '';
	}
}

export default function SettingsForm({ config, locked, badge }) {
	const { state, dispatch } = useStateContext();

	const { option, fields = [] } = config;

	const form = useForm({
		defaultValues: fields.reduce((acc, field) => {
			switch (field.type) {
				case 'combo':
					field.fields.forEach((comboField) => {
						setDefaultValue(
							acc,
							option,
							comboField.name,
							comboField.default
						);
					});
					break;
				case 'role':
					// Enable role field
					setDefaultValue(acc, option, field.name, field.default);
					// Capabilities
					field.fields.forEach((comboField) => {
						setDefaultValue(
							acc,
							option,
							comboField.name,
							comboField.default
						);
					});
					break;

				case 'button':
				case 'paragraph':
				case 'oauth':
				case 'credentials_group':
					field.fields?.forEach((subField) => {
						setDefaultValue(
							acc,
							option,
							subField.name,
							subField.default
						);
					});
					break;
				default:
					setDefaultValue(acc, option, field.name, field.default);
					break;
			}

			return acc;
		}, {}),
	});

	const values = form.store.state.values;
	const formValues = option ? values[option] || {} : values;

	const handleSave = (opt, val) => {
		dispatch(
			setOptions({
				...state.options,
				[opt]: val,
			})
		);
	};

	const operators = {
		'===': (a, b) => a === b,
		'!==': (a, b) => a !== b,
		'>': (a, b) => a > b,
		'<': (a, b) => a < b,
		'>=': (a, b) => a >= b,
		'<=': (a, b) => a <= b,
	};

	const evaluateConditions = (conditions) => {
		if (!conditions) {
			return true;
		}

		return conditions.every(({ field, comparison, value }) => {
			const keys = field.split('.');
			let val = formValues;
			for (const key of keys) {
				val = val?.[key];
			}

			return operators[comparison](val ?? null, value);
		});
	};

	const handleChange = (fieldState, fieldName, newValue) => {
		fieldState.handleChange(newValue);

		const allValues = form.store.state.values;
		const updatedFormValues = option
			? { ...allValues[option] }
			: { ...allValues };

		if (fieldName.includes('.')) {
			const [parent, child] = fieldName.split('.');
			updatedFormValues[parent] = updatedFormValues[parent] || {};
			updatedFormValues[parent][child] = newValue;
		} else {
			updatedFormValues[fieldName] = newValue;
		}

		if (option) {
			handleSave(option, updatedFormValues);
		} else if (fieldName.includes('.')) {
			const [parent] = fieldName.split('.');
			handleSave(parent, updatedFormValues[parent]);
		} else {
			handleSave(fieldName, newValue);
		}
	};

	const activeToggle =
		useStore(form.store, (statex) => statex.values.activeToggle) || '';

	if (!config || !fields) {
		return <p>Loading settings...</p>;
	}

	if (fields.length === 0) {
		return <div>⚙️ No settings found.</div>;
	}

	const grid = config.option === 'modula_roles' ? styles.grid : '';

	return (
		<>
			{config.submenu && (
				<SubmenuToggle form={form} submenu={config.submenu} />
			)}
			<form className={`${styles.fieldWrapper} ${grid}`}>
				{locked && <LockedForm badge={badge} />}

				{fields.map((field, index) => {
					const fieldLocked = !!field.locked;
					const fieldBadge = field.badge || badge;

					if (!evaluateConditions(field.conditions)) {
						return null;
					}

					if (field.type === 'role') {
						return (
							<RoleField
								key={field?.name || index}
								option={option}
								mainField={field}
								form={form}
								handleChange={handleChange}
							/>
						);
					}

					if (field.group && field.group !== activeToggle) {
						return null;
					}

					if (field.type === 'modula_ai') {
						return <AiSettingsForm key={field?.name || index} />;
					}

					if (field.type === 'combo') {
						return (
							<div
								key={field?.name || index}
								className={
									styles.fieldWrapper +
									' ' +
									styles.comboFieldWrapper
								}
							>
								<ComboField
									option={option}
									field={field}
									form={form}
									handleChange={handleChange}
									evaluateConditions={evaluateConditions}
								/>
								{fieldLocked && (
									<LockedForm badge={fieldBadge} />
								)}
							</div>
						);
					}

					if (field.type === 'button') {
						return (
							<div
								key={field?.name || index}
								className={styles.fieldWrapper}
							>
								<ButtonField field={field} />
								{fieldLocked && (
									<LockedForm badge={fieldBadge} />
								)}
							</div>
						);
					}

					if (field.type === 'paragraph') {
						return (
							<div
								key={field?.name || index}
								className={styles.fieldWrapper}
							>
								<Paragraph field={field} />
								{fieldLocked && (
									<LockedForm badge={fieldBadge} />
								)}
							</div>
						);
					}

					if (field.type === 'upsell') {
						return (
							<UpsellBlock
								key={field?.name || index}
								field={field}
							/>
						);
					}

					if (field.type === 'oauth') {
						return (
							<div
								key={field?.name || index}
								className={styles.fieldWrapper}
							>
								<OAuthField
									field={field}
									locked={fieldLocked}
									badge={fieldBadge}
								/>
								{fieldLocked && (
									<LockedForm badge={fieldBadge} />
								)}
							</div>
						);
					}

					if (field.type === 'credentials_group') {
						return (
							<div
								key={field?.name || index}
								className={styles.fieldWrapper}
							>
								<CredentialsGroup
									field={field}
									form={form}
									option={option}
									handleChange={handleChange}
									evaluateConditions={evaluateConditions}
									locked={fieldLocked}
									badge={fieldBadge}
								/>
								{fieldLocked && (
									<LockedForm badge={fieldBadge} />
								)}
							</div>
						);
					}

					return (
						<div
							key={field?.name || index}
							className={`${field.disabled ? styles.disabledClass : ''}`}
						>
							<div className={styles.fieldWrapper}>
								<form.Field
									name={
										option
											? `${option}.${field.name}`
											: field.name
									}
								>
									{(fieldState) => (
										<FieldRenderer
											field={field}
											fieldState={fieldState}
											handleChange={handleChange}
											disabled={
												field.disabled ||
												fieldLocked ||
												false
											}
										/>
									)}
								</form.Field>
								{fieldLocked && (
									<LockedForm badge={fieldBadge} />
								)}
							</div>
						</div>
					);
				})}
			</form>
		</>
	);
}
