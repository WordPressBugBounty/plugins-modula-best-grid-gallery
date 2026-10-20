// Page chrome and composite controls for the admin-ui demo page
// (SCRIPT_DEBUG only). Sample copy, not translated, like DemoPage.
import { useEffect, useId, useState } from '@wordpress/element';
import {
	AdminPage,
	Button,
	ConfirmDialog,
	CopyField,
	ExpandableRow,
	Matrix,
	Nav,
	NavHeading,
	NavItem,
	NotificationCenter,
	PageHeader,
	SearchField,
	SearchResults,
	SettingsCard,
	SettingsGroup,
	SettingsRow,
	Tabs,
	TextInput,
	Toast,
	Toggle,
} from 'admin-ui';
import { DemoState, DemoStates } from './demoSections';

const SECTIONS = [
	{ id: 'galleries', label: 'Galleries' },
	{ id: 'performance', label: 'Performance' },
	{ id: 'protection', label: 'Protection' },
	{ id: 'ai', label: 'AI' },
	{ id: 'roles', label: 'Roles' },
	{ id: 'connections', label: 'Connections' },
	{ id: 'email', label: 'Email' },
	{ id: 'diagnostics', label: 'Debug' },
];

// Sample index; the real one is built from the settings tabs (ticket 19).
const SEARCH_INDEX = [
	{
		id: 'page-gal',
		label: 'Galleries get their own page',
		section: 'galleries',
	},
	{ id: 'lazy', label: 'Lazy load images', section: 'performance' },
	{ id: 'right-click', label: 'Disable right-click', section: 'protection' },
	{ id: 'captions', label: 'Smart captions', section: 'ai' },
	{ id: 'vimeo', label: 'Vimeo app keys', section: 'connections' },
	{ id: 'sender', label: 'Sender name', section: 'email' },
	{ id: 'debug-log', label: 'Debug log', section: 'diagnostics' },
];

const PERMISSIONS = [
	{ id: 'own', label: 'Edit own' },
	{ id: 'others', label: 'Edit others' },
	{ id: 'publish', label: 'Publish' },
	{ id: 'delown', label: 'Delete own' },
	{ id: 'delothers', label: 'Delete others' },
	{ id: 'private', label: 'Private' },
	{ id: 'upload', label: 'Upload' },
];

const ROLES = [
	['editor', 'Editor', true],
	['author', 'Author', true],
	['contributor', 'Contributor', false],
	['subscriber', 'Subscriber', false],
	['shop-manager', 'Shop Manager', true],
	['client', 'Client', false],
];

const ROLE_TABS = [
	{ value: 'gallery', label: 'Galleries' },
	{ value: 'album', label: 'Albums' },
];

const EMAIL_TABS = [
	{ value: 'sender', label: 'Sender' },
	{ value: 'invitation', label: 'Invitation' },
	{ value: 'photographer', label: 'Photographer notification' },
];

const ACCESS_COLUMN = { id: 'access', label: 'Access' };

/**
 * Sample grants by role: editors may do everything, authors edit their
 * own, contributors have no access. Roles without the upload capability
 * get a not-applicable (null) Upload grant.
 *
 * @return {Object} Grants by tab, then role id, then column id.
 */
function sampleGrants() {
	const grants = Object.fromEntries(
		ROLES.map(([id, , canUpload]) => [
			id,
			Object.fromEntries([
				['access', 'contributor' !== id],
				...PERMISSIONS.map((permission) => [
					permission.id,
					'upload' === permission.id && !canUpload
						? null
						: 'editor' === id ||
							('author' === id && 'own' === permission.id),
				]),
			]),
		])
	);

	return { gallery: grants, album: grants };
}

/**
 * Matrix rows from grants: without Access, the rest of the row is disabled.
 *
 * @param {Object} grants Grants of one tab.
 * @return {Object[]} Matrix rows.
 */
function grantRows(grants) {
	return ROLES.map(([id, label]) => {
		const grant = grants[id];
		const cells = { access: grant.access };

		PERMISSIONS.forEach((permission) => {
			const value = grant[permission.id];
			cells[permission.id] =
				null === value || grant.access
					? value
					: { checked: value, disabled: true };
		});

		return { id, label, cells };
	});
}

