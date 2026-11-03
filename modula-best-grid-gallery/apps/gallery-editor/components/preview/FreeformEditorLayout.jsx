/** Pointer gestures are transient; only a completed rectangle enters the settings form. */
import {
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useStore } from 'react-redux';
import {
	FreeformLayout,
	FreeformSurface,
	GalleryPreviewAdminActionsContext,
	changeFreeformStacking,
	constrainFreeformPlacement,
	getCustomGridEditorDragCancelSelector,
	InteractionGridGuide,
	commitPreviewCatalog,
	freeformOccurrenceIds,
	freeformRectangle,
	freeformSurfaceWidth,
} from 'gallery-shared/preview';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import { canArrangeFreeform } from '../../utils/canArrangeFreeform';
import {
	FREEFORM_STACKING_STEPS,
	commitFreeformStacking,
} from '../../utils/freeformStacking';
import { freeformToolbarPosition } from '../../utils/freeformToolbarPosition';
import { selectedTileActions } from '../../utils/selectedTileActions';
import { FreeformSelectionFrame, FreeformSizeBadge } from './FreeformSelection';
import TileToolbar, { TILE_SELECT_BUTTON_SELECTOR } from './TileToolbar';

function FreeformEditorSurface({
	items,
	config,
	composition,
	metrics,
	device,
}) {
	const { form, undoRedo, beginSettingsGesture } =
		useGallerySettingsFormBundle();
	const previewStore = useStore();
	const itemEdit = useGalleryItemEditSidebar();
	const [live, setLive] = useState(null);
	const gestureRef = useRef(null);
	const suppressedClick = useRef(false);
	const editable = canArrangeFreeform(device);

	useEffect(() => {
		if (editable && items.some((item) => !item.freeformId)) {
			const ids = freeformOccurrenceIds(items);
			commitPreviewCatalog(
				previewStore,
				items.map((item, i) => ({ ...item, freeformId: ids[i] }))
			);
		}
	}, [editable, items, previewStore]);
	useEffect(() => {
		if (
			editable &&
			JSON.stringify(config.freeformPlacements || []) !==
				JSON.stringify(composition)
		) {
			undoRedo.reconcileSettingsCheckpoint(() =>
				form.setFieldValue('freeform.placements', composition)
			);
		}
	}, [editable, config.freeformPlacements, composition, form, undoRedo]);
	const cancel = useCallback(() => {
		const gesture = gestureRef.current;
		gestureRef.current = null;
		setLive(null);
		gesture?.endSettingsGesture();
	}, []);
	const compositionSignature = JSON.stringify(
		composition.map(({ id, x, y, w, h, z }) => [id, x, y, w, h, z])
	);
	useEffect(() => {
		cancel();
	}, [metrics.pitch, editable, compositionSignature, cancel]);
	useEffect(() => () => cancel(), [cancel]);
	useEffect(() => {
		const move = (event) => {
			const gesture = gestureRef.current;
			if (!gesture || event.pointerId !== gesture.pointerId) {
				return;
			}
			const dx = Math.round(
				(event.clientX - gesture.clientX) / gesture.pitch
			);
			const dy = Math.round(
				(event.clientY - gesture.clientY) / gesture.pitch
			);
			if (!dx && !dy && !gesture.moved) {
				return;
			}
			gesture.moved = true;
			suppressedClick.current = true;
			const p = { ...gesture.placement };
			if (!gesture.handle) {
				p.x += dx;
				p.y += dy;
			} else {
				const { handle } = gesture;
				if (handle.includes('e')) {
					p.w = Math.min(24 - p.x, Math.max(1, p.w + dx));
				}
				if (handle.includes('s')) {
					p.h = Math.max(1, p.h + dy);
				}
				if (handle.includes('w')) {
					const x = Math.max(0, Math.min(p.x + p.w - 1, p.x + dx));
					p.w += p.x - x;
					p.x = x;
				}
				if (handle.includes('n')) {
					const y = Math.max(0, Math.min(p.y + p.h - 1, p.y + dy));
					p.h += p.y - y;
					p.y = y;
				}
			}
			gesture.next = constrainFreeformPlacement(p);
			setLive(
				gesture.composition.map((tile) =>
					tile.id === p.id ? gesture.next : tile
				)
			);
		};
		const finish = (event) => {
			const gesture = gestureRef.current;
			if (!gesture || event.pointerId !== gesture.pointerId) {
				return;
			}
			if (gesture.moved && gesture.next) {
				const next = gesture.composition.map((tile) =>
					tile.id === gesture.next.id ? gesture.next : tile
				);
				undoRedo.commitSettingsStep(
					gesture.handle
						? __('Resize tile', 'modula-best-grid-gallery')
						: __('Move tile', 'modula-best-grid-gallery'),
					() => form.setFieldValue('freeform.placements', next)
				);
			}
			cancel();
		};
		const key = (event) => {
			if (event.key === 'Escape') {
				cancel();
			}
		};
		const cancelPointer = (event) => {
			if (event.pointerId === gestureRef.current?.pointerId) {
				cancel();
			}
		};
		window.addEventListener('pointermove', move);
		// Capture can be lost just before release; the matching window pointerup still completes it.
		window.addEventListener('pointerup', finish);
		window.addEventListener('pointercancel', cancelPointer);
		window.addEventListener('blur', cancel);
		// Item sidebars consume Escape in capture; cancel the live gesture there too.
		window.addEventListener('keydown', key, true);
		return () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', finish);
			window.removeEventListener('pointercancel', cancelPointer);
			window.removeEventListener('blur', cancel);
			window.removeEventListener('keydown', key, true);
		};
	}, [cancel, form, undoRedo]);
	const start = (event, placement, handle) => {
		const activeGesture = gestureRef.current;
		if (activeGesture && event.pointerId !== activeGesture.pointerId) {
			return;
		}
		if (
			!editable ||
			event.button !== 0 ||
			event.target.closest(getCustomGridEditorDragCancelSelector()) ||
			event.target.closest('a, input, textarea, select')
		) {
			return;
		}
		cancel();
		gestureRef.current = {
			endSettingsGesture: beginSettingsGesture(),
			placement,
			composition,
			pointerId: event.pointerId,
			clientX: event.clientX,
			clientY: event.clientY,
			pitch: metrics.pitch,
			handle,
			moved: false,
		};
		suppressedClick.current = false;
		// Keep a click on the full-tile select button addressed to that button.
		// Capturing on its wrapper would retarget pointerup/click and lose selection.
		const captureTarget =
			event.target.closest(
				'.modula-gallery-preview-item-admin__select-hit'
			) || event.currentTarget;
		captureTarget.setPointerCapture(event.pointerId);
		if (handle) {
			event.preventDefault();
		}
	};
	const painted = live || composition;
	const selectedIndex =
		editable && Number.isInteger(itemEdit?.selectedIndex)
			? itemEdit.selectedIndex
			: -1;
	const selected = painted[selectedIndex] ?? null;
	const resizing =
		live && gestureRef.current?.handle ? gestureRef.current.next : null;
	return (
		<FreeformSurface
			items={items}
			config={config}
			composition={painted}
			metrics={metrics}
			device={device}
			editor
			// A tile body moves (no handle); only the selection frame's handles resize.
			onTilePointerDown={start}
			onTileClickCapture={(event) => {
				if (suppressedClick.current) {
					event.preventDefault();
					event.stopPropagation();
					suppressedClick.current = false;
				}
			}}
		>
			{editable && live && gestureRef.current?.next ? (
				<InteractionGridGuide
					metrics={metrics}
					gesture={gestureRef.current.handle ? 'resize' : 'drag'}
					rectangle={gestureRef.current.next}
				/>
			) : null}
			{selected ? (
				<FreeformSelectionFrame
					rectangle={freeformRectangle(selected, metrics)}
					onHandlePointerDown={(event, handle) =>
						start(event, composition[selectedIndex], handle)
					}
				/>
			) : null}
			{resizing ? (
				<FreeformSizeBadge placement={resizing} metrics={metrics} />
			) : null}
			{selected && !live ? (
				<FreeformTileToolbar
					key={selected.id}
					storeIndex={selectedIndex}
					item={items[selectedIndex]}
					composition={composition}
					metrics={metrics}
				/>
			) : null}
		</FreeformSurface>
	);
}

