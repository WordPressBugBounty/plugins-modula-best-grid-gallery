import { useState, useEffect } from '@wordpress/element';
import {
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';

import styles from './SubMenuToggle.module.scss';

export default function SubmenuToggle({ submenu, form }) {
	const [active, setActive] = useState(submenu.options[0]?.value);

	useEffect(() => {
		form.setFieldValue('activeToggle', active);
	}, [active, form]);

	const handleClick = (key) => {
		setActive(key);
	};

	return (
		<ToggleGroupControl
			className={styles.submenuToggleWrapper}
			label={submenu.label}
			value={active}
			onChange={handleClick}
			isBlock
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		>
			{submenu.options.map(({ label, value }) => (
				<ToggleGroupControlOption
					key={value}
					value={value}
					label={label}
				/>
			))}
		</ToggleGroupControl>
	);
}
