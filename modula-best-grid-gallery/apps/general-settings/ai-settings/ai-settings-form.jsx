import ClaimCredits from './settings-form/claim-credits';
import ButtonAction from './settings-form/button-action';

export default function AiSettingsForm() {
	const showButtonAction =
		typeof window !== 'undefined' && localStorage.getItem( 'modulaDebug' ) === 'true';

	return (
		<>
			<ClaimCredits />

			{ showButtonAction && <ButtonAction /> }
		</>
	);
}
