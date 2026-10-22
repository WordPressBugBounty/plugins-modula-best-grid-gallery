// admin-ui demo page (SCRIPT_DEBUG only). Its copy is sample text for the
// maintainer's review, not product copy, so it is not translated.
import { useState } from '@wordpress/element';
import {
	AdminUiRoot,
	Button,
	Checkbox,
	CopyField,
	IconNote,
	InfoIcon,
	LockedCard,
	Nav,
	NavSkeleton,
	Segmented,
	Select,
	SettingsCard,
	SettingsGroup,
	SettingsRow,
	SkeletonCard,
	TextInput,
	Textarea,
	Toggle,
	rowDescriptionId,
	rowHelpId,
	rowLabelId,
} from 'admin-ui';
import { AI_CLAIM_URL } from '../general-settings/ai-settings/aiSettings';
import {
	ExpandableStates,
	HeaderStates,
	MatrixStates,
	NavStates,
	NotificationStates,
	PageExample,
	SingleColumnPageExample,
	TabsStates,
	ToastStates,
	ConfirmDialogStates,
} from './ChromeDemos';
import { DemoSection, DemoState, DemoStates } from './demoSections';
import { DisclosureStates, NoticeStates, StepsStates } from './AssistantDemos';
import {
	ImagePickerStates,
	RangeStates,
	TokenPickerStates,
} from './PickerDemos';

const LICENSES = [
	{ value: 'none', label: 'None' },
	{ value: 'by', label: 'CC BY 4.0' },
	{ value: 'by-sa', label: 'CC BY-SA 4.0' },
	{ value: 'cc0', label: 'CC0 (public domain)' },
];

const COMPRESSION = [
	{ value: 'lossless', label: 'Lossless' },
	{ value: 'lossy', label: 'Lossy' },
	{ value: 'glossy', label: 'Glossy' },
];

const COLOR_TOKENS = [
	'ink',
	'ink-hover',
	'ink-muted',
	'ink-soft',
	'surface',
	'surface-sunken',
	'surface-segment',
	'surface-hover',
	'border',
	'border-divider',
	'border-strong',
	'border-field',
	'success',
	'danger',
	'plan-ink',
	'plan-surface',
];

const UPGRADE_URL = 'https://wp-modula.com/pricing/';

function TokenSwatches() {
	return (
		<div className="modula-admin-demo__swatches">
			{COLOR_TOKENS.map((token) => (
				<div key={token} className="modula-admin-demo__swatch">
					<span
						className="modula-admin-demo__swatch-chip"
						style={{ background: `var(--modula-admin-${token})` }}
					/>
					<code>--modula-admin-{token}</code>
				</div>
			))}
		</div>
	);
}

function TypeScale() {
	return (
		<div className="modula-admin-demo__type">
			<p className="modula-admin-demo__type-title">
				Section title · 20 / 400 — General / Galleries
			</p>
			<p className="modula-admin-demo__type-card">
				Card title · 15 / 600 — Image licensing
			</p>
			<p className="modula-admin-demo__type-body">
				Body · 15 / 400 — Galleries get their own page
			</p>
			<p className="modula-admin-demo__type-help">
				Help · 13.5 / 400 — Shows the chosen license in the lightbox.
			</p>
			<code>Mono · 13 — yoursite.com/modula-gallery/wedding-day/</code>
		</div>
	);
}

function ToggleStates() {
	const [checked, setChecked] = useState(true);

	return (
		<DemoStates>
			<DemoState label="Interactive">
				<Toggle
					checked={checked}
					onChange={setChecked}
					aria-label="Interactive toggle"
				/>
			</DemoState>
			<DemoState label="Off">
				<Toggle checked={false} aria-label="Off toggle" />
			</DemoState>
			<DemoState label="On">
				<Toggle checked aria-label="On toggle" />
			</DemoState>
			<DemoState label="Disabled off">
				<Toggle
					checked={false}
					disabled
					aria-label="Disabled off toggle"
				/>
			</DemoState>
			<DemoState label="Disabled on">
				<Toggle checked disabled aria-label="Disabled on toggle" />
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<Toggle checked aria-label="Focused toggle" />
			</DemoState>
		</DemoStates>
	);
}

