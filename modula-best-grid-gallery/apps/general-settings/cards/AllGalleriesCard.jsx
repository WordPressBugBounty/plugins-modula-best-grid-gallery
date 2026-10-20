import { __ } from '@wordpress/i18n';
import { CopyField, SettingsRow, TextInput, rowHelpId } from 'admin-ui';
import { fieldLabel } from '../model/settingsPageModel';
import { CardFrame } from '../page/CardFrame';
import { currentSiteAddress } from '../page/site';
import { useCardValues } from '../page/useCardValues';
import { exampleGalleryLink } from './galleryExamples';

// The card writes this option directly (the settings class gives it no
// option wrapper): the URL parameter that picks one gallery.
const LINK_PARAMETER = 'mas_gallery_link';
const SHORTCODE = '[modula_all_galleries]';

/**
 * Page with all galleries (the Advanced Shortcodes card): the shortcode to
 * copy and the link parameter, with a live example link.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function AllGalleriesCard({ card }) {
	const { values, setValue } = useCardValues(card);
	const parameterId = 'modula-all-galleries-parameter';

	return (
		<CardFrame card={card}>
			<SettingsRow
				label={__('Shortcode', 'modula-best-grid-gallery')}
				controlId="modula-all-galleries-shortcode"
				labelElement="span"
			>
				<CopyField
					value={SHORTCODE}
					copyLabel={__('Copy shortcode', 'modula-best-grid-gallery')}
				/>
			</SettingsRow>
			<SettingsRow
				label={fieldLabel(card.config, LINK_PARAMETER)}
				controlId={parameterId}
				help={
					<>
						{__('Example:', 'modula-best-grid-gallery')}{' '}
						<code>
							{exampleGalleryLink(
								currentSiteAddress(),
								values[LINK_PARAMETER]
							)}
						</code>
					</>
				}
			>
				<TextInput
					id={parameterId}
					value={values[LINK_PARAMETER] ?? ''}
					onChange={(value) => setValue(LINK_PARAMETER, value)}
					aria-describedby={rowHelpId(parameterId)}
				/>
			</SettingsRow>
		</CardFrame>
	);
}
