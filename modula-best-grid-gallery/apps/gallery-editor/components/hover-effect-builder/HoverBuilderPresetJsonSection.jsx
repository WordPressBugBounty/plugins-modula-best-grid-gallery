import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from 'admin-ui';
import { ItemEditCard } from 'editor-shell';
import HoverBuilderPresetJsonModal from './HoverBuilderPresetJsonModal';

/**
 * @param {Object}              props
 * @param {any}                 props.form
 * @param {Record<string, any>} props.currentBuilder
 * @param {string}              props.currentHoverColor
 * @param {number}              props.currentHoverOpacity
 */
export default function HoverBuilderPresetJsonSection({
	form,
	currentBuilder,
	currentHoverColor,
	currentHoverOpacity,
}) {
	const [isPresetJsonModalOpen, setIsPresetJsonModalOpen] = useState(false);

	return (
		<ItemEditCard title={__('Preset JSON', 'modula-best-grid-gallery')}>
			<p className="modula-gallery-takeover__hover-builder-help">
				{__(
					'Import or export hover preset options as JSON.',
					'modula-best-grid-gallery'
				)}
			</p>
			<Button
				className="modula-gallery-takeover__hover-builder-preset-json-btn"
				onClick={() => setIsPresetJsonModalOpen(true)}
			>
				{__('Open import / export', 'modula-best-grid-gallery')}
			</Button>
			<HoverBuilderPresetJsonModal
				isOpen={isPresetJsonModalOpen}
				onClose={() => setIsPresetJsonModalOpen(false)}
				currentBuilder={currentBuilder}
				currentHoverColor={currentHoverColor}
				currentHoverOpacity={currentHoverOpacity}
				onApply={(nextBuilder, hoverPatch) => {
					form.setFieldValue('hover.builder', nextBuilder);
					form.setFieldValue(
						'hover.dimOverlay',
						!!nextBuilder?.dimOverlay
					);
					if (typeof hoverPatch.hoverColor === 'string') {
						form.setFieldValue(
							'hover.hoverColor',
							hoverPatch.hoverColor
						);
					}
					if (Number.isFinite(Number(hoverPatch.hoverOpacity))) {
						form.setFieldValue(
							'hover.hoverOpacity',
							Number(hoverPatch.hoverOpacity)
						);
					}
				}}
			/>
		</ItemEditCard>
	);
}
