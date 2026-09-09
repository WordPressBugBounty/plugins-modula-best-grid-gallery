<?php

/**
 * Modula Gallery - Modern Shortcode Renderer
 * Clean, minimal shortcode handler that outputs minimal HTML + JSON for modern frontend
 *
 * @package Modula
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Modula Modern Shortcode Renderer
 * Handles shortcode output with minimal HTML + JSON data
 */
class Modula_Shortcode_Modern {

	private $item_processor;

	/**
	 * Constructor
	 */
	public function __construct() {
		$this->item_processor = new Modula_Item_Data_Processor();

		add_shortcode( 'modula', array( $this, 'render' ) );
		add_shortcode( 'Modula', array( $this, 'render' ) );

		// Keep actions for template hooks (these are for output, not data transformation)
		add_action( 'modula_shortcode_after_items', 'modula_show_schemaorg', 90 );
		add_action( 'modula_shortcode_after_items', 'modula_edit_gallery', 100 );
	}

	/**
	 * Render gallery shortcode
	 *
	 * @param array $atts Shortcode attributes
	 * @return string Gallery HTML
	 */
	public function render( $atts ) {
		$atts = $this->parse_attributes( $atts );

		// Validate gallery ID
		$gallery_id = $this->validate_gallery_id( $atts['id'] );
		if ( ! $gallery_id ) {
			return esc_html__( 'Gallery not found.', 'modula-best-grid-gallery' );
		}

		// Get gallery post
		$gallery = $this->get_gallery_post( $gallery_id );
		if ( ! $gallery ) {
			return esc_html__( 'Gallery not found.', 'modula-best-grid-gallery' );
		}

		// Get and prepare settings
		$settings = $this->get_gallery_settings( $gallery_id, $atts['align'] );
		if ( empty( $settings ) ) {
			return esc_html__( 'Gallery not found.', 'modula-best-grid-gallery' );
		}

		// Check pre-output filter
		$pre_output = $this->check_pre_output_filter( $settings, $gallery );
		if ( false !== $pre_output ) {
			return $pre_output;
		}

		// Get and prepare images
		$images = $this->get_gallery_images( $gallery_id, $settings );
		if ( empty( $images ) ) {
			return esc_html__( 'Gallery not found.', 'modula-best-grid-gallery' );
		}

		// Enqueue assets
		$this->enqueue_assets( $settings );

		// Build gallery data
		$gallery_data = $this->build_gallery_data( $gallery_id, $settings, $images );

		// Render output
		return $this->render_output( $gallery_id, $settings, $gallery_data, $images );
	}

	/**
	 * Parse and validate shortcode attributes
	 *
	 * @param array $atts Raw attributes
	 * @return array Parsed attributes
	 */
	private function parse_attributes( $atts ) {
		return wp_parse_args(
			$atts,
			array(
				'id'    => false,
				'align' => '',
			)
		);
	}

	/**
	 * Validate gallery ID
	 *
	 * @param int|string $gallery_id Gallery ID
	 * @return int|false Valid gallery ID or false
	 */
	private function validate_gallery_id( $gallery_id ) {
		if ( ! $gallery_id ) {
			return false;
		}

		return absint( $gallery_id );
	}

	/**
	 * Get gallery post object
	 *
	 * @param int $gallery_id Gallery ID
	 * @return WP_Post|null Gallery post or null
	 */
	private function get_gallery_post( $gallery_id ) {
		$gallery = get_post( $gallery_id );

		// Check if post exists and is accessible
		if ( ! $gallery ) {
			return null;
		}

		// Handle private posts
		if ( 'private' === $gallery->post_status && ! is_user_logged_in() ) {
			return null;
		}

		// Handle legacy gallery IDs
		if ( 'modula-gallery' !== get_post_type( $gallery ) ) {
			$gallery_posts = get_posts(
				array(
					'post_type'      => 'modula-gallery',
					'post_status'    => 'publish',
					'meta_query'     => array(
						array(
							'key'     => 'modula-id',
							'value'   => $gallery_id,
							'compare' => '=',
						),
					),
					'fields'         => 'ids',
					'posts_per_page' => 1,
				)
			);

			if ( empty( $gallery_posts ) ) {
				return null;
			}

			return get_post( $gallery_posts[0] );
		}

		return $gallery;
	}

