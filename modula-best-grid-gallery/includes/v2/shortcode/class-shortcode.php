<?php

/**
 * Modula v2 Shortcode.
 * Full shortcode implementation: reads from modula_settings_v2 and modula_images_v2 (JSON).
 * Fallback to legacy meta when v2 is empty.
 *
 * @package Modula
 */

namespace Modula\V2\Shortcode;

defined( 'ABSPATH' ) || exit;

/**
 * Class Shortcode
 *
 * Handles [modula] output: minimal HTML + JSON for modern frontend. Data from v2 JSON.
 */
class Shortcode {


	/** @var \Modula_Item_Data_Processor */
	private $item_processor;


	/**
	 * Constructor.
	 *
	 * @param bool $register_shortcode When false, only builds payloads (e.g. REST bootstrap) without registering [modula].
	 */
	public function __construct( $register_shortcode = true ) {
		$this->item_processor = new \Modula_Item_Data_Processor();

		if ( ! $register_shortcode ) {
			return;
		}

		add_shortcode( 'modula', array( $this, 'render' ) );
		add_shortcode( 'Modula', array( $this, 'render' ) );

		add_action( 'modula_shortcode_after_items', 'modula_show_schemaorg', 90 );
		add_action( 'modula_shortcode_after_items', 'modula_edit_gallery', 100 );
	}

	/**
	 * Build the same JSON payload as the shortcode prints in the page (settings + items + metadata).
	 * Used by REST bootstrap so admin / JS can hydrate without inline JSON.
	 *
	 * @param int    $gallery_id Gallery post ID.
	 * @param string $align      Shortcode align attribute (optional).
	 * @param string $context    `public` (default) or `settings_editor` — editor preview: full item list, no filter/pagination UI data.
	 * @return array|null Gallery data array or null if settings are missing.
	 */
	public function get_bootstrap_payload( $gallery_id, $align = '', $context = 'public' ) {
		$settings = $this->get_gallery_settings( $gallery_id, $align );
		if ( empty( $settings ) ) {
			return null;
		}

		$shuffle_seed = null;
		$images       = $this->get_gallery_images( $gallery_id, $settings['flat'], $context, $shuffle_seed );
		if ( ! is_array( $images ) ) {
			$images = array();
		}

		return $this->build_gallery_data( $gallery_id, $settings, $images, $context, $shuffle_seed );
	}

	/**
	 * Render gallery shortcode.
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string Gallery HTML.
	 */
	public function render( $atts ) {
		$atts = $this->parse_attributes( $atts );

		$gallery_id = $this->validate_gallery_id( $atts['id'] );
		if ( ! $gallery_id ) {
			return esc_html__( 'Gallery not found.', 'modula-best-grid-gallery' );
		}

		$gallery = $this->get_gallery_post( $gallery_id );
		if ( ! $gallery ) {
			return esc_html__( 'Gallery not found.', 'modula-best-grid-gallery' );
		}

		$settings = $this->get_gallery_settings( $gallery_id, $atts['align'] );
		if ( empty( $settings ) ) {
			return esc_html__( 'Gallery not found.', 'modula-best-grid-gallery' );
		}

		$pre_output = $this->check_pre_output_filter( $settings['flat'], $gallery );
		if ( false !== $pre_output ) {
			return $pre_output;
		}

		$shuffle_seed = null;
		$images       = $this->get_gallery_images( $gallery_id, $settings['flat'], 'public', $shuffle_seed );
		if ( empty( $images ) ) {
			return esc_html__( 'Gallery not found.', 'modula-best-grid-gallery' );
		}

		$this->enqueue_assets( $settings['flat'], $images );
		$this->enqueue_content_block_google_fonts_for_images( $images );
		\Modula_Frontend_Adapter::prime_embedded_content_block_assets( $images );

		$gallery_data    = $this->build_gallery_data( $gallery_id, $settings, $images, 'public', $shuffle_seed );
		$images_for_html = $images;
		if (
			! empty( $gallery_data['metadata']['catalogPaged'] )
			&& \Modula\V2\Modern_Gallery::is_pagination_mode_enabled( $settings['flat'] )
		) {
			$images_for_html = $this->slice_images_for_first_page(
				$images,
				$gallery_data['pagination']['perPage'] ?? 12
			);
		}

		return $this->render_output( $gallery_id, $settings, $gallery_data, $images_for_html );
	}

	private function parse_attributes( $atts ) {
		return wp_parse_args(
			$atts,
			array(
				'id'    => false,
				'align' => '',
			)
		);
	}

	private function validate_gallery_id( $gallery_id ) {
		if ( ! $gallery_id ) {
			return false;
		}
		return absint( $gallery_id );
	}

