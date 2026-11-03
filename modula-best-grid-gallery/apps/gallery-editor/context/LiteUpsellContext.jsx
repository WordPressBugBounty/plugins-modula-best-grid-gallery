import { createContext, useContext, useState } from '@wordpress/element';
import { UpsellPopover } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';
import { liteUpsellPopoverText } from '../logic/liteUpsell';

const LiteUpsellContext = createContext(null);

/**
 * @typedef {import('../logic/liteUpsell').LiteUpsell} LiteUpsell
 */

/**
 * The takeover's small Lite upsell popover: a locked row's PRO pill or a
 * locked option opens it next to itself, with that setting's upsell and the
 * locked `feature`. Outside the takeover (the metabox editor) there is no
 * provider, and the controls keep their inline upsells.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function LiteUpsellProvider({ children }) {
	const [opened, setOpened] = useState(
		/** @type {{ upsell: LiteUpsell, anchor: HTMLElement|null }|null} */ (
			null
		)
	);
	// The state setter is stable, so consumers do not re-render on open.
	const [openLiteUpsell] = useState(
		() => (upsell, anchor) => setOpened({ upsell, anchor })
	);
	const text = opened ? liteUpsellPopoverText(opened.upsell) : null;

	return (
		<LiteUpsellContext.Provider value={openLiteUpsell}>
			{children}
			<AdminUiScope>
				<UpsellPopover
					open={opened !== null}
					anchor={opened?.anchor ?? null}
					title={text?.title ?? ''}
					line={text?.line ?? ''}
					ctaLabel={opened?.upsell.ctaLabel ?? ''}
					ctaHref={opened?.upsell.href ?? ''}
					onClose={() => setOpened(null)}
				/>
			</AdminUiScope>
		</LiteUpsellContext.Provider>
	);
}

/**
 * @return {((upsell: LiteUpsell, anchor: HTMLElement|null) => void)|null} Opens the upsell popover next to `anchor`; null outside the takeover.
 */
export function useOpenLiteUpsell() {
	return useContext(LiteUpsellContext);
}
