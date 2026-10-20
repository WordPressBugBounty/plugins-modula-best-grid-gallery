import { useId, useMemo, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	Button,
	Checkbox,
	Select,
	SettingsRow,
	TextInput,
	Toggle,
	rowLabelId,
} from 'admin-ui';
import { setDraft } from '../context/actions';
import useStateContext from '../context/useStateContext';
import { CardFrame } from '../page/CardFrame';
import { CardNotice } from '../page/CardNotice';
import { UnavailableCard } from '../page/UnavailableCard';
import { useAjaxCall, useAjaxPost } from '../query/useAjaxCall';
import { migrateForm, runImport } from './migrate';

const ID_PREFIX = 'modula-migrate';

// Migrate never saves: its choices and the import run are page drafts, so
// they survive a section switch, and a running import stays visible (and
// cannot start twice) when the card mounts again.
const FORM_DRAFT = 'migrate';
const RUN_DRAFT = 'migrate_run';
const NO_CHOICES = { source: '', selected: [] };
// `total`, `done`, `imported` and `error` describe the latest run.
// `resultsBySource` keeps every run's results by source and gallery, so a
// gallery imported earlier stays imported after switching sources (the WP
// Core importer keeps no record, so the settings do not change).
const IDLE_RUN = {
	running: false,
	total: 0,
	done: 0,
	imported: 0,
	error: '',
	resultsBySource: {},
};

/**
 * Migrate (the Migrate section): a source, its galleries to import, and
 * "Delete source galleries after import". Import runs at once, gallery by
 * gallery, through the importer's admin-ajax actions; nothing marks the page
 * dirty.
 *
 * @param {Object} props
 * @param {Object} props.card Projected settings card.
 */
export function MigrateCard({ card }) {
	const { state, dispatch } = useStateContext();
	const ajaxCall = useAjaxCall();
	const ajaxPost = useAjaxPost();
	const form = useMemo(() => migrateForm(card.config), [card.config]);

	if (null === form) {
		return <UnavailableCard card={card} />;
	}

	const choices = {
		...NO_CHOICES,
		deleteSource: form.deleteSource,
		...state.drafts?.[FORM_DRAFT],
	};
	const run = { ...IDLE_RUN, ...state.drafts?.[RUN_DRAFT] };
	const source =
		form.sources.find(({ value }) => value === choices.source) ?? null;
	const results = source ? (run.resultsBySource[source.value] ?? {}) : {};
	const setChoices = (changes) =>
		dispatch(setDraft(FORM_DRAFT, { ...choices, ...changes }));
	const isImported = (item) =>
		item.imported || true === results[item.value]?.success;
	const queued = source
		? source.galleries.filter(
				(item) =>
					choices.selected.includes(item.value) && !isImported(item)
			)
		: [];

	const chooseSource = (value) => {
		setChoices({ source: value, selected: [] });
		dispatch(
			setDraft(RUN_DRAFT, {
				...IDLE_RUN,
				resultsBySource: run.resultsBySource,
			})
		);
	};

	const startImport = async () => {
		// Only this run writes the run draft while it lasts (every control
		// is disabled), so it builds each update on its own last one.
		let progress = {
			...run,
			running: true,
			total: queued.length,
			done: 0,
			imported: 0,
			error: '',
		};
		const showProgress = (changes) => {
			progress = { ...progress, ...changes };
			dispatch(setDraft(RUN_DRAFT, progress));
		};
		const onResult = (value, result) =>
			showProgress({
				done: progress.done + 1,
				imported: progress.imported + (result.success ? 1 : 0),
				resultsBySource: {
					...progress.resultsBySource,
					[source.value]: {
						...progress.resultsBySource[source.value],
						[value]: result,
					},
				},
			});

		showProgress({});
		try {
			await runImport(
				{
					source: source.value,
					nonce: source.nonce,
					recordsImported: source.recordsImported,
					deleteSource: choices.deleteSource,
					galleries: queued,
				},
				{
					call: ajaxCall,
					record: (data) => ajaxPost(data, true),
					onResult,
				}
			);
		} catch {
			// Every gallery's result is already shown; this is the record
			// (or an unexpected failure) after them.
			showProgress({
				error: __(
					'The import could not finish. Reload the page to see which galleries were imported.',
					'modula-best-grid-gallery'
				),
			});
		}
		showProgress({ running: false });
	};

	return (
		<CardFrame card={card}>
			<SettingsRow
				label={form.labels.source}
				controlId={`${ID_PREFIX}-source`}
			>
				<Select
					id={`${ID_PREFIX}-source`}
					options={[
						{
							value: '',
							label: __(
								'Select gallery source',
								'modula-best-grid-gallery'
							),
						},
						...form.sources.map(({ value, label }) => ({
							value,
							label,
						})),
					]}
					value={source?.value ?? ''}
					disabled={run.running}
					onChange={chooseSource}
				/>
			</SettingsRow>
			{source ? (
				<SourceRows
					source={source}
					labels={form.labels}
					choices={choices}
					results={results}
					running={run.running}
					isImported={isImported}
					onChange={setChoices}
				/>
			) : null}
			{source && null === source.error ? (
				<ImportAction
					queued={queued.length}
					run={run}
					onImport={startImport}
				/>
			) : null}
		</CardFrame>
	);
}

