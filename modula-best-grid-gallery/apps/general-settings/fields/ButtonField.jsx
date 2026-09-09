import { Button, Spinner } from '@wordpress/components';
import { useApiCall } from '../query/useApiCall';
import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import styles from './ButtonField.module.scss';

export default function ButtonField({ field, variant = 'primary' }) {
	const [loading, setLoading] = useState(false);
	const [notice, setNotice] = useState(null);
	const doApiCall = useApiCall();

	useEffect(() => {
		if (!notice) {
			return undefined;
		}

		const timer = setTimeout(() => setNotice(null), 4000);
		return () => clearTimeout(timer);
	}, [notice]);

	const handleClick = async () => {
		if (loading) {
			return;
		}

		setLoading(true);
		setNotice(null);

		try {
			let response = null;

			if (field.api && field.api?.path) {
				response = await doApiCall(
					field.api.path,
					field.api.method || 'POST',
					field.api.data || {}
				);
			}

			if (field.reload) {
				window.location.reload();
				return;
			}

			setNotice({
				type: 'success',
				message:
					response?.message ||
					field.successMessage ||
					__('Done!', 'modula-best-grid-gallery'),
			});
		} catch (error) {
			setNotice({
				type: 'error',
				message:
					error?.message ||
					field.errorMessage ||
					__(
						'Something went wrong. Please try again.',
						'modula-best-grid-gallery'
					),
			});
		} finally {
			setLoading(false);
		}
	};

	const buttonLabel = loading
		? field.loadingText || __('Working…', 'modula-best-grid-gallery')
		: field.text;

	return (
		<div className={styles.wrapper}>
			<Button
				id={field.id || ''}
				href={field.href}
				variant={field.variant || variant}
				onClick={handleClick}
				disabled={loading || field.disabled}
				className={styles.button}
			>
				{loading && <Spinner className={styles.spinner} />}
				{buttonLabel}
			</Button>

			{notice && (
				<div
					className={`${styles.notice} ${styles[notice.type]} ${styles.slideIn}`}
					role="status"
					aria-live="polite"
				>
					{notice.message}
				</div>
			)}
		</div>
	);
}
