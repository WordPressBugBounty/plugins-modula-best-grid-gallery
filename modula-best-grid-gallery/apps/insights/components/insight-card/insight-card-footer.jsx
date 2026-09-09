import styles from '../insight-card.module.scss';

export default function InsightCardFooter({ active }) {
	return (
		<div className={styles.footer}>
			{active ? (
				<span className={styles.badgeActive}>Active</span>
			) : (
				<span className={styles.badgeInactive}>Inactive</span>
			)}
		</div>
	);
}
