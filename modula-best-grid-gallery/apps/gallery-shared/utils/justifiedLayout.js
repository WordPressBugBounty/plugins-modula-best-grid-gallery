/**
 * Modula Gallery - Justified grid layout algorithm
 *
 * Port of react-grid-gallery's buildLayout: row-based justified layout
 * where each row has fixed height and images are scaled to fill the row,
 * then trimmed proportionally so the row fits containerWidth.
 *
 * @package
 */

/**
 * Distribute protruding pixels proportionally across row items.
 *
 * @param {Object[]} items           - Row items with scaledWidth
 * @param {number}   totalRowWidth   - Sum of scaled widths + margins
 * @param {number}   protrudingWidth - Pixels to remove from the row
 * @return {number[]} cutOff - Pixels to remove per item (sum === protrudingWidth)
 */
function calculateCutOff(items, totalRowWidth, protrudingWidth) {
	const cutOff = [];
	let cutSum = 0;
	for (const i in items) {
		const item = items[i];
		const fractionOfWidth = item.scaledWidth / totalRowWidth;
		cutOff[i] = Math.floor(fractionOfWidth * protrudingWidth);
		cutSum += cutOff[i];
	}

	let stillToCutOff = protrudingWidth - cutSum;
	while (stillToCutOff > 0) {
		for (const i in cutOff) {
			cutOff[i]++;
			stillToCutOff--;
			if (stillToCutOff <= 0) {
				break;
			}
		}
	}
	return cutOff;
}

/**
 * Build one row: take images until totalRowWidth >= containerWidth, then justify.
 *
 * @param {Object[]} images                 - Items with { width, height, ... }
 * @param {Object}   options                - { containerWidth, rowHeight, margin }
 * @param            options.containerWidth
 * @param            options.rowHeight
 * @param            options.margin
 * @return {[Object[], Object[]]} [row, remainingImages]
 */
function getRow(images, { containerWidth, rowHeight, margin }) {
	const row = [];
	const imgMargin = 2 * margin;
	const items = [...images];

	let totalRowWidth = 0;
	while (items.length > 0 && totalRowWidth < containerWidth) {
		const item = items.shift();
		const scaledWidth = Math.floor(rowHeight * (item.width / item.height));
		const extendedItem = {
			...item,
			scaledHeight: rowHeight,
			scaledWidth,
			viewportWidth: scaledWidth,
			marginLeft: 0,
		};
		row.push(extendedItem);
		totalRowWidth += extendedItem.scaledWidth + imgMargin;
	}

	const protrudingWidth = totalRowWidth - containerWidth;
	if (row.length > 0 && protrudingWidth > 0) {
		const cutoff = calculateCutOff(row, totalRowWidth, protrudingWidth);
		for (const i in row) {
			const pixelsToRemove = cutoff[i];
			const item = row[i];
			item.marginLeft = -Math.abs(Math.floor(pixelsToRemove / 2));
			item.viewportWidth = item.scaledWidth - pixelsToRemove;
		}
		// Rounding correction: ensure row content sums exactly to containerWidth - n*imgMargin
		const n = row.length;
		const targetContentSum = containerWidth - n * imgMargin;
		let contentSum = 0;
		for (const item of row) {
			contentSum += item.viewportWidth;
		}
		const diff = targetContentSum - contentSum;
		if (diff !== 0 && row.length > 0) {
			row[row.length - 1].viewportWidth += diff;
		}
	}

	return [row, items];
}

/**
 * When last row is "justify" but has fewer items and doesn't fill the row,
 * scale up the row height so the last row fills the full container width.
 *
 * @param {Object[]} lastRow        - Extended row items (have width, height, scaledHeight, scaledWidth)
 * @param {number}   containerWidth - Row width
 * @param {number}   margin         - Margin per side per item
 */
function applyLastRowJustify(lastRow, containerWidth, margin) {
	if (!lastRow.length) {
		return;
	}
	const imgMargin = 2 * margin;
	const totalRatio = lastRow.reduce(
		(sum, item) => sum + item.width / item.height,
		0
	);
	const availableWidth = containerWidth - lastRow.length * imgMargin;
	if (totalRatio <= 0 || availableWidth <= 0) {
		return;
	}
	const targetRowHeight = availableWidth / totalRatio;
	let totalRowWidth = 0;
	for (const item of lastRow) {
		item.scaledHeight = targetRowHeight;
		item.scaledWidth = Math.floor(
			targetRowHeight * (item.width / item.height)
		);
		item.viewportWidth = item.scaledWidth;
		item.marginLeft = 0;
		totalRowWidth += item.scaledWidth + imgMargin;
	}
	const protrudingWidth = totalRowWidth - containerWidth;
	if (protrudingWidth > 0) {
		const cutoff = calculateCutOff(lastRow, totalRowWidth, protrudingWidth);
		for (const i in lastRow) {
			const pixelsToRemove = cutoff[i];
			const item = lastRow[i];
			item.marginLeft = -Math.abs(Math.floor(pixelsToRemove / 2));
			item.viewportWidth = item.scaledWidth - pixelsToRemove;
		}
		const n = lastRow.length;
		const targetContentSum = containerWidth - n * imgMargin;
		let contentSum = 0;
		for (const item of lastRow) {
			contentSum += item.viewportWidth;
		}
		const diff = targetContentSum - contentSum;
		if (diff !== 0 && lastRow.length > 0) {
			lastRow[lastRow.length - 1].viewportWidth += diff;
		}
	}
}

