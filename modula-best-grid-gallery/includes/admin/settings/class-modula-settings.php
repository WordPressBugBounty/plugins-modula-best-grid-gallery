<?php

/**
 * Modula Settings Class
 *
 * Handles the configuration and structure of all Modula settings tabs and fields.
 * Provides a centralized way to define settings fields with proper sanitization schemas.
 *
 * @since 2.11.0
 */
class Modula_Settings {

	// =============================================================================
	// Constants
	// =============================================================================

	/**
	 * Option names
	 */
	const OPTION_STANDALONE      = 'modula_standalone';
	const OPTION_COMPRESSION     = 'modula_speedup';
	const OPTION_WATERMARK       = 'modula_watermark';
	const OPTION_IMAGE_LICENSING = 'modula_image_licensing_option';
	const OPTION_ROLES           = 'modula_roles';
	const OPTION_VIMEO_CREDS     = 'modula_video_vimeo_creds';
	const OPTION_SHORTCODES      = 'mas_gallery_link';
	const OPTION_MODULA_AI       = 'use_modula_ai';
	const OPTION_SETTINGS        = 'modula_settings';

	/**
	 * Field types
	 */
	const FIELD_TYPE_TOGGLE            = 'toggle';
	const FIELD_TYPE_OPTIONS_TOGGLE    = 'options_toggle';
	const FIELD_TYPE_TEXT              = 'text';
	const FIELD_TYPE_SELECT            = 'select';
	const FIELD_TYPE_COMBO             = 'combo';
	const FIELD_TYPE_NUMBER            = 'number';
	const FIELD_TYPE_IMAGE_SELECT      = 'image_select';
	const FIELD_TYPE_RANGE_SELECT      = 'range_select';
	const FIELD_TYPE_PARAGRAPH         = 'paragraph';
	const FIELD_TYPE_OAUTH             = 'oauth';
	const FIELD_TYPE_CREDENTIALS_GROUP = 'credentials_group';
	const FIELD_TYPE_IA_RADIO          = 'ia_radio';
	const FIELD_TYPE_MODULA_AI         = 'modula_ai';
	const FIELD_TYPE_ROLE              = 'role';

	/**
	 * Default values
	 */
	const DEFAULT_GALLERY_SLUG         = 'modula-gallery';
	const DEFAULT_ALBUM_SLUG           = 'modula-album';
	const DEFAULT_ENABLED              = 'enabled';
	const DEFAULT_DISABLED             = 'disabled';
	const DEFAULT_WATERMARK_POSITION   = 'bottom_right';
	const DEFAULT_WATERMARK_MARGIN     = 10;
	const DEFAULT_COMPRESSION_TYPE     = 'lossy';
	const DEFAULT_LIGHTBOX_COMPRESSION = 'lossless';

	// =============================================================================
	// Properties
	// =============================================================================

	/**
	 * Instance of the class
	 *
	 * @var Modula_Settings
	 */
	public static $instance = null;

	// =============================================================================
	// Singleton Pattern
	// =============================================================================

	/**
	 * Create an instance of the class
	 *
	 * @return Modula_Settings
	 *
	 * @since 2.11.0
	 */
	public static function get_instance() {
		if ( ! isset( self::$instance ) && ! ( self::$instance instanceof Modula_Settings ) ) {
			self::$instance = new Modula_Settings();
		}

		return self::$instance;
	}

	/**
	 * Constructor
	 *
	 * @since 2.11.0
	 */
	public function __construct() {
		add_action( 'modula_settings_api_update_modula_roles', array( $this, 'set_capabilities' ) );
	}

	// =============================================================================
	// Public API Methods
	// =============================================================================

	/**
	 * Get all Modula settings
	 *
	 * @return array Settings array
	 *
	 * @since 2.11.0
	 */
	public static function get_settings() {
		return get_option( self::OPTION_SETTINGS, array() );
	}

	// =============================================================================
	// Helper Methods - Option Value Retrieval
	// =============================================================================

	/**
	 * Get option value with safe default handling
	 *
	 * @param string $option_name Option name to retrieve.
	 * @param string $key_path    Dot-notation path to nested value (e.g., 'gallery.slug').
	 * @param mixed  $default     Default value if not found.
	 *
	 * @return mixed Option value or default
	 *
	 * @since 2.11.0
	 */
	private function get_option_value( $option_name, $key_path = null, $default = null ) {
		$option = get_option( $option_name, array() );

		if ( null === $key_path ) {
			return $option;
		}

		return $this->get_nested_option_value( $option, $key_path, $default );
	}

	/**
	 * Get nested option value using dot-notation path
	 *
	 * @param array  $data    Data array to search.
	 * @param string $path    Dot-notation path (e.g., 'gallery.slug').
	 * @param mixed  $default Default value if not found.
	 *
	 * @return mixed Value or default
	 *
	 * @since 2.11.0
	 */
	private function get_nested_option_value( $data, $path, $default = null ) {
		if ( ! is_array( $data ) || empty( $path ) ) {
			return $default;
		}

		$parts = explode( '.', $path );
		$value = $data;

		foreach ( $parts as $part ) {
			if ( ! isset( $value[ $part ] ) ) {
				return $default;
			}
			$value = $value[ $part ];
		}

		return $value;
	}

	// =============================================================================
	// Helper Methods - Field Builders
	// =============================================================================

	/**
	 * Build a generic field definition
	 *
	 * @param string $type Field type.
	 * @param string $name Field name.
	 * @param array  $args Field arguments.
	 *
	 * @return array Field definition array
	 *
	 * @since 2.11.0
	 */
	private function build_field( $type, $name, $args = array() ) {
		$field = array_merge(
			array(
				'type' => $type,
				'name' => $name,
			),
			$args
		);

		return $field;
	}

	/**
	 * Build a toggle field
	 *
	 * @param string $name    Field name.
	 * @param string $label   Field label.
	 * @param mixed  $default Default value.
	 * @param array  $args    Additional field arguments.
	 *
	 * @return array Field definition array
	 *
	 * @since 2.11.0
	 */
	private function build_toggle_field( $name, $label, $default, $args = array() ) {
		return $this->build_field(
			self::FIELD_TYPE_TOGGLE,
			$name,
			array_merge(
				array(
					'label'        => $label,
					'default'      => $default,
					'sanitization' => array( 'bool' ),
				),
				$args
			)
		);
	}

