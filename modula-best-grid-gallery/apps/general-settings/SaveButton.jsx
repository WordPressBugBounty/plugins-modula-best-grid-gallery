import useStateContext from './context/useStateContext';
import { Button } from '@wordpress/components';
import { useSettingsMutation } from './query/useSettingsMutation';
import { __ } from '@wordpress/i18n';
import { setOptions } from './context/actions';
import { useState, useEffect } from '@wordpress/element';
import styles from './SaveButton.module.scss';

export default function SaveButton() {
	const { state, dispatch } = useStateContext();
	const settingsMutation = useSettingsMutation();
	const [showNotice, setShowNotice] = useState(false);

	const isEmpty = Object.keys(state.options || {}).length === 0;

	const handleClick = () => {
		settingsMutation.mutate(state.options, {
			onSuccess: () => {
				// Reset updated but not saved settings.
				dispatch(setOptions({}));
				setShowNotice(true);
			},
		});
	};

	useEffect(() => {
		if (showNotice) {
			const timer = setTimeout(() => setShowNotice(false), 3000);
			return () => clearTimeout(timer);
		}
	}, [showNotice]);

	return (
		<div className={styles.saveSettingsWrap}>
			<Button
				onClick={handleClick}
				disabled={settingsMutation.isLoading || isEmpty}
				variant="primary"
			>
				{settingsMutation.isLoading
					? __('Saving…', 'modula-best-grid-gallery')
					: __('Save', 'modula-best-grid-gallery')}
			</Button>

			{showNotice && (
				<div className={styles.saveNotice + ' ' + styles.slideIn}>
					{__(
						'Settings saved successfully!',
						'modula-best-grid-gallery'
					)}
				</div>
			)}
		</div>
	);
}
