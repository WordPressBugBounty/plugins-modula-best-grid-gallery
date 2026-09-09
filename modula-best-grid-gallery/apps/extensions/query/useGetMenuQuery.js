import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

export const getMenuFn = async () => {
	const data = await apiFetch({
		path: `/modula-best-grid-gallery/v1/menu`,
		method: 'GET',
	});
	return data;
};

export const useGetMenuQuery = () => {
	const menu = useQuery({
		queryKey: ['menu'],
		queryFn: getMenuFn,
	});

	return menu;
};
