<?php

/**
 * Settings editor: tab categories + per-group card labels (English source strings).
 * Loaded into the v2 document as `editorNavigation`; codegen emits `modula-settings-editor-structure.js`.
 *
 * Grouping follows the editor redesign canvas (`HE_ORG` in the design file; see
 * `.scratch/editor-redesign/spec.md`): categories Layout, Lightbox, Filters, Motion,
 * Interact, Protect, Instagram, Proofing, Video and CSS. A category with
 * `requiresExtension` (Video) shows only when that extension is available and enabled.
 * In Lite, a category with a `liteUpsell` (same keys as a field's `editorLightboxLiteUpsell`)
 * shows locked instead, and opens on that upsell.
 *
 * A locked category's card (ticket 36) takes `title`, `pitch` and `points` from its `liteUpsell`.
 * Each point is an `extension` slug, named and placed on a plan by `Modula_Extension_Catalog`,
 * or a `label` for a Pro feature outside an extension. Filters, Protect, Instagram and
 * Proofing lock because every setting is an upsell, so their link and plan come from the
 * first locked setting's upsell.
 *
 * Each category lists its `hubSections`:
 * - a `submenu` with `role` `hub`: the hub fields, shown first. A category may have
 *   several hub submenus; a label is a heading inside the hub (Interact → Share).
 * - a `submenu` with `role` `more`: the "More settings" sections. Each `drill` in it is
 *   one accordion section.
 *
 * Every submenu and drill has an `id`, unique within its category (type-specific
 * variants of one section repeat its id, and share its open state).
 *
 * A `drill` is a section that expands in place: a box inside the hub, or an accordion
 * section under "More settings". It lists its fields in `groupedPaths`, as a whole
 * schema `group`, or as `items` (`field` and nested `drill` entries) when it nests
 * fields the way the canvas does. The exporter derives `groupedPaths` from `items`;
 * the section reset and the metabox editor's drill-down panel read that flat list. A
 * drill with `nestedUnder` holds the dependent fields of the host field listed just
 * before it (the canvas "kids" of a toggle) and starts open; other sections start
 * closed. `defaultOpen` overrides that. A `headless` drill has no header and is always
 * open; its host row carries its reset (a headless drill with no host, such as
 * Interact → Share, leaves the reset to each row).
 *
 * @package Modula
 */

// Mirror GALLERY_TYPES_WITHOUT_PAGINATION / GALLERY_TYPES_WITHOUT_FILTERS in
// apps/gallery-shared/constants/galleryLayoutDefaults.js (visitor runtime).
$modula_nav_types_without_pagination = array( 'slider', 'story', 'showcase', 'template', 'freeform', 'parallax-masonry', 'video', 'bnb' );
$modula_nav_types_without_filters    = array( 'slider', 'story', 'showcase', 'template', 'freeform', 'parallax-masonry', 'video', 'bnb' );

// `visibleWhen` has no "not in" operator: one `neq` condition per excluded type.
$modula_nav_type_neq_conditions = static function ( array $types ) {
	return array_map(
		static function ( $type ) {
			return array(
				'path' => 'general.type',
				'neq'  => $type,
			);
		},
		$types
	);
};

$modula_nav_not_types = static function ( array $types ) use ( $modula_nav_type_neq_conditions ) {
	return array( 'all' => $modula_nav_type_neq_conditions( $types ) );
};

$modula_nav_lightbox_opens = array(
	'any' => array(
		array(
			'path' => 'lightbox.lightbox',
			'eq'   => 'fancybox',
		),
		array(
			'path' => 'lightbox.lightbox',
			'eq'   => 'lightbox-prefer-url',
		),
	),
);

$modula_nav_field = static function ( $grouped_path, array $extra = array() ) {
	return array_merge(
		array(
			'type'        => 'field',
			'groupedPath' => $grouped_path,
		),
		$extra
	);
};

$modula_nav_fields = static function ( array $grouped_paths ) use ( $modula_nav_field ) {
	return array_map( $modula_nav_field, $grouped_paths );
};

/*
 * Hosts whose dependents box only repeats the host's name (canvas `HF_NOHEAD`, plus the
 * boxes the canvas titles like their toggle). Their box is `headless`: no header, always
 * open while the host is on, and the host row's reset covers the host and the box.
 */
$modula_nav_headless_hosts = array(
	'slider.syncing',
	'slider.autoplay',
	'showcase.autoplay',
	'captions.hideTitle',
	'captions.hideDescription',
	'zoom.enableZoom',
	'slideshow.enableSlideshow',
	'lightbox.showThumbnails',
	'lightbox.toolbar',
	'exif.enableExif',
	'filters.showFilterBar',
	'filters.enableCollapsibleFilters',
	'loadingEffects.enableScale',
	'loadingEffects.enableRotate',
	'loadingEffects.enableSlide',
	'download.enableDownload',
	'comments.commentStatus',
	'social.enableSocial',
	'passwordProtect.enablePassword',
	'watermark.enableWatermark',
	'proofing.imageProofing',
	'video.showVideoIcon',
	'video.previewVideo',
);

/*
 * Dependent fields of a host field (canvas "kids"), shown when the host is on.
 * `$host_on` replaces the default `truthy` test (inverted keys such as captions.hideTitle).
 * A `visibleWhen` in `$extra` is combined with the host test.
 */
$modula_nav_kids = static function ( $id, $label, $host, array $items, array $extra = array(), $host_on = null ) use ( $modula_nav_headless_hosts ) {
	$when = null === $host_on
		? array(
			'path'   => $host,
			'truthy' => true,
		)
		: $host_on;
	if ( isset( $extra['visibleWhen'] ) ) {
		$when = array( 'all' => array( $when, $extra['visibleWhen'] ) );
		unset( $extra['visibleWhen'] );
	}
	if ( in_array( $host, $modula_nav_headless_hosts, true ) ) {
		$extra['headless'] = true;
	}
	return array_merge(
		array(
			'type'        => 'drill',
			'id'          => $id,
			'label'       => $label,
			'nestedUnder' => $host,
			'visibleWhen' => $when,
			'items'       => $items,
		),
		$extra
	);
};