	private function get_gallery_post( $gallery_id ) {
		$gallery = get_post( $gallery_id );

		if ( ! $gallery ) {
			return null;
		}

		if ( 'private' === $gallery->post_status && ! is_user_logged_in() ) {
			return null;
		}

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
	 * Get gallery settings from v2 JSON (modula_settings_v2), with legacy fallback.
	 * Returns a bag: grouped (for frontend JSON), flat (for PHP item processor/filters), type, align, gallery_id.
	 *
	 * @param int    $gallery_id Gallery ID.
	 * @param string $align      Alignment attribute.
	 * @return array{grouped: array, flat: array, type: string, align: string, gallery_id: string}
	 */
	private function get_gallery_settings( $gallery_id, $align ) {
		$grouped = \Modula\V2\Meta_Sync::get_settings_v2( $gallery_id );

		if ( ! empty( $grouped ) && is_array( $grouped ) ) {
			\Modula\V2\Settings\Adapter::enrich_video_media_urls( $grouped );
			$flat = \Modula\V2\Settings\Adapter::to_flat( $grouped );
			$flat = $this->normalize_flat( $flat, $gallery_id, $align );
			$type = $flat['type'] ?? 'creative-gallery';
			return array(
				'grouped'    => $grouped,
				'flat'       => $flat,
				'type'       => $type,
				'align'      => $align,
				'gallery_id' => $flat['gallery_id'],
			);
		}

		$raw     = apply_filters(
			'modula_backwards_compatibility_front',
			get_post_meta( $gallery_id, 'modula-settings', true )
		);
		$flat    = $this->normalize_flat( is_array( $raw ) ? $raw : array(), $gallery_id, $align );
		$grouped = \Modula\V2\Settings\Adapter::to_grouped( $flat, array( 'legacy_import' => true ) );

		return array(
			'grouped'    => $grouped,
			'flat'       => $flat,
			'type'       => $flat['type'] ?? 'creative-gallery',
			'align'      => $align,
			'gallery_id' => $flat['gallery_id'],
		);
	}

	/**
	 * Normalize flat array: merge defaults, add gallery_id, type, align.
	 *
	 * @param array  $flat       Flat settings.
	 * @param int    $gallery_id Gallery ID.
	 * @param string $align      Alignment.
	 * @return array
	 */
	private function normalize_flat( array $flat, $gallery_id, $align ) {
		$defaults = \Modula_CPT_Fields_Helper::get_defaults();

		if ( isset( $flat['type'] ) && 'grid' === $flat['type'] && empty( $flat['grid_type'] ) ) {
			unset( $flat['grid_type'] );
		}

		$flat = wp_parse_args( $flat, $defaults );

		$flat['gallery_id'] = 'modula-' . $gallery_id;
		$flat['type']       = $flat['type'] ?? 'creative-gallery';
		$flat['align']      = $align;

		return $flat;
	}

	private function check_pre_output_filter( $settings, $gallery ) {
		$pre_gallery_html = apply_filters( 'modula_pre_output_filter_check', false, $settings, $gallery );

		if ( false !== $pre_gallery_html ) {
			return apply_filters( 'modula_pre_output_filter', '', $settings, $gallery );
		}

		return false;
	}

	/**
	 * Get gallery images from v2 JSON (modula_images_v2), with legacy fallback.
	 *
	 * @param int    $gallery_id Gallery ID.
	 * @param array  $settings   Gallery settings.
	 * @param string   $context      `public` (default) or `settings_editor` — editor preview keeps modula-images order (no shuffle).
	 * @param int|null $shuffle_seed When shuffle is on, optional seed for a stable order within one page load (REST pagination). Generated when null.
	 * @return array Gallery images.
	 */
	public function get_gallery_images( $gallery_id, $settings, $context = 'public', &$shuffle_seed = null ) {
		$images = \Modula\V2\Meta_Sync::get_images_v2( $gallery_id );

		if ( empty( $images ) || ! is_array( $images ) ) {
			$images = \Modula\V2\Meta_Sync::get_gallery_images_with_embedded_fallback( $gallery_id );
		} else {
			$images = \Modula\V2\Meta_Sync::ensure_embedded_rows_in_gallery_images_list( $gallery_id, $images );
		}

		if ( ! is_array( $images ) ) {
			$images = array();
		}

		if ( class_exists( '\Modula\Bound_Gallery\Bound_Gallery', false ) ) {
			$images = \Modula\Bound_Gallery\Bound_Gallery::apply_derived_catalog( $gallery_id, $images );
		}

		if ( empty( $images ) ) {
			return array();
		}

		$images = apply_filters( 'modula_gallery_before_shuffle_images', $images, $settings );

		$type              = $settings['type'] ?? 'creative-gallery';
		$shuffle_permitted = apply_filters(
			'modula_shuffle_grid_types',
			array( 'creative-gallery', 'grid', 'justified-grid', 'parallax-masonry', 'uniform-grid', 'fit-grid', 'polaroid' ),
			$settings
		);

		$shuffle_on     = ! empty( $settings['shuffle'] ) && ( true === $settings['shuffle'] || '1' === $settings['shuffle'] || 1 === $settings['shuffle'] );
		$editor_preview = is_string( $context ) && 'settings_editor' === $context;
		$has_embedded   = $this->list_contains_embedded_items( $images );
		if ( $shuffle_on && in_array( $type, $shuffle_permitted, true ) && ! $editor_preview && ! $has_embedded ) {
			if ( null === $shuffle_seed || (int) $shuffle_seed <= 0 ) {
				$shuffle_seed = random_int( 1, 2147483647 );
			}
			$images = $this->shuffle_gallery_images( $images, (int) $shuffle_seed );
		}

		$images = $this->apply_image_reports( $images );

		return apply_filters( 'modula_gallery_images', $images, $settings );
	}

	private function apply_image_reports( $images ) {
		if ( empty( $images ) ) {
			return $images;
		}

		$image_ids = array();
		foreach ( $images as $im ) {
			if ( ! is_array( $im ) || \Modula\V2\Images\Adapter::is_embedded_gallery_item( $im ) ) {
				continue;
			}
			if ( ! isset( $im['id'] ) ) {
				continue;
			}
			$iid = absint( $im['id'] );
			if ( $iid > 0 ) {
				$image_ids[] = $iid;
			}
		}
		$image_ids = array_values( array_unique( $image_ids ) );
		if ( empty( $image_ids ) ) {
			return $images;
		}

		$alt_texts = $this->get_image_alt_texts( $image_ids );
		$post_data = $this->get_image_post_data( $image_ids );

		foreach ( $images as &$image ) {
			if ( ! isset( $image['id'] ) ) {
				continue;
			}

			$image_id = absint( $image['id'] );

			if ( isset( $alt_texts[ $image_id ] ) ) {
				$image['alt'] = $alt_texts[ $image_id ];
			}

			if ( isset( $post_data[ $image_id ] ) ) {
				$post           = $post_data[ $image_id ];
				$image['title'] = $post->post_title;
				// Match attachment “Description” (post_content) and REST patch / rest_build_single_image_row(); caption stays excerpt.
				$image['description'] = $post->post_content;
				$image['caption']     = $post->post_excerpt;
			}
		}

		return $images;
	}

	private function get_image_alt_texts( $image_ids ) {
		global $wpdb;

		if ( empty( $image_ids ) ) {
			return array();
		}

		$placeholders = implode( ',', array_fill( 0, count( $image_ids ), '%d' ) );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
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
		// phpcs:enable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		$alt_texts = array();
		foreach ( $results as $post_id => $row ) {
			$alt_texts[ absint( $post_id ) ] = $row->meta_value;
		}

		return $alt_texts;
	}

	private function get_image_post_data( $image_ids ) {
		global $wpdb;

		if ( empty( $image_ids ) ) {
			return array();
		}

		$placeholders = implode( ',', array_fill( 0, count( $image_ids ), '%d' ) );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT ID, post_title, post_excerpt, post_content 
				FROM {$wpdb->posts} 
				WHERE ID IN ({$placeholders})",
				$image_ids
			),
			OBJECT_K
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		$post_data = array();
		foreach ( $results as $post_id => $post ) {
			$post_data[ absint( $post_id ) ] = $post;
		}

		return $post_data;
	}

