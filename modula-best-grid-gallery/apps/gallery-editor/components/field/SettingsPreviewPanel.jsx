/**
 * Shared nested-panel preview shell (bordered box, light/dark).
 */
/**
 * @param {{
 *   label?: string,
 *   footer?: string,
 *   children?: import('react').ReactNode,
 *   className?: string,
 * }} props
 */
export default function SettingsPreviewPanel({
	label = '',
	footer = '',
	children,
	className = '',
}) {
	const rootClass = [
		'modula-settings-editor__settings-preview',
		typeof className === 'string' && className.trim() !== ''
			? className.trim()
			: '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={rootClass}>
			{label !== '' ? (
				<p className="modula-settings-editor__settings-preview-label">
					{label}
				</p>
			) : null}
			<div className="modula-settings-editor__settings-preview-box">
				{children}
			</div>
			{footer !== '' ? (
				<p className="modula-settings-editor__settings-preview-footer">
					{footer}
				</p>
			) : null}
		</div>
	);
}
