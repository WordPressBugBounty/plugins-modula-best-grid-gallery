import { __ } from '@wordpress/i18n';
import {
	Select,
	SettingsGroup,
	SettingsRow,
	TextInput,
	Toggle,
	rowHelpId,
} from 'admin-ui';
import { CardFrame } from '../page/CardFrame';
import { fieldLabel, fieldsByName } from '../model/settingsPageModel';
import { useCardValues } from '../page/useCardValues';

// Prefix of the card's control ids.
const ID_PREFIX = 'modula-image-licensing';

/**
 * The stored flag may be a boolean or a legacy '1' / 1.
 *
 * @param {*} value
 * @return {boolean} Whether it is on.
 */
function isOn(value) {
	return true === value || '1' === value || 1 === value;
}

/**
 * Image licensing (Galleries), rebuilt with admin-ui. Its whole option is
 * recorded as a pending edit on every change.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function ImageLicensingCard({ card }) {
	const { values, setValue } = useCardValues(card);
	const license = values.image_licensing ?? 'none';
	const licenses = (
		fieldsByName(card.config).image_licensing?.options || []
	).map((choice) => ({ value: choice.value, label: choice.name }));

	return (
		<CardFrame card={card}>
			<SettingsRow
				label={fieldLabel(card.config, 'image_licensing')}
				controlId={`${ID_PREFIX}-license`}
				help={__(
					'Adds the chosen license, with the author and company, to the gallery’s code, so search engines know how the photos may be reused.',
					'modula-best-grid-gallery'
				)}
			>
				<Select
					id={`${ID_PREFIX}-license`}
					options={licenses}
					value={license}
					onChange={(value) => setValue('image_licensing', value)}
					aria-describedby={rowHelpId(`${ID_PREFIX}-license`)}
				/>
			</SettingsRow>
			{'none' !== license ? (
				<SettingsGroup
					title={__('License details', 'modula-best-grid-gallery')}
				>
					<SettingsRow
						label={fieldLabel(
							card.config,
							'image_licensing_author'
						)}
						controlId={`${ID_PREFIX}-author`}
					>
						<TextInput
							id={`${ID_PREFIX}-author`}
							value={values.image_licensing_author ?? ''}
							onChange={(value) =>
								setValue('image_licensing_author', value)
							}
						/>
					</SettingsRow>
					<SettingsRow
						label={fieldLabel(
							card.config,
							'image_licensing_company'
						)}
						controlId={`${ID_PREFIX}-company`}
					>
						<TextInput
							id={`${ID_PREFIX}-company`}
							value={values.image_licensing_company ?? ''}
							onChange={(value) =>
								setValue('image_licensing_company', value)
							}
						/>
					</SettingsRow>
					<SettingsRow
						label={fieldLabel(
							card.config,
							'display_with_description'
						)}
						controlId={`${ID_PREFIX}-show`}
					>
						<Toggle
							id={`${ID_PREFIX}-show`}
							checked={isOn(values.display_with_description)}
							onChange={(checked) =>
								setValue('display_with_description', checked)
							}
						/>
					</SettingsRow>
				</SettingsGroup>
			) : null}
		</CardFrame>
	);
}
