/**
 * Video link tab. With the Video extension it hands over to the extension's
 * own import flow (video or playlist), which adds the items as today. Without
 * it, the tab carries the PRO pill and offers the existing upsell.
 */
import { __ } from '@wordpress/i18n';
import { Button } from 'admin-ui';
import { requestExtensionImportOpen } from '../../platform/extensionImportRegistry';

/**
 * @param {import('../../logic/proGateLock').GateLockReason} reason
 * @return {{ text: string, action: string, sameTab: boolean }} Copy for the locked tab.
 */
function lockedCopy(reason) {
	switch (reason) {
		case 'needs_enable':
			return {
				text: __(
					'Turn on the Video extension to add YouTube, Vimeo and self-hosted videos by link.',
					'modula-best-grid-gallery'
				),
				action: __('Enable extension', 'modula-best-grid-gallery'),
				// The extensions page is in this admin.
				sameTab: true,
			};
		case 'needs_plan_upgrade':
			return {
				text: __(
					'Your plan does not include the Video extension, which adds YouTube, Vimeo and self-hosted videos by link.',
					'modula-best-grid-gallery'
				),
				action: __('Upgrade', 'modula-best-grid-gallery'),
				sameTab: false,
			};
		default:
			return {
				text: __(
					'Add YouTube, Vimeo and self-hosted videos by link with the Video extension in Modula PRO.',
					'modula-best-grid-gallery'
				),
				action: __('See plans', 'modula-best-grid-gallery'),
				sameTab: false,
			};
	}
}

/**
 * @param {Object}                                                 props
 * @param {import('./addMediaAvailability').VideoLinkAvailability} props.availability
 * @param {() => void}                                             props.onLeave      Closes the dialog before another flow opens.
 */
export default function AddMediaVideoLinkTab({ availability, onLeave }) {
	const title = (
		<p className="modula-add-media__link-title">
			{__('Video or playlist link', 'modula-best-grid-gallery')}
		</p>
	);

	if (!availability.available) {
		const copy = lockedCopy(availability.reason);
		return (
			<div className="modula-add-media__link">
				{title}
				<p className="modula-add-media__link-text">{copy.text}</p>
				<div className="modula-add-media__link-actions">
					<Button
						variant="primary"
						href={availability.upsellHref}
						target={copy.sameTab ? undefined : '_blank'}
						rel={copy.sameTab ? undefined : 'noopener noreferrer'}
					>
						{copy.action}
					</Button>
				</div>
			</div>
		);
	}

	/** @param {'video'|'video-playlist'} flow */
	const openFlow = (flow) => {
		onLeave();
		requestExtensionImportOpen(flow);
	};

	return (
		<div className="modula-add-media__link">
			{title}
			<p className="modula-add-media__link-text">
				{__(
					'Add a YouTube, Vimeo or .mp4 link, or a whole playlist.',
					'modula-best-grid-gallery'
				)}
			</p>
			<div className="modula-add-media__link-actions">
				<Button variant="primary" onClick={() => openFlow('video')}>
					{__('Add a video link', 'modula-best-grid-gallery')}
				</Button>
				<Button onClick={() => openFlow('video-playlist')}>
					{__('Add a playlist link', 'modula-best-grid-gallery')}
				</Button>
			</div>
		</div>
	);
}
