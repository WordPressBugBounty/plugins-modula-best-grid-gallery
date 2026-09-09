import { __, sprintf } from '@wordpress/i18n';
import { Segmented } from 'shared-ui';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import { useGalleryBootstrapQuery } from '../../../query/useGalleryBootstrapQuery';
import { resolveGalleryAdminPostId } from '../../../utils/resolveGalleryAdminPostId';
import { isNil } from '../../../logic/isNil';
import { useGalleryPreviewTileSelection } from '../../../context/GalleryPreviewTileSelectionContext';

/**
 * @param {unknown[]} items
 * @return {number}
 */
function countWatermarkableImages(items) {
	if (!Array.isArray(items)) {
		return 0;
	}
	const seen = new Set();
	let count = 0;
	for (const item of items) {
		if (!item || typeof item !== 'object') {
			continue;
		}
		const id = Number(/** @type {{ id?: unknown }} */ (item).id);
		if (!Number.isFinite(id) || id <= 0 || seen.has(id)) {
			continue;
		}
		seen.add(id);
		count += 1;
	}
	return count;
}

/**
 * Applies-to segmented control with live “All N images” label.
 *
 * @param {Object}           ctx
 * @param {Object}           ctx.control
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderWatermarkApplyScopeKind({
	control,
	value,
	onChange,
	disabled,
	help,
}) {
	const config = useModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(config);
	const { data: bootstrap } = useGalleryBootstrapQuery(
		config.takeover ? galleryId : null
	);
	const imageCount = countWatermarkableImages(bootstrap?.items);
	const tileSelection = useGalleryPreviewTileSelection();
	const selectedCount = tileSelection?.selectedStoreIndices?.length ?? 0;

	const labels = control.optionLabels || {};
	const options = Array.isArray(control.options)
		? control.options
		: ['all', 'selected'];
	const current =
		isNil(value) || value === ''
			? String(options[0] ?? 'all')
			: String(value);

	const allLabel =
		imageCount > 0
			? sprintf(
					// translators: %d: number of gallery images.
					__('All %d images', 'modula-best-grid-gallery'),
					imageCount
				)
			: labels.all || __('All images', 'modula-best-grid-gallery');

	const segmentedOptions = options.map((option) => {
		const key = String(option);
		let label;
		if (key === 'all') {
			label = allLabel;
		} else if (key === 'selected') {
			label = sprintf(
				// translators: %d: number of selected images.
				__('Selected %d images', 'modula-best-grid-gallery'),
				selectedCount
			);
		} else {
			const raw = labels[key] ?? labels[option] ?? key;
			label = typeof raw === 'string' && raw !== '' ? raw : key;
		}
		return { value: key, label };
	});

	return (
		<div className="modula-settings-editor__segmented-enum">
			<Segmented
				options={segmentedOptions}
				value={current}
				onChange={onChange}
				disabled={disabled}
			/>
			{help ? (
				<p className="modula-settings-editor__field-help">{help}</p>
			) : null}
		</div>
	);
}
