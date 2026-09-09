import styles from './Paragraph.module.scss';

export default function Label({ label = undefined, description = undefined }) {
	return (
		<>
			{label && <span className={styles.label}>{label}</span>}
			{description && (
				<div
					className={styles.description}
					dangerouslySetInnerHTML={{ __html: description }}
				/>
			)}
		</>
	);
}
