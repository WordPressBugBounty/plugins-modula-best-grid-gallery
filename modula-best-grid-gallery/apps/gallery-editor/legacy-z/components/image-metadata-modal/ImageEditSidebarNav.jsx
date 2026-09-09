/**
 * Vertical section navigation for the image metadata modal.
 */
import { __ } from '@wordpress/i18n';
import { Icon } from '@wordpress/icons';

/**
 * @param {Object}                                                                   props
 * @param {string}                                                                   props.activeSection
 * @param {(name: string) => void}                                                   props.onSelect
 * @param {{ name: string, title: string, icon: import('@wordpress/icons').Icon }[]} props.sections
 */
export default function ImageEditSidebarNav({
	activeSection,
	onSelect,
	sections,
}) {
	return (
		<nav
			className="modula-image-metadata-modal__sidebar-nav"
			aria-label={__('Image edit sections', 'modula-best-grid-gallery')}
		>
			<ul className="modula-image-metadata-modal__sidebar-nav-list">
				{sections.map((section) => {
					const isActive = section.name === activeSection;
					return (
						<li key={section.name}>
							<button
								type="button"
								className={`modula-image-metadata-modal__sidebar-nav-item${
									isActive
										? ' modula-image-metadata-modal__sidebar-nav-item--active'
										: ''
								}`}
								onClick={() => onSelect(section.name)}
								aria-current={isActive ? 'page' : undefined}
							>
								<Icon icon={section.icon} size={18} />
								<span>{section.title}</span>
							</button>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