function sectionLabel(sectionId) {
	return SECTIONS.find((section) => section.id === sectionId).label;
}

function searchSettings(query) {
	const needle = query.trim().toLowerCase();

	return SEARCH_INDEX.filter((entry) =>
		entry.label.toLowerCase().includes(needle)
	).map((entry) => ({
		id: entry.id,
		label: entry.label,
		path: `General / ${sectionLabel(entry.section)}`,
		section: entry.section,
	}));
}

export function RolesExample() {
	const [tab, setTab] = useState('gallery');
	const [grants, setGrants] = useState(sampleGrants);

	const flip = (roleId, columnId, next) => {
		setGrants({
			...grants,
			[tab]: {
				...grants[tab],
				[roleId]: { ...grants[tab][roleId], [columnId]: next },
			},
		});
	};

	return (
		<Tabs
			label="Permissions for"
			tabs={ROLE_TABS}
			value={tab}
			onChange={setTab}
			aside="Administrators can always do everything."
		>
			<Matrix
				label="Role permissions"
				cornerLabel="Role"
				columns={[ACCESS_COLUMN, ...PERMISSIONS]}
				rows={grantRows(grants[tab])}
				onChange={flip}
				showMoreLabel={(count) => `Show ${count} more roles`}
				showFewerLabel="Show fewer roles"
			/>
		</Tabs>
	);
}

export function ConnectionsExample({ initiallyOpen = false }) {
	const [open, setOpen] = useState(initiallyOpen);
	const [clientId, setClientId] = useState('');
	// The demo renders this card several times; keep control ids unique.
	const idBase = `demo-vimeo-${useId()}`;

	return (
		<SettingsCard title="Accounts">
			<SettingsRow
				label="Instagram"
				controlId={`${idBase}-instagram`}
				labelElement="span"
			>
				<Button>Connect</Button>
			</SettingsRow>
			<ExpandableRow
				label="Vimeo"
				description="Not connected"
				toggleLabel="Set up"
				open={open}
				onOpenChange={setOpen}
			>
				<SettingsGroup title="Vimeo app keys">
					<SettingsRow label="Client ID" controlId={`${idBase}-id`}>
						<TextInput
							id={`${idBase}-id`}
							value={clientId}
							onChange={setClientId}
						/>
					</SettingsRow>
					<SettingsRow
						label="Redirect URI"
						controlId={`${idBase}-redirect`}
						labelElement="span"
					>
						<CopyField
							value="localhost:10003/wp-admin/admin.php"
							copyLabel="Copy redirect URI"
						/>
					</SettingsRow>
				</SettingsGroup>
			</ExpandableRow>
		</SettingsCard>
	);
}

export function EmailTabsExample() {
	const [tab, setTab] = useState('sender');
	const [name, setName] = useState('Modula');
	const idBase = `demo-mail-${useId()}`;

	return (
		<Tabs label="Email" tabs={EMAIL_TABS} value={tab} onChange={setTab}>
			{'sender' === tab ? (
				<SettingsCard title="Sender">
					<SettingsRow
						label="Sender name"
						controlId={`${idBase}-sender`}
					>
						<TextInput
							id={`${idBase}-sender`}
							value={name}
							onChange={setName}
						/>
					</SettingsRow>
				</SettingsCard>
			) : (
				<SettingsCard
					title={EMAIL_TABS.find((t) => t.value === tab).label}
				>
					<SettingsRow
						label="Send this email"
						controlId={`${idBase}-${tab}`}
					>
						<Toggle id={`${idBase}-${tab}`} checked />
					</SettingsRow>
				</SettingsCard>
			)}
		</Tabs>
	);
}

function SectionContent({ section, onEdit }) {
	const [pageGal, setPageGal] = useState(true);
	const pageGalId = `demo-page-gal-${useId()}`;

	switch (section) {
		case 'galleries':
			return (
				<SettingsCard title="Standalone pages">
					<SettingsRow
						label="Galleries get their own page"
						controlId={pageGalId}
					>
						<Toggle
							id={pageGalId}
							checked={pageGal}
							onChange={(next) => {
								setPageGal(next);
								onEdit();
							}}
						/>
					</SettingsRow>
				</SettingsCard>
			);
		case 'roles':
			return <RolesExample />;
		case 'connections':
			return <ConnectionsExample />;
		case 'email':
			return <EmailTabsExample />;
		default:
			return (
				<p className="modula-admin-demo__section-text">
					This section’s cards come in a later ticket.
				</p>
			);
	}
}

