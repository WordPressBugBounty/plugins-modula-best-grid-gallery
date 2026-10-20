import { __ } from '@wordpress/i18n';
import { AdminPage, AdminUiRoot, PageTabs } from 'admin-ui';
import { DashboardHeader } from '../page/DashboardHeader';
import { NewTabButton } from '../page/NewTabButton';
import { gettingStartedData } from '../page/pageData';
import { OurValues } from './OurValues';

/**
 * The intro's lines. The string keeps the old page's `<br>` breaks so its
 * existing translations still apply; each break starts a new line here.
 *
 * @return {string[]} Lines, in order.
 */
function introLines() {
	return __(
		"WPChill is a WordPress development studio currently located in Bucharest, Romania. <br> We're a handful of friendly developers, marketers & happiness engineers. <br> Say hi 👋",
		'modula-best-grid-gallery'
	)
		.split(/<br\s*\/?>/i)
		.map((line) => line.trim())
		.filter(Boolean);
}

/**
 * Modula › About us: who WPChill is and the values it works by.
 */
export default function AboutUsPage() {
	const { links } = gettingStartedData();

	return (
		<AdminUiRoot className="modula-getting-started-page">
			<AdminPage
				header={
					<DashboardHeader
						title={__('About us', 'modula-best-grid-gallery')}
					/>
				}
				tabs={<PageTabs current="about-us" />}
				title={__('About Us', 'modula-best-grid-gallery')}
			>
				<div className="modula-about-us-intro">
					{introLines().map((line, index) => (
						<p key={index} className="modula-about-us-intro__line">
							{line}
						</p>
					))}
				</div>
				<OurValues />
				<div className="modula-about-us-more">
					<NewTabButton href={links.aboutUs}>
						{__('Find more about us', 'modula-best-grid-gallery')}
					</NewTabButton>
				</div>
			</AdminPage>
		</AdminUiRoot>
	);
}
