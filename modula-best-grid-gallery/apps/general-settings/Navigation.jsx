import { useCallback } from '@wordpress/element';
import { PageNav } from 'shared-ui';
import useStateContext from './context/useStateContext';
import { setActiveTab } from './context/actions';
import { useTabsQuery } from './query/useTabsQuery';

export default function Navigation() {
	const { state, dispatch } = useStateContext();
	const { data, isLoading } = useTabsQuery();

	const handleClick = useCallback(
		(slug) => {
			if (window && window.history && window.location) {
				const url = new URL(window.location);
				url.searchParams.set('tab', slug);
				window.history.replaceState({}, '', url);
			}
			dispatch(setActiveTab(slug));
		},
		[dispatch]
	);

	if ('undefined' === data || isLoading) {
		return;
	}

	return (
		<PageNav
			items={data}
			activeTab={state.activeTab}
			onItemClick={handleClick}
		/>
	);
}
