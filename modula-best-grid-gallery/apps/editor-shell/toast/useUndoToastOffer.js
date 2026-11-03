/**
 * The removal toast's Undo: it undoes the step it was offered for, and only
 * while that step is current. Once another step is current (a later edit, or
 * Undo/Redo in the header), the toast goes.
 *
 * Each editor calls it once, inside `TakeoverLayout`, with its undo stack.
 */
import { useCallback, useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useTakeoverToast } from './TakeoverToast';

/**
 * @typedef {{ removedMessage: string, restoredMessage: string }} UndoToastCopy
 */

/**
 * @param {Object}      args
 * @param {() => void}  args.undo          The editor's Undo.
 * @param {number|null} args.currentStepId Id of the step at the history cursor.
 * @return {(stepId: number, copy: UndoToastCopy) => void} Shows the toast for the step committed as `stepId`.
 */
export function useUndoToastOffer({ undo, currentStepId }) {
	const toast = useTakeoverToast();
	// The step whose toast still offers Undo.
	const offerRef = useRef(
		/** @type {{ stepId: number, toastId: number }|null} */ (null)
	);

	useEffect(() => {
		const offer = offerRef.current;
		if (offer && offer.stepId !== currentStepId) {
			offerRef.current = null;
			toast?.dismiss(offer.toastId);
		}
	}, [currentStepId, toast]);

	return useCallback(
		(stepId, copy) => {
			if (!toast) {
				return;
			}
			const toastId = toast.show({
				message: copy.removedMessage,
				action: {
					label: __('Undo', 'modula-best-grid-gallery'),
					onClick: () => {
						if (offerRef.current?.stepId !== stepId) {
							return;
						}
						offerRef.current = null;
						undo();
						toast.show({ message: copy.restoredMessage });
					},
				},
			});
			offerRef.current = { stepId, toastId };
		},
		[toast, undo]
	);
}
