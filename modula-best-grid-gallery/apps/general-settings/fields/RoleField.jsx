import { useState } from '@wordpress/element';
import ToggleField from './ToggleField';
import { Card, CardBody, CardHeader } from '@wordpress/components';
import styles from './RoleField.module.scss';

export function RoleField({ option, mainField, form, handleChange }) {
	const [enabled, setEnabled] = useState(mainField.default);
	const activeToggle = form.store.state.values?.activeToggle || 'gallery';
	const onMainToggleChange = (fieldState, fieldName, val) => {
		setEnabled(val);

		// set each child-field value based on parent.
		mainField.fields.forEach((field) => {
			const fullFieldName = option
				? `${option}.${field.name}`
				: field.name;
			form.setFieldValue(fullFieldName, val);
		});

		handleChange(fieldState, fieldName, val);
	};

	if (mainField.group && mainField.group !== activeToggle) {
		return null;
	}

	return (
		<>
			<Card className={styles.roleFieldCard}>
				<CardHeader className={styles.roleFieldCardHead}>
					<form.Field
						key={`${mainField.name}-field`}
						name={
							option
								? `${option}.${mainField.name}`
								: mainField.name
						}
					>
						{(fieldState) => (
							<ToggleField
								fieldState={fieldState}
								field={mainField}
								className={styles.roleHeadToggle}
								handleChange={(val) =>
									onMainToggleChange(
										fieldState,
										mainField.name,
										val
									)
								}
							/>
						)}
					</form.Field>
				</CardHeader>
				<CardBody className={styles.roleFieldCardBody}>
					{mainField.fields.map((field) => {
						return (
							<div key={`${field.name}-wrapper`}>
								<form.Field
									key={`${field.name}-field`}
									name={
										option
											? `${option}.${field.name}`
											: field.name
									}
								>
									{(fieldState) => (
										<ToggleField
											fieldState={fieldState}
											field={field}
											className={styles.roleBodyToggle}
											handleChange={(val) =>
												handleChange(
													fieldState,
													field.name,
													val
												)
											}
											disabled={!enabled}
										/>
									)}
								</form.Field>
							</div>
						);
					})}
				</CardBody>
			</Card>
		</>
	);
}
