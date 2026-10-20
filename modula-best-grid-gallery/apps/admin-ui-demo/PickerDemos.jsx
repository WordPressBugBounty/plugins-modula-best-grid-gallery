// Image, range and post picker demos (Protection section controls). Sample
// data only; nothing is searched or uploaded.
import { useState } from '@wordpress/element';
import { ImagePicker, Range, TokenPicker } from 'admin-ui';
import { DemoState, DemoStates } from './demoSections';

// A drawn sample "logo", so the demo needs no media file.
const SAMPLE_IMAGE = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1f1f1c"/><text x="32" y="41" font-family="sans-serif" font-size="22" fill="#fff" text-anchor="middle">M</text></svg>'
)}`;

const PAGES = [
	{ value: 12, label: 'About us' },
	{ value: 18, label: 'Contact' },
	{ value: 31, label: 'Spring ’26 shoot' },
	{ value: 44, label: 'Client proofing' },
];

const PICKER_LABELS = {
	chooseLabel: 'Choose image',
	replaceLabel: 'Replace',
	removeLabel: 'Remove',
};

export function ImagePickerStates() {
	const [src, setSrc] = useState(SAMPLE_IMAGE);

	return (
		<DemoStates>
			<DemoState label="Interactive (Remove, then Choose)">
				<ImagePicker
					{...PICKER_LABELS}
					src={src}
					alt="Watermark image"
					onChoose={() => setSrc(SAMPLE_IMAGE)}
					onRemove={() => setSrc('')}
					aria-label="Interactive image picker"
				/>
			</DemoState>
			<DemoState label="No image">
				<ImagePicker
					{...PICKER_LABELS}
					aria-label="Empty image picker"
				/>
			</DemoState>
			<DemoState label="Disabled">
				<ImagePicker
					{...PICKER_LABELS}
					src={SAMPLE_IMAGE}
					alt="Watermark image"
					disabled
					aria-label="Disabled image picker"
				/>
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<ImagePicker
					{...PICKER_LABELS}
					aria-label="Focused image picker"
				/>
			</DemoState>
		</DemoStates>
	);
}

export function RangeStates() {
	const [margin, setMargin] = useState(10);

	return (
		<DemoStates>
			<DemoState label="Interactive">
				<Range
					min={0}
					max={50}
					unit="px"
					value={margin}
					onChange={setMargin}
					aria-label="Interactive margin"
				/>
			</DemoState>
			<DemoState label="Minimum">
				<Range
					min={0}
					max={50}
					unit="px"
					value={0}
					aria-label="Minimum margin"
				/>
			</DemoState>
			<DemoState label="Maximum">
				<Range
					min={0}
					max={50}
					unit="px"
					value={50}
					aria-label="Maximum margin"
				/>
			</DemoState>
			<DemoState label="Disabled">
				<Range
					min={0}
					max={50}
					unit="px"
					value={20}
					disabled
					aria-label="Disabled margin"
				/>
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<Range
					min={0}
					max={50}
					unit="px"
					value={20}
					aria-label="Focused margin"
				/>
			</DemoState>
		</DemoStates>
	);
}

/**
 * The picker over the sample pages, searched by title.
 *
 * @param {Object}   props
 * @param {number[]} props.initial    Chosen page IDs to start with.
 * @param {string}   props.id
 * @param {boolean}  [props.disabled]
 */
function SamplePostPicker({ initial, id, disabled = false }) {
	const [chosen, setChosen] = useState(initial);
	const [query, setQuery] = useState('');
	const typed = query.trim().toLowerCase();
	const suggestions =
		typed.length < 2
			? []
			: PAGES.filter(
					(page) =>
						!chosen.includes(page.value) &&
						page.label.toLowerCase().includes(typed)
				);
	const noMatch =
		typed.length >= 2 && 0 === suggestions.length
			? 'No posts or pages match.'
			: '';

	return (
		<TokenPicker
			id={id}
			tokens={PAGES.filter((page) => chosen.includes(page.value))}
			onRemove={(value) =>
				setChosen(chosen.filter((chosenId) => chosenId !== value))
			}
			query={query}
			onQueryChange={setQuery}
			suggestions={suggestions}
			onPick={(option) => setChosen([...chosen, option.value])}
			status={noMatch}
			placeholder="Search posts and pages"
			removeLabel={(label) => `Remove ${label}`}
			disabled={disabled}
			aria-label="Exceptions"
		/>
	);
}

export function TokenPickerStates() {
	return (
		<DemoStates>
			<DemoState label="Interactive (type “co”)">
				<SamplePostPicker id="demo-posts" initial={[12]} />
			</DemoState>
			<DemoState label="Empty">
				<SamplePostPicker id="demo-posts-empty" initial={[]} />
			</DemoState>
			<DemoState label="Disabled">
				<SamplePostPicker
					id="demo-posts-disabled"
					initial={[12, 31]}
					disabled
				/>
			</DemoState>
		</DemoStates>
	);
}
