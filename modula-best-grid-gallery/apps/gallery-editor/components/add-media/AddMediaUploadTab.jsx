/**
 * Upload files tab: a drop zone and a file picker. The parent uploads the
 * files and adds them to the gallery.
 */
import { useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button } from 'admin-ui';

const UploadIcon = () => (
	<svg
		width="40"
		height="40"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.4"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
		focusable="false"
	>
		<path d="M4 16v4h16v-4M12 4v12M7 9l5-5 5 5" />
	</svg>
);

/**
 * @param {Object}                                  props
 * @param {boolean}                                 props.busy     An add is running.
 * @param {{ current: number, total: number }|null} props.progress Upload progress, while uploading.
 * @param {(files: File[]) => void}                 props.onFiles
 */
export default function AddMediaUploadTab({ busy, progress, onFiles }) {
	const inputRef = useRef(null);
	const [dragOver, setDragOver] = useState(false);

	const onInputChange = (event) => {
		const input = event.target;
		// Copy before clearing `value`: WebKit clears the live FileList.
		const picked = input.files ? Array.from(input.files) : [];
		input.value = '';
		if (picked.length) {
			onFiles(picked);
		}
	};

	const onDrop = (event) => {
		event.preventDefault();
		setDragOver(false);
		const dropped = Array.from(event.dataTransfer?.files ?? []);
		if (!busy && dropped.length) {
			onFiles(dropped);
		}
	};

	return (
		<div
			className={`modula-add-media__drop${dragOver ? ' is-drag-over' : ''}`}
			onDragOver={(event) => {
				event.preventDefault();
				setDragOver(true);
			}}
			onDragLeave={(event) => {
				// Moving onto a child also fires dragleave; only leaving counts.
				if (!event.currentTarget.contains(event.relatedTarget)) {
					setDragOver(false);
				}
			}}
			onDrop={onDrop}
		>
			<span className="modula-add-media__drop-icon">
				<UploadIcon />
			</span>
			<span className="modula-add-media__drop-label">
				{__('Drop images here', 'modula-best-grid-gallery')}
			</span>
			<input
				ref={inputRef}
				type="file"
				className="modula-add-media__file-input"
				accept="image/*"
				multiple
				tabIndex={-1}
				aria-hidden="true"
				onChange={onInputChange}
			/>
			<Button
				variant="primary"
				disabled={busy}
				onClick={() => inputRef.current?.click()}
			>
				{__('Choose files', 'modula-best-grid-gallery')}
			</Button>
			<p className="modula-add-media__status" role="status">
				{progress
					? sprintf(
							/* translators: 1: file being uploaded, 2: number of files */
							__(
								'Uploading %1$d of %2$d…',
								'modula-best-grid-gallery'
							),
							progress.current,
							progress.total
						)
					: ''}
			</p>
		</div>
	);
}
