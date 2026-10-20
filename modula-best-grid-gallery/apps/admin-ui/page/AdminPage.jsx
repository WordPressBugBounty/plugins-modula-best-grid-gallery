import { __ } from '@wordpress/i18n';
import { Button } from '../button/Button';
import { CheckIcon } from '../icons/icons';

/**
 * @typedef {'dirty' | 'saving' | 'saved'} SaveState
 */

/**
 * Header text for each save state.
 *
 * @return {Record<SaveState, string>} Labels by state.
 */
function saveStateLabels() {
	return {
		dirty: __('Unsaved changes', 'modula-best-grid-gallery'),
		saving: __('Saving…', 'modula-best-grid-gallery'),
		saved: __('All changes saved', 'modula-best-grid-gallery'),
	};
}

/**
 * Page header: the title, then the save state and the page's single Save
 * button on a page that saves, then the children (the notification bell).
 * A page whose controls save at once passes no save state and gets no Save.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.title
 * @param {SaveState}                 [props.saveState] Omitted on a page without Save.
 * @param {Function}                  [props.onSave]    Required with `saveState`.
 * @param {import('react').ReactNode} [props.children]  Shown last (the notification bell).
 */
export function PageHeader({ title, saveState, onSave, children = null }) {
	return (
		<div className="modula-admin-page-header">
			<h1 className="modula-admin-page-header__title">{title}</h1>
			<div className="modula-admin-page-header__actions">
				{undefined === saveState ? null : (
					<SaveControls saveState={saveState} onSave={onSave} />
				)}
				{children}
			</div>
		</div>
	);
}

/**
 * The save state text and Save.
 *
 * Save stays focusable when there is nothing to save (`aria-disabled`), as in
 * the design, so keyboard focus is not lost when a save finishes.
 *
 * @param {Object}    props
 * @param {SaveState} props.saveState
 * @param {Function}  props.onSave
 */
function SaveControls({ saveState, onSave }) {
	const canSave = 'dirty' === saveState;
	const isSaving = 'saving' === saveState;
	const labels = saveStateLabels();
	// While saving, the button says "Saving…" (artboard); the state text is
	// only announced, so the header does not show it twice.
	const stateClasses = [
		'modula-admin-page-header__state',
		`is-${saveState}`,
		isSaving ? 'modula-admin-sr-only' : '',
	]
		.filter(Boolean)
		.join(' ');
	const save = () => {
		if (canSave) {
			onSave();
		}
	};

	return (
		<>
			<span className={stateClasses} role="status">
				{labels[saveState]}
			</span>
			<Button
				variant="primary"
				className="modula-admin-page-header__save"
				icon={<CheckIcon />}
				aria-disabled={!canSave}
				onClick={save}
			>
				{isSaving
					? labels.saving
					: __('Save changes', 'modula-best-grid-gallery')}
			</Button>
		</>
	);
}

/**
 * Admin page: header on top, an optional tab row under it, then an optional
 * nav column and the content column. Without a nav the content is the
 * single column. At 782px and below the nav stacks above the content.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.header   A PageHeader.
 * @param {import('react').ReactNode} [props.tabs]   PageTabs; omitted on a page outside the tab row.
 * @param {import('react').ReactNode} [props.nav]    A Nav; omitted on a single-column page.
 * @param {import('react').ReactNode} [props.lead]   Content above the section title.
 * @param {import('react').ReactNode} props.title    Title of the current section.
 * @param {import('react').ReactNode} props.children Section content (cards).
 */
export function AdminPage({
	header,
	tabs = null,
	nav = null,
	lead = null,
	title,
	children,
}) {
	return (
		<div className="modula-admin-page">
			{header}
			{tabs}
			<div className="modula-admin-page__body">
				{nav}
				<div className="modula-admin-page__content">
					<div className="modula-admin-page__inner">
						{lead}
						<h2 className="modula-admin-page__title">{title}</h2>
						{children}
					</div>
				</div>
			</div>
		</div>
	);
}
