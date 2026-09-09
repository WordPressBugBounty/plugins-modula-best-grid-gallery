/**
 * Form-schema field enrichment for the settings editor: labels, option maps,
 * control tweaks, and collapsible metadata. Does not change REST payload shape.
 */
export { enrichField } from './enrichField';
export {
	bucketFieldsIntoDisplayRows,
	sortEnrichedFields,
} from './sortAndBucket';
