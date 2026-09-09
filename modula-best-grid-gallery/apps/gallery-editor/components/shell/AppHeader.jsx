/**
 * Compact header: avoids duplicating the metabox title.
 */

import { __, sprintf } from '@wordpress/i18n';
import { Button, Flex, FlexBlock, FlexItem } from '@wordpress/components';
import { displayShortcut } from '@wordpress/keycodes';
import { search } from '@wordpress/icons';
import AppearanceToggle from './AppearanceToggle';

/**
 * @param {Object}        props
 * @param {number|string} props.galleryId
 * @param {() => void}    [props.onOpenCommandPalette]
 */
export default function AppHeader({ galleryId, onOpenCommandPalette }) {
	const searchSettingsLabel = sprintf(
		/* translators: %s: Primary shortcut (⌘K on macOS, Ctrl+K elsewhere). */
		__('Search settings (%s)', 'modula-best-grid-gallery'),
		displayShortcut.primary('k')
	);
	return (
		<div className="modula-settings-editor__intro">
			<Flex align="center" justify="space-between" gap={3} wrap>
				<FlexBlock>
					<p className="modula-settings-editor__lede">
						{__(
							'Settings load from the REST API. Prefer classic tabs below until migration is complete.',
							'modula-best-grid-gallery'
						)}
					</p>
				</FlexBlock>
				<FlexItem>
					<Flex align="center" gap={2} wrap>
						<AppearanceToggle variant="metabox" />
						{typeof onOpenCommandPalette === 'function' ? (
							<Button
								type="button"
								variant="secondary"
								size="small"
								icon={search}
								onClick={onOpenCommandPalette}
							>
								{searchSettingsLabel}
							</Button>
						) : null}
						<span
							className="modula-settings-editor__id-pill"
							aria-label={__(
								'Gallery post ID',
								'modula-best-grid-gallery'
							)}
						>
							{__('ID', 'modula-best-grid-gallery')}{' '}
							<strong>{galleryId}</strong>
						</span>
					</Flex>
				</FlexItem>
			</Flex>
		</div>
	);
}
