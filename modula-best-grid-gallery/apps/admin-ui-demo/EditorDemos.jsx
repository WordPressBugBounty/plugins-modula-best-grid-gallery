// Editor primitives from the gallery editor canvas ("1 · Editor"). Sample
// values only; nothing is saved.
import { useState } from '@wordpress/element';
import {
	Accordion,
	AccordionSection,
	Button,
	Chip,
	ChoiceList,
	ColorField,
	CopyField,
	DesktopIcon,
	Dialog,
	Menu,
	MenuGroup,
	MenuItem,
	PhoneIcon,
	PlanBadge,
	Popover,
	PositionPad,
	PresetTiles,
	Range,
	ResetButton,
	Segmented,
	TabList,
	TabPanel,
	TabletIcon,
	Toast,
	Toggle,
	UnitInput,
} from 'admin-ui';
import { DemoState, DemoStates } from './demoSections';

const LENGTH_UNITS = ['px', '%', 'em', 'rem', 'vw', 'vh'];

// The canvas's preset swatches (HE_PRESETS).
const COLOR_PRESETS = [
	'#ffffff',
	'#f2f2ee',
	'#9a9a93',
	'#3a3a37',
	'#000000',
	'#1f1f1c',
	'#1d8a5b',
	'#e0a100',
	'#d9480f',
	'#c2255c',
];

const WATERMARK_POSITIONS = [
	['top_left', 'Top left'],
	['top_center', 'Top center'],
	['top_right', 'Top right'],
	['middle_left', 'Middle left'],
	['center', 'Center'],
	['middle_right', 'Middle right'],
	['bottom_left', 'Bottom left'],
	['bottom_center', 'Bottom center'],
	['bottom_right', 'Bottom right'],
].map(([value, label]) => ({ value, label }));

const DEVICES = [
	{ value: 'desktop', label: 'Desktop', icon: <DesktopIcon /> },
	{ value: 'tablet', label: 'Tablet', icon: <TabletIcon /> },
	{ value: 'phone', label: 'Mobile', icon: <PhoneIcon /> },
];

const PRO = <PlanBadge plan="PRO" tone="outline" lock />;

export function UnitRangeStates() {
	const [gutter, setGutter] = useState(10);
	const [unit, setUnit] = useState('px');

	return (
		<DemoStates>
			<DemoState label="Interactive (pick a unit)">
				<Range
					min={0}
					max={100}
					value={gutter}
					onChange={setGutter}
					unit={unit}
					units={LENGTH_UNITS}
					onUnitChange={setUnit}
					unitLabel="Space between images unit"
					aria-label="Space between images"
				/>
			</DemoState>
			<DemoState label="Disabled">
				<Range
					min={0}
					max={100}
					value={24}
					unit="px"
					units={LENGTH_UNITS}
					unitLabel="Disabled unit"
					disabled
					aria-label="Disabled spacing"
				/>
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<Range
					min={0}
					max={100}
					value={40}
					unit="%"
					units={LENGTH_UNITS}
					unitLabel="Focused unit"
					aria-label="Focused spacing"
				/>
			</DemoState>
		</DemoStates>
	);
}

export function UnitInputStates() {
	const [width, setWidth] = useState('100');

	return (
		<DemoStates>
			<DemoState label="Interactive">
				<UnitInput
					value={width}
					onChange={setWidth}
					unit="%"
					aria-label="Gallery width"
				/>
			</DemoState>
			<DemoState label="Error">
				<UnitInput
					value="wide"
					unit="px"
					error="Enter a number."
					aria-label="Invalid width"
				/>
			</DemoState>
			<DemoState label="Disabled">
				<UnitInput
					value="1200"
					unit="px"
					disabled
					aria-label="Disabled width"
				/>
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<UnitInput value="80" unit="vw" aria-label="Focused width" />
			</DemoState>
		</DemoStates>
	);
}

export function DeviceSwitchStates() {
	const [device, setDevice] = useState('desktop');

	return (
		<DemoStates>
			<DemoState label="Interactive">
				<Segmented
					options={DEVICES}
					value={device}
					onChange={setDevice}
					aria-label="Space between images per device"
				/>
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<Segmented
					options={DEVICES}
					value="tablet"
					aria-label="Focused device switch"
				/>
			</DemoState>
		</DemoStates>
	);
}

/**
 * A ColorField that keeps its own value and open state.
 *
 * @param {Object}  props
 * @param {string}  props.label
 * @param {string}  props.initial
 * @param {boolean} [props.initialOpen]
 * @param {Object}  [props.rest]        Other ColorField props.
 */
