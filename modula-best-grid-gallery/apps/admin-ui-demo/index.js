import { createRoot } from '@wordpress/element';
import { DemoPage } from './DemoPage';
import './demo.scss';

const container = document.getElementById('modula-admin-ui-demo');

if (container) {
	createRoot(container).render(<DemoPage />);
}
