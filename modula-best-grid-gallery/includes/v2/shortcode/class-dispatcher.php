<?php
/**
 * [modula] dispatcher: Beta gallery → visitor gallery; otherwise classic shortcode.
 *
 * @package Modula
 */

namespace Modula\V2\Shortcode;

defined( 'ABSPATH' ) || exit;

/**
 * Class Dispatcher
 */
class Dispatcher {

	/**
	 * Visitor gallery renderer for a Beta gallery; does not register the shortcode tag.
	 *
	 * @var Shortcode
	 */
	private $visitor_gallery;

	/**
	 * Register [modula] / [Modula].
	 */
	public function __construct() {
		$this->visitor_gallery = new Shortcode( false );

		add_shortcode( 'modula', array( $this, 'render' ) );
		add_shortcode( 'Modula', array( $this, 'render' ) );

		// Early enqueue so page caches / builders that print head before shortcode still get assets.
		add_action( 'wp_enqueue_scripts', array( $this, 'maybe_enqueue_visitor_assets_early' ), 20 );
	}

	/**
	 * Enqueue modern visitor assets when the singular content embeds a Beta gallery,
	 * or when viewing a Beta gallery singular.
	 *
	 * @return void
	 */
	public function maybe_enqueue_visitor_assets_early() {
		if ( ! is_singular() ) {
			return;
		}

		$post = get_queried_object();
		if ( ! $post instanceof \WP_Post ) {
			return;
		}

		if ( 'modula-gallery' === $post->post_type && \Modula\V2\Beta_Settings::is_beta_gallery( (int) $post->ID ) ) {
			\Modula\V2\Modern_Gallery::enqueue_visitor_renderer_assets( array(), array(), false );
			return;
		}

		$content = (string) $post->post_content;
		if ( '' === $content ) {
			return;
		}

		if ( ! has_shortcode( $content, 'modula' ) && ! has_shortcode( $content, 'Modula' ) ) {
			return;
		}

		$pattern = get_shortcode_regex( array( 'modula', 'Modula' ) );
		if ( ! preg_match_all( '/' . $pattern . '/s', $content, $matches ) ) {
			return;
		}

		foreach ( $matches[3] as $atts_string ) {
			$atts = shortcode_parse_atts( $atts_string );
			if ( empty( $atts['id'] ) ) {
				continue;
			}
			if ( \Modula\V2\Beta_Settings::is_beta_gallery( absint( $atts['id'] ) ) ) {
				\Modula\V2\Modern_Gallery::enqueue_visitor_renderer_assets( array(), array(), false );
				return;
			}
		}
	}

	/**
	 * Route by Beta gallery identifier.
	 *
	 * @param array<string, mixed>|string $atts Shortcode attributes.
	 * @return string
	 */
	public function render( $atts ) {
		$atts = shortcode_atts(
			array(
				'id'    => 0,
				'align' => '',
			),
			(array) $atts,
			'modula'
		);

		$gallery_id = absint( $atts['id'] );
		if ( $gallery_id && \Modula\V2\Beta_Settings::is_beta_gallery( $gallery_id ) ) {
			return $this->visitor_gallery->render( $atts );
		}

		$classic = class_exists( 'Modula_Shortcode', false ) ? \Modula_Shortcode::get_instance() : null;
		if ( $classic ) {
			return $classic->gallery_shortcode_handler( $atts );
		}

		return '';
	}
}