/**
 * Class of a demo page's frame.
 *
 * @param {boolean} stacked Draw the 782px layout at any width.
 * @return {string} Class names.
 */
function pageFrameClass(stacked) {
	return stacked
		? 'modula-admin-demo__frame is-narrow-page'
		: 'modula-admin-demo__frame';
}

/**
 * A working Settings page: nav, search, save state, Save and toast.
 *
 * @param {Object}  props
 * @param {boolean} [props.stacked] Draw the 782px layout at any width.
 */
export function PageExample({ stacked = false }) {
	const [section, setSection] = useState('galleries');
	const [query, setQuery] = useState('');
	const [saveState, setSaveState] = useState('saved');
	const [toast, setToast] = useState('');

	// Stands in for the REST save.
	useEffect(() => {
		if ('saving' !== saveState) {
			return undefined;
		}
		const timer = window.setTimeout(() => {
			setSaveState('saved');
			setToast('Settings saved');
		}, 700);

		return () => window.clearTimeout(timer);
	}, [saveState]);

	const openResult = (result) => {
		setSection(result.section);
		setQuery('');
	};

	const results = '' === query.trim() ? null : searchSettings(query);

	const nav = (
		<Nav
			label="Settings sections"
			search={
				<SearchField
					label="Find a setting"
					placeholder="Find a setting…"
					value={query}
					onChange={setQuery}
					resultCount={null === results ? null : results.length}
				/>
			}
		>
			{null === results ? (
				<>
					<NavHeading>General</NavHeading>
					{SECTIONS.map((item) => (
						<NavItem
							key={item.id}
							current={item.id === section}
							onClick={() => setSection(item.id)}
						>
							{item.label}
						</NavItem>
					))}
				</>
			) : (
				<SearchResults results={results} onSelect={openResult} />
			)}
		</Nav>
	);

	return (
		<div className={pageFrameClass(stacked)}>
			<AdminPage
				header={
					<PageHeader
						title="Settings"
						saveState={saveState}
						onSave={() => {
							setToast('');
							setSaveState('saving');
						}}
					/>
				}
				nav={nav}
				title={sectionLabel(section)}
			>
				<SectionContent
					key={section}
					section={section}
					onEdit={() => setSaveState('dirty')}
				/>
			</AdminPage>
			<Toast message={toast} onDismiss={() => setToast('')} />
		</div>
	);
}

export function HeaderStates() {
	return (
		<div className="modula-admin-demo__stack">
			{['dirty', 'saving', 'saved'].map((state) => (
				<DemoState key={state} label={`Save state: ${state}`}>
					<div className="modula-admin-demo__frame">
						<PageHeader
							title="Settings"
							saveState={state}
							onSave={() => {}}
						/>
					</div>
				</DemoState>
			))}
			<DemoState label="Save · focus" forceFocus>
				<div className="modula-admin-demo__frame">
					<PageHeader
						title="Settings"
						saveState="dirty"
						onSave={() => {}}
					/>
				</div>
			</DemoState>
			<DemoState label="No save state: controls save at once (Extensions)">
				<div className="modula-admin-demo__frame">
					<PageHeader title="Extensions" />
				</div>
			</DemoState>
		</div>
	);
}

// A stand-in avatar; Modula Settings shows the WPChill bear.
const DEMO_AVATAR =
	'data:image/svg+xml,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34"><rect width="34" height="34" fill="#f25c3b"/><circle cx="17" cy="17" r="9" fill="#fff"/></svg>'
	);

const DEMO_NOTIFICATIONS = [
	{
		id: 'hybrid',
		title: 'Custom URL tile links after Modula 3.0',
		meta: 'Modula · 1 hour ago',
		body: '3 Beta galleries still use Open in lightbox with Custom URLs.',
		dismissible: false,
		actions: <Button variant="primary">Fix links</Button>,
	},
	{
		id: 'import',
		title: 'Import process completed.',
		meta: 'Modula · 2 days ago',
		dismissible: true,
	},
];

