/**
 * Debounced PATCH for v2 settings in takeover (optimistic form state + server sync).
 */
import { useEffect, useMemo, useRef } from '@wordpress/element';
import { useTakeoverSaveStatus } from 'editor-shell';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { cloneGroupedSettings } from '../../form/useGallerySettingsForm';
import { collectPatchValidationErrors } from '../../logic/collectPatchValidationErrors';
import { GALLERY_SAVE_OWNERS } from '../../constants/gallerySaveOwners';

const DEBOUNCE_MS = 700;

/**
 * Do not gate autosave on TanStack `isDirty` — it can stay false for some sidebar updates
 * while `values` still differ from `baselineRef`. Rely on non-empty PATCH instead.
 *
 * @param {{ values: Record<string, Record<string, unknown>> }} props
 */
function TakeoverSettingsAutosaveInner({ values }) {
	const {
		patchMutation,
		setClientError,
		acknowledgeSettingsSave,
		getPendingSettingsPatch,
	} = useGallerySettingsFormBundle();
	const { runPersistTask, setDirty } = useTakeoverSaveStatus();
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
		setDirty(
			GALLERY_SAVE_OWNERS.settings,
			Object.keys(getPendingSettingsPatch()).length > 0
		);
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}

		async function flush() {
			const v = cloneGroupedSettings(valuesRef.current);
			const patch = getPendingSettingsPatch(v);
			if (Object.keys(patch).length === 0) {
				setDirty(GALLERY_SAVE_OWNERS.settings, false);
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
					acknowledgeSettingsSave(snapshot, serverData);
					setDirty(
						GALLERY_SAVE_OWNERS.settings,
						Object.keys(getPendingSettingsPatch()).length > 0
					);
					return serverData;
				}, 'settings');
			} catch (error) {
				// The shared indicator retains the failure; a later completed edit retries the current document.
				setClientError(String(error?.message ?? error));
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
		acknowledgeSettingsSave,
		getPendingSettingsPatch,
		runPersistTask,
		setClientError,
		setDirty,
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
