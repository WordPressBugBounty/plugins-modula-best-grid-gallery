import { Button } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { useApiCall } from '../query/useApiCall';
import styles from './OAuthField.module.scss';

export default function OAuthField({ field, locked = false }) {
	const {
		title,
		description,
		icon,
		status = {},
		connect = {},
		disconnect = {},
		docs = null,
	} = field;

	const connected = !!status.connected;
	const doApiCall = useApiCall();
	const [loading, setLoading] = useState(false);

	const handleDisconnect = async () => {
		if (locked) {
			return;
		}

		if (!disconnect?.api?.path) {
			return;
		}

		setLoading(true);
		await doApiCall(
			disconnect.api.path,
			disconnect.api.method || 'POST',
			disconnect.api.data || {}
		);
		setLoading(false);
	};

	const statusText = connected
		? status.textConnected || 'Connected'
		: status.textDisconnected || 'Not connected';

	return (
		<div className={styles.card}>
			<div className={styles.header}>
				<div className={styles.heading}>
					{icon && (
						<div className={styles.icon}>
							<img src={icon} alt="" />
						</div>
					)}
					<div>
						{title && <h4 className={styles.title}>{title}</h4>}
						{description && (
							<p className={styles.description}>{description}</p>
						)}
					</div>
				</div>
				<span
					className={`${styles.status} ${
						connected ? styles.connected : styles.disconnected
					}`}
				>
					{statusText}
				</span>
			</div>

			<div className={styles.actions}>
				{!connected && connect?.label && (
					<Button
						variant="primary"
						href={connect.href}
						disabled={loading || connect.disabled || locked}
					>
						{connect.label}
					</Button>
				)}
				{connected && disconnect?.label && (
					<Button
						variant="secondary"
						onClick={handleDisconnect}
						disabled={loading || locked}
					>
						{disconnect.label}
					</Button>
				)}
				{docs?.href && (
					<a
						className={styles.docs}
						href={docs.href}
						target="_blank"
						rel="noreferrer"
					>
						{docs.label || 'Docs'}
					</a>
				)}
			</div>
		</div>
	);
}