	/**
	 * Build an options toggle field
	 *
	 * @param string $name        Field name.
	 * @param string $label       Field label.
	 * @param mixed  $default     Default value.
	 * @param string $true_value  Value when enabled.
	 * @param string $false_value Value when disabled.
	 * @param array  $args        Additional field arguments.
	 *
	 * @return array Field definition array
	 *
	 * @since 2.11.0
	 */
	private function build_options_toggle_field( $name, $label, $default, $true_value = null, $false_value = null, $args = array() ) {
		if ( null === $true_value ) {
			$true_value = self::DEFAULT_ENABLED;
		}
		if ( null === $false_value ) {
			$false_value = self::DEFAULT_DISABLED;
		}

		return $this->build_field(
			self::FIELD_TYPE_OPTIONS_TOGGLE,
			$name,
			array_merge(
				array(
					'label'        => $label,
					'default'      => $default,
					'trueValue'    => $true_value,
					'falseValue'   => $false_value,
					'sanitization' => array(
						'enum' => array( $true_value, $false_value ),
					),
				),
				$args
			)
		);
	}

	/**
	 * Build a text field
	 *
	 * @param string $name    Field name.
	 * @param string $label   Field label.
	 * @param mixed  $default Default value.
	 * @param array  $args    Additional field arguments.
	 *
	 * @return array Field definition array
	 *
	 * @since 2.11.0
	 */
	private function build_text_field( $name, $label, $default, $args = array() ) {
		return $this->build_field(
			self::FIELD_TYPE_TEXT,
			$name,
			array_merge(
				array(
					'label'        => $label,
					'default'      => $default,
					'sanitization' => array( 'text' ),
				),
				$args
			)
		);
	}

	/**
	 * Build a select field
	 *
	 * @param string $name    Field name.
	 * @param string $label   Field label.
	 * @param array  $options Select options array.
	 * @param mixed  $default Default value.
	 * @param array  $args    Additional field arguments.
	 *
	 * @return array Field definition array
	 *
	 * @since 2.11.0
	 */
	private function build_select_field( $name, $label, $options, $default, $args = array() ) {
		$sanitization = array();
		if ( ! empty( $options ) && is_array( $options ) ) {
			if ( isset( $options[0]['value'] ) ) {
				// Options are in format array( array( 'value' => ..., 'label' => ... ) ).
				$sanitization = array( 'enum' => array_column( $options, 'value' ) );
			} else {
				// Options are simple key-value pairs.
				$sanitization = array( 'enum' => array_keys( $options ) );
			}
		}

		return $this->build_field(
			self::FIELD_TYPE_SELECT,
			$name,
			array_merge(
				array(
					'label'        => $label,
					'options'      => $options,
					'default'      => $default,
					'sanitization' => $sanitization,
				),
				$args
			)
		);
	}

	/**
	 * Build a combo field (group of fields)
	 *
	 * @param array $fields Array of field definitions.
	 * @param array $args   Additional field arguments.
	 *
	 * @return array Field definition array
	 *
	 * @since 2.11.0
	 */
	private function build_combo_field( $fields, $args = array() ) {
		return $this->build_field(
			self::FIELD_TYPE_COMBO,
			'',
			array_merge(
				array(
					'fields' => $fields,
				),
				$args
			)
		);
	}

	/**
	 * Build a number field
	 *
	 * @param string $name    Field name.
	 * @param string $label   Field label.
	 * @param mixed  $default Default value.
	 * @param array  $args    Additional field arguments.
	 *
	 * @return array Field definition array
	 *
	 * @since 2.11.0
	 */
	private function build_number_field( $name, $label, $default, $args = array() ) {
		return $this->build_field(
			self::FIELD_TYPE_NUMBER,
			$name,
			array_merge(
				array(
					'label'        => $label,
					'default'      => $default,
					'sanitization' => array( 'number' ),
				),
				$args
			)
		);
	}

	/**
	 * Build a paragraph field
	 *
	 * @param string $name        Field name.
	 * @param string $label       Field label.
	 * @param string $description Description text.
	 * @param array  $args        Additional field arguments.
	 *
	 * @return array Field definition array
	 *
	 * @since 2.11.0
	 */
	private function build_paragraph_field( $name, $label, $description, $args = array() ) {
		return $this->build_field(
			self::FIELD_TYPE_PARAGRAPH,
			$name,
			array_merge(
				array(
					'label'       => $label,
					'description' => $description,
				),
				$args
			)
		);
	}

	// =============================================================================
	// Helper Methods - Data Arrays
	// =============================================================================

	/**
	 * Get compression type options
	 *
	 * @return array Compression options array
	 *
	 * @since 2.11.0
	 */
	private function get_compression_options() {
		return array(
			array(
				'label' => esc_html__( 'Lossless Compresion', 'modula-best-grid-gallery' ),
				'value' => 'lossless',
			),
			array(
				'label' => esc_html__( 'Lossy Compresion', 'modula-best-grid-gallery' ),
				'value' => 'lossy',
			),
			array(
				'label' => esc_html__( 'Glossy Compresion', 'modula-best-grid-gallery' ),
				'value' => 'glossy',
			),
			array(
				'label' => esc_html__( 'Disable Compresion', 'modula-best-grid-gallery' ),
				'value' => 'disabled',
			),
		);
	}

	/**
	 * Get watermark position options
	 *
	 * @return array Watermark position options array
	 *
	 * @since 2.11.0
	 */
	private function get_watermark_positions() {
		return array(
			array(
				'label' => esc_html__( 'Top left', 'modula-best-grid-gallery' ),
				'value' => 'top_left',
			),
			array(
				'label' => esc_html__( 'Top right', 'modula-best-grid-gallery' ),
				'value' => 'top_right',
			),
			array(
				'label' => esc_html__( 'Bottom right', 'modula-best-grid-gallery' ),
				'value' => 'bottom_right',
			),
			array(
				'label' => esc_html__( 'Bottom left', 'modula-best-grid-gallery' ),
				'value' => 'bottom_left',
			),
			array(
				'label' => esc_html__( 'Center', 'modula-best-grid-gallery' ),
				'value' => 'center',
			),
		);
	}

	// =============================================================================
	// Public Methods - Tabs Configuration
	// =============================================================================

