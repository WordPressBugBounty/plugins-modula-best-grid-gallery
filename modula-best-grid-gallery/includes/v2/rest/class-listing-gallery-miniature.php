<?php
/**
 * Admin listing: the cover miniature of a gallery made of content blocks.
 *
 * @package Modula
 */

namespace Modula\V2\Rest;

use Modula\V2\Freeform_Catalog;

defined( 'ABSPATH' ) || exit;

/**
 * Builds the drawing data the content page paints as a gallery's cover when no
 * item has a thumbnail: every catalog row at its place in the gallery's layout,
 * content blocks in their background colour and image.
 *
 * Built on the server from the catalog the row already reads, so the listing
 * needs no extra request per row. The payload is compact and bounded:
 *
 *     array{
 *         columns: int,             // layout width in cells
 *         rows: int,                // layout height in cells
 *         fills: string[],          // distinct CSS colours
 *         images: string[],         // distinct background image URLs
 *         tiles: array<int, int[]>, // [x, y, w, h, fill index, image index], in paint order; -1 = none
 *     }
 *
 * A tile with neither fill nor image is an item the miniature cannot show (an
 * image without a thumbnail, a shortcode); the page paints it neutral.
 */
class Listing_Gallery_Miniature {

	/** Rows drawn at most; the rest of a larger catalog is left out. */
	const MAX_TILES = 480;

	/** Matches gallery-shared `FREEFORM_COLUMNS`. */
	const FREEFORM_COLUMNS = 24;

	/** Custom grid's desktop column count (gallery-shared `getResponsiveForCustomGrid`). */
	const CUSTOM_GRID_COLUMNS = 12;

	/** `layout.gridType` default. */
	const DEFAULT_COLUMNS = 3;

