<?php
/**
 * Build gallery context payload for Modula custom CSS AI generation.
 *
 * @package Modula
 */

namespace Modula\V2\Ai;

defined( 'ABSPATH' ) || exit;

/**
 * Class Gallery_Css_Context
 */
class Gallery_Css_Context {

	/**
	 * @param int   $gallery_id Gallery post ID.
	 * @param array $settings   Grouped v2 settings.
	 * @return array<string, mixed>
	 */
	public static function build( $gallery_id, array $settings ) {
		$gallery_id = absint( $gallery_id );
		$general    = isset( $settings['general'] ) && is_array( $settings['general'] )
			? $settings['general']
			: array();
		$layout     = isset( $settings['layout'] ) && is_array( $settings['layout'] )
			? $settings['layout']
			: array();
		$style      = isset( $settings['style'] ) && is_array( $settings['style'] )
			? $settings['style']
			: array();

		$type      = isset( $general['type'] ) ? sanitize_key( (string) $general['type'] ) : 'grid';
		$grid_type = isset( $layout['gridType'] ) ? sanitize_key( (string) $layout['gridType'] ) : '';

		return array(
			'galleryId'        => $gallery_id,
			'rootSelector'     => '#modula-' . $gallery_id,
			'type'             => $type,
			'gridType'         => $grid_type,
			'resolvedLayout'   => self::resolve_layout_key( $type, $grid_type ),
			'enabledFeatures'  => self::enabled_features( $settings ),
			'styleSnapshot'    => self::style_snapshot( $style ),
			'currentCustomCss' => isset( $style['customCss'] ) ? (string) $style['customCss'] : '',
		);
	}

	/**
	 * @param string $type      Gallery type.
	 * @param string $grid_type Masonry/grid subtype.
	 * @return string
	 */
	public static function resolve_layout_key( $type, $grid_type ) {
		$type = sanitize_key( (string) $type );
		if ( 'grid' === $type ) {
			if ( 'automatic' === sanitize_key( (string) $grid_type ) ) {
				return 'justified-grid';
			}
			return 'grid';
		}
		return $type;
	}

	/**
	 * @param array $settings Grouped v2 settings.
	 * @return string[]
	 */
	private static function enabled_features( array $settings ) {
		$features = array();

		$filtering = isset( $settings['filtering'] ) && is_array( $settings['filtering'] )
			? $settings['filtering']
			: array();
		if ( ! empty( $filtering['enableFiltering'] ) ) {
			$features[] = 'filters';
		}

		$pagination = isset( $settings['pagination'] ) && is_array( $settings['pagination'] )
			? $settings['pagination']
			: array();
		if ( ! empty( $pagination['enablePagination'] ) ) {
			$features[] = 'pagination';
		}

		$lightbox = isset( $settings['lightbox'] ) && is_array( $settings['lightbox'] )
			? $settings['lightbox']
			: array();
		if ( ! empty( $lightbox['lightbox'] ) && 'none' !== (string) $lightbox['lightbox'] ) {
			$features[] = 'lightbox';
		}

		$hover = isset( $settings['hover'] ) && is_array( $settings['hover'] )
			? $settings['hover']
			: array();
		if ( ! empty( $hover['hoverEffect'] ) && 'none' !== (string) $hover['hoverEffect'] ) {
			$features[] = 'hover';
		}

		$social = isset( $settings['social'] ) && is_array( $settings['social'] )
			? $settings['social']
			: array();
		foreach ( array( 'enableFacebook', 'enableTwitter', 'enablePinterest', 'enableWhatsapp', 'enableLinkedin', 'enableEmail' ) as $key ) {
			if ( ! empty( $social[ $key ] ) ) {
				$features[] = 'social';
				break;
			}
		}

		return array_values( array_unique( $features ) );
	}

	/**
	 * @param array $style Style group.
	 * @return array<string, mixed>
	 */
	private static function style_snapshot( array $style ) {
		$keys = array(
			'borderSize',
			'borderRadius',
			'borderColor',
			'shadowSize',
			'shadowColor',
		);

		$out = array();
		foreach ( $keys as $key ) {
			if ( array_key_exists( $key, $style ) ) {
				$out[ $key ] = $style[ $key ];
			}
		}

		return $out;
	}
}
