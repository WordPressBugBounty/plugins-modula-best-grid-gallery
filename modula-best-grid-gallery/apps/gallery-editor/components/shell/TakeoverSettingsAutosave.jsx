/**
 * Debounced PATCH for v2 settings in takeover (optimistic form state + server sync).
 */
import { useEffect, useMemo, useRef } from '@wordpress/element';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import {
	cloneGroupedSettings,
	serializeGroupedForServerRef,
} from '../../form/useGallerySettingsForm';
import { normalizeGroupedDefaults } from '../../logic/groupedSettingsNormalize';
import { useTakeoverSaveStatus } from '../../context/TakeoverSaveStatusContext';
import { buildPatchPayload } from '../../logic/buildPatchPayload';
import { collectPatchValidationErrors } from '../../logic/collectPatchValidationErrors';
import { stripRestPostMeta } from '../../utils/applyRestPostStatus';

const DEBOUNCE_MS = 700;

/**
 * Do not gate autosave on TanStack `isDirty` — it can stay false for some sidebar updates
 * while `values` still differ from `baselineRef`. Rely on non-empty PATCH instead.
 *
 * @param {{ values: Record<string, Record<string, unknown>> }} props
 */
function TakeoverSettingsAutosaveInner({ values }) {
	const {
		form,
		patchMutation,
		setClientError,
		baselineRef,
		lastServerSerializedRef,
		undoRedo,
	} = useGallerySettingsFormBundle();
	const { runPersistTask } = useTakeoverSaveStatus();
	const timerRef = useRef(null);
	const valuesRef = useRef(values);
	const savingRef = useRef(false);
	const pendingRef = useRef(false);
	const patchMutationRef = useRef(patchMutation);
	patchMutationRef.current = patchMutation;

	const valuesSig = useMemo(() => JSON.stringify(values ?? {}), [values]);

	useEffect(() => {
		valuesRef.current = values;
	}, [values]);

	useEffect(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}

		async function flush() {
			const v = cloneGroupedSettings(valuesRef.current);
			const patch = buildPatchPayload(v, baselineRef.current);
			if (Object.keys(patch).length === 0) {
				pendingRef.current = false;
				return;
			}
			const errs = collectPatchValidationErrors(patch, v);
			if (errs.length > 0) {
				setClientError(errs.join('\n'));
				pendingRef.current = false;
				return;
			}
			setClientError('');

			savingRef.current = true;
			const snapshot = cloneGroupedSettings(v);
			try {
				await runPersistTask(async () => {
					const serverData =
						await patchMutationRef.current.mutateAsync(patch);
					const normalized = cloneGroupedSettings(
						stripRestPostMeta(serverData)
					);
					normalizeGroupedDefaults(normalized);
					baselineRef.current = normalized;
					lastServerSerializedRef.current =
						serializeGroupedForServerRef(normalized);
					const current = form.state.values;
					if (JSON.stringify(snapshot) === JSON.stringify(current)) {
						form.reset(normalized);
						undoRedo.adoptCheckpointFromForm();
					}
					return serverData;
				});
			} finally {
				savingRef.current = false;
				if (pendingRef.current) {
					pendingRef.current = false;
					void flush();
				}
			}
		}

		const flushSoon = () => {
			if (savingRef.current) {
				pendingRef.current = true;
				return;
			}
			void flush();
		};

		timerRef.current = window.setTimeout(flushSoon, DEBOUNCE_MS);

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [
		valuesSig,
		form,
		baselineRef,
		lastServerSerializedRef,
		runPersistTask,
		setClientError,
		undoRedo,
	]);

	return null;
}

/**
 * Mount inside GalleryTakeoverShell (under form + TakeoverSaveStatus providers).
 */
export default function TakeoverSettingsAutosave() {
	const { form } = useGallerySettingsFormBundle();
	return (
		<form.Subscribe selector={(s) => s.values}>
			{(values) => <TakeoverSettingsAutosaveInner values={values} />}
		</form.Subscribe>
	);
}