	/**
	 * Whether the catalog has a content block to draw.
	 *
	 * @param array<int, mixed> $rows Catalog rows.
	 * @return bool
	 */
	public static function has_content_block( $rows ) {
		foreach ( self::catalog_rows( $rows ) as $row ) {
			if ( 'blocks' === Listing_Gallery_Item_Counts::row_count_key( $row ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param array<int, mixed> $rows         Catalog rows, in catalog order.
	 * @param string            $type         Gallery type slug.
	 * @param array<int, mixed> $placements   Saved Freeform placements (`freeform.placements`).
	 * @param mixed             $grid_columns `layout.gridType` (column count for the column layouts).
	 * @return array<string, mixed>|null Drawing data (see the class doc), or null without a content block.
	 */
	public static function build( $rows, $type, $placements, $grid_columns ) {
		if ( ! self::has_content_block( $rows ) ) {
			return null;
		}
		$rows = array_slice( self::catalog_rows( $rows ), 0, self::MAX_TILES );

		if ( 'freeform' === $type ) {
			$columns = self::FREEFORM_COLUMNS;
			$rects   = self::freeform_rects( $rows, $placements );
		} elseif ( 'custom-grid' === $type ) {
			$columns = self::CUSTOM_GRID_COLUMNS;
			$rects   = self::packed_rects( $rows, $columns );
		} else {
			$columns = self::column_count( $grid_columns );
			$rects   = self::cell_rects( count( $rows ), $columns );
		}

		return self::drawing( $rows, $rects, $columns );
	}

	/**
	 * @param array<int, mixed> $rows Catalog rows.
	 * @return array<int, array<string, mixed>> Rows with an `id`, reindexed.
	 */
	private static function catalog_rows( $rows ) {
		if ( ! is_array( $rows ) ) {
			return array();
		}
		$valid = array();
		foreach ( $rows as $row ) {
			if ( is_array( $row ) && isset( $row['id'] ) ) {
				$valid[] = $row;
			}
		}
		return $valid;
	}

	/**
	 * Freeform: saved placements by occurrence id; rows without one get the
	 * initial layout below them, three 8-column tiles a row (gallery-shared
	 * `resolveFreeformComposition`). Paint order is the stacking order.
	 *
	 * @param array<int, array<string, mixed>> $rows       Catalog rows.
	 * @param array<int, mixed>                $placements Saved placements.
	 * @return array<int, array{x: int, y: int, w: int, h: int, row: int}>
	 */
	private static function freeform_rects( $rows, $placements ) {
		$by_id = array();
		foreach ( is_array( $placements ) ? $placements : array() as $placement ) {
			if ( is_array( $placement ) && isset( $placement['id'] ) && is_string( $placement['id'] ) ) {
				$by_id[ $placement['id'] ] = $placement;
			}
		}
		if ( $by_id ) {
			$rows = Freeform_Catalog::identify( $rows );
		}

		$placed  = array();
		$pending = array();
		foreach ( $rows as $index => $row ) {
			$id = isset( $row['freeformId'] ) ? (string) $row['freeformId'] : '';
			if ( isset( $by_id[ $id ] ) ) {
				$placed[ $index ] = self::constrain_freeform( $by_id[ $id ] );
			} else {
				$pending[] = $index;
			}
		}

		$row_y      = self::bottom( $placed );
		$next_z     = $placed ? max( array_column( $placed, 'z' ) ) + 1 : 0;
		$row_height = 0;
		foreach ( $pending as $order => $index ) {
			if ( $order > 0 && 0 === $order % 3 ) {
				$row_y     += $row_height;
				$row_height = 0;
			}
			$height           = max( 1, (int) round( 8 / self::aspect( $rows[ $index ] ) ) );
			$row_height       = max( $row_height, $height );
			$placed[ $index ] = array(
				'x' => ( $order % 3 ) * 8,
				'y' => $row_y,
				'w' => 8,
				'h' => $height,
				'z' => $next_z++,
			);
		}

		$rects = array();
		foreach ( $placed as $index => $placement ) {
			$rects[] = array(
				'x'   => $placement['x'],
				'y'   => $placement['y'],
				'w'   => $placement['w'],
				'h'   => $placement['h'],
				'z'   => $placement['z'],
				'row' => $index,
			);
		}
		usort(
			$rects,
			static function ( $a, $b ) {
				return array( $a['z'], $a['row'] ) <=> array( $b['z'], $b['row'] );
			}
		);
		return $rects;
	}

	/**
	 * Clamp a saved placement as gallery-shared `constrainFreeformPlacement` does.
	 *
	 * @param array<string, mixed> $placement Saved placement.
	 * @return array{x: int, y: int, w: int, h: int, z: int}
	 */
	private static function constrain_freeform( $placement ) {
		$w = min( self::FREEFORM_COLUMNS, max( 1, self::whole( $placement, 'w', 8 ) ) );
		return array(
			'x' => min( self::FREEFORM_COLUMNS - $w, max( 0, self::whole( $placement, 'x', 0 ) ) ),
			'y' => max( 0, self::whole( $placement, 'y', 0 ) ),
			'w' => $w,
			'h' => max( 1, self::whole( $placement, 'h', 6 ) ),
			'z' => self::whole( $placement, 'z', 0 ),
		);
	}

	/**
	 * Custom grid: each row's width × height span, packed first-fit in catalog order.
	 *
	 * @param array<int, array<string, mixed>> $rows    Catalog rows.
	 * @param int                              $columns Grid columns.
	 * @return array<int, array{x: int, y: int, w: int, h: int, row: int}>
	 */
	private static function packed_rects( $rows, $columns ) {
		$taken = array();
		$rects = array();
		foreach ( $rows as $index => $row ) {
			$w = min( $columns, max( 1, self::whole( $row, 'width', 1 ) ) );
			$h = max( 1, self::whole( $row, 'height', 1 ) );

			list( $x, $y ) = self::first_free_spot( $taken, $columns, $w, $h );
			for ( $dy = 0; $dy < $h; $dy++ ) {
				for ( $dx = 0; $dx < $w; $dx++ ) {
					$taken[ ( $y + $dy ) . ':' . ( $x + $dx ) ] = true;
				}
			}
			$rects[] = array(
				'x'   => $x,
				'y'   => $y,
				'w'   => $w,
				'h'   => $h,
				'row' => $index,
			);
		}
		return $rects;
	}

	/**
	 * Top-most, then left-most, spot where a w × h tile fits.
	 *
	 * @param array<string, bool> $taken   Taken cells, keyed "y:x".
	 * @param int                 $columns Grid columns.
	 * @param int                 $w       Tile width.
	 * @param int                 $h       Tile height.
	 * @return int[] [x, y]
	 */
	private static function first_free_spot( $taken, $columns, $w, $h ) {
		for ( $y = 0; ; $y++ ) {
			for ( $x = 0; $x + $w <= $columns; $x++ ) {
				if ( self::is_free( $taken, $x, $y, $w, $h ) ) {
					return array( $x, $y );
				}
			}
		}
	}

	/**
	 * @param array<string, bool> $taken Taken cells, keyed "y:x".
	 * @param int                 $x     Left cell.
	 * @param int                 $y     Top cell.
	 * @param int                 $w     Width in cells.
	 * @param int                 $h     Height in cells.
	 * @return bool
	 */
	private static function is_free( $taken, $x, $y, $w, $h ) {
		for ( $dy = 0; $dy < $h; $dy++ ) {
			for ( $dx = 0; $dx < $w; $dx++ ) {
				if ( isset( $taken[ ( $y + $dy ) . ':' . ( $x + $dx ) ] ) ) {
					return false;
				}
			}
		}
		return true;
	}

	/**
	 * Column layouts: one cell per row, left to right.
	 *
	 * @param int $count   Rows to place.
	 * @param int $columns Columns.
	 * @return array<int, array{x: int, y: int, w: int, h: int, row: int}>
	 */
	private static function cell_rects( $count, $columns ) {
		$rects = array();
		for ( $index = 0; $index < $count; $index++ ) {
			$rects[] = array(
				'x'   => $index % $columns,
				'y'   => intdiv( $index, $columns ),
				'w'   => 1,
				'h'   => 1,
				'row' => $index,
			);
		}
		return $rects;
	}

	/**
	 * @param mixed $grid_columns `layout.gridType`, '1'–'12'.
	 * @return int
	 */
	private static function column_count( $grid_columns ) {
		$columns = is_numeric( $grid_columns ) ? (int) $grid_columns : self::DEFAULT_COLUMNS;
		return min( 12, max( 1, $columns ) );
	}

	/**
	 * Tiles with their paint, colours and images listed once.
	 *
	 * @param array<int, array<string, mixed>>                          $rows    Catalog rows.
	 * @param array<int, array{x: int, y: int, w: int, h: int, row: int}> $rects   Rectangles in paint order.
	 * @param int                                                       $columns Layout width in cells.
	 * @return array<string, mixed>
	 */
	private static function drawing( $rows, $rects, $columns ) {
		$fills  = array();
		$images = array();
		$tiles  = array();
		foreach ( $rects as $rect ) {
			list( $fill, $image ) = self::tile_paint( $rows[ $rect['row'] ] );
			$tiles[]              = array(
				$rect['x'],
				$rect['y'],
				$rect['w'],
				$rect['h'],
				self::palette_index( $fills, $fill ),
				self::palette_index( $images, $image ),
			);
		}

		return array(
			'columns' => $columns,
			'rows'    => self::bottom( $rects ),
			'fills'   => array_keys( $fills ),
			'images'  => array_keys( $images ),
			'tiles'   => $tiles,
		);
	}

	/**
	 * A content block's paint, as the frontend tile shows it: the background
	 * colour alone, or the image under the colour as an overlay (a stored rgba
	 * keeps its alpha, an opaque colour takes the overlay opacity).
	 *
	 * @param array<string, mixed> $row Catalog row.
	 * @return string[] [fill colour, image URL]; '' for none.
	 */
	private static function tile_paint( $row ) {
		if ( 'blocks' !== Listing_Gallery_Item_Counts::row_count_key( $row ) ) {
			return array( '', '' );
		}

		$colour = isset( $row['blockBackgroundColor'] )
			? (string) \Modula_Helper::sanitize_rgba_colour( $row['blockBackgroundColor'] )
			: '';
		$image  = self::background_image_url( $row );
		if ( '' === $image || '' === $colour || 0 === stripos( $colour, 'rgba(' ) ) {
			return array( $colour, $image );
		}

		$opacity = isset( $row['blockBackgroundOverlayOpacity'] ) ? (int) $row['blockBackgroundOverlayOpacity'] : 45;
		return array( (string) \Modula_Frontend_Adapter::hex_to_rgba( $colour, $opacity ), $image );
	}

	/**
	 * The background image's thumbnail, else its stored URL.
	 *
	 * @param array<string, mixed> $row Content block row.
	 * @return string
	 */
	private static function background_image_url( $row ) {
		$attachment_id = isset( $row['blockBackgroundImageId'] ) ? (int) $row['blockBackgroundImageId'] : 0;
		if ( $attachment_id > 0 ) {
			$src = wp_get_attachment_image_src( $attachment_id, 'thumbnail' );
			if ( $src && ! empty( $src[0] ) ) {
				return (string) $src[0];
			}
		}
		$url = isset( $row['blockBackgroundImageUrl'] ) ? trim( (string) $row['blockBackgroundImageUrl'] ) : '';
		return '' === $url ? '' : esc_url_raw( $url );
	}

	/**
	 * @param array<string, int> $palette Values by index, filled as values arrive.
	 * @param string             $value   Value; '' is none.
	 * @return int Index, or -1 for none.
	 */
	private static function palette_index( &$palette, $value ) {
		if ( '' === $value ) {
			return -1;
		}
		if ( ! isset( $palette[ $value ] ) ) {
			$palette[ $value ] = count( $palette );
		}
		return $palette[ $value ];
	}

	/**
	 * @param array<int, array{y: int, h: int}> $rects Rectangles.
	 * @return int The lowest bottom edge, 0 for none.
	 */
	private static function bottom( $rects ) {
		$bottom = 0;
		foreach ( $rects as $rect ) {
			$bottom = max( $bottom, $rect['y'] + $rect['h'] );
		}
		return $bottom;
	}

	/**
	 * Width / height ratio from the row's stored size, 4:3 without one.
	 *
	 * @param array<string, mixed> $row Catalog row.
	 * @return float
	 */
	private static function aspect( $row ) {
		$width  = isset( $row['width'] ) ? (float) $row['width'] : 0;
		$height = isset( $row['height'] ) ? (float) $row['height'] : 0;
		return $width > 0 && $height > 0 ? $width / $height : 4 / 3;
	}

	/**
	 * @param array<string, mixed> $values   Values.
	 * @param string               $key      Key.
	 * @param int                  $fallback Value when missing or not numeric.
	 * @return int Rounded whole number.
	 */
	private static function whole( $values, $key, $fallback ) {
		return isset( $values[ $key ] ) && is_numeric( $values[ $key ] ) ? (int) round( (float) $values[ $key ] ) : $fallback;
	}
}