/**
 * @param {HTMLElement} toolbar Toolbar inside the Freeform surface.
 * @param {string}      tileId  `data-modula-freeform-item` of the tile.
 * @return {HTMLElement|null} The tile's select button.
 */
function findFreeformSelectButton(toolbar, tileId) {
	return (
		toolbar
			.closest('.modula-freeform')
			?.querySelector(
				`[data-modula-freeform-item="${CSS.escape(tileId)}"] ${TILE_SELECT_BUTTON_SELECTOR}`
			) ?? null
	);
}

/**
 * The selected tile's toolbar beside it: Edit, Freeform stacking, Remove.
 *
 * @param {Object}   props
 * @param {number}   props.storeIndex  Selected catalog index.
 * @param {Object}   props.item        Selected catalog row.
 * @param {Object[]} props.composition Committed placements.
 * @param {Object}   props.metrics     Freeform cell metrics.
 */
function FreeformTileToolbar({ storeIndex, item, composition, metrics }) {
	const { form, undoRedo } = useGallerySettingsFormBundle();
	const adminActions = useContext(GalleryPreviewAdminActionsContext);
	const placement = composition[storeIndex];
	const { edit, onRemove } = selectedTileActions(
		item,
		storeIndex,
		'freeform',
		adminActions
	);
	const stacking = FREEFORM_STACKING_STEPS.map((step) => {
		const next = changeFreeformStacking(
			composition,
			placement.id,
			step.action
		);
		return {
			...step,
			disabled: next === composition,
			onClick: () => commitFreeformStacking(form, undoRedo, next),
		};
	});
	return (
		<TileToolbar
			className="modula-tile-toolbar--beside"
			style={freeformToolbarPosition(
				freeformRectangle(placement, metrics),
				freeformSurfaceWidth(metrics)
			)}
			findSelectButton={(toolbar) =>
				findFreeformSelectButton(toolbar, placement.id)
			}
			edit={edit}
			stacking={stacking}
			onRemove={onRemove}
		/>
	);
}
export default function FreeformEditorLayout() {
	return <FreeformLayout Surface={FreeformEditorSurface} />;
}
