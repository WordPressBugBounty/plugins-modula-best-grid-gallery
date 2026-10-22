import {
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { dateI18n, getSettings } from '@wordpress/date';
import {
	Button,
	ConfirmDialog,
	ExternalIcon,
	Notice,
	Skeleton,
	Toast,
} from 'admin-ui';
import {
	MY_ACCOUNT_URL,
	PRICING_URL,
	actionFailedMessage,
	activatedMessage,
	cardView,
	maskedKey,
	sitesMeterWidth,
	sitesText,
	statusBadge,
	summaryActions,
	termText,
} from './licenseCardModel';
import { useLicenseAction, useLicenseQuery } from './licenseQuery';

/**
 * @typedef {import('./licenseCardModel').License} License
 */

const NO_TOAST = { message: '', tone: 'success' };

/**
 * @param {number} timestamp Unix timestamp.
 * @return {string} The date in the site's date format.
 */
function formatDate(timestamp) {
	return dateI18n(getSettings().formats.date, new Date(timestamp * 1000));
}

const KeyIcon = () => (
	<svg
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.7"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		focusable="false"
	>
		<path d="M15 7a4 4 0 11-3.9 4.9L3 20v-3h3v-3h3l2.1-2.1A4 4 0 0115 7zM16 10h.01" />
	</svg>
);

const EyeIcon = () => (
	<svg
		width="17"
		height="17"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.7"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		focusable="false"
	>
		<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6" />
	</svg>
);

/**
 * @param {Object}                                    props
 * @param {import('./licenseCardModel').LicenseState} props.state
 */
function StatusBadge({ state }) {
	const { label, tone } = statusBadge(state);

	return (
		<span className={`modula-license-card__badge is-${tone}`}>{label}</span>
	);
}

/**
 * The card's frame: the key icon and the card's content.
 *
 * @param {Object}                    props
 * @param {string}                    [props.className]
 * @param {import('react').ReactNode} props.children
 */
function CardFrame({ className = '', children }) {
	return (
		<section
			className={['modula-license-card', className]
				.filter(Boolean)
				.join(' ')}
			aria-label={__('License', 'modula-best-grid-gallery')}
		>
			<span className="modula-license-card__icon">
				<KeyIcon />
			</span>
			{children}
		</section>
	);
}

/**
 * Sites used of the license's limit, with a meter, and the link to manage
 * them in My Account.
 *
 * @param {Object}                                    props
 * @param {import('./licenseCardModel').LicenseSites} props.sites
 */
function SitesUsed({ sites }) {
	const meterWidth = sitesMeterWidth(sites);

	return (
		<div className="modula-license-card__sites">
			<div className="modula-license-card__sites-line">
				<span>{__('Sites', 'modula-best-grid-gallery')}</span>
				<span className="modula-license-card__sites-count">
					{sitesText(sites)}
				</span>
				<a
					className="modula-license-card__account"
					href={MY_ACCOUNT_URL}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={__(
						'Manage your sites in My Account (opens in a new tab)',
						'modula-best-grid-gallery'
					)}
					title={__(
						'Manage your sites in My Account',
						'modula-best-grid-gallery'
					)}
				>
					<ExternalIcon />
				</a>
			</div>
			{null === meterWidth ? null : (
				<span className="modula-license-card__meter" aria-hidden="true">
					<span style={{ width: meterWidth }} />
				</span>
			)}
		</div>
	);
}

/**
 * The license summary's buttons, in the order the state lists them: Renew
 * (My Account, new tab), Change key and Deactivate.
 *
 * @param {Object}                                    props
 * @param {import('./licenseCardModel').LicenseState} props.state
 * @param {boolean}                                   props.isBusy       A key action is in progress.
 * @param {Function}                                  props.onChangeKey
 * @param {Function}                                  props.onDeactivate
 */
function SummaryActions({ state, isBusy, onChangeKey, onDeactivate }) {
	const buttons = {
		renew: (
			<Button
				key="renew"
				variant="primary"
				href={MY_ACCOUNT_URL}
				target="_blank"
				rel="noopener noreferrer"
			>
				{__('Renew', 'modula-best-grid-gallery')}{' '}
				<span className="modula-admin-sr-only">
					{__('(opens in a new tab)', 'modula-best-grid-gallery')}
				</span>
			</Button>
		),
		change: (
			<Button
				key="change"
				data-license-focus="change"
				aria-disabled={isBusy}
				onClick={onChangeKey}
			>
				{__('Change key', 'modula-best-grid-gallery')}
			</Button>
		),
		deactivate: (
			<Button
				key="deactivate"
				variant="danger"
				// While busy the visible "Deactivating…" names it.
				aria-label={
					isBusy
						? undefined
						: __('Deactivate license', 'modula-best-grid-gallery')
				}
				aria-disabled={isBusy}
				onClick={onDeactivate}
			>
				{isBusy
					? __('Deactivating…', 'modula-best-grid-gallery')
					: __('Deactivate', 'modula-best-grid-gallery')}
			</Button>
		),
	};

	return (
		<div className="modula-license-card__actions">
			{summaryActions(state).map((action) => {
				if (!Object.hasOwn(buttons, action)) {
					throw new Error(`No button for license action: ${action}`);
				}

				return buttons[action];
			})}
		</div>
	);
}

/**
 * The license: plan name, status, term, masked key and sites, with the
 * actions its state allows.
 *
 * @param {Object}   props
 * @param {License}  props.license
 * @param {boolean}  props.isBusy       A key action is in progress.
 * @param {Function} props.onChangeKey
 * @param {Function} props.onDeactivate
 */
function LicenseSummary({ license, isBusy, onChangeKey, onDeactivate }) {
	const term = termText(license, formatDate);
	const key = maskedKey(license.key_last_four);

	return (
		<CardFrame>
			<div className="modula-license-card__main">
				<div className="modula-license-card__title-line">
					<span className="modula-license-card__title">
						{'' === license.product
							? __(
									'Modula Pro license',
									'modula-best-grid-gallery'
								)
							: license.product}
					</span>
					<StatusBadge state={license.state} />
				</div>
				<span className="modula-license-card__meta">
					{term}
					{'' !== term && '' !== key ? ' · ' : null}
					{'' === key ? null : (
						<>
							{__('Key', 'modula-best-grid-gallery')}{' '}
							<span className="modula-license-card__key">
								{key}
							</span>
						</>
					)}
				</span>
			</div>
			<SitesUsed sites={license.sites} />
			<SummaryActions
				state={license.state}
				isBusy={isBusy}
				onChangeKey={onChangeKey}
				onDeactivate={onDeactivate}
			/>
		</CardFrame>
	);
}

/**
 * The key field: a password input with Show, Activate and, while changing
 * the key, Cancel. Without a license it also says where to find a key and
 * where to get one.
 *
 * @param {Object}             props
 * @param {'enter' | 'change'} props.view
 * @param {string}             props.error      Inline error, '' for none.
 * @param {boolean}            props.isBusy     Activation in progress.
 * @param {Function}           props.onActivate Receives the typed key.
 * @param {Function}           props.onEdit     The key changed.
 * @param {Function}           [props.onCancel] Only while changing the key.
 */
function KeyForm({ view, error, isBusy, onActivate, onEdit, onCancel }) {
	const [licenseKey, setLicenseKey] = useState('');
	const [isKeyShown, setKeyShown] = useState(false);
	const inputId = `modula-license-key-${useId()}`;
	const errorId = `${inputId}-error`;
	const isEntering = 'enter' === view;

	const submit = (event) => {
		event.preventDefault();
		if (!isBusy) {
			onActivate(licenseKey);
		}
	};

	return (
		<CardFrame className="is-form">
			<div className="modula-license-card__form">
				<div className="modula-license-card__title-line">
					<span className="modula-license-card__title">
						{isEntering
							? __(
									'Enter your license key',
									'modula-best-grid-gallery'
								)
							: __(
									'Change license key',
									'modula-best-grid-gallery'
								)}
					</span>
					{isEntering ? <StatusBadge state="none" /> : null}
				</div>
				{isEntering ? (
					<p className="modula-license-card__intro">
						{__(
							'Your key turns on the Modula Pro extensions and gets you updates and support.',
							'modula-best-grid-gallery'
						)}
					</p>
				) : null}
				<form
					className="modula-license-card__key-row"
					onSubmit={submit}
				>
					<label htmlFor={inputId} className="modula-admin-sr-only">
						{__('License key', 'modula-best-grid-gallery')}
					</label>
					{/* Not admin-ui's TextInput: Show sits inside the field, and the
					    error goes under the whole row, below Activate. */}
					<span className="modula-license-card__key-field">
						<input
							id={inputId}
							data-license-focus="key"
							className="modula-admin-text-input"
							type={isKeyShown ? 'text' : 'password'}
							autoComplete="off"
							spellCheck={false}
							placeholder={__(
								'Paste your license key',
								'modula-best-grid-gallery'
							)}
							aria-invalid={'' === error ? undefined : 'true'}
							aria-describedby={
								'' === error ? undefined : errorId
							}
							value={licenseKey}
							onChange={(event) => {
								setLicenseKey(event.target.value);
								onEdit();
							}}
						/>
						<button
							type="button"
							className="modula-license-card__show"
							aria-label={__(
								'Show key',
								'modula-best-grid-gallery'
							)}
							aria-pressed={isKeyShown}
							onClick={() => setKeyShown(!isKeyShown)}
						>
							<EyeIcon />
						</button>
					</span>
					<Button
						variant="primary"
						type="submit"
						aria-disabled={isBusy}
					>
						{isBusy
							? __('Activating…', 'modula-best-grid-gallery')
							: __('Activate', 'modula-best-grid-gallery')}
					</Button>
					{isEntering ? null : (
						<Button variant="ghost" onClick={onCancel}>
							{__('Cancel', 'modula-best-grid-gallery')}
						</Button>
					)}
				</form>
				<p
					id={errorId}
					className={
						'' === error
							? 'modula-admin-sr-only'
							: 'modula-license-card__error'
					}
					role="alert"
				>
					{error}
				</p>
				{isEntering ? (
					<div className="modula-license-card__links">
						<a href={MY_ACCOUNT_URL}>
							{__(
								'Where do I find my key?',
								'modula-best-grid-gallery'
							)}
						</a>
						<a href={PRICING_URL}>
							{__('Get a license', 'modula-best-grid-gallery')}
						</a>
					</div>
				) : null}
			</div>
		</CardFrame>
	);
}

/**
 * The card for a loaded license, with its key actions: activate, change
 * the key (Cancel restores the license), and deactivate after a
 * confirmation. Success is reported in a toast; a refused key inline.
 *
 * @param {Object}   props
 * @param {License}  props.license
 * @param {Function} [props.onLicenseChange] Called after a key is activated or deactivated.
 */
function LicenseCardContent({ license, onLicenseChange }) {
	const keyAction = useLicenseAction();
	const [isChangingKey, setChangingKey] = useState(false);
	const [isConfirming, setConfirming] = useState(false);
	const [keyError, setKeyError] = useState('');
	const [toast, setToast] = useState(NO_TOAST);
	// Which control takes focus once the card shows it ('key' or 'change').
	const [focusRequest, setFocusRequest] = useState(null);
	const cardRef = useRef(null);
	const dismissToast = useCallback(() => setToast(NO_TOAST), []);
	const view = cardView(license, isChangingKey);
	const isBusy = keyAction.isPending;

	useEffect(() => {
		if (null === focusRequest) {
			return;
		}
		cardRef.current
			?.querySelector(`[data-license-focus="${focusRequest}"]`)
			?.focus();
		setFocusRequest(null);
	}, [focusRequest]);

	const activate = (licenseKey) => {
		const trimmedKey = licenseKey.trim();
		if ('' === trimmedKey) {
			setKeyError(
				__('Enter your license key.', 'modula-best-grid-gallery')
			);
			return;
		}
		setKeyError('');
		setToast(NO_TOAST);
		keyAction.mutate(
			{ action: 'activate', licenseKey: trimmedKey },
			{
				onSuccess: (activated) => {
					setChangingKey(false);
					setToast({
						message: activatedMessage(activated),
						tone: 'success',
					});
					setFocusRequest('change');
					onLicenseChange?.();
				},
				onError: (error) => {
					setKeyError(actionFailedMessage('activate', error));
				},
			}
		);
	};

	const deactivate = () => {
		setConfirming(false);
		setToast(NO_TOAST);
		keyAction.mutate(
			{ action: 'deactivate' },
			{
				onSuccess: () => {
					setToast({
						message: __(
							'License deactivated on this site',
							'modula-best-grid-gallery'
						),
						tone: 'success',
					});
					setFocusRequest('key');
					onLicenseChange?.();
				},
				onError: (error) => {
					setToast({
						message: actionFailedMessage('deactivate', error),
						tone: 'error',
					});
				},
			}
		);
	};

	const startChange = () => {
		if (isBusy) {
			return;
		}
		setKeyError('');
		setChangingKey(true);
		setFocusRequest('key');
	};

	const cancelChange = () => {
		setKeyError('');
		setChangingKey(false);
		setFocusRequest('change');
	};

	return (
		<div ref={cardRef} className="modula-license-card-wrap">
			{'summary' === view ? (
				<LicenseSummary
					license={license}
					isBusy={isBusy}
					onChangeKey={startChange}
					onDeactivate={() => {
						if (!isBusy) {
							setConfirming(true);
						}
					}}
				/>
			) : (
				<KeyForm
					view={view}
					error={keyError}
					isBusy={isBusy}
					onActivate={activate}
					onEdit={() => setKeyError('')}
					onCancel={cancelChange}
				/>
			)}
			{isConfirming ? (
				<ConfirmDialog
					open
					title={__(
						'Deactivate the license on this site?',
						'modula-best-grid-gallery'
					)}
					message={__(
						'All extensions turn off until you activate a key again.',
						'modula-best-grid-gallery'
					)}
					confirmLabel={__('Deactivate', 'modula-best-grid-gallery')}
					onConfirm={deactivate}
					onCancel={() => setConfirming(false)}
				/>
			) : null}
			<Toast
				message={toast.message}
				tone={toast.tone}
				onDismiss={dismissToast}
			/>
		</div>
	);
}

/**
 * Placeholder while the license loads, announced once.
 */
function LicenseCardSkeleton() {
	return (
		<CardFrame className="is-loading">
			<p className="modula-admin-sr-only" role="status">
				{__('Loading the license…', 'modula-best-grid-gallery')}
			</p>
			<div className="modula-license-card__main" aria-hidden="true">
				<Skeleton width={180} height={18} />
				<Skeleton width={240} height={14} />
			</div>
		</CardFrame>
	);
}

/**
 * The card for the license query's state: loading, failed or loaded.
 *
 * @param {Object}   props
 * @param {Function} [props.onLicenseChange]
 */
function LicenseCardState({ onLicenseChange }) {
	const query = useLicenseQuery();

	if (query.isPending) {
		return <LicenseCardSkeleton />;
	}

	// A failed refetch after an action keeps the license already shown.
	if (query.isError && undefined === query.data) {
		return (
			<CardFrame>
				<Notice
					tone="error"
					role="alert"
					className="modula-license-card__main"
				>
					{__(
						'The license could not be loaded. Reload the page to try again.',
						'modula-best-grid-gallery'
					)}
				</Notice>
			</CardFrame>
		);
	}

	return (
		<LicenseCardContent
			license={query.data}
			onLicenseChange={onLicenseChange}
		/>
	);
}

/**
 * The license card (ADR 0049): the Modula Pro license on this site and its
 * key actions. Render it only with Compatible Pro; it loads the license
 * itself and needs the page's `QueryClientProvider`. It reads no page
 * globals, so any Modula admin screen can show it.
 *
 * @param {Object}   props
 * @param {Function} [props.onLicenseChange] Called after a key is activated or
 *                                           deactivated, when the plan (and so
 *                                           the available extensions) may change.
 */
export function LicenseCard({ onLicenseChange }) {
	// Every state lays itself out by this box's width (_license-card.scss).
	return (
		<div className="modula-license-card-container">
			<LicenseCardState onLicenseChange={onLicenseChange} />
		</div>
	);
}
