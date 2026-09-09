import { Panel, PanelBody } from '@wordpress/components';
import useStateContext from './context/useStateContext';
import { useTabsQuery } from './query/useTabsQuery';
import SettingsForm from './SettingsForm';
import SaveButton from './SaveButton';
import styles from './Content.module.scss';

export default function Content() {
	const { state } = useStateContext();
	const { data, isLoading } = useTabsQuery();

	if (!data || isLoading) {
		return null;
	}

	const activeTab = data.find((tab) => tab.slug === state.activeTab);

	if (!activeTab || !activeTab.subtabs) {
		return null;
	}

	const showButton = (subtabData) => {
		if (subtabData?.locked === true) {
			return false;
		}

		if (subtabData?.config?.remove_button === true) {
			return false;
		}

		return true;
	};

	return (
		<div className={styles.pageContent}>
			{Object.entries(activeTab.subtabs).map(
				([subtabSlug, subtabData]) => {
					if (!subtabData || Object.keys(subtabData).length === 0) {
						return null;
					}

					return (
						<Panel
							className={styles.accordionWrapper}
							key={subtabSlug}
							header={
								<span className={styles.accordionTitle}>
									<span>{subtabData.label}</span>
									{subtabData.badge && (
										<span className={styles.proBadge}>
											{' '}
											{subtabData.badge}{' '}
										</span>
									)}
								</span>
							}
						>
							<PanelBody
								className={styles.accordionPannel}
								key={subtabSlug}
								initialOpen={true}
							>
								<SettingsForm
									config={subtabData?.config || {}}
									locked={subtabData?.locked || false}
									badge={subtabData?.badge || ''}
								/>
								{showButton(subtabData) && <SaveButton />}
							</PanelBody>
						</Panel>
					);
				}
			)}
		</div>
	);
}
