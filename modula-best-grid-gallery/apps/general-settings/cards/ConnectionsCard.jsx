import { useMutation } from '@tanstack/react-query';
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	CopyField,
	ExpandableRow,
	PlanBadge,
	SettingsGroup,
	SettingsRow,
	TextInput,
	rowDescriptionId,
} from 'admin-ui';
import { saveErrorMessage, valueAtPath } from '../model/settingsPageModel';
import { CardFrame } from '../page/CardFrame';
import { CardNotice } from '../page/CardNotice';
import { UnavailableCard } from '../page/UnavailableCard';
import { planLabel, upgradeUrl } from '../page/plan';
import { useCardValues } from '../page/useCardValues';
import { useApiCall } from '../query/useApiCall';
import { accountRows } from './accounts';

const ID_PREFIX = 'modula-connections';

/**
 * Whether an account is set up in the card with its app keys (Vimeo). A
 * locked account shows only its plan and Upgrade.
 *
 * @param {Object} row Account row.
 * @return {boolean} Whether to show the keys.
 */
function hasEditableKeys(row) {
	return 0 < row.keys.length && !row.locked;
}

/**
 * Whether any app key differs from its stored value. Connect uses the
 * stored keys, so it waits for the Save.
 *
 * @param {Object} row    Account row.
 * @param {Object} values The card's values by option name.
 * @return {boolean} Whether keys are unsaved.
 */
function hasUnsavedKeys(row, values) {
	return row.keys.some(
		(key) =>
			'copy' !== key.kind &&
			(valueAtPath(values, key.name) ?? '') !== key.stored
	);
}

/**
 * Connections (the Connections section): the design's Accounts card with
 * Instagram, YouTube and Vimeo. Connect opens the provider; Refresh and
 * Disconnect call the account's own route at once and refetch the settings.
 * Vimeo's app keys save through the global Save. In Lite each account is
 * locked on its own, with its plan badge and Upgrade.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function ConnectionsCard({ card }) {
	const { values, setValue } = useCardValues(card);
	const doApiCall = useApiCall();
	const accountCall = useMutation({
		mutationFn: ({ api }) => doApiCall(api.path, api.method, api.data),
	});
	const rows = accountRows(card.config);

	if (null === rows) {
		return <UnavailableCard card={card} />;
	}

	const runningRowId = accountCall.isPending
		? accountCall.variables.row.id
		: null;

	return (
		<CardFrame card={card}>
			{accountCall.isError ? (
				<CardNotice tone="error" role="alert">
					{sprintf(
						/* translators: 1: account name, 2: server message. */
						__('%1$s: %2$s', 'modula-best-grid-gallery'),
						accountCall.variables.row.label,
						saveErrorMessage(
							accountCall.error,
							__(
								'The request failed.',
								'modula-best-grid-gallery'
							)
						)
					)}
				</CardNotice>
			) : null}
			{rows.map((row) => {
				const busy = runningRowId === row.id;
				const onCall = (item) =>
					accountCall.mutate({ row, api: item.api });

				if (hasEditableKeys(row)) {
					return (
						<AppKeysAccount
							key={row.id}
							row={row}
							busy={busy}
							onCall={onCall}
							values={values}
							setValue={setValue}
						/>
					);
				}

				return (
					<Account
						key={row.id}
						row={row}
						busy={busy}
						onCall={onCall}
					/>
				);
			})}
		</CardFrame>
	);
}

/**
 * Status line under an account name, with the help link when the server
 * has one.
 *
 * @param {Object} props
 * @param {Object} props.row Account row.
 */
function AccountStatus({ row }) {
	return (
		<>
			<span className="modula-settings-account__status">
				{row.status}
			</span>
			{row.docs ? (
				<>
					{' · '}
					<a
						href={row.docs.href}
						target="_blank"
						rel="noopener noreferrer"
					>
						{row.docs.label}
						<span className="modula-admin-sr-only">
							{' '}
							{__(
								'(opens in a new tab)',
								'modula-best-grid-gallery'
							)}
						</span>
					</a>
				</>
			) : null}
		</>
	);
}

/**
 * Account name, with the plan badge while it is locked.
 *
 * @param {Object} props
 * @param {Object} props.row Account row.
 */
function AccountName({ row }) {
	return (
		<span className="modula-settings-account__name">
			{row.label}
			{row.locked ? <PlanBadge plan={planLabel(row.badge)} /> : null}
		</span>
	);
}

/**
 * One account action. Connect is a link to the provider; Refresh and
 * Disconnect call the account's route. The account name, read after the
 * label, tells the same action of several accounts apart.
 *
 * @param {Object}   props
 * @param {Object}   props.row      Account row.
 * @param {Object}   props.item     The action.
 * @param {boolean}  props.disabled
 * @param {Function} props.onCall   Receives a call action.
 */
function ActionButton({ row, item, disabled, onCall }) {
	const accountName = (
		<span className="modula-admin-sr-only"> {row.label}</span>
	);

	if ('connect' === item.kind) {
		return (
			<Button variant="primary" href={item.href} disabled={disabled}>
				{item.label}
				{accountName}
			</Button>
		);
	}

	return (
		<Button disabled={disabled} onClick={() => onCall(item)}>
			{item.label}
			{accountName}
		</Button>
	);
}

