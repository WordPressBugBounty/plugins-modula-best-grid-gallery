import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	SettingsCard,
	SettingsRow,
	SkeletonCard,
	Toggle,
	WarningIcon,
	rowHelpId,
	rowLabelId,
} from 'admin-ui';
import {
	OAUTH_HTTPS_REQUIRED,
	useAdapterAction,
	useConnectionSwitch,
	useMcpStatus,
} from '../../mcp-connections/useMcpStatus';
import { adapterStep } from './adapterStep';
import { CardNotice } from '../../page/CardNotice';
import { decodedText } from '../serverText';
import { ConnectAssistant } from './ConnectAssistant';
import { ConnectedCard } from './ConnectedCard';

const SWITCH_ID = 'modula-ai-assistants-enabled';

/**
 * AI assistants (AI): Direct MCP connections, restyled from the MCP
 * Connections panel. Every action calls the panel's own routes at once, so
 * nothing here goes through the global Save or marks the page dirty.
 *
 * Two cards, as in the design: AI assistants (the switch, what the MCP
 * Adapter still needs, Connect an assistant) and Connected (connections and
 * Recent activity).
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card; its label is the title.
 */
export function AiAssistantsCard({ card }) {
	const { data: status, isPending, error } = useMcpStatus();
	const title = decodedText(card.label);

	if (isPending) {
		return <SkeletonCard rows={2} />;
	}

	if (error) {
		return (
			<SettingsCard title={title}>
				<CardNotice tone="error">
					{error.message ||
						__(
							'The AI assistants settings could not be loaded.',
							'modula-best-grid-gallery'
						)}
				</CardNotice>
			</SettingsCard>
		);
	}

	if (status.multisite) {
		return (
			<SettingsCard title={title}>
				<p className="modula-settings-card-message">
					{__(
						'AI assistants are not supported on multisite yet.',
						'modula-best-grid-gallery'
					)}
				</p>
			</SettingsCard>
		);
	}

	return (
		<>
			<SettingsCard title={title}>
				<ConnectionSwitch enabled={status.connections_enabled} />
				{status.connections_enabled ? (
					<AssistantSetup status={status} />
				) : null}
			</SettingsCard>
			<ConnectedCard passwordReady={status.can_create_password} />
		</>
	);
}

/**
 * Let AI assistants work on your galleries. Off refuses every connection but
 * keeps them, so turning it back on restores them without reconnecting.
 *
 * @param {Object}  props
 * @param {boolean} props.enabled Whether assistants may connect now.
 */
function ConnectionSwitch({ enabled }) {
	const toggle = useConnectionSwitch();
	const help = enabled
		? null
		: __(
				'Assistants can’t connect while this is off. Their connections are kept, so turning it back on restores them.',
				'modula-best-grid-gallery'
			);

	return (
		<>
			<SettingsRow
				label={__(
					'Let AI assistants work on your galleries',
					'modula-best-grid-gallery'
				)}
				controlId={SWITCH_ID}
				description={__(
					'Claude, ChatGPT or Cursor can create and edit your galleries.',
					'modula-best-grid-gallery'
				)}
				help={help}
			>
				<Toggle
					id={SWITCH_ID}
					checked={enabled}
					disabled={toggle.isPending}
					onChange={(next) => toggle.mutate(next)}
					aria-describedby={help ? rowHelpId(SWITCH_ID) : undefined}
				/>
			</SettingsRow>
			{toggle.isError ? (
				<CardNotice tone="error" role="alert">
					{toggle.error.message}
				</CardNotice>
			) : null}
		</>
	);
}

/**
 * While assistants may connect: what is still missing, then Connect an
 * assistant once the MCP Adapter is active.
 *
 * @param {Object} props
 * @param {Object} props.status Status route response.
 */