function CheckboxStates() {
	const [checked, setChecked] = useState(false);
	const [chip, setChip] = useState(true);

	return (
		<DemoStates>
			<DemoState label="Interactive">
				<Checkbox
					checked={checked}
					onChange={setChecked}
					label="Alt text"
				/>
			</DemoState>
			<DemoState label="Off">
				<Checkbox checked={false} aria-label="Off checkbox" />
			</DemoState>
			<DemoState label="On">
				<Checkbox checked aria-label="On checkbox" />
			</DemoState>
			<DemoState label="Disabled on">
				<Checkbox checked disabled label="Upload" />
			</DemoState>
			<DemoState label="Disabled off">
				<Checkbox checked={false} disabled label="Publish" />
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<Checkbox checked aria-label="Focused checkbox" />
			</DemoState>
			<DemoState label="Bordered (interactive)">
				<Checkbox
					checked={chip}
					onChange={setChip}
					bordered
					label="Title"
				/>
			</DemoState>
			<DemoState label="Bordered off">
				<Checkbox checked={false} bordered label="Caption" />
			</DemoState>
		</DemoStates>
	);
}

function SegmentedStates() {
	const [value, setValue] = useState('lossy');

	return (
		<DemoStates>
			<DemoState label="Interactive">
				<Segmented
					options={COMPRESSION}
					value={value}
					onChange={setValue}
					aria-label="Thumbnails"
				/>
			</DemoState>
			<DemoState label="Disabled">
				<Segmented
					options={COMPRESSION}
					value="lossless"
					disabled
					aria-label="Disabled compression"
				/>
			</DemoState>
			<DemoState label="One option disabled">
				<Segmented
					options={COMPRESSION.map((option) => ({
						...option,
						disabled: 'glossy' === option.value,
					}))}
					value="lossy"
					aria-label="Compression with Glossy unavailable"
				/>
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<Segmented
					options={COMPRESSION}
					value="glossy"
					aria-label="Focused compression"
				/>
			</DemoState>
		</DemoStates>
	);
}

function FieldStates() {
	const [text, setText] = useState('modula-gallery');
	const [license, setLicense] = useState('by');
	const [message, setMessage] = useState('');

	return (
		<>
			<DemoStates>
				<DemoState label="Text · interactive">
					<TextInput
						value={text}
						onChange={setText}
						aria-label="Gallery slug"
					/>
				</DemoState>
				<DemoState label="Text · placeholder">
					<TextInput
						value=""
						placeholder="gallery_id"
						aria-label="Link parameter"
					/>
				</DemoState>
				<DemoState label="Text · disabled">
					<TextInput
						value="modula-album"
						disabled
						aria-label="Disabled slug"
					/>
				</DemoState>
				<DemoState label="Text · focus" forceFocus>
					<TextInput value="wedding-day" aria-label="Focused slug" />
				</DemoState>
				<DemoState label="Text · error">
					<TextInput
						value="my gallery"
						error="Use letters, numbers and dashes only."
						aria-label="Invalid slug"
					/>
				</DemoState>
			</DemoStates>
			<DemoStates>
				<DemoState label="Select · interactive">
					<Select
						options={LICENSES}
						value={license}
						onChange={setLicense}
						aria-label="License"
					/>
				</DemoState>
				<DemoState label="Select · disabled">
					<Select
						options={LICENSES}
						value="none"
						disabled
						aria-label="Disabled license"
					/>
				</DemoState>
				<DemoState label="Select · focus" forceFocus>
					<Select
						options={LICENSES}
						value="cc0"
						aria-label="Focused license"
					/>
				</DemoState>
				<DemoState label="Select · error">
					<Select
						options={LICENSES}
						value="none"
						error="This preset no longer exists."
						aria-label="Invalid select"
					/>
				</DemoState>
			</DemoStates>
			<DemoStates>
				<DemoState label="Textarea · interactive">
					<Textarea
						value={message}
						onChange={setMessage}
						placeholder="Optional. The image link is added at the end."
						aria-label="Email message"
					/>
				</DemoState>
				<DemoState label="Textarea · disabled">
					<Textarea
						value="Hi,"
						disabled
						aria-label="Disabled message"
					/>
				</DemoState>
				<DemoState label="Textarea · focus" forceFocus>
					<Textarea value="Thank you!" aria-label="Focused message" />
				</DemoState>
				<DemoState label="Textarea · error">
					<Textarea
						value=""
						error="A message is required."
						aria-label="Invalid message"
					/>
				</DemoState>
			</DemoStates>
		</>
	);
}

