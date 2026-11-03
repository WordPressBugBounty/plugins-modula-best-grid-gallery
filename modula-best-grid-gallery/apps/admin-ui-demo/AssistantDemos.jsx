// Demo states for the controls the AI assistants card adds, and the
// editor's help tip and spinner. Sample copy, not translated (see DemoPage).
import { useState } from '@wordpress/element';
import {
	Button,
	CopyField,
	Disclosure,
	InfoIcon,
	Notice,
	Spinner,
	Steps,
	Tooltip,
} from 'admin-ui';
import { DemoState, DemoStates } from './demoSections';

const ENDPOINT =
	'http://localhost:10003/wp-json/mcp/mcp-adapter-default-server';

export function NoticeStates() {
	const [dismissed, setDismissed] = useState(false);

	return (
		<DemoStates>
			<DemoState label="Warning">
				<Notice>ChatGPT works only with a public site on HTTPS.</Notice>
			</DemoState>
			<DemoState label="Error">
				<Notice tone="error">
					The connection could not be created. Try again.
				</Notice>
			</DemoState>
			<DemoState label="Error, dismissible">
				{dismissed ? (
					<Button onClick={() => setDismissed(false)}>
						Show the notice again
					</Button>
				) : (
					<Notice tone="error" onDismiss={() => setDismissed(true)}>
						The media library could not be opened.
					</Notice>
				)}
			</DemoState>
		</DemoStates>
	);
}

export function TooltipStates() {
	return (
		<DemoStates>
			<DemoState label="Hover or focus the ⓘ">
				<Tooltip
					text="Space between the images, in pixels. Applies on every device."
					trigger={(triggerProps) => (
						<Button
							variant="ghost"
							aria-label="More information"
							{...triggerProps}
						>
							<InfoIcon />
						</Button>
					)}
				/>
			</DemoState>
		</DemoStates>
	);
}

export function SpinnerStates() {
	return (
		<DemoStates>
			<DemoState label="Default (18px)">
				<span role="status">
					<Spinner />
					<span className="modula-admin-sr-only">Loading…</span>
				</span>
			</DemoState>
			<DemoState label="With text, 24px">
				<span
					role="status"
					style={{ display: 'flex', alignItems: 'center', gap: 8 }}
				>
					<Spinner size={24} />
					Loading preview…
				</span>
			</DemoState>
		</DemoStates>
	);
}

export function StepsStates() {
	return (
		<DemoStates>
			<DemoState label="Steps with code">
				<Steps>
					<>
						<p>Add the server in a terminal:</p>
						<CopyField
							value={`claude mcp add --transport http modula-localhost "${ENDPOINT}"`}
							copyLabel="Copy the command"
							multiline
						/>
					</>
					<p>
						In Claude Code, run /mcp, choose modula-localhost and
						select Authenticate.
					</p>
					<p>
						Your browser opens this site’s consent screen. Select
						Allow access.
					</p>
				</Steps>
			</DemoState>
		</DemoStates>
	);
}

export function DisclosureStates() {
	const [open, setOpen] = useState(false);

	return (
		<DemoStates>
			<DemoState label="Closed / open">
				<Disclosure
					label="Can’t sign in? Use a password"
					open={open}
					onOpenChange={setOpen}
				>
					<p>
						For an assistant that can’t sign in, such as a script.
					</p>
					<div>
						<Button>Create a password</Button>
					</div>
				</Disclosure>
			</DemoState>
			<DemoState label="Open">
				<Disclosure
					label="Recent activity"
					open
					onOpenChange={() => {}}
				>
					<p>No activity.</p>
				</Disclosure>
			</DemoState>
		</DemoStates>
	);
}