	/**
	 * Get all settings tabs configuration
	 *
	 * @return array Tabs array with subtabs
	 *
	 * @since 2.11.0
	 */
	public function get_tabs() {
		$subtabs = array(
			'standalone'      => array(
				'label'  => esc_html__( 'Standalone', 'modula-best-grid-gallery' ),
				'badge'  => 'PRO',
				'locked' => true,
				'config' => apply_filters( 'modula_standalone_settings_tab', $this->get_standalone() ),
			),
			'compression'     => array(
				'label'  => esc_html__( 'Performance', 'modula-best-grid-gallery' ),
				'badge'  => 'PRO',
				'locked' => true,
				'config' => apply_filters( 'modula_compression_settings_tab', $this->get_compression() ),
			),
			'shortcodes'      => array(
				'label'  => esc_html__( 'Advanced Shortcodes', 'modula-best-grid-gallery' ),
				'badge'  => 'PRO',
				'locked' => true,
				'config' => apply_filters( 'modula_shortcodes_settings_tab', $this->get_shortcodes() ),
			),
			'watermark'       => array(
				'label'  => esc_html__( 'Watermark', 'modula-best-grid-gallery' ),
				'badge'  => 'PRO',
				'locked' => true,
				'config' => apply_filters( 'modula_watermark_settings_tab', $this->get_watermark() ),
			),
			'image_licensing' => array(
				'label'  => esc_html__( 'Image Licensing', 'modula-best-grid-gallery' ),
				'locked' => false,
				'config' => apply_filters( 'modula_image_licensing_settings_tab', $this->get_image_licensing() ),
			),
			'roles'           => array(
				'label'  => esc_html__( 'Roles', 'modula-best-grid-gallery' ),
				'badge'  => 'PRO',
				'locked' => true,
				'config' => apply_filters( 'modula_roles_settings_tab', $this->get_roles() ),
			),
			'social_media'    => array(
				'label'  => esc_html__( 'Social Media Accounts', 'modula-best-grid-gallery' ),
				'badge'  => '',
				'locked' => false,
				'config' => apply_filters( 'modula_social_media_settings_tab', $this->get_social_media() ),
			),
			'modula_ai'       => array(
				'label'  => esc_html__( 'Modula AI', 'modula-best-grid-gallery' ),
				'locked' => false,
				'config' => apply_filters( 'modula_ai_settings_tab', $this->get_modula_ai() ),
			),
		);

		$subtabs = apply_filters( 'modula_admin_page_subtabs', $subtabs );

		$tabs = array(
			array(
				'label'   => esc_html__( 'Display', 'modula-best-grid-gallery' ),
				'slug'    => 'display',
				'subtabs' => array(
					'standalone'      => $subtabs['standalone'],
					'shortcodes'      => $subtabs['shortcodes'],
					'image_licensing' => $subtabs['image_licensing'],
				),
			),
			array(
				'label'   => esc_html__( 'Optimization', 'modula-best-grid-gallery' ),
				'slug'    => 'optimization',
				'subtabs' => array(
					'compression' => $subtabs['compression'],
					'imageseo'    => $subtabs['modula_ai'],
				),
			),
			array(
				'label'   => esc_html__( 'Protection', 'modula-best-grid-gallery' ),
				'slug'    => 'protection',
				'subtabs' => array(
					'watermark' => $subtabs['watermark'],
					'roles'     => $subtabs['roles'],
				),
			),
			array(
				'label'   => esc_html__( 'Social Media', 'modula-best-grid-gallery' ),
				'slug'    => 'social_media',
				'subtabs' => array(
					'social_media' => $subtabs['social_media'],
				),
			),
		);

		return apply_filters( 'modula_admin_page_main_tabs', $tabs );
	}

	// =============================================================================
	// Private Methods - Settings Tab Builders
	// =============================================================================

	/**
	 * Get standalone settings configuration
	 *
	 * @return array Standalone settings configuration
	 *
	 * @since 2.11.0
	 */
	private function get_standalone() {
		$standalone = $this->get_option_value( self::OPTION_STANDALONE );

		return array(
			'option' => self::OPTION_STANDALONE,
			'fields' => array(
				$this->build_gallery_standalone_fields( $standalone ),
				$this->build_album_standalone_fields( $standalone ),
			),
		);
	}

	/**
	 * Build gallery standalone fields
	 *
	 * @param array $standalone Standalone option data.
	 *
	 * @return array Combo field with gallery standalone fields
	 *
	 * @since 2.11.0
	 */
	private function build_gallery_standalone_fields( $standalone ) {
		$enable_default = $this->get_nested_option_value( $standalone, 'gallery.enable_rewrite', self::DEFAULT_DISABLED );
		$slug_default   = $this->get_nested_option_value( $standalone, 'gallery.slug', self::DEFAULT_GALLERY_SLUG );

		return $this->build_combo_field(
			array(
				$this->build_options_toggle_field(
					'gallery.enable_rewrite',
					esc_html__( 'Enable for Galleries', 'modula-best-grid-gallery' ),
					$enable_default,
					self::DEFAULT_ENABLED,
					self::DEFAULT_DISABLED,
					array( 'size' => 'small' )
				),
				$this->build_text_field(
					'gallery.slug',
					esc_html__( 'Gallery Slug', 'modula-best-grid-gallery' ),
					$slug_default,
					array(
						'size'       => 'small',
						'conditions' => array(
							array(
								'field'      => 'gallery.enable_rewrite',
								'comparison' => '===',
								'value'      => self::DEFAULT_ENABLED,
							),
						),
					)
				),
				$this->build_paragraph_field(
					'gallery.enable_rewrite_description',
					esc_html__( 'INFO', 'modula-best-grid-gallery' ),
					esc_html__( 'This option allows you to access galleries created through the post type with unique URLs. Now your galleries can have dedicated gallery pages.', 'modula-best-grid-gallery' ),
					array( 'size' => 'large' )
				),
			)
		);
	}

