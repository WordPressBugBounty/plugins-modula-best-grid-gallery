/**
 * Factory for gated takeover import modals: open guard + remount key + workflow mount.
 *
 * @template {Record<string, unknown>} TExtra
 * @param {{
 *   Workflow: import('react').ComponentType<
 *     { onClose: () => void } & TExtra
 *   >,
 *   getRemountKey?: (props: { galleryId: number } & TExtra) => string,
 * }} options
 */
export function createTakeoverImportModal({ Workflow, getRemountKey }) {
	/**
	 * @param {{
	 *   isOpen: boolean,
	 *   onClose: () => void,
	 *   galleryId: number,
	 * } & TExtra} props
	 */
	return function TakeoverImportModal({
		isOpen,
		onClose,
		galleryId,
		...extra
	}) {
		if (!isOpen || !galleryId) {
			return null;
		}

		const remountKey = getRemountKey
			? getRemountKey({ galleryId, ...extra })
			: String(galleryId);

		return (
			<Workflow
				key={remountKey}
				onClose={onClose}
				{...extra}
			/>
		);
	};
}
