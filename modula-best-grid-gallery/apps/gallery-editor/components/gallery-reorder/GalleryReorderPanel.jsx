/**
 * Sort & order settings-column takeover: sort mode + new-image position, then manual reorder (Pro).
 */
import GalleryReorderListStep from './GalleryReorderListStep';
import GalleryReorderSetupStep from './GalleryReorderSetupStep';
import { useGalleryReorderController } from '../../hooks/useGalleryReorderController';

/**
 * @param {{ galleryId: number }} props
 */
function GalleryReorderPanelInner({ galleryId }) {
	const controller = useGalleryReorderController({ galleryId });

	if (controller.step === 'setup') {
		return (
			<GalleryReorderSetupStep
				form={controller.form}
				closePanel={controller.closePanel}
				errorMessage={controller.errorMessage}
				clearError={controller.clearError}
				pro={controller.pro}
				galleryId={controller.galleryId}
				currentMode={controller.currentMode}
				sortRows={controller.sortRows}
				onSortOptionClick={controller.handleSortOptionClick}
				onOpenManualReorder={() => controller.setStep('reorder')}
			/>
		);
	}

	return (
		<GalleryReorderListStep
			closePanel={controller.closePanel}
			errorMessage={controller.errorMessage}
			clearError={controller.clearError}
			orderKeys={controller.orderKeys}
			orderedRows={controller.orderedRows}
			onEditBlock={controller.openContentBlockEdit}
			registerReorderHandleRef={controller.registerReorderHandleRef}
			onDragEnd={controller.onDragEnd}
			onBackToSetup={() => controller.setStep('setup')}
			onApplyOrder={controller.applyManualOrder}
			canApplyOrder={controller.canApplyOrder}
		/>
	);
}

/**
 * Remount panel state when switching galleries so setup/reorder step resets without an effect.
 *
 * @param {{ galleryId: number }} props
 */
export default function GalleryReorderPanel({ galleryId }) {
	return <GalleryReorderPanelInner key={galleryId} galleryId={galleryId} />;
}
