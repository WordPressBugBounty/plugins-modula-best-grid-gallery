import { useMutation } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { Button, SettingsGroup, SettingsRow, Toggle } from 'admin-ui';
import { saveErrorMessage } from '../model/settingsPageModel';
import { CardFrame } from '../page/CardFrame';
import { CardNotice } from '../page/CardNotice';
import { downloadDebugLog } from '../page/downloadDebugLog';
import { UnavailableCard } from '../page/UnavailableCard';
import { useCardValues } from '../page/useCardValues';
import { useApiCall } from '../query/useApiCall';
import { debugLogForm, hybridMigration, logFileStatus } from './diagnostics';

const TOGGLE_ID = 'modula-debug-log-enabled';
const LOG_FILE_ID = 'modula-debug-log-file';
const HYBRID_STATUS_ID = 'modula-custom-url-hybrid-status';

/**
 * Diagnostics (Debug): the Custom URL hybrid migration while a gallery is
 * eligible, then the Debug log card. Both come from the Diagnostics subtab.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function DiagnosticsCard({ card }) {
	const form = debugLogForm(card.config);
	if (!form) {
		return <UnavailableCard card={card} />;
	}

	return (
		<>
			<HybridMigrationCard
				card={card}
				migration={hybridMigration(card.config)}
			/>
			<DebugLogCard card={card} form={form} />
		</>
	);
}

/**
 * The outcome of a card action: its result, announced, and the server's
 * reason (or the fallback) when it failed.
 *
 * @param {Object}      props
 * @param {string|null} props.done          Result text, empty while there is none; null for an action without one.
 * @param {*}           props.error         The failure, or null.
 * @param {string}      props.failedMessage Shown when the failure carries no message.
 */
function ActionResult({ done, error, failedMessage }) {
	return (
		<>
			{null === done ? null : (
				<p
					className="modula-settings-diagnostics__result"
					role="status"
				>
					{done}
				</p>
			)}
			{error ? (
				<CardNotice tone="error" role="alert">
					{saveErrorMessage(error, failedMessage)}
				</CardNotice>
			) : null}
		</>
	);
}

/**
 * Custom URL tile links (no design): the migration's intro, how many
 * galleries are eligible, and "Fix Custom URL links". After a fix the
 * settings refetch; once nothing is eligible the server sends no migration,
 * so the one the fix ran from stays to show the result.
 *
 * @param {Object}      props
 * @param {Object}      props.card      Projected settings card (Diagnostics).
 * @param {Object|null} props.migration From hybridMigration().
 */
function HybridMigrationCard({ card, migration }) {
	const doApiCall = useApiCall();
	const fix = useMutation({
		mutationFn: (fixedFrom) =>
			doApiCall(
				fixedFrom.fix.route.path,
				fixedFrom.fix.route.method,
				fixedFrom.fix.route.data
			),
	});
	const shownMigration = migration ?? (fix.isSuccess ? fix.variables : null);
	if (!shownMigration) {
		return null;
	}

	return (
		<CardFrame card={card} title={shownMigration.title}>
			<p className="modula-settings-card-message">
				{shownMigration.intro}
			</p>
			{migration ? (
				<SettingsRow
					label={
						<span className="modula-settings-diagnostics__status">
							{migration.status}
						</span>
					}
					controlId={HYBRID_STATUS_ID}
					labelElement="span"
				>
					<Button
						disabled={fix.isPending}
						onClick={() => fix.mutate(migration)}
					>
						{fix.isPending
							? migration.fix.busyLabel
							: migration.fix.label}
					</Button>
				</SettingsRow>
			) : null}
			<ActionResult
				done={fix.isSuccess ? shownMigration.fix.doneMessage : ''}
				error={fix.isError ? fix.error : null}
				failedMessage={shownMigration.fix.failedMessage}
			/>
		</CardFrame>
	);
}

/**
 * Debug log, as in the design: "Record errors for support" turns the
 * Modula Debug Log on or off on Save (the settings class drives the
 * service, and a refused change fails the Save with its reason). The "Log
 * file" group gives the status and downloads or clears the log through its
 * authenticated routes; both need a recorded log.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 * @param {Object} props.form From debugLogForm().
 */
function DebugLogCard({ card, form }) {
	const { values, setValue } = useCardValues(card);
	const doApiCall = useApiCall();
	const download = useMutation({
		mutationFn: async () => {
			const response = await doApiCall(
				form.download.path,
				form.download.method,
				form.download.data,
				{ download: true }
			);
			downloadDebugLog(response.filename, response.body);
		},
	});
	const clear = useMutation({
		mutationFn: () =>
			doApiCall(form.clear.path, form.clear.method, form.clear.data),
	});
	const isOn = true === values[form.toggleName];
	const status = logFileStatus(form.log, isOn);
	const canUseLog =
		form.log.hasFile && !download.isPending && !clear.isPending;

	return (
		<CardFrame card={card}>
			<SettingsRow label={form.toggleLabel} controlId={TOGGLE_ID}>
				<Toggle
					id={TOGGLE_ID}
					checked={isOn}
					onChange={(checked) => setValue(form.toggleName, checked)}
				/>
			</SettingsRow>
			{status.isShown ? (
				<SettingsGroup
					title={__('Log file', 'modula-best-grid-gallery')}
				>
					<SettingsRow
						label={
							<span
								className="modula-settings-diagnostics__status"
								role="status"
							>
								{status.text}
							</span>
						}
						controlId={LOG_FILE_ID}
						labelElement="span"
					>
						<div className="modula-settings-diagnostics__actions">
							<Button
								disabled={!canUseLog}
								onClick={() => download.mutate()}
							>
								{__('Download', 'modula-best-grid-gallery')}
							</Button>
							<Button
								disabled={!canUseLog}
								onClick={() => clear.mutate()}
							>
								{__('Clear', 'modula-best-grid-gallery')}
							</Button>
						</div>
					</SettingsRow>
				</SettingsGroup>
			) : null}
			<ActionResult
				done={
					clear.isSuccess
						? __('Log cleared.', 'modula-best-grid-gallery')
						: ''
				}
				error={clear.isError ? clear.error : null}
				failedMessage={__(
					'The log could not be cleared.',
					'modula-best-grid-gallery'
				)}
			/>
			<ActionResult
				done={null}
				error={download.isError ? download.error : null}
				failedMessage={__(
					'The log could not be downloaded.',
					'modula-best-grid-gallery'
				)}
			/>
		</CardFrame>
	);
}