$modula_nav_responsive_types = $modula_nav_not_types( array( 'video', 'creative-gallery', 'bnb', 'story', 'showcase', 'template', 'freeform' ) );
$modula_nav_hover_types      = $modula_nav_not_types( array( 'video', 'story', 'slider' ) );

/*
 * Motion → This layout. Widen on hover plays on Justified galleries whose
 * captions sit on the image; under the image they would rewrap as the tile
 * widens, so the runtime skips it (gallery-shared JustifiedGridLayout) and the
 * row hides. The stored value stays.
 */
$modula_nav_widen_plays = array(
	'all' => array(
		array(
			'path' => 'general.type',
			'eq'   => 'justified-grid',
		),
		array(
			'path' => 'captions.contentPlacement',
			'neq'  => 'below-image',
		),
	),
);
$modula_nav_move_prints_plays = array(
	'path' => 'general.type',
	'eq'   => 'polaroid',
);

return array(
	'categories'  =>
	array(
		array(
			'name'        => 'layout',
			'title'       => 'Layout',
			'description' => 'Gallery type, dimensions, spacing, image appearance and responsive behavior',
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'id'    => 'hub',
					'role'  => 'hub',
					'items' => array_merge(
						array(
							$modula_nav_field( 'general.type' ),
							$modula_nav_field(
								'template.templateLayout',
								array(
									'icon'        => 'gallery',
									'visibleWhen' => array(
										'path' => 'general.type',
										'eq'   => 'template',
									),
								)
							),
							$modula_nav_field( 'layout.gridType' ),
							$modula_nav_field( 'layout.uniformGridTileAspect' ),
							$modula_nav_field( 'layout.uniformGridTileAspectCustom' ),
							$modula_nav_field( 'layout.gridRowHeight' ),
							$modula_nav_field( 'layout.fitGridImageAlign' ),
							$modula_nav_field( 'layout.gridJustifyLastRow' ),
							$modula_nav_field( 'layout.gutter' ),
							$modula_nav_field( 'layout.tabletGutter' ),
							$modula_nav_field( 'layout.mobileGutter' ),
							$modula_nav_field( 'general.height' ),
							$modula_nav_field( 'general.randomFactor' ),
							$modula_nav_field( 'polaroid.randomFactor' ),
							$modula_nav_field( 'polaroid.rotationMax' ),
							$modula_nav_field( 'polaroid.uniformSize' ),
							$modula_nav_kids( 'prints', 'Prints', 'polaroid.uniformSize', $modula_nav_fields( array( 'polaroid.uniformColumns' ) ) ),
							$modula_nav_field( 'layout.parallaxOverlayEnabled' ),
							$modula_nav_kids( 'overlay', 'Overlay', 'layout.parallaxOverlayEnabled', $modula_nav_fields( array( 'layout.parallaxOverlayBackground' ) ) ),
							$modula_nav_field( 'layout.parallaxMotionPreset' ),
							$modula_nav_field( 'slider.slidesToShow' ),
							$modula_nav_field( 'slider.arrows' ),
							$modula_nav_kids( 'arrows', 'Arrows', 'slider.arrows', $modula_nav_fields( array( 'slider.arrowsInside' ) ) ),
							$modula_nav_field( 'slider.dots' ),
							$modula_nav_field( 'slider.autoplay' ),
							$modula_nav_kids( 'slider-autoplay', 'Autoplay', 'slider.autoplay', $modula_nav_fields( array( 'slider.pauseOnHover', 'slider.autoplaySpeed' ) ) ),
							$modula_nav_field( 'slider.syncing' ),
							$modula_nav_kids(
								'thumbnails',
								'Thumbnails',
								'slider.syncing',
								$modula_nav_fields(
									array(
										'slider.syncingNavSize',
										'slider.syncingNavThumbnailsNumber',
										'slider.syncingNavThumbnailsGutter',
										'slider.syncingNavThumbnailsBorderColor',
									)
								)
							),
							$modula_nav_field( 'story.infinite' ),
							$modula_nav_field( 'showcase.visibleCount' ),
							$modula_nav_field( 'showcase.arrowPosition' ),
							$modula_nav_field( 'showcase.autoplay' ),
							$modula_nav_kids( 'showcase-autoplay', 'Autoplay', 'showcase.autoplay', $modula_nav_fields( array( 'showcase.autoplayInterval' ) ) ),
							$modula_nav_field( 'general.width' ),
							$modula_nav_field( 'layout.gridImageSize' ),
							$modula_nav_field( 'layout.gridImageDimensions' ),
							$modula_nav_field( 'layout.gridImageCrop' ),
							$modula_nav_field( 'polaroid.scatterMax' ),
							$modula_nav_field( 'polaroid.showPin' ),
							$modula_nav_field( 'polaroid.framePadding' ),
							$modula_nav_field( 'polaroid.chinHeight' ),
							$modula_nav_field( 'layout.parallaxCaption' ),
							$modula_nav_field( 'slider.imageSize' ),
							$modula_nav_field( 'slider.imageDimensions' ),
							$modula_nav_field( 'slider.imageCrop' ),
							$modula_nav_field( 'slider.adaptiveHeight' ),
							$modula_nav_field( 'slider.slidesToScroll' ),
							$modula_nav_field( 'slider.centerMode' ),
							$modula_nav_kids( 'peek', 'Peek', 'slider.centerMode', $modula_nav_fields( array( 'slider.centerPadding' ) ) ),
							$modula_nav_field( 'slider.fade' ),
							$modula_nav_field( 'slider.infinite' ),
							$modula_nav_field( 'slider.speed' ),
							$modula_nav_field( 'slider.rtl' ),
							$modula_nav_field( 'slider.initialSlide' ),
							$modula_nav_field( 'slider.draggable' ),
							$modula_nav_field( 'showcase.gap' ),
							$modula_nav_field( 'showcase.centerScale' ),
							$modula_nav_field( 'showcase.mobileSimplify' ),
							array(
								'type'         => 'drill',
								'id'           => 'style',
								'label'        => 'Style',
								'icon'         => 'styles',
								'summaryParts' =>
								array(
									array(
										'path' => 'style.borderColor',
										'type' => 'color',
									),
									array(
										'path'     => 'style.borderSize',
										'type'     => 'text',
										'template' => '{value}px border',
									),
									array(
										'path'      => 'style.borderRadius',
										'type'      => 'text',
										'template'  => '{value}px corners',
										'zeroLabel' => 'square corners',
									),
								),
								'groupedPaths' =>
								array(
									'style.borderRadius',
									'style.borderSize',
									'style.borderColor',
									'style.shadowSize',
									'style.shadowColor',
								),
							),
							$modula_nav_field(
								'responsive.enableResponsive',
								array(
									'icon'        => 'desktop',
									'visibleWhen' => array(
										'all' => array_merge(
											$modula_nav_responsive_types['all'],
											array(
												array(
													'any' =>
													array(
														array(
															'path' => 'general.type',
															'neq'  => 'polaroid',
														),
														array(
															'path'   => 'polaroid.uniformSize',
															'truthy' => true,
														),
													),
												),
											)
										),
									),
								)
							),
							$modula_nav_kids(
								'responsive',
								'On phones and tablets',
								'responsive.enableResponsive',
								$modula_nav_fields(
									array(
										'responsive.tabletColumns',
										'responsive.mobileColumns',
										'responsive.treatAsTabletUnder',
										'responsive.treatAsPhoneUnder',
										'slider.tabletSlides',
										'slider.tabletScrolls',
										'slider.mobileSlides',
										'slider.mobileScrolls',
									)
								),
								array(
									'icon'         => 'desktop',
									'summaryParts' =>
									array(
										array(
											'path'     => 'responsive.mobileColumns',
											'type'     => 'text',
											'template' => '{value}',
										),
										array(
											'path'     => 'responsive.tabletColumns',
											'type'     => 'text',
											'template' => '{value} columns',
										),
									),
									'visibleWhen'  => $modula_nav_responsive_types,
								)
							),
							array(
								'type'         => 'drill',
								'id'           => 'captions',
								'label'        => 'Captions',
								'icon'         => 'caption',
								'summaryParts' =>
								array(
									array(
										'path' => 'captions.contentPlacement',
										'type' => 'enum',
									),
									array(
										'path'     => 'captions.titleFontSize',
										'type'     => 'text',
										'template' => '{value}px',
									),
								),
								'visibleWhen'  => array(
									'path' => 'general.type',
									'neq'  => 'video',
								),
								'items'        =>
								array(
									$modula_nav_field( 'captions.contentPlacement' ),
									$modula_nav_field( 'captions.hideGalleryTitle' ),
									$modula_nav_kids(
										'gallery-title',
										'Gallery title',
										'captions.hideGalleryTitle',
										$modula_nav_fields( array( 'captions.galleryTitleType' ) ),
										array(),
										array(
											'path' => 'captions.hideGalleryTitle',
											'eq'   => false,
										)
									),
									// Slider: Show image title and Show image caption sit under Show
									// title and caption and show only while it is on (form-rules.json),
									// then Caption placement. Other types never show the slider rows,
									// so their order is unchanged.
									$modula_nav_field( 'slider.imageInfo' ),
									$modula_nav_field( 'captions.hideTitle' ),
									$modula_nav_kids(
										'title-style',
										'Title style',
										'captions.hideTitle',
										$modula_nav_fields(
											array(
												'captions.titleColor',
												'captions.titleFontSize',
												'captions.mobileTitleFontSize',
												'captions.titleFontWeight',
											)
										),
										array(),
										array(
											'path' => 'captions.hideTitle',
											'eq'   => false,
										)
									),
									$modula_nav_field( 'captions.hideDescription' ),
									$modula_nav_kids(
										'caption-style',
										'Caption style',
										'captions.hideDescription',
										$modula_nav_fields(
											array(
												'captions.captionColor',
												'captions.captionFontSize',
												'captions.mobileCaptionFontSize',
												'captions.captionFontWeight',
											)
										),
										array(),
										array(
											'path' => 'captions.hideDescription',
											'eq'   => false,
										)
									),
									$modula_nav_field( 'slider.imageInfoPosition' ),
									$modula_nav_field( 'captions.compactCaptionPopover' ),
									$modula_nav_kids( 'bubble', 'Bubble', 'captions.compactCaptionPopover', $modula_nav_fields( array( 'captions.compactCaptionMinSize' ) ) ),
									$modula_nav_field( 'captions.belowImageAlignment' ),
									$modula_nav_field( 'captions.belowImageSpacing' ),
									$modula_nav_field( 'captions.belowImagePadding' ),
								),
							),
							$modula_nav_field( 'general.shuffle' ),
							$modula_nav_field(
								'pagination.enablePagination',
								array(
									'icon'        => 'queryPagination',
									'visibleWhen' => $modula_nav_not_types( $modula_nav_types_without_pagination ),
								)
							),
							$modula_nav_kids(
								'pagination',
								'Page size & navigation',
								'pagination.enablePagination',
								$modula_nav_fields(
									array(
										'pagination.maxImagesCount',
										'pagination.maxImagesCountMobile',
										'pagination.enableInfiniteScroll',
										'pagination.enableLoadMore',
										'pagination.paginationNumber',
										'pagination.paginationColor',
										'pagination.activePaginationColor',
										'pagination.paginationPosition',
									)
								),
								array(
									'icon'        => 'queryPagination',
									'summaryKind' => 'pagination',
									// Opening it switches the preview to the pagination preview, so it
									// starts closed (the canvas opens nested settings by default).
									'defaultOpen' => false,
									'visibleWhen' => $modula_nav_not_types( $modula_nav_types_without_pagination ),
								)
							),
						)
					),
				),
				array(
					'type'  => 'submenu',
					'id'    => 'more',
					'role'  => 'more',
					'label' => 'More settings',
					// The canvas parks Speed Up and has no Presets panel; both lived in the removed
					// Advanced category. They sit here because they act on the gallery's image files
					// and on the whole gallery's settings.
					'items' =>
					array(
						// Layout settings the canvas does not draw (ticket 20): the hub and its
						// boxes hold only the canvas's rows. Each keeps the condition its box had.
						array(
							'type'  => 'drill',
							'id'    => 'general',
							'label' => 'General',
							'items' =>
							array(
								$modula_nav_field( 'general.alignment' ),
								$modula_nav_field( 'video.maxHeight' ),
								$modula_nav_field( 'slider.lightbox' ),
								$modula_nav_field( 'showcase.clickBehavior' ),
								$modula_nav_field(
									'slider.syncingNavImageDimensions',
									array(
										'visibleWhen' => array(
											'path'   => 'slider.syncing',
											'truthy' => true,
										),
									)
								),
								$modula_nav_field(
									'slider.syncingNavImageCrop',
									array(
										'visibleWhen' => array(
											'path'   => 'slider.syncing',
											'truthy' => true,
										),
									)
								),
								$modula_nav_field(
									'captions.mobileCaptionCopy',
									array(
										'visibleWhen' => array(
											'path' => 'general.type',
											'neq'  => 'video',
										),
									)
								),
								$modula_nav_field(
									'pagination.themeInheritControls',
									array(
										'visibleWhen' => array(
											'all' => array(
												array(
													'path'   => 'pagination.enablePagination',
													'truthy' => true,
												),
												$modula_nav_not_types( $modula_nav_types_without_pagination ),
											),
										),
									)
								),
							),
						),
						array(
							'type'         => 'drill',
							'id'           => 'performance',
							'label'        => 'Speed Up',
							'icon'         => 'chartBar',
							'summaryKind'  => 'performance',
							'visibleWhen'  => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
							'groupedPaths' =>
							array(
								'performance.sectionLoading',
								'performance.lazyLoad',
								'performance.sectionFiles',
								'performance.enableOptimization',
								'performance.thumbnailOptimization',
								'performance.lightboxOptimization',
								'performance.modulaSpeedHelp',
								'performance.speedupGlobalNote',
							),
						),
						array(
							'type'                    => 'drill',
							'id'                      => 'presets',
							'label'                   => 'Presets',
							'icon'                    => 'download',
							'summaryKind'             => 'exportImport',
							'nestedUpsellGroupedPath' => 'exportImport.galleryDefaultsPanel',
							'visibleWhen'             => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
							'groupedPaths'            =>
							array(
								'exportImport.galleryDefaultsPanel',
							),
						),
					),
				),
			),
		),
		array(
			'name'        => 'lightbox',
			'title'       => 'Lightbox',
			'description' => 'What happens after someone clicks an image.',
			'visibleWhen' => $modula_nav_not_types( array( 'slider', 'story', 'video' ) ),
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'id'    => 'hub',
					'role'  => 'hub',
					'items' =>
					array(
						$modula_nav_field( 'lightbox.lightbox' ),
						$modula_nav_kids(
							'lightbox-options',
							'Lightbox',
							'lightbox.lightbox',
							array(
								$modula_nav_field( 'lightbox.openOn' ),
								$modula_nav_field( 'lightbox.loop' ),
								$modula_nav_field( 'lightbox.showNavigation' ),
								$modula_nav_field( 'lightbox.backgroundColor' ),
								$modula_nav_field( 'lightbox.transitionEffect' ),
								$modula_nav_field( 'lightbox.showTitle' ),
								$modula_nav_field( 'lightbox.showCaption' ),
								$modula_nav_field( 'lightbox.captionPosition' ),
								$modula_nav_field( 'zoom.enableZoom' ),
								$modula_nav_kids(
									'zoom',
									'Zoom',
									'zoom.enableZoom',
									$modula_nav_fields(
										array(
											'zoom.zoomType',
											'zoom.zoomEffect',
											'zoom.magnifiedWindowHint',
											'zoom.zoomWindowPosition',
											'zoom.zoomWindowSize',
											'zoom.zoomLensSize',
											'zoom.zoomLensShape',
											'zoom.zoomTintOpacity',
											'zoom.zoomTintColor',
										)
									),
									array(
										'icon'        => 'search',
										'summaryKind' => 'zoom',
									)
								),
								$modula_nav_field( 'slideshow.enableSlideshow' ),
								$modula_nav_kids(
									'slideshow',
									'Slideshow',
									'slideshow.enableSlideshow',
									$modula_nav_fields(
										array(
											'slideshow.enableAutoplay',
											'slideshow.pauseOnHover',
											'slideshow.slideshowSpeed',
										)
									),
									array(
										'icon'         => 'next',
										'summaryParts' =>
										array(
											array(
												'path'       => 'slideshow.enableAutoplay',
												'type'       => 'truthy',
												'trueLabel'  => 'Autoplay',
												'falseLabel' => 'Manual',
											),
										),
									)
								),
								$modula_nav_field( 'lightbox.showThumbnails' ),
								$modula_nav_kids( 'thumbnail-strip', 'Thumbnail strip', 'lightbox.showThumbnails', $modula_nav_fields( array( 'lightbox.thumbsPosition' ) ) ),
							),
							array(),
							$modula_nav_lightbox_opens
						),
						// Shown instead of the lightbox options when a click does not open the lightbox.
						$modula_nav_field( 'lightbox.clickNotLightboxHint' ),
					),
				),
				array(
					'type'  => 'submenu',
					'id'    => 'more',
					'role'  => 'more',
					'label' => 'More settings',
					'items' =>
					array(
						array(
							'type'        => 'drill',
							'id'          => 'links',
							'label'       => 'Lightbox & Links',
							'icon'        => 'fullscreen',
							'visibleWhen' => $modula_nav_lightbox_opens,
							'items'       =>
							array(
								$modula_nav_field( 'lightbox.animationEffect' ),
								$modula_nav_field( 'lightbox.showAll' ),
								$modula_nav_field( 'lightbox.openFullscreen' ),
								$modula_nav_field( 'lightbox.toolbar' ),
								$modula_nav_kids(
									'buttons',
									'Buttons',
									'lightbox.toolbar',
									$modula_nav_fields(
										array(
											'lightbox.close',
											'lightbox.thumbs',
											'lightbox.download',
											'lightbox.zoom',
											'lightbox.share',
											'lightbox.infobar',
											'lightbox.enableFullscreen',
											'lightbox.downloadAllButton',
											'comments.toggleComments',
										)
									),
									array(
										'icon'        => 'menu',
										'summaryKind' => 'lightboxToolbarButtons',
									)
								),
								$modula_nav_field( 'lightbox.toolbarOffHint' ),
								$modula_nav_field( 'lightbox.doubleClick' ),
								$modula_nav_field( 'lightbox.clickSlide' ),
								// Not in the canvas's Zoom box (ticket 20); shown while zoom is on.
								$modula_nav_field(
									'zoom.zoomOnHover',
									array(
										'visibleWhen' => array(
											'path'   => 'zoom.enableZoom',
											'truthy' => true,
										),
									)
								),
							),
						),
						array(
							'type'                    => 'drill',
							'id'                      => 'exif',
							'label'                   => 'EXIF',
							'icon'                    => 'capturePhoto',
							'summaryKind'             => 'shootingData',
							'nestedUpsellGroupedPath' => 'exif.enableExif',
							'visibleWhen'             => $modula_nav_lightbox_opens,
							'items'                   =>
							array(
								$modula_nav_field( 'exif.enableExif' ),
								$modula_nav_kids(
									'exif-details',
									'Details',
									'exif.enableExif',
									$modula_nav_fields(
										array(
											'exif.exifCamera',
											'exif.exifLens',
											'exif.exifShutterSpeed',
											'exif.exifAperture',
											'exif.exifFocalLength',
											'exif.exifIso',
											'exif.exifDate',
										)
									)
								),
								$modula_nav_field( 'exif.enableExifOffHint' ),
								$modula_nav_field( 'exif.sectionResult' ),
								$modula_nav_field( 'exif.exifResultPreview' ),
							),
						),
						array(
							'type'                    => 'drill',
							'id'                      => 'deeplink',
							'label'                   => 'Photo links',
							'icon'                    => 'link',
							'summaryKind'             => 'deeplink',
							'nestedUpsellGroupedPath' => 'deeplink.modulaDeeplink',
							'visibleWhen'             => $modula_nav_lightbox_opens,
							'items'                   =>
							array(
								$modula_nav_field( 'deeplink.modulaDeeplink' ),
								$modula_nav_kids( 'deeplink-link', 'Link', 'deeplink.modulaDeeplink', $modula_nav_fields( array( 'deeplink.customLinkName', 'deeplink.urlPreview' ) ) ),
								$modula_nav_field( 'deeplink.modulaDeeplinkOffHint' ),
							),
						),
					),
				),
			),
		),
		array(
			'name'        => 'filters',
			'title'       => 'Filters',
			'liteUpsell'  => array(
				'title'  => 'Let visitors filter the gallery',
				'pitch'  => 'Sort photos into categories people can click.',
				'points' => array(
					array( 'label' => 'Filter galleries by category' ),
					array( 'label' => 'Image sorting' ),
					array( 'extension' => 'modula-video' ),
					array( 'extension' => 'modula-slideshow' ),
				),
			),
			'visibleWhen' => $modula_nav_not_types( $modula_nav_types_without_filters ),
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'id'    => 'hub',
					'role'  => 'hub',
					'items' =>
					array(
						$modula_nav_field( 'filters.filters' ),
						$modula_nav_field( 'filters.allFilterLabel' ),
						$modula_nav_field( 'filters.showFilterBar' ),
						$modula_nav_kids(
							'filter-bar',
							'Filter bar',
							'filters.showFilterBar',
							array(
								$modula_nav_field( 'filters.filterTextAlignment' ),
								$modula_nav_field( 'filters.filterPositioning' ),
								$modula_nav_field( 'filters.defaultActiveFilter' ),
								$modula_nav_field( 'filters.dropdownFilters' ),
								$modula_nav_field( 'filters.hideAllFilter' ),
								$modula_nav_field( 'filters.showFilterCount' ),
								$modula_nav_field( 'filters.filterLinkColor' ),
								$modula_nav_field( 'filters.filterLinkHoverColor' ),
								$modula_nav_field( 'filters.enableCollapsibleFilters' ),
								$modula_nav_kids( 'collapse', 'Collapse', 'filters.enableCollapsibleFilters', $modula_nav_fields( array( 'filters.collapsibleActionText' ) ) ),
								$modula_nav_field( 'filters.enableMobileDropdownFilters' ),
							),
							array( 'icon' => 'tag' )
						),
					),
				),
			),
		),
		array(
			'name'        => 'motion',
			'title'       => 'Motion',
			'description' => 'Hover and the effects that play as the gallery loads.',
			/*
			 * The slim picker (Motion spec, ticket 03): Entrance, Speed, Hover
			 * (its Customize opens the hover builder) and Animate on phones,
			 * beside Darken on hover. The older controls, and Cursor under Change
			 * the cursor, sit in More settings; the Hover menu replaces the Hover
			 * effects section. Video galleries have an entrance too, so the tab
			 * shows for them, without the hover rows, which never applied to Video.
			 */
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'id'    => 'hub',
					'role'  => 'hub',
					'items' =>
					array(
						$modula_nav_field( 'motion.entrance' ),
						$modula_nav_field( 'motion.speed' ),
						$modula_nav_field(
							'motion.hover',
							array(
								'visibleWhen' => $modula_nav_not_types( \Modula\V2\Motion\Animation_Catalog::menu_hidden_types( 'hover' ) ),
							)
						),
						$modula_nav_field( 'hover.dimOverlay', array( 'visibleWhen' => $modula_nav_not_types( array( 'video' ) ) ) ),
						$modula_nav_field( 'motion.phones' ),
					),
				),
				array(
					'type'  => 'submenu',
					'id'    => 'more',
					'role'  => 'more',
					'label' => 'More settings',
					'items' =>
					array(
						array(
							'type'        => 'drill',
							'id'          => 'layout',
							'label'       => 'This layout',
							'icon'        => 'gallery',
							'visibleWhen' => array(
								'any' => array( $modula_nav_widen_plays, $modula_nav_move_prints_plays ),
							),
							'items'       =>
							array(
								$modula_nav_field( 'motion.widen', array( 'visibleWhen' => $modula_nav_widen_plays ) ),
								$modula_nav_field( 'motion.movePrints', array( 'visibleWhen' => $modula_nav_move_prints_plays ) ),
							),
						),
						// Darken on hover's colour, while it is on.
						array(
							'type'        => 'drill',
							'id'          => 'overlay',
							'label'       => 'Overlay',
							'icon'        => 'brush',
							'visibleWhen' => array(
								'all' => array(
									array(
										'path'   => 'hover.dimOverlay',
										'truthy' => true,
									),
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
								),
							),
							'items'       => $modula_nav_fields( array( 'hover.hoverColor' ) ),
						),
						/*
						 * Owners only select Motion presets (maintainer, Motion
						 * ticket 05): Zoom on hover, which edits the hover builder
						 * and could make the choice Custom, is not placed.
						 * Cursor and its upload follow Change the cursor: with it
						 * off the tiles keep the pointer, so form-rules.json shows
						 * them only while it is on (editor-qa 2026-10-29, ticket 14).
						 */
						array(
							'type'        => 'drill',
							'id'          => 'cursor-zoom',
							'label'       => 'Cursor options',
							'icon'        => 'search',
							'visibleWhen' => $modula_nav_hover_types,
							'items'       =>
							array(
								$modula_nav_field(
									'hover.changeCursor',
									array(
										'visibleWhen' => $modula_nav_not_types( array( 'video', 'story', 'template', 'slider' ) ),
									)
								),
								$modula_nav_field( 'hover.cursor' ),
								$modula_nav_field( 'hover.uploadCursor' ),
							),
						),
						/*
						 * Not placed (maintainer, Motion ticket 05):
						 * - Loading effects: editing them made the entrance Custom;
						 *   galleries already on Custom keep playing their stored
						 *   loadingEffects.*.
						 * - Reduced motion ("No animation for people who ask for
						 *   less"): visitors whose device asks for less motion now
						 *   always get none, so the setting changes nothing.
						 */
					),
				),
			),
		),
		array(
			'name'        => 'interaction',
			'title'       => 'Interact',
			'description' => 'What visitors can do with the images.',
			'visibleWhen' => array(
				'path' => 'general.type',
				'neq'  => 'video',
			),
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'id'    => 'hub',
					'role'  => 'hub',
					'items' =>
					array(
						$modula_nav_field(
							'download.enableDownload',
							array(
								'icon'        => 'download',
								'visibleWhen' => array(
									'path' => 'general.type',
									'neq'  => 'video',
								),
							)
						),
						$modula_nav_kids(
							'download',
							'Download',
							'download.enableDownload',
							array(
								$modula_nav_field( 'download.downloadGalleryButton' ),
								$modula_nav_field( 'download.downloadAllGalleryButton' ),
								$modula_nav_kids(
									'gallery-button',
									'The gallery button',
									'download.downloadAllGalleryButton',
									$modula_nav_fields(
										array(
											'download.downloadAllLabel',
											'download.downloadAllPosition',
											'download.downloadAllHposition',
											'download.downloadAllColor',
											'download.downloadAllBackgroundColor',
											'download.downloadAllGalleryButtonIcon',
											'download.downloadAllGalleryIconColor',
											'download.customZipName',
										)
									)
								),
								$modula_nav_field( 'download.downloadImageSizes' ),
							),
							array(
								'icon'        => 'download',
								'summaryKind' => 'download',
								'visibleWhen' => array(
									'path' => 'general.type',
									'neq'  => 'video',
								),
							)
						),
						$modula_nav_field(
							'comments.commentStatus',
							array(
								'icon'        => 'comment',
								'visibleWhen' => array(
									'path' => 'general.type',
									'neq'  => 'video',
								),
							)
						),
						$modula_nav_kids(
							'comments',
							'Comments',
							'comments.commentStatus',
							$modula_nav_fields( array( 'comments.startCollapsed' ) ),
							array(
								'icon'        => 'comment',
								'summaryKind' => 'comments',
								'visibleWhen' => array(
									'path' => 'general.type',
									'neq'  => 'video',
								),
							)
						),
					),
				),
				array(
					'type'  => 'submenu',
					'id'    => 'share',
					'role'  => 'hub',
					'label' => 'Share',
					'items' =>
					array(
						$modula_nav_field(
							'social.enableSocial',
							array(
								'icon'        => 'share',
								'visibleWhen' => array(
									'path' => 'general.type',
									'neq'  => 'video',
								),
							)
						),
						$modula_nav_kids(
							'social',
							'Sharing',
							'social.enableSocial',
							$modula_nav_fields(
								array(
									'social.enableTwitter',
									'social.enableFacebook',
									'social.enableWhatsapp',
									'social.enableLinkedin',
									'social.enablePinterest',
									'social.enableEmail',
									'social.noNetworkStyleHint',
									'social.socialIconColor',
									'social.socialIconSize',
									'social.socialIconPadding',
									'social.socialDesktopCollapsed',
								)
							),
							array(
								'icon'        => 'share',
								'summaryKind' => 'socialNetworks',
								'visibleWhen' => array(
									'path' => 'general.type',
									'neq'  => 'video',
								),
							)
						),
					),
				),
				array(
					'type'  => 'submenu',
					'id'    => 'more',
					'role'  => 'more',
					'label' => 'More settings',
					'items' =>
					array(
						// The canvas does not draw the email text (ticket 20).
						array(
							'type'         => 'drill',
							'id'           => 'email',
							'label'        => 'Email',
							'icon'         => 'share',
							'visibleWhen'  => array(
								'all' => array(
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
									array(
										'path'   => 'social.enableSocial',
										'truthy' => true,
									),
									array(
										'path'   => 'social.enableEmail',
										'truthy' => true,
									),
								),
							),
							'groupedPaths' =>
							array(
								'social.emailSubject',
								'social.emailMessage',
							),
						),
					),
				),
			),
		),
		array(
			'name'        => 'protection',
			'title'       => 'Protect',
			'description' => 'How hard it is to take an image out of this gallery.',
			'liteUpsell'  => array(
				'title'  => 'Protect your photos',
				'pitch'  => 'Stop people from copying or reusing your images.',
				'points' => array(
					array( 'extension' => 'modula-password-protect' ),
					array( 'extension' => 'modula-image-guardian' ),
					array( 'extension' => 'modula-image-licensing' ),
					array( 'extension' => 'modula-watermark' ),
				),
			),
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'id'    => 'hub',
					'role'  => 'hub',
					'items' =>
					array(
						$modula_nav_field( 'passwordProtect.enablePassword', array( 'icon' => 'lock' ) ),
						$modula_nav_kids(
							'password',
							'Pass Protect',
							'passwordProtect.enablePassword',
							$modula_nav_fields(
								array(
									'passwordProtect.password',
									'passwordProtect.passwordProtectText',
								)
							),
							array(
								'icon'        => 'lock',
								'summaryKind' => 'password',
							)
						),
						// The canvas toggles Watermark with `watermark.enableWatermark`, the flag
						// Pro checks before it applies a watermark (ticket 26).
						$modula_nav_field(
							'watermark.enableWatermark',
							array(
								'icon'        => 'image',
								'visibleWhen' => array(
									'path' => 'general.type',
									'neq'  => 'video',
								),
							)
						),
						$modula_nav_kids(
							'watermark',
							'Watermark',
							'watermark.enableWatermark',
							$modula_nav_fields(
								array(
									'watermark.watermarkType',
									'watermark.customSettingsWatermark',
									'watermark.watermarkText',
									'watermark.watermarkTextSizeShare',
									'watermark.watermarkTextColor',
									'watermark.watermarkTextTypeHint',
									'watermark.watermarkImage',
									'watermark.watermarkImageDimensionWidth',
									'watermark.watermarkImageTypeHint',
									'watermark.watermarkPosition',
									'watermark.watermarkOpacity',
									'watermark.watermarkApplyScope',
									'watermark.watermarkEnableBackup',
									'watermark.watermarkBurnInHint',
									'watermark.watermarkApplyToExistingImages',
								)
							),
							array(
								'icon'        => 'image',
								'summaryKind' => 'watermark',
								'visibleWhen' => array(
									'path' => 'general.type',
									'neq'  => 'video',
								),
							)
						),
						// Removing burned-in watermarks does not depend on the toggle, so the
						// action sits under the box instead of inside it (ticket 41).
						$modula_nav_field(
							'watermark.watermarkRemoveWatermark',
							array(
								'visibleWhen' => array(
									'path' => 'general.type',
									'neq'  => 'video',
								),
							)
						),
						// Image Guardian and Image licensing stay sections: the canvas toggles them
						// with `protection.guardian` and `licensing.enable`, keys that do not exist.
						array(
							'type'                    => 'drill',
							'id'                      => 'guardian',
							'label'                   => 'Image Guardian',
							'icon'                    => 'shield',
							'summaryKind'             => 'imageGuardian',
							'nestedUpsellGroupedPath' => 'protection.protection',
							'visibleWhen'             => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
							'items'                   =>
							array(
								$modula_nav_field( 'protection.protection' ),
								$modula_nav_kids( 'guardian-message', 'Message', 'protection.protection', $modula_nav_fields( array( 'protection.rightClickMessage' ) ) ),
								$modula_nav_field( 'protection.blockDragging' ),
								$modula_nav_field( 'protection.blurProtection' ),
								$modula_nav_field( 'protection.urlProtection' ),
								$modula_nav_field( 'protection.urlProtectionCostHint' ),
							),
						),
						array(
							'type'                    => 'drill',
							'id'                      => 'licensing',
							'label'                   => 'Image licensing',
							'icon'                    => 'info',
							'summaryKind'             => 'imageLicensing',
							'nestedUpsellGroupedPath' => 'licensing.imageLicensing',
							'groupedPaths'            =>
							array(
								'licensing.imageLicensing',
								'licensing.author',
								'licensing.company',
								'licensing.displayWithDescription',
								'licensing.showOnLightbox',
							),
							'visibleWhen'             => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
						),
					),
				),
				// Protect settings the canvas parks (ticket 20), each gated like the hub box it
				// left: the username while password protection is on, the margin while Watermark is on.
				array(
					'type'  => 'submenu',
					'id'    => 'more',
					'role'  => 'more',
					'label' => 'More settings',
					'items' =>
					array(
						array(
							'type'         => 'drill',
							'id'           => 'password-more',
							'label'        => 'Pass Protect',
							'icon'         => 'lock',
							'visibleWhen'  => array(
								'path'   => 'passwordProtect.enablePassword',
								'truthy' => true,
							),
							'groupedPaths' =>
							array(
								'passwordProtect.passwordProtectUsername',
							),
						),
						array(
							'type'                    => 'drill',
							'id'                      => 'watermark-more',
							'label'                   => 'Watermark margin',
							'icon'                    => 'image',
							'nestedUpsellGroupedPath' => 'watermark.enableWatermark',
							'visibleWhen'             => array(
								'all' => array(
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
									array(
										'path'   => 'watermark.enableWatermark',
										'truthy' => true,
									),
								),
							),
							'groupedPaths'            =>
							array(
								'watermark.watermarkMarginShare',
							),
						),
					),
				),
			),
		),
		// Instagram and Proofing gate through their fields (Lite upsell on the hub toggle,
		// Pro extension flags), as their drills did when they sat in the Advanced category.
		array(
			'name'        => 'instagram',
			'title'       => 'Instagram',
			'description' => 'Bring the photos from an Instagram account into this gallery.',
			'liteUpsell'  => array(
				'title'  => 'Show your Instagram photos',
				'pitch'  => 'Bring the photos from your Instagram account into this gallery.',
				'points' => array(
					array( 'extension' => 'modula-instagram' ),
					array( 'extension' => 'modula-albums' ),
					array( 'extension' => 'modula-password-protect' ),
					array( 'extension' => 'modula-speedup' ),
				),
			),
			'visibleWhen' => array(
				'path' => 'general.type',
				'neq'  => 'video',
			),
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'id'    => 'hub',
					'role'  => 'hub',
					'items' =>
					array(
						$modula_nav_field( 'instagram.accountPanel' ),
						$modula_nav_field( 'instagram.syncWithInstagram' ),
						$modula_nav_field( 'instagram.managePhotos' ),
						$modula_nav_field( 'instagram.cronNote' ),
					),
				),
			),
		),
		array(
			'name'        => 'proofing',
			'title'       => 'Proofing',
			'description' => 'Let clients pick their favourite images.',
			'liteUpsell'  => array(
				'title'  => 'Let clients pick their favorites',
				'pitch'  => 'Share the gallery with a client. They mark the photos they like and you get the list.',
				'points' => array(
					array( 'extension' => 'modula-image-proofing' ),
					array( 'extension' => 'modula-watermark' ),
					array( 'extension' => 'modula-exif' ),
					array( 'extension' => 'modula-download' ),
				),
			),
			'visibleWhen' => $modula_nav_not_types( array( 'video', 'template' ) ),
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'id'    => 'hub',
					'role'  => 'hub',
					'items' =>
					array(
						$modula_nav_field( 'proofing.imageProofing' ),
						$modula_nav_kids(
							'proofing-options',
							'Proofing',
							'proofing.imageProofing',
							$modula_nav_fields(
								array(
									'proofing.minSelection',
									'proofing.maxSelection',
									'proofing.notificationEmail',
									'proofing.showLoginLink',
									'proofing.loginRejectionNotice',
									'proofing.expireRejectionNotice',
									'proofing.expireLinkToPage',
									'proofing.expireLinkToPageUrl',
									'proofing.manageProofing',
								)
							),
							array( 'icon' => 'people' )
						),
					),
				),
			),
		),
		array(
			'name'              => 'video',
			'title'             => 'Video',
			'description'       => 'Video playback, play icons, lightbox autoplay, and hover preview for Video galleries and mixed image galleries that include videos.',
			'requiresExtension' => 'modula-video',
			// The canvas card; message and link from the metabox's Video tab upsell
			// (Modula_Tab_Content_Handler::video_tab_upsell).
			'liteUpsell'        =>
			array(
				'title'           => 'Add videos to your galleries',
				'pitch'           => 'Mix YouTube, Vimeo and your own videos with photos.',
				'points'          => array(
					array( 'extension' => 'modula-video' ),
					array( 'extension' => 'modula-slideshow' ),
					array( 'label' => 'Filter galleries by category' ),
					array( 'label' => 'Image sorting' ),
				),
				'needsProMessage' => 'Adding a video gallery with self-hosted videos or videos from sources like YouTube and Vimeo to your website has never been easier.',
				'pricingUrl'      => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=modula-video_tab_upsell-tab&utm_campaign=modula-video&utm_content=v3',
				'getPremiumLabel' => 'Get Premium!',
			),
			'visibleWhen'       => $modula_nav_not_types( array( 'story', 'showcase', 'slider', 'template' ) ),
			'hubSections'       =>
			array(
				array(
					'type'  => 'submenu',
					'id'    => 'hub',
					'role'  => 'hub',
					'items' =>
					array(
						$modula_nav_field( 'video.playlistPosition' ),
						$modula_nav_field( 'video.autoplayVideos' ),
						$modula_nav_field( 'video.loopVideos' ),
						$modula_nav_field( 'video.showVideoIcon' ),
						$modula_nav_kids(
							'play-icon',
							'Play icon',
							'video.showVideoIcon',
							$modula_nav_fields(
								array(
									'video.videoIconIcon',
									'video.customVideoIcon',
									'video.videoIconColor',
									'video.playIconSize',
								)
							),
							array( 'summaryKind' => 'playIcon' )
						),
						$modula_nav_field( 'video.previewVideo' ),
						// Hidden for Video galleries, which have their own row below.
						$modula_nav_kids(
							'preview',
							'Preview',
							'video.previewVideo',
							$modula_nav_fields( array( 'video.autoplayThumbnail', 'video.previewVideoDuration' ) ),
							array(
								'visibleWhen' => array(
									'path' => 'general.type',
									'neq'  => 'video',
								),
							)
						),
						// Video galleries have no hover preview: their main player autoplays from this
						// setting. The only setting placed twice; the two placements exclude each other.
						$modula_nav_field(
							'video.autoplayThumbnail',
							array(
								'visibleWhen' => array(
									'path' => 'general.type',
									'eq'   => 'video',
								),
							)
						),
					),
				),
				array(
					'type'  => 'submenu',
					'id'    => 'more',
					'role'  => 'more',
					'label' => 'More settings',
					'items' =>
					array(
						// The canvas does not draw the playlist scrollbar (ticket 20).
						array(
							'type'         => 'drill',
							'id'           => 'playlist',
							'label'        => 'Playlist',
							'icon'         => 'video',
							'groupedPaths' =>
							array(
								'video.showPlaylistScrollbar',
							),
						),
					),
				),
			),
		),
		array(
			'name'        => 'css',
			'title'       => 'CSS',
			'description' => 'Custom CSS for this gallery.',
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'id'    => 'hub',
					'role'  => 'hub',
					'items' =>
					array(
						$modula_nav_field( 'style.customCss' ),
					),
				),
			),
		),
	),
	'groupLabels' =>
	array(
		'general'         => 'General',
		'layout'          => 'Layout',
		'responsive'      => 'Responsive',
		'performance'     => 'Performance',
		'captions'        => 'Captions & titles',
		'hover'           => 'Hover',
		'style'           => 'Style',
		'loadingEffects'  => 'Loading effects',
		'lightbox'        => 'Lightbox',
		'slider'          => 'Slider',
		'story'           => 'Story',
		'showcase'        => 'Showcase',
		'template'        => 'Template',
		'video'           => 'Video',
		'slideshow'       => 'Slideshow',
		'social'          => 'Social',
		'filters'         => 'Filters',
		'pagination'      => 'Pagination',
		'deeplink'        => 'Deeplink',
		'passwordProtect' => 'Password protect',
		'protection'      => 'Image Guardian',
		'download'        => 'Download',
		'zoom'            => 'Zoom',
		'watermark'       => 'Watermark',
		'exif'            => 'EXIF',
		'licensing'       => 'Image licensing',
		'comments'        => 'Comments',
		'proofing'        => 'Image proofing',
		'instagram'       => 'Instagram',
		'exportImport'    => 'Presets',
	),
);
