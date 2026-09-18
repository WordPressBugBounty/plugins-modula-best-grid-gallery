<?php
/**
 * Product names for gallery type slugs (`general.type`).
 *
 * @package Modula
 */

namespace Modula\V2\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Listing / PHP consumers: schema option labels, not a second map.
 */
class Gallery_Type_Labels {

	/**
	 * Localized gallery type name for a stored slug.
	 * Unknown slugs pass through; empty input is empty.
	 *
	 * @param mixed $type `general.type` / classic `type`.
	 * @return string
	 */
	public static function label_for( $type ) {
		if ( ! is_string( $type ) ) {
			return '';
		}
		$type = trim( $type );
		if ( '' === $type ) {
			return '';
		}
		$labels = Settings_Schema_Document::get_enum_option_labels( 'general', 'type' );
		if ( isset( $labels[ $type ] ) ) {
			return __( $labels[ $type ], 'modula-best-grid-gallery' );
		}
		return $type;
	}
}
