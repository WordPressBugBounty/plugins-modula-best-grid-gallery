/**
 * Public layout-rules surface for `gallery-shared`: the layout policy (what a
 * gallery type offers and its derived values, such as the fewest columns it
 * draws), for editor rules that shape settings by gallery type. Import from
 * `gallery-shared/layoutRules`; unlike the `preview` barrel it loads no
 * components, so editor unit tests can import it.
 *
 * @package
 */

export { getLayoutPolicy } from './utils/getLayoutPolicy';