/**
 * Apply last-row alignment: no justify, optional offset (left/center/right).
 *
 * @param {Object[]} lastRow        - Extended row items
 * @param {number}   containerWidth - Row width
 * @param {number}   margin         - Margin per side per item
 * @param {string}   alignment      - 'nojustify' | 'center' | 'right'
 */
function applyLastRowAlignment(lastRow, containerWidth, margin, alignment) {
	if (!lastRow.length) {
		return;
	}
	const imgMargin = 2 * margin;
	for (const item of lastRow) {
		item.viewportWidth = item.scaledWidth;
		item.marginLeft = 0;
	}
	const totalRowWidth = lastRow.reduce(
		(sum, item) => sum + item.viewportWidth + imgMargin,
		0
	);
	const offset = containerWidth - totalRowWidth;
	if (alignment === 'center') {
		lastRow[0].marginLeft = Math.round(offset / 2);
	} else if (alignment === 'right') {
		lastRow[0].marginLeft = offset;
	}
}

/**
 * Normalize last-row alignment to supported values.
 * Accepts legacy alias "left" as "nojustify".
 *
 * @param {string} alignment Raw alignment value.
 * @return {string} One of: justify, nojustify, center, right.
 */
function normalizeLastRowAlignment(alignment) {
	const normalized = String(alignment || '')
		.trim()
		.toLowerCase();
	if (
		normalized === 'justify' ||
		normalized === 'nojustify' ||
		normalized === 'center' ||
		normalized === 'right'
	) {
		return normalized;
	}
	if (normalized === 'left') {
		return 'nojustify';
	}
	return 'justify';
}

/**
 * Build all rows recursively until no images or maxRows reached.
 *
 * @param {Object[]}   images  - Items with { width, height, ... }
 * @param {Object}     options - BuildLayoutOptions
 * @param {Object[][]} rows    - Accumulator (default [])
 * @return {Object[][]} Array of rows (each row is array of extended items)
 */
function getRows(images, options, rows = []) {
	const [row, imagesLeft] = getRow(images, options);
	const nextRows = [...rows, row];

	if (options.maxRows && nextRows.length >= options.maxRows) {
		return nextRows;
	}

	if (imagesLeft.length) {
		return getRows(imagesLeft, options, nextRows);
	}
	// Last row: justify (scale up to fill row) or align (left/center/right)
	const lastRowAlignment = options.lastRowAlignment;
	if (row.length > 0) {
		const imgMargin = 2 * options.margin;
		const lastRowWidth = row.reduce(
			(sum, item) => sum + item.viewportWidth + imgMargin,
			0
		);
		if (
			lastRowAlignment === 'justify' &&
			lastRowWidth < options.containerWidth
		) {
			applyLastRowJustify(row, options.containerWidth, options.margin);
		} else if (lastRowAlignment && lastRowAlignment !== 'justify') {
			applyLastRowAlignment(
				row,
				options.containerWidth,
				options.margin,
				lastRowAlignment
			);
		}
	}
	return nextRows;
}

/**
 * Build justified layout (array of rows).
 *
 * @param {Object[]} images                   - Items with { width, height, ... } (numeric width/height required)
 * @param {Object}   options                  - { containerWidth, rowHeight?, margin?, maxRows?, lastRowAlignment? }
 * @param            options.containerWidth
 * @param            options.maxRows
 * @param            options.rowHeight
 * @param            options.margin
 * @param            options.lastRowAlignment - 'justify' | 'nojustify' (Left) | 'center' | 'right'
 * @return {Object[][]} Array of rows
 */
export function buildLayout(
	images,
	{ containerWidth, maxRows, rowHeight, margin, lastRowAlignment }
) {
	rowHeight = typeof rowHeight === 'undefined' ? 180 : rowHeight;
	margin = typeof margin === 'undefined' ? 2 : margin;

	if (!images || !Array.isArray(images)) {
		return [];
	}
	if (!containerWidth) {
		return [];
	}

	const options = {
		containerWidth,
		maxRows,
		rowHeight,
		margin,
		lastRowAlignment: normalizeLastRowAlignment(lastRowAlignment),
	};
	return getRows(images, options);
}

/**
 * Build justified layout as a flat array (for flex container rendering).
 * Each item gets rowIndex so the UI can detect last-in-row for flex fill.
 *
 * @param {Object[]} images  - Items with { width, height, ... }
 * @param {Object}   options - BuildLayoutOptions (includes lastRowAlignment)
 * @return {Object[]} Flat array of extended items (same order as input, by row)
 */
export function buildLayoutFlat(images, options) {
	const rows = buildLayout(images, options);
	return rows.flatMap((row, rowIndex) =>
		row.map((item) => ({ ...item, rowIndex }))
	);
}