/**
 * The chosen source's rows: its galleries (or why there are none) and the
 * delete choice.
 *
 * @param {Object}   props
 * @param {Object}   props.source     Source from migrateForm().
 * @param {Object}   props.labels     Row labels from migrateForm().
 * @param {Object}   props.choices    Source, selected galleries, delete choice.
 * @param {Object}   props.results    The source's import results by gallery.
 * @param {boolean}  props.running    An import is running.
 * @param {Function} props.isImported Whether a gallery is imported.
 * @param {Function} props.onChange   Receives changed choices.
 */
function SourceRows({
	source,
	labels,
	choices,
	results,
	running,
	isImported,
	onChange,
}) {
	if (null !== source.error) {
		return <p className="modula-settings-card-message">{source.error}</p>;
	}

	return (
		<>
			<SettingsRow
				label={labels.galleries}
				controlId={`${ID_PREFIX}-galleries`}
				labelElement="span"
				stacked
			>
				<GalleryList
					galleries={source.galleries}
					selected={choices.selected}
					results={results}
					disabled={running}
					isImported={isImported}
					onSelect={(selected) => onChange({ selected })}
				/>
			</SettingsRow>
			<SettingsRow
				label={labels.deleteSource}
				controlId={`${ID_PREFIX}-delete`}
			>
				<Toggle
					id={`${ID_PREFIX}-delete`}
					checked={choices.deleteSource}
					disabled={running}
					onChange={(deleteSource) => onChange({ deleteSource })}
				/>
			</SettingsRow>
		</>
	);
}

/**
 * The source's galleries as a checkbox group, with search and Select all /
 * Deselect all. Imported galleries are checked and disabled; a failed one
 * shows why under its name.
 *
 * @param {Object}   props
 * @param {Object[]} props.galleries  Galleries from migrateForm().
 * @param {string[]} props.selected   Selected gallery values.
 * @param {Object}   props.results    Import result by gallery value.
 * @param {boolean}  props.disabled   An import is running.
 * @param {Function} props.isImported Whether a gallery is imported.
 * @param {Function} props.onSelect   Receives the selected values.
 */
function GalleryList({
	galleries,
	selected,
	results,
	disabled,
	isImported,
	onSelect,
}) {
	const [search, setSearch] = useState('');

	if (0 === galleries.length) {
		return (
			<p className="modula-settings-migrate__empty">
				{__('No galleries found.', 'modula-best-grid-gallery')}
			</p>
		);
	}

	const query = search.trim().toLowerCase();
	const visible = galleries.filter((item) =>
		item.label.toLowerCase().includes(query)
	);
	const importable = galleries
		.filter((item) => !isImported(item))
		.map((item) => item.value);
	const toggle = (value, checked) =>
		onSelect(
			checked
				? [...selected, value]
				: selected.filter((item) => item !== value)
		);

	return (
		<div
			className="modula-settings-migrate"
			role="group"
			aria-labelledby={rowLabelId(`${ID_PREFIX}-galleries`)}
		>
			<div className="modula-settings-migrate__tools">
				<TextInput
					type="search"
					value={search}
					onChange={setSearch}
					placeholder={__(
						'Search galleries…',
						'modula-best-grid-gallery'
					)}
					aria-label={__(
						'Search galleries',
						'modula-best-grid-gallery'
					)}
				/>
				<Button
					variant="link"
					disabled={disabled}
					onClick={() => onSelect(importable)}
				>
					{__('Select all', 'modula-best-grid-gallery')}
				</Button>
				<Button
					variant="link"
					disabled={disabled}
					onClick={() => onSelect([])}
				>
					{__('Deselect all', 'modula-best-grid-gallery')}
				</Button>
			</div>
			<ul className="modula-settings-migrate__list">
				{visible.map((item) => (
					<GalleryOption
						key={item.value}
						item={item}
						checked={selected.includes(item.value)}
						imported={isImported(item)}
						result={results[item.value] ?? null}
						disabled={disabled}
						onToggle={(checked) => toggle(item.value, checked)}
					/>
				))}
			</ul>
			{0 === visible.length ? (
				<p className="modula-settings-migrate__empty">
					{__('No gallery matches.', 'modula-best-grid-gallery')}
				</p>
			) : null}
		</div>
	);
}

