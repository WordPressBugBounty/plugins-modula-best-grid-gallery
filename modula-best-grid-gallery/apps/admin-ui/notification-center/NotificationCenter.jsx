import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Button } from '../button/Button';
import { ChevronDownIcon, CloseIcon } from '../icons/icons';
import { focusTrapTarget } from './focusTrapTarget';

// What Tab can reach inside the panel.
const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * @typedef {Object} NotificationCenterItem
 * @property {string}                    id          Passed back on Dismiss and open.
 * @property {import('react').ReactNode} title       Shown on the item's button.
 * @property {string}                    meta        Source and age ("Modula · 2 days ago").
 * @property {import('react').ReactNode} [body]      Shown when the item is open.
 * @property {import('react').ReactNode} [actions]   Buttons shown before Dismiss.
 * @property {boolean}                   dismissible Whether it has a Dismiss button.
 */

/**
 * The header bell of a redesigned screen (the WPChill notification center):
 * an avatar button with the count, and an off-canvas panel with the
 * notifications, each opening to its message, actions and Dismiss, plus
 * Dismiss all. The panel is a modal dialog: focus moves to its Close button
 * and stays inside it, and Escape, Close or the backdrop close it and return
 * focus to the bell. The caller owns the notifications and their requests.
 *
 * @param {Object}                   props
 * @param {string}                   props.iconSrc       Avatar image.
 * @param {NotificationCenterItem[]} props.notifications
 * @param {Function}                 props.onDismiss     Receives the item id.
 * @param {Function}                 props.onDismissAll
 * @param {Function}                 [props.onOpenItem]  Receives the id of an item the user opens.
 * @param {string}                   [props.notice]      A failure to show above the list (it then
 *                                                       replaces "You’re all caught up").
 */
