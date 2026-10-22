import { __ } from '@wordpress/i18n';
import { SettingsCard } from 'admin-ui';
import { NewTabButton } from './NewTabButton';

/**
 * Where to ask for help: the support forum.
 *
 * @param {Object}                                            props
 * @param {Partial<import('./pageData').GettingStartedLinks>} props.links
 */
export function HelpCard({ links }) {
	return (
		<SettingsCard
			title={__('Need help or advice?', 'modula-best-grid-gallery')}
		>
			<div className="modula-getting-started-help">
				<p className="modula-getting-started-help__text">
					{__(
						'You can always submit a support ticket and our team will help you out.',
						'modula-best-grid-gallery'
					)}
				</p>
				<div className="modula-getting-started-help__actions">
					<NewTabButton variant="primary" href={links.supportForum}>
						{__(
							'Submit a Support Ticket',
							'modula-best-grid-gallery'
						)}
					</NewTabButton>
				</div>
			</div>
		</SettingsCard>
	);
}
