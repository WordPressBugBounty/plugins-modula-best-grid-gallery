/**
 * Catches render errors in a single gallery instance so the page does not go blank.
 *
 * @package
 */
import { Component, Fragment } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export default class GalleryErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { error: null, resetKey: 0 };
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		// eslint-disable-next-line no-console
		console.error('Modula gallery:', error, info?.componentStack);
	}

	handleRetry = () => {
		const { galleryElement, onRetry } = this.props;
		this.setState((s) => ({
			error: null,
			resetKey: (s.resetKey || 0) + 1,
		}));
		if (typeof onRetry === 'function' && galleryElement) {
			onRetry(galleryElement);
		}
	};

	render() {
		const { error } = this.state;
		const { children } = this.props;

		if (error) {
			return (
				<div className="modula-gallery__error-boundary" role="alert">
					<p className="modula-gallery__error-boundary-text">
						{__(
							'This gallery could not be displayed.',
							'modula-best-grid-gallery'
						)}
					</p>
					<button
						type="button"
						className="modula-gallery__error-boundary-retry"
						onClick={this.handleRetry}
					>
						{__('Try again', 'modula-best-grid-gallery')}
					</button>
				</div>
			);
		}

		return <Fragment key={this.state.resetKey}>{children}</Fragment>;
	}
}
