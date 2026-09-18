const { useEffect, useRef } = wp.element;

export const ModulaGallerySearch = (props) => {
	const { onIdChange, id, options, galleries } = props;
	const inputRef = useRef(null);

	useEffect(() => {
		if (!inputRef.current) {
			return undefined;
		}

		const galleriesArray = [];
		if (galleries != undefined && 0 == galleriesArray.length) {
			galleries.forEach((gallery) => {
				galleriesArray.push({
					value: gallery.id,
					label: gallery.title.rendered,
				});
			});
		}

		const $input = jQuery(inputRef.current);
		$input.selectize({
			valueField: 'value',
			labelField: 'label',
			searchField: ['label', 'value'],
			create: false,
			maxItems: 1,
			placeholder: 'Search for a gallery...',
			preload: true,
			allowEmptyOptions: true,
			closeAfterSelect: true,
			// Portal outside `.modula-block-preview { overflow: hidden }` so the
			// list can scroll without clipping or closing on scrollbar click.
			dropdownParent: 'body',
			dropdownClass: 'selectize-dropdown modula-gallery-picker-dropdown',
			options: options.concat(galleriesArray),
			render: {
				option(item, escape) {
					return (
						'<div>' +
						'<span className="title">' +
						item.label +
						'<span className="name"> (#' +
						escape(item.value) +
						')</span>' +
						'</div>'
					);
				},
			},
			load(query, callback) {
				if (!query.length) {
					return callback();
				}

				jQuery.ajax({
					url: modulaVars.ajaxURL,
					type: 'GET',
					data: {
						action: 'modula_get_gallery',
						nonce: modulaVars.nonce,
						term: query,
					},
					success: (res) => {
						callback(res);
					},
				});
			},
			onChange: (value) => {
				onIdChange(value);
			},
		});

		return () => {
			if ($input[0] && $input[0].selectize) {
				$input[0].selectize.destroy();
			}
		};
	}, []);

	return (
		<input
			ref={inputRef}
			className="modula-gallery-input"
			defaultValue={'0' == id ? '' : id}
		/>
	);
};

export default ModulaGallerySearch;