function SampleColor({ label, initial, initialOpen = false, ...rest }) {
	const [color, setColor] = useState(initial);
	const [open, setOpen] = useState(initialOpen);

	return (
		<ColorField
			label={label}
			value={color}
			onChange={setColor}
			open={open}
			onOpenChange={setOpen}
			presets={COLOR_PRESETS}
			{...rest}
		/>
	);
}

export function ColorFieldStates() {
	return (
		<DemoStates>
			<DemoState label="Interactive">
				<SampleColor label="Background color" initial="#1d8a5b" />
			</DemoState>
			<DemoState label="Open, translucent (Dim color)">
				<SampleColor
					label="Dim color"
					initial="rgba(0,0,0,.45)"
					initialOpen
				/>
			</DemoState>
			<DemoState label="Hex only, can be emptied (Social icon color)">
				<SampleColor
					label="Social icon color"
					initial=""
					opacity={false}
					clearLabel="No color"
				/>
			</DemoState>
			<DemoState label="Disabled">
				<SampleColor label="Border color" initial="#ffffff" disabled />
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<SampleColor label="Caption color" initial="#3a3a37" />
			</DemoState>
		</DemoStates>
	);
}

// Decorative stand-ins for the hover effect previews.
const HoverPreview = ({ tone }) => (
	<span className={`modula-admin-demo__hover-preview is-${tone}`} />
);

export function PresetTilesStates() {
	const [lightbox, setLightbox] = useState('fancybox');
	const [hover, setHover] = useState('zoom');

	return (
		<DemoStates>
			<DemoState label="Two columns, text (interactive)">
				<PresetTiles
					options={[
						{ value: 'fancybox', label: 'Lightbox' },
						{ value: 'attachment', label: 'Attachment page' },
						{ value: 'direct', label: 'Image file' },
						{ value: 'no-link', label: 'Nothing' },
					]}
					value={lightbox}
					onChange={setLightbox}
					aria-label="On click"
				/>
			</DemoState>
			<DemoState label="Three columns, preview and line, one locked">
				<PresetTiles
					columns={3}
					options={[
						{
							value: 'none',
							label: 'None',
							preview: <HoverPreview tone="plain" />,
						},
						{
							value: 'zoom',
							label: 'Zoom',
							description: 'Image grows',
							preview: <HoverPreview tone="zoom" />,
						},
						{
							value: 'reveal',
							label: 'Reveal',
							description: 'Caption slides up',
							preview: <HoverPreview tone="reveal" />,
							badge: PRO,
						},
					]}
					value={hover}
					onChange={setHover}
					aria-label="Hover effect"
				/>
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<PresetTiles
					options={[
						{ value: 'a', label: 'Chosen' },
						{ value: 'b', label: 'Other' },
					]}
					value="a"
					aria-label="Focused tiles"
				/>
			</DemoState>
		</DemoStates>
	);
}

const SORT_CHOICES = [
	{ value: 'manual', label: 'Drag and drop reorder' },
	{ value: 'dateCreatedNew', label: 'Date created — newest first' },
	{ value: 'title', label: 'Title — A to Z' },
];

export function ChoiceListStates() {
	const [sort, setSort] = useState('manual');

	return (
		<DemoStates>
			<DemoState label="Default (interactive)">
				<ChoiceList
					options={SORT_CHOICES}
					value={sort}
					onChange={setSort}
					aria-label="Sort by"
				/>
			</DemoState>
			<DemoState label="Locked rows with a PRO pill">
				<ChoiceList
					options={SORT_CHOICES.map((choice) => ({
						...choice,
						badge: <PlanBadge plan="PRO" tone="outline" />,
						disabled: true,
					}))}
					value="manual"
					aria-label="Locked sort"
				/>
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<ChoiceList
					options={SORT_CHOICES.slice(0, 2)}
					value="manual"
					aria-label="Focused sort"
				/>
			</DemoState>
		</DemoStates>
	);
}