function ButtonStates() {
	return (
		<DemoStates>
			<DemoState label="Primary">
				<Button variant="primary">Save changes</Button>
			</DemoState>
			<DemoState label="Secondary">
				<Button>Send a test email</Button>
			</DemoState>
			<DemoState label="Ghost">
				<Button variant="ghost">Cancel</Button>
			</DemoState>
			<DemoState label="Danger">
				<Button variant="danger">Disconnect</Button>
			</DemoState>
			<DemoState label="With icon">
				<Button icon={<InfoIcon />}>Get a key</Button>
			</DemoState>
			<DemoState label="Link">
				<Button
					href={UPGRADE_URL}
					target="_blank"
					rel="noopener noreferrer"
				>
					Open pricing
				</Button>
			</DemoState>
			<DemoState label="Text link (new)">
				<Button variant="link">Clear activity</Button>
			</DemoState>
			<DemoState label="Primary disabled">
				<Button variant="primary" disabled>
					Save changes
				</Button>
			</DemoState>
			<DemoState label="Secondary disabled">
				<Button disabled>Download</Button>
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<Button variant="primary">Turn on selling</Button>
			</DemoState>
		</DemoStates>
	);
}

function CopyFieldStates() {
	return (
		<DemoStates>
			<DemoState label="Interactive (click Copy)">
				<CopyField
					value="[modula_all_galleries]"
					copyLabel="Copy shortcode"
				/>
			</DemoState>
			<DemoState label="Long value (truncates)">
				<CopyField
					value="http://localhost:10003/wp-json/mcp/mcp-adapter-default-server"
					copyLabel="Copy server link"
				/>
			</DemoState>
			<DemoState label="Multiline (new)">
				<CopyField
					value={
						'{\n  "mcpServers": {\n    "modula-localhost": { "url": "http://localhost:10003/wp-json/mcp/mcp-adapter-default-server" }\n  }\n}'
					}
					copyLabel="Copy the config"
					multiline
				/>
			</DemoState>
			<DemoState label="Disabled">
				<CopyField
					value="[modula_all_galleries]"
					copyLabel="Copy shortcode"
					disabled
				/>
			</DemoState>
			<DemoState label="Focus" forceFocus>
				<CopyField
					value="[modula_all_galleries]"
					copyLabel="Copy shortcode"
				/>
			</DemoState>
		</DemoStates>
	);
}