	/**
	 * Get and prepare gallery settings
	 *
	 * @param int    $gallery_id Gallery ID
	 * @param string $align      Alignment attribute
	 * @return array Gallery settings
	 */
	private function get_gallery_settings( $gallery_id, $align ) {
		$gallery_id_string = 'modula-' . $gallery_id;

		// Get raw settings
		$settings = apply_filters(
			'modula_backwards_compatibility_front',
			get_post_meta( $gallery_id, 'modula-settings', true )
		);

		// Get defaults
		$defaults = Modula_CPT_Fields_Helper::get_defaults();

		// Handle grid_type edge case: Number of columns comes from modula-settings[grid_type]
		// (admin select: automatic, 1–12). If grid type is set but grid_type is empty, unset
		// so wp_parse_args below fills in default column count (three columns for Masonry).
		if ( isset( $settings['type'] ) && 'grid' === $settings['type'] && empty( $settings['grid_type'] ) ) {
			unset( $settings['grid_type'] );
		}

		// Merge with defaults
		$settings = wp_parse_args( $settings, $defaults );

		// Add required fields
		$settings['gallery_id'] = $gallery_id_string;
		$settings['type']       = $settings['type'] ?? 'creative-gallery';
		$settings['align']      = $align;

		return $settings;
	}

	/**
	 * Check pre-output filter
	 *
	 * @param array    $settings Gallery settings
	 * @param WP_Post  $gallery  Gallery post
	 * @return string|false Pre-output HTML or false
	 */
	private function check_pre_output_filter( $settings, $gallery ) {
		$pre_gallery_html = apply_filters( 'modula_pre_output_filter_check', false, $settings, $gallery );

		if ( false !== $pre_gallery_html ) {
			return apply_filters( 'modula_pre_output_filter', '', $settings, $gallery );
		}

		return false;
	}

	/**
	 * Get and prepare gallery images
	 *
	 * @param int   $gallery_id Gallery ID
	 * @param array $settings    Gallery settings
	 * @return array Gallery images
	 */
	private function get_gallery_images( $gallery_id, $settings ) {
		// Get raw images
		$meta_images = get_post_meta( $gallery_id, 'modula-images', true );
		if ( empty( $meta_images ) || ! is_array( $meta_images ) ) {
			return array();
		}

		// Apply filters
		$images = apply_filters( 'modula_gallery_before_shuffle_images', $meta_images, $settings );

		// Handle shuffle
		$type              = $settings['type'] ?? 'creative-gallery';
		$shuffle_permitted = apply_filters(
			'modula_shuffle_grid_types',
			array( 'creative-gallery', 'grid', 'polaroid' ),
			$settings
		);

		if (
			isset( $settings['shuffle'] ) &&
			'1' === $settings['shuffle'] &&
			in_array( $type, $shuffle_permitted, true )
		) {
			shuffle( $images );
		}

		// Apply reports (alt text, title, description)
		$images = $this->apply_image_reports( $images );

		// Final filter
		$images = apply_filters( 'modula_gallery_images', $images, $settings );

		return $images;
	}

	/**
	 * Apply image reports (alt text, title, description)
	 *
	 * @param array $images Gallery images
	 * @return array Images with reports applied
	 */
	private function apply_image_reports( $images ) {
		if ( empty( $images ) ) {
			return $images;
		}

		$image_ids = array_filter( wp_list_pluck( $images, 'id' ) );
		if ( empty( $image_ids ) ) {
			return $images;
		}

		// Get alt texts
		$alt_texts = $this->get_image_alt_texts( $image_ids );

		// Get post data (title, description)
		$post_data = $this->get_image_post_data( $image_ids );

		// Apply to images
		foreach ( $images as &$image ) {
			if ( ! isset( $image['id'] ) ) {
				continue;
			}

			$image_id = absint( $image['id'] );

			if ( isset( $alt_texts[ $image_id ] ) ) {
				$image['alt'] = $alt_texts[ $image_id ];
			}

			if ( isset( $post_data[ $image_id ] ) ) {
				$post                 = $post_data[ $image_id ];
				$image['title']       = $post->post_title;
				$image['description'] = $post->post_excerpt;
				$image['caption']     = $post->post_excerpt;
			}
		}

		return $images;
	}