function AssistantSetup({ status }) {
	const step = adapterStep(status);

	return (
		<>
			{'ready' === step ? null : (
				<AdapterRow status={status} step={step} />
			)}
			{OAUTH_HTTPS_REQUIRED === status.oauth.reason ? (
				<RequirementRow
					controlId="modula-ai-assistants-https"
					text={__(
						'Assistants sign in over HTTPS. Serve this site over HTTPS, or mark a development site as local (WP_ENVIRONMENT_TYPE).',
						'modula-best-grid-gallery'
					)}
				/>
			) : null}
			{'ready' === step ? (
				<ConnectAssistant
					clients={status.clients}
					passwordReady={status.can_create_password}
					passwords={status.application_passwords}
				/>
			) : null}
		</>
	);
}

/**
 * One more step: the MCP Adapter row, with Install or Activate when this
 * account may, else where to get it.
 *
 * @param {Object} props
 * @param {Object} props.status Status route response.
 * @param {string} props.step   Adapter step other than `ready`.
 */
function AdapterRow({ status, step }) {
	const controlId = 'modula-ai-assistants-adapter';

	if ('unsupported-wp' === step) {
		return (
			<RequirementRow
				controlId={controlId}
				text={sprintf(
					/* translators: 1: installed WordPress version, 2: required WordPress version */
					__(
						'This site runs WordPress %1$s. AI assistants need WordPress %2$s or newer.',
						'modula-best-grid-gallery'
					),
					status.wordpress.version,
					status.wordpress.required
				)}
			/>
		);
	}

	if ('manual' === step) {
		return (
			<RequirementRow
				controlId={controlId}
				text={__(
					'One more step: the MCP Adapter plugin. Your account can’t install or activate plugins, so ask an administrator who can.',
					'modula-best-grid-gallery'
				)}
			>
				<Button
					href={status.plugin_url}
					target="_blank"
					rel="noreferrer"
				>
					{__('Get the plugin', 'modula-best-grid-gallery')}
				</Button>
			</RequirementRow>
		);
	}

	return <AdapterActionRow controlId={controlId} action={step} />;
}

/** The MCP Adapter row's texts, by the adapter route it calls. */
const ADAPTER_ACTIONS = {
	install: {
		row: () =>
			__(
				'One more step: install the MCP Adapter plugin',
				'modula-best-grid-gallery'
			),
		idle: () => __('Install', 'modula-best-grid-gallery'),
		busy: () => __('Installing…', 'modula-best-grid-gallery'),
	},
	activate: {
		row: () =>
			__(
				'One more step: activate the MCP Adapter plugin',
				'modula-best-grid-gallery'
			),
		idle: () => __('Activate', 'modula-best-grid-gallery'),
		busy: () => __('Activating…', 'modula-best-grid-gallery'),
	},
};

/**
 * The MCP Adapter row with its Install or Activate button.
 *
 * @param {Object}               props
 * @param {string}               props.controlId
 * @param {'install'|'activate'} props.action
 */
function AdapterActionRow({ controlId, action }) {
	const mutation = useAdapterAction(action);
	const texts = ADAPTER_ACTIONS[action];

	return (
		<>
			<RequirementRow controlId={controlId} text={texts.row()}>
				<Button
					id={controlId}
					variant="primary"
					disabled={mutation.isPending}
					onClick={() => mutation.mutate()}
					aria-describedby={rowLabelId(controlId)}
				>
					{mutation.isPending ? texts.busy() : texts.idle()}
				</Button>
			</RequirementRow>
			{mutation.isError ? (
				<CardNotice tone="error" role="alert">
					{mutation.error.message}
				</CardNotice>
			) : null}
		</>
	);
}

/**
 * A row for something the site still needs, led by the warning icon.
 *
 * @param {Object}                    props
 * @param {string}                    props.controlId
 * @param {string}                    props.text
 * @param {import('react').ReactNode} [props.children] Its action.
 */
function RequirementRow({ controlId, text, children = null }) {
	return (
		<SettingsRow
			label={
				<span className="modula-settings-requirement">
					<WarningIcon />
					{text}
				</span>
			}
			controlId={controlId}
			labelElement="span"
		>
			{children}
		</SettingsRow>
	);
}
