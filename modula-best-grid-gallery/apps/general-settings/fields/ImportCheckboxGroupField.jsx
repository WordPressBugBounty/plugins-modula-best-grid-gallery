import { useCallback, useState } from '@wordpress/element';
import styles from './ImportCheckboxGroupField.module.scss';
import { __ } from '@wordpress/i18n';
import { useAjaxCall } from '../query/useAjaxCall';
import { Button } from '@wordpress/components';
import useStateContext from '../context/useStateContext';
export default function ImportCheckboxGroupField({
	fieldState,
	field,
	handleChange,
	className,
}) {
	const { options, name } = field;
	const selectedValues = fieldState.state.value || [];
	const [loading, setLoading] = useState(false);
	const [importResults, setImportResults] = useState({});
	const [justImported, setJustImported] = useState([]);
	const [search, setSearch] = useState('');
	const { state } = useStateContext();
	const doAjaxCall = useAjaxCall();

	const visibleOptions = options.filter((opt) =>
		opt.label.toLowerCase().includes(search.toLowerCase())
	);

	const source = state.options?.gallery_source || 'core';
	const deleteSource = state.options?.gallery_delete_source || 'keep';

	const isSelected = (value) => selectedValues.includes(value);

	const toggleCheckbox = (value) => {
		if (isSelected(value)) {
			handleChange(selectedValues.filter((v) => v !== value));
		} else {
			handleChange([...selectedValues, value]);
		}
	};

	const handleClick = async () => {
		setLoading(true);
		const importedGalleries = [];
		let remaining = [...selectedValues];
		for (const id of selectedValues) {
			let chunk = 0;
			let attachments = [];
			let endOfArray = false;

			while (!endOfArray) {
				const data = {
					action: 'modula_ajax_import_images',
					id,
					nonce: field.nonce || false,
					chunk,
					source,
				};
				const response = await doAjaxCall(data);

				if (response.attachments) {
					attachments = attachments.concat(response.attachments);
				}

				endOfArray = Boolean(response.end_of_array);
				chunk += 5;
			}

			const galleryOption = options.find((opt) => opt.value === id);
			const importData = {
				action: 'modula_importer_' + source + '_gallery_import',
				id,
				nonce: field.nonce,
				clean: deleteSource,
				gallery_title: galleryOption?.label || '',
				attachments,
				source,
			};

			const importedGallery = await doAjaxCall(importData);

			setImportResults((prev) => ({
				...prev,
				[id]: {
					success: importedGallery.success,
					message:
						importedGallery.message ||
						__('Unknown response', 'modula-best-grid-gallery'),
				},
			}));

			if (importedGallery.success) {
				importedGalleries[id] = importedGallery.modula_gallery_id;
				setJustImported((prev) => [...prev, id]);
				remaining = remaining.filter((v) => v !== id);
				handleChange(remaining);
			}
		}

		if (importedGalleries.length > 0) {
			const updateData = {
				action:
					'modula_importer_' + source + '_gallery_imported_update',
				nonce: field.nonce,
				clean: deleteSource,
				galleries: importedGalleries,
				source,
			};
			doAjaxCall(updateData, true);
		}
		setLoading(false);
	};

	const selectAll = useCallback(() => {
		const allValues = options
			.filter((opt) => !opt.imported)
			.map((opt) => opt.value);
		handleChange(allValues);
	}, [options, handleChange]);

	const deselectAll = useCallback(() => {
		handleChange([]);
	}, [handleChange]);

	return (
		<div className={`${styles.modulaCheckboxGroupWrap} ${className || ''}`}>
			<div className={styles.modulaCheckboxGroup}>
				<div className={styles.modulaCheckboxGroupControls}>
					<button
						type="button"
						onClick={selectAll}
						className={styles.controlButton}
					>
						{__('Select All', 'modula-best-grid-gallery')}
					</button>
					<button
						type="button"
						onClick={deselectAll}
						className={styles.controlButton}
					>
						{__('Deselect All', 'modula-best-grid-gallery')}
					</button>
				</div>

				<input
					type="text"
					className={styles.searchInput}
					placeholder={__(
						'Search galleries…',
						'modula-best-grid-gallery'
					)}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>

				<div className={styles.modulaCheckboxGroupOptions}>
					{visibleOptions.map((option) => (
						/* eslint-disable jsx-a11y/label-has-associated-control */
						<label
							key={option.value}
							className={styles.checkboxOption}
						>
							{option.imported ||
							justImported.includes(option.value) ? (
								<span
									className={styles.importedCheckmark}
									title={__(
										'Already imported',
										'modula-best-grid-gallery'
									)}
								>
									✓
								</span>
							) : (
								<input
									type="checkbox"
									name={`${name}[]`}
									value={option.value}
									checked={isSelected(option.value)}
									onChange={() =>
										toggleCheckbox(option.value)
									}
								/>
							)}
							<span
								dangerouslySetInnerHTML={{
									__html: option.label,
								}}
							/>
							{importResults[option.value] &&
								!importResults[option.value].success && (
									<span
										className={
											styles.modulaCheckboxGroupFail
										}
										dangerouslySetInnerHTML={{
											__html: importResults[option.value]
												.message,
										}}
									/>
								)}
						</label>
					))}
				</div>
			</div>
			<Button
				variant="primary"
				className={`modula_field_button ${className || ''}`}
				onClick={handleClick}
				disabled={loading}
			>
				{loading
					? __('Migrating…', 'modula-best-grid-gallery')
					: __('Migrate', 'modula-best-grid-gallery')}
			</Button>
		</div>
	);
}
