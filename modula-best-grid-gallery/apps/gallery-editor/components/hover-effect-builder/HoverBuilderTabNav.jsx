import { __ } from '@wordpress/i18n';
import { Segmented } from 'shared-ui';

/**
 * @param {{
 *   activeTab: 'presets' | 'customize',
 *   customizeTabEnabled: boolean,
 *   onSelectPresets: () => void,
 *   onSelectCustomize: () => void,
 * }} props
 */
export default function HoverBuilderTabNav({
	activeTab,
	customizeTabEnabled,
	onSelectPresets,
	onSelectCustomize,
}) {
	return (
		<div className="modula-gallery-takeover__hover-builder-mode-nav">
			<Segmented
				aria-label={__(
					'Hover builder mode',
					'modula-best-grid-gallery'
				)}
				options={[
					{
						value: 'presets',
						label: __('Presets', 'modula-best-grid-gallery'),
					},
					{
						value: 'customize',
						label: customizeTabEnabled
							? __('Customize', 'modula-best-grid-gallery')
							: __('Customize (Pro)', 'modula-best-grid-gallery'),
						disabled: !customizeTabEnabled,
					},
				]}
				value={activeTab}
				onChange={(next) => {
					if (next === 'customize') {
						onSelectCustomize();
						return;
					}
					onSelectPresets();
				}}
			/>
		</div>
	);
}