	/**
	 * @param array<string, mixed>             $settings Gallery flat settings.
	 * @param array<int, array<string, mixed>> $images   Gallery rows (for Pro extension scripts).
	 */
	private function enqueue_assets( $settings, $images = array() ) {
		$css_handle = 'modula-gallery';
		$css_path   = MODULA_URL . 'assets/css/front/modula-gallery.css';
		$css_file   = MODULA_PATH . 'assets/css/front/modula-gallery.css';

		if ( file_exists( $css_file ) && ! wp_style_is( $css_handle, 'enqueued' ) ) {
			wp_enqueue_style( $css_handle, $css_path, array(), MODULA_LITE_VERSION );
			\Modula\V2\Modern_Gallery::attach_gallery_chrome_inline_style( $css_handle );
		}

		$script_handle = 'modula-gallery';
		$script_path   = MODULA_URL . 'assets/js/front/modula-gallery.js';
		$script_file   = MODULA_PATH . 'assets/js/front/modula-gallery.js';

		if ( file_exists( $script_file ) && ! wp_script_is( $script_handle, 'enqueued' ) ) {
			wp_enqueue_script( $script_handle, $script_path, array(), MODULA_LITE_VERSION, true );
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

		\Modula\V2\Modern_Gallery::enqueue_bootstrap_stylesheet();
		\Modula\V2\Modern_Gallery::attach_gallery_chrome_inline_style( 'modula-gallery-bootstrap' );
		\Modula\V2\Modern_Gallery::preload_bootstrap_stylesheet();

		/**
		 * Legacy shortcode fires this after enqueue; v2 must too so Pro extensions (e.g. image licensing CSS) load.
		 *
		 * @hook modula_extra_scripts
		 */
		do_action( 'modula_extra_scripts', $settings, is_array( $images ) ? $images : array() );
	}

	/**
	 * Enqueue self-hosted web fonts for content_block rows that use `gf-*` presets.
	 *
	 * @param array<int, mixed> $images Gallery rows (attachments + embedded).
	 */
	private function enqueue_content_block_google_fonts_for_images( $images ) {
		if ( ! is_array( $images ) ) {
			return;
		}
		$presets = array();
		foreach ( $images as $row ) {
			if ( ! is_array( $row ) || ! \Modula\V2\Images\Adapter::is_embedded_gallery_item( $row ) ) {
				continue;
			}
			if ( \Modula\V2\Images\Adapter::ITEM_KIND_CONTENT_BLOCK !== \Modula\V2\Images\Adapter::get_item_kind( $row ) ) {
				continue;
			}
			$fp = isset( $row['blockFontPreset'] ) ? sanitize_key( (string) $row['blockFontPreset'] ) : '';
			if ( '' !== $fp && 0 === strpos( $fp, 'gf-' ) ) {
				$presets[] = $fp;
			}
		}
		\Modula_Frontend_Adapter::enqueue_content_block_font_stylesheets_for_presets( $presets );
	}

	private function build_gallery_data( $gallery_id, $settings, $images, $context = 'public', $shuffle_seed = null ) {
		$context        = is_string( $context ) ? $context : 'public';
		$editor_preview = ( 'settings_editor' === $context );

		$flat    = $settings['flat'];
		$grouped = $settings['grouped'];
		if ( ! $editor_preview && ! current_user_can( 'edit_post', $gallery_id ) ) {
			$grouped = \Modula\V2\Rest\Settings_Controller::redact_settings_for_public( $grouped );
		}
		$type         = $settings['type'];
		$total_images = is_array( $images ) ? count( $images ) : 0;

		$server_catalog = \Modula\V2\Modern_Gallery::gallery_needs_server_item_catalog(
			absint( $gallery_id ),
			$total_images,
			$flat
		);

		$effective_catalog = $server_catalog && ! $editor_preview;

		$pagination_cfg = $this->build_pagination_config( $grouped, $flat, $total_images, $effective_catalog );
		$filtering_cfg  = $this->build_filtering_config( $grouped, $effective_catalog );

		$types_without_chrome = $this->get_types_without_filter_pagination_chrome();
		$skips_chrome         = in_array( $type, $types_without_chrome, true );

		if ( ! $editor_preview && $skips_chrome ) {
			$filtering_cfg['enabled']       = false;
			$filtering_cfg['type']          = 'client';
			$filtering_cfg['activeFilters'] = array();

			$pagination_cfg['enabled']     = false;
			$pagination_cfg['type']        = 'client';
			$pagination_cfg['mode']        = 'page';
			$pagination_cfg['currentPage'] = 1;
			$pagination_cfg['totalPages']  = 1;
			$pagination_cfg['totalItems']  = $total_images;
			$effective_catalog             = false;
		}

		$images_for_items   = $images;
		$pagination_mode_on = $skips_chrome
			? false
			: \Modula\V2\Modern_Gallery::is_pagination_mode_enabled( $flat );
		if ( $effective_catalog && $pagination_mode_on && is_array( $images ) ) {
			$images_for_items = $this->slice_images_for_first_page( $images, $pagination_cfg['perPage'] ?? 12 );
		}

		$items = $this->build_converted_items_list( $gallery_id, $flat, $images_for_items, $images, $context );

		$metadata = array(
			'galleryId'            => $gallery_id,
			'galleryTitle'         => $this->resolve_bootstrap_gallery_title( $gallery_id ),
			'hoverCustomCursorUrl' => $this->resolve_hover_custom_cursor_url( $flat, $grouped ),
			'outputSchema'         => \Modula\V2\Modern_Gallery::OUTPUT_SCHEMA_VERSION,
			'catalogPaged'         => $effective_catalog,
			'imageSizeDimensions'  => \Modula_Helper::get_image_sizes( false ),
		);
		if ( ! $editor_preview && null !== $shuffle_seed && (int) $shuffle_seed > 0 ) {
			$metadata['shuffleSeed'] = (int) $shuffle_seed;
		}

		$gallery_data = array(
			'settings'       => $grouped,
			'legacyJsConfig' => $this->build_legacy_js_config( $flat, $type ),
			'items'          => $items,
			'metadata'       => array_merge(
				$metadata,
				$this->build_licensing_metadata( $flat )
			),
			'pagination'     => $pagination_cfg,
			'filtering'      => $filtering_cfg,
		);

		if ( ! $editor_preview ) {
			$gallery_data['shareButtons'] = \Modula_Helper::render_lightbox_share_template();
		}

		if ( $effective_catalog ) {
			$gallery_data['catalogApi'] = array(
				'itemsUrl' => rest_url( 'modula/v2/gallery/' . absint( $gallery_id ) . '/items' ),
			);
		}

		$gallery_data = apply_filters( 'modula_modern_shortcode_data', $gallery_data, $flat, $gallery_id );

		if ( ! $editor_preview ) {
			return $gallery_data;
		}

		return $this->apply_editor_preview_bootstrap( $gallery_data, $gallery_id, $type );
	}

	/**
	 * Gallery types that disable filter/pagination chrome on the public frontend.
	 *
	 * @return array<int, string>
	 */
	private function get_types_without_filter_pagination_chrome() {
		return array( 'slider', 'story', 'parallax-masonry', 'bnb', 'video' );
	}

	/**
	 * First-page slice for server-catalog HTML / bootstrap items.
	 *
	 * @param array<int, mixed> $images   Full gallery rows.
	 * @param int               $per_page Items per page.
	 * @return array<int, mixed>
	 */
	private function slice_images_for_first_page( $images, $per_page ) {
		if ( ! is_array( $images ) ) {
			return array();
		}

		$per = (int) $per_page;
		if ( $per < 1 ) {
			$per = 12;
		}

		return array_slice( $images, 0, $per );
	}

	/**
	 * Settings-editor bootstrap: canonical row indexes + disable public chrome.
	 *
	 * @param array<string, mixed> $gallery_data Bootstrap payload.
	 * @param int                  $gallery_id   Gallery post ID.
	 * @param string               $type         Gallery type slug.
	 * @return array<string, mixed>
	 */
	private function apply_editor_preview_bootstrap( array $gallery_data, $gallery_id, $type ) {
		/*
		 * Bootstrap order may differ from modula-images (e.g. shuffle on load). REST
		 * replace/remove/patch use raw modula-images indices — expose canonical row index per item.
		 */
		$gallery_data = $this->attach_canonical_modula_row_indexes( $gallery_data, $gallery_id );

		$item_count = isset( $gallery_data['items'] ) && is_array( $gallery_data['items'] )
			? count( $gallery_data['items'] )
			: 0;

		$gallery_data['metadata']['catalogPaged']   = false;
		$gallery_data['metadata']['displayContext'] = 'settings-editor-preview';
		/*
		 * Story: never rely on Fancyapps Carousel in the settings-editor preview bootstrap.
		 * Carousel init reparents DOM and breaks React-controlled admin toolbars; the app
		 * renders a static slide stack instead (see StoryLayout staticStoryLayout branch).
		 */
		if ( 'story' === $type ) {
			$gallery_data['metadata']['staticStoryLayout'] = true;
		}

		$sorting_meta                               = get_post_meta( $gallery_id, 'modulaSorting', true );
		$gallery_data['metadata']['gallerySorting'] = is_string( $sorting_meta ) && '' !== $sorting_meta
			? $sorting_meta
			: 'manual';
		$gallery_data['pagination']['enabled']      = false;
		$gallery_data['pagination']['type']         = 'client';
		$gallery_data['pagination']['mode']         = 'page';
		$gallery_data['pagination']['currentPage']  = 1;
		$gallery_data['pagination']['totalPages']   = 1;
		$gallery_data['pagination']['totalItems']   = $item_count;
		$gallery_data['filtering']['enabled']       = false;
		$gallery_data['filtering']['type']          = 'client';
		$gallery_data['filtering']['activeFilters'] = array();

		unset( $gallery_data['catalogApi'] );

		return $gallery_data;
	}

	/**
	 * Map each image item to its index in raw `modula-images` meta.
	 *
	 * @param array<string, mixed> $gallery_data Bootstrap payload.
	 * @param int                  $gallery_id   Gallery post ID.
	 * @return array<string, mixed>
	 */
	private function attach_canonical_modula_row_indexes( array $gallery_data, $gallery_id ) {
		if ( ! isset( $gallery_data['items'] ) || ! is_array( $gallery_data['items'] ) ) {
			return $gallery_data;
		}

		$canonical_rows = class_exists( '\Modula\Bound_Gallery\Bound_Gallery', false )
			? \Modula\Bound_Gallery\Bound_Gallery::get_image_rows( $gallery_id )
			: get_post_meta( $gallery_id, 'modula-images', true );
		if ( ! is_array( $canonical_rows ) ) {
			$canonical_rows = array();
		}
		if ( count( $canonical_rows ) < 1 ) {
			return $gallery_data;
		}

		$row_index_by_id = array();
		foreach ( $canonical_rows as $idx => $row ) {
			if ( ! is_array( $row ) || ! isset( $row['id'] ) ) {
				continue;
			}
			$row_index_by_id[ (string) $row['id'] ] = (int) $idx;
		}

		foreach ( $gallery_data['items'] as &$item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}
			if ( ! empty( $item['itemKind'] ) && \Modula\V2\Images\Adapter::ITEM_KIND_IMAGE !== $item['itemKind'] ) {
				continue;
			}

			$id = isset( $item['id'] ) ? (string) $item['id'] : '';
			// Attachment ids and video template ids (`video_template_N`) both live in modula-images.
			if ( '' === $id || ! isset( $row_index_by_id[ $id ] ) ) {
				continue;
			}

			$item['modulaRowIndex'] = $row_index_by_id[ $id ];
		}
		unset( $item );

		return $gallery_data;
	}

	/**
	 * Legacy JS config blob for Pro extensions still hooked on modula_gallery_settings.
	 * React merges non-overlapping keys via settingsToConfig legacyJsConfig fallback.
	 *
	 * @param array  $flat Flat gallery settings.
	 * @param string $type Gallery type slug.
	 * @return array<string, mixed>
	 */
	private function build_legacy_js_config( array $flat, $type ) {
		$inview_permitted = apply_filters(
			'modula_loading_inview_grids',
			array( 'custom-grid', 'creative-gallery', 'grid', 'polaroid' ),
			$flat
		);
		$in_view          = false;
		if ( ! empty( $flat['inView'] ) && in_array( $type, $inview_permitted, true ) ) {
			$in_view = true;
		}

		if ( ! class_exists( 'Modula_Shortcode' ) ) {
			return array();
		}

		return \Modula_Shortcode::get_jsconfig( $flat, $type, $in_view );
	}

