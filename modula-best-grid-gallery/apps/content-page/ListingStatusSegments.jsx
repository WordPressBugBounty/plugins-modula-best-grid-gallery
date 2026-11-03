import { __ } from '@wordpress/i18n';
import { Segmented } from 'admin-ui';
import { applyListingSegment, getListingSegment } from './listingToolbarView';

const SEGMENT_LABELS = {
	all: __('All', 'modula-best-grid-gallery'),
	publish: __('Published', 'modula-best-grid-gallery'),
	draft: __('Drafts', 'modula-best-grid-gallery'),
	trash: __('Trash', 'modula-best-grid-gallery'),
};

/**
 * The status segments All / Published / Drafts / Trash with their row
 * counts (for the section, search and type filter). Counts show once the
 * list has loaded them.
 *
 * @param {Object}                                     props
 * @param {import('./viewToListingQuery').ListingView} props.view
 * @param {Function}                                   props.onChangeView
 * @param {Record<string, number>|null}                [props.segmentCounts]
 */
export function ListingStatusSegments({
	view,
	onChangeView,
	segmentCounts = null,
}) {
	const options = Object.entries(SEGMENT_LABELS).map(([value, label]) => ({
		value,
		label,
		count: Number.isInteger(segmentCounts?.[value])
			? segmentCounts[value]
			: undefined,
	}));

	return (
		<Segmented
			className="modula-content-page__segments"
			aria-label={__('Status', 'modula-best-grid-gallery')}
			options={options}
			value={getListingSegment(view)}
			onChange={(segment) =>
				onChangeView(applyListingSegment(view, segment))
			}
		/>
	);
}
