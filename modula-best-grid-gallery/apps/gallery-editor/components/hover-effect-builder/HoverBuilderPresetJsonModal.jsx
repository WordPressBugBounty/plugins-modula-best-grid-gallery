import { useId, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ActionRow, Button, FieldStack, Textarea } from 'shared-ui';
import GalleryModal from '../gallery-modal/GalleryModal';
import { getMatchingPresetId } from './hoverBuilderPresets';

const IMPORTABLE_BUILDER_KEYS = new Set([
	'slotPositions',
	'cardTreatment',
	'graphicElement',
	'graphicVisibility',
	'dimOverlay',
	'titleEnter',
	'captionEnter',
	'socialEnter',
	'titleVisibility',
	'captionVisibility',
	'socialVisibility',
	'cardEnterDurationMs',
	'cardEnterDelayMs',
	'titleEnterDurationMs',
	'captionEnterDurationMs',
	'socialEnterDurationMs',
	'titleEnterDelayMs',
	'captionEnterDelayMs',
	'socialEnterDelayMs',
	'titleEnterStaggerMs',
	'captionEnterStaggerMs',
	'socialEnterStaggerMs',
	'sourcePresetId',
]);

/**
 * @param {unknown} value
 * @returns {Record<string, any>|null}
 */
function asObject(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}
	return /** @type {Record<string, any>} */ (value);
}

/**
 * @param {Record<string, any>} raw
 * @returns {{ builderPatch: Record<string, any>, hoverPatch: Record<string, any> }}
 */
function normalizeImportPayload(raw) {
	const root = asObject(raw) || {};
	const explicitBuilder =
		asObject(root.builder) || asObject(root.hoverBuilder) || null;
	const sourceBuilder = explicitBuilder || root;
	const builderPatch = {};
	Object.keys(sourceBuilder).forEach((key) => {
		if (IMPORTABLE_BUILDER_KEYS.has(key)) {
			builderPatch[key] = sourceBuilder[key];
		}
	});

	const hoverPatch = {};
	const hover = asObject(root.hover);
	if (hover) {
		if (typeof hover.hoverColor === 'string') {
			hoverPatch.hoverColor = hover.hoverColor;
		}
		if (Number.isFinite(Number(hover.hoverOpacity))) {
			hoverPatch.hoverOpacity = Number(hover.hoverOpacity);
		}
	}

	return { builderPatch, hoverPatch };
}

/**
 * @param {Record<string, any>} currentBuilder
 * @param {Record<string, any>} builderPatch
 * @returns {Record<string, any>}
 */
function mergeBuilderPatch(currentBuilder, builderPatch) {
	const next = { ...currentBuilder, ...builderPatch };
	const currentPos = asObject(currentBuilder.slotPositions) || {};
	const patchPos = asObject(builderPatch.slotPositions);
	if (patchPos) {
		next.slotPositions = {
			...currentPos,
			...patchPos,
			title: {
				...(asObject(currentPos.title) || {}),
				...(asObject(patchPos.title) || {}),
			},
			caption: {
				...(asObject(currentPos.caption) || {}),
				...(asObject(patchPos.caption) || {}),
			},
			social: {
				...(asObject(currentPos.social) || {}),
				...(asObject(patchPos.social) || {}),
			},
		};
	}
	if (
		typeof next.sourcePresetId !== 'string' ||
		next.sourcePresetId.trim() === ''
	) {
		const matched = getMatchingPresetId(next);
		if (matched) {
			next.sourcePresetId = matched;
		}
	}
	return next;
}

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Record<string, any>} props.currentBuilder
 * @param {string} props.currentHoverColor
 * @param {number} props.currentHoverOpacity
 * @param {(nextBuilder: Record<string, any>, hoverPatch: Record<string, any>) => void} props.onApply
 */
