/**
 * Intentional reorg of apps/gallery-editor/components flat files.
 * Run from repo root: node apps/gallery-editor/scripts/reorg-components.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COMPONENTS = path.join(ROOT, 'components');

/** @type {Record<string, string>} basename -> destination dir relative to components/ */
const MOVES = {
	// shell
	'AppHeader.jsx': 'shell',
	'AppearanceToggle.jsx': 'shell',
	'EditorSaveBar.jsx': 'shell',
	'GallerySettingsEditorLoaded.jsx': 'shell',
	'GallerySettingsShellRouter.jsx': 'shell',
	'GalleryTakeoverShell.jsx': 'shell',
	'GalleryTakeoverTopBar.jsx': 'shell',
	'LazySettingsEditorBoundary.jsx': 'shell',
	'SettingsEditorErrorBoundary.jsx': 'shell',
	'SettingsEditorShell.jsx': 'shell',
	'SettingsEditorShellFallback.jsx': 'shell',
	'TakeoverAuxiliaryPanelHost.jsx': 'shell',
	'TakeoverSettingsAutosave.jsx': 'shell',
	'TakeoverTopBarShortcodes.jsx': 'shell',
	'SettingsUndoRedoControls.jsx': 'shell',

	// preview
	'GalleryPreviewPlaceholder.jsx': 'preview',
	'GalleryTakeoverLivePreview.jsx': 'preview',
	'GalleryTakeoverLivePreviewLazy.jsx': 'preview',
	'GalleryTakeoverPreviewChrome.jsx': 'preview',
	'GalleryTakeoverPreviewEmptyState.jsx': 'preview',
	'GalleryTakeoverPreviewUploadDropZone.jsx': 'preview',
	'PreviewAddNewSplit.jsx': 'preview',
	'PreviewCustomGridZoomControls.jsx': 'preview',
	'PreviewUploadPositionSegment.jsx': 'preview',
	'PreviewViewportDropdown.jsx': 'preview',
	'TakeoverImageUploader.jsx': 'preview',

	// schema
	'FieldHelpInfoTip.jsx': 'schema',
	'SchemaCollapsibleFieldGroup.jsx': 'schema',
	'SchemaCompositeRow.jsx': 'schema',
	'SchemaFieldRow.jsx': 'schema',
	'SchemaFieldRowToggleGrid.jsx': 'schema',
	'SchemaFieldRowToggleWithNestedGrid.jsx': 'schema',
	'SettingsCommandPalette.jsx': 'schema',
	'SettingsCommandPaletteLazy.jsx': 'schema',
	'SettingsGroupCard.jsx': 'schema',

	// modals (+ consolidate metadata into existing folder)
	'ContentBlockEditModal.jsx': 'modals',
	'DeleteGalleryImageConfirmModal.jsx': 'modals',
	'FocusPointLetterboxApplyConfirmModal.jsx': 'modals',
	'FocusPointLetterboxPreview.jsx': 'modals',
	'FocusPointModal.jsx': 'modals',
	'GalleryTypeChangeConfirmModal.jsx': 'modals',
	'ImageMetadataLinkUrlRow.jsx': 'image-metadata-modal',
	'ImageMetadataModal.jsx': 'image-metadata-modal',
	'ImageMetadataModalFieldRow.jsx': 'image-metadata-modal',

	// upsell
	'EditorUpsellBlurb.jsx': 'upsell',
	'SpeedupHelpBlurb.jsx': 'upsell',

	// consolidate into existing feature folders
	'CategoryHubDrillRow.jsx': 'sidebar',
	'CategoryHubPanel.jsx': 'sidebar',
	'CategoryPanelContent.jsx': 'sidebar',
	'GalleryReorderPanel.jsx': 'gallery-reorder',
	'WpClassicCaptionEditor.jsx': 'field',
};

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function walk(dir, out = []) {
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, ent.name);
		if (ent.isDirectory()) {
			if (ent.name === 'node_modules' || ent.name === 'generated') {
				continue;
			}
			walk(full, out);
		} else if (/\.(js|jsx|mjs|cjs)$/.test(ent.name)) {
			out.push(full);
		}
	}
	return out;
}