export function PlanBadgeStates() {
	const [clicks, setClicks] = useState(0);

	return (
		<DemoStates>
			<DemoState label="Plan (Settings cards)">
				<PlanBadge plan="Trio" />
			</DemoState>
			<DemoState label="Outline PRO (section header)">{PRO}</DemoState>
			<DemoState
				label={`Solid PRO button (locked setting) · clicked ${clicks}`}
			>
				<PlanBadge
					plan="PRO"
					tone="solid"
					lock
					onClick={() => setClicks(clicks + 1)}
					aria-label="Image focus needs PRO. See plans"
				/>
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<PlanBadge
					plan="PRO"
					tone="solid"
					lock
					onClick={() => {}}
					aria-label="Focused PRO pill"
				/>
			</DemoState>
		</DemoStates>
	);
}

export function ResetButtonStates() {
	const [changed, setChanged] = useState(true);

	return (
		<DemoStates>
			<DemoState label="Interactive (hover shows the cross)">
				<span className="modula-admin-demo__reset">
					{changed ? (
						<ResetButton
							label="Reset Space between images to default"
							onReset={() => setChanged(false)}
						/>
					) : (
						<Button variant="link" onClick={() => setChanged(true)}>
							Change it again
						</Button>
					)}
				</span>
			</DemoState>
			<DemoState label="Focus (cross)" forceFocus>
				<ResetButton label="Focused reset" onReset={() => {}} />
			</DemoState>
			<DemoState label="Disabled">
				<ResetButton label="Disabled reset" disabled />
			</DemoState>
		</DemoStates>
	);
}

export function MenuStates() {
	const [statusOpen, setStatusOpen] = useState(false);
	const [status, setStatus] = useState('published');
	const [addOpen, setAddOpen] = useState(false);
	const [added, setAdded] = useState('');
	const [embedOpen, setEmbedOpen] = useState(false);

	return (
		<DemoStates>
			<DemoState label="Status menu (radio items)">
				<Menu
					open={statusOpen}
					onOpenChange={setStatusOpen}
					label="Status"
					trigger={(props) => (
						<Button {...props}>
							{'published' === status ? 'Published' : 'Draft'}
						</Button>
					)}
				>
					<MenuItem
						checked={'published' === status}
						onSelect={() => setStatus('published')}
					>
						Published
					</MenuItem>
					<MenuItem
						checked={'draft' === status}
						onSelect={() => setStatus('draft')}
					>
						Draft
					</MenuItem>
				</Menu>
			</DemoState>
			<DemoState
				label={`Grouped menu with a PRO item${added ? ` · picked ${added}` : ''}`}
			>
				<Menu
					open={addOpen}
					onOpenChange={setAddOpen}
					label="Add from"
					trigger={(props) => (
						<Button variant="primary" {...props}>
							Add images
						</Button>
					)}
				>
					<MenuGroup label="Upload">
						<MenuItem onSelect={() => setAdded('Computer')}>
							From your computer
						</MenuItem>
					</MenuGroup>
					<MenuGroup label="Library">
						<MenuItem onSelect={() => setAdded('Media library')}>
							Media library
						</MenuItem>
						<MenuItem
							onSelect={() => setAdded('Video link')}
							badge={PRO}
						>
							Video link
						</MenuItem>
						<MenuItem disabled>Folders (unavailable)</MenuItem>
					</MenuGroup>
				</Menu>
			</DemoState>
			<DemoState label="Popover (dialog, aligned to the end)">
				<Popover
					open={embedOpen}
					onOpenChange={setEmbedOpen}
					label="Embed"
					align="end"
					trigger={(props) => <Button {...props}>Embed</Button>}
				>
					<div className="modula-admin-demo__popover-body">
						<CopyField
							value='[modula id="89"]'
							copyLabel="Copy shortcode"
						/>
					</div>
				</Popover>
			</DemoState>
		</DemoStates>
	);
}

export function ChipStates() {
	const [filters, setFilters] = useState(['Weddings', 'Portraits', 'Travel']);

	return (
		<DemoStates>
			<DemoState label="Removable (interactive)">
				<span className="modula-admin-demo__chips">
					{filters.map((filter) => (
						<Chip
							key={filter}
							onRemove={() =>
								setFilters(filters.filter((f) => f !== filter))
							}
							removeLabel={`Remove ${filter}`}
						>
							{filter}
						</Chip>
					))}
					{0 === filters.length ? (
						<Button
							variant="link"
							onClick={() =>
								setFilters(['Weddings', 'Portraits', 'Travel'])
							}
						>
							Restore
						</Button>
					) : null}
				</span>
			</DemoState>
			<DemoState label="Plain">
				<Chip>.modula-item</Chip>
			</DemoState>
			<DemoState label="Disabled">
				<Chip onRemove={() => {}} removeLabel="Remove Events" disabled>
					Events
				</Chip>
			</DemoState>
		</DemoStates>
	);
}