/**
 * One gallery: its checkbox, "Imported" once imported, or why its import
 * failed.
 *
 * @param {Object}      props
 * @param {Object}      props.item     Gallery `{ value, label }`.
 * @param {boolean}     props.checked
 * @param {boolean}     props.imported
 * @param {Object|null} props.result   Its latest import result.
 * @param {boolean}     props.disabled
 * @param {Function}    props.onToggle Receives the next checked state.
 */
function GalleryOption({
	item,
	checked,
	imported,
	result,
	disabled,
	onToggle,
}) {
	// Gallery values can be JSON (WP Core), so they cannot form an id.
	const statusId = `${ID_PREFIX}-status-${useId()}`;
	const status = galleryStatus(imported, result);

	return (
		<li className="modula-settings-migrate__item">
			<Checkbox
				label={item.label}
				checked={imported || checked}
				disabled={disabled || imported}
				onChange={onToggle}
				aria-describedby={status ? statusId : undefined}
			/>
			{status ? (
				<span
					id={statusId}
					className={`modula-settings-migrate__status ${status.className}`}
				>
					{status.text}
				</span>
			) : null}
		</li>
	);
}

/**
 * @param {boolean}     imported
 * @param {Object|null} result   Latest import result.
 * @return {{ text: string, className: string }|null} The gallery's status line.
 */
function galleryStatus(imported, result) {
	if (imported) {
		return {
			text: __('Imported', 'modula-best-grid-gallery'),
			className: 'is-imported',
		};
	}
	if (null !== result && !result.success) {
		return { text: result.message, className: 'is-error' };
	}

	return null;
}

/**
 * The Import button, with the run's progress and result.
 *
 * @param {Object}   props
 * @param {number}   props.queued   Selected galleries not imported yet.
 * @param {Object}   props.run      The import run.
 * @param {Function} props.onImport Starts the import.
 */
function ImportAction({ queued, run, onImport }) {
	return (
		<div className="modula-settings-migrate__action">
			<Button
				variant="primary"
				disabled={run.running || 0 === queued}
				onClick={onImport}
			>
				{run.running
					? __('Importing…', 'modula-best-grid-gallery')
					: __('Import', 'modula-best-grid-gallery')}
			</Button>
			<p className="modula-settings-migrate__progress" role="status">
				{runStatus(run)}
			</p>
			{run.error ? (
				<CardNotice tone="error" role="alert">
					{run.error}
				</CardNotice>
			) : null}
		</div>
	);
}

/**
 * @param {Object} run The import run.
 * @return {string|null} Its progress while it runs, then its result.
 */
function runStatus(run) {
	if (run.running) {
		return sprintf(
			/* translators: 1: number of the gallery importing, 2: galleries to import. */
			__('Importing %1$d of %2$d…', 'modula-best-grid-gallery'),
			Math.min(run.done + 1, run.total),
			run.total
		);
	}
	if (0 === run.total) {
		return null;
	}

	return sprintf(
		/* translators: 1: galleries imported, 2: galleries to import. */
		_n(
			'Imported %1$d of %2$d gallery.',
			'Imported %1$d of %2$d galleries.',
			run.total,
			'modula-best-grid-gallery'
		),
		run.imported,
		run.total
	);
}
