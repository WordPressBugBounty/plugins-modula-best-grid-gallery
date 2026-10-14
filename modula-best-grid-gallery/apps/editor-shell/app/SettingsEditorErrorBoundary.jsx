/**
 * Catches render errors in the settings editor so the whole metabox/takeover does not go blank.
 *
 * `classBlock` is the editor's content class block (gallery: modula-settings-editor,
 * albums: modula-albums-editor), so each editor keeps its own error-boundary styles.
 */
import { Component, Fragment } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Notice } from '@wordpress/components';

export default class SettingsEditorErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { error: null, resetKey: 0 };
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		// eslint-disable-next-line no-console
		console.error('Modula settings editor:', error, info?.componentStack);
	}

	handleReload = () => {
		window.location.reload();
	};

	handleDismiss = () => {
		this.setState((s) => ({
			error: null,
			resetKey: (s.resetKey || 0) + 1,
		}));
	};

	render() {
		const { error } = this.state;
		const { children, classBlock = 'modula-settings-editor' } = this.props;

		if (error) {
			const msg =
				error && typeof error.message === 'string'
					? error.message
					: String(error);
			return (
				<div className={`${classBlock}__error-boundary`}>
					<Notice status="error" isDismissible={false}>
						<p className={`${classBlock}__error-boundary-text`}>
							{__(
								'Something went wrong while rendering the settings. You can reload the page to try again.',
								'modula-best-grid-gallery'
							)}
						</p>
						{msg ? (
							<details
								className={`${classBlock}__error-boundary-details`}
							>
								<summary>
									{__(
										'Technical details',
										'modula-best-grid-gallery'
									)}
								</summary>
								<pre>{msg}</pre>
							</details>
						) : null}
						<div
							className={`${classBlock}__error-boundary-actions`}
						>
							<Button
								variant="primary"
								onClick={this.handleReload}
							>
								{__('Reload page', 'modula-best-grid-gallery')}
							</Button>
							<Button
								variant="secondary"
								onClick={this.handleDismiss}
							>
								{__('Try again', 'modula-best-grid-gallery')}
							</Button>
						</div>
					</Notice>
				</div>
			);
		}

		return <Fragment key={this.state.resetKey}>{children}</Fragment>;
	}
}
