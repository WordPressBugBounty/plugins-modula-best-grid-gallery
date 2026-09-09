import styles from './Paragraph.module.scss';

export default function Paragraph({ field }) {
	return (
		<div className={styles.paragraph}>
			{field?.label && (
				<span className={styles.label}>{field.label}</span>
			)}
			{field?.description && (
				<div
					className={styles.description}
					dangerouslySetInnerHTML={{ __html: field.description }}
				/>
			)}
		</div>
	);
}