function toPosix(p) {
	return p.split(path.sep).join('/');
}

function stripExt(filePath) {
	return filePath.replace(/\.(jsx?|mjs|cjs)$/, '');
}

/**
 * @returns {{
 *   oldToNew: Map<string, string>,
 *   newAbsToOldAbs: Map<string, string>,
 * }}
 */
function buildPathMaps() {
	/** @type {Map<string, string>} module id without ext */
	const oldToNew = new Map();
	/** @type {Map<string, string>} */
	const newAbsToOldAbs = new Map();

	for (const [file, dest] of Object.entries(MOVES)) {
		const oldAbs = path.join(COMPONENTS, file);
		const newAbs = path.join(COMPONENTS, dest, file);
		const oldRel = toPosix(path.relative(ROOT, stripExt(oldAbs)));
		const newRel = toPosix(path.relative(ROOT, stripExt(newAbs)));
		oldToNew.set(oldRel, newRel);
		newAbsToOldAbs.set(newAbs, oldAbs);
	}
	return { oldToNew, newAbsToOldAbs };
}

/**
 * Resolve import as it was authored (against pre-move location for moved files).
 *
 * @param {string} currentFileAbs
 * @param {string} spec
 * @param {Map<string, string>} newAbsToOldAbs
 */
function resolveAuthoredTarget(currentFileAbs, spec, newAbsToOldAbs) {
	if (!spec.startsWith('.')) {
		return null;
	}
	const resolveFrom = newAbsToOldAbs.get(currentFileAbs) || currentFileAbs;
	const abs = path.resolve(path.dirname(resolveFrom), spec);
	return toPosix(path.relative(ROOT, stripExt(abs)));
}

function relImport(fromFileAbs, targetModuleRel) {
	const targetAbs = path.join(ROOT, targetModuleRel);
	let rel = toPosix(path.relative(path.dirname(fromFileAbs), targetAbs));
	if (!rel.startsWith('.')) {
		rel = './' + rel;
	}
	return rel;
}

function rewriteFileImports(filePath, oldToNew, newAbsToOldAbs) {
	const original = fs.readFileSync(filePath, 'utf8');

	const rewriteSpec = (spec) => {
		const authored = resolveAuthoredTarget(filePath, spec, newAbsToOldAbs);
		if (!authored) {
			return spec;
		}
		const mapped = oldToNew.get(authored) || authored;
		return relImport(filePath, mapped);
	};

	let next = original.replace(
		/(from\s+['"])(\.[^'"]+)(['"])/g,
		(full, a, spec, c) => `${a}${rewriteSpec(spec)}${c}`
	);

	next = next.replace(
		/(import\(\s*['"])(\.[^'"]+)(['"]\s*\))/g,
		(full, a, spec, c) => `${a}${rewriteSpec(spec)}${c}`
	);

	if (next !== original) {
		fs.writeFileSync(filePath, next);
		return true;
	}
	return false;
}

function main() {
	const { oldToNew, newAbsToOldAbs } = buildPathMaps();

	for (const [file, dest] of Object.entries(MOVES)) {
		const from = path.join(COMPONENTS, file);
		const toDir = path.join(COMPONENTS, dest);
		const to = path.join(toDir, file);
		if (!fs.existsSync(from)) {
			console.warn('missing source, skip:', file);
			continue;
		}
		if (fs.existsSync(to)) {
			console.warn('dest exists, skip:', to);
			continue;
		}
		ensureDir(toDir);
		fs.renameSync(from, to);
		console.log('moved', file, '->', dest + '/');
	}

	const files = walk(ROOT).filter(
		(f) => !f.includes(`${path.sep}scripts${path.sep}`)
	);
	let changed = 0;
	for (const file of files) {
		if (rewriteFileImports(file, oldToNew, newAbsToOldAbs)) {
			changed += 1;
			console.log('rewrote', toPosix(path.relative(ROOT, file)));
		}
	}
	console.log('done. files with import updates:', changed);
}

main();