	/**
	 * Build bootstrap item objects for a slice of raw rows (server catalog REST).
	 *
	 * @param int                                $gallery_id   Gallery post ID.
	 * @param array                              $flat         Flat settings.
	 * @param array<int, array<string, mixed>>   $rows_slice   Rows for this page.
	 * @param array<int, array<string, mixed>>   $full_context Full row list (for processor context).
	 * @return array<int, mixed>
	 */
	public function build_bootstrap_items_batch( $gallery_id, array $flat, array $rows_slice, array $full_context ) {
		return $this->build_converted_items_list( $gallery_id, $flat, $rows_slice, $full_context, 'public' );
	}

	/**
	 * @param array<int, array<string, mixed>> $rows_to_convert Rows to turn into frontend items.
	 * @param array<int, array<string, mixed>> $full_images      Full gallery rows for filters/hooks context.
	 * @param string                             $context          `public` or `settings_editor`.
	 * @return array<int, mixed>
	 */
	private function build_converted_items_list( $gallery_id, array $flat, array $rows_to_convert, array $full_images, $context = 'public' ) {
		$skip_image_guardian = is_string( $context ) && 'settings_editor' === $context;
		$items               = array();

		if ( $skip_image_guardian ) {
			add_filter( 'modula_apply_image_guardian_item_data', '__return_false' );
		}

		foreach ( $rows_to_convert as $image ) {
			if ( is_array( $image ) && \Modula\V2\Images\Adapter::is_embedded_gallery_item( $image ) ) {
				$embedded = \Modula_Frontend_Adapter::convert_embedded_gallery_item_for_json( $image, $flat, $context );
				if ( empty( $embedded ) || ! is_array( $embedded ) ) {
					continue;
				}
				$items[] = $embedded;
				continue;
			}

			if ( ! $this->is_valid_image( $image ) ) {
				continue;
			}

			$image     = apply_filters( 'modula_shortcode_image_data', $image, $flat );
			$item_data = $this->item_processor->process( $image, $flat, $gallery_id, $full_images );
			$item_data = apply_filters( 'modula_shortcode_item_data', $item_data, $image, $flat, $full_images );

			if ( 'public' === $context && is_array( $item_data ) ) {
				/**
				 * V2 bootstrap: same licensing ld+json hook surface as legacy per-item render.
				 *
				 * @hook modula_v2_shortcode_after_item
				 */
				do_action( 'modula_v2_shortcode_after_item', $flat, $item_data );
			}

			$converted_item = \Modula_Frontend_Adapter::convert_item_from_item_data( $item_data, $image, $flat, $full_images );
			if ( ! $converted_item ) {
				continue;
			}

			$items[] = $converted_item;
		}

		if ( $skip_image_guardian ) {
			remove_filter( 'modula_apply_image_guardian_item_data', '__return_false' );
			$items = $this->apply_settings_editor_media_cache_bust( $items, $flat );
		}

		return $items;
	}

	/**
	 * Append a cache-busting query arg to preview media URLs.
	 *
	 * Settings-editor preview reuses the same attachment path after watermark
	 * apply/remove; browsers keep serving the previous bytes without a new query.
	 *
	 * @param array<int, mixed>    $items Bootstrap items.
	 * @param array<string, mixed> $flat  Flat gallery settings.
	 * @return array<int, mixed>
	 */
	private function apply_settings_editor_media_cache_bust( array $items, array $flat ) {
		$options_token = $this->build_settings_editor_watermark_cache_token( $flat );

		foreach ( $items as $index => $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$attachment_id = isset( $item['id'] ) ? absint( $item['id'] ) : 0;
			$file_token    = '';
			if ( $attachment_id > 0 ) {
				$path = get_attached_file( $attachment_id );
				if ( is_string( $path ) && '' !== $path && file_exists( $path ) ) {
					$file_token = (string) filemtime( $path );
				}
				$modified = get_post_modified_time( 'U', true, $attachment_id );
				if ( $modified ) {
					$file_token = '' !== $file_token ? $file_token . '.' . (string) $modified : (string) $modified;
				}
			}

			$bust = trim( $file_token . '-' . $options_token, '-' );
			if ( '' !== $bust ) {
				$item = $this->append_cache_bust_to_bootstrap_item( $item, $bust );
			}

			if ( $attachment_id > 0 ) {
				$item['watermarkApplied'] = (bool) get_post_meta( $attachment_id, 'modula_watermark_applied', true );
			}

			$items[ $index ] = $item;
		}

		return $items;
	}

	/**
	 * Stable token from watermark placement/size settings (editor preview only).
	 *
	 * @param array<string, mixed> $flat Flat gallery settings.
	 * @return string
	 */
	private function build_settings_editor_watermark_cache_token( array $flat ) {
		$payload = array(
			isset( $flat['watermark_position'] ) ? (string) $flat['watermark_position'] : '',
			isset( $flat['watermark_margin'] ) ? (string) $flat['watermark_margin'] : '',
			isset( $flat['watermark_image_dimension_width'] ) ? (string) $flat['watermark_image_dimension_width'] : '',
			isset( $flat['watermark_image_dimension_height'] ) ? (string) $flat['watermark_image_dimension_height'] : '',
			isset( $flat['watermark_image'] ) ? (string) $flat['watermark_image'] : '',
			isset( $flat['enable_watermark'] ) ? (string) $flat['enable_watermark'] : '',
		);

		return substr( md5( wp_json_encode( $payload ) ), 0, 12 );
	}

	/**
	 * @param array<string, mixed> $item Bootstrap item row.
	 * @param string               $bust Cache-bust token.
	 * @return array<string, mixed>
	 */
	private function append_cache_bust_to_bootstrap_item( array $item, $bust ) {
		$url_keys = array( 'src', 'url', 'thumbnail', 'image_full' );
		foreach ( $url_keys as $key ) {
			if ( ! empty( $item[ $key ] ) && is_string( $item[ $key ] ) ) {
				$item[ $key ] = $this->append_modula_cache_bust_query_arg( $item[ $key ], $bust );
			}
		}

		if ( ! empty( $item['srcset'] ) && is_string( $item['srcset'] ) ) {
			$item['srcset'] = $this->append_modula_cache_bust_to_srcset( $item['srcset'], $bust );
		}

		foreach ( array( 'imgAttributes', 'img_attributes' ) as $attrs_key ) {
			if ( empty( $item[ $attrs_key ] ) || ! is_array( $item[ $attrs_key ] ) ) {
				continue;
			}
			$attrs = $item[ $attrs_key ];
			foreach ( array( 'src', 'data-src', 'data-full' ) as $attr_key ) {
				if ( ! empty( $attrs[ $attr_key ] ) && is_string( $attrs[ $attr_key ] ) ) {
					$attrs[ $attr_key ] = $this->append_modula_cache_bust_query_arg( $attrs[ $attr_key ], $bust );
				}
			}
			foreach ( array( 'srcset', 'data-srcset' ) as $attr_key ) {
				if ( ! empty( $attrs[ $attr_key ] ) && is_string( $attrs[ $attr_key ] ) ) {
					$attrs[ $attr_key ] = $this->append_modula_cache_bust_to_srcset( $attrs[ $attr_key ], $bust );
				}
			}
			$item[ $attrs_key ] = $attrs;
		}

		return $item;
	}

	/**
	 * @param string $url  Absolute or relative media URL.
	 * @param string $bust Cache-bust token.
	 * @return string
	 */
	private function append_modula_cache_bust_query_arg( $url, $bust ) {
		if ( ! is_string( $url ) || '' === $url ) {
			return $url;
		}

		return add_query_arg( 'modula_wm', (string) $bust, $url );
	}

	/**
	 * @param string $srcset HTML srcset value.
	 * @param string $bust   Cache-bust token.
	 * @return string
	 */
	private function append_modula_cache_bust_to_srcset( $srcset, $bust ) {
		if ( ! is_string( $srcset ) || '' === $srcset ) {
			return $srcset;
		}

		$parts = array_map( 'trim', explode( ',', $srcset ) );
		$out   = array();
		foreach ( $parts as $part ) {
			if ( '' === $part ) {
				continue;
			}
			if ( preg_match( '/^(\S+)(\s+.*)?$/', $part, $matches ) ) {
				$url   = $this->append_modula_cache_bust_query_arg( $matches[1], $bust );
				$out[] = $url . ( isset( $matches[2] ) ? $matches[2] : '' );
				continue;
			}
			$out[] = $part;
		}

		return implode( ', ', $out );
	}