	/**
	 * Get image alt texts
	 *
	 * @param array $image_ids Image IDs
	 * @return array Alt texts keyed by image ID
	 */
	private function get_image_alt_texts( $image_ids ) {
		global $wpdb;

		if ( empty( $image_ids ) ) {
			return array();
		}

		$placeholders = implode( ',', array_fill( 0, count( $image_ids ), '%d' ) );

		//phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT post_id, meta_value 
				FROM {$wpdb->postmeta} 
				WHERE post_id IN ({$placeholders}) 
				AND meta_key = '_wp_attachment_image_alt'",
				$image_ids
			),
			OBJECT_K
		);

		$alt_texts = array();
		foreach ( $results as $post_id => $row ) {
			$alt_texts[ absint( $post_id ) ] = $row->meta_value;
		}

		return $alt_texts;
	}

	/**
	 * Get image post data (title, description)
	 *
	 * @param array $image_ids Image IDs
	 * @return array Post data keyed by image ID
	 */
	private function get_image_post_data( $image_ids ) {
		global $wpdb;

		if ( empty( $image_ids ) ) {
			return array();
		}

		$placeholders = implode( ',', array_fill( 0, count( $image_ids ), '%d' ) );

		//phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT ID, post_title, post_excerpt, post_content 
				FROM {$wpdb->posts} 
				WHERE ID IN ({$placeholders})",
				$image_ids
			),
			OBJECT_K
		);

		$post_data = array();
		foreach ( $results as $post_id => $post ) {
			$post_data[ absint( $post_id ) ] = $post;
		}

		return $post_data;
	}

	/**
	 * Enqueue gallery assets
	 * Explicitly enqueues only what's needed for the modern gallery
	 *
	 * @param array $settings Gallery settings
	 * @return void
	 */
	private function enqueue_assets( $settings ) {
		// Enqueue modern frontend gallery CSS (extracted from SCSS)
		$css_handle = 'modula-gallery';
		$css_path   = MODULA_URL . 'assets/css/front/modula-gallery.css';
		$css_file   = MODULA_PATH . 'assets/css/front/modula-gallery.css';

		if ( file_exists( $css_file ) && ! wp_style_is( $css_handle, 'enqueued' ) ) {
			wp_enqueue_style(
				$css_handle,
				$css_path,
				array(), // Depends on base modula styles
				MODULA_LITE_VERSION
			);
			\Modula\V2\Modern_Gallery::attach_gallery_chrome_inline_style( $css_handle );
		}

		// Enqueue modern frontend gallery JavaScript bundle
		// Output path: assets/js/front/modula-gallery.js (from webpack config)
		$script_handle = 'modula-gallery';
		$script_path   = MODULA_URL . 'assets/js/front/modula-gallery.js';
		$script_file   = MODULA_PATH . 'assets/js/front/modula-gallery.js';

		// Only enqueue if the file exists (built)
		if ( file_exists( $script_file ) && ! wp_script_is( $script_handle, 'enqueued' ) ) {
			wp_enqueue_script(
				$script_handle,
				$script_path,
				array(), // No dependencies - bundle is self-contained
				MODULA_LITE_VERSION,
				true // In footer
			);
			wp_localize_script(
				$script_handle,
				'modulaGallery',
				array(
					'publicPath' => trailingslashit( MODULA_URL . 'assets/' ),
					'strings'    => array(
						'loadingGallery' => esc_html__( 'Loading gallery…', 'modula-best-grid-gallery' ),
						'loadingFailed'  => esc_html__( 'Could not load gallery.', 'modula-best-grid-gallery' ),
					),
				)
			);
		}

		if ( class_exists( '\Modula\V2\Modern_Gallery' ) ) {
			\Modula\V2\Modern_Gallery::enqueue_bootstrap_stylesheet();
			\Modula\V2\Modern_Gallery::attach_gallery_chrome_inline_style( 'modula-gallery-bootstrap' );
			\Modula\V2\Modern_Gallery::preload_bootstrap_stylesheet();
		}
	}

	/**
	 * Build gallery data structure for JSON output
	 *
	 * @param int    $gallery_id Gallery ID
	 * @param array  $settings   Gallery settings
	 * @param array  $images     Gallery images
	 * @return array Gallery data
	 */
	private function build_gallery_data( $gallery_id, $settings, $images ) {
		$type = $settings['type'] ?? 'creative-gallery';

		// Get inView setting
		$inView = $this->get_inview_setting( $type, $settings );

		// Convert config
		$config = Modula_Frontend_Adapter::convert_config( $settings, $type, $inView );

		// Convert items (use item processor so items include srcset/sizes from WordPress for JSON frontend)
		$items = array();
		foreach ( $images as $image ) {
			if ( ! $this->is_valid_image( $image ) ) {
				continue;
			}
			$image          = apply_filters( 'modula_shortcode_image_data', $image, $settings );
			$item_data      = $this->item_processor->process( $image, $settings, $gallery_id, $images );
			$item_data      = apply_filters( 'modula_shortcode_item_data', $item_data, $image, $settings, $images );
			$converted_item = Modula_Frontend_Adapter::convert_item_from_item_data( $item_data, $image, $settings, $images );
			if ( $converted_item ) {
				$items[] = $converted_item;
			}
		}

		// Build data structure
		// Grouped v2 settings so the React app can run settingsToConfig (e.g. sliderCarousel / slidesToShow).
		// convert_config alone does not carry slider carousel keys needed for multi-slide Fancyapps layout.
		$grouped_settings = array();
		if ( class_exists( '\Modula\V2\Settings\Adapter' ) ) {
			$grouped_settings = \Modula\V2\Settings\Adapter::to_grouped( $settings );
		}

		$gallery_data = array(
			'config'     => $config,
			'settings'   => $grouped_settings,
			'items'      => $items,
			'metadata'   => array(
				'galleryId' => $gallery_id,
			),
			'pagination' => array(
				'enabled'     => false,
				'mode'        => 'page',
				'type'        => 'client',
				'perPage'     => 12,
				'currentPage' => 1,
			),
			'filtering'  => array(
				'enabled'          => false,
				'type'             => 'client',
				'activeFilters'    => array(),
				'availableFilters' => array(),
			),
		);

		/**
		 * Filter: modula_modern_shortcode_data
		 * Allow filtering of gallery data before output
		 *
		 * @param array  $gallery_data Gallery data
		 * @param array  $settings    Original settings
		 * @param int    $gallery_id  Gallery ID
		 * @return array
		 */
		return apply_filters( 'modula_modern_shortcode_data', $gallery_data, $settings, $gallery_id );
	}

	/**
	 * Get inView setting
	 *
	 * @param string $type     Gallery type
	 * @param array  $settings Gallery settings
	 * @return bool Whether inView is enabled
	 */
	private function get_inview_setting( $type, $settings ) {
		$inview_permitted = apply_filters(
			'modula_loading_inview_grids',
			array( 'custom-grid', 'creative-gallery', 'grid', 'polaroid' ),
			$settings
		);

		return isset( $settings['inView'] ) &&
			boolval( $settings['inView'] ) &&
			in_array( $type, $inview_permitted, true );
	}

	/**
	 * Render gallery output
	 *
	 * @param string $gallery_id   Gallery ID string (e.g., 'modula-123')
	 * @param array  $settings     Gallery settings
	 * @param array  $gallery_data Gallery data for JSON
	 * @param array  $images       Gallery images
	 * @return string Gallery HTML
	 */
	private function render_output( $gallery_id, $settings, $gallery_data, $images ) {
		// Build container classes
		$classes = $this->get_container_classes( $settings );

		ob_start();

		// Output CSS
		// echo Modula_Shortcode::generate_gallery_css( $gallery_id, $settings );

		// Before gallery hook
		do_action( 'modula_before_gallery', $settings );

		$shell_style = class_exists( '\Modula\V2\Modern_Gallery' )
			? \Modula\V2\Modern_Gallery::gallery_shell_inline_style()
			: 'opacity:0;visibility:hidden';

		// Output HTML
		?>
		<div id="modula-<?php echo esc_attr( $gallery_id ); ?>" class="<?php echo esc_attr( implode( ' ', $classes ) ); ?>" style="<?php echo esc_attr( $shell_style ); ?>">
			<?php do_action( 'modula_shortcode_before_items', $settings ); ?>

			<div class="modula-items">
				<?php $this->render_items( $images, $settings, $gallery_id ); ?>
			</div>

			<?php do_action( 'modula_shortcode_after_items', $settings, null, $images ); ?>
		</div>

		<script type="application/json" data-modula-gallery-id="modula-<?php echo esc_attr( $gallery_id ); ?>" data-modula-gallery>
			<?php echo wp_json_encode( $gallery_data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ); ?>
		</script>


		<?php

		// After gallery hook
		do_action( 'modula_after_gallery', $settings );

		return ob_get_clean();
	}

	/**
	 * Render gallery items
	 * Generates HTML directly without relying on templates or actions
	 *
	 * @param array  $images     Gallery images
	 * @param array  $settings   Gallery settings
	 * @param string $gallery_id Gallery ID
	 * @return void
	 */
	private function render_items( $images, $settings, $gallery_id ) {
		foreach ( $images as $image ) {
			// Validate image
			if ( ! $this->is_valid_image( $image ) ) {
				continue;
			}

			// Allow external modifications to image data before processing
			$image = apply_filters( 'modula_shortcode_image_data', $image, $settings );

			// Process item data through the processor
			$item_data = $this->item_processor->process( $image, $settings, $gallery_id, $images );

			// Allow external modifications via filter (for backward compatibility)
			$item_data = apply_filters( 'modula_shortcode_item_data', $item_data, $image, $settings, $images );

			// Convert array to object for easier access
			$data = (object) $item_data;

			// Render item HTML directly
			echo $this->render_item_html( $data );
		}
	}

	/**
	 * Check if image is valid
	 *
	 * @param array $image Image data
	 * @return bool True if valid
	 */
	private function is_valid_image( $image ) {
		if ( ! isset( $image['id'] ) ) {
			return false;
		}

		$image_object      = get_post( $image['id'] );
		$item_is_not_image = ( is_wp_error( $image_object ) || get_post_type( $image_object ) !== 'attachment' );

		return ! apply_filters( 'modula_check_item_not_image', $item_is_not_image, $image );
	}

	/**
	 * Get container classes
	 *
	 * @param array $settings Gallery settings
	 * @return array Container classes
	 */
	private function get_container_classes( $settings ) {
		$classes = array( 'modula', 'modula-gallery', 'modula-gallery-modern' );

		if ( ! empty( $settings['align'] ) ) {
			$classes[] = 'align' . esc_attr( $settings['align'] );
		}

		/**
		 * Filter: modula_modern_shortcode_container_classes
		 * Allow filtering of container classes
		 *
		 * @param array $classes  Container classes
		 * @param array $settings Gallery settings
		 * @return array
		 */
		return apply_filters( 'modula_modern_shortcode_container_classes', $classes, $settings );
	}

	/**
	 * Render complete gallery item HTML
	 *
	 * @param object $data     Item data object
	 * @param array  $settings Gallery settings
	 * @return string Item HTML
	 */
	private function render_item_html( $data ) {
		ob_start();
		?>
		<div class="<?php echo esc_attr( implode( ' ', $data->item_classes ) ); ?>" <?php echo Modula_Helper::generate_attributes( $data->item_attributes ); ?>>
			<div class="modula-item-overlay"></div>
			<div class="modula-item-content">
				<?php if ( modula_item_object_renders_link_overlay( $data ) ) : ?>
					<a<?php echo Modula_Helper::generate_attributes( $data->link_attributes ); ?> class="<?php echo esc_attr( implode( ' ', $data->link_classes ) ); ?>"></a>
					<?php endif; ?>
					<?php echo $this->render_item_image( $data ); ?>
					<div class="figc<?php echo '' === $data->title ? ' no-title' : ''; ?><?php echo '' === $data->description ? ' no-description' : ''; ?>">
						<div class="figc-inner">
							<?php if ( ! $data->hide_title ) : ?>
								<div class="modula-title"><?php echo wp_kses_post( $data->title ); ?></div>
							<?php endif; ?>
							<?php if ( ! $data->hide_description && '' !== $data->description ) : ?>
								<p class="description"><?php echo wp_kses_post( $data->description ); ?></p>
							<?php endif; ?>
							<?php if ( ! $data->hide_socials && ! $data->socialDesktopCollapsed ) : ?>
								<div class="modula-social">
									<?php if ( $data->enableTwitter ) : ?>
										<a class="modula-icon-twitter" aria-label="<?php echo esc_html__( 'Share on X', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo Modula_Helper::get_icon( 'twitter' ); ?></a>
									<?php endif; ?>
									<?php if ( $data->enableFacebook ) : ?>
										<a class="modula-icon-facebook" aria-label="<?php echo esc_html__( 'Share on Facebook', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo Modula_Helper::get_icon( 'facebook' ); ?></a>
									<?php endif; ?>
									<?php if ( $data->enableWhatsapp ) : ?>
										<a class="modula-icon-whatsapp" aria-label="<?php echo esc_html__( 'Share on Whatsapp', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo Modula_Helper::get_icon( 'whatsapp' ); ?></a>
									<?php endif; ?>
									<?php if ( $data->enablePinterest ) : ?>
										<a class="modula-icon-pinterest" aria-label="<?php echo esc_html__( 'Share on Pinterest', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo Modula_Helper::get_icon( 'pinterest' ); ?></a>
									<?php endif; ?>
									<?php if ( $data->enableLinkedin ) : ?>
										<a class="modula-icon-linkedin" aria-label="<?php echo esc_html__( 'Share on LinkedIn', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo Modula_Helper::get_icon( 'linkedin' ); ?></a>
									<?php endif; ?>
									<?php if ( $data->enableEmail ) : ?>
										<a class="modula-icon-email" aria-label="<?php echo esc_html__( 'Share by Email', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo Modula_Helper::get_icon( 'email' ); ?></a>
									<?php endif; ?>
									<?php do_action( 'modula_extra_socials', $data ); ?>
								</div>
							<?php endif; ?>
						</div>
					</div>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}

	/**
	 * Render gallery item image with responsive attributes
	 * Uses native browser lazy loading instead of library
	 *
	 * @param object $data Item data object
	 * @return string Image HTML
	 */
	private function render_item_image( $data ) {
		// Build base image attributes
		$img_attrs = $this->build_image_attributes( $data );

		// Check if srcset is disabled
		if ( $this->is_srcset_disabled() ) {
			return $this->build_image_tag( $img_attrs, $data );
		}

		// Custom crop (grid/slider): skip WP srcset — it targets the original attachment, not the crop.
		if ( ! empty( $data->custom_grid ) && ! empty( $data->crop ) ) {
			return $this->build_image_tag( $img_attrs, $data );
		}

		// Get attachment metadata
		$attachment_id = $this->get_attachment_id( $data );
		$image_meta    = $this->get_image_metadata( $attachment_id, $data, $img_attrs );

		// Get image source URL
		$image_src = $this->get_image_source( $img_attrs, $data );
		if ( ! $image_src || empty( $image_meta['sizes'] ) ) {
			return $this->build_image_tag( $img_attrs, $data );
		}

		// Check if image was edited (skip srcset if edited)
		if ( $this->is_image_edited( $image_meta, $image_src ) ) {
			return $this->build_image_tag( $img_attrs, $data );
		}

		// Get image dimensions
		$size_array = $this->get_image_dimensions( $img_attrs, $image_src, $image_meta, $attachment_id );
		if ( ! $size_array ) {
			return $this->build_image_tag( $img_attrs, $data );
		}

		// Add responsive attributes (srcset and sizes)
		$img_attrs = $this->add_responsive_attributes( $img_attrs, $size_array, $image_src, $image_meta, $attachment_id, $data );

		return $this->build_image_tag( $img_attrs, $data );
	}

	/**
	 * Build base image attributes from item data
	 *
	 * @param object $data Item data object
	 * @return array Image attributes
	 */
	private function build_image_attributes( $data ) {
		$img_attrs = $data->img_attributes;

		// Add classes
		if ( ! empty( $data->img_classes ) ) {
			$img_attrs['class'] = implode( ' ', $data->img_classes );
		}

		return $img_attrs;
	}

	/**
	 * Check if srcset is disabled via troubleshooting option
	 *
	 * @return bool True if srcset is disabled
	 */
	private function is_srcset_disabled() {
		$troubleshoot_opt = get_option( 'modula_troubleshooting_option', array() );
		$disable_srcset   = isset( $troubleshoot_opt['disable_srcset'] ) ? boolval( $troubleshoot_opt['disable_srcset'] ) : false;

		return true === apply_filters( 'modula_troubleshooting_disable_srcset', $disable_srcset );
	}

	/**
	 * Get attachment ID from item data
	 *
	 * @param object $data Item data object
	 * @return int Attachment ID or 0
	 */
	private function get_attachment_id( $data ) {
		return isset( $data->link_attributes['data-image-id'] ) ? (int) $data->link_attributes['data-image-id'] : 0;
	}

	/**
	 * Get image metadata and add custom size if needed
	 *
	 * @param int    $attachment_id Attachment ID
	 * @param object $data          Item data object
	 * @param array  $img_attrs    Image attributes
	 * @return array Image metadata
	 */
	private function get_image_metadata( $attachment_id, $data, $img_attrs ) {
		$image_meta = array();

		if ( $attachment_id ) {
			$image_meta = wp_get_attachment_metadata( $attachment_id );
		}

		// Add custom size if different from original
		if ( $this->should_add_custom_size( $data, $image_meta, $img_attrs ) ) {
			$mime_type                     = $this->get_mime_type( $image_meta, $data );
			$image_meta['sizes']['custom'] = array(
				'file'      => $data->image_info['name'] . '-' . $data->image_info['suffix'] . '.' . $data->image_info['ext'],
				'width'     => $img_attrs['width'],
				'height'    => $img_attrs['height'],
				'mime-type' => $mime_type,
			);
		}

		return $image_meta;
	}

	/**
	 * Check if custom size should be added to metadata
	 *
	 * @param object $data       Item data object
	 * @param array  $image_meta Image metadata
	 * @param array  $img_attrs  Image attributes
	 * @return bool True if custom size should be added
	 */
	private function should_add_custom_size( $data, $image_meta, $img_attrs ) {
		return ! empty( $data->image_info ) &&
			! empty( $image_meta ) &&
			isset( $image_meta['width'], $image_meta['height'], $img_attrs['width'], $img_attrs['height'] ) &&
			$image_meta['width'] !== $img_attrs['width'] &&
			$image_meta['height'] !== $img_attrs['height'];
	}

	/**
	 * Get mime type for image
	 *
	 * @param array  $image_meta Image metadata
	 * @param object $data      Item data object
	 * @return string Mime type
	 */
	private function get_mime_type( $image_meta, $data ) {
		if ( isset( $image_meta['sizes']['thumbnail']['mime-type'] ) ) {
			return $image_meta['sizes']['thumbnail']['mime-type'];
		}

		if ( function_exists( 'mime_content_type' ) && isset( $data->image_info['file_path'] ) ) {
			return mime_content_type( $data->image_info['file_path'] );
		}

		return '';
	}

	/**
	 * Get image source URL
	 *
	 * @param array  $img_attrs Image attributes
	 * @param object $data     Item data object
	 * @return string Image source URL or empty string
	 */
	private function get_image_source( $img_attrs, $data ) {
		// Try src first, then data-src, then image_full
		$image_src = $img_attrs['src'] ?? $img_attrs['data-src'] ?? '';

		if ( ! $image_src && isset( $data->image_full ) ) {
			$image_src = $data->image_full;
		}

		// Remove query string
		list($image_src) = explode( '?', $image_src );

		return $image_src;
	}

	/**
	 * Check if image was edited after insertion
	 *
	 * @param array  $image_meta Image metadata
	 * @param string $image_src  Image source URL
	 * @return bool True if image was edited
	 */
	private function is_image_edited( $image_meta, $image_src ) {
		if ( ! isset( $image_meta['file'] ) ) {
			return false;
		}

		if ( ! preg_match( '/-e[0-9]{13}/', $image_meta['file'], $img_edit_hash ) ) {
			return false;
		}

		return strpos( wp_basename( $image_src ), $img_edit_hash[0] ) === false;
	}

	/**
	 * Get image dimensions array
	 *
	 * @param array  $img_attrs    Image attributes
	 * @param string $image_src    Image source URL
	 * @param array  $image_meta  Image metadata
	 * @param int    $attachment_id Attachment ID
	 * @return array|false Size array [width, height] or false on failure
	 */
	private function get_image_dimensions( $img_attrs, $image_src, $image_meta, $attachment_id ) {
		$width  = isset( $img_attrs['width'] ) ? (int) $img_attrs['width'] : 0;
		$height = isset( $img_attrs['height'] ) ? (int) $img_attrs['height'] : 0;

		if ( $width && $height ) {
			return array( $width, $height );
		}

		return wp_image_src_get_dimensions( $image_src, $image_meta, $attachment_id );
	}

	/**
	 * Add responsive attributes (srcset and sizes) to image attributes
	 *
	 * @param array  $img_attrs     Image attributes
	 * @param array  $size_array   Size array [width, height]
	 * @param string $image_src     Image source URL
	 * @param array  $image_meta   Image metadata
	 * @param int    $attachment_id Attachment ID
	 * @param object $data         Item data object
	 * @return array Modified image attributes
	 */
	private function add_responsive_attributes( $img_attrs, $size_array, $image_src, $image_meta, $attachment_id, $data ) {
		// Calculate srcset
		$srcset = apply_filters( 'modula_template_image_srcset', array(), $data, $image_meta );

		if ( empty( $srcset ) ) {
			$full_image = $data->image_full ?? $image_src;
			$srcset     = wp_calculate_image_srcset( $size_array, $full_image, $image_meta, $attachment_id );
		}

		if ( $srcset ) {
			$img_attrs['srcset'] = $srcset;

			$sizes = modula_resolve_image_sizes_attr(
				array(
					'settings'      => array(
						'type' => isset( $data->gallery_type ) ? $data->gallery_type : '',
					),
					'size_array'    => $size_array,
					'image_src'     => $image_src,
					'image_meta'    => $image_meta,
					'attachment_id' => $attachment_id,
					'lazy'          => ! empty( $data->lazyLoad ),
					'data'          => $data,
				)
			);
			if ( $sizes && is_string( $sizes ) ) {
				$img_attrs['sizes'] = $sizes;
			}
		}

		return $img_attrs;
	}

	/**
	 * Build final image tag HTML
	 *
	 * @param array  $img_attrs Image attributes
	 * @param object $data      Item data object
	 * @return string Image HTML tag
	 */
	private function build_image_tag( $img_attrs, $data ) {
		// Add native browser lazy loading if enabled
		if ( ! empty( $data->lazyLoad ) ) {
			$img_attrs['loading'] = 'lazy';
		}

		return '<img ' . Modula_Helper::generate_attributes( $img_attrs ) . ' />';
	}
}
