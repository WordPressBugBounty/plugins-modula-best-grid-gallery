/**
 * Content block body for the unified gallery item edit modal.
 */
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import ImageEditSidebarNav from '../image-metadata-modal/ImageEditSidebarNav';
import ContentBlockPreviewPanel from './ContentBlockPreviewPanel';
import ContentBlockEditSectionContent from './ContentBlockEditSectionContent';
import { CONTENT_BLOCK_MODAL_SECTIONS } from '../../constants/contentBlockModalSections';
import {
	contentBlockRowStableKey,
	createContentBlockEditInitialState,
} from '../../utils/contentBlockEditState';
import { snapshotCaptionFromImageMetadataEditor } from '../../utils/galleryItemEditDirtyState';

/**
 * @param {Object|null}                                                               item
 * @param {number}                                                                    storeIndex
 * @param {{ current: { getSavePayload: () => Object, onReset: () => void } | null }} handlersRef
 * @param {() => void}                                                                [onStateChange]
 */
function useContentBlockEditSession(
	item,
	storeIndex,
	handlersRef,
	onStateChange
) {
	const rowKey = useMemo(
		() => `${storeIndex}-${contentBlockRowStableKey(item)}`,
		[storeIndex, item]
	);

	const [activeSection, setActiveSection] = useState('content');
	const [state, setStateInternal] = useState(() =>
		createContentBlockEditInitialState(item || {})
	);
	const setState = useCallback(
		(updater) => {
			setStateInternal(updater);
			onStateChange?.();
		},
		[onStateChange]
	);

	/**
	 * Stable key for WpClassicCaptionEditor — TinyMCE must live inside the
	 * Content section so tab remounts tear down / re-init cleanly.
	 */
	const editorInstanceKey = useMemo(() => `cb-${rowKey}`, [rowKey]);

	useEffect(() => {
		setActiveSection('content');
		setState(createContentBlockEditInitialState(item || {}));
	}, [rowKey, item, setState]);

	useLayoutEffect(() => {
		setActiveSection('content');
	}, [rowKey]);

	const hasWpEditor = Boolean(
		typeof window !== 'undefined' && window.wp?.oldEditor?.initialize
	);

	const getSavePayload = () => {
		/*
		 * When the Content tab is mounted, prefer live TinyMCE/textarea so the
		 * last keystroke is not lost. When another tab is active the editor is
		 * unmounted — fall back to React state synced via onChange.
		 */
		const liveBody = hasWpEditor
			? snapshotCaptionFromImageMetadataEditor(editorInstanceKey)
			: undefined;
		return {
			...state,
			blockBodyHtml:
				liveBody !== undefined ? liveBody : state.blockBodyHtml,
		};
	};

	const onReset = () => {
		setState(createContentBlockEditInitialState(item || {}));
	};

	useEffect(() => {
		if (!handlersRef) {
			return undefined;
		}
		handlersRef.current = {
			getSavePayload,
			onReset,
		};
		return () => {
			handlersRef.current = null;
		};
	});

	const selectSection = useCallback(
		(nextSection) => {
			/*
			 * Flush TinyMCE into React state before the Content section unmounts
			 * (section content is keyed by activeSection).
			 */
			if (
				activeSection === 'content' &&
				nextSection !== 'content' &&
				hasWpEditor
			) {
				const liveBody =
					snapshotCaptionFromImageMetadataEditor(editorInstanceKey);
				if (liveBody !== undefined) {
					setState((prev) => ({
						...prev,
						blockBodyHtml: liveBody,
					}));
				}
			}
			setActiveSection(nextSection);
		},
		[activeSection, editorInstanceKey, hasWpEditor, setState]
	);

	return {
		activeSection,
		setActiveSection: selectSection,
		state,
		setState,
		editorInstanceKey,
		hasWpEditor,
	};
}

/**
 * @param {Object}                                                                    props
 * @param {Object}                                                                    props.item
 * @param {number}                                                                    props.storeIndex
 * @param {boolean}                                                                   props.disabled
 * @param {{ current: { getSavePayload: () => Object, onReset: () => void } | null }} props.handlersRef
 * @param {() => void}                                                                [props.onStateChange]
 */
export default function ContentBlockEditContent({
	item,
	storeIndex,
	disabled,
	handlersRef,
	onStateChange,
}) {
	const {
		activeSection,
		setActiveSection,
		state,
		setState,
		editorInstanceKey,
		hasWpEditor,
	} = useContentBlockEditSession(
		item,
		storeIndex,
		handlersRef,
		onStateChange
	);

	return (
		<div className="modula-image-metadata-modal__body">
			<ContentBlockPreviewPanel state={state} />

			<ImageEditSidebarNav
				activeSection={activeSection}
				onSelect={setActiveSection}
				sections={CONTENT_BLOCK_MODAL_SECTIONS}
			/>

			<div className="modula-image-metadata-modal__content">
				<ContentBlockEditSectionContent
					key={`${storeIndex}-${activeSection}`}
					sectionName={activeSection}
					state={state}
					setState={setState}
					editorInstanceKey={editorInstanceKey}
					disabled={disabled}
					hasWpEditor={hasWpEditor}
				/>
			</div>
		</div>
	);
}
