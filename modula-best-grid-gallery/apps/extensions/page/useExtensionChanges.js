import { useCallback, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	changeFailedMessage,
	changeSucceededMessage,
	passwordConfirmation,
	removesPasswords,
} from '../model/extensionChanges';
import { refreshAdminMenu } from '../menu/adminMenu';
import { fetchPasswordProtectedCount } from '../query/passwordProtectedCount';
import { useExtensionChange } from '../query/useExtensionChange';

/**
 * @typedef {import('../model/extensionChanges').ExtensionChange} ExtensionChange
 * @typedef {import('../model/extensionChanges').FocusTarget}     FocusTarget
 */

/**
 * The change in progress. `checking` counts the galleries and albums
 * Password Protect would unlock, `confirming` waits for the admin, `saving`
 * waits for Compatible Pro.
 *
 * @typedef {Object} ChangeStep
 * @property {'checking' | 'confirming' | 'saving'} phase   Where the change is.
 * @property {ExtensionChange}                      change  The change asked for.
 * @property {FocusTarget|null}                     focus   Where focus goes once saved.
 * @property {number}                               [count] Password-protected posts, while confirming.
 */

const NO_TOAST = { message: '', tone: 'success' };

/**
 * Turning extensions on and off from the page, one change at a time: a
 * change that turns Password Protect off is confirmed first (unless no
 * gallery or album has a password), then saved; a toast reports the
 * outcome. A failed save leaves the server's state in place, so the
 * controls show the previous state again.
 *
 * @return {Object} `request( change, focus )`, the pending change, the
 *                  confirmation to show, the toast and the focus request.
 */
export function useExtensionChanges() {
	const save = useExtensionChange();
	/** @type {[ChangeStep|null, Function]} */
	const [step, setStep] = useState(null);
	const [toast, setToast] = useState(NO_TOAST);
	const [focusTarget, setFocusTarget] = useState(null);
	// The step as of the last update. Two clicks in one frame see the same
	// render; the ref lets the second one see the first one's step.
	const stepRef = useRef(null);
	// Stable: the toast's timer and the page's focus effect depend on them.
	const dismissToast = useCallback(() => setToast(NO_TOAST), []);
	const clearFocusTarget = useCallback(() => setFocusTarget(null), []);

	/** @param {ChangeStep|null} next */
	const goTo = (next) => {
		stepRef.current = next;
		setStep(next);
	};

	const finish = () => goTo(null);

	const commit = (change, focus) => {
		goTo({ phase: 'saving', change, focus });
		save.mutate(change, {
			onSuccess: () => {
				setToast({
					message: changeSucceededMessage(change),
					tone: 'success',
				});
				setFocusTarget(focus);
			},
			onError: () => {
				setToast({
					message: changeFailedMessage(change),
					tone: 'error',
				});
			},
			onSettled: () => {
				finish();
				// Modules Pro turned on or off add or remove their menu entries;
				// after a failure too, in case part of the change was stored.
				refreshAdminMenu();
			},
		});
	};

	const checkPasswords = (change, focus) => {
		goTo({ phase: 'checking', change, focus });
		fetchPasswordProtectedCount().then(
			(count) => {
				if (0 === count) {
					commit(change, focus);
					return;
				}
				goTo({ phase: 'confirming', change, focus, count });
			},
			() => {
				// Without the number the admin cannot confirm knowingly: nothing is sent.
				setToast({
					message: __(
						'The password-protected galleries and albums could not be counted. Nothing changed.',
						'modula-best-grid-gallery'
					),
					tone: 'error',
				});
				finish();
			}
		);
	};

	/**
	 * Starts a change; ignored while another one is in progress or for no
	 * change (a locked control).
	 *
	 * @param {ExtensionChange|null} change
	 * @param {FocusTarget|null}     focus  Where focus goes once saved.
	 */
	const request = (change, focus) => {
		if (!change || null !== stepRef.current) {
			return;
		}
		// The toast announces a message when its text changes: clear the last one.
		setToast(NO_TOAST);

		if (removesPasswords(change)) {
			checkPasswords(change, focus);
			return;
		}
		commit(change, focus);
	};

	// Confirm and Cancel act only while the confirmation is still the current
	// step, so a double click cannot save twice.
	const whileConfirming = (action) => () => {
		if ('confirming' === stepRef.current?.phase) {
			action(stepRef.current);
		}
	};
	const confirmation =
		'confirming' === step?.phase
			? {
					...passwordConfirmation(step.change, step.count),
					onConfirm: whileConfirming((current) =>
						commit(current.change, current.focus)
					),
					onCancel: whileConfirming(finish),
				}
			: null;

	return {
		request,
		isBusy: null !== step,
		pendingChange:
			null !== step && 'confirming' !== step.phase ? step.change : null,
		confirmation,
		toast,
		dismissToast,
		focusTarget,
		clearFocusTarget,
	};
}