	/**
	 * Post title for gallery-level heading (React `metadata.galleryTitle`).
	 *
	 * @param int $gallery_id Gallery post ID.
	 * @return string Empty when missing or placeholder draft title.
	 */
	private function resolve_bootstrap_gallery_title( $gallery_id ) {
		$title = get_post_field( 'post_title', $gallery_id );
		$title = is_string( $title ) ? trim( $title ) : '';
		if ( '' === $title ) {
			return '';
		}

		$auto_draft = __( 'Auto Draft', 'default' ); // phpcs:ignore WordPress.WP.I18n.TextDomainMismatch -- match core auto-draft title.
		if ( $auto_draft === $title ) {
			return '';
		}

		return $title;
	}

	/**
	 * Attachment URL for custom hover cursor (React dynamic CSS + editor preview).
	 *
	 * @param array<string, mixed> $flat    Flat gallery settings.
	 * @param array<string, mixed> $grouped Grouped v2 settings.
	 * @return string
	 */
	private function resolve_hover_custom_cursor_url( array $flat, array $grouped ) {
		$cursor = '';
		if ( isset( $flat['cursor'] ) ) {
			$cursor = (string) $flat['cursor'];
		} elseif ( isset( $grouped['hover']['cursor'] ) ) {
			$cursor = (string) $grouped['hover']['cursor'];
		}

		if ( 'custom' !== $cursor ) {
			return '';
		}

		$attachment_id = 0;
		if ( isset( $flat['uploadCursor'] ) ) {
			$attachment_id = absint( $flat['uploadCursor'] );
		} elseif ( isset( $grouped['hover']['uploadCursor'] ) ) {
			$attachment_id = absint( $grouped['hover']['uploadCursor'] );
		}

		if ( $attachment_id <= 0 ) {
			return '';
		}

		$image_src = wp_get_attachment_image_src( $attachment_id, 'full' );
		if ( ! is_array( $image_src ) || empty( $image_src[0] ) ) {
			return '';
		}

		return (string) $image_src[0];
	}

	/**
	 * Licensing catalog + author/company for the React gallery bootstrap.
	 *
	 * Gallery flat `image_licensing_author` / `image_licensing_company` override
	 * the site-wide Modula image licensing option when non-empty.
	 *
	 * @param array<string, mixed> $flat Flat gallery settings.
	 * @return array<string, mixed>
	 */
	private function build_licensing_metadata( array $flat = array() ) {
		$global = get_option( 'modula_image_licensing_option', false );
		if ( ! is_array( $global ) ) {
			$legacy = get_option( 'modula_image_licensing_option ', false );
			$global = is_array( $legacy ) ? $legacy : array();
		}

		$catalog        = \Modula_Helper::get_image_licenses();
		$public_catalog = array();
		foreach ( $catalog as $key => $entry ) {
			if ( ! is_array( $entry ) ) {
				continue;
			}
			$public_catalog[ (string) $key ] = array(
				'name'    => isset( $entry['name'] ) ? (string) $entry['name'] : '',
				'license' => isset( $entry['license'] ) ? (string) $entry['license'] : '',
				'image'   => isset( $entry['image'] ) ? (string) $entry['image'] : '',
			);
		}

		$global_author   = isset( $global['image_licensing_author'] ) ? (string) $global['image_licensing_author'] : '';
		$global_company  = isset( $global['image_licensing_company'] ) ? (string) $global['image_licensing_company'] : '';
		$gallery_author  = isset( $flat['image_licensing_author'] ) ? trim( (string) $flat['image_licensing_author'] ) : '';
		$gallery_company = isset( $flat['image_licensing_company'] ) ? trim( (string) $flat['image_licensing_company'] ) : '';

		return array(
			'licensingGlobal'               => array(
				'author'  => '' !== $gallery_author ? $gallery_author : $global_author,
				'company' => '' !== $gallery_company ? $gallery_company : $global_company,
			),
			'licenseCatalog'                => $public_catalog,
			'imageLicensingExtensionActive' => $this->is_image_licensing_extension_active(),
		);
	}

	/**
	 * Whether the Image Licensing Pro extension is active.
	 *
	 * @return bool
	 */
	private function is_image_licensing_extension_active() {
		if ( ! class_exists( 'Modula_Extensions_Base' ) ) {
			return false;
		}
		$extensions = \Modula_Extensions_Base::get_instance();
		if ( ! method_exists( $extensions, 'extension_enabled' ) ) {
			return false;
		}
		return (bool) $extensions->extension_enabled( 'modula-image-licensing' );
	}

	/**
	 * Pagination block for JSON bootstrap (client vs server).
	 *
	 * @param array<string, mixed> $grouped         Grouped v2 settings.
	 * @param array<string, mixed> $flat              Flat settings.
	 * @param int                  $total_images      Count after load (before Pro slice skip).
	 * @param bool                 $server_catalog    Server-side pages active.
	 * @return array<string, mixed>
	 */
	private function build_pagination_config( array $grouped, array $flat, $total_images, $server_catalog ) {
		$pg = isset( $grouped['pagination'] ) && is_array( $grouped['pagination'] ) ? $grouped['pagination'] : array();

		$per_page = \Modula\V2\Modern_Gallery::resolve_per_page_from_flat( $flat );
		if ( $per_page <= 0 ) {
			$per_page = 12;
		}

		$enabled = \Modula\V2\Modern_Gallery::is_pagination_mode_enabled( $flat );

		$type = '';
		if ( isset( $grouped['general']['type'] ) && is_string( $grouped['general']['type'] ) ) {
			$type = $grouped['general']['type'];
		} elseif ( isset( $flat['type'] ) ) {
			$type = (string) $flat['type'];
		}

		$mode = $this->resolve_pagination_mode( $enabled, $type, $pg, $grouped, $flat );
		$type = ( $server_catalog && $enabled ) ? 'server' : 'client';

		$total_pages = ( $enabled && $per_page > 0 ) ? (int) ceil( $total_images / $per_page ) : 1;
		if ( $total_pages < 1 ) {
			$total_pages = 1;
		}

		return array(
			'enabled'     => $enabled,
			'mode'        => $mode,
			'type'        => $type,
			'perPage'     => $per_page,
			'currentPage' => 1,
			'totalItems'  => $total_images,
			'totalPages'  => $total_pages,
		);
	}

	/**
	 * Resolve pagination UI mode: page | infinite-scroll | load-more.
	 *
	 * @param bool                 $enabled Pagination enabled.
	 * @param string               $type    Gallery type slug.
	 * @param array<string, mixed> $pg      Grouped pagination settings.
	 * @param array<string, mixed> $grouped Grouped v2 settings.
	 * @param array<string, mixed> $flat    Flat settings.
	 * @return string
	 */
	private function resolve_pagination_mode( $enabled, $type, array $pg, array $grouped, array $flat ) {
		if ( ! $enabled ) {
			return 'page';
		}

		if (
			$this->is_infinite_scroll_allowed_for_type( $type, $grouped, $flat )
			&& $this->is_truthy_setting( $pg['enableInfiniteScroll'] ?? null )
		) {
			return 'infinite-scroll';
		}

		if ( $this->is_truthy_setting( $pg['enableLoadMore'] ?? null ) ) {
			return 'load-more';
		}

		return 'page';
	}

	/**
	 * Whether infinite scroll is allowed for this gallery type.
	 *
	 * @param string               $type    Gallery type slug.
	 * @param array<string, mixed> $grouped Grouped v2 settings.
	 * @param array<string, mixed> $flat    Flat settings.
	 * @return bool
	 */
	private function is_infinite_scroll_allowed_for_type( $type, array $grouped, array $flat ) {
		if ( 'creative-gallery' === $type ) {
			return false;
		}

		if ( 'polaroid' !== $type ) {
			return true;
		}

		return $this->is_polaroid_uniform_size_on( $grouped, $flat );
	}

