/**
 * Left preview column for content block editing.
 */
import {
	blockFontFamilyCss,
	blockPaddingToCss,
	buildContentBlockBackgroundStyle,
} from 'gallery-shared/preview';
import { __ } from '@wordpress/i18n';
import { Notice } from '@wordpress/components';
import { resolveContentBlockTextColor } from '../../utils/contentBlockEditState';

/**
 * @param {Object} props
 * @param {Object} props.state Content block form state.
 */
export default function ContentBlockPreviewPanel({ state }) {
	const fg = resolveContentBlockTextColor(state);
	const padCss = blockPaddingToCss(state.blockPaddingPreset);
	const fontFamily = blockFontFamilyCss(state.blockFontPreset);
	const hasBody =
		state.blockBodyHtml &&
		state.blockBodyHtml.replace(/<[^>]+>/g, '').trim() !== '';
	const backgroundStyle = buildContentBlockBackgroundStyle({
		color: state.bg,
		imageUrl: state.blockBackgroundImageUrl,
		opacity: state.blockBackgroundOverlayOpacity,
		size: state.blockBackgroundSize,
		position: state.blockBackgroundPosition,
		repeat: state.blockBackgroundRepeat,
	});

	return (
		<aside className="modula-image-metadata-modal__preview-panel modula-image-metadata-modal__preview-panel--content-block">
			<div
				className="modula-image-metadata-modal__content-block-preview"
				style={{
					...backgroundStyle,
					color: fg,
					padding: padCss,
					fontFamily,
				}}
			>
				{state.title ? (
					<div className="modula-image-metadata-modal__content-block-preview-title">
						{state.title}
					</div>
				) : (
					<div className="modula-image-metadata-modal__content-block-preview-placeholder">
						{__('Headline', 'modula-best-grid-gallery')}
					</div>
				)}
				{state.description ? (
					<div className="modula-image-metadata-modal__content-block-preview-subtitle">
						{state.description}
					</div>
				) : null}
				{hasBody ? (
					<div
						className="modula-image-metadata-modal__content-block-preview-body"
						dangerouslySetInnerHTML={{
							__html: state.blockBodyHtml,
						}}
					/>
				) : null}
			</div>

			<Notice
				className="modula-image-metadata-modal__preview-notice"
				status="info"
				isDismissible={false}
			>
				{__(
					'Changes you make here only affect how this content block appears in the gallery.',
					'modula-best-grid-gallery'
				)}
			</Notice>
		</aside>
	);
}