function CardExample() {
	const [pageGal, setPageGal] = useState(true);
	const [slug, setSlug] = useState('modula-gallery');
	const [license, setLicense] = useState('by');
	const [author, setAuthor] = useState('');
	const [showLicense, setShowLicense] = useState(false);
	const [thumbs, setThumbs] = useState('lossy');
	const slugExample = `yoursite.com/${slug.trim() || 'modula-gallery'}/wedding-day/`;

	return (
		<div className="modula-admin-demo__cards">
			<SettingsCard title="Standalone pages">
				<SettingsRow
					label="Galleries get their own page"
					controlId="demo-page-gal"
				>
					<Toggle
						id="demo-page-gal"
						checked={pageGal}
						onChange={setPageGal}
					/>
				</SettingsRow>
				{pageGal ? (
					<SettingsGroup title="Gallery address">
						<SettingsRow
							label="Gallery slug"
							controlId="demo-gal-slug"
							help={
								<>
									Address: <code>{slugExample}</code>
								</>
							}
						>
							<TextInput
								id="demo-gal-slug"
								value={slug}
								onChange={setSlug}
								aria-describedby={rowHelpId('demo-gal-slug')}
							/>
						</SettingsRow>
					</SettingsGroup>
				) : null}
				<SettingsRow
					label="Albums get their own page"
					controlId="demo-page-alb"
				>
					<Toggle id="demo-page-alb" checked={false} />
				</SettingsRow>
			</SettingsCard>

			<SettingsCard title="Page with all galleries">
				<SettingsRow
					label="Shortcode"
					controlId="demo-shortcode"
					labelElement="span"
				>
					<CopyField
						value="[modula_all_galleries]"
						copyLabel="Copy shortcode"
					/>
				</SettingsRow>
			</SettingsCard>

			<SettingsCard
				title="Image licensing"
				note="Used when visitors share an image by email. Turn Email sharing on per gallery, in Interact › Share."
			>
				<SettingsRow
					label="License"
					controlId="demo-license"
					help="Shows the chosen license, with the author and company, in the lightbox, so visitors know how they may reuse the photos."
				>
					<Select
						id="demo-license"
						options={LICENSES}
						value={license}
						onChange={setLicense}
						aria-describedby={rowHelpId('demo-license')}
					/>
				</SettingsRow>
				{'none' !== license ? (
					<SettingsGroup title="License details">
						<SettingsRow label="Author" controlId="demo-author">
							<TextInput
								id="demo-author"
								value={author}
								onChange={setAuthor}
							/>
						</SettingsRow>
						<SettingsRow
							label="Show the license under galleries"
							controlId="demo-show-license"
						>
							<Toggle
								id="demo-show-license"
								checked={showLicense}
								onChange={setShowLicense}
							/>
						</SettingsRow>
					</SettingsGroup>
				) : null}
				<SettingsRow
					label="Email message"
					controlId="demo-share-msg"
					stacked
				>
					<Textarea
						id="demo-share-msg"
						value=""
						placeholder="Optional."
					/>
				</SettingsRow>
			</SettingsCard>

			<SettingsCard title="Smart Captions">
				<SettingsRow
					label="API key"
					controlId="demo-ai-key"
					description={<a href={AI_CLAIM_URL}>Get a key</a>}
					help="Your API key is valid and you have 120 credits left"
				>
					<TextInput
						id="demo-ai-key"
						value=""
						placeholder="Paste your key"
						aria-describedby={rowHelpId('demo-ai-key')}
					/>
				</SettingsRow>
				<SettingsRow
					label="Images you already have"
					controlId="demo-ai-fill"
					description="Write text for images that have none."
				>
					<Button
						id="demo-ai-fill"
						aria-describedby={rowDescriptionId('demo-ai-fill')}
					>
						Fill in missing text
					</Button>
				</SettingsRow>
			</SettingsCard>

			<SettingsCard title="Image compression">
				<SettingsRow
					label="Thumbnails"
					controlId="demo-thumbs"
					labelElement="span"
					help={<IconNote>Not available on a local site.</IconNote>}
				>
					<Segmented
						options={COMPRESSION}
						value={thumbs}
						onChange={setThumbs}
						aria-labelledby={rowLabelId('demo-thumbs')}
						aria-describedby={rowHelpId('demo-thumbs')}
					/>
				</SettingsRow>
			</SettingsCard>
		</div>
	);
}

