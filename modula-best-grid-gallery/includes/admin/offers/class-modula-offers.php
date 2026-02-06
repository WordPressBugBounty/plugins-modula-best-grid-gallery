<?php

/**
 * Handles seasonal Modula offer hooks and styling.
 *
 * @since 2.7.9
 */
class Modula_Offers {

	/**
	 * Register offer-related hooks based on current date window.
	 *
	 * @return void
	 */
	public function register() {
		$timezone = $this->get_timezone();
		$now      = new DateTime( 'now', $timezone );

		$windows = $this->get_windows( $timezone );

		if ( $this->is_active( $now, $windows['bf'] ) ) {
			add_filter( 'modula_upsell_buttons', array( $this, 'bf_buttons' ), 15, 2 );
			add_action( 'admin_print_styles', array( $this, 'footer_bf_styles' ), 999 );
		}

		if ( $this->is_active( $now, $windows['cym'] ) ) {
			add_filter( 'modula_upsell_buttons', array( $this, 'cyber_m_buttons' ), 15, 2 );
			add_action( 'admin_print_styles', array( $this, 'footer_cyber_m_styles' ), 999 );
		}
	}

	/**
	 * Determine timezone from WordPress settings, defaulting to UTC.
	 *
	 * @return DateTimeZone
	 */
	private function get_timezone() {
		$timezone_string = get_option( 'timezone_string' );

		return $timezone_string ? new DateTimeZone( $timezone_string ) : new DateTimeZone( 'UTC' );
	}

	/**
	 * Offer windows keyed by campaign.
	 *
	 * @param DateTimeZone $timezone DateTimeZone instance.
	 *
	 * @return array
	 */
	private function get_windows( DateTimeZone $timezone ) {
		return array(
			'bf'  => array(
				'start' => new DateTime( '2025-11-03 00:00:00', $timezone ),
				'end'   => new DateTime( '2025-12-03 10:00:00', $timezone ),
			),
			'cym' => array(
				'start' => new DateTime( '2024-12-09 10:01:00', $timezone ),
				'end'   => new DateTime( '2024-12-13 16:00:00', $timezone ),
			),
		);
	}

	/**
	 * Check if a window is active.
	 *
	 * @param DateTime $now    Current time.
	 * @param array    $window Array with start/end DateTime.
	 *
	 * @return bool
	 */
	private function is_active( DateTime $now, $window ) {
		return $now >= $window['start'] && $now <= $window['end'];
	}