	/**
	 * Build album standalone fields
	 *
	 * @param array $standalone Standalone option data.
	 *
	 * @return array Combo field with album standalone fields
	 *
	 * @since 2.11.0
	 */
	private function build_album_standalone_fields( $standalone ) {
		$enable_default = $this->get_nested_option_value( $standalone, 'album.enable_rewrite', self::DEFAULT_DISABLED );
		$slug_default   = $this->get_nested_option_value( $standalone, 'album.slug', self::DEFAULT_ALBUM_SLUG );

		return $this->build_combo_field(
			array(
				$this->build_options_toggle_field(
					'album.enable_rewrite',
					esc_html__( 'Enable for Albums', 'modula-best-grid-gallery' ),
					$enable_default,
					self::DEFAULT_ENABLED,
					self::DEFAULT_DISABLED,
					array( 'size' => 'small' )
				),
				$this->build_text_field(
					'album.slug',
					esc_html__( 'Album Slug', 'modula-best-grid-gallery' ),
					$slug_default,
					array(
						'size'       => 'small',
						'conditions' => array(
							array(
								'field'      => 'album.enable_rewrite',
								'comparison' => '===',
								'value'      => self::DEFAULT_ENABLED,
							),
						),
					)
				),
				$this->build_paragraph_field(
					'album.enable_rewrite_description',
					esc_html__( 'INFO', 'modula-best-grid-gallery' ),
					esc_html__( 'This option allows you to access albums created through the post type with unique URLs. Now your albums can have dedicated album pages.', 'modula-best-grid-gallery' ),
					array( 'size' => 'large' )
				),
			)
		);
	}

	/**
	 * Get compression settings configuration
	 *
	 * @return array Compression settings configuration
	 *
	 * @since 2.11.0
	 */
	private function get_compression() {
		$run_compression = apply_filters( 'modula_speedup_run_local_compression', 'production' === wp_get_environment_type() );

		$compression         = $this->get_option_value( self::OPTION_COMPRESSION );
		$compression_options = $this->get_compression_options();

		$fields = array(
			'option' => self::OPTION_COMPRESSION,
			'fields' => array(
				$this->build_compression_toggle_field( $compression, $run_compression ),
				$this->build_compression_select_fields( $compression, $compression_options, $run_compression ),
			),
		);

		if ( ! $run_compression ) {
			$fields['fields'][] = $this->build_compression_environment_notice();
		}

		return $fields;
	}

	/**
	 * Build compression toggle field
	 *
	 * @param array $compression    Compression option data.
	 * @param bool  $run_compression Whether compression can run.
	 *
	 * @return array Field definition
	 *
	 * @since 2.11.0
	 */
	private function build_compression_toggle_field( $compression, $run_compression ) {
		$default = isset( $compression['enable_optimization'] ) ? $compression['enable_optimization'] : self::DEFAULT_ENABLED;

		return $this->build_options_toggle_field(
			'enable_optimization',
			'Compression',
			$default,
			self::DEFAULT_ENABLED,
			self::DEFAULT_DISABLED,
			array(
				'disabled'    => ! $run_compression,
				'description' => esc_html__( 'Enable this option if you want to compress your gallery images. Then, choose the desired compression type: Lossless (full quality, fewer bytes), Lossy (balanced quality and size), Glossy (optimized for web), or Disable to turn off image compression.', 'modula-best-grid-gallery' ),
			)
		);
	}

	/**
	 * Build compression select fields (thumbnail and lightbox)
	 *
	 * @param array $compression        Compression option data.
	 * @param array $compression_options Compression options array.
	 * @param bool  $run_compression    Whether compression can run.
	 *
	 * @return array Combo field with compression selects
	 *
	 * @since 2.11.0
	 */
	private function build_compression_select_fields( $compression, $compression_options, $run_compression ) {
		$thumbnail_default = isset( $compression['thumbnail_optimization'] ) ? $compression['thumbnail_optimization'] : self::DEFAULT_COMPRESSION_TYPE;
		$lightbox_default  = isset( $compression['lightbox_optimization'] ) ? $compression['lightbox_optimization'] : self::DEFAULT_LIGHTBOX_COMPRESSION;

		return $this->build_combo_field(
			array(
				$this->build_select_field(
					'thumbnail_optimization',
					'Thumbnail Compression',
					$compression_options,
					$thumbnail_default,
					array(
						'disabled'    => ! $run_compression,
						'description' => esc_html__( 'Choose the compression type for your gallery thumbnails.', 'modula-best-grid-gallery' ),
						'size'        => 'large',
						'conditions'  => array(
							array(
								'field'      => 'enable_optimization',
								'comparison' => '===',
								'value'      => self::DEFAULT_ENABLED,
							),
						),
					)
				),
				$this->build_select_field(
					'lightbox_optimization',
					'Lightbox Compression',
					$compression_options,
					$lightbox_default,
					array(
						'disabled'    => ! $run_compression,
						'description' => esc_html__( 'Choose the compression type for your gallery lightbox images.', 'modula-best-grid-gallery' ),
						'size'        => 'large',
						'conditions'  => array(
							array(
								'field'      => 'enable_optimization',
								'comparison' => '===',
								'value'      => self::DEFAULT_ENABLED,
							),
						),
					)
				),
			)
		);
	}

	/**
	 * Build compression environment notice
	 *
	 * @return array Paragraph field with notice
	 *
	 * @since 2.11.0
	 */
	private function build_compression_environment_notice() {
		$message = sprintf(
			// translators: %1$s and %3$s = <strong>, </strong>; %2$s = environment type (e.g., production); %4$s and %5$s = <a href="mailto:...">, </a>
			esc_html__( 'We\'ve detected that your site is running in a %1$s %2$s environment%3$s, and as a result, our image optimization services have been disabled. If you have questions, please contact us at %4$shello@wp-modula.com%5$s', 'modula-best-grid-gallery' ),
			'<strong>',
			wp_get_environment_type(),
			'</strong>',
			'<a target="_BLANK" href="mailto:support@wpchill.com">',
			'</a>'
		);

		return $this->build_paragraph_field(
			'',
			'',
			$message,
			array(
				'type'  => 'paragraph',
				'value' => $message,
			)
		);
	}

	/**
	 * Get shortcodes settings configuration
	 *
	 * @return array Shortcodes settings configuration
	 *
	 * @since 2.11.0
	 */
	private function get_shortcodes() {
		$shortcodes = $this->get_option_value( self::OPTION_SHORTCODES, null, 'gallery_id' );
		if ( ! is_string( $shortcodes ) ) {
			$shortcodes = 'gallery_id';
		}

		return array(
			'fields' => array(
				$this->build_text_field(
					self::OPTION_SHORTCODES,
					esc_html__( 'Gallery link attribute', 'modula-best-grid-gallery' ),
					$shortcodes,
					array(
						'description' => sprintf(
							'Add this shortcode <span class="modula_highlight">[modula_all_galleries]</span> on the page/post/product you want to display your galleries.  Then add at the end of that url :<span class="modula_highlight"> ?%s=[gallery_id], where [gallery_id] </span> is the ID of the gallery. ',
							$shortcodes
						),
					)
				),
			),
		);
	}