	/**
	 * Polaroid uniform size defaults on; explicit off disables infinite scroll.
	 *
	 * @param array<string, mixed> $grouped Grouped v2 settings.
	 * @param array<string, mixed> $flat    Flat settings.
	 * @return bool
	 */
	private function is_polaroid_uniform_size_on( array $grouped, array $flat ) {
		$polaroid_uniform = null;
		if ( isset( $grouped['polaroid']['uniformSize'] ) ) {
			$polaroid_uniform = $grouped['polaroid']['uniformSize'];
		} elseif ( isset( $flat['polaroid_uniform_size'] ) ) {
			$polaroid_uniform = $flat['polaroid_uniform_size'];
		}

		return ! (
			false === $polaroid_uniform
			|| 0 === $polaroid_uniform
			|| '0' === $polaroid_uniform
		);
	}

	/**
	 * Truthy check for mixed schema flags (bool|int|string).
	 *
	 * @param mixed $value Setting value.
	 * @return bool
	 */
	private function is_truthy_setting( $value ) {
		return true === $value || 1 === $value || '1' === $value;
	}

	/**
	 * Filtering config; server mode when catalog is paged on server and filters exist.
	 *
	 * @param array<string, mixed> $grouped          Grouped settings.
	 * @param bool                 $server_catalog   Whether bootstrap uses server pages.
	 * @return array<string, mixed>
	 */
	private function build_filtering_config( array $grouped, $server_catalog ) {
		$fg    = isset( $grouped['filters'] ) && is_array( $grouped['filters'] ) ? $grouped['filters'] : array();
		$names = isset( $fg['filters'] ) && is_array( $fg['filters'] ) ? $fg['filters'] : array();

		$available = array();
		foreach ( $names as $name ) {
			if ( ! is_string( $name ) ) {
				continue;
			}
			$name = trim( $name );
			if ( '' === $name ) {
				continue;
			}
			$available[] = array(
				'key'   => 'category',
				'label' => $name,
				'value' => $name,
			);
		}

		$enabled = count( $available ) > 0;
		if ( array_key_exists( 'showFilterBar', $fg ) ) {
			$show    = $fg['showFilterBar'];
			$show_on = ( true === $show || 1 === $show || '1' === (string) $show );
			$enabled = $enabled && $show_on;
		}
		$type = ( $enabled && $server_catalog ) ? 'server' : 'client';

		return array(
			'enabled'          => $enabled,
			'type'             => $type,
			'activeFilters'    => array(),
			'availableFilters' => $available,
		);
	}

	/**
	 * CSS custom properties for composable hover "dim" (overlay tint + hover strength).
	 *
	 * @param array<string, mixed> $flat Flat gallery settings.
	 * @return string Declarations for `style=""` or empty when not applicable.
	 */
	private function gallery_hover_dim_style_value( array $flat ): string {
		$b = isset( $flat['hover_builder'] ) && is_array( $flat['hover_builder'] ) ? $flat['hover_builder'] : null;
		if ( ! is_array( $b ) ) {
			return '';
		}
		$card_raw = isset( $b['cardTreatment'] ) ? $b['cardTreatment'] : ( $b['cardtreatment'] ?? '' );
		$card     = sanitize_key( (string) $card_raw );
		$dim_raw  = isset( $b['dimOverlay'] ) ? $b['dimOverlay'] : ( $b['dimoverlay'] ?? false );
		$dim_on   = ( true === $dim_raw || 1 === $dim_raw || '1' === (string) $dim_raw );
		if ( 'dim' === $card ) {
			$dim_on = true;
		}
		if ( ! $dim_on ) {
			return '';
		}
		$color_raw = isset( $flat['hoverColor'] ) ? (string) $flat['hoverColor'] : 'rgba(0,0,0,.5)';
		$parsed    = self::parse_hover_dim_color( $color_raw );
		if ( null === $parsed ) {
			$parsed = array(
				'r' => 0,
				'g' => 0,
				'b' => 0,
				'a' => 0.5,
			);
		}
		$color = sprintf( '#%02x%02x%02x', $parsed['r'], $parsed['g'], $parsed['b'] );
		if ( isset( $flat['hoverOpacity'] ) ) {
			$opacity = (int) $flat['hoverOpacity'];
		} else {
			$opacity = (int) round( $parsed['a'] * 100 );
		}
		$opacity = min( 100, max( 0, $opacity ) );
		$alpha   = round( $opacity / 100, 4 );

		return sprintf(
			'--modula-hover-overlay-tint:%s;--modula-hover-dim-active-opacity:%s',
			$color,
			(string) $alpha
		);
	}