export function NotificationCenter({
	iconSrc,
	notifications,
	onDismiss,
	onDismissAll,
	onOpenItem = () => {},
	notice = '',
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [openItemId, setOpenItemId] = useState(null);
	const bellRef = useRef(null);
	const closeRef = useRef(null);
	const panelRef = useRef(null);
	// Where focus goes after the next render: 'close' or 'bell'.
	const focusAfterRender = useRef(null);
	const headingId = `modula-admin-notification-center-${useId()}`;
	const count = notifications.length;

	// Focus follows the panel's markup, which is DOM synchronization, so this
	// runs after every render: to Close when the panel opens, to the bell when
	// it closes, and to Close when the focused control went away with its
	// item (Dismiss, an action, a timed or polled removal), so Escape and the
	// Tab trap keep working.
	useEffect(() => {
		const requested = { close: closeRef, bell: bellRef }[
			focusAfterRender.current
		];
		focusAfterRender.current = null;
		if (requested) {
			requested.current?.focus();
			return;
		}
		const doc = panelRef.current?.ownerDocument;
		if (doc && doc.body === doc.activeElement) {
			closeRef.current?.focus();
		}
	});

	const open = () => {
		focusAfterRender.current = 'close';
		setIsOpen(true);
	};
	const close = () => {
		focusAfterRender.current = 'bell';
		setIsOpen(false);
	};
	const toggleItem = (id) => {
		const willOpen = openItemId !== id;
		setOpenItemId(willOpen ? id : null);
		if (willOpen) {
			onOpenItem(id);
		}
	};
	const onPanelKeyDown = (event) => {
		if ('Escape' === event.key) {
			event.stopPropagation();
			close();
			return;
		}
		if ('Tab' !== event.key) {
			return;
		}
		const focusables = [...panelRef.current.querySelectorAll(FOCUSABLE)];
		const target = focusTrapTarget(
			event.shiftKey,
			focusables.indexOf(event.target.ownerDocument.activeElement),
			focusables.length
		);
		if (null !== target) {
			event.preventDefault();
			focusables[target].focus();
		}
	};

	return (
		<div className="modula-admin-notification-center">
			<button
				type="button"
				ref={bellRef}
				className="modula-admin-notification-center__bell"
				aria-label={
					0 < count
						? sprintf(
								/* translators: %d: number of notifications. */
								_n(
									'Notifications (%d)',
									'Notifications (%d)',
									count,
									'modula-best-grid-gallery'
								),
								count
							)
						: __('Notifications', 'modula-best-grid-gallery')
				}
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				onClick={isOpen ? close : open}
			>
				<img
					className="modula-admin-notification-center__avatar"
					src={iconSrc}
					alt=""
				/>
				{0 < count ? (
					<span
						className="modula-admin-notification-center__count"
						aria-hidden="true"
					>
						{count}
					</span>
				) : null}
			</button>
			{isOpen ? (
				<div className="modula-admin-notification-center__overlay">
					{/* The backdrop closes on click; keyboard users have Close and Escape. */}
					{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
					<div
						className="modula-admin-notification-center__backdrop"
						onClick={close}
					/>
					{/* Escape and the Tab trap are handled for the whole dialog. */}
					{/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
					<div
						ref={panelRef}
						className="modula-admin-notification-center__panel"
						role="dialog"
						aria-modal="true"
						aria-labelledby={headingId}
						onKeyDown={onPanelKeyDown}
					>
						<div className="modula-admin-notification-center__head">
							<img
								className="modula-admin-notification-center__head-avatar"
								src={iconSrc}
								alt=""
							/>
							<h2
								id={headingId}
								className="modula-admin-notification-center__title"
							>
								{__(
									'Notifications',
									'modula-best-grid-gallery'
								)}
							</h2>
							{0 < count ? (
								<Button variant="link" onClick={onDismissAll}>
									{__(
										'Dismiss all',
										'modula-best-grid-gallery'
									)}
								</Button>
							) : null}
							<button
								type="button"
								ref={closeRef}
								className="modula-admin-notification-center__close"
								aria-label={__(
									'Close notifications',
									'modula-best-grid-gallery'
								)}
								onClick={close}
							>
								<CloseIcon size={17} />
							</button>
						</div>
						{'' !== notice ? (
							<p
								className="modula-admin-notification-center__notice"
								role="alert"
							>
								{notice}
							</p>
						) : null}
						{0 === count && '' === notice ? (
							<div className="modula-admin-notification-center__empty">
								<img
									className="modula-admin-notification-center__empty-avatar"
									src={iconSrc}
									alt=""
								/>
								{__(
									'You’re all caught up',
									'modula-best-grid-gallery'
								)}
							</div>
						) : null}
						{0 < count ? (
							<ul className="modula-admin-notification-center__list">
								{notifications.map((item) => (
									<NotificationItem
										key={item.id}
										item={item}
										isOpen={openItemId === item.id}
										onToggle={() => toggleItem(item.id)}
										onDismiss={() => onDismiss(item.id)}
									/>
								))}
							</ul>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}

/**
 * One notification: a button with its title and source line that opens its
 * message, actions and Dismiss.
 *
 * @param {Object}                 props
 * @param {NotificationCenterItem} props.item
 * @param {boolean}                props.isOpen
 * @param {Function}               props.onToggle
 * @param {Function}               props.onDismiss
 */
function NotificationItem({ item, isOpen, onToggle, onDismiss }) {
	const detailsId = `modula-admin-notification-${useId()}`;

	return (
		<li
			className={[
				'modula-admin-notification-center__item',
				isOpen ? 'is-open' : '',
			]
				.filter(Boolean)
				.join(' ')}
		>
			<button
				type="button"
				className="modula-admin-notification-center__toggle"
				aria-expanded={isOpen}
				aria-controls={detailsId}
				onClick={onToggle}
			>
				<span className="modula-admin-notification-center__summary">
					<span className="modula-admin-notification-center__item-title">
						{item.title}
					</span>
					<span className="modula-admin-notification-center__meta">
						{item.meta}
					</span>
				</span>
				<span
					className="modula-admin-notification-center__chevron"
					aria-hidden="true"
				>
					<ChevronDownIcon />
				</span>
			</button>
			<div
				id={detailsId}
				className="modula-admin-notification-center__details"
				hidden={!isOpen}
			>
				{item.body ? (
					<div className="modula-admin-notification-center__body">
						{item.body}
					</div>
				) : null}
				{item.actions || item.dismissible ? (
					<div className="modula-admin-notification-center__actions">
						{item.actions}
						{item.dismissible ? (
							<Button variant="secondary" onClick={onDismiss}>
								{__('Dismiss', 'modula-best-grid-gallery')}
							</Button>
						) : null}
					</div>
				) : null}
			</div>
		</li>
	);
}
