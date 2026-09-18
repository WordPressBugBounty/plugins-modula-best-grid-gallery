import HoverBuilderSocialPreview from './HoverBuilderSocialPreview';
import HoverImageSlotChip from './HoverImageSlotChip';
import {
	ITEM_DESCRIPTION_CLASS_NAME,
	ITEM_TITLE_CLASS_NAME,
} from 'gallery-shared/utils/itemChromeLegacyCssAliases';

/**
 * @param {{
 *   mediaRef: { current: HTMLElement | null },
 *   buildMode: boolean,
 *   selectedTarget: string,
 *   setSelectedTarget: (id: string) => void,
 *   slotLabels: Record<string, string>,
 *   positions: Record<string, {x:number,y:number}>,
 *   showTitleSlot: boolean,
 *   showCaptionSlot: boolean,
 *   showSocialSlot: boolean,
 *   zForSlot: (slot: string) => number,
 *   onCommit: (slot: 'title'|'caption'|'social', next:{x:number,y:number}) => void,
 *   titleText: string,
 *   titleTypographyStyle: Record<string, string>,
 *   captionHtml: string,
 *   captionTypographyStyle: Record<string, string>,
 *   social: Record<string, any> | undefined,
 * }} props
 */
export default function HoverBuilderSlotChips({
	mediaRef,
	buildMode,
	selectedTarget,
	setSelectedTarget,
	slotLabels,
	positions,
	showTitleSlot,
	showCaptionSlot,
	showSocialSlot,
	zForSlot,
	onCommit,
	titleText,
	titleTypographyStyle,
	captionHtml,
	captionTypographyStyle,
	social,
}) {
	return (
		<>
			{showTitleSlot ? (
				<HoverImageSlotChip
					label={slotLabels.title}
					mediaRef={mediaRef}
					buildMode={buildMode}
					selected={selectedTarget === 'title'}
					x={positions.title.x}
					y={positions.title.y}
					zIndex={zForSlot('title')}
					onSelect={() => setSelectedTarget('title')}
					onCommit={(next) => onCommit('title', next)}
				>
					<div
						className={ITEM_TITLE_CLASS_NAME}
						style={titleTypographyStyle}
					>
						{titleText}
					</div>
				</HoverImageSlotChip>
			) : null}
			{showCaptionSlot ? (
				<HoverImageSlotChip
					label={slotLabels.caption}
					mediaRef={mediaRef}
					buildMode={buildMode}
					selected={selectedTarget === 'caption'}
					x={positions.caption.x}
					y={positions.caption.y}
					zIndex={zForSlot('caption')}
					onSelect={() => setSelectedTarget('caption')}
					onCommit={(next) => onCommit('caption', next)}
				>
					<div
						className={ITEM_DESCRIPTION_CLASS_NAME}
						style={captionTypographyStyle}
						dangerouslySetInnerHTML={{
							__html: captionHtml,
						}}
					/>
				</HoverImageSlotChip>
			) : null}
			{showSocialSlot ? (
				<HoverImageSlotChip
					label={slotLabels.social}
					mediaRef={mediaRef}
					buildMode={buildMode}
					selected={selectedTarget === 'social'}
					x={positions.social.x}
					y={positions.social.y}
					zIndex={zForSlot('social')}
					onSelect={() => setSelectedTarget('social')}
					onCommit={(next) => onCommit('social', next)}
				>
					<HoverBuilderSocialPreview social={social} />
				</HoverImageSlotChip>
			) : null}
		</>
	);
}