	/**
	 * Get watermark settings configuration
	 *
	 * @return array Watermark settings configuration
	 *
	 * @since 2.11.0
	 */
	private function get_watermark() {
		$watermark           = $this->get_option_value( self::OPTION_WATERMARK );
		$watermark_positions = $this->get_watermark_positions();

		$watermark_image_id  = isset( $watermark['watermark_image'] ) ? $watermark['watermark_image'] : null;
		$watermark_image_src = $watermark_image_id ? wp_get_attachment_image_url( absint( $watermark_image_id ) ) : null;

		return array(
			'option' => self::OPTION_WATERMARK,
			'fields' => array(
				$this->build_field(
					self::FIELD_TYPE_IMAGE_SELECT,
					'watermark_image',
					array(
						'label'        => esc_html__( 'Watermark Image', 'modula-best-grid-gallery' ),
						'default'      => $watermark_image_id,
						'src'          => $watermark_image_src,
						'sanitization' => array( 'number' ),
					)
				),
				$this->build_watermark_combo_fields( $watermark, $watermark_positions ),
				$this->build_toggle_field(
					'watermark_enable_backup',
					esc_html__( 'Enable image backup', 'modula-best-grid-gallery' ),
					isset( $watermark['watermark_enable_backup'] ) ? $watermark['watermark_enable_backup'] : '',
					array(
						'description' => esc_html__( 'Save original images (without watermark) in case you decide to delete the watermark from them you will be able to restore the original images to your gallery/media library.', 'modula-best-grid-gallery' ),
					)
				),
			),
		);
	}

	/**
	 * Build watermark combo fields (position, margin, dimensions)
	 *
	 * @param array $watermark          Watermark option data.
	 * @param array $watermark_positions Watermark position options.
	 *
	 * @return array Combo field with watermark settings
	 *
	 * @since 2.11.0
	 */
	private function build_watermark_combo_fields( $watermark, $watermark_positions ) {
		$position_default = isset( $watermark['watermark_position'] ) ? $watermark['watermark_position'] : self::DEFAULT_WATERMARK_POSITION;
		$margin_default   = isset( $watermark['watermark_margin'] ) ? $watermark['watermark_margin'] : self::DEFAULT_WATERMARK_MARGIN;
		$width_default    = isset( $watermark['watermark_image_dimension_width'] ) ? $watermark['watermark_image_dimension_width'] : 0;
		$height_default   = isset( $watermark['watermark_image_dimension_height'] ) ? $watermark['watermark_image_dimension_height'] : 0;

		return $this->build_combo_field(
			array(
				$this->build_select_field(
					'watermark_position',
					esc_html__( 'Watermark Position', 'modula-best-grid-gallery' ),
					$watermark_positions,
					$position_default,
					array( 'size' => 'small' )
				),
				$this->build_field(
					self::FIELD_TYPE_RANGE_SELECT,
					'watermark_margin',
					array(
						'label'        => esc_html__( 'Watermark Margin', 'modula-best-grid-gallery' ),
						'default'      => $margin_default,
						'min'          => 0,
						'max'          => 50,
						'size'         => 'medium',
						'sanitization' => array( 'number' ),
					)
				),
				$this->build_number_field(
					'watermark_image_dimension_width',
					esc_html__( 'Width', 'modula-best-grid-gallery' ),
					$width_default,
					array( 'size' => 'small' )
				),
				$this->build_number_field(
					'watermark_image_dimension_height',
					esc_html__( 'Height', 'modula-best-grid-gallery' ),
					$height_default,
					array( 'size' => 'small' )
				),
			)
		);
	}

	/**
	 * Get image licensing settings configuration
	 *
	 * @return array Image licensing settings configuration
	 *
	 * @since 2.11.0
	 */
	private function get_image_licensing() {
		$licensing = $this->get_option_value( self::OPTION_IMAGE_LICENSING );
		$licenses  = $this->build_license_options();

		return array(
			'option' => self::OPTION_IMAGE_LICENSING,
			'fields' => array(
				array(
					'type'   => 'combo',
					'fields' => array(
						array(
							'type'         => 'text',
							'name'         => 'image_licensing_author',
							'label'        => esc_html__( 'Author', 'modula-best-grid-gallery' ),
							'default'      => isset( $licensing['image_licensing_author'] ) ? $licensing['image_licensing_author'] : '',
							'size'         => 'large',
							'description'  => esc_html__( 'Name used by Google to filter the images based on the author\'s name', 'modula-best-grid-gallery' ),
							'sanitization' => array( 'text' ),
						),
						array(
							'type'         => 'text',
							'name'         => 'image_licensing_company',
							'label'        => esc_html__( 'Company', 'modula-best-grid-gallery' ),
							'default'      => isset( $licensing['image_licensing_company'] ) ? $licensing['image_licensing_company'] : '',
							'size'         => 'large',
							'description'  => esc_html__( 'Company used by Google to filter the images based on the company\'s name', 'modula-best-grid-gallery' ),
							'sanitization' => array( 'text' ),
						),
					),
				),
				array(
					'type'         => 'ia_radio',
					'name'         => 'image_licensing',
					'label'        => esc_html__( 'Choose license type', 'modula-best-grid-gallery' ),
					'default'      => isset( $licensing['image_licensing'] ) ? $licensing['image_licensing'] : 'none',
					'options'      => $licenses,
					'sanitization' => array( 'enum' => array_column( $licenses, 'value' ) ),
				),
				array(
					'type'         => 'toggle',
					'name'         => 'display_with_description',
					'label'        => esc_html__( 'Display licensing under gallery', 'modula-best-grid-gallery' ),
					'default'      => isset( $licensing['display_with_description'] ) ? $licensing['display_with_description'] : '',
					'description'  => esc_html__( 'Enable this option to show image licensing attribution under each gallery for your website visitors. The selected license and the author/company info you add will be displayed below the gallery and included in the gallery’s code, helping visitors know the license conditions and allowing Google to identify images for copyright filtering.', 'modula-best-grid-gallery' ),
					'sanitization' => array( 'bool' ),
				),
			),
		);
	}

	/**
	 * Build license options array from Modula_Helper
	 *
	 * @return array License options array
	 *
	 * @since 2.11.0
	 */
	private function build_license_options() {
		$licenses = array();

		foreach ( Modula_Helper::get_image_licenses() as $slug => $license ) {
			$licenses[] = array(
				'value' => $slug,
				'image' => $license['image'],
				'label' => $license['license'],
				'name'  => $license['name'],
			);
		}

		return $licenses;
	}

