import { useMutation } from '@tanstack/react-query';
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	ImagePicker,
	SettingsRow,
	Tabs,
	TextInput,
	rowLabelId,
} from 'admin-ui';
import { saveErrorMessage, valueAtPath } from '../model/settingsPageModel';
import { CardFrame } from '../page/CardFrame';
import { CardNotice } from '../page/CardNotice';
import { UnavailableCard } from '../page/UnavailableCard';
import {
	attachmentIdOf,
	hasMediaLibrary,
	useImageLibrary,
	useImagePreview,
} from '../page/mediaLibrary';
import { useCardValues } from '../page/useCardValues';
import { useApiCall } from '../query/useApiCall';
import { emailTabs, hasUnsavedEdits, holdsUnsavedReset } from './emailTabs';
import { TemplateEditor } from './TemplateEditor';

const ID_PREFIX = 'modula-email';

/**
 * @param {string} name Field name.
 * @return {string} Control id.
 */
function controlIdOf(name) {
	return `${ID_PREFIX}-${name.replace(/\./g, '-')}`;
}

/**
 * Email (the Email section): Sender, Invitation and Photographer
 * notification tabs over Pro's proofing email option. Fields save through
 * the global Save. "Send a test email" calls Pro's route once the edits are
 * saved; "Reset to default" puts a template's defaults back as edits. In
 * Lite (no Pro tab) Lite's placeholder shows Sender locked, with the tabs
 * and the test email disabled.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function EmailCard({ card }) {
	const { values, setValue, setValues } = useCardValues(card);
	const [selectedTab, setSelectedTab] = useState(null);
	const tabs = emailTabs(card.config);

	if (null === tabs || 0 === tabs.length) {
		return <UnavailableCard card={card} />;
	}

	const tab = tabs.find(({ value }) => value === selectedTab) ?? tabs[0];
	// A locked section disables everything in it natively, tabs included.
	const Section = card.locked ? 'fieldset' : 'div';

	return (
		<Section className="modula-settings-email" disabled={card.locked}>
			<Tabs
				label={__('Email', 'modula-best-grid-gallery')}
				tabs={tabs}
				value={tab.value}
				onChange={setSelectedTab}
			>
				<CardFrame card={card} title={tab.title}>
					{tab.rows.map((row) => {
						const rowProps = {
							row,
							value: valueAtPath(values, row.name),
							onChange: (next) => setValue(row.name, next),
						};

						return 'logo' === row.kind ? (
							<LogoRow key={row.name} {...rowProps} />
						) : (
							<EmailRow key={row.name} {...rowProps} />
						);
					})}
				</CardFrame>
				<TabAction
					key={tab.value}
					tabs={tabs}
					tab={tab}
					values={values}
					setValues={setValues}
				/>
			</Tabs>
		</Section>
	);
}

/**
 * The logo: a thumbnail with Choose image / Replace and Remove, through
 * the media library.
 *
 * @param {Object}   props
 * @param {Object}   props.row      Logo row (`stored`, `src`).
 * @param {*}        props.value    Chosen attachment ID.
 * @param {Function} props.onChange
 */
function LogoRow({ row, value, onChange }) {
	const id = controlIdOf(row.name);
	const preview = useImagePreview(attachmentIdOf(value), {
		default: row.stored,
		src: row.src,
	});
	const openLibrary = useImageLibrary({
		title: __('Choose a logo', 'modula-best-grid-gallery'),
		buttonText: __('Use this image', 'modula-best-grid-gallery'),
		onSelect: ({ id: chosenId, src }) => {
			preview.remember(chosenId, src);
			onChange(chosenId);
		},
	});

	return (
		<SettingsRow label={row.label} controlId={id} labelElement="span">
			<ImagePicker
				src={preview.src}
				alt={row.label}
				chooseLabel={__('Choose image', 'modula-best-grid-gallery')}
				replaceLabel={__('Replace', 'modula-best-grid-gallery')}
				removeLabel={__('Remove', 'modula-best-grid-gallery')}
				disabled={!hasMediaLibrary()}
				onChoose={openLibrary}
				// The option stores no logo as 0, as Pro's number sanitizer does.
				onRemove={() => onChange(0)}
				aria-labelledby={rowLabelId(id)}
			/>
		</SettingsRow>
	);
}

