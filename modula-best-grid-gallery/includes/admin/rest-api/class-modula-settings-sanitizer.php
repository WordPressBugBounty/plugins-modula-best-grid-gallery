<?php

class Modula_Settings_Sanitizer {
	/**
	 * Holds the class object.
	 *
	 * @since 2.5.0
	 *
	 * @var object
	 */
	public static $instance;

	/**
	 * Get the instance of the class.
	 */
	public static function get_instance() {
		if ( ! isset( self::$instance ) || ! ( self::$instance instanceof Modula_Settings_Sanitizer ) ) {
			self::$instance = new Modula_Settings_Sanitizer();
		}

		return self::$instance;
	}

	public function text( $value ) {
		return sanitize_text_field( $value );
	}

	public function url( $value ) {
		return esc_url_raw( $value );
	}

	public function number( $value ) {
		return absint( $value );
	}

	public function bool( $value ) {
		return rest_sanitize_boolean( $value );
	}

	public function text_array( $value ) {
		return array_map( 'sanitize_text_field', $value );
	}

	public function number_array( $value ) {
		return array_map( 'absint', $value );
	}

	public function bool_array( $value ) {
		return array_map( 'rest_sanitize_boolean', $value );
	}

	public function url_array( $value ) {
		return array_map( 'esc_url_raw', $value );
	}

	/**
	 * Sanitize HTML content (email bodies, rich text settings).
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public function html( $value ) {
		return wp_kses_post( $value );
	}

	/**
	 * Sanitize full HTML email templates while preserving document structure.
	 *
	 * Unlike html()/wp_kses_post(), this keeps html/head/body/meta/title/style
	 * and common email-layout tags that kses_post would strip.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public function email_html( $value ) {
		if ( ! is_string( $value ) ) {
			return '';
		}

		$allowed = wp_kses_allowed_html( 'post' );

		$allowed['html']  = array(
			'xmlns' => true,
			'lang'  => true,
		);
		$allowed['head']  = array();
		$allowed['body']  = array(
			'class'   => true,
			'id'      => true,
			'style'   => true,
			'bgcolor' => true,
		);
		$allowed['meta']  = array(
			'charset'    => true,
			'name'       => true,
			'content'    => true,
			'http-equiv' => true,
		);
		$allowed['title'] = array();
		$allowed['style'] = array(
			'type'  => true,
			'media' => true,
		);
		$allowed['link']  = array(
			'href' => true,
			'rel'  => true,
			'type' => true,
		);

		foreach ( array( 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot' ) as $table_tag ) {
			if ( ! isset( $allowed[ $table_tag ] ) ) {
				$allowed[ $table_tag ] = array();
			}
			$allowed[ $table_tag ] = array_merge(
				$allowed[ $table_tag ],
				array(
					'align'       => true,
					'bgcolor'     => true,
					'border'      => true,
					'cellpadding' => true,
					'cellspacing' => true,
					'width'       => true,
					'height'      => true,
					'valign'      => true,
					'style'       => true,
					'class'       => true,
					'id'          => true,
				)
			);
		}

		$has_doctype = (bool) preg_match( '/^\s*<!DOCTYPE\s+html/i', $value );
		$sanitized   = wp_kses( $value, $allowed );

		if ( $has_doctype && ! preg_match( '/^\s*<!DOCTYPE\s+html/i', $sanitized ) ) {
			$sanitized = "<!DOCTYPE html>\n" . ltrim( $sanitized );
		}

		$sanitized = $this->strip_leading_empty_paragraphs( $sanitized );

		return $sanitized;
	}

	/**
	 * Remove empty paragraphs TinyMCE often inserts above the real content.
	 *
	 * @param string $html HTML content.
	 * @return string
	 */
	private function strip_leading_empty_paragraphs( $html ) {
		$pattern = '/(<body[^>]*>)(\s*<p>\s*(?:&nbsp;|\xc2\xa0|\s|<br\s*\/?>)*\s*<\/p>\s*)+/is';

		$stripped = preg_replace( $pattern, '$1', $html, 1 );

		return is_string( $stripped ) ? $stripped : $html;
	}

	/**
	 * Sanitize an email address.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public function email( $value ) {
		return sanitize_email( $value );
	}
}
