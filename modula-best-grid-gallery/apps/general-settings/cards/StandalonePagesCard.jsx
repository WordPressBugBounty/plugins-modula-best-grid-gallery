import { __ } from '@wordpress/i18n';
import {
	SettingsGroup,
	SettingsRow,
	TextInput,
	Toggle,
	rowHelpId,
} from 'admin-ui';
import { fieldLabel, fieldsByName } from '../model/settingsPageModel';
import { CardFrame } from '../page/CardFrame';
import { currentSiteAddress } from '../page/site';
import { useCardValues } from '../page/useCardValues';
import { exampleAddress } from './galleryExamples';

/**
 * The two standalone page types: their option key, group title, the slug
 * the settings class falls back to, and a sample post name for the address.
 * Row labels come from the config fields.
 *
 * @return {Object[]} Page types.
 */
function pageTypes() {
	return [
		{
			key: 'gallery',
			groupTitle: __('Gallery address', 'modula-best-grid-gallery'),
			fallbackSlug: 'modula-gallery',
			sampleName: 'wedding-day',
		},
		{
			key: 'album',
			groupTitle: __('Album address', 'modula-best-grid-gallery'),
			fallbackSlug: 'modula-album',
			sampleName: 'summer-2026',
		},
	];
}

/**
 * One page type: its toggle and, when on, its slug with the example address.
 * The toggle stores the field's own on/off values (`enabled` / `disabled`).
 *
 * @param {Object}   props
 * @param {Object}   props.type        Page type from pageTypes().
 * @param {Object}   props.config      Card config, for the row labels.
 * @param {Object}   props.toggleField The type's `enable_rewrite` config field.
 * @param {Object}   props.current     The type's values (`enable_rewrite`, `slug`).
 * @param {Function} props.setValue    Card setter (name, value).
 */
function PageTypeRows({ type, config, toggleField, current, setValue }) {
	const toggleId = `modula-standalone-${type.key}`;
	const slugId = `modula-standalone-${type.key}-slug`;
	const isOn = current.enable_rewrite === toggleField.trueValue;
	const address = exampleAddress(
		currentSiteAddress(),
		current.slug,
		type.fallbackSlug,
		type.sampleName
	);

	return (
		<>
			<SettingsRow
				label={fieldLabel(config, `${type.key}.enable_rewrite`)}
				controlId={toggleId}
			>
				<Toggle
					id={toggleId}
					checked={isOn}
					onChange={(checked) =>
						setValue(
							`${type.key}.enable_rewrite`,
							checked
								? toggleField.trueValue
								: toggleField.falseValue
						)
					}
				/>
			</SettingsRow>
			{isOn ? (
				<SettingsGroup title={type.groupTitle}>
					<SettingsRow
						label={fieldLabel(config, `${type.key}.slug`)}
						controlId={slugId}
						help={
							<>
								{__('Address:', 'modula-best-grid-gallery')}{' '}
								<code>{address}</code>
							</>
						}
					>
						<TextInput
							id={slugId}
							value={current.slug ?? ''}
							onChange={(value) =>
								setValue(`${type.key}.slug`, value)
							}
							aria-describedby={rowHelpId(slugId)}
						/>
					</SettingsRow>
				</SettingsGroup>
			) : null}
		</>
	);
}

/**
 * Standalone pages (Galleries): a toggle per page type and, when on, its
 * slug with a live example address.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function StandalonePagesCard({ card }) {
	const { values, setValue } = useCardValues(card);
	const fields = fieldsByName(card.config);

	return (
		<CardFrame card={card}>
			{pageTypes()
				.filter((type) => fields[`${type.key}.enable_rewrite`])
				.map((type) => (
					<PageTypeRows
						key={type.key}
						type={type}
						config={card.config}
						toggleField={fields[`${type.key}.enable_rewrite`]}
						current={values[type.key] ?? {}}
						setValue={setValue}
					/>
				))}
		</CardFrame>
	);
}