	/**
	 * Get roles settings configuration
	 *
	 * @return array Roles settings configuration
	 *
	 * @since 2.11.0
	 */
	private function get_roles() {
		$roles = array(
			'option' => self::OPTION_ROLES,
			'fields' => array_merge( $this->get_gallery_roles(), $this->get_album_roles() ),
		);

		if ( class_exists( 'Modula_Pro\Extensions\Albums\Albums' ) ) {
			$roles['submenu'] = array(
				'class'   => 'modula_roles_submenu',
				'options' => array(
					array(
						'label' => esc_html__( 'Gallery', 'modula-best-grid-gallery' ),
						'value' => 'gallery',
					),
					array(
						'label' => esc_html__( 'Album', 'modula-best-grid-gallery' ),
						'value' => 'album',
					),
				),
			);
		}

		return $roles;
	}

	/**
	 * Get social media settings configuration
	 *
	 * @return array Social media settings configuration
	 *
	 * @since 2.11.0
	 */
	private function get_social_media() {
		$instagram_status = false;
		$ig_connect_link  = '#';
		$youtube_oauth    = null;
		$vimeo_oauth      = null;
		$vimeo_creds      = $this->get_option_value( self::OPTION_VIMEO_CREDS );
		$vimeo_connected  = false;
		$vimeo_connect    = '#';
		$vimeo_redirect   = admin_url( '/edit.php?post_type=modula-gallery&page=modula&tab=social_media&sub=vi&action=save_modula_video_vimeo_token' );

		if ( class_exists( 'Modula_Pro\Extensions\Instagram\Instagram' ) ) {
			$instagram_status = (bool) Modula_Pro\Extensions\Instagram\OAuth::get_instance()->get_access_token();
			$ig_connect_link  = esc_url( Modula_Pro\Extensions\Instagram\OAuth::get_instance()->create_request_url() );
		}

		if ( class_exists( 'Modula_Pro\Extensions\Video\Admin\Google_Auth' ) ) {
			$youtube_oauth = Modula_Pro\Extensions\Video\Admin\Google_Auth::get_instance();
		}

		if ( class_exists( 'Modula_Pro\Extensions\Video\Admin\Vimeo_Auth' ) ) {
			$vimeo_oauth     = Modula_Pro\Extensions\Video\Admin\Vimeo_Auth::get_instance();
			$vimeo_connected = (bool) $vimeo_oauth->get_access_token();
		}

		if ( ! empty( $vimeo_creds['client_id'] ) ) {
			$vimeo_connect = 'https://api.vimeo.com/oauth/authorize?response_type=code&client_id=' . $vimeo_creds['client_id'] . '&redirect_uri=' . rawurlencode( $vimeo_redirect ) . '&scope=public';
		}

		return array(
			'fields' => array(
				array(
					'id'          => 'instagram',
					'type'        => 'oauth',
					'provider'    => 'instagram',
					'title'       => esc_html__( 'Instagram', 'modula-best-grid-gallery' ),
					'description' => esc_html__( 'Connect Modula to your Instagram business account.', 'modula-best-grid-gallery' ),
					'status'      => array(
						'connected'        => $instagram_status,
						'textConnected'    => esc_html__( 'Connected', 'modula-best-grid-gallery' ),
						'textDisconnected' => esc_html__( 'Not connected', 'modula-best-grid-gallery' ),
					),
					'connect'     => array(
						'href'  => $ig_connect_link,
						'label' => esc_html__( 'Connect', 'modula-best-grid-gallery' ),
					),
					'disconnect'  => array(
						'label' => esc_html__( 'Disconnect', 'modula-best-grid-gallery' ),
						'api'   => array(
							'path'   => '/modula-instagram/v1/token/disconnect/',
							'method' => 'POST',
							'data'   => array(),
						),
					),
					'docs'        => array(
						'href'  => 'https://wp-modula.com/kb/how-to-connect-modula-to-instagram/',
						'label' => esc_html__( 'Need help?', 'modula-best-grid-gallery' ),
					),
					'locked'      => true,
					'badge'       => 'trio',
				),
				array(
					'id'          => 'youtube',
					'type'        => 'oauth',
					'provider'    => 'youtube',
					'title'       => esc_html__( 'YouTube', 'modula-best-grid-gallery' ),
					'description' => esc_html__( 'Connect Modula to your YouTube account.', 'modula-best-grid-gallery' ),
					'status'      => array(
						'connected'        => ! is_null( $youtube_oauth ) && $youtube_oauth->get_access_token() ? true : false,
						'textConnected'    => esc_html__( 'Connected', 'modula-best-grid-gallery' ),
						'textDisconnected' => esc_html__( 'Not connected', 'modula-best-grid-gallery' ),
					),
					'connect'     => array(
						'href'  => ! is_null( $youtube_oauth ) && ! $youtube_oauth->get_access_token() ? esc_url( $youtube_oauth->create_request_url() ) : '#',
						'label' => esc_html__( 'Connect', 'modula-best-grid-gallery' ),
					),
					'refresh'     => array(
						'label' => esc_html__( 'Refresh token', 'modula-best-grid-gallery' ),
						'api'   => array(
							'path'   => '/modula-best-grid-gallery/v1/video/youtube/',
							'method' => 'POST',
							'data'   => array( 'action' => 'refresh' ),
						),
					),
					'disconnect'  => array(
						'label' => esc_html__( 'Disconnect', 'modula-best-grid-gallery' ),
						'api'   => array(
							'path'   => '/modula-best-grid-gallery/v1/video/youtube/',
							'method' => 'POST',
							'data'   => array( 'action' => 'disconnect' ),
						),
					),
					'docs'        => array(
						'href'  => 'https://wp-modula.com/kb/how-to-connect-modula-to-youtube-and-add-video-playlists-to-your-galleries/',
						'label' => esc_html__( 'Need help?', 'modula-best-grid-gallery' ),
					),
					'locked'      => true,
					'badge'       => 'starter',
				),
				array(
					'id'          => 'vimeo_credentials',
					'type'        => 'credentials_group',
					'title'       => esc_html__( 'Vimeo credentials', 'modula-best-grid-gallery' ),
					'description' => esc_html__( 'Add your Vimeo app keys to enable the connection.', 'modula-best-grid-gallery' ),
					'oauth'       => array(
						'status'     => array(
							'connected'        => $vimeo_connected,
							'textConnected'    => esc_html__( 'Connected', 'modula-best-grid-gallery' ),
							'textDisconnected' => esc_html__( 'Not connected', 'modula-best-grid-gallery' ),
						),
						'connect'    => array(
							'href'     => $vimeo_connected ? '#' : $vimeo_connect,
							'label'    => empty( $vimeo_creds['client_id'] ) ? esc_html__( 'Save your credentials first', 'modula-best-grid-gallery' ) : esc_html__( 'Connect to Vimeo', 'modula-best-grid-gallery' ),
							'disabled' => empty( $vimeo_creds['client_id'] ),
						),
						'disconnect' => array(
							'label' => esc_html__( 'Disconnect', 'modula-best-grid-gallery' ),
							'api'   => array(
								'path'   => '/modula-best-grid-gallery/v1/video/vimeo/',
								'method' => 'POST',
								'data'   => array( 'action' => 'disconnect' ),
							),
						),
						'docs'       => array(
							'href'  => 'https://wp-modula.com/kb/how-to-connect-modula-to-vimeo-and-add-video-playlists-to-your-galleries/',
							'label' => esc_html__( 'Need help?', 'modula-best-grid-gallery' ),
						),
					),
					'fields'      => array(
						array(
							'type'         => 'text',
							'name'         => 'modula_video_vimeo_creds.client_id',
							'label'        => esc_html__( 'Vimeo Client ID', 'modula-best-grid-gallery' ),
							'default'      => isset( $vimeo_creds['client_id'] ) ? $vimeo_creds['client_id'] : '',
							'readonly'     => $vimeo_connected,
							'sanitization' => array( 'text' ),
						),
						array(
							'type'         => 'text',
							'name'         => 'modula_video_vimeo_creds.client_secret',
							'label'        => esc_html__( 'Vimeo Client Secret', 'modula-best-grid-gallery' ),
							'default'      => isset( $vimeo_creds['client_secret'] ) ? $vimeo_creds['client_secret'] : '',
							'readonly'     => $vimeo_connected,
							'sanitization' => array( 'text' ),
						),
						array(
							'type'         => 'text',
							'name'         => 'vimeo_redirect_uri',
							'label'        => esc_html__( 'Vimeo RedirectURI', 'modula-best-grid-gallery' ),
							'default'      => $vimeo_redirect,
							'readonly'     => true,
							'sanitization' => array( 'url' ),
						),
					),
					'locked'      => true,
					'badge'       => 'starter',
				),
			),
		);
	}

