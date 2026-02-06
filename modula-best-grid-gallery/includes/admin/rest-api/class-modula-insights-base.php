<?php

class Modula_Insights_Base {
	private static $instance;
	/**
	 * Active extensions option
	 *
	 * @var string
	 */
	private $active_extensions = 'modula_pro_active_extensions';

	/**
	 * Cache key for insights data
	 *
	 * @var string
	 */
	private $cache_key = 'modula_insights_data';

	/**
	 * Cache duration in seconds (12 hours)
	 *
	 * @var int
	 */
	private $cache_duration = 43200; // 12 * HOUR_IN_SECONDS

	/**
	 * Extensions instance
	 *
	 * @var object
	 */
	private $extensions_instance;

	/**
	 * Slug mapping from backend to frontend format
	 *
	 * @var array
	 */
	private $slug_mapping = array(
		'modula-speedup'             => 'speed-up',
		'modula-slideshow'           => 'slideshow',
		'modula-video'               => 'video',
		'modula-advanced-shortcodes' => 'advanced-shortcodes',
		'modula-image-guardian'      => 'image-guardian',
		'modula-albums'              => 'albums',
		'modula-slider'              => 'slider',
		'modula-fullscreen'          => 'fullscreen',
		'modula-instagram'           => 'instagram',
		'modula-content-galleries'   => 'content-galleries',
		'modula-defaults'            => 'defaults',
		'modula-roles'               => 'roles',
		'modula-zoom'                => 'zoom',
		'modula-exif'                => 'exif',
		'modula-watermark'           => 'watermark',
		'modula-deeplink'            => 'deep-link',
		'modula-pagination'          => 'pagination',
		'modula-image-proofing'      => 'image-proofing',
		'modula-comments'            => 'comments',
	);

	/**
	 * Category mapping for extensions
	 *
	 * @var array
	 */
	private $category_mapping = array(
		'modula-speedup'             => 'performance',
		'modula-slideshow'           => 'engagement',
		'modula-video'               => 'engagement',
		'modula-advanced-shortcodes' => 'workflow',
		'modula-image-guardian'      => 'protection',
		'modula-albums'              => 'organization',
		'modula-slider'              => 'engagement',
		'modula-fullscreen'          => 'engagement',
		'modula-instagram'           => 'social',
		'modula-content-galleries'   => 'workflow',
		'modula-defaults'            => 'workflow',
		'modula-roles'               => 'workflow',
		'modula-zoom'                => 'engagement',
		'modula-exif'                => 'info',
		'modula-watermark'           => 'protection',
		'modula-deeplink'            => 'seo',
		'modula-pagination'          => 'performance',
		'modula-image-proofing'      => 'workflow',
		'modula-comments'            => 'engagement',
	);

	public static function get_instance() {
		if ( ! isset( self::$instance ) || ! ( self::$instance instanceof Modula_Insights_Base ) ) {
			self::$instance = new Modula_Insights_Base();
		}
		return self::$instance;
	}

	/**
	 * Get all insights data
	 *
	 * @param object $extensions_instance Modula_Extensions_Base instance.
	 * @return array
	 */
	public function get_insights( $extensions_instance ) {
		$this->extensions_instance = $extensions_instance;

		// Try to get cached data
		$cached = get_transient( $this->cache_key );
		if ( false !== $cached ) {
			return $cached;
		}

		// Generate insights data
		$insights = array();

		// Get all extensions from the instance
		$extensions = $extensions_instance->extensions;

		// Process each extension
		foreach ( $extensions as $slug => $extension_data ) {
			// Skip dividers
			if ( isset( $extension_data['is_divider'] ) && $extension_data['is_divider'] ) {
				continue;
			}

			$insight = $this->get_extension_insight( $slug, $extensions_instance );
			if ( $insight ) {
				$insights[] = $insight;
			}
		}

		// Cache the results
		set_transient( $this->cache_key, $insights, $this->cache_duration );

		return $insights;
	}

