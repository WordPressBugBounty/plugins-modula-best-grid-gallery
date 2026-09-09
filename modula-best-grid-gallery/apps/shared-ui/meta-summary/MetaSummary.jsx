/**
 * Compact attachment summary: thumb + title + meta line in a gray frame.
 *
 * @param {Object} props
 * @param {string} [props.thumbSrc]
 * @param {string} [props.thumbAlt]
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.meta] Secondary line (dims · size · position)
 * @param {string} [props.className]
 */
export function MetaSummary({
	thumbSrc = '',
	thumbAlt = '',
	title,
	meta,
	className = '',
	...rest
}) {
	const classes = ['modula-ui-meta-summary', className]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classes} {...rest}>
			{thumbSrc ? (
				<img
					className="modula-ui-meta-summary__thumb"
					src={thumbSrc}
					alt={thumbAlt}
					width={72}
					height={72}
					decoding="async"
				/>
			) : (
				<span
					className="modula-ui-meta-summary__thumb modula-ui-meta-summary__thumb--empty"
					aria-hidden="true"
				/>
			)}
			<div className="modula-ui-meta-summary__body">
				<div className="modula-ui-meta-summary__title">{title}</div>
				{meta ? (
					<div className="modula-ui-meta-summary__meta">{meta}</div>
				) : null}
			</div>
		</div>
	);
}
