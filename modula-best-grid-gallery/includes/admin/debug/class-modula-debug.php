<?php


class Modula_Debug {

	/**
	 * Holds the class object.
	 *
	 * @since 2.5.0
	 *
	 * @var object
	 */
	public static $instance;

	/**
	 * Modula_Debug constructor.
	 *
	 * @since 2.5.0
	 */
	public function __construct() {
		// Add Modula's debug information.
		add_filter( 'debug_information', array( $this, 'modula_debug_information' ), 60, 1 );
	}



	/**
	 * Returns the singleton instance of the class.
	 *
	 * @return object The Modula_Debug object.
	 * @since 2.5.0
	 */
	public static function get_instance() {

		if ( ! isset( self::$instance ) && ! ( self::$instance instanceof Modula_Debug ) ) {
			self::$instance = new Modula_Debug();
		}

		return self::$instance;
	}

	/**
	 * Modula Debug Info
	 *
	 * @param $info
	 *
	 * @return mixed
	 * @since 2.5.0
	 */
	public function modula_debug_information( $info ) {

		$grid_type  = '';
		$lightboxes = '';
		$defaults   = apply_filters(
			'modula_troubleshooting_defaults',
			array(
				'enqueue_files' => false,
				'gridtypes'     => array(),
				'lightboxes'    => array(),
				'lazy_load'     => false,
			)
		);

		$troubleshoot_opt = get_option( 'modula_troubleshooting_option', array() );
		$troubleshoot_opt = wp_parse_args( $troubleshoot_opt, $defaults );

		foreach ( $troubleshoot_opt as $key => $option ) {
			$troubleshoot_opt[ $key ] = apply_filters( 'modula_troubleshooting_' . $key, $option );
		}

		if ( $troubleshoot_opt && isset( $troubleshoot_opt['gridtypes'] ) && ! empty( $troubleshoot_opt['gridtypes'] ) ) {
			foreach ( $troubleshoot_opt['gridtypes'] as $type ) {
				$grid_type .= '{' . $type . '}';
			}
		}

		if ( $troubleshoot_opt && isset( $troubleshoot_opt['lightboxes'] ) && ! empty( $troubleshoot_opt['lightboxes'] ) ) {
			foreach ( $troubleshoot_opt['lightboxes'] as $lightbox ) {
				$lightboxes .= '{' . $lightbox . '}';
			}
		}

		$info['modula'] = array(
			'label'  => __( 'Modula plugin', 'modula-best-grid-gallery' ),
			'fields' => apply_filters(
				'modula_debug_information',
				array(
					'core_version'             => array(
						'label' => __( 'Core Version', 'modula-best-grid-gallery' ),
						'value' => MODULA_LITE_VERSION,
						'debug' => 'Core version ' . MODULA_LITE_VERSION,
					),
					'requested_php'            => array(
						'label' => __( 'Minimum PHP', 'modula-best-grid-gallery' ),
						'value' => 5.6,
						'debug' => ( (float) 5.6 > (float) phpversion() ) ? 'PHP minimum version not met' : 'PHP minimum version met',
					),
					'requested_wp'             => array(
						'label' => __( 'Minimum WP', 'modula-best-grid-gallery' ),
						'value' => 5.2,
						'debug' => ( (float) get_bloginfo( 'version' ) < (float) 5.2 ) ? 'WordPress minimum version not met.Current version: ' . get_bloginfo( 'version' ) : 'Wordpress minimum version met. Current version: ' . get_bloginfo( 'version' ),
					),
					'galleries_number'         => array(
						'label' => __( 'Total galleries', 'modula-best-grid-gallery' ),
						'value' => count( Modula_Helper::get_galleries() ) - 1,
						'debug' => 'Total number of galleries: ' . ( count( Modula_Helper::get_galleries() ) - 1 ),
					),
					'enqueue_files'            => array(
						'label' => __( 'Enqueue Modula\'s assets everywhere', 'modula-best-grid-gallery' ),
						'value' => ( $troubleshoot_opt && isset( $troubleshoot_opt['enqueue_files'] ) ) ? __( 'Enabled', 'modula-best-grid-gallery' ) : __( 'Disabled', 'modula-best-grid-gallery' ),
						'debug' => ( $troubleshoot_opt && isset( $troubleshoot_opt['enqueue_files'] ) ) ? 'Enqueue files everywhere' : 'Enqueue files disabled',
					),
					'grid_type'                => array(
						'label' => __( 'General grid type enqueued', 'modula-best-grid-gallery' ),
						'value' => ( $troubleshoot_opt && isset( $troubleshoot_opt['gridtypes'] ) && isset( $troubleshoot_opt['enqueue_files'] ) && ! empty( $troubleshoot_opt['gridtypes'] ) ) ? __( 'Enabled', 'modula-best-grid-gallery' ) : __( 'Disabled', 'modula-best-grid-gallery' ),
						'debug' => ( $troubleshoot_opt && isset( $troubleshoot_opt['gridtypes'] ) && isset( $troubleshoot_opt['enqueue_files'] ) && ! empty( $troubleshoot_opt['gridtypes'] ) ) ? 'Enqueue files for: ' . $grid_type : 'No grid type selected',
					),
					'lightboxes'               => array(
						'label' => __( 'Lightboxes everywhere', 'modula-best-grid-gallery' ),
						'value' => ( $troubleshoot_opt && isset( $troubleshoot_opt['lightboxes'] ) && ! empty( $troubleshoot_opt['lightboxes'] ) ) ? __( 'Enabled', 'modula-best-grid-gallery' ) : __( 'Disabled', 'modula-best-grid-gallery' ),
						'debug' => ( $troubleshoot_opt && isset( $troubleshoot_opt['lightboxes'] ) && ! empty( $troubleshoot_opt['lightboxes'] ) ) ? 'Enqueue files for: ' . $lightboxes : 'No lightbox selected',
					),
					'modula_lazyload'          => array(
						'label' => __( 'Enable general lazyload', 'modula-best-grid-gallery' ),
						'value' => ( $troubleshoot_opt && isset( $troubleshoot_opt['lazy_load'] ) && boolval( $troubleshoot_opt['lazy_load'] ) ) ? __( 'Enabled', 'modula-best-grid-gallery' ) : __( 'Disabled', 'modula-best-grid-gallery' ),
						'debug' => ( $troubleshoot_opt && isset( $troubleshoot_opt['lazy_load'] ) && boolval( $troubleshoot_opt['lazy_load'] ) ) ? 'General lazyload enabled: ' : 'No general lazyload',
					),
					'modula_edit_gallery_link' => array(
						'label' => __( '"Edit gallery" link', 'modula-best-grid-gallery' ),
						'value' => ( $troubleshoot_opt && isset( $troubleshoot_opt['disable_edit'] ) && boolval( $troubleshoot_opt['disable_edit'] ) ) ? __( 'Disabled', 'modula-best-grid-gallery' ) : __( 'Enabled', 'modula-best-grid-gallery' ),
						'debug' => ( $troubleshoot_opt && isset( $troubleshoot_opt['disable_edit'] ) && boolval( $troubleshoot_opt['disable_edit'] ) ) ? 'Edit gallery link disabled: ' : 'Edit gallery link enabled',
					),
					'modula_disable_srcset'    => array(
						'label' => __( 'Disable images srcset', 'modula-best-grid-gallery' ),
						'value' => ( $troubleshoot_opt && isset( $troubleshoot_opt['disable_srcset'] ) && boolval( $troubleshoot_opt['disable_srcset'] ) ) ? __( 'Disabled', 'modula-best-grid-gallery' ) : __( 'Enabled', 'modula-best-grid-gallery' ),
						'debug' => ( $troubleshoot_opt && isset( $troubleshoot_opt['disable_srcset'] ) && boolval( $troubleshoot_opt['disable_srcset'] ) ) ? 'srcset is disabled: ' : 'srcset is enabled',
					),
				)
			),
		);

		return $info;
	}
}

Modula_Debug::get_instance();
