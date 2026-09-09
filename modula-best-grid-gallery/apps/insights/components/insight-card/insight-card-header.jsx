import styles from '../insight-card.module.scss';

export default function InsightCardHeader({ title, category }) {
	return (
		<div className={styles.header}>
			<div className={styles.title}>{title}</div>

			<div className={styles.category}>{category}</div>
		</div>
	);
}