	/**
	 * Get Modula AI settings configuration
	 *
	 * @return array Modula AI settings configuration
	 *
	 * @since 2.11.0
	 */
	public function get_modula_ai() {
		$enabled = (int) $this->get_option_value( self::OPTION_MODULA_AI, null, 0 ) ? true : false;

		return array(
			'fields' => array(
				$this->build_toggle_field(
					'use_modula_ai',
					esc_html__( 'Use AI Features', 'modula-best-grid-gallery' ),
					$enabled
				),
				$this->build_paragraph_field(
					'modula_ai_description',
					'',
					esc_html__( 'This is a powerful feature designed to optimize images within your galleries by automatically adding alt texts, titles, and captions. You no longer need to edit all these details manually, instead you can generate these with the help of AI.', 'modula-best-grid-gallery' ),
				),
				$this->build_field(
					self::FIELD_TYPE_MODULA_AI,
					'',
					array(
						'conditions' => array(
							array(
								'field'      => 'use_modula_ai',
								'comparison' => '===',
								'value'      => true,
							),
						),
					)
				),
				$this->build_text_field(
					'modula_ai_api_key',
					'',
					'',
					array(
						'conditions' => array(
							array(
								'field'      => 'use_modula_ai',
								'comparison' => '===',
								// TRICK TO ADD SANITIZATION SCHEMA FOR THE MODULA_AI FIELD
								'value'      => 'hello world',
							),
						),
					)
				),
				$this->build_field(
					self::FIELD_TYPE_SELECT,
					'modula_ai_language',
					array(
						'sanitization' => array( 'text' ),
						'conditions'   => array(
							array(
								'field'      => 'use_modula_ai',
								'comparison' => '===',
								// TRICK TO ADD SANITIZATION SCHEMA FOR THE MODULA_AI FIELD
								'value'      => 'hello world',
							),
						),
					)
				),
			),
		);
	}

	/**
	 * Get gallery roles configuration
	 *
	 * @return array Gallery roles array
	 *
	 * @since 2.11.0
	 */
	private function get_gallery_roles() {
		global $wp_roles;
		$options      = $this->get_option_value( self::OPTION_ROLES );
		$roles_array  = array();
		$capabilities = array(
			'edit_galleries'          => __( 'View & Edit Own Gallery', 'modula-best-grid-gallery' ),
			'edit_other_galleries'    => __( 'Edit Others Galleries', 'modula-best-grid-gallery' ),
			'publish_galleries'       => __( 'Publish Galleries', 'modula-best-grid-gallery' ),
			'delete_galleries'        => __( 'Delete Own Galleries', 'modula-best-grid-gallery' ),
			'delete_others_galleries' => __( 'Delete Others Galleries', 'modula-best-grid-gallery' ),
			'read_private_galleries'  => __( 'Edit Private Galleries', 'modula-best-grid-gallery' ),
		);

		foreach ( $wp_roles->roles as $key => $wp_role ) {
			if ( 'administrator' === $key ) {
				continue;
			}
			$role       = get_role( $key );
			$option     = isset( $options[ $key ]['enabled'] ) ? $options[ $key ]['enabled'] : false;
			$role_array = array(
				'type'    => self::FIELD_TYPE_ROLE,
				'name'    => $key . '.enabled',
				'label'   => translate_user_role( $wp_role['name'] ),
				'default' => $this->is_role_enabled( $key, $option, $capabilities ),
				'fields'  => array(),
				'group'   => 'gallery',
			);

			foreach ( $capabilities as $capability => $capability_name ) {
				$role_array['fields'][] = $this->build_toggle_field(
					$key . '.' . $capability,
					$capability_name,
					$role->has_cap( $capability )
				);
			}

			if ( ! in_array( $key, array( 'editor', 'author' ), true ) ) {
				$role_array['fields'][] = $this->build_toggle_field(
					$key . '.upload_files',
					__( 'Upload Files', 'modula-best-grid-gallery' ),
					$role->has_cap( 'upload_files' )
				);
			}

			$roles_array[] = $role_array;
		}

		return $roles_array;
	}

