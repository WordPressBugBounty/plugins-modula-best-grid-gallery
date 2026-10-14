/**
 * Centered canvas empty state. The editor supplies its copy, and optionally
 * its own body (for example an upload drop zone) instead of message + hint.
 *
 * @param {Object}                    props
 * @param {string}                    [props.message]   Primary line.
 * @param {string}                    [props.hint]      Secondary line.
 * @param {string}                    [props.className] Editor-specific modifier classes.
 * @param {import('react').ReactNode} [props.children]  Replaces message + hint.
 */
export default function CanvasEmptyState({
	message = '',
	hint = '',
	className = '',
	children = null,
}) {
	const hasCustomBody = children !== null && children !== undefined;

	return (
		<div
			className={[
				'modula-takeover__live-preview-empty-state',
				hasCustomBody
					? ''
					: 'modula-takeover__live-preview-empty-state--message',
				className.trim(),
			]
				.filter(Boolean)
				.join(' ')}
		>
			{hasCustomBody ? (
				children
			) : (
				<>
					{message ? (
						<p className="modula-takeover__live-preview-empty-state__message">
							{message}
						</p>
					) : null}
					{hint ? (
						<p className="modula-takeover__live-preview-empty-state__hint">
							{hint}
						</p>
					) : null}
				</>
			)}
		</div>
	);
}