export function NotificationStates() {
	const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);

	return (
		<DemoStates>
			<DemoState label="Live: open the bell; Dismiss, Dismiss all">
				<div className="modula-admin-demo__frame">
					<PageHeader
						title="Settings"
						saveState="saved"
						onSave={() => {}}
					>
						<NotificationCenter
							iconSrc={DEMO_AVATAR}
							notifications={notifications}
							onDismiss={(id) =>
								setNotifications((current) =>
									current.filter((item) => item.id !== id)
								)
							}
							onDismissAll={() => setNotifications([])}
						/>
					</PageHeader>
				</div>
				<Button onClick={() => setNotifications(DEMO_NOTIFICATIONS)}>
					Restore the samples
				</Button>
			</DemoState>
		</DemoStates>
	);
}

const DEMO_EXTENSIONS = [
	{ id: 'video', label: 'Video', on: true },
	{ id: 'slideshow', label: 'Slideshow', on: false },
	{ id: 'speed-up', label: 'Speed Up', on: true },
];

/**
 * A page without Save and without a nav (Extensions): the header has only
 * the title and the bell, and the content is the single column.
 *
 * @param {Object}  props
 * @param {boolean} [props.stacked] Draw the 782px layout at any width.
 */
export function SingleColumnPageExample({ stacked = false }) {
	const idBase = useId();
	const [active, setActive] = useState(() =>
		Object.fromEntries(DEMO_EXTENSIONS.map((item) => [item.id, item.on]))
	);

	return (
		<div className={pageFrameClass(stacked)}>
			<AdminPage
				header={
					<PageHeader title="Extensions">
						<NotificationCenter
							iconSrc={DEMO_AVATAR}
							notifications={DEMO_NOTIFICATIONS}
							onDismiss={() => {}}
							onDismissAll={() => {}}
						/>
					</PageHeader>
				}
				title="All extensions"
			>
				<SettingsCard title="Starter">
					{DEMO_EXTENSIONS.map((item) => (
						<SettingsRow
							key={item.id}
							label={item.label}
							controlId={`${idBase}-${item.id}`}
						>
							<Toggle
								id={`${idBase}-${item.id}`}
								checked={active[item.id]}
								onChange={(on) =>
									setActive((current) => ({
										...current,
										[item.id]: on,
									}))
								}
							/>
						</SettingsRow>
					))}
				</SettingsCard>
			</AdminPage>
		</div>
	);
}

export function NavStates() {
	return (
		<DemoStates>
			<DemoState label="Heading, current, hover, focus, rest">
				<div className="modula-admin-demo__nav">
					<Nav label="Nav states">
						<NavHeading>General</NavHeading>
						<NavItem current onClick={() => {}}>
							Galleries (current)
						</NavItem>
						<NavItem className="is-force-hover" onClick={() => {}}>
							Performance (hover)
						</NavItem>
						<NavItem className="is-force-focus" onClick={() => {}}>
							Protection (focus)
						</NavItem>
						<NavItem onClick={() => {}}>AI</NavItem>
						<NavHeading>Second group</NavHeading>
						<NavItem onClick={() => {}}>Roles</NavItem>
					</Nav>
				</div>
			</DemoState>
			<DemoState label="Search with results (first one hovered)">
				<div className="modula-admin-demo__nav">
					<Nav
						label="Search with results"
						search={
							<SearchField
								label="Find a setting"
								value="a"
								onChange={() => {}}
								resultCount={4}
							/>
						}
					>
						<div className="is-force-hover">
							<SearchResults
								results={searchSettings('a').slice(0, 4)}
								onSelect={() => {}}
							/>
						</div>
					</Nav>
				</div>
			</DemoState>
			<DemoState label="No match">
				<div className="modula-admin-demo__nav">
					<Nav
						label="Search without results"
						search={
							<SearchField
								label="Find a setting"
								value="zzz"
								onChange={() => {}}
								resultCount={0}
							/>
						}
					>
						<SearchResults results={[]} onSelect={() => {}} />
					</Nav>
				</div>
			</DemoState>
			<DemoState label="Search: rest, hover, focus">
				<div className="modula-admin-demo__nav modula-admin-demo__search-states">
					<SearchField
						label="Search at rest"
						placeholder="Find a setting…"
						value=""
						onChange={() => {}}
						resultCount={null}
					/>
					<div className="is-force-hover">
						<SearchField
							label="Search on hover"
							placeholder="Find a setting…"
							value=""
							onChange={() => {}}
							resultCount={null}
						/>
					</div>
					<div className="is-force-focus">
						<SearchField
							label="Search with focus"
							placeholder="Find a setting…"
							value="lazy"
							onChange={() => {}}
							resultCount={null}
						/>
					</div>
				</div>
			</DemoState>
		</DemoStates>
	);
}

