export const getInitialTab = () => {
	const url = new URL(window.location);
	return url.searchParams.get('tab') || 'display';
};

export const initialState = {
	api_key: '',
	isAdvancedRegistration: false,
	isLoggedIn: false,
	activeTab: getInitialTab(),
	options: {},
};
