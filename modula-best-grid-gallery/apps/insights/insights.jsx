import InsightCard from './components/insight-card';
import styles from './insights.module.scss';
import { useInsightsQuery } from './query/useInsightsQuery';

export default function Insights() {
	const { data: insights, isLoading, isError } = useInsightsQuery();

	if (isLoading) {
		return (
			<div className={styles.grid}>
				<div>Loading insights...</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className={styles.grid}>
				<div>Error loading insights. Please try again later.</div>
			</div>
		);
	}

	if (!insights || insights.length === 0) {
		return (
			<div className={styles.grid}>
				<div>No insights available.</div>
			</div>
		);
	}

	return (
		<div className={styles.grid}>
			{insights.map((insight) => (
				<InsightCard key={insight.slug} insight={insight} />
			))}
		</div>
	);
}
