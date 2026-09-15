/**
 * Presentation gate for hub drill-row value summaries.
 *
 * Summary resolvers and DrillValueSummary remain in the tree; hub rows simply
 * stop rendering them so nested navigation / dirty / reset stay intact.
 *
 * @return {boolean}
 */
export function shouldShowDrillRowValueSummary() {
	return false;
}
