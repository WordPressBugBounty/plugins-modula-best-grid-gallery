import styles from './insight-card.module.scss';
import InsightCardBody from './insight-card/insight-card-body';
import InsightCardFooter from './insight-card/insight-card-footer';
import InsightCardHeader from './insight-card/insight-card-header';

export default function InsightCard({ insight }) {
	return (
		<div
			className={`${styles.insightCard} ${
				!insight.active ? styles.inactive : ''
			}`}
		>
			<InsightCardHeader
				title={insight.extension}
				category={insight.category}
				active={insight.active}
			/>

			<InsightCardBody
				primary={insight.stats.primary}
				secondary={insight.stats.secondary}
				description={insight.description}
			/>

			<InsightCardFooter active={insight.active} />
		</div>
	);
}
