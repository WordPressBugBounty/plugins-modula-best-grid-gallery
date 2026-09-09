import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SelectControl } from '@wordpress/components';
import styles from './extension-bulk-actions.module.scss';
import ExtensionLicenseHeader from './extension-license-header';
import NeedsPro from './needs-pro';

export default function ExtensionBulkActions({ selectedIds, onBulkAction }) {
	const { proExists } = window?.extensionsStrings || {};
	const [selectedAction, setSelectedAction] = useState('');

	const handleApply = () => {
		if (!selectedAction || selectedIds.length === 0) {
			return;
		}
		onBulkAction(selectedAction, selectedIds);
		setSelectedAction('');
	};

	const bulkActions = [
		{
			value: '',
			label: __('Bulk Actions', 'modula-best-grid-gallery'),
		},
		{
			value: 'activate',
			label: __('Activate', 'modula-best-grid-gallery'),
		},
		{
			value: 'deactivate',
			label: __('Deactivate', 'modula-best-grid-gallery'),
		},
	];

	return (
		<div className={styles.bulkActionsBar}>
			<div className={styles.bulkActionsSelect}>
				<SelectControl
					value={selectedAction}
					options={bulkActions}
					onChange={setSelectedAction}
					className={styles.bulkSelect}
					__nextHasNoMarginBottom={true}
					__next40pxDefaultSize={true}
				/>
				<Button
					variant="secondary"
					onClick={handleApply}
					disabled={!selectedAction || selectedIds.length === 0}
					className={styles.applyButton}
				>
					{__('Apply', 'modula-best-grid-gallery')}
				</Button>
			</div>
			<div className={styles.bulkActionsLicense}>
				{Number(proExists) === 1 ? (
					<ExtensionLicenseHeader />
				) : (
					<NeedsPro />
				)}
			</div>
		</div>
	);
}
