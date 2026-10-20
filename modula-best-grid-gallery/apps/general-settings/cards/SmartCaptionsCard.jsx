import { __, sprintf } from '@wordpress/i18n';
import {
	IconNote,
	Select,
	SettingsRow,
	Skeleton,
	TextInput,
	Toggle,
	rowHelpId,
} from 'admin-ui';
import {
	AI_API_KEY_OPTION,
	AI_CLAIM_URL,
	AI_LANGUAGE_OPTION,
	isAiDebugMode,
	resolveAiLanguage,
} from '../ai-settings/aiSettings';
import ButtonAction from '../ai-settings/settings-form/button-action';
import { LANGUAGES } from '../ai-settings/settings-form/languages';
import { recordEdit } from '../context/actions';
import useStateContext from '../context/useStateContext';
import {
	fieldLabel,
	fieldsByName,
	storedBoolean,
	withPendingValues,
} from '../model/settingsPageModel';
import { CardFrame } from '../page/CardFrame';
import { UnavailableCard } from '../page/UnavailableCard';
import { useCardValues } from '../page/useCardValues';
import { useSettingsQuery } from '../query/useSettingsQuery';

// The settings class's fields in the Modula AI card (no card option: each
// field is its own option).
const TOGGLE_FIELD = 'use_modula_ai';
const LOCAL_NOTICE_FIELD = 'modula_ai_localhost_notice';
const ID_PREFIX = 'modula-smart-captions';
const KEY_ID = `${ID_PREFIX}-key`;

/**
 * Smart Captions (AI): the Modula AI toggle and, while it is on, the API key
 * with its credits and the AI language, restyled from the legacy Modula AI
 * form. The design's Fill in and Fill in missing text rows wait for their
 * stored option (ticket 24). On a local site the settings class
 * disables the toggle and sends its explanation, which the card shows under it.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function SmartCaptionsCard({ card }) {
	const { values, setValue } = useCardValues(card);
	const fields = fieldsByName(card.config);
	const toggleField = fields[TOGGLE_FIELD];

	if (!toggleField) {
		return <UnavailableCard card={card} />;
	}

	const isAvailable = true !== toggleField.disabled;
	const isOn = storedBoolean(values[TOGGLE_FIELD]);
	const toggleId = `${ID_PREFIX}-enabled`;
	const localNotice = fields[LOCAL_NOTICE_FIELD]?.description;
	const note = localNotice ? (
		<IconNote>
			{/* Built and escaped by the settings class (strong, mailto link). */}
			<span dangerouslySetInnerHTML={{ __html: localNotice }} />
		</IconNote>
	) : null;

	return (
		<CardFrame card={card}>
			<SettingsRow
				label={fieldLabel(card.config, TOGGLE_FIELD)}
				controlId={toggleId}
				help={note}
			>
				<Toggle
					id={toggleId}
					checked={isOn}
					disabled={!isAvailable}
					onChange={(checked) => setValue(TOGGLE_FIELD, checked)}
					aria-describedby={note ? rowHelpId(toggleId) : undefined}
				/>
			</SettingsRow>
			{isOn ? (
				<>
					<AiSettingsRows
						config={card.config}
						isAvailable={isAvailable}
					/>
					{/* Developer actions, kept from the legacy Modula AI form. */}
					{isAiDebugMode() ? (
						<div className="modula-settings-ai-debug">
							<ButtonAction />
						</div>
					) : null}
				</>
			) : null}
		</CardFrame>
	);
}

/**
 * API key (with its credits) and AI language, from the AI settings route,
 * which is only queried while Modula AI is on. Edits are recorded as whole
 * options for the global Save, on top of the values the route returned.
 *
 * @param {Object}  props
 * @param {Object}  props.config      Card config, for the row labels.
 * @param {boolean} props.isAvailable False on a local site.
 */
function AiSettingsRows({ config, isAvailable }) {
	const { data, isLoading, isError } = useSettingsQuery();
	const { state, dispatch } = useStateContext();
	const keyLabel = fieldLabel(config, AI_API_KEY_OPTION);

	if (isLoading) {
		return (
			<KeyStatusRow label={keyLabel}>
				<Skeleton width={320} height={42} />
			</KeyStatusRow>
		);
	}

	if (isError) {
		return (
			<KeyStatusRow label={keyLabel}>
				<IconNote>
					{__(
						'Your API key and credits could not be loaded. Reload the page to try again.',
						'modula-best-grid-gallery'
					)}
				</IconNote>
			</KeyStatusRow>
		);
	}

	const values = withPendingValues(
		{
			[AI_API_KEY_OPTION]: data?.api_key || '',
			[AI_LANGUAGE_OPTION]: resolveAiLanguage(data),
		},
		state.options
	);
	const hasValidKey = true === data?.readonly?.valid_key;
	const languageId = `${ID_PREFIX}-language`;
	const keyHelp = apiKeyHelp(
		hasValidKey ? data.readonly.credits : null,
		isAvailable
	);

	return (
		<>
			<SettingsRow
				label={keyLabel}
				controlId={KEY_ID}
				description={
					isAvailable ? (
						<a href={AI_CLAIM_URL} target="_blank" rel="noreferrer">
							{__('Get a key', 'modula-best-grid-gallery')}
						</a>
					) : null
				}
				help={keyHelp}
			>
				<TextInput
					id={KEY_ID}
					value={values[AI_API_KEY_OPTION]}
					placeholder={__(
						'Paste your key',
						'modula-best-grid-gallery'
					)}
					// A key cannot be claimed or checked from a local site; a
					// valid one stays editable so it can be replaced.
					disabled={!isAvailable && !hasValidKey}
					onChange={(value) =>
						dispatch(recordEdit(AI_API_KEY_OPTION, value))
					}
					aria-describedby={keyHelp ? rowHelpId(KEY_ID) : undefined}
				/>
			</SettingsRow>
			<SettingsRow
				label={fieldLabel(config, AI_LANGUAGE_OPTION)}
				controlId={languageId}
				help={__(
					'Modula AI writes the text in this language.',
					'modula-best-grid-gallery'
				)}
			>
				<Select
					id={languageId}
					options={LANGUAGES}
					value={values[AI_LANGUAGE_OPTION]}
					onChange={(value) =>
						dispatch(recordEdit(AI_LANGUAGE_OPTION, value))
					}
					aria-describedby={rowHelpId(languageId)}
				/>
			</SettingsRow>
		</>
	);
}

/**
 * The API key row while its value cannot be shown (loading or failed).
 *
 * @param {Object}                    props
 * @param {string}                    props.label    The API key row's label.
 * @param {import('react').ReactNode} props.children
 */
function KeyStatusRow({ label, children }) {
	return (
		<SettingsRow label={label} controlId={KEY_ID} labelElement="span">
			{children}
		</SettingsRow>
	);
}

/**
 * The line under the API key: the credits left for a valid key, else how to
 * get one. Nothing on a local site, where a key cannot be claimed.
 *
 * @param {number|null} credits     Credits left, or null without a valid key.
 * @param {boolean}     isAvailable False on a local site.
 * @return {string|null} Help text.
 */
function apiKeyHelp(credits, isAvailable) {
	if (null !== credits) {
		return sprintf(
			/* translators: %s: credits left */
			__(
				'Your API key is valid and you have %s credits left',
				'modula-best-grid-gallery'
			),
			credits
		);
	}
	if (!isAvailable) {
		return null;
	}

	return __(
		'Modula AI needs credits. Paste your API key, or use Get a key to claim a new one.',
		'modula-best-grid-gallery'
	);
}
