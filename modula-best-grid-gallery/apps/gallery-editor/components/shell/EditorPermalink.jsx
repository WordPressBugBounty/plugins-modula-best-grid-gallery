/**
 * Editor permalink — classic-style slug control under the gallery title.
 */
import { __ } from '@wordpress/i18n';
import { Icon, external } from '@wordpress/icons';

/**
 * @param {Object} props
 * @param {string} props.slug
 * @param {(slug: string) => void} props.onSlugChange
 * @param {(slug?: string) => void} props.onSlugCommit
 * @param {string} [props.permalinkPrefix]
 * @param {string} [props.permalinkSuffix]
 * @param {string} [props.viewUrl]
 * @param {string} [props.status]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.busy]
 */
export default function EditorPermalink({
	slug,
	onSlugChange,
	onSlugCommit,
	permalinkPrefix = '',
	permalinkSuffix = '',
	viewUrl = '',
	status = '',
	disabled = false,
	busy = false,
}) {
	const showViewLink = status === 'publish' && Boolean(viewUrl);

	return (
		<div
			className="modula-gallery-takeover__editor-permalink"
			data-testid="editor-permalink"
		>
			<span className="modula-gallery-takeover__editor-permalink-label">
				{__('Permalink', 'modula-best-grid-gallery')}
			</span>
			<div className="modula-gallery-takeover__editor-permalink-row">
				{permalinkPrefix ? (
					<span className="modula-gallery-takeover__editor-permalink-prefix">
						{permalinkPrefix}
					</span>
				) : null}
				<input
					className="modula-gallery-takeover__editor-permalink-slug"
					type="text"
					value={slug}
					disabled={disabled || busy}
					aria-label={__('Slug', 'modula-best-grid-gallery')}
					onChange={(event) => onSlugChange(event.target.value)}
					onBlur={(event) => onSlugCommit?.(event.currentTarget.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							const el = event.currentTarget;
							onSlugCommit?.(el.value);
							el.blur();
						}
					}}
				/>
				{permalinkSuffix ? (
					<span className="modula-gallery-takeover__editor-permalink-suffix">
						{permalinkSuffix}
					</span>
				) : null}
				{showViewLink ? (
					<a
						className="modula-gallery-takeover__editor-permalink-view"
						href={viewUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Icon icon={external} size={14} />
						<span>{__('View', 'modula-best-grid-gallery')}</span>
					</a>
				) : null}
			</div>
		</div>
	);
}
