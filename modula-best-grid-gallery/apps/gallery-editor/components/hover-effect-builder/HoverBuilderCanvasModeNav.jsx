import { __ } from '@wordpress/i18n';
import { Segmented } from 'shared-ui';

/**
 * Build / Preview canvas toggle — style-kit Segmented (same as Presets / Customize).
 *
 * @param {{
 *   buildMode: boolean,
 *   previewMode: boolean,
 *   setBuilderViewMode: (mode: 'build' | 'preview') => void,
 * }} props
 */
export default function HoverBuilderCanvasModeNav({
	buildMode,
	previewMode,
	setBuilderViewMode,
}) {
	const value = previewMode ? 'preview' : 'build';

	return (
		<div className="modula-gallery-takeover__hover-builder-mode-nav modula-gallery-takeover__hover-builder-mode-nav--canvas">
			<Segmented
				aria-label={__(
					'Build or preview hover on the sample tile',
					'modula-best-grid-gallery'
				)}
				options={[
					{
						value: 'build',
						label: __('Build', 'modula-best-grid-gallery'),
					},
					{
						value: 'preview',
						label: __('Preview', 'modula-best-grid-gallery'),
					},
				]}
				value={value}
				onChange={(next) => {
					setBuilderViewMode(
						next === 'preview' ? 'preview' : 'build'
					);
				}}
			/>
		</div>
	);
}