export function ToastStates() {
	const [message, setMessage] = useState('');

	return (
		<DemoStates>
			<DemoState label="Toast (drawn in place)">
				<div className="modula-admin-demo__toast">
					<Toast message="Settings saved" onDismiss={() => {}} />
				</div>
			</DemoState>
			<DemoState label="Error toast (drawn in place)">
				<div className="modula-admin-demo__toast">
					<Toast
						message="Pick a license before saving."
						tone="error"
						onDismiss={() => {}}
					/>
				</div>
			</DemoState>
			<DemoState label="Live: shows at the bottom, then dismisses">
				<Button onClick={() => setMessage('Settings saved')}>
					Show toast
				</Button>
				<Toast message={message} onDismiss={() => setMessage('')} />
			</DemoState>
		</DemoStates>
	);
}

export function ConfirmDialogStates() {
	const [open, setOpen] = useState(false);

	return (
		<DemoStates>
			<DemoState label="Live: opens as a modal, Escape cancels">
				<Button onClick={() => setOpen(true)}>
					Turn off Password Protect
				</Button>
				<ConfirmDialog
					open={open}
					title="Turn off Password Protect?"
					message="This removes the password from 3 galleries and albums."
					confirmLabel="Turn off"
					onConfirm={() => setOpen(false)}
					onCancel={() => setOpen(false)}
				/>
			</DemoState>
		</DemoStates>
	);
}

export function TabsStates() {
	return (
		<div className="modula-admin-demo__stack">
			<DemoState label="Interactive: click, or arrow keys, Home, End">
				<EmailTabsExample />
			</DemoState>
			<DemoState label="Other tab · hover">
				<div className="is-force-hover">
					<Tabs
						label="Hovered tabs"
						tabs={ROLE_TABS}
						value="gallery"
						onChange={() => {}}
					>
						{null}
					</Tabs>
				</div>
			</DemoState>
			<DemoState label="Selected tab · focus" forceFocus>
				<Tabs
					label="Focused tabs"
					tabs={ROLE_TABS}
					value="gallery"
					onChange={() => {}}
				>
					{null}
				</Tabs>
			</DemoState>
		</div>
	);
}

export function ExpandableStates() {
	return (
		<div className="modula-admin-demo__cards">
			<DemoState label="Collapsed (interactive)">
				<ConnectionsExample />
			</DemoState>
			<DemoState label="Open">
				<ConnectionsExample initiallyOpen />
			</DemoState>
			<DemoState label="Toggle · focus" forceFocus>
				<SettingsCard title="Accounts">
					<ExpandableRow
						label="Vimeo"
						description="Not connected"
						toggleLabel="Set up"
						open={false}
						onOpenChange={() => {}}
					>
						{null}
					</ExpandableRow>
				</SettingsCard>
			</DemoState>
		</div>
	);
}

export function MatrixStates() {
	return (
		<div className="modula-admin-demo__cards">
			<DemoState label="Interactive: tabs, checkboxes, Contributor without Access (row disabled), not-applicable Upload cells, Show 2 more roles">
				<RolesExample />
			</DemoState>
			<DemoState label="Checkbox cell · focus" forceFocus>
				<Matrix
					label="Focused matrix"
					cornerLabel="Role"
					columns={PERMISSIONS.slice(0, 1)}
					rows={grantRows(sampleGrants().gallery).slice(0, 1)}
					onChange={() => {}}
				/>
			</DemoState>
		</div>
	);
}
