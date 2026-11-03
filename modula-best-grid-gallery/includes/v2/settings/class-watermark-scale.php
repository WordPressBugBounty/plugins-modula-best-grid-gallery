<?php
/**
 * Text watermark size and margin as shares of the image width.
 *
 * Pro burns the watermark into the full-resolution original and WordPress
 * derives every served size from it, so a fixed px size vanishes on the sizes
 * visitors see. A share of the width keeps the same proportion on every
 * resolution. One rule, used by the settings import, Pro's burn-in and the
 * editor canvas preview:
 *
 *     size_px   = round( image_width * text_size_share / 100 ), at least 1
 *     margin_px = round( image_width * margin_share / 100 )
 *
 * The margin is measured on the width for both axes. Settings saved in px
 * before the change convert once to the share they had on a
 * REFERENCE_WIDTH-wide image (18px → 1.8%, 10px → 1%). Defaults and ranges
 * are the settings document's (`watermark.watermarkTextSizeShare`,
 * `watermark.watermarkMarginShare`).
 *
 * @package Modula
 */

namespace Modula\V2\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Class Watermark_Scale
 */
class Watermark_Scale {

	/**
	 * Image width (px) at which a legacy px value keeps its size.
	 */
	const REFERENCE_WIDTH = 1000;

	/**
	 * Share key => legacy px key, in the grouped `watermark` group.
	 *
	 * @var array<string, string>
	 */
	const GROUPED_LEGACY_KEYS = array(
		'watermarkTextSizeShare' => 'watermarkTextSize',
		'watermarkMarginShare'   => 'watermarkMargin',
	);

	/**
	 * Share key => legacy px key, in the flat `modula-settings` copy.
	 *
	 * @var array<string, string>
	 */
	const FLAT_LEGACY_KEYS = array(
		'watermark_text_size_share' => 'watermark_text_size',
		'watermark_margin_share'    => 'watermark_margin',
	);

	/**
	 * Pixels a share of the image width covers.
	 *
	 * @param float $share       Percent of the image width.
	 * @param int   $image_width Image width in px.
	 * @return int 0 only for a 0% share; any positive share draws at least 1px.
	 */
	public static function px_for_width( $share, $image_width ) {
		$share = (float) $share;
		if ( $share <= 0 ) {
			return 0;
		}
		return max( 1, (int) round( max( 0, (int) $image_width ) * $share / 100 ) );
	}

	/**
	 * Share of a legacy px value at the reference width, within the field's range.
	 *
	 * @param string     $share_key Grouped share key (`watermarkTextSizeShare`, `watermarkMarginShare`).
	 * @param int|string $px        Saved px value.
	 * @return float Percent rounded to one decimal.
	 */
	public static function share_from_px( $share_key, $px ) {
		return self::clamp( $share_key, round( (float) $px / self::REFERENCE_WIDTH * 100, 1 ) );
	}

	/**
	 * The settings document's default share.
	 *
	 * @param string $share_key Grouped share key.
	 * @return float
	 */
	public static function default_share( $share_key ) {
		return (float) self::field( $share_key )['default'];
	}

	/**
	 * Grouped `watermark` group: replace legacy px keys with their shares.
	 *
	 * @param array<string, mixed> $group Watermark group.
	 * @return array<string, mixed>
	 */
	public static function migrate_grouped( array $group ) {
		return self::migrate_legacy_px( $group, self::GROUPED_LEGACY_KEYS );
	}

	/**
	 * Flat `modula-settings`: replace legacy px keys with their shares.
	 *
	 * @param array<string, mixed> $flat Flat settings.
	 * @return array<string, mixed>
	 */
	public static function migrate_flat( array $flat ) {
		return self::migrate_legacy_px( $flat, self::FLAT_LEGACY_KEYS );
	}

	/**
	 * Text size and margin shares a gallery's flat `modula-settings` burns with.
	 *
	 * Converts px saved before the change, then fills the document defaults.
	 *
	 * @param array<string, mixed> $flat Flat gallery settings.
	 * @return array{watermark_text_size_share: float, watermark_margin_share: float}
	 */
	public static function gallery_flat_shares( array $flat ) {
		$flat   = self::migrate_flat( $flat );
		$shares = array();
		foreach ( array_keys( self::FLAT_LEGACY_KEYS ) as $flat_key ) {
			$shares[ $flat_key ] = isset( $flat[ $flat_key ] ) && is_numeric( $flat[ $flat_key ] )
				? self::clamp( $flat_key, (float) $flat[ $flat_key ] )
				: self::default_share( $flat_key );
		}
		return $shares;
	}

	/**
	 * Replace legacy px keys with their shares, unless a share is already stored.
	 *
	 * The px keys are always removed, so the conversion runs once: the next
	 * save stores only the share.
	 *
	 * @param array<string, mixed>  $settings Watermark group or flat settings.
	 * @param array<string, string> $key_map  Share key => legacy px key.
	 * @return array<string, mixed>
	 */
	private static function migrate_legacy_px( array $settings, array $key_map ) {
		foreach ( $key_map as $share_key => $px_key ) {
			if ( ! array_key_exists( $px_key, $settings ) ) {
				continue;
			}
			$px = $settings[ $px_key ];
			unset( $settings[ $px_key ] );
			if ( array_key_exists( $share_key, $settings ) || ! is_numeric( $px ) ) {
				continue;
			}
			$settings[ $share_key ] = self::share_from_px( $share_key, $px );
		}
		return $settings;
	}

	/**
	 * @param string $share_key Grouped or flat share key.
	 * @param float  $share     Percent.
	 * @return float
	 */
	private static function clamp( $share_key, $share ) {
		$field = self::field( $share_key );
		return (float) max( (float) $field['minimum'], min( (float) $field['maximum'], (float) $share ) );
	}

	/**
	 * Schema definition of a share field (flat keys resolve through Field_Registry).
	 *
	 * @param string $share_key Grouped or flat share key.
	 * @return array<string, mixed>
	 */
	private static function field( $share_key ) {
		if ( ! isset( self::GROUPED_LEGACY_KEYS[ $share_key ] ) ) {
			$share_key = Field_Registry::get_flat_to_grouped_mapping()[ $share_key ]['key'];
		}
		return Registry::get_schema()['watermark'][ $share_key ];
	}
}
