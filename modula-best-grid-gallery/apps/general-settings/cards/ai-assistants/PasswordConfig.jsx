import { useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, CopyField, Notice } from 'admin-ui';
import {
	configIntro,
	platformLabel,
} from '../../mcp-connections/connectionLabels';

/**
 * The one-time config of a new or regenerated Password connection. It lives
 * only in the mutation result (gcTime 0); Done discards it.
 *
 * @param {Object}   props
 * @param {Object}   props.payload Create or regenerate response: endpoint, username, password and the client's config.
 * @param {Function} props.onDone  Discards the payload.
 */
export function PasswordConfig({ payload, onDone }) {
	const { config } = payload;
	const locations = Object.entries(config.locations);
	const headingRef = useRef(null);

	// It replaces the button that created it: take focus so it is announced.
	useEffect(() => {
		headingRef.current?.focus();
	}, []);

	return (
		<div className="modula-settings-assistants__block">
			<h4
				ref={headingRef}
				tabIndex={-1}
				className="modula-settings-assistants__heading"
			>
				{__('Your connection', 'modula-best-grid-gallery')}
			</h4>
			<Notice>
				{__(
					'You’ll see this only once, and it contains the connection password. Copy it now: reloading or leaving this page removes it.',
					'modula-best-grid-gallery'
				)}
			</Notice>
			<p className="modula-settings-assistants__text">
				{configIntro(config)}
			</p>
			<CopyField
				value={config.content}
				copyLabel={__(
					'Copy the connection config',
					'modula-best-grid-gallery'
				)}
				multiline
			/>
			{0 < locations.length ? (
				<ul className="modula-settings-assistants__locations">
					{locations.map(([platform, path]) => (
						<li key={platform}>
							{platformLabel(platform)}: <code>{path}</code>
						</li>
					))}
				</ul>
			) : null}
			{config.note ? (
				<p className="modula-settings-assistants__text">
					{config.note}
				</p>
			) : null}
			<p className="modula-settings-assistants__muted">
				{__(
					'Calls through this connection run as the Modula agent. It can use only Modula tools and can’t change site settings.',
					'modula-best-grid-gallery'
				)}
			</p>
			<div>
				<Button onClick={onDone}>
					{__('Done', 'modula-best-grid-gallery')}
				</Button>
			</div>
		</div>
	);
}
