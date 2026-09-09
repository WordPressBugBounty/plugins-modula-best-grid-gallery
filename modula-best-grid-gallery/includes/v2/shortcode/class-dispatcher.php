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
			// Classic-first mix: another [modula] already ran the classic renderer this request.
			if ( class_exists( 'Modula_Shortcode', false ) && \Modula_Shortcode::classic_stack_has_rendered() ) {
				return self::mixed_stack_error_html();
			}
			return $this->visitor_gallery->render( $atts );
		}

		$classic = class_exists( 'Modula_Shortcode', false ) ? \Modula_Shortcode::get_instance() : null;
		if ( $classic ) {
			return $classic->gallery_shortcode_handler( $atts );
		}

		return '';
	}

	/**
	 * Visitor-visible error when a classic gallery already ran on this page.
	 *
	 * @return string
	 */
	public static function mixed_stack_error_html() {
		return '<div class="modula-beta-stack-conflict">' . esc_html__(
			'This gallery uses the new Modula experience and cannot display on a page that already has a classic Modula gallery. Use only new galleries or only classic galleries on this page.',
			'modula-best-grid-gallery'
		) . '</div>';
	}
}
