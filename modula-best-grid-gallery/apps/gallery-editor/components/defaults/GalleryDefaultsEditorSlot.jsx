/**
 * Renders a Pro-registered gallery defaults slot with lite form/editor context injected.
 */
import { useEffect, useMemo, useState } from '@wordpress/element';
import { useGalleryDefaultsRegistration } from '../../hooks/useGalleryDefaultsRegistration';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { resolveGalleryAdminPostId } from '../../utils/resolveGalleryAdminPostId';
import { useGalleryBootstrapQuery } from '../../query/useGalleryBootstrapQuery';
import {
	isDefaultsNudgeDismissedForGallery,
	isGalleryEligibleForDefaultsNudge,
} from '../../utils/isGalleryEligibleForDefaultsNudge';
import {
	hasGalleryDefaultsPresets,
	isGalleryDefaultsEntitled,
} from '../../logic/galleryDefaultsGate';
import { useTakeoverSaveStatus } from '../../context/TakeoverSaveStatusContext';
import { useCommitAppliedGalleryDefaultsSettings } from '../../utils/commitAppliedGalleryDefaultsSettings';

/**
 * @param {{
 *   slot: 'Root' | 'AdvancedPanel',
 *   itemCount?: number,
 * }} props
 */
export default function GalleryDefaultsEditorSlot({ slot, itemCount }) {
	const registration = useGalleryDefaultsRegistration();
	const config = useModulaSettingsEditorConfig();
	const formBundle = useGallerySettingsFormBundle();
	const { runPersistTask } = useTakeoverSaveStatus();
	const galleryId = useMemo(
		() => resolveGalleryAdminPostId(config),
		[config]
	);
	const commitAppliedSettings =
		useCommitAppliedGalleryDefaultsSettings(galleryId);
	const { data: bootstrap } = useGalleryBootstrapQuery(
		config.takeover ? galleryId : null
	);

	const entitled = isGalleryDefaultsEntitled(config);
	const Component = registration?.[slot];

	const resolvedItemCount =
		typeof itemCount === 'number'
			? itemCount
			: Array.isArray(bootstrap?.items)
				? bootstrap.items.length
				: 0;

	const [nudgeDismissTick, setNudgeDismissTick] = useState(0);

	useEffect(() => {
		const onDismiss = () => setNudgeDismissTick((n) => n + 1);
		window.addEventListener(
			'modulaGalleryDefaultsNudgeDismissed',
			onDismiss
		);
		return () =>
			window.removeEventListener(
				'modulaGalleryDefaultsNudgeDismissed',
				onDismiss
			);
	}, []);

	const showNudge =
		slot === 'AdvancedPanel' &&
		isGalleryEligibleForDefaultsNudge({
			galleryId,
			postStatus: config.postStatus,
			itemCount: resolvedItemCount,
			hasPresets: hasGalleryDefaultsPresets(config),
			dismissed: isDefaultsNudgeDismissedForGallery(galleryId),
		});

	// nudgeDismissTick forces re-check after dismiss.
	void nudgeDismissTick;

	if (!entitled || !Component) {
		return null;
	}

	const sharedProps = {
		galleryId,
		form: formBundle.form,
		baselineRef: formBundle.baselineRef,
		editorConfig: config,
		postTitle: config.postTitle || '',
		itemCount: resolvedItemCount,
		showNudge,
	};

	if (slot === 'Root') {
		return (
			<Component
				{...sharedProps}
				runPersistTask={runPersistTask}
				commitAppliedSettings={commitAppliedSettings}
			/>
		);
	}

	return <Component {...sharedProps} />;
}