export function AccordionStates() {
	const [open, setOpen] = useState('lightbox');
	const [changed, setChanged] = useState(true);
	const [captions, setCaptions] = useState(true);
	const toggle = (section) => (next) => setOpen(next ? section : '');

	return (
		<div className="modula-admin-demo__accordion">
			<Accordion>
				<AccordionSection
					title="Lightbox"
					open={'lightbox' === open}
					onOpenChange={toggle('lightbox')}
					onReset={changed ? () => setChanged(false) : undefined}
					resetLabel="Reset Lightbox to defaults"
				>
					<span className="modula-admin-demo__inline-row">
						Show captions
						<Toggle
							checked={captions}
							onChange={(next) => {
								setCaptions(next);
								setChanged(true);
							}}
							aria-label="Show captions"
						/>
					</span>
				</AccordionSection>
				<AccordionSection
					title="Image focus"
					badge={PRO}
					open={'focus' === open}
					onOpenChange={toggle('focus')}
				>
					<p className="modula-admin-demo__section-text">
						Pick the part of each image that stays in view.
					</p>
				</AccordionSection>
				<AccordionSection
					title="Captions"
					open={'captions' === open}
					onOpenChange={toggle('captions')}
				>
					<p className="modula-admin-demo__section-text">
						Section content.
					</p>
				</AccordionSection>
			</Accordion>
		</div>
	);
}

export function PositionPadStates() {
	const [position, setPosition] = useState('bottom_right');

	return (
		<DemoStates>
			<DemoState label="Interactive (arrow keys move it)">
				<PositionPad
					positions={WATERMARK_POSITIONS}
					value={position}
					onChange={setPosition}
					mark="© Modula"
					aria-label="Watermark position"
				/>
			</DemoState>
			<DemoState label="Default mark">
				<PositionPad
					positions={WATERMARK_POSITIONS}
					value="center"
					aria-label="Position with the default mark"
				/>
			</DemoState>
			<DemoState label="Disabled">
				<PositionPad
					positions={WATERMARK_POSITIONS}
					value="top_left"
					disabled
					aria-label="Disabled position"
				/>
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<PositionPad
					positions={WATERMARK_POSITIONS}
					value="bottom_left"
					aria-label="Focused position"
				/>
			</DemoState>
		</DemoStates>
	);
}

export function UndoToastStates() {
	const [message, setMessage] = useState('');
	const [count, setCount] = useState(12);
	const undo = { label: 'Undo', onClick: () => setCount(count + 1) };

	return (
		<DemoStates>
			<DemoState label="Drawn in place">
				<div className="modula-admin-demo__toast">
					<Toast
						message="Image removed"
						action={{ label: 'Undo', onClick: () => {} }}
						onDismiss={() => {}}
					/>
				</div>
			</DemoState>
			<DemoState label={`Live: ${count} images. Remove one, then Undo`}>
				<Button
					onClick={() => {
						setCount(count - 1);
						setMessage('Image removed');
					}}
				>
					Remove image
				</Button>
				<Toast
					message={message}
					action={undo}
					onDismiss={() => setMessage('')}
				/>
			</DemoState>
		</DemoStates>
	);
}

const ADD_FROM_TABS = [
	{ value: 'upload', label: 'Upload files' },
	{ value: 'library', label: 'Media library' },
	{
		value: 'link',
		label: 'Video link',
		badge: <PlanBadge plan="PRO" tone="outline" lock />,
	},
];

export function DialogStates() {
	const [tab, setTab] = useState(null);

	return (
		<DemoStates>
			<DemoState label="Add media dialog shell: Tab, Escape, Close">
				<Button onClick={() => setTab('library')}>Add images</Button>
				<Dialog
					open={null !== tab}
					onClose={() => setTab(null)}
					title="Add images and videos"
					headerContent={
						<TabList
							id="modula-admin-demo-dialog-tabs"
							label="Add from"
							tabs={ADD_FROM_TABS}
							value={tab ?? 'library'}
							onChange={setTab}
						/>
					}
				>
					<TabPanel
						id="modula-admin-demo-dialog-tabs"
						tabs={ADD_FROM_TABS}
						value={tab ?? 'library'}
					>
						<p className="modula-admin-demo__dialog-body">
							{`The ${tab} tab's content.`}
						</p>
					</TabPanel>
				</Dialog>
			</DemoState>
		</DemoStates>
	);
}
