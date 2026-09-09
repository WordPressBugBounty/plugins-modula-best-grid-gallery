import { useEffect, useMemo, useState } from '@wordpress/element';
import { FormTokenField, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

/**
 * Multi post/page picker for general settings. Value is an array of post IDs.
 *
 * @param {Object}   props
 * @param {Object}   props.field
 * @param {Object}   props.fieldState
 * @param {Function} props.handleChange
 * @param {boolean}  [props.disabled]
 */
export default function PostPickerField({
	fieldState,
	field,
	handleChange,
	disabled = false,
}) {
	const selectedIds = useMemo(() => {
		const raw = fieldState.state.value;
		if (!Array.isArray(raw)) {
			return [];
		}
		return raw.map((id) => Number(id)).filter((id) => id > 0);
	}, [fieldState.state.value]);

	const initialLabels = useMemo(() => {
		const map = {};
		const items = Array.isArray(field.items) ? field.items : [];
		items.forEach((item) => {
			const id = Number(item?.id ?? item?.value);
			const label =
				typeof item?.label === 'string'
					? item.label
					: typeof item?.title === 'string'
						? item.title
						: '';
			if (id > 0 && label) {
				map[id] = label;
			}
		});
		return map;
	}, [field.items]);

	const [labelById, setLabelById] = useState(initialLabels);
	const [suggestions, setSuggestions] = useState([]);
	const [searching, setSearching] = useState(false);

	useEffect(() => {
		setLabelById((prev) => ({ ...initialLabels, ...prev }));
	}, [initialLabels]);

	useEffect(() => {
		const missing = selectedIds.filter((id) => !labelById[id]);
		if (!missing.length) {
			return undefined;
		}
		let cancelled = false;
		(async () => {
			const next = { ...labelById };
			await Promise.all(
				missing.map(async (id) => {
					try {
						const post = await apiFetch({
							path: `/wp/v2/posts/${id}?_fields=id,title`,
						});
						const title = post?.title?.rendered
							? String(post.title.rendered).replace(/<[^>]+>/g, '')
							: `#${id}`;
						next[id] = title;
					} catch (err) {
						try {
							const page = await apiFetch({
								path: `/wp/v2/pages/${id}?_fields=id,title`,
							});
							const title = page?.title?.rendered
								? String(page.title.rendered).replace(
										/<[^>]+>/g,
										''
									)
								: `#${id}`;
							next[id] = title;
						} catch (pageErr) {
							next[id] = `#${id}`;
						}
					}
				})
			);
			if (!cancelled) {
				setLabelById(next);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [selectedIds, labelById]);

	const tokens = selectedIds.map((id) => labelById[id] || `#${id}`);

	const resolveIdFromToken = (token) => {
		const match = Object.entries(labelById).find(
			([, label]) => label === token
		);
		if (match) {
			return Number(match[0]);
		}
		const hash = /^#(\d+)$/.exec(String(token));
		return hash ? Number(hash[1]) : 0;
	};

	const onChangeTokens = (nextTokens) => {
		const ids = [];
		nextTokens.forEach((token) => {
			const id = resolveIdFromToken(token);
			if (id > 0 && !ids.includes(id)) {
				ids.push(id);
			}
		});
		handleChange(ids);
	};

	const onInputChange = async (search) => {
		const q = String(search || '').trim();
		if (q.length < 2) {
			setSuggestions([]);
			return;
		}
		setSearching(true);
		try {
			const results = await apiFetch({
				path: `/wp/v2/search?search=${encodeURIComponent(q)}&type=post&subtype=post,page&per_page=20`,
			});
			const nextLabels = { ...labelById };
			const labels = [];
			(Array.isArray(results) ? results : []).forEach((row) => {
				const id = Number(row?.id);
				const title =
					typeof row?.title === 'string' && row.title
						? row.title
						: `#${id}`;
				if (id > 0) {
					nextLabels[id] = title;
					if (!selectedIds.includes(id)) {
						labels.push(title);
					}
				}
			});
			setLabelById(nextLabels);
			setSuggestions(labels);
		} catch (err) {
			setSuggestions([]);
		} finally {
			setSearching(false);
		}
	};

	return (
		<div className="modula-settings-post-picker">
			<FormTokenField
				label={field.label}
				value={tokens}
				suggestions={suggestions}
				onChange={onChangeTokens}
				onInputChange={onInputChange}
				disabled={disabled}
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{searching ? <Spinner /> : null}
			{field?.description ? (
				<p className="description">
					<span
						dangerouslySetInnerHTML={{
							__html: field.description,
						}}
					/>
				</p>
			) : (
				<p className="description">
					{__(
						'Search for pages or posts where site-wide protection should stay off.',
						'modula-best-grid-gallery'
					)}
				</p>
			)}
		</div>
	);
}
