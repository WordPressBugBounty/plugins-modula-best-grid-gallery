import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Disclosure, SettingsCard } from 'admin-ui';

/**
 * One common use case: the question opens and closes its answer.
 *
 * @param {Object}                       props
 * @param {import('./pageData').UseCase} props.useCase
 */
function UseCase({ useCase }) {
	const [open, setOpen] = useState(false);

	return (
		<li className="modula-getting-started-use-case">
			<Disclosure
				label={useCase.question}
				open={open}
				onOpenChange={setOpen}
			>
				<div
					className="modula-getting-started-use-case__answer"
					// The server sanitizes the answer with wp_kses_post; it
					// keeps the readme's links and emphasis.
					dangerouslySetInnerHTML={{ __html: useCase.answer }}
				/>
			</Disclosure>
		</li>
	);
}

/**
 * The common use cases from the readme FAQ, as questions that expand. Not
 * shown when the readme has none.
 *
 * @param {Object}                         props
 * @param {import('./pageData').UseCase[]} props.useCases
 */
export function UseCases({ useCases }) {
	if (0 === useCases.length) {
		return null;
	}

	return (
		<SettingsCard
			title={__('Common Use Cases', 'modula-best-grid-gallery')}
		>
			<ul className="modula-getting-started-use-cases">
				{useCases.map((useCase) => (
					<UseCase key={useCase.question} useCase={useCase} />
				))}
			</ul>
		</SettingsCard>
	);
}