	/**
	 * Replaces upsells button with Black Friday text buttons.
	 *
	 * @since 2.7.9
	 *
	 * @param string $buttons Current buttons markup.
	 *
	 * @return string
	 */
	public function bf_buttons( $buttons ) {
		preg_match_all( '~<a(.*?)href="([^"]+)"(.*?)>~', $buttons, $matches );

		$buttons  = '<a target="_blank" href="' . esc_url( $matches[2][0] ) . '" class="button">' . esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ) . '</a>';
		$buttons .= '<a target="_blank" href="' . esc_url( $matches[2][1] ) . '" style="margin-top:10px;" class="wpchill-bf-upsell button">' . esc_html__( '65% OFF for Black Friday', 'modula-best-grid-gallery' ) . '</a>';
		return $buttons;
	}

	/**
	 * Replaces upsells button with Christmas text buttons.
	 *
	 * @since 2.7.9
	 *
	 * @param string $buttons Current buttons markup.
	 *
	 * @return string
	 */
	public function xmas_buttons( $buttons ) {
		preg_match_all( '~<a(.*?)href="([^"]+)"(.*?)>~', $buttons, $matches );

		$buttons  = '<a target="_blank" href="' . esc_url( $matches[2][0] ) . '" class="button">' . esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ) . '</a>';
		$buttons .= '<a target="_blank" href="' . esc_url( $matches[2][1] ) . '" style="margin-top:10px;" class="wpchill-xmas-upsell button">' . esc_html__( '25% OFF for Christmas', 'modula-best-grid-gallery' ) . '</a>';
		return $buttons;
	}

	/**
	 * Replaces upsells button with Cyber Monday text buttons.
	 *
	 * @since 2.11.6
	 *
	 * @param string $buttons Current buttons markup.
	 *
	 * @return string
	 */
	public function cyber_m_buttons( $buttons ) {
		preg_match_all( '~<a(.*?)href="([^"]+)"(.*?)>~', $buttons, $matches );

		$buttons  = '<a target="_blank" href="' . esc_url( $matches[2][0] ) . '" class="button">' . esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ) . '</a>';
		$buttons .= '<a target="_blank" href="' . esc_url( $matches[2][1] ) . '" style="margin-top:10px;" class="wpchill-cyber-m-upsell button">' . esc_html__( '25% OFF for Cyber Monday', 'modula-best-grid-gallery' ) . '</a>';
		return $buttons;
	}

	/**
	 * Echoes Black Friday script to footer.
	 *
	 * @since 2.7.9
	 *
	 * @return void
	 */
	public function footer_bf_styles() {

		$css = '<style>
		.modula-upsell,
		#poststuff .modula-upsell h2,
		.modula-modal__overlay .modula-modal__frame,
		.modula-settings-tab-upsell {
			color: #fff;
			background-color: #000;
		}
		.modula-upsell p,
		.modula-upsell p.modula-upsell-description,
		.modula-modal__overlay .modula-modal__frame h2,
		.modula-settings-tab-upsell h3,
		.modula-settings-tab-upsell p {
			color: #fff;
		}
		.wpchill-bf-upsell.button {
			background-color: #f8003e;
			border: none;
			color: #fff;
			font-weight: 600;
		}
		.wpchill-bf-upsell.button:hover {
			background-color: red;
			border: none;
			color: #fff;
			font-weight: 600;
		}
		.modula-tooltip .modula-tooltip-content{
			background-color: #fff;
			color: #000;
		}
		.modula-settings-tab-upsell{
			margin-top: 10px;
		}
		</style>';
		echo $css;
	}

	/**
	 * Echoes Cyber Monday script to footer.
	 *
	 * @since 2.11.6
	 *
	 * @return void
	 */
	public function footer_cyber_m_styles() {

		$css = '<style>
		.modula-upsell,
		#poststuff .modula-upsell h2,
		.modula-modal__overlay .modula-modal__frame,
		.modula-settings-tab-upsell {
			color: #fff;
			background-color: #000;
		}
		.modula-upsell p,
		.modula-upsell p.modula-upsell-description,
		.modula-modal__overlay .modula-modal__frame h2,
		.modula-settings-tab-upsell h3,
		.modula-settings-tab-upsell p {
			color: #fff;
		}
		.wpchill-cyber-m-upsell.button {
			background-color: #2271b1;
			border: none;
			color: #fff;
			font-weight: 600;
		}
		.wpchill-cyber-m-upsell.button:hover {
			background-color: red;
			border: none;
			color: #fff;
			font-weight: 600;
		}
		.modula-tooltip .modula-tooltip-content{
			background-color: #fff;
			color: #000;
		}
		.modula-settings-tab-upsell{
			margin-top: 10px;
		}
		</style>';
		echo $css;
	}

	/**
	 * Echoes Christmas style to footer.
	 *
	 * @since 2.7.9
	 *
	 * @return void
	 */
	public function footer_xmas_styles() {

		$css = '<style>
		.modula-upsell::before,
		.modula-settings-tab-upsell::before,
		.modula-modal__overlay .modula-modal__frame::before{
			content: "";
			position: absolute;
			width: 100%;
			height: 50px;
			background-image: url(' . MODULA_URL . 'assets/images/upsells/x-mas.jpg' . ');
			background-position-x: 15px;
			left: 0;
			top: 0;
			background-size: contain;
			z-index: 0;
		}

		.wpchill-xmas-upsell.button {
			background-color: #f8003e;
			border: none;
			color: #fff;
			font-weight: 600;
		}
		.wpchill-xmas-upsell.button:hover {
			background-color: red;
			border: none;
			color: #fff;
			font-weight: 600;
		}
		.modula-settings-tab-upsell,
		.modula-upsell{
			position: relative;
			padding-top: 50px;
		}
		.modula-settings-tab-upsell{
			margin-top: 10px;
		}
		.modula-upsell{
			background-color: #fff;
		}
		#modula-settings .modula-upsell{
			padding-top: 70px;
		}

		</style>';
		echo $css;
	}
}