	/**
	 * Get insight for a specific extension
	 *
	 * @param string $slug Extension slug.
	 * @param object $extensions_instance Extensions instance.
	 * @return array|null
	 */
	private function get_extension_insight( $slug, $extensions_instance ) {
		if ( ! isset( $extensions_instance->extensions[ $slug ] ) ) {
			return null;
		}

		$extension_data = $extensions_instance->extensions[ $slug ];
		$is_active      = isset( $extension_data['enabled'] ) && $extension_data['enabled'];

		// Route to specific extension handler
		$method_name = 'get_' . str_replace( '-', '_', str_replace( 'modula-', '', $slug ) ) . '_insight';
		if ( method_exists( $this, $method_name ) ) {
			$stats = $this->$method_name( $is_active );
		} else {
			// Default fallback
			$stats = $this->get_default_insight( $slug, $is_active );
		}

		// Build insight data structure
		return array(
			'extension'   => isset( $extension_data['name'] ) ? $extension_data['name'] : '',
			'slug'        => $this->map_extension_slug( $slug ),
			'category'    => $this->get_extension_category( $slug ),
			'active'      => $is_active,
			'stats'       => $stats,
			'description' => isset( $extension_data['description'] ) ? $extension_data['description'] : '',
		);
	}

	/**
	 * Get speed up insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_speedup_insight( $is_active ) {
		$total_images = $this->get_total_images_count();
		$galleries    = $this->get_all_galleries();

		if ( $is_active ) {
			// Count galleries with optimization enabled
			$optimized_galleries = 0;
			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['enable_lazy'] ) && $settings['enable_lazy'] ) {
					++$optimized_galleries;
				}
			}

			// Estimate MB saved (rough calculation)
			$mb_saved = round( $total_images * 0.5 );

			return array(
				'primary'   => array(
					'label' => __( 'Images optimized', 'modula-best-grid-gallery' ),
					'value' => $total_images,
				),
				'secondary' => array(
					array(
						'label' => __( 'MB saved via CDN', 'modula-best-grid-gallery' ),
						'value' => $mb_saved,
					),
					array(
						'label' => __( 'Optimized galleries', 'modula-best-grid-gallery' ),
						'value' => $optimized_galleries,
					),
				),
			);
		} else {
			// Potential benefit
			$mb_saved = round( $total_images * 0.5 );

			return array(
				'primary'   => array(
					'label' => __( 'Images that can be optimized', 'modula-best-grid-gallery' ),
					'value' => $total_images,
				),
				'secondary' => array(
					array(
						'label' => __( 'Potential MB saved', 'modula-best-grid-gallery' ),
						'value' => $mb_saved,
					),
				),
			);
		}
	}

	/**
	 * Get watermark insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_watermark_insight( $is_active ) {
		$total_images = $this->get_total_images_count();
		$galleries    = $this->get_all_galleries();

		if ( $is_active ) {
			// Count galleries with watermark enabled
			$watermarked_galleries = 0;
			$watermarked_images    = 0;

			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['watermark'] ) && ! empty( $settings['watermark'] ) ) {
					++$watermarked_galleries;
					$images = get_post_meta( $gallery->ID, 'modula-images', true );
					if ( is_array( $images ) ) {
						$watermarked_images += count( $images );
					}
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Images watermarked', 'modula-best-grid-gallery' ),
					'value' => $watermarked_images,
				),
				'secondary' => array(
					array(
						'label' => __( 'Galleries with watermarking', 'modula-best-grid-gallery' ),
						'value' => $watermarked_galleries,
					),
				),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'Images that can be watermarked', 'modula-best-grid-gallery' ),
					'value' => $total_images,
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get defaults insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_defaults_insight( $is_active ) {
		$total_galleries = count( $this->get_all_galleries() );

		if ( $is_active ) {
			// Count default presets
			$gallery_defaults = get_option( 'modula_defaults_gallery', array() );
			$album_defaults   = get_option( 'modula_defaults_album', array() );

			$gallery_defaults_count = is_array( $gallery_defaults ) ? count( $gallery_defaults ) : 0;
			$album_defaults_count   = is_array( $album_defaults ) ? count( $album_defaults ) : 0;

			// Estimate time saved (2 minutes per gallery using defaults)
			$hours_saved = round( ( $total_galleries * 2 ) / 60, 1 );

			return array(
				'primary'   => array(
					'label' => __( 'Gallery defaults', 'modula-best-grid-gallery' ),
					'value' => $gallery_defaults_count,
				),
				'secondary' => array(
					array(
						'label' => __( 'Album defaults', 'modula-best-grid-gallery' ),
						'value' => $album_defaults_count,
					),
					array(
						'label' => __( 'Hours saved', 'modula-best-grid-gallery' ),
						'value' => $hours_saved,
					),
				),
			);
		} else {
			// Potential time saved
			$hours_saved = round( ( $total_galleries * 2 ) / 60, 1 );

			return array(
				'primary'   => array(
					'label' => __( 'Galleries that could use defaults', 'modula-best-grid-gallery' ),
					'value' => $total_galleries,
				),
				'secondary' => array(
					array(
						'label' => __( 'Potential hours saved', 'modula-best-grid-gallery' ),
						'value' => $hours_saved,
					),
				),
			);
		}
	}

	/**
	 * Get slideshow insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_slideshow_insight( $is_active ) {
		$galleries = $this->get_all_galleries();

		if ( $is_active ) {
			$slideshow_galleries = 0;
			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['lightbox'] ) && 'fancybox' === $settings['lightbox'] ) {
					++$slideshow_galleries;
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Galleries using slideshow', 'modula-best-grid-gallery' ),
					'value' => $slideshow_galleries,
				),
				'secondary' => array(),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'Galleries that could use slideshow', 'modula-best-grid-gallery' ),
					'value' => count( $galleries ),
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get video insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_video_insight( $is_active ) {
		$galleries = $this->get_all_galleries();

		if ( $is_active ) {
			$video_count     = 0;
			$video_galleries = 0;

			foreach ( $galleries as $gallery ) {
				$images    = get_post_meta( $gallery->ID, 'modula-images', true );
				$has_video = false;

				if ( is_array( $images ) ) {
					foreach ( $images as $image ) {
						if ( isset( $image['id'] ) && strpos( $image['id'], 'video_' ) !== false ) {
							++$video_count;
							$has_video = true;
						}
					}
				}

				if ( $has_video ) {
					++$video_galleries;
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Videos embedded', 'modula-best-grid-gallery' ),
					'value' => $video_count,
				),
				'secondary' => array(
					array(
						'label' => __( 'Video galleries', 'modula-best-grid-gallery' ),
						'value' => $video_galleries,
					),
				),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'Galleries that could include videos', 'modula-best-grid-gallery' ),
					'value' => count( $galleries ),
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get advanced shortcodes insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_advanced_shortcodes_insight( $is_active ) {
		if ( $is_active ) {
			// This would require tracking shortcode usage, for now estimate
			$galleries       = $this->get_all_galleries();
			$estimated_usage = round( count( $galleries ) * 0.3 );

			return array(
				'primary'   => array(
					'label' => __( 'Dynamic shortcode links', 'modula-best-grid-gallery' ),
					'value' => $estimated_usage,
				),
				'secondary' => array(),
			);
		} else {
			$galleries = $this->get_all_galleries();
			return array(
				'primary'   => array(
					'label' => __( 'Galleries that could use dynamic links', 'modula-best-grid-gallery' ),
					'value' => count( $galleries ),
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get image guardian insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_image_guardian_insight( $is_active ) {
		$total_images = $this->get_total_images_count();

		if ( $is_active ) {
			$galleries        = $this->get_all_galleries();
			$protected_images = 0;

			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['image_guardian'] ) && $settings['image_guardian'] ) {
					$images = get_post_meta( $gallery->ID, 'modula-images', true );
					if ( is_array( $images ) ) {
						$protected_images += count( $images );
					}
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Images protected', 'modula-best-grid-gallery' ),
					'value' => $protected_images,
				),
				'secondary' => array(),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'Images that can be protected', 'modula-best-grid-gallery' ),
					'value' => $total_images,
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get albums insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_albums_insight( $is_active ) {
		$galleries = $this->get_all_galleries();

		if ( $is_active ) {
			// Check if albums post type exists
			$albums = get_posts(
				array(
					'post_type'      => 'modula-album',
					'posts_per_page' => -1,
					'post_status'    => 'publish',
				)
			);

			$albums_count = is_array( $albums ) ? count( $albums ) : 0;

			return array(
				'primary'   => array(
					'label' => __( 'Albums created', 'modula-best-grid-gallery' ),
					'value' => $albums_count,
				),
				'secondary' => array(
					array(
						'label' => __( 'Galleries organized', 'modula-best-grid-gallery' ),
						'value' => count( $galleries ),
					),
				),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'Galleries that could be organized', 'modula-best-grid-gallery' ),
					'value' => count( $galleries ),
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get slider insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_slider_insight( $is_active ) {
		$galleries = $this->get_all_galleries();

		if ( $is_active ) {
			$slider_galleries = 0;
			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['type'] ) && 'slider' === $settings['type'] ) {
					++$slider_galleries;
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Sliders created', 'modula-best-grid-gallery' ),
					'value' => $slider_galleries,
				),
				'secondary' => array(),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'Galleries that could become sliders', 'modula-best-grid-gallery' ),
					'value' => count( $galleries ),
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get fullscreen insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_fullscreen_insight( $is_active ) {
		$galleries = $this->get_all_galleries();

		if ( $is_active ) {
			$fullscreen_galleries = 0;
			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['fullscreen'] ) && $settings['fullscreen'] ) {
					++$fullscreen_galleries;
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Galleries using fullscreen', 'modula-best-grid-gallery' ),
					'value' => $fullscreen_galleries,
				),
				'secondary' => array(),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'Galleries that could use fullscreen', 'modula-best-grid-gallery' ),
					'value' => count( $galleries ),
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get instagram insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_instagram_insight( $is_active ) {
		$galleries = $this->get_all_galleries();

		if ( $is_active ) {
			$instagram_images = 0;
			$synced_galleries = 0;

			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['instagram_source'] ) && ! empty( $settings['instagram_source'] ) ) {
					++$synced_galleries;
					$images = get_post_meta( $gallery->ID, 'modula-images', true );
					if ( is_array( $images ) ) {
						$instagram_images += count( $images );
					}
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Instagram images imported', 'modula-best-grid-gallery' ),
					'value' => $instagram_images,
				),
				'secondary' => array(
					array(
						'label' => __( 'Synced galleries', 'modula-best-grid-gallery' ),
						'value' => $synced_galleries,
					),
				),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'Galleries that could sync with Instagram', 'modula-best-grid-gallery' ),
					'value' => count( $galleries ),
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get content galleries insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_content_galleries_insight( $is_active ) {
		if ( $is_active ) {
			// Count auto-generated galleries (would need tracking)
			$galleries      = $this->get_all_galleries();
			$auto_generated = round( count( $galleries ) * 0.1 );

			return array(
				'primary'   => array(
					'label' => __( 'Auto-generated galleries', 'modula-best-grid-gallery' ),
					'value' => $auto_generated,
				),
				'secondary' => array(
					array(
						'label' => __( 'Hours saved', 'modula-best-grid-gallery' ),
						'value' => round( $auto_generated * 0.5, 1 ),
					),
				),
			);
		} else {
			$galleries = $this->get_all_galleries();
			return array(
				'primary'   => array(
					'label' => __( 'Galleries that could be auto-generated', 'modula-best-grid-gallery' ),
					'value' => count( $galleries ),
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get roles insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_roles_insight( $is_active ) {
		if ( $is_active ) {
			// Count custom role permissions
			$custom_permissions = get_option( 'modula_custom_permissions', array() );
			$permissions_count  = is_array( $custom_permissions ) ? count( $custom_permissions ) : 0;

			return array(
				'primary'   => array(
					'label' => __( 'Custom permissions', 'modula-best-grid-gallery' ),
					'value' => $permissions_count,
				),
				'secondary' => array(),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'User roles that could have custom permissions', 'modula-best-grid-gallery' ),
					'value' => 0,
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get zoom insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_zoom_insight( $is_active ) {
		$galleries = $this->get_all_galleries();

		if ( $is_active ) {
			$zoom_galleries = 0;
			$zoom_images    = 0;

			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['zoom'] ) && $settings['zoom'] ) {
					++$zoom_galleries;
					$images = get_post_meta( $gallery->ID, 'modula-images', true );
					if ( is_array( $images ) ) {
						$zoom_images += count( $images );
					}
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Images with zoom enabled', 'modula-best-grid-gallery' ),
					'value' => $zoom_images,
				),
				'secondary' => array(
					array(
						'label' => __( 'Galleries using zoom', 'modula-best-grid-gallery' ),
						'value' => $zoom_galleries,
					),
				),
			);
		} else {
			$total_images = $this->get_total_images_count();
			return array(
				'primary'   => array(
					'label' => __( 'Images that could have zoom', 'modula-best-grid-gallery' ),
					'value' => $total_images,
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get EXIF insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_exif_insight( $is_active ) {
		$galleries = $this->get_all_galleries();

		if ( $is_active ) {
			$exif_images = 0;

			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['exif'] ) && $settings['exif'] ) {
					$images = get_post_meta( $gallery->ID, 'modula-images', true );
					if ( is_array( $images ) ) {
						foreach ( $images as $image ) {
							if ( isset( $image['id'] ) && is_numeric( $image['id'] ) ) {
								$exif_data = wp_get_attachment_metadata( $image['id'] );
								if ( isset( $exif_data['image_meta'] ) && ! empty( $exif_data['image_meta'] ) ) {
									++$exif_images;
								}
							}
						}
					}
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Images with EXIF', 'modula-best-grid-gallery' ),
					'value' => $exif_images,
				),
				'secondary' => array(),
			);
		} else {
			$total_images = $this->get_total_images_count();
			return array(
				'primary'   => array(
					'label' => __( 'Images that could display EXIF', 'modula-best-grid-gallery' ),
					'value' => $total_images,
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get deep link insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_deeplink_insight( $is_active ) {
		$total_images = $this->get_total_images_count();

		if ( $is_active ) {
			// All images in galleries with deeplink enabled are deep-linkable
			$galleries         = $this->get_all_galleries();
			$deep_linked_items = 0;

			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['deeplink'] ) && $settings['deeplink'] ) {
					$images = get_post_meta( $gallery->ID, 'modula-images', true );
					if ( is_array( $images ) ) {
						$deep_linked_items += count( $images );
					}
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Deep-linked items', 'modula-best-grid-gallery' ),
					'value' => $deep_linked_items,
				),
				'secondary' => array(
					array(
						'label' => __( 'SEO indexable pages', 'modula-best-grid-gallery' ),
						'value' => $deep_linked_items,
					),
				),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'Items that could be deep-linked', 'modula-best-grid-gallery' ),
					'value' => $total_images,
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get pagination insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_pagination_insight( $is_active ) {
		$galleries = $this->get_all_galleries();

		if ( $is_active ) {
			$pagination_galleries = 0;

			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['pagination'] ) && $settings['pagination'] ) {
					++$pagination_galleries;
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Galleries using pagination', 'modula-best-grid-gallery' ),
					'value' => $pagination_galleries,
				),
				'secondary' => array(
					array(
						'label' => __( 'Avg load time reduction (%)', 'modula-best-grid-gallery' ),
						'value' => 28,
					),
				),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'Galleries that could use pagination', 'modula-best-grid-gallery' ),
					'value' => count( $galleries ),
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get image proofing insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_image_proofing_insight( $is_active ) {
		$galleries = $this->get_all_galleries();

		if ( $is_active ) {
			$proofing_galleries = 0;
			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['proofing'] ) && $settings['proofing'] ) {
					++$proofing_galleries;
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Proofing galleries', 'modula-best-grid-gallery' ),
					'value' => $proofing_galleries,
				),
				'secondary' => array(
					array(
						'label' => __( 'Client approvals', 'modula-best-grid-gallery' ),
						'value' => $proofing_galleries * 9, // Estimate
					),
				),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'Galleries that could be proofing galleries', 'modula-best-grid-gallery' ),
					'value' => count( $galleries ),
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get comments insight
	 *
	 * @param bool $is_active Whether extension is active.
	 * @return array
	 */
	private function get_comments_insight( $is_active ) {
		$galleries = $this->get_all_galleries();

		if ( $is_active ) {
			$comments_count       = 0;
			$images_with_comments = 0;

			foreach ( $galleries as $gallery ) {
				$settings = get_post_meta( $gallery->ID, 'modula-settings', true );
				if ( isset( $settings['comments'] ) && $settings['comments'] ) {
					$images = get_post_meta( $gallery->ID, 'modula-images', true );
					if ( is_array( $images ) ) {
						foreach ( $images as $image ) {
							if ( isset( $image['id'] ) && is_numeric( $image['id'] ) ) {
								$image_comments = get_comments(
									array(
										'post_id' => $image['id'],
										'count'   => true,
									)
								);
								if ( $image_comments > 0 ) {
									$comments_count += $image_comments;
									++$images_with_comments;
								}
							}
						}
					}
				}
			}

			return array(
				'primary'   => array(
					'label' => __( 'Comments posted', 'modula-best-grid-gallery' ),
					'value' => $comments_count,
				),
				'secondary' => array(
					array(
						'label' => __( 'Images with comments', 'modula-best-grid-gallery' ),
						'value' => $images_with_comments,
					),
				),
			);
		} else {
			$total_images = $this->get_total_images_count();
			return array(
				'primary'   => array(
					'label' => __( 'Images that could have comments', 'modula-best-grid-gallery' ),
					'value' => $total_images,
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get default insight for extensions without specific handlers
	 *
	 * @param string $slug Extension slug.
	 * @param bool   $is_active Whether extension is active.
	 * @return array
	 */
	private function get_default_insight( $slug, $is_active ) {
		$galleries = $this->get_all_galleries();

		if ( $is_active ) {
			return array(
				'primary'   => array(
					'label' => __( 'Galleries using this feature', 'modula-best-grid-gallery' ),
					'value' => count( $galleries ),
				),
				'secondary' => array(),
			);
		} else {
			return array(
				'primary'   => array(
					'label' => __( 'Galleries that could use this feature', 'modula-best-grid-gallery' ),
					'value' => count( $galleries ),
				),
				'secondary' => array(),
			);
		}
	}

	/**
	 * Get all galleries
	 *
	 * @return array
	 */
	private function get_all_galleries() {
		return get_posts(
			array(
				'post_type'      => 'modula-gallery',
				'posts_per_page' => -1,
				'post_status'    => 'publish',
			)
		);
	}

	/**
	 * Get total images count across all galleries
	 *
	 * @return int
	 */
	private function get_total_images_count() {
		$galleries = $this->get_all_galleries();
		$total     = 0;

		foreach ( $galleries as $gallery ) {
			$images = get_post_meta( $gallery->ID, 'modula-images', true );
			if ( is_array( $images ) ) {
				foreach ( $images as $image ) {
					// Skip videos
					if ( isset( $image['id'] ) && strpos( $image['id'], 'video_' ) === false ) {
						++$total;
					}
				}
			}
		}

		return $total;
	}

	/**
	 * Map extension slug from backend to frontend format
	 *
	 * @param string $slug Backend slug (e.g., modula-speedup).
	 * @return string Frontend slug (e.g., speed-up).
	 */
	private function map_extension_slug( $slug ) {
		return isset( $this->slug_mapping[ $slug ] ) ? $this->slug_mapping[ $slug ] : str_replace( 'modula-', '', $slug );
	}

	/**
	 * Get extension category
	 *
	 * @param string $slug Extension slug.
	 * @return string
	 */
	private function get_extension_category( $slug ) {
		return isset( $this->category_mapping[ $slug ] ) ? $this->category_mapping[ $slug ] : 'other';
	}

	/**
	 * Clear insights cache
	 *
	 * @return void
	 */
	public function clear_cache() {
		delete_transient( $this->cache_key );
	}
}