export default function HoverBuilderPresetJsonModal({
	isOpen,
	onClose,
	currentBuilder,
	currentHoverColor,
	currentHoverOpacity,
	onApply,
}) {
	const jsonFieldId = useId();
	const exportPayload = useMemo(
		() => ({
			builder: currentBuilder || {},
			hover: {
				hoverColor: currentHoverColor || 'rgba(0,0,0,.5)',
				hoverOpacity: Number.isFinite(Number(currentHoverOpacity))
					? Number(currentHoverOpacity)
					: 50,
			},
		}),
		[currentBuilder, currentHoverColor, currentHoverOpacity]
	);
	const [rawJson, setRawJson] = useState('');
	const [error, setError] = useState('');
	const [copyLabel, setCopyLabel] = useState('');

	const handleLoadCurrent = () => {
		setRawJson(JSON.stringify(exportPayload, null, 2));
		setError('');
	};

	const handleCopyCurrent = async () => {
		const text = JSON.stringify(exportPayload, null, 2);
		try {
			await navigator.clipboard?.writeText(text);
			setCopyLabel(__('Copied', 'modula-best-grid-gallery'));
		} catch (_err) {
			setCopyLabel(__('Copy failed', 'modula-best-grid-gallery'));
		}
	};

	const handleApply = () => {
		let parsed;
		try {
			parsed = JSON.parse(rawJson || '{}');
		} catch (_err) {
			setError(__('Invalid JSON format.', 'modula-best-grid-gallery'));
			return;
		}
		const { builderPatch, hoverPatch } = normalizeImportPayload(parsed);
		if (
			Object.keys(builderPatch).length === 0 &&
			Object.keys(hoverPatch).length === 0
		) {
			setError(
				__(
					'No preset keys found. Use "builder" and/or "hover" fields.',
					'modula-best-grid-gallery'
				)
			);
			return;
		}
		const nextBuilder = mergeBuilderPatch(
			currentBuilder || {},
			builderPatch
		);
		onApply(nextBuilder, hoverPatch);
		setError('');
		onClose();
	};

	return (
		<GalleryModal
			isOpen={isOpen}
			onClose={onClose}
			size="medium"
			titleId="modula-hover-builder-preset-json-title"
			title={__(
				'Import / export preset JSON',
				'modula-best-grid-gallery'
			)}
			className="modula-gallery-modal--hover-preset-json"
			closeOnBackdropClick={false}
			footerRight={
				<>
					<Button variant="ghost" onClick={onClose}>
						{__('Cancel', 'modula-best-grid-gallery')}
					</Button>
					<Button variant="primary" onClick={handleApply}>
						{__('Apply JSON', 'modula-best-grid-gallery')}
					</Button>
				</>
			}
		>
			<div className="modula-gallery-modal__preset-json-body">
				<p className="modula-gallery-modal__preset-json-intro">
					{__(
						'Paste JSON to import only the preset fields you want to update. Export includes current builder + hover overlay values.',
						'modula-best-grid-gallery'
					)}
				</p>
				<ActionRow className="modula-gallery-modal__preset-json-actions">
					<Button variant="ghost" onClick={handleLoadCurrent}>
						{__('Load current JSON', 'modula-best-grid-gallery')}
					</Button>
					<Button variant="plain" onClick={handleCopyCurrent}>
						{copyLabel ||
							__('Copy current JSON', 'modula-best-grid-gallery')}
					</Button>
				</ActionRow>
				<FieldStack
					label={__('Preset JSON', 'modula-best-grid-gallery')}
					htmlFor={jsonFieldId}
					help={__(
						'Accepted shape: { "builder": { … }, "hover": { "hoverColor": "rgba(0,0,0,.5)", "hoverOpacity": 50 } }',
						'modula-best-grid-gallery'
					)}
				>
					<Textarea
						id={jsonFieldId}
						value={rawJson}
						onChange={(next) => {
							setRawJson(next);
							setError('');
						}}
						rows={16}
					/>
				</FieldStack>
				{error ? (
					<p
						className="modula-gallery-modal__preset-json-error"
						role="alert"
					>
						{error}
					</p>
				) : null}
			</div>
		</GalleryModal>
	);
}