function LockedCardExample() {
	return (
		<div className="modula-admin-demo__cards">
			<LockedCard
				title="Standalone pages"
				plan="Trio"
				upgradeHref={UPGRADE_URL}
			>
				<SettingsRow
					label="Galleries get their own page"
					controlId="demo-locked-gal"
				>
					<Toggle id="demo-locked-gal" checked={false} />
				</SettingsRow>
				<SettingsRow
					label="Albums get their own page"
					controlId="demo-locked-alb"
				>
					<Toggle id="demo-locked-alb" checked={false} />
				</SettingsRow>
			</LockedCard>
			<LockedCard
				title="Watermark"
				plan="Business"
				upgradeHref={UPGRADE_URL}
				note="Adds your watermark to new images."
			>
				<SettingsRow label="Position" controlId="demo-locked-pos">
					<Select
						id="demo-locked-pos"
						options={[
							{ value: 'bottom_right', label: 'Bottom right' },
						]}
						value="bottom_right"
					/>
				</SettingsRow>
				<SettingsRow
					label="Keep the original images"
					controlId="demo-locked-backup"
				>
					<Toggle id="demo-locked-backup" checked />
				</SettingsRow>
			</LockedCard>
			<LockedCard
				title="Every control, locked"
				plan="Starter"
				upgradeHref={UPGRADE_URL}
			>
				<SettingsRow label="Client ID" controlId="demo-locked-text">
					<TextInput id="demo-locked-text" value="abc123" />
				</SettingsRow>
				<SettingsRow
					label="Compression"
					controlId="demo-locked-seg"
					labelElement="span"
				>
					<Segmented
						options={COMPRESSION}
						value="lossy"
						aria-labelledby={rowLabelId('demo-locked-seg')}
					/>
				</SettingsRow>
				<SettingsRow
					label="Fill in"
					controlId="demo-locked-check"
					labelElement="span"
				>
					<Checkbox checked bordered label="Alt text" />
					<Checkbox checked={false} bordered label="Caption" />
				</SettingsRow>
				<SettingsRow
					label="Redirect URI"
					controlId="demo-locked-copy"
					labelElement="span"
				>
					<CopyField
						value="localhost:10003/wp-admin/admin.php"
						copyLabel="Copy redirect URI"
					/>
				</SettingsRow>
				<SettingsRow
					label="Instructions"
					controlId="demo-locked-textarea"
					stacked
				>
					<Textarea
						id="demo-locked-textarea"
						value="Pay at pickup."
					/>
				</SettingsRow>
			</LockedCard>
		</div>
	);
}

