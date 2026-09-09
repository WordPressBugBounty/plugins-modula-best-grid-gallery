import { __ } from '@wordpress/i18n';
import { Button, Spinner, ToggleControl } from '@wordpress/components';
import styles from './extension-table-row.module.scss';
import { useExtensionMutation } from '../query/useExtensionMutation';
import { getMenuFn } from '../query/useGetMenuQuery';

function Divider() {
	return <> | </>;
}

export default function ExtensionTableRow({
	extension,
	selected = false,
	onSelectChange,
	isPending: rowPending = false,
}) {
	const { mutate: toggleExtension, isPending } = useExtensionMutation();

	const handleToggle = () => {
		toggleExtension(
			{ extension: extension.slug },
			{
				onSettled: async () => {
					const menu = await getMenuFn();
					if (!menu) {
						return;
					}
					const item = document.getElementById(
						'menu-posts-modula-gallery'
					);
					if (item) {
						item.innerHTML = menu?.html;
					}
				},
			}
		);
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleToggle();
		}
	};

	const handleSettings = (url) => {
		window.open(url, '_blank');
	};

	const renderActionText = () => {
		if (extension.enabled) {
			return (
				<>
					<Button
						variant="link"
						className={styles.actionLink}
						onClick={handleToggle}
						onKeyDown={handleKeyDown}
						role="button"
						tabIndex={0}
					>
						{__('Deactivate', 'modula-best-grid-gallery')}
					</Button>
					{(isPending || rowPending) && (
						<span className={styles.actionLink}>
							<Spinner style={{ width: '9px', height: '9px' }} />
						</span>
					)}
					{!isPending && !rowPending && extension?.settings && (
						<>
							<Divider />
							<Button
								variant="link"
								className={styles.actionLink}
								onClick={() =>
									handleSettings(extension.settings)
								}
								onKeyDown={handleKeyDown}
								role="button"
								tabIndex={0}
							>
								{__('Settings', 'modula-best-grid-gallery')}
							</Button>
						</>
					)}
				</>
			);
		}

		return (
			<>
				<Button
					variant="link"
					className={styles.actionLink}
					onClick={handleToggle}
					onKeyDown={handleKeyDown}
					role="button"
					tabIndex={0}
				>
					{__('Activate', 'modula-best-grid-gallery')}
				</Button>
				{(isPending || rowPending) && (
					<span className={styles.actionLink}>
						<Spinner style={{ width: '9px', height: '9px' }} />
					</span>
				)}
			</>
		);
	};

	return (
		<tr className={!extension.available ? styles.unavailable : ''}>
			<td className={styles.checkboxColumn}>
				<input
					type="checkbox"
					disabled={!extension.available}
					checked={selected}
					onChange={(e) => onSelectChange(e.target.checked)}
				/>
			</td>
			<td className={styles.extensionColumn}>
				<div className={styles.extensionInfo}>
					<div className={styles.extensionDetails}>
						<strong className={styles.title}>
							{extension.name}
						</strong>
						<div className={styles.actions}>
							{renderActionText()}
						</div>
					</div>
				</div>
			</td>
			<td className={styles.descriptionColumn}>
				<div className={styles.description}>
					{extension.description}
				</div>
			</td>
			<td className={styles.statusColumn}>
				<div className={styles.statusActions}>
					<ToggleControl
						checked={extension.enabled}
						onChange={handleToggle}
						disabled={!extension.available}
						__nextHasNoMarginBottom={true}
						__next40pxDefaultSize={true}
						aria-label={__(
							'Toggle extension status',
							'modula-best-grid-gallery'
						)}
					/>
				</div>
			</td>
		</tr>
	);
}
