import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	SettingsCard,
	SettingsRow,
	Skeleton,
	rowDescriptionId,
} from 'admin-ui';
import {
	connectionDetails,
	kindLabel,
} from '../../mcp-connections/connectionLabels';
import {
	useConnections,
	useDisconnect,
	useRegenerate,
} from '../../mcp-connections/useMcpStatus';
import { CardNotice } from '../../page/CardNotice';
import { PasswordConfig } from './PasswordConfig';
import { RecentActivity } from './RecentActivity';
import { useFocusTarget } from './useFocusTarget';

/**
 * Connected: every connection with Disconnect (and Regenerate for Password
 * connections), then Recent activity. A regenerated config lives only in the
 * mutation result (gcTime 0), like a created one.
 *
 * @param {Object}  props
 * @param {boolean} props.passwordReady Whether a new password can be issued.
 */
export function ConnectedCard({ passwordReady }) {
	const { data: connections, isPending, error } = useConnections();
	const regenerate = useRegenerate();

	return (
		<SettingsCard title={__('Connected', 'modula-best-grid-gallery')}>
			{regenerate.data ? (
				<PasswordConfig
					payload={regenerate.data}
					onDone={() => regenerate.reset()}
				/>
			) : (
				<>
					{/* Above the list: a failed regenerate can remove its own row. */}
					{regenerate.isError ? (
						<CardNotice tone="error" role="alert">
							{regenerate.error.message}
						</CardNotice>
					) : null}
					<ConnectionRows
						connections={connections}
						isPending={isPending}
						error={error}
						regenerate={regenerate}
						passwordReady={passwordReady}
					/>
				</>
			)}
			<RecentActivity />
		</SettingsCard>
	);
}

/**
 * @param {Object}  props
 * @param {Array}   props.connections   Rows of the list route.
 * @param {boolean} props.isPending
 * @param {?Error}  props.error
 * @param {Object}  props.regenerate    Shared regenerate mutation.
 * @param {boolean} props.passwordReady
 */
function ConnectionRows({
	connections,
	isPending,
	error,
	regenerate,
	passwordReady,
}) {
	if (isPending) {
		return (
			<p className="modula-settings-card-message">
				<Skeleton width="40%" />
			</p>
		);
	}

	if (error) {
		return (
			<CardNotice tone="error">
				{error.message ||
					__(
						'The connections could not be loaded.',
						'modula-best-grid-gallery'
					)}
			</CardNotice>
		);
	}

	if (0 === connections.length) {
		return (
			<p className="modula-settings-card-message">
				{__('Nothing connected yet.', 'modula-best-grid-gallery')}
			</p>
		);
	}

	return connections.map((connection) => (
		<ConnectionRow
			key={connection.id}
			connection={connection}
			regenerate={regenerate}
			passwordReady={passwordReady}
		/>
	));
}

/** What each action does, asked in the row before it runs. */
const CONFIRMATIONS = {
	disconnect: {
		question: () =>
			/* translators: %s: AI client name */
			__(
				'Disconnect %s? It loses access at once; other connections keep working.',
				'modula-best-grid-gallery'
			),
		confirm: () => __('Disconnect', 'modula-best-grid-gallery'),
		variant: 'danger',
	},
	regenerate: {
		question: () =>
			/* translators: %s: AI client name */
			__(
				'Regenerate the password of %s? The current password stops working at once, and the new config is shown once.',
				'modula-best-grid-gallery'
			),
		confirm: () => __('Regenerate', 'modula-best-grid-gallery'),
		variant: 'primary',
	},
};

/**
 * One connection. Its actions are asked first, in the row's description.
 *
 * @param {Object}  props
 * @param {Object}  props.connection    Row of the list route.
 * @param {Object}  props.regenerate    Shared regenerate mutation.
 * @param {boolean} props.passwordReady Whether a new password can be issued.
 */
function ConnectionRow({ connection, regenerate, passwordReady }) {
	const disconnect = useDisconnect();
	const [confirming, setConfirming] = useState(null);
	const focus = useFocusTarget();
	const ask = (action) => {
		setConfirming(action);
		focus.focusNext('confirm');
	};
	const cancel = () => {
		setConfirming(null);
		focus.focusNext(confirming);
	};
	// Keyed like CONFIRMATIONS: the confirmed action runs its own mutation.
	const mutations = { disconnect, regenerate };
	const isBusy = disconnect.isPending || regenerate.isPending;
	const controlId = `modula-ai-connection-${connection.id}`;
	const confirmation = confirming ? CONFIRMATIONS[confirming] : null;
	const description = confirmation
		? sprintf(confirmation.question(), connection.label)
		: [kindLabel(connection.kind), ...connectionDetails(connection)].join(
				' · '
			);

	return (
		<>
			<SettingsRow
				label={
					<span className="modula-settings-connection">
						<span
							className="modula-settings-connection__dot"
							aria-hidden="true"
						/>
						{connection.label}
					</span>
				}
				controlId={controlId}
				labelElement="span"
				description={description}
			>
				<span
					ref={focus.ref}
					className="modula-settings-assistants__row-actions"
				>
					{confirmation ? (
						<>
							<Button
								data-focus="confirm"
								variant={confirmation.variant}
								disabled={isBusy}
								onClick={() =>
									mutations[confirming].mutate(connection.id)
								}
								aria-describedby={rowDescriptionId(controlId)}
							>
								{confirmation.confirm()}
							</Button>
							<Button disabled={isBusy} onClick={cancel}>
								{__('Cancel', 'modula-best-grid-gallery')}
							</Button>
						</>
					) : (
						<RowActions
							connection={connection}
							isBusy={isBusy}
							passwordReady={passwordReady}
							onRegenerate={() => {
								regenerate.reset();
								ask('regenerate');
							}}
							onDisconnect={() => ask('disconnect')}
						/>
					)}
				</span>
			</SettingsRow>
			{disconnect.isError ? (
				<CardNotice tone="error" role="alert">
					{disconnect.error.message}
				</CardNotice>
			) : null}
		</>
	);
}

/**
 * A connection's actions before one is asked: Regenerate (Password
 * connections) and Disconnect, each named with the connection.
 *
 * @param {Object}   props
 * @param {Object}   props.connection
 * @param {boolean}  props.isBusy
 * @param {boolean}  props.passwordReady
 * @param {Function} props.onRegenerate
 * @param {Function} props.onDisconnect
 */
function RowActions({
	connection,
	isBusy,
	passwordReady,
	onRegenerate,
	onDisconnect,
}) {
	return (
		<>
			{connection.can_regenerate ? (
				<Button
					data-focus="regenerate"
					disabled={isBusy || !passwordReady}
					onClick={onRegenerate}
					aria-label={sprintf(
						/* translators: %s: AI client name */
						__(
							'Regenerate the password of %s',
							'modula-best-grid-gallery'
						),
						connection.label
					)}
				>
					{__('Regenerate', 'modula-best-grid-gallery')}
				</Button>
			) : null}
			<Button
				data-focus="disconnect"
				variant="danger"
				disabled={isBusy}
				onClick={onDisconnect}
				aria-label={sprintf(
					/* translators: %s: AI client name */
					__('Disconnect %s', 'modula-best-grid-gallery'),
					connection.label
				)}
			>
				{__('Disconnect', 'modula-best-grid-gallery')}
			</Button>
		</>
	);
}
