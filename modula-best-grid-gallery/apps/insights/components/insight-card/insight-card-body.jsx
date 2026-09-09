import styles from '../insight-card.module.scss';

export function formatNumber(n) {
	if (n >= 1000000) {
		return (n / 1000000).toFixed(1) + 'M';
	}
	if (n >= 1000) {
		return (n / 1000).toFixed(1) + 'K';
	}
	return n.toString();
}

export default function InsightCardBody({ primary, secondary, description }) {
	return (
		<div className={styles.body}>
			<div className={styles.primaryStat}>
				{formatNumber(primary.value)}
			</div>
			<div className={styles.primaryLabel}>{primary.label}</div>

			<div className={styles.secondaryList}>
				{secondary.map((item, index) => (
					<div className={styles.secondaryItem} key={index}>
						<span>{item.label}</span>
						<span>{formatNumber(item.value)}</span>
					</div>
				))}
			</div>

			<div className={styles.description}>{description}</div>
		</div>
	);
}