/**
 * The account's buttons: Upgrade while locked, else its actions.
 *
 * @param {Object}   props
 * @param {Object}   props.row                 Account row.
 * @param {boolean}  props.busy                An action of this account is running.
 * @param {Function} props.onCall              Receives a call action.
 * @param {boolean}  [props.holdConnect=false] Connect waits (unsaved keys).
 */
function AccountActions({ row, busy, onCall, holdConnect = false }) {
	if (row.locked) {
		return (
			<Button
				variant="primary"
				href={upgradeUrl(row.id)}
				target="_blank"
				rel="noopener noreferrer"
			>
				{__('Upgrade', 'modula-best-grid-gallery')}
				<span className="modula-admin-sr-only">
					{' '}
					{sprintf(
						/* translators: %s: account name, e.g. Instagram. */
						__(
							'for %s (opens in a new tab)',
							'modula-best-grid-gallery'
						),
						row.label
					)}
				</span>
			</Button>
		);
	}

	return (
		<div className="modula-settings-account__actions">
			{row.actions.map((item) => (
				<ActionButton
					key={item.kind}
					row={row}
					item={item}
					disabled={
						busy ||
						('connect' === item.kind &&
							(item.disabled || holdConnect))
					}
					onCall={onCall}
				/>
			))}
		</div>
	);
}

/**
 * An account row: name and status, then its actions.
 *
 * @param {Object}   props
 * @param {Object}   props.row
 * @param {boolean}  props.busy
 * @param {Function} props.onCall
 */
function Account({ row, busy, onCall }) {
	return (
		<SettingsRow
			label={<AccountName row={row} />}
			controlId={`${ID_PREFIX}-${row.id}`}
			labelElement="span"
			description={<AccountStatus row={row} />}
		>
			<AccountActions row={row} busy={busy} onCall={onCall} />
		</SettingsRow>
	);
}

/**
 * An account set up with app keys (Vimeo): "Set up" reveals the keys and
 * the connection. The keys save through the global Save and are read-only
 * while connected; Connect waits until they are saved.
 *
 * @param {Object}   props
 * @param {Object}   props.row
 * @param {boolean}  props.busy
 * @param {Function} props.onCall
 * @param {Object}   props.values   The card's values by option name.
 * @param {Function} props.setValue Records a field value.
 */
function AppKeysAccount({ row, busy, onCall, values, setValue }) {
	const [open, setOpen] = useState(false);
	const unsavedKeys = hasUnsavedKeys(row, values);
	const connectWaits =
		unsavedKeys ||
		row.actions.some((item) => 'connect' === item.kind && item.disabled);

	return (
		<ExpandableRow
			label={row.label}
			description={<AccountStatus row={row} />}
			toggleLabel={__('Set up', 'modula-best-grid-gallery')}
			open={open}
			onOpenChange={setOpen}
		>
			<SettingsGroup
				title={sprintf(
					/* translators: %s: account name, e.g. Vimeo. */
					__('%s app keys', 'modula-best-grid-gallery'),
					row.label
				)}
			>
				{row.keys.map((key) => (
					<AppKey
						key={key.name}
						appKey={key}
						value={valueAtPath(values, key.name) ?? ''}
						onChange={(next) => setValue(key.name, next)}
					/>
				))}
				<SettingsRow
					label={__('Connection', 'modula-best-grid-gallery')}
					controlId={`${ID_PREFIX}-${row.id}-connection`}
					labelElement="span"
					description={
						!row.connected && connectWaits
							? __(
									'Save the app keys, then connect.',
									'modula-best-grid-gallery'
								)
							: null
					}
				>
					<AccountActions
						row={row}
						busy={busy}
						onCall={onCall}
						holdConnect={unsavedKeys}
					/>
				</SettingsRow>
			</SettingsGroup>
		</ExpandableRow>
	);
}

/**
 * One app key: a text or masked input, or a read-only value with Copy.
 *
 * @param {Object}   props
 * @param {Object}   props.appKey   `{ name, label, kind, readOnly }`.
 * @param {string}   props.value
 * @param {Function} props.onChange
 */
function AppKey({ appKey, value, onChange }) {
	const id = `${ID_PREFIX}-${appKey.name.replace(/[^a-z0-9]+/gi, '-')}`;

	if ('copy' === appKey.kind) {
		return (
			<SettingsRow
				label={appKey.label}
				controlId={id}
				labelElement="span"
			>
				<CopyField
					value={value}
					copyLabel={sprintf(
						/* translators: %s: field name, e.g. Redirect URI. */
						__('Copy %s', 'modula-best-grid-gallery'),
						appKey.label
					)}
				/>
			</SettingsRow>
		);
	}

	return (
		<SettingsRow
			label={appKey.label}
			controlId={id}
			description={
				appKey.readOnly
					? __('Disconnect to change it.', 'modula-best-grid-gallery')
					: null
			}
		>
			<TextInput
				id={id}
				type={'password' === appKey.kind ? 'password' : 'text'}
				value={value}
				onChange={onChange}
				readOnly={appKey.readOnly}
				autoComplete="off"
				aria-describedby={
					appKey.readOnly ? rowDescriptionId(id) : undefined
				}
			/>
		</SettingsRow>
	);
}
