import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	CopyField,
	Disclosure,
	Notice,
	Segmented,
	Steps,
} from 'admin-ui';
import { passwordsUnavailable } from '../../mcp-connections/connectionLabels';
import { useCreateConnection } from '../../mcp-connections/useMcpStatus';
import { PasswordConfig } from './PasswordConfig';

const HEADING_ID = 'modula-ai-assistants-connect';

/**
 * A client as the status route describes it.
 *
 * @typedef {Object} McpClient
 * @property {string}                             id           Canonical client id.
 * @property {string}                             label        Client name.
 * @property {Array<{text:string, code?:string}>} steps        OAuth steps for this site.
 * @property {boolean}                            cloud        Connects from the provider's servers; needs a public HTTPS site.
 * @property {?string}                            install_url  One-click install link carrying only the URL, or null.
 * @property {boolean}                            has_fallback Whether a Password connection can be made for it.
 */

/**
 * Connect an assistant: pick a client, follow its sign-in steps (from the
 * server, which knows this site's endpoint), or use a password instead.
 * A new password's config replaces the block until Done.
 *
 * @param {Object}                               props
 * @param {McpClient[]}                          props.clients       Clients, from the status route.
 * @param {boolean}                              props.passwordReady Whether a Password connection can be created.
 * @param {{available: boolean, reason: string}} props.passwords     Application Passwords availability.
 */
export function ConnectAssistant({ clients, passwordReady, passwords }) {
	const create = useCreateConnection();
	const [clientId, setClientId] = useState(clients[0]?.id ?? '');
	const [isPasswordOpen, setPasswordOpen] = useState(false);
	const client =
		clients.find((candidate) => candidate.id === clientId) ?? clients[0];

	// The payload exists only as the mutation result; reset() discards it.
	if (create.data) {
		return (
			<PasswordConfig
				payload={create.data}
				onDone={() => create.reset()}
			/>
		);
	}

	if (!client) {
		return null;
	}

	// The create mutation is shared by every client: an error must not carry over.
	const pick = (id) => {
		setClientId(id);
		setPasswordOpen(false);
		create.reset();
	};

	return (
		<div className="modula-settings-assistants__block">
			<h4 id={HEADING_ID} className="modula-settings-assistants__heading">
				{__('Connect an assistant', 'modula-best-grid-gallery')}
			</h4>
			<Segmented
				options={clients.map(({ id, label }) => ({
					value: id,
					label,
				}))}
				value={client.id}
				onChange={pick}
				aria-labelledby={HEADING_ID}
			/>
			{client.cloud ? (
				<Notice>
					{sprintf(
						/* translators: %s: AI client name, such as ChatGPT */
						__(
							'Signing in from %s works only with a public site on HTTPS: the connection comes from the internet, not from your computer.',
							'modula-best-grid-gallery'
						),
						client.label
					)}
				</Notice>
			) : null}
			<Steps>
				{client.steps.map((step, index) => (
					<ClientStep
						key={step.text}
						step={step}
						number={index + 1}
						client={client}
					/>
				))}
			</Steps>
			{client.has_fallback ? (
				<PasswordFallback
					client={client}
					create={create}
					isReady={passwordReady}
					passwords={passwords}
					isOpen={isPasswordOpen}
					onOpenChange={setPasswordOpen}
				/>
			) : null}
		</div>
	);
}

/**
 * One sign-in step: its text, the client's install button on the first step
 * when it has one (it does that step for you), and the step's code. The code
 * stays visible, since the server's step text points at it.
 *
 * @param {Object}                        props
 * @param {{text: string, code?: string}} props.step
 * @param {number}                        props.number Step number, for the copy button's name.
 * @param {McpClient}                     props.client
 */
function ClientStep({ step, number, client }) {
	const hasInstall = 1 === number && Boolean(client.install_url);

	return (
		<>
			<p>{step.text}</p>
			{hasInstall ? (
				<div className="modula-settings-assistants__actions">
					<Button variant="primary" href={client.install_url}>
						{sprintf(
							/* translators: %s: AI client name, such as Cursor */
							__('Add to %s', 'modula-best-grid-gallery'),
							client.label
						)}
					</Button>
				</div>
			) : null}
			{step.code ? (
				<CopyField
					value={step.code}
					copyLabel={sprintf(
						/* translators: %d: step number */
						__(
							'Copy the code of step %d',
							'modula-best-grid-gallery'
						),
						number
					)}
					multiline
				/>
			) : null}
		</>
	);
}

/**
 * Can't sign in? Use a password: creates a Password connection at once and
 * shows its config once.
 *
 * @param {Object}                               props
 * @param {McpClient}                            props.client       Client the password is for.
 * @param {Object}                               props.create       Shared create-connection mutation.
 * @param {boolean}                              props.isReady      Whether a Password connection can be created.
 * @param {{available: boolean, reason: string}} props.passwords    Application Passwords availability.
 * @param {boolean}                              props.isOpen
 * @param {Function}                             props.onOpenChange
 */
function PasswordFallback({
	client,
	create,
	isReady,
	passwords,
	isOpen,
	onOpenChange,
}) {
	return (
		<div className="modula-settings-assistants__password">
			<Disclosure
				label={__(
					'Can’t sign in? Use a password',
					'modula-best-grid-gallery'
				)}
				open={isOpen}
				onOpenChange={onOpenChange}
			>
				<p className="modula-settings-assistants__muted">
					{__(
						'For an assistant that can’t sign in, such as Claude Desktop with a local site, or a script. Modula adds an Application Password to the Modula agent and shows it once. The agent can use only Modula tools and can’t change site settings.',
						'modula-best-grid-gallery'
					)}
				</p>
				{isReady ? null : (
					<p className="modula-settings-assistants__muted">
						{passwords.available
							? __(
									'Password connections are unavailable on this site.',
									'modula-best-grid-gallery'
								)
							: passwordsUnavailable(passwords.reason)}
					</p>
				)}
				<div>
					<Button
						disabled={!isReady || create.isPending}
						onClick={() => create.mutate(client.id)}
					>
						{create.isPending
							? __('Creating…', 'modula-best-grid-gallery')
							: __(
									'Create a password',
									'modula-best-grid-gallery'
								)}
					</Button>
				</div>
				{create.isError ? (
					<Notice tone="error" role="alert">
						{create.error.message}
					</Notice>
				) : null}
			</Disclosure>
		</div>
	);
}