	/**
	 * Parse hex or rgba for hover dim tint (opaque RGB + separate opacity).
	 *
	 * @param string $raw Color string.
	 * @return array{r:int,g:int,b:int,a:float}|null
	 */
	private static function parse_hover_dim_color( string $raw ) {
		$value = trim( $raw );
		if ( '' === $value ) {
			return null;
		}
		if ( preg_match( '/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $value, $m ) ) {
			$h   = $m[1];
			$len = strlen( $h );
			if ( 3 === $len || 4 === $len ) {
				return array(
					'r' => (int) hexdec( $h[0] . $h[0] ),
					'g' => (int) hexdec( $h[1] . $h[1] ),
					'b' => (int) hexdec( $h[2] . $h[2] ),
					'a' => 4 === $len ? (float) ( hexdec( $h[3] . $h[3] ) / 255 ) : 1.0,
				);
			}
			return array(
				'r' => (int) hexdec( substr( $h, 0, 2 ) ),
				'g' => (int) hexdec( substr( $h, 2, 2 ) ),
				'b' => (int) hexdec( substr( $h, 4, 2 ) ),
				'a' => 8 === $len ? (float) ( hexdec( substr( $h, 6, 2 ) ) / 255 ) : 1.0,
			);
		}
		if ( preg_match( '/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i', $value, $m ) ) {
			$a = isset( $m[4] ) ? (float) $m[4] : 1.0;
			return array(
				'r' => max( 0, min( 255, (int) $m[1] ) ),
				'g' => max( 0, min( 255, (int) $m[2] ) ),
				'b' => max( 0, min( 255, (int) $m[3] ) ),
				'a' => max( 0.0, min( 1.0, $a ) ),
			);
		}
		return null;
	}

	private function render_output( $gallery_id, $settings, $gallery_data, $images ) {
		$classes         = $this->get_container_classes(
			$settings['align'],
			isset( $settings['flat'] ) && is_array( $settings['flat'] ) ? $settings['flat'] : array(),
			isset( $settings['grouped'] ) && is_array( $settings['grouped'] ) ? $settings['grouped'] : array()
		);
		$hover_dim_style = $this->gallery_hover_dim_style_value( $settings['flat'] );

		ob_start();

		do_action( 'modula_before_gallery', $settings['flat'] );
		$shell_style = \Modula\V2\Modern_Gallery::gallery_shell_inline_style( $hover_dim_style );
		?>
		<div id="modula-<?php echo esc_attr( $gallery_id ); ?>" class="<?php echo esc_attr( implode( ' ', $classes ) ); ?>" style="<?php echo esc_attr( $shell_style ); ?>">
			<?php do_action( 'modula_shortcode_before_items', $settings['flat'] ); ?>
			<div class="modula-items">
				<?php $this->render_items( $images, $settings['flat'], $gallery_id ); ?>
			</div>
			<?php do_action( 'modula_shortcode_after_items', $settings['flat'], null, $images ); ?>
		</div>
		<script type="application/json" data-modula-gallery-id="modula-<?php echo esc_attr( $gallery_id ); ?>" data-modula-gallery>
			<?php
			// HEX_TAG: shortcode-rendered bodies (e.g. KaliForms) may contain literal </script> — without this,
			// the HTML parser closes this tag early and dumps the rest of the bootstrap JSON as visible page text.
			echo wp_json_encode( $gallery_data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			?>
		</script>
		<?php
		do_action( 'modula_after_gallery', $settings['flat'] );

		return ob_get_clean();
	}

	private function render_items( $images, $settings, $gallery_id ) {
		foreach ( $images as $image ) {
			if ( is_array( $image ) && \Modula\V2\Images\Adapter::is_embedded_gallery_item( $image ) ) {
				echo $this->render_embedded_item_markup( $image, $settings ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				continue;
			}
			if ( ! $this->is_valid_image( $image ) ) {
				continue;
			}

			$image = apply_filters( 'modula_shortcode_image_data', $image, $settings );

			$item_data = $this->item_processor->process( $image, $settings, $gallery_id, $images );
			$item_data = apply_filters( 'modula_shortcode_item_data', $item_data, $image, $settings, $images );

			if ( ! is_array( $item_data ) || empty( $item_data ) ) {
				continue;
			}

			$data = (object) $item_data;

			echo $this->render_item_html( $data ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
	}

	private function is_valid_image( $image ) {
		if ( ! isset( $image['id'] ) ) {
			return false;
		}

		$image_object      = get_post( $image['id'] );
		$item_is_not_image = ( is_wp_error( $image_object ) || ! $image_object || 'attachment' !== get_post_type( $image_object ) );

		return ! apply_filters( 'modula_check_item_not_image', $item_is_not_image, $image );
	}

	/**
	 * @param array<string, mixed> $images Raw rows.
	 */
	private function list_contains_embedded_items( $images ): bool {
		if ( ! is_array( $images ) ) {
			return false;
		}
		foreach ( $images as $row ) {
			if ( is_array( $row ) && \Modula\V2\Images\Adapter::is_embedded_gallery_item( $row ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Front HTML for v2 embedded rows (matches React shell classes where possible).
	 *
	 * @param array<string, mixed> $row      Normalized embedded row.
	 * @param array<string, mixed> $settings Flat settings.
	 * @return string
	 */
	private function render_embedded_item_markup( array $row, array $settings ) {
		// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- helpers return escaped attribute/HTML strings.
		$json_item = \Modula_Frontend_Adapter::convert_embedded_gallery_item_for_json( $row, $settings, 'public' );
		if ( empty( $json_item ) || ! is_array( $json_item ) ) {
			return '';
		}
		$kind            = \Modula\V2\Images\Adapter::get_item_kind( $row );
		$item_classes    = isset( $json_item['itemClasses'] ) && is_array( $json_item['itemClasses'] ) ? $json_item['itemClasses'] : array( 'modula-item', 'modula-item--embedded' );
		$item_attributes = isset( $json_item['itemAttributes'] ) && is_array( $json_item['itemAttributes'] ) ? $json_item['itemAttributes'] : array();
		$w               = isset( $json_item['width'] ) ? absint( $json_item['width'] ) : 2;
		$h               = isset( $json_item['height'] ) ? absint( $json_item['height'] ) : 2;
		ob_start();
		?>
		<div class="<?php echo esc_attr( implode( ' ', $item_classes ) ); ?>" <?php echo \Modula_Helper::generate_attributes( $item_attributes ); ?>>
			<div class="modula-item-overlay"></div>
			<div class="modula-item-content modula-item-content--embedded">
				<div class="modula-embedded-tile" style="<?php echo esc_attr( $this->embedded_tile_inline_style( $json_item, $kind ) ); ?>">
					<?php if ( \Modula\V2\Images\Adapter::ITEM_KIND_CONTENT_BLOCK === $kind ) : ?>
						<?php
						$title = isset( $json_item['title'] ) ? (string) $json_item['title'] : '';
						if ( '' !== $title ) :
							?>
							<div class="modula-embedded-block__title"><?php echo wp_kses_post( $title ); ?></div>
						<?php endif; ?>
						<?php
						$desc = isset( $json_item['description'] ) ? (string) $json_item['description'] : '';
						if ( '' !== $desc ) :
							?>
							<div class="modula-embedded-block__description"><?php echo wp_kses_post( wpautop( $desc ) ); ?></div>
						<?php endif; ?>
						<?php
						$body_out = isset( $json_item['blockBodyHtmlRendered'] ) && '' !== (string) $json_item['blockBodyHtmlRendered']
							? (string) $json_item['blockBodyHtmlRendered']
							: ( isset( $json_item['blockBodyHtml'] ) ? (string) $json_item['blockBodyHtml'] : '' );
						?>
						<div class="modula-embedded-block__body"><?php echo \Modula_Frontend_Adapter::kses_embedded_rendered_html( $body_out ); ?></div>
					<?php elseif ( \Modula\V2\Images\Adapter::ITEM_KIND_SHORTCODE === $kind ) : ?>
						<div class="modula-embedded-shortcode"><?php echo isset( $json_item['shortcodeHtml'] ) ? \Modula_Frontend_Adapter::kses_embedded_rendered_html( (string) $json_item['shortcodeHtml'] ) : ''; ?></div>
					<?php endif; ?>
				</div>
			</div>
		</div>
		<?php
		// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
		return (string) ob_get_clean();
	}

	/**
	 * @param array<string, mixed> $json_item Converted embedded item.
	 */
	private function embedded_tile_inline_style( array $json_item, string $kind ): string {
		$pad_preset = isset( $json_item['blockPaddingPreset'] ) ? (string) $json_item['blockPaddingPreset'] : 'default';
		$pad        = \Modula_Frontend_Adapter::content_block_padding_css( $pad_preset );
		$parts      = array( 'box-sizing:border-box', 'width:100%', 'height:100%', 'padding:' . $pad, 'overflow-x:hidden', 'overflow-y:auto' );
		if ( \Modula\V2\Images\Adapter::ITEM_KIND_CONTENT_BLOCK === $kind ) {
			$parts = array_merge(
				$parts,
				\Modula_Frontend_Adapter::content_block_background_css_parts( $json_item )
			);
			$bg    = isset( $json_item['blockBackgroundColor'] ) ? trim( (string) $json_item['blockBackgroundColor'] ) : '';
			if ( class_exists( 'Modula_Helper' ) && method_exists( 'Modula_Helper', 'sanitize_rgba_colour' ) ) {
				$bg = (string) \Modula_Helper::sanitize_rgba_colour( $bg );
			} elseif ( ! preg_match( '/^#[0-9a-fA-F]{3,8}$/', $bg ) ) {
				$bg = '';
			}
			if ( ! empty( $json_item['blockTextColor'] ) && preg_match( '/^#[0-9a-fA-F]{3,8}$/', (string) $json_item['blockTextColor'] ) ) {
				$parts[] = 'color:' . (string) $json_item['blockTextColor'];
			} else {
				$has_image = ! empty( $json_item['blockBackgroundImageUrl'] );
				$parts[]   = 'color:' . (
					$has_image
						? \Modula_Frontend_Adapter::solid_contrasting_hex_for_background( $bg )
						: \Modula_Frontend_Adapter::contrasting_hex_for_background( $bg )
				);
			}
			$font_preset = isset( $json_item['blockFontPreset'] ) ? (string) $json_item['blockFontPreset'] : 'default';
			$parts[]     = 'font-family:' . \Modula_Frontend_Adapter::content_block_font_family_css( $font_preset );
		}
		return implode( ';', $parts );
	}

	/**
	 * Shuffle gallery images with a seeded PRNG so order is random per page load but stable for REST pagination within that load.
	 *
	 * @param array $images Images to shuffle.
	 * @param int   $seed   Random seed (generated per page load when shuffle is enabled).
	 * @return array Shuffled images.
	 */
	private function shuffle_gallery_images( $images, $seed ) {
		if ( empty( $images ) || count( $images ) <= 1 ) {
			return $images;
		}

		mt_srand( (int) $seed );

		$keys        = array_keys( $images );
		$random_keys = array();
		foreach ( $keys as $key ) {
			$random_keys[ $key ] = mt_rand();
		}

		array_multisort( $random_keys, $images );

		mt_srand();

		return $images;
	}

	private function get_container_classes( $align, $flat = array(), $grouped = array() ) {
		$classes = array( 'modula', 'modula-gallery', 'modula-gallery-modern' );

		if ( ! empty( $align ) ) {
			$classes[] = 'align' . esc_attr( $align );
		}

		$respect_reduced = true;
		if ( is_array( $grouped ) && isset( $grouped['interaction'] ) && is_array( $grouped['interaction'] ) && array_key_exists( 'respectReducedMotion', $grouped['interaction'] ) ) {
			$raw             = $grouped['interaction']['respectReducedMotion'];
			$respect_reduced = ! ( false === $raw || 0 === $raw || '0' === (string) $raw );
		} elseif ( is_array( $flat ) && array_key_exists( 'respect_reduced_motion', $flat ) ) {
			$raw             = $flat['respect_reduced_motion'];
			$respect_reduced = ! ( false === $raw || 0 === $raw || '0' === (string) $raw );
		}
		if ( $respect_reduced ) {
			$classes[] = 'modula-respect-reduced-motion';
		}

		return apply_filters(
			'modula_modern_shortcode_container_classes',
			$classes,
			array(
				'align'   => $align,
				'flat'    => $flat,
				'grouped' => $grouped,
			)
		);
	}

	private function render_item_html( $data ) {
		// phpcs:disable WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- item_data object uses camelCase keys from processor.
		// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- Modula_Helper attribute/icon helpers return escaped markup.
		if ( ! is_object( $data ) ) {
			$data = (object) (array) $data;
		}
		// Third-party filters may return partial item_data (e.g. after failed image URL init + video tweaks).
		if ( ! isset( $data->item_classes ) || ! is_array( $data->item_classes ) ) {
			$data->item_classes = array( 'modula-item' );
		}
		if ( ! isset( $data->item_attributes ) || ! is_array( $data->item_attributes ) ) {
			$data->item_attributes = array();
		}
		if ( ! isset( $data->link_classes ) || ! is_array( $data->link_classes ) ) {
			if ( isset( $data->link_attributes ) && is_array( $data->link_attributes ) && isset( $data->link_attributes['class'] ) ) {
				$lc                 = $data->link_attributes['class'];
				$data->link_classes = is_array( $lc ) ? $lc : array( $lc );
			} else {
				$data->link_classes = array( 'tile-inner', 'modula-item-link' );
			}
		}
		if ( ! isset( $data->link_attributes ) || ! is_array( $data->link_attributes ) ) {
			$data->link_attributes = array();
		}

		ob_start();
		$data->hide_socials = true;
		?>
		<div class="<?php echo esc_attr( implode( ' ', $data->item_classes ) ); ?>" <?php echo \Modula_Helper::generate_attributes( $data->item_attributes ); ?>>
			<div class="modula-item-overlay"></div>
			<div class="modula-item-content">
				<?php if ( modula_item_object_renders_link_overlay( $data ) ) : ?>
					<a<?php echo \Modula_Helper::generate_attributes( $data->link_attributes ); ?> class="<?php echo esc_attr( implode( ' ', $data->link_classes ) ); ?>"></a>
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
										<a class="modula-icon-twitter" aria-label="<?php echo esc_html__( 'Share on X', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? \Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo \Modula_Helper::get_icon( 'twitter' ); ?></a>
									<?php endif; ?>
									<?php if ( $data->enableFacebook ) : ?>
										<a class="modula-icon-facebook" aria-label="<?php echo esc_html__( 'Share on Facebook', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? \Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo \Modula_Helper::get_icon( 'facebook' ); ?></a>
									<?php endif; ?>
									<?php if ( $data->enableWhatsapp ) : ?>
										<a class="modula-icon-whatsapp" aria-label="<?php echo esc_html__( 'Share on Whatsapp', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? \Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo \Modula_Helper::get_icon( 'whatsapp' ); ?></a>
									<?php endif; ?>
									<?php if ( $data->enablePinterest ) : ?>
										<a class="modula-icon-pinterest" aria-label="<?php echo esc_html__( 'Share on Pinterest', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? \Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo \Modula_Helper::get_icon( 'pinterest' ); ?></a>
									<?php endif; ?>
									<?php if ( $data->enableLinkedin ) : ?>
										<a class="modula-icon-linkedin" aria-label="<?php echo esc_html__( 'Share on LinkedIn', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? \Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo \Modula_Helper::get_icon( 'linkedin' ); ?></a>
									<?php endif; ?>
									<?php if ( $data->enableEmail ) : ?>
										<a class="modula-icon-email" aria-label="<?php echo esc_html__( 'Share by Email', 'modula-best-grid-gallery' ); ?>" <?php echo ( ! empty( $data->social_attributes ) ) ? \Modula_Helper::generate_attributes( $data->social_attributes ) : ''; ?> href="#"><?php echo \Modula_Helper::get_icon( 'email' ); ?></a>
									<?php endif; ?>
									<?php do_action( 'modula_extra_socials', $data ); ?>
								</div>
							<?php endif; ?>
						</div>
					</div>
			</div>
		</div>
		<?php
		// phpcs:enable WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase
		// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
		return ob_get_clean();
	}

	private function render_item_image( $data ) {
		$img_attrs = $this->build_image_attributes( $data );

		if ( $this->is_srcset_disabled() ) {
			return $this->build_image_tag( $img_attrs, $data );
		}

		$attachment_id = $this->get_attachment_id( $data );
		$image_meta    = $this->get_image_metadata( $attachment_id, $data, $img_attrs );

		$image_src = $this->get_image_source( $img_attrs, $data );
		if ( ! $image_src || empty( $image_meta['sizes'] ) ) {
			return $this->build_image_tag( $img_attrs, $data );
		}

		if ( $this->is_image_edited( $image_meta, $image_src ) ) {
			return $this->build_image_tag( $img_attrs, $data );
		}

		$size_array = $this->get_image_dimensions( $img_attrs, $image_src, $image_meta, $attachment_id );
		if ( ! $size_array ) {
			return $this->build_image_tag( $img_attrs, $data );
		}

		$img_attrs = $this->add_responsive_attributes( $img_attrs, $size_array, $image_src, $image_meta, $attachment_id, $data );

		return $this->build_image_tag( $img_attrs, $data );
	}

	private function build_image_attributes( $data ) {
		$img_attrs = $data->img_attributes;

		if ( ! empty( $data->img_classes ) ) {
			$img_attrs['class'] = implode( ' ', $data->img_classes );
		}

		return $img_attrs;
	}

	private function is_srcset_disabled() {
		$troubleshoot_opt = get_option( 'modula_troubleshooting_option', array() );
		$disable_srcset   = isset( $troubleshoot_opt['disable_srcset'] ) ? boolval( $troubleshoot_opt['disable_srcset'] ) : false;

		return true === apply_filters( 'modula_troubleshooting_disable_srcset', $disable_srcset );
	}

	private function get_attachment_id( $data ) {
		return isset( $data->link_attributes['data-image-id'] ) ? (int) $data->link_attributes['data-image-id'] : 0;
	}

	private function get_image_metadata( $attachment_id, $data, $img_attrs ) {
		$image_meta = array();

		if ( $attachment_id ) {
			$image_meta = wp_get_attachment_metadata( $attachment_id );
		}

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

	private function should_add_custom_size( $data, $image_meta, $img_attrs ) {
		return ! empty( $data->image_info ) &&
			! empty( $image_meta ) &&
			isset( $image_meta['width'], $image_meta['height'], $img_attrs['width'], $img_attrs['height'] ) &&
			$image_meta['width'] !== $img_attrs['width'] &&
			$image_meta['height'] !== $img_attrs['height'];
	}

	private function get_mime_type( $image_meta, $data ) {
		if ( isset( $image_meta['sizes']['thumbnail']['mime-type'] ) ) {
			return $image_meta['sizes']['thumbnail']['mime-type'];
		}

		if ( function_exists( 'mime_content_type' ) && isset( $data->image_info['file_path'] ) ) {
			return mime_content_type( $data->image_info['file_path'] );
		}

		return '';
	}

	private function get_image_source( $img_attrs, $data ) {
		$image_src = $img_attrs['src'] ?? $img_attrs['data-src'] ?? '';

		if ( ! $image_src && isset( $data->image_full ) ) {
			$image_src = $data->image_full;
		}

		list($image_src) = explode( '?', $image_src );

		return $image_src;
	}

	private function is_image_edited( $image_meta, $image_src ) {
		if ( ! isset( $image_meta['file'] ) ) {
			return false;
		}

		if ( ! preg_match( '/-e[0-9]{13}/', $image_meta['file'], $img_edit_hash ) ) {
			return false;
		}

		return strpos( wp_basename( $image_src ), $img_edit_hash[0] ) === false;
	}

	private function get_image_dimensions( $img_attrs, $image_src, $image_meta, $attachment_id ) {
		$width  = isset( $img_attrs['width'] ) ? (int) $img_attrs['width'] : 0;
		$height = isset( $img_attrs['height'] ) ? (int) $img_attrs['height'] : 0;

		if ( $width && $height ) {
			return array( $width, $height );
		}

		return wp_image_src_get_dimensions( $image_src, $image_meta, $attachment_id );
	}

	private function add_responsive_attributes( $img_attrs, $size_array, $image_src, $image_meta, $attachment_id, $data ) {
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

	private function build_image_tag( $img_attrs, $data ) {
		// phpcs:disable WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- item_data camelCase.
		if ( ! empty( $data->lazyLoad ) ) {
			$img_attrs['loading'] = 'lazy';
		}
		// phpcs:enable WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase

		return '<img ' . \Modula_Helper::generate_attributes( $img_attrs ) . ' />';
	}
}
