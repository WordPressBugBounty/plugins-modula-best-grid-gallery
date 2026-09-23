import { Report } from './report';
import { Actions } from './actions';
import { Spinner, Button } from '@wordpress/components';
import { Optimizing } from './optimizing';
import { Optimized } from './optimized';
import { ErrorLog } from './debug';
import SparkleIcon from './sparkleIcon';
import useStateContext from './context/useStateContext';
import { __ } from '@wordpress/i18n';
import { useModulaAiQuery } from './query/useModulaAiQuery';

export function Optimizer() {
	const { data, isLoading, state, dispatch } = useStateContext();
	const aiSettings = useModulaAiQuery();
	const unavailableOnLocalhost = Boolean(
		aiSettings.data?.unavailable_on_localhost
	);

	if (!state.isStarted) {
		return (
			<div className="modula-ai-start-container">
				<Button
					icon={<SparkleIcon />}
					variant="primary"
					disabled={unavailableOnLocalhost || aiSettings.isLoading}
					onClick={() => {
						if (unavailableOnLocalhost) {
							return;
						}
						dispatch({ type: 'SET_STARTED', payload: true });
					}}
				>
					{unavailableOnLocalhost
						? __(
								'AI unavailable on localhost',
								'modula-best-grid-gallery'
							)
						: __(
								'Generate with Modula AI',
								'modula-best-grid-gallery'
							)}
				</Button>
			</div>
		);
	}

	if (isLoading) {
		return <Spinner />;
	}

	if (data.status === 'running') {
		return (
			<>
				<Optimizing />
				<ErrorLog />
			</>
		);
	}

	if (data.status === 'finished') {
		return (
			<>
				<Optimized />
				<ErrorLog />
			</>
		);
	}

	return (
		<>
			<div className="modula-ai-list">
				<Report />
				<Actions />
			</div>
			<ErrorLog />
		</>
	);
}