	/**
	 * Get album roles configuration
	 *
	 * @return array Album roles array
	 *
	 * @since 2.11.0
	 */
	private function get_album_roles() {
		if ( ! class_exists( 'Modula_Pro\Extensions\Albums\Albums' ) ) {
			return array();
		}

		global $wp_roles;
		$options     = $this->get_option_value( self::OPTION_ROLES );
		$roles_array = array();

		$album_capabilities = array(
			'edit_albums'          => __( 'View & Edit Own Albums', 'modula-best-grid-gallery' ),
			'edit_others_albums'   => __( 'Edit Others Albums', 'modula-best-grid-gallery' ),
			'publish_albums'       => __( 'Publish Albums', 'modula-best-grid-gallery' ),
			'delete_albums'        => __( 'Delete Own Albums', 'modula-best-grid-gallery' ),
			'delete_others_albums' => __( 'Delete Others Albums', 'modula-best-grid-gallery' ),
			'read_private_albums'  => __( 'Edit Private Albums', 'modula-best-grid-gallery' ),
		);

		foreach ( $wp_roles->roles as $key => $wp_role ) {
			if ( 'administrator' === $key ) {
				continue;
			}

			$option     = isset( $options[ $key . '_album' ]['enabled'] ) ? $options[ $key . '_album' ]['enabled'] : false;
			$role       = get_role( $key );
			$role_array = array(
				'type'         => self::FIELD_TYPE_ROLE,
				'name'         => $key . '_album.enabled',
				'label'        => translate_user_role( $wp_role['name'] ),
				'default'      => $this->is_role_enabled( $key, $option, $album_capabilities ),
				'fields'       => array(),
				'group'        => 'album',
				'sanitization' => array( 'bool' ),
			);

			foreach ( $album_capabilities as $capability => $capability_name ) {
				$role_array['fields'][] = $this->build_toggle_field(
					$key . '.' . $capability,
					$capability_name,
					$role->has_cap( $capability )
				);
			}

			if ( ! in_array( $key, array( 'editor', 'author' ), true ) ) {
				$role_array['fields'][] = $this->build_toggle_field(
					$key . '.upload_files',
					__( 'Upload Files', 'modula-best-grid-gallery' ),
					$role->has_cap( 'upload_files' )
				);
			}

			$roles_array[] = $role_array;
		}

		return $roles_array;
	}

	// =============================================================================
	// Helper Methods - Role Management
	// =============================================================================

	/**
	 * Check if a role is enabled based on option and capabilities
	 *
	 * @param string $key          Role key.
	 * @param mixed  $option       Option value.
	 * @param array  $capabilities Capabilities array.
	 *
	 * @return bool Whether role is enabled
	 *
	 * @since 2.11.0
	 */
	private function is_role_enabled( $key, $option, $capabilities ) {
		if ( $option || false === $option ) {
			$role = get_role( $key );
			foreach ( $capabilities as $cap => $cap_name ) {
				if ( $role->has_cap( $cap ) ) {
					return true;
				}
			}
		} elseif ( true === boolval( $option ) ) {
			return true;
		}

		return false;
	}

	// =============================================================================
	// Public Methods - Settings Management
	// =============================================================================

	/**
	 * Set capabilities for roles
	 *
	 * @param array $settings Settings array.
	 *
	 * @since 2.11.0
	 */
	public function set_capabilities( $settings ) {
		$roles = new Modula_Pro\Extensions\Roles\Roles();
		$roles->sanitize_option( $settings );
	}

	/**
	 * Check if user has permission to manage settings
	 *
	 * @return bool Whether user can manage options
	 *
	 * @since 2.11.0
	 */
	public function settings_permissions_check() {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Get sanitization schema for all settings
	 *
	 * @return array Sanitization map
	 *
	 * @since 2.11.0
	 */
	public function settings_sanitization() {
		$sanitization_map = array();
		$tabs             = $this->get_tabs();

		foreach ( $tabs as $tab ) {
			if ( empty( $tab['subtabs'] ) || ! is_array( $tab['subtabs'] ) ) {
				continue;
			}

			foreach ( $tab['subtabs'] as $subtab ) {
				if ( empty( $subtab['config'] ) || ! is_array( $subtab['config'] ) ) {
					continue;
				}

				$config = $subtab['config'];
				$option = isset( $config['option'] ) ? $config['option'] : null;
				$fields = isset( $config['fields'] ) && is_array( $config['fields'] ) ? $config['fields'] : array();

				$this->collect_sanitization_from_fields( $fields, $sanitization_map, $option );
			}
		}

		return $sanitization_map;
	}

	/**
	 * Recursively collect sanitization schemas from fields definitions.
	 *
	 * @param array  $fields            Fields definition array.
	 * @param array  $sanitization_map  Reference to the collected sanitization map.
	 * @param string $option            Option name if fields belong to a specific option.
	 */
	private function collect_sanitization_from_fields( $fields, &$sanitization_map, $option = null ) {
		foreach ( $fields as $field ) {
			if ( isset( $field['fields'] ) && is_array( $field['fields'] ) ) {
				$this->collect_sanitization_from_fields( $field['fields'], $sanitization_map, $option );
			}

			if ( empty( $field['sanitization'] ) || empty( $field['name'] ) ) {
				continue;
			}

			$target = &$sanitization_map;

			if ( $option ) {
				if ( ! isset( $target[ $option ] ) || ! is_array( $target[ $option ] ) ) {
					$target[ $option ] = array();
				}

				$target = &$target[ $option ];
			}

			$this->assign_sanitization_value( $target, $field['name'], $field['sanitization'] );
		}
	}

	/**
	 * Assign a sanitization schema to the nested path represented by the field name.
	 *
	 * @param array  $target        Reference to the target array where the schema should be stored.
	 * @param string $field_name    Dot-notated field name (e.g. gallery.slug).
	 * @param array  $sanitization  Sanitization schema to store.
	 */
	private function assign_sanitization_value( &$target, $field_name, $sanitization ) {
		$parts   = explode( '.', $field_name );
		$current = &$target;

		foreach ( $parts as $index => $part ) {
			$last = count( $parts ) - 1 === $index;

			if ( $last ) {
				$current[ $part ] = $sanitization;
				return;
			}

			if ( ! isset( $current[ $part ] ) || ! is_array( $current[ $part ] ) ) {
				$current[ $part ] = array();
			}

			$current = &$current[ $part ];
		}
	}
}
