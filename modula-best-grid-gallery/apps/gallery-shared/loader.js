/**
 * Public detection-only surface. Keep this entry free of mounting, layout,
 * editor and lightbox-session dependencies so dormant galleries stay cheap.
 *
 * @package
 */

export { getDeeplinkGalleryIdFromHash } from './lightbox/modulaDeeplinkFromHash';
export { MODERN_VISITOR_ROOT_PENDING_SELECTOR } from './utils/visitorRootClassification';
