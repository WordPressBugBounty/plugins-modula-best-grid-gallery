/**
 * Renders schema-driven drill value summary (text + color swatches).
 */
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import { usePreviewReduxStoreItems } from '../../../hooks/usePreviewReduxStoreItems';
import { useGalleryBootstrapQuery } from '../../../query/useGalleryBootstrapQuery';
import { resolveGalleryAdminPostId } from '../../../utils/resolveGalleryAdminPostId';
import { getInstagramConnectionState } from '../../../platform/instagramRegistry';
import { resolveDrillSummaryParts } from './resolveDrillSummaryParts';

/**
 * @param {Object} props
 * @param {object} props.section Hub drill section
 * @param {Record<string, Record<string, unknown>>} props.values Form values
 */
export default function DrillValueSummary({ section, values }) {
	const summaryKind =
		typeof section?.summaryKind === 'string'
			? section.summaryKind.trim()
			: '';
	const needsPreviewItems = summaryKind === 'filtersList';
	const needsBootstrapItems = summaryKind === 'watermark';
	const needsInstagramConnection = summaryKind === 'instagram';
	const previewItems = usePreviewReduxStoreItems(needsPreviewItems);
	const config = useModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(config);
	const { data: bootstrap } = useGalleryBootstrapQuery(
		needsBootstrapItems && config.takeover ? galleryId : null
	);
	const [instagramTick, setInstagramTick] = useState(0);

	useEffect(() => {
		if (!needsInstagramConnection) {
			return undefined;
		}
		const sync = () => setInstagramTick((n) => n + 1);
		window.addEventListener('modulaInstagramConnectionChanged', sync);
		window.addEventListener('modulaInstagramRegistered', sync);
		return () => {
			window.removeEventListener(
				'modulaInstagramConnectionChanged',
				sync
			);
			window.removeEventListener('modulaInstagramRegistered', sync);
		};
	}, [needsInstagramConnection]);

	void instagramTick;
	void getInstagramConnectionState();

	const parts = resolveDrillSummaryParts(section, values, {
		previewItems: needsPreviewItems ? previewItems : undefined,
		bootstrapItems: needsBootstrapItems
			? Array.isArray(bootstrap?.items)
				? bootstrap.items
				: []
			: undefined,
	});

	if (parts.length === 0) {
		return __('—', 'modula-best-grid-gallery');
	}

	const nodes = [];
	parts.forEach((part, i) => {
		if (i > 0) {
			const prev = parts[i - 1];
			/* Color swatch sits beside the next text — no middot between them. */
			const skipSep = prev.kind === 'color' && part.kind === 'text';
			if (!skipSep) {
				nodes.push(
					<span
						key={`sep-${i}`}
						className="modula-settings-panel__drill-summary-sep"
						aria-hidden="true"
					>
						{' · '}
					</span>
				);
			}
		}
		if (part.kind === 'color') {
			nodes.push(
				<span
					key={`color-${i}`}
					className="modula-settings-panel__drill-summary-swatch"
					style={{ backgroundColor: part.color }}
					title={part.color}
					aria-label={part.color}
				/>
			);
			return;
		}
		nodes.push(
			<span
				key={`text-${i}`}
				className="modula-settings-panel__drill-summary-text"
			>
				{part.text}
			</span>
		);
	});

	return (
		<span className="modula-settings-panel__drill-summary">{nodes}</span>
	);
}
