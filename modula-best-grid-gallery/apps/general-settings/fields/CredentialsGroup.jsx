import { Button } from '@wordpress/components';
import { useState } from '@wordpress/element';
import styles from './OAuthField.module.scss';
import FieldRenderer from '../FieldRenderer';
import { useApiCall } from '../query/useApiCall';

export default function CredentialsGroup({
	field,
	form,
	option,
	handleChange,
	evaluateConditions,
	locked = false,
}) {
	const { title, description, fields = [], oauth } = field;
	const doApiCall = useApiCall();
	const [loading, setLoading] = useState(false);

	const connected = !!oauth?.status?.connected;
	const statusText = oauth?.status
		? connected
			? oauth.status.textConnected || 'Connected'
			: oauth.status.textDisconnected || 'Not connected'
		: null;

	const handleDisconnect = async () => {
		if (locked || !oauth?.disconnect?.api?.path) {
			return;
		}
		setLoading(true);
		await doApiCall(
			oauth.disconnect.api.path,
			oauth.disconnect.api.method || 'POST',
			oauth.disconnect.api.data || {}
		);
		setLoading(false);
	};

	return (
		<div className={styles.card + ' ' + styles.compactCard}>
			<div className={styles.header}>
				<div className={styles.heading}>
					<div>
						{title && <h4 className={styles.title}>{title}</h4>}
						{description && (
							<p className={styles.description}>{description}</p>
						)}
					</div>
				</div>
				{oauth?.status &&
					statusText !== null &&
					statusText !== undefined && (
					<span
						className={`${styles.status} ${
							connected ? styles.connected : styles.disconnected
						}`}
					>
						{statusText}
					</span>
				)}
			</div>

			{oauth && (
				<div className={styles.actions}>
					{!connected && oauth.connect?.label && (
						<Button
							variant="primary"
							href={oauth.connect.href}
							disabled={
								loading || oauth.connect.disabled || locked
							}
						>
							{oauth.connect.label}
						</Button>
					)}
					{connected && oauth.disconnect?.label && (
						<Button
							variant="secondary"
							onClick={handleDisconnect}
							disabled={loading || locked}
						>
							{oauth.disconnect.label}
						</Button>
					)}
					{oauth.docs?.href && (
						<a
							className={styles.docs}
							href={oauth.docs.href}
							target="_blank"
							rel="noreferrer"
						>
							{oauth.docs.label || 'Docs'}
						</a>
					)}
				</div>
			)}

			<div className={styles.credentialsGrid}>
				{fields.map((subField, idx) => {
					if (!evaluateConditions(subField.conditions)) {
						return null;
					}

					const name = option
						? `${option}.${subField.name}`
						: subField.name;

					return (
						<div
							key={subField?.name || idx}
							className={styles.credential}
						>
							<form.Field name={name}>
								{(fieldState) => (
									<FieldRenderer
										field={subField}
										fieldState={fieldState}
										handleChange={handleChange}
										disabled={
											subField.disabled || locked || false
										}
									/>
								)}
							</form.Field>
						</div>
					);
				})}
			</div>
		</div>
	);
}
