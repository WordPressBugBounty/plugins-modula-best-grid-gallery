import styles from './loading-skeleton.module.css';

export default function LoadingSkeleton() {
	return (
		<div className={styles.loadingSkeleton}>
			<div className={styles.description} />
			<div className={styles.descriptionShort} />

			<div className={styles.fieldsRow}>
				<div className={styles.field}>
					<div className={styles.label} />
					<div className={styles.input} />
					<div className={styles.helper} />
				</div>
				<div className={styles.field}>
					<div className={styles.label} />
					<div className={`${styles.input} ${styles.select}`} />
				</div>
			</div>

			<div className={styles.actionsRow}>
				<div className={styles.button} />
				<div className={styles.link} />
			</div>
		</div>
	);
}
