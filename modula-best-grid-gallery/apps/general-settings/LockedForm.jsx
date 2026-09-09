import { __, sprintf } from '@wordpress/i18n';
import styles from './LockedForm.module.scss';

export default function LockedForm({ badge }) {
	return (
		<div className={styles.lockedForm}>
			<p>
				{sprintf(
					/* translators: %s: plan name */
					__(
						'Feature available starting with the %s plan.',
						'modula-best-grid-gallery'
					),
					badge.charAt(0).toUpperCase() + badge.slice(1)
				)}
			</p>
		</div>
	);
}
