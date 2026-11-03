import { __ } from '@wordpress/i18n';
import {
	Button,
	NotificationsBell,
	PageHeader,
	PlanBadge,
	WPCHILL_NOTIFICATIONS_ROUTE,
} from 'admin-ui';

/**
 * The plus before New album and New gallery.
 */
function PlusIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M12 5v14M5 12h14" />
		</svg>
	);
}

/**
 * Content header (boards 2 and 6): the title, New album (secondary), New
 * gallery (primary) and the notifications bell. Which New buttons show in
 * the current section comes from getHeaderCreateActions(); without Pro, New
 * album carries the PRO pill and opens the Albums section upsell.
 *
 * @param {Object}                                              props
 * @param {{ gallery: boolean, album: 'create'|'upsell'|null }} props.actions
 * @param {() => void}                                          props.onNewGallery      Opens the editor choice.
 * @param {() => void}                                          props.onNewAlbum        Opens the album editor choice.
 * @param {() => void}                                          props.onAlbumUpsell     Shows the Albums section upsell.
 * @param {string|null}                                         props.notificationsIcon Bell avatar; null for no bell.
 */
export function ContentPageHeader({
	actions,
	onNewGallery,
	onNewAlbum,
	onAlbumUpsell,
	notificationsIcon,
}) {
	return (
		<PageHeader title={__('Content', 'modula-best-grid-gallery')}>
			<div className="modula-content-page__create">
				{actions.album ? (
					<Button
						variant="secondary"
						icon={<PlusIcon />}
						onClick={
							'upsell' === actions.album
								? onAlbumUpsell
								: onNewAlbum
						}
					>
						{__('New album', 'modula-best-grid-gallery')}
						{'upsell' === actions.album ? (
							<PlanBadge
								plan={__('PRO', 'modula-best-grid-gallery')}
								tone="outline"
								lock
							/>
						) : null}
					</Button>
				) : null}
				{actions.gallery ? (
					<Button
						variant="primary"
						icon={<PlusIcon />}
						onClick={onNewGallery}
					>
						{__('New gallery', 'modula-best-grid-gallery')}
					</Button>
				) : null}
			</div>
			<NotificationsBell
				iconSrc={notificationsIcon}
				route={WPCHILL_NOTIFICATIONS_ROUTE}
			/>
		</PageHeader>
	);
}
