import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Disclosure, Notice, Skeleton } from 'admin-ui';
import {
	eventLabel,
	formatTime,
	kindLabel,
} from '../../mcp-connections/connectionLabels';
import {
	useActivity,
	useClearActivity,
} from '../../mcp-connections/useMcpStatus';
import { useFocusTarget } from './useFocusTarget';

/**
 * Recent activity, collapsed under the connections: tool calls through
 * connections and connection events, newest first, with Clear activity.
 * No row carries arguments, content or secrets.
 */
export function RecentActivity() {
	const [isOpen, setOpen] = useState(false);

	return (
		<div className="modula-settings-activity">
			<Disclosure
				label={__('Recent activity', 'modula-best-grid-gallery')}
				open={isOpen}
				onOpenChange={setOpen}
			>
				{/* Loaded only while open: the list is collapsed by default. */}
				{isOpen ? <ActivityBody /> : null}
			</Disclosure>
		</div>
	);
}

function ActivityBody() {
	const { data: rows, isPending, error } = useActivity();

	if (isPending) {
		return <Skeleton width="60%" />;
	}

	if (error) {
		return (
			<Notice tone="error">
				{error.message ||
					__(
						'The activity could not be loaded.',
						'modula-best-grid-gallery'
					)}
			</Notice>
		);
	}

	if (0 === rows.length) {
		return (
			<p className="modula-settings-assistants__muted">
				{__('No activity.', 'modula-best-grid-gallery')}
			</p>
		);
	}

	return (
		<>
			<ul
				className="modula-settings-activity__list"
				aria-label={__('Recent activity', 'modula-best-grid-gallery')}
			>
				{rows.map((row) => (
					<ActivityRow key={row.id} row={row} />
				))}
			</ul>
			<ClearActivity />
		</>
	);
}

/**
 * What happened, who did it and when. A failed call keeps its reason code,
 * so a refusal reads differently from an error.
 *
 * @param {Object} props
 * @param {Object} props.row Row of the activity route.
 */
function ActivityRow({ row }) {
	return (
		<li className="modula-settings-activity__row">
			<span className="modula-settings-activity__what">
				{'call' === row.event ? (
					<code>{row.tool}</code>
				) : (
					eventLabel(row.event)
				)}
				{row.ok ? null : (
					<span className="modula-settings-activity__failed">
						{__('Failed', 'modula-best-grid-gallery')}
						{row.reason ? <code>{row.reason}</code> : null}
					</span>
				)}
			</span>
			<span className="modula-settings-activity__who">
				{row.label} · {kindLabel(row.kind)}
			</span>
			<span className="modula-settings-activity__when">
				{formatTime(row.time)}
			</span>
		</li>
	);
}

/** Clear activity, asked first. */
function ClearActivity() {
	const clear = useClearActivity();
	const [isConfirming, setConfirming] = useState(false);
	const focus = useFocusTarget();
	const questionId = 'modula-ai-assistants-clear-question';
	const ask = () => {
		clear.reset();
		setConfirming(true);
		focus.focusNext('confirm');
	};
	const cancel = () => {
		setConfirming(false);
		focus.focusNext('clear');
	};

	return (
		<div ref={focus.ref} className="modula-settings-activity__clear">
			{isConfirming ? (
				<>
					<p
						id={questionId}
						className="modula-settings-assistants__text"
					>
						{__(
							'Clear the activity log? This can’t be undone; connections keep working.',
							'modula-best-grid-gallery'
						)}
					</p>
					<div className="modula-settings-assistants__actions">
						<Button
							data-focus="confirm"
							variant="danger"
							disabled={clear.isPending}
							onClick={() =>
								clear.mutate(undefined, {
									onSuccess: () => setConfirming(false),
								})
							}
							aria-describedby={questionId}
						>
							{__('Clear activity', 'modula-best-grid-gallery')}
						</Button>
						<Button disabled={clear.isPending} onClick={cancel}>
							{__('Cancel', 'modula-best-grid-gallery')}
						</Button>
					</div>
					{clear.isError ? (
						<Notice tone="error" role="alert">
							{clear.error.message}
						</Notice>
					) : null}
				</>
			) : (
				<div>
					<Button data-focus="clear" variant="link" onClick={ask}>
						{__('Clear activity', 'modula-best-grid-gallery')}
					</Button>
				</div>
			)}
		</div>
	);
}
