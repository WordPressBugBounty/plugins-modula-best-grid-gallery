/**
 * Centered canvas empty state. The editor supplies its copy, and optionally
 * its own body instead of message + hint. With `actionLabel` it offers the
 * canvas's primary Add action (the Add split's main button) as a button, or
 * `onAction` where the Add split has no primary action (menu-only Add).
 */
import { useCanvasPrimaryAdd } from './CanvasPrimaryAddContext';

/**
 * @param {Object}                    props
 * @param {string}                    [props.message]     Primary line.
 * @param {string}                    [props.hint]        Secondary line.
 * @param {string}                    [props.actionLabel] Label of the Add button ("Add images"); omit for none.
 * @param {() => void}                [props.onAction]    The button's action; the canvas's primary Add by default.
 * @param {string}                    [props.className]   Editor-specific modifier classes.
 * @param {import('react').ReactNode} [props.children]    Replaces message + hint.
 */
export default function CanvasEmptyState({
	message = '',
	hint = '',
	actionLabel = '',
	onAction = null,
	className = '',
	children = null,
}) {
	const primaryAdd = useCanvasPrimaryAdd();
	const action = onAction ?? primaryAdd;
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
					{actionLabel && action ? (
						<button
							type="button"
							className="modula-takeover__live-preview-empty-state__action"
							onClick={action}
						>
							{actionLabel}
						</button>
					) : null}
				</>
			)}
		</div>
	);
}
