<?php
/**
 * Base class for Modula Upsell handlers
 *
 * Provides shared functionality for all upsell handler classes.
 *
 * @since 2.13.0
 */
abstract class Modula_Upsell_Base {

	/**
	 * Holds the extensions object
	 *
	 * @var Modula_Extensions_Base
	 */
	protected $extensions;

	/**
	 * The link for the Free vs PRO page
	 *
	 * @var string
	 */
	protected $free_vs_pro_link;

	/**
	 * Constructor
	 */
	public function __construct() {
		$this->extensions = class_exists( 'Modula_Pro\Extensions\Extensions' )
		? Modula_Pro\Extensions\Extensions::get_instance()
		: Modula_Extensions_Base::get_instance();

		$this->free_vs_pro_link = 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=link&utm_campaign=upsell&utm_term=lite-vs-pro';
	}

	/**
	 * Generate upsell box HTML
	 *
	 * @param string $title       The upsell title.
	 * @param string $description The upsell description.
	 * @param string $tab         The tab identifier.
	 * @param array  $features   Optional array of features to display.
	 * @return string The generated HTML.
	 */
	public function generate_upsell_box( $title, $description, $tab, $features = array() ) {
		$upsell_box = '<h2>' . esc_html( $title ) . '</h2>';

		if ( ! empty( $features ) ) {
			$upsell_box .= '<ul class="modula-upsell-features">';
			foreach ( $features as $feature ) {
				$upsell_box .= '<li>';
				if ( isset( $feature['tooltip'] ) && '' != $feature['tooltip'] ) {
					$upsell_box .= '<div class="modula-tooltip"><span>[?]</span>';
					$upsell_box .= '<div class="modula-tooltip-content">' . esc_html( $feature['tooltip'] ) . '</div>';
					$upsell_box .= '</div>';
					$upsell_box .= '<p>' . esc_html( $feature['feature'] ) . '</p>';
				} else {
					$upsell_box .= '<span class="modula-check dashicons dashicons-yes"></span>' . esc_html( $feature['feature'] );
				}

				$upsell_box .= '</li>';
			}
			$upsell_box .= '</ul>';
		}
		if ( $description ) {
			$upsell_box .= '<p class="modula-upsell-description">' . esc_html( $description ) . '</p>';
		}

		return $upsell_box;
	}

	/**
	 * Generate upsell config array for settings tabs
	 *
	 * @param string $label   The label for the upsell.
	 * @param string $desc    The description.
	 * @param array  $buttons Array of button configurations.
	 * @return array The upsell configuration array.
	 */
	protected function generate_upsell_config( $label = '', $desc = '', $buttons = array() ) {
		return array(
			'fields' => array(
				array(
					'type'    => 'upsell',
					'label'   => $label,
					'desc'    => $desc,
					'buttons' => $buttons,
				),
			),
		);
	}

	/**
	 * Get the Free vs Pro link
	 *
	 * @return string The Free vs Pro link URL.
	 */
	public function get_free_vs_pro_link() {
		return $this->free_vs_pro_link;
	}
}