export function DemoPage() {
	return (
		<AdminUiRoot className="modula-admin-demo">
			<header className="modula-admin-demo__header">
				<h1 className="modula-admin-demo__title">admin-ui demo</h1>
				<p className="modula-admin-demo__intro">
					Every admin-ui control in every state, from the Settings
					artboard. Tab through the page to check real focus; the
					“Focus” states draw it without the keyboard.
				</p>
			</header>
			<DemoSection title="Color tokens">
				<TokenSwatches />
			</DemoSection>
			<DemoSection title="Type">
				<TypeScale />
			</DemoSection>
			<DemoSection title="Toggle">
				<ToggleStates />
			</DemoSection>
			<DemoSection title="Checkbox">
				<CheckboxStates />
			</DemoSection>
			<DemoSection title="Segmented control">
				<SegmentedStates />
			</DemoSection>
			<DemoSection title="Text input, select, textarea">
				<FieldStates />
			</DemoSection>
			<DemoSection title="Button">
				<ButtonStates />
			</DemoSection>
			<DemoSection title="Copy field">
				<CopyFieldStates />
			</DemoSection>
			<DemoSection
				title="Image picker"
				description="New, not in the design (Watermark). The thumbnail frame keeps its size, so choosing or removing an image does not move the row."
			>
				<ImagePickerStates />
			</DemoSection>
			<DemoSection
				title="Range"
				description="New, not in the design (Watermark margin). The value is read out after the slider."
			>
				<RangeStates />
			</DemoSection>
			<DemoSection
				title="Post picker"
				description="New, not in the design (Image Guardian exceptions). Results open under the field and push the rows below down; arrow keys move through them, Enter adds one, Escape closes them."
			>
				<TokenPickerStates />
			</DemoSection>
			<DemoSection
				title="Notice"
				description="A tinted message inside a card. Warning is the artboard’s amber note (AI assistants); error is new, for failed actions."
			>
				<NoticeStates />
			</DemoSection>
			<DemoSection
				title="Steps"
				description="Numbered instructions (Connect an assistant)."
			>
				<StepsStates />
			</DemoSection>
			<DemoSection
				title="Disclosure"
				description="A text button that shows or hides what follows (Can’t sign in? Use a password, Recent activity)."
			>
				<DisclosureStates />
			</DemoSection>
			<DemoSection
				title="Settings card"
				description="Cards composed as in the Galleries and Performance sections: rows, nested groups, row help and a card note."
			>
				<CardExample />
			</DemoSection>
			<DemoSection
				title="Locked card"
				description="New, not in the design: a Pro card in Lite. The controls stay visible but disabled, with the plan badge and Upgrade."
			>
				<LockedCardExample />
			</DemoSection>
			<DemoSection
				title="Page"
				description="A working Settings page: nav, search (try “lazy”), Galleries toggle → Unsaved changes → Save changes → Saving… → All changes saved and a toast. Roles, Connections and Email show the composite controls in place."
			>
				<PageExample />
			</DemoSection>
			<DemoSection
				title="Page · 782px and below"
				description="The stacked layout: the nav sits above the content. Drawn here at 782px wide; the real page switches at a 782px viewport."
			>
				<div className="modula-admin-demo__narrow">
					<PageExample stacked />
				</div>
			</DemoSection>
			<DemoSection
				title="Single-column page"
				description="A page whose controls save at once and that has no nav (Extensions): the header shows the title and the bell, without the save state or Save, and the content is the only column."
			>
				<SingleColumnPageExample />
			</DemoSection>
			<DemoSection
				title="Single-column page · 782px and below"
				description="The same page in the stacked layout: the gutter narrows. Drawn here at 782px wide."
			>
				<div className="modula-admin-demo__narrow">
					<SingleColumnPageExample stacked />
				</div>
			</DemoSection>
			<DemoSection title="Page header">
				<HeaderStates />
			</DemoSection>
			<DemoSection
				title="Notifications"
				description="The header bell and its off-canvas panel. Focus moves to Close and stays in the panel; Escape closes it and returns focus to the bell."
			>
				<NotificationStates />
			</DemoSection>
			<DemoSection title="Nav and search">
				<NavStates />
			</DemoSection>
			<DemoSection title="Toast">
				<ToastStates />
			</DemoSection>
			<DemoSection
				title="Confirm dialog"
				description="Before a destructive action. Focus starts on Cancel and returns to the trigger."
			>
				<ConfirmDialogStates />
			</DemoSection>
			<DemoSection
				title="Tabs"
				description="Inside a section (Email, Roles). Only the selected tab is in the tab order; arrow keys, Home and End move between tabs."
			>
				<TabsStates />
			</DemoSection>
			<DemoSection title="Expandable row">
				<ExpandableStates />
			</DemoSection>
			<DemoSection title="Matrix">
				<MatrixStates />
			</DemoSection>
			<DemoSection
				title="Loading"
				description="Placeholders while a page loads its data: the nav column and settings cards. They pulse, except with reduced motion."
			>
				<DemoStates>
					<DemoState label="Nav">
						<Nav label="Loading demo">
							<NavSkeleton />
						</Nav>
					</DemoState>
					<DemoState label="Settings card">
						<SkeletonCard rows={3} />
					</DemoState>
				</DemoStates>
			</DemoSection>
		</AdminUiRoot>
	);
}
