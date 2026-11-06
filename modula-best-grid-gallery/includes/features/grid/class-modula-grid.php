<?php
// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Modula_Grid {

	/**
	 * Holds the class object.
	 *
	 * @since 2.3.0
	 *
	 * @var object
	 */
	public static $instance;


	/**
	 * Primary class constructor.
	 *
	 * @since 2.3.0
	 */
	public function __construct() {

		// Add grid settings to js config
		add_filter( 'modula_gallery_settings', array( $this, 'js_grid_config' ), 10, 2 );

		// Action for adding grid sizer
		add_action( 'modula_shortcode_before_items', array( $this, 'modula_grid_sizer' ), 10, 4 );

		// Filter for $css
		add_filter( 'modula_shortcode_css', array( $this, 'generate_grid_css' ), 10, 3 );

		add_filter( 'modula_gallery_template_data', array( $this, 'template_data_config' ), 15, 1 );
	}

	/**
	 * Add params to gallery js_config
	 *
	 * @param $js_config
	 * @param $settings
	 *
	 * @return array
	 *
	 * @since 2.3.0
	 */
	public function js_grid_config( $js_config, $settings ) {
		if ( 'grid' === $settings['type'] ) {
			$js_new_config = array(
				'grid_type' => $settings['grid_type'],
				'rowHeight' => isset( $settings['grid_row_height'] ) ? absint( $settings['grid_row_height'] ) : 640,
				'lastRow'   => isset( $settings['grid_justify_last_row'] ) ? $settings['grid_justify_last_row'] : 'justify',
			);

			$js_config = wp_parse_args( $js_new_config, $js_config );
			if ( isset( $js_config['height'] ) ) {
				unset( $js_config['height'] );
			}
		}
		return $js_config;
	}


	/**
	 * Add grid-gallery class to modula-items container
	 *
	 * @param $template_data
	 *
	 * @return mixed
	 *
	 * @since 2.3.0
	 */
	public function template_data_config( $template_data ) {

		$settings = $template_data['settings'];

		if ( 'grid' === $settings['type'] ) {
			$template_data['items_container']['class'][] = 'grid-gallery';
		}

		return $template_data;
	}


	/**
	 * Model image attributes
	 *
	 * @param $image
	 * @param $settings
	 *
	 * @return mixed
	 *
	 * @since 2.3.0
	 */
	public function modula_grid_image_data( $image, $settings ) {

		$grid_size = Modula_Helper::get_image_sizes( false, $settings['grid_image_size'] );

		// check if selected image size is defined
		if ( $grid_size ) {
			$image['width']  = $grid_size['width'];
			$image['height'] = $grid_size['height'];
		} elseif ( 'default' === $settings['grid_image_size'] ) {
				$image['width']  = $settings['grid_image_dimensions']['width'];
				$image['height'] = $settings['grid_image_dimensions']['height'];
		} else {
			$image['width']  = 0;
			$image['height'] = 0;
		}

		return $image;
	}

	/**
	 * Grid sizer for columns
	 *
	 * @param array  $settings        Gallery settings.
	 * @param mixed  $item_data       Unused.
	 * @param array  $images          Unused.
	 * @param string $display_context 'beta' when the v2 shortcode prints the hook.
	 *
	 * @return mixed
	 *
	 * @since 2.3.0
	 */
	public function modula_grid_sizer( $settings, $item_data = null, $images = array(), $display_context = 'classic' ) {
		// The sizer serves the classic column script; Beta lays its columns out in React.
		if ( 'beta' === $display_context ) {
			return;
		}

		if ( 'grid' === $settings['type'] && 'automatic' !== $settings['grid_type'] ) {
			echo '<div class="modula-grid-sizer"> </div>';
		}
	}

	/**
	 * Generate Grid Css
	 *
	 * @param $css
	 * @param $gallery_id
	 * @param $settings
	 *
	 * @return string
	 *
	 * @since  2.3.0
	 */
	public function generate_grid_css( $css, $gallery_id, $settings ) {

		if ( 'grid' !== $settings['type'] || 'automatic' === $settings['grid_type'] ) {
			return $css;
		}

		$columns = absint( $settings['grid_type'] );

		$css .= "#{$gallery_id}.modula-gallery .modula-item, #{$gallery_id}.modula-gallery .modula-grid-sizer { width: calc(" . $this->column_width( $columns, $settings['gutter'] ) . ') ; } ';

		// Make the modula-item and grid-sizer width
		if ( 1 === (int) $settings['enable_responsive'] ) {
			$tablet_columns = $this->breakpoint_columns( $settings, 'tablet_columns' );
			$mobile_columns = $this->breakpoint_columns( $settings, 'mobile_columns' );
		} else {
			$tablet_columns = $columns;
			$mobile_columns = $columns;
		}

		if ( $tablet_columns > 0 ) {
			$css .= "@media (min-width: 768px) and (max-width:992px) { html body #{$gallery_id}.modula-gallery .modula-item, html body  #{$gallery_id}.modula-gallery .modula-grid-sizer {width: calc(" . esc_attr( $this->column_width( $tablet_columns, $settings['tablet_gutter'] ) ) . ' ) ; } }';
		}

		if ( $mobile_columns > 0 ) {
			$css .= "@media (max-width: 768px) { html body #{$gallery_id}.modula-gallery .modula-item, html body  #{$gallery_id}.modula-gallery .modula-grid-sizer {width: calc(" . esc_attr( $this->column_width( $mobile_columns, $settings['mobile_gutter'] ) ) . ' ) ; } }';
		}

		$css .= "#{$gallery_id} .modula-items{position:relative;}";

		return $css;
	}

	/**
	 * Width of one grid column as a calc() body, e.g. "50% - 5px".
	 *
	 * @param int   $columns Column count, greater than zero.
	 * @param mixed $gutter  Gutter in px.
	 *
	 * @return string
	 */
	private function column_width( $columns, $gutter ) {
		$gutter = absint( $gutter );

		return 100 / $columns . '% - ' . ( $gutter - $gutter / $columns ) . 'px';
	}

	/**
	 * Tablet or mobile column count of a custom-responsive grid.
	 *
	 * Classic galleries saved without `modula-settings` (or with a zero or
	 * non-numeric count) lack a usable value, and get_defaults() has none for
	 * these keys, so the classic field's default stands in.
	 *
	 * @param array  $settings Gallery settings.
	 * @param string $key      'tablet_columns' or 'mobile_columns'.
	 *
	 * @return int Column count, or 0 when neither the setting nor the field default is usable.
	 */
	private function breakpoint_columns( $settings, $key ) {
		$columns = isset( $settings[ $key ] ) ? absint( $settings[ $key ] ) : 0;
		if ( $columns > 0 ) {
			return $columns;
		}

		$fields = Modula_CPT_Fields_Helper::get_fields( 'responsive' );

		return isset( $fields[ $key ]['default'] ) ? absint( $fields[ $key ]['default'] ) : 0;
	}

	/**
	 * Returns the singleton instance of the class.
	 *
	 * @return object The Modula_Grid object.
	 *
	 * @since 2.3.0
	 */
	public static function get_instance() {

		if ( ! isset( self::$instance ) && ! ( self::$instance instanceof Modula_Grid ) ) {
			self::$instance = new Modula_Grid();
		}

		return self::$instance;
	}
}

$modula_grid = Modula_Grid::get_instance();
