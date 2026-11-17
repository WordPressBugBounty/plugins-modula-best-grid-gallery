<?php
/**
 * Gallery sorting: the modes a gallery's `modulaSorting` meta can hold.
 *
 * The gallery editor computes the order when a mode is picked; the server
 * stores the order and the mode, and visitors see the stored order. The REST
 * route that stores the mode and the gallery preset ability both read the
 * list from here.
 *
 * @package Modula
 */

namespace Modula\V2;

defined( 'ABSPATH' ) || exit;

/**
 * Class Gallery_Sorting
 */
class Gallery_Sorting {

	/**
	 * Same keys as `GALLERY_SORT_MODES` in the gallery editor. The classic
	 * sorting metabox and albums (Pro) know only the modes before
	 * `fileNameAZ`; they treat the file-name modes as `manual`.
	 *
	 * @return string[]
	 */
	public static function modes() {
		return array(
			'manual',
			'dateCreatedNew',
			'dateCreatedOld',
			'dateModifiedFirst',
			'dateModifiedLast',
			'titleAZ',
			'titleZA',
			'fileNameAZ',
			'fileNameZA',
			'random',
		);
	}
}