/**
 * A text or email row, or a template's message editor.
 *
 * @param {Object}   props
 * @param {Object}   props.row      `{ name, label, kind, placeholder, help, placeholders }`.
 * @param {*}        props.value
 * @param {Function} props.onChange
 */
function EmailRow({ row, value, onChange }) {
	const id = controlIdOf(row.name);

	if ('editor' === row.kind) {
		return (
			<TemplateEditor
				id={id}
				label={row.label}
				value={value}
				onChange={onChange}
				placeholders={row.placeholders}
			/>
		);
	}

	return (
		<SettingsRow label={row.label} controlId={id} help={row.help}>
			<TextInput
				id={id}
				type={'email' === row.kind ? 'email' : 'text'}
				value={value ?? ''}
				onChange={onChange}
				placeholder={row.placeholder}
			/>
		</SettingsRow>
	);
}

/**
 * The tab's button below its card, by its action's kind.
 *
 * @param {Object}   props
 * @param {Object[]} props.tabs      All tabs (the test email waits for every tab's edits).
 * @param {Object}   props.tab       The shown tab.
 * @param {Object}   props.values    The option's current value.
 * @param {Function} props.setValues
 */
function TabAction({ tabs, tab, values, setValues }) {
	switch (tab.action?.kind) {
		case 'test':
			return (
				<TestEmailAction
					action={tab.action}
					waitsForSave={hasUnsavedEdits(tabs, values)}
				/>
			);
		case 'reset':
			return (
				<ResetAction
					action={tab.action}
					isPending={holdsUnsavedReset(tab, values)}
					onReset={setValues}
				/>
			);
		default:
			return null;
	}
}

/**
 * Sender's "Send a test email": mails the current user with the saved
 * sender. Pro's route reads the stored option, so it waits while edits are
 * unsaved.
 *
 * @param {Object}  props
 * @param {Object}  props.action       From emailTabs().
 * @param {boolean} props.waitsForSave Edits are unsaved.
 */
function TestEmailAction({ action, waitsForSave }) {
	const doApiCall = useApiCall();
	const call = useMutation({
		mutationFn: () =>
			doApiCall(action.api.path, action.api.method, action.api.data),
	});
	const status = call.isSuccess ? sentMessage(call.data) : null;

	return (
		<div className="modula-settings-email__action">
			<Button
				disabled={null === action.api || waitsForSave || call.isPending}
				onClick={() => call.mutate()}
			>
				{call.isPending ? action.busyLabel : action.label}
			</Button>
			<p className="modula-settings-email__status" role="status">
				{waitsForSave
					? __('Save your changes first.', 'modula-best-grid-gallery')
					: status}
			</p>
			{call.isError ? (
				<CardNotice tone="error" role="alert">
					{saveErrorMessage(
						call.error,
						__('The request failed.', 'modula-best-grid-gallery')
					)}
				</CardNotice>
			) : null}
		</div>
	);
}

/**
 * A template's "Reset to default": puts the default subject and message
 * back as edits, which the global Save stores.
 *
 * @param {Object}   props
 * @param {Object}   props.action    From emailTabs() (`values` by field name, or null).
 * @param {boolean}  props.isPending The defaults are unsaved edits.
 * @param {Function} props.onReset   Receives the values.
 */
function ResetAction({ action, isPending, onReset }) {
	return (
		<div className="modula-settings-email__action">
			<Button
				disabled={null === action.values}
				onClick={() => onReset(action.values)}
			>
				{action.label}
			</Button>
			<p className="modula-settings-email__status" role="status">
				{isPending
					? __(
							'Template reset to default. Save to keep it.',
							'modula-best-grid-gallery'
						)
					: null}
			</p>
		</div>
	);
}

/**
 * @param {Object} response The test email route's response (`to`).
 * @return {string} Confirmation, naming the address when the route does.
 */
function sentMessage(response) {
	if ('string' === typeof response?.to && '' !== response.to) {
		return sprintf(
			/* translators: %s: email address. */
			__('Test email sent to %s.', 'modula-best-grid-gallery'),
			response.to
		);
	}

	return __('Test email sent.', 'modula-best-grid-gallery');
}
