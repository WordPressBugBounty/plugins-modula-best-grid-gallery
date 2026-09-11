import { setLocaleData } from '@wordpress/i18n';

// Supply the host's translations before listing modules evaluate their labels.
setLocaleData(window.modulaListingTestLocale || {}, 'modula-best-grid-gallery');
