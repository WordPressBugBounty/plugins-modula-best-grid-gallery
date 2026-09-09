<?php

/**
 * Settings editor: tab categories + per-group card labels (English source strings).
 * Loaded into the v2 document as `editorNavigation`; codegen emits `modula-settings-editor-structure.js`.
 *
 * Hub `icon` values map to `TAKEOVER_HUB_ICON_BY_ID` in `apps/gallery-editor/constants/takeoverHubSectionIcons.js`.
 *
 * @package Modula
 */

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
					'label' => 'Structure',
					'items' =>
					array(
						array(
							'type'              => 'field',
							'groupedPath'       => 'general.type',
							'fieldPresentation' => 'embedded',
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'template.templateLayout',
							'icon'        => 'gallery',
							'visibleWhen' => array(
								'path' => 'general.type',
								'eq'   => 'template',
							),
						),
						array(
							'type'         => 'drill',
							'label'        => 'Gallery layout',
							'icon'         => 'layout',
							'summaryKind'  => 'galleryLayout',
							'visibleWhen'  => array(
								'all' =>
								array(
									array(
										'path' => 'general.type',
										'neq'  => 'slider',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'story',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'showcase',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'template',
									),
								),
							),
							'groupedPaths' =>
							array(
								0  => 'general.width',
								1  => 'general.height',
								2  => 'layout.gridType',
								3  => 'polaroid.uniformSize',
								4  => 'polaroid.uniformColumns',
								5  => 'layout.uniformGridTileAspect',
								6  => 'layout.uniformGridTileAspectCustom',
								7  => 'layout.fitGridImageAlign',
								8  => 'layout.gridRowHeight',
								9  => 'layout.gridJustifyLastRow',
								10 => 'layout.gutter',
								11 => 'layout.tabletGutter',
								12 => 'layout.mobileGutter',
								13 => 'layout.gridImageSize',
								14 => 'layout.gridImageDimensions',
								15 => 'layout.gridImageCrop',
								16 => 'layout.parallaxOverlayEnabled',
								17 => 'layout.parallaxOverlayBackground',
								18 => 'layout.parallaxCaption',
								19 => 'layout.parallaxMotionPreset',
								20 => 'general.randomFactor',
								21 => 'polaroid.randomFactor',
								22 => 'polaroid.rotationMax',
								23 => 'polaroid.scatterMax',
								24 => 'polaroid.showPin',
								25 => 'polaroid.framePadding',
								26 => 'polaroid.chinHeight',
								27 => 'general.shuffle',
							),
						),
						array(
							'type'                => 'drill',
							'label'               => 'Gallery layout',
							'icon'                => 'gallery',
							'prependGroupedPaths' =>
							array(
								0 => 'slider.sectionSize',
								1 => 'general.width',
							),
							'group'               => 'slider',
							'summaryParts'        =>
							array(
								array(
									'path'     => 'general.width',
									'type'     => 'text',
									'template' => '{value}',
								),
								array(
									'path'     => 'slider.slidesToShow',
									'type'     => 'text',
									'template' => '{value} visible',
								),
							),
							'visibleWhen'         => array(
								'path' => 'general.type',
								'eq'   => 'slider',
							),
						),
						array(
							'type'                => 'drill',
							'label'               => 'Gallery layout',
							'icon'                => 'gallery',
							'prependGroupedPaths' =>
							array(
								0 => 'story.sectionSize',
								1 => 'general.width',
							),
							'group'               => 'story',
							'summaryParts'        =>
							array(
								array(
									'path'     => 'general.width',
									'type'     => 'text',
									'template' => '{value}',
								),
								array(
									'path'       => 'story.infinite',
									'type'       => 'truthy',
									'trueLabel'  => 'loop',
									'falseLabel' => 'once',
								),
							),
							'visibleWhen'         => array(
								'path' => 'general.type',
								'eq'   => 'story',
							),
						),
						array(
							'type'                => 'drill',
							'label'               => 'Gallery layout',
							'icon'                => 'gallery',
							'prependGroupedPaths' =>
							array(
								0 => 'showcase.sectionLayout',
								1 => 'general.width',
							),
							'group'               => 'showcase',
							'summaryParts'        =>
							array(
								array(
									'path'     => 'general.width',
									'type'     => 'text',
									'template' => '{value}',
								),
								array(
									'path'     => 'showcase.visibleCount',
									'type'     => 'text',
									'template' => '{value} visible',
								),
							),
							'visibleWhen'         => array(
								'path' => 'general.type',
								'eq'   => 'showcase',
							),
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'pagination.enablePagination',
							'icon'        => 'queryPagination',
							'visibleWhen' => array(
								'all' =>
								array(
									array(
										'path' => 'general.type',
										'neq'  => 'slider',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'story',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'showcase',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'template',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'parallax-masonry',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'bnb',
									),
								),
							),
						),
						array(
							'type'         => 'drill',
							'label'        => 'Page size & navigation',
							'icon'         => 'queryPagination',
							'summaryKind'  => 'pagination',
							'groupedPaths' =>
							array(
								0 => 'pagination.maxImagesCount',
								1 => 'pagination.maxImagesCountMobile',
								2 => 'pagination.enableInfiniteScroll',
								3 => 'pagination.enableLoadMore',
								4 => 'pagination.paginationNumber',
								5 => 'pagination.paginationColor',
								6 => 'pagination.activePaginationColor',
								7 => 'pagination.paginationPosition',
							),
							'visibleWhen'  => array(
								'all' =>
								array(
									array(
										'path'   => 'pagination.enablePagination',
										'truthy' => true,
									),
									array(
										'path' => 'general.type',
										'neq'  => 'slider',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'story',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'showcase',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'template',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'parallax-masonry',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'bnb',
									),
								),
							),
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'Content',
					'items' =>
					array(
						array(
							'type'                => 'drill',
							'label'               => 'Captions & titles',
							'group'               => 'captions',
							'icon'                => 'caption',
							'prependGroupedPaths' =>
							array(
								0 => 'slider.imageInfo',
								1 => 'slider.imageInfoPosition',
							),
							'summaryParts'        =>
							array(
								array(
									'path' => 'slider.imageInfoPosition',
									'type' => 'enum',
								),
								array(
									'path'     => 'captions.titleFontSize',
									'type'     => 'text',
									'template' => '{value}px',
								),
							),
							'visibleWhen'         => array(
								'path' => 'general.type',
								'eq'   => 'slider',
							),
						),
						array(
							'type'         => 'drill',
							'label'        => 'Captions & titles',
							'group'        => 'captions',
							'icon'         => 'caption',
							'summaryParts' =>
							array(
								array(
									'path'     => 'captions.titleFontSize',
									'type'     => 'text',
									'template' => '{value}px',
								),
							),
							'visibleWhen'  => array(
								'path' => 'general.type',
								'eq'   => 'template',
							),
						),
						array(
							'type'         => 'drill',
							'label'        => 'Captions & titles',
							'group'        => 'captions',
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
								'all' => array(
									array(
										'path' => 'general.type',
										'neq'  => 'slider',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'template',
									),
								),
							),
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'Appearance',
					'items' =>
					array(
						array(
							'type'         => 'drill',
							'label'        => 'Style',
							'group'        => 'style',
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
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'Responsive',
					'items' =>
					array(
						array(
							'type'        => 'field',
							'groupedPath' => 'responsive.enableResponsive',
							'icon'        => 'desktop',
							'visibleWhen' => array(
								'all' =>
								array(
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'creative-gallery',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'bnb',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'story',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'showcase',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'template',
									),
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
								),
							),
						),
						array(
							'type'         => 'drill',
							'label'        => 'On phones and tablets',
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
							'groupedPaths' =>
							array(
								0 => 'responsive.tabletColumns',
								1 => 'responsive.mobileColumns',
								2 => 'responsive.treatAsTabletUnder',
								3 => 'responsive.treatAsPhoneUnder',
								4 => 'slider.tabletSlides',
								5 => 'slider.tabletScrolls',
								6 => 'slider.mobileSlides',
								7 => 'slider.mobileScrolls',
							),
							'visibleWhen'  => array(
								'all' =>
								array(
									array(
										'path'   => 'responsive.enableResponsive',
										'truthy' => true,
									),
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'creative-gallery',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'bnb',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'story',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'showcase',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'template',
									),
								),
							),
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'Elsewhere',
					'items' =>
					array(
						array(
							'type'           => 'exit',
							'label'          => 'Hover and loading effects',
							'targetCategory' => 'interaction',
							'targetLabel'    => 'Interaction',
						),
					),
				),
			),
		),
		array(
			'name'        => 'lightbox',
			'title'       => 'Lightbox',
			'description' => 'What happens after someone clicks an image.',
			'visibleWhen' => array(
				'all' => array(
					array(
						'path' => 'general.type',
						'neq'  => 'slider',
					),
					array(
						'path' => 'general.type',
						'neq'  => 'story',
					),
					array(
						'path' => 'general.type',
						'neq'  => 'video',
					),
				),
			),
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'label' => 'Lightbox',
					'items' =>
					array(
						array(
							'type'              => 'field',
							'groupedPath'       => 'lightbox.lightbox',
							'fieldPresentation' => 'embedded',
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'lightbox.clickNotLightboxHint',
						),
					),
				),
				array(
					'type'        => 'submenu',
					'label'       => 'Opening',
					'visibleWhen' => array(
						'path' => 'lightbox.lightbox',
						'eq'   => 'fancybox',
					),
					'items'       =>
					array(
						array(
							'type'              => 'field',
							'groupedPath'       => 'lightbox.openOn',
							'fieldPresentation' => 'embedded',
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'lightbox.loop',
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'slideshow.enableSlideshow',
							'icon'        => 'next',
						),
						array(
							'type'         => 'drill',
							'label'        => 'Slideshow options',
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
							'groupedPaths' =>
							array(
								0 => 'slideshow.sectionPlayback',
								1 => 'slideshow.enableAutoplay',
								2 => 'slideshow.pauseOnHover',
								3 => 'slideshow.slideshowSpeed',
							),
							'visibleWhen'  => array(
								'path'   => 'slideshow.enableSlideshow',
								'truthy' => true,
							),
						),
						array(
							'type'         => 'drill',
							'label'        => 'Click and motion',
							'icon'         => 'fullscreen',
							'groupedPaths' =>
							array(
								0 => 'lightbox.sectionClick',
								1 => 'lightbox.doubleClick',
								2 => 'lightbox.clickSlide',
								3 => 'lightbox.sectionMotion',
								4 => 'lightbox.animationEffect',
								5 => 'lightbox.sectionDisplay',
								6 => 'lightbox.showAll',
								7 => 'lightbox.openFullscreen',
							),
						),
					),
				),
				array(
					'type'        => 'submenu',
					'label'       => 'Controls',
					'visibleWhen' => array(
						'path' => 'lightbox.lightbox',
						'eq'   => 'fancybox',
					),
					'items'       =>
					array(
						array(
							'type'         => 'drill',
							'label'        => 'Buttons in the viewer',
							'icon'         => 'menu',
							'summaryKind'  => 'lightboxToolbarButtons',
							'groupedPaths' =>
							array(
								0  => 'lightbox.sectionToolbar',
								1  => 'lightbox.toolbar',
								2  => 'lightbox.toolbarOffHint',
								3  => 'lightbox.sectionButtons',
								4  => 'lightbox.close',
								5  => 'lightbox.thumbs',
								6  => 'lightbox.download',
								7  => 'lightbox.zoom',
								8  => 'lightbox.share',
								9  => 'lightbox.infobar',
								10 => 'lightbox.enableFullscreen',
								11 => 'lightbox.downloadAllButton',
							),
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'lightbox.showThumbnails',
						),
						array(
							'type'              => 'field',
							'groupedPath'       => 'lightbox.thumbsPosition',
							'fieldPresentation' => 'embedded',
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'lightbox.showNavigation',
						),
					),
				),
				array(
					'type'        => 'submenu',
					'label'       => 'Appearance',
					'visibleWhen' => array(
						'path' => 'lightbox.lightbox',
						'eq'   => 'fancybox',
					),
					'items'       =>
					array(
						array(
							'type'        => 'field',
							'groupedPath' => 'lightbox.backgroundColor',
						),
						array(
							'type'              => 'field',
							'groupedPath'       => 'lightbox.transitionEffect',
							'fieldPresentation' => 'embedded',
						),
					),
				),
				array(
					'type'        => 'submenu',
					'label'       => 'Text',
					'visibleWhen' => array(
						'path' => 'lightbox.lightbox',
						'eq'   => 'fancybox',
					),
					'items'       =>
					array(
						array(
							'type'        => 'field',
							'groupedPath' => 'lightbox.showTitle',
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'lightbox.showCaption',
						),
						array(
							'type'              => 'field',
							'groupedPath'       => 'lightbox.captionPosition',
							'fieldPresentation' => 'embedded',
						),
					),
				),
			),
		),
		array(
			'name'        => 'filters',
			'title'       => 'Filters',
			'visibleWhen' => array(
				'all' => array(
					array(
						'path' => 'general.type',
						'neq'  => 'slider',
					),
					array(
						'path' => 'general.type',
						'neq'  => 'story',
					),
					array(
						'path' => 'general.type',
						'neq'  => 'showcase',
					),
					array(
						'path' => 'general.type',
						'neq'  => 'parallax-masonry',
					),
					array(
						'path' => 'general.type',
						'neq'  => 'bnb',
					),
					array(
						'path' => 'general.type',
						'neq'  => 'video',
					),
					array(
						'path' => 'general.type',
						'neq'  => 'template',
					),
				),
			),
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'label' => 'Filter Bar',
					'items' =>
					array(
						array(
							'type'        => 'field',
							'groupedPath' => 'filters.showFilterBar',
						),
						array(
							'type'         => 'drill',
							'label'        => 'Filters',
							'icon'         => 'tag',
							'summaryKind'  => 'filtersList',
							'groupedPaths' =>
							array(
								0 => 'filters.sectionFiltersList',
								1 => 'filters.filters',
								2 => 'filters.sectionAllLabel',
								3 => 'filters.allFilterLabel',
							),
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'filters.filterTextAlignment',
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'filters.filterPositioning',
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'Behavior',
					'items' =>
					array(
						array(
							'type'              => 'field',
							'groupedPath'       => 'filters.defaultActiveFilter',
							'fieldPresentation' => 'embedded',
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'filters.dropdownFilters',
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'filters.hideAllFilter',
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'filters.showFilterCount',
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'Appearance',
					'items' =>
					array(
						array(
							'type'        => 'field',
							'groupedPath' => 'filters.filterLinkColor',
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'filters.filterLinkHoverColor',
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'Mobile',
					'items' =>
					array(
						array(
							'type'        => 'field',
							'groupedPath' => 'filters.enableCollapsibleFilters',
						),
						array(
							'type'              => 'field',
							'groupedPath'       => 'filters.collapsibleActionText',
							'fieldPresentation' => 'embedded',
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'filters.enableMobileDropdownFilters',
						),
					),
				),
			),
		),
		array(
			'name'        => 'interaction',
			'title'       => 'Interaction',
			'description' => 'Hover, click and the effects that play as the gallery loads.',
			'visibleWhen' => array(
				'path' => 'general.type',
				'neq'  => 'video',
			),
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'label' => 'On Hover',
					'items' =>
					array(
						array(
							'type'         => 'drill',
							'label'        => 'Hover effect',
							'icon'         => 'brush',
							'summaryKind'  => 'hoverEffect',
							'groupedPaths' =>
							array(
								0 => 'hover.sectionPresets',
								1 => 'hover.effectBuilder',
								2 => 'hover.sectionOverlay',
								3 => 'hover.dimOverlay',
								4 => 'hover.hoverColor',
								5 => 'hover.sectionCursor',
								6 => 'hover.cursor',
								7 => 'hover.uploadCursor',
							),
							'visibleWhen'  => array(
								'all' => array(
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'story',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'slider',
									),
								),
							),
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'zoom.enableZoom',
							'icon'        => 'search',
							'visibleWhen' => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
						),
						array(
							'type'         => 'drill',
							'label'        => 'Zoom options',
							'icon'         => 'search',
							'summaryKind'  => 'zoom',
							'groupedPaths' =>
							array(
								0  => 'zoom.sectionStyle',
								1  => 'zoom.zoomType',
								2  => 'zoom.zoomEffect',
								3  => 'zoom.sectionMagnifiedWindow',
								4  => 'zoom.magnifiedWindowHint',
								5  => 'zoom.zoomWindowPosition',
								6  => 'zoom.zoomWindowSize',
								7  => 'zoom.zoomLensSize',
								8  => 'zoom.zoomLensShape',
								9  => 'zoom.sectionTint',
								10 => 'zoom.zoomTintOpacity',
								11 => 'zoom.zoomTintColor',
							),
							'visibleWhen'  => array(
								'all' => array(
									array(
										'path'   => 'zoom.enableZoom',
										'truthy' => true,
									),
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
								),
							),
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'hover.changeCursor',
							'visibleWhen' => array(
								'all' => array(
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'story',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'template',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'slider',
									),
								),
							),
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'On Load',
					'items' =>
					array(
						array(
							'type'         => 'drill',
							'label'        => 'Loading effect',
							'icon'         => 'shuffle',
							'summaryKind'  => 'loadingEffect',
							'groupedPaths' =>
							array(
								0 => 'loadingEffects.sectionMotion',
								1 => 'loadingEffects.enableScale',
								2 => 'loadingEffects.loadedScale',
								3 => 'loadingEffects.enableRotate',
								4 => 'loadingEffects.loadedRotate',
								5 => 'loadingEffects.enableSlide',
								6 => 'loadingEffects.loadedHSlide',
								7 => 'loadingEffects.loadedVSlide',
							),
							'visibleWhen'  => array(
								'all' => array(
									array(
										'path' => 'general.type',
										'neq'  => 'parallax-masonry',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'story',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'showcase',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'template',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'slider',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
								),
							),
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'loadingEffects.inView',
							'visibleWhen' => array(
								'all' => array(
									array(
										'path' => 'general.type',
										'neq'  => 'parallax-masonry',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'story',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'showcase',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'template',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'slider',
									),
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
								),
							),
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'What visitors can do',
					'items' =>
					array(
						array(
							'type'        => 'field',
							'groupedPath' => 'download.enableDownload',
							'icon'        => 'download',
							'visibleWhen' => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
						),
						array(
							'type'         => 'drill',
							'label'        => 'Download options',
							'icon'         => 'download',
							'summaryKind'  => 'download',
							'groupedPaths' =>
							array(
								0  => 'download.sectionWhatTheyCanTake',
								1  => 'download.downloadGalleryButton',
								2  => 'download.downloadAllGalleryButton',
								3  => 'download.downloadImageSizes',
								4  => 'download.sectionGalleryButton',
								5  => 'download.downloadAllLabel',
								6  => 'download.downloadAllPosition',
								7  => 'download.downloadAllHposition',
								8  => 'download.sectionHowItLooks',
								9  => 'download.downloadAllColor',
								10 => 'download.downloadAllBackgroundColor',
								11 => 'download.downloadAllGalleryButtonIcon',
								12 => 'download.downloadAllGalleryIconColor',
								13 => 'download.sectionZipName',
								14 => 'download.customZipName',
							),
							'visibleWhen'  => array(
								'all' => array(
									array(
										'path'   => 'download.enableDownload',
										'truthy' => true,
									),
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
								),
							),
						),
						array(
							'type'         => 'drill',
							'label'        => 'Sharing',
							'icon'         => 'share',
							'summaryKind'  => 'socialNetworks',
							'groupedPaths' =>
							array(
								0  => 'social.sectionWhereTheyCanShare',
								1  => 'social.enableTwitter',
								2  => 'social.enableFacebook',
								3  => 'social.enableWhatsapp',
								4  => 'social.enableLinkedin',
								5  => 'social.enablePinterest',
								6  => 'social.enableEmail',
								7  => 'social.emailSubject',
								8  => 'social.emailMessage',
								9  => 'social.sectionHowButtonsLook',
								10 => 'social.noNetworkStyleHint',
								11 => 'social.socialIconColor',
								12 => 'social.socialIconSize',
								13 => 'social.socialIconPadding',
								14 => 'social.socialDesktopCollapsed',
							),
							'visibleWhen'  => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'comments.commentStatus',
							'icon'        => 'comment',
							'visibleWhen' => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
						),
						array(
							'type'         => 'drill',
							'label'        => 'Comments options',
							'icon'         => 'comment',
							'summaryKind'  => 'comments',
							'groupedPaths' =>
							array(
								0 => 'comments.sectionDisplay',
								1 => 'comments.toggleComments',
								2 => 'comments.startCollapsed',
							),
							'visibleWhen'  => array(
								'all' => array(
									array(
										'path'   => 'comments.commentStatus',
										'truthy' => true,
									),
									array(
										'path' => 'general.type',
										'neq'  => 'video',
									),
								),
							),
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'Motion',
					'items' =>
					array(
						array(
							'type'        => 'field',
							'groupedPath' => 'interaction.respectReducedMotion',
						),
					),
				),
			),
		),
		array(
			'name'        => 'protection',
			'title'       => 'Protection',
			'description' => 'How hard it is to take an image out of this gallery.',
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'label' => 'Access',
					'items' =>
					array(
						array(
							'type'        => 'field',
							'groupedPath' => 'passwordProtect.enablePassword',
							'icon'        => 'lock',
						),
						array(
							'type'         => 'drill',
							'label'        => 'Password',
							'icon'         => 'lock',
							'summaryKind'  => 'password',
							'groupedPaths' =>
							array(
								0 => 'passwordProtect.sectionPasswordForm',
								1 => 'passwordProtect.password',
								2 => 'passwordProtect.passwordProtectUsername',
								3 => 'passwordProtect.passwordProtectText',
							),
							'visibleWhen'  => array(
								'path'   => 'passwordProtect.enablePassword',
								'truthy' => true,
							),
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'The image files',
					'items' =>
					array(
						array(
							'type'                    => 'drill',
							'label'                   => 'Image Guardian',
							'icon'                    => 'shield',
							'summaryKind'             => 'imageGuardian',
							'nestedUpsellGroupedPath' => 'protection.protection',
							'groupedPaths'            =>
							array(
								0 => 'protection.sectionBasics',
								1 => 'protection.protection',
								2 => 'protection.rightClickMessage',
								3 => 'protection.blockDragging',
								4 => 'protection.sectionHarderMeasures',
								5 => 'protection.blurProtection',
								6 => 'protection.urlProtection',
								7 => 'protection.urlProtectionCostHint',
							),
							'visibleWhen'             => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
						),
						array(
							'type'                    => 'drill',
							'label'                   => 'Watermark',
							'icon'                    => 'image',
							'summaryKind'             => 'watermark',
							'nestedUpsellGroupedPath' => 'watermark.enableWatermark',
							'groupedPaths'            =>
							array(
								0  => 'watermark.watermarkType',
								1  => 'watermark.customSettingsWatermark',
								2  => 'watermark.sectionText',
								3  => 'watermark.watermarkText',
								4  => 'watermark.watermarkTextSize',
								5  => 'watermark.watermarkTextColor',
								6  => 'watermark.watermarkTextTypeHint',
								7  => 'watermark.sectionImage',
								8  => 'watermark.watermarkImage',
								9  => 'watermark.watermarkImageDimensionWidth',
								10 => 'watermark.watermarkImageTypeHint',
								11 => 'watermark.sectionPlacement',
								12 => 'watermark.watermarkPosition',
								13 => 'watermark.watermarkMargin',
								14 => 'watermark.watermarkOpacity',
								15 => 'watermark.sectionAppliesTo',
								16 => 'watermark.watermarkApplyScope',
								17 => 'watermark.watermarkEnableBackup',
								18 => 'watermark.watermarkBurnInHint',
								19 => 'watermark.watermarkApplyToExistingImages',
								20 => 'watermark.watermarkRemoveWatermark',
							),
							'visibleWhen'             => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'Credit',
					'items' =>
					array(
						array(
							'type'                    => 'drill',
							'label'                   => 'License',
							'icon'                    => 'info',
							'summaryKind'             => 'imageLicensing',
							'nestedUpsellGroupedPath' => 'licensing.imageLicensing',
							'groupedPaths'            =>
							array(
								0 => 'licensing.sectionLicense',
								1 => 'licensing.imageLicensing',
								2 => 'licensing.author',
								3 => 'licensing.company',
								4 => 'licensing.sectionWhereItShows',
								5 => 'licensing.displayWithDescription',
								6 => 'licensing.showOnLightbox',
							),
							'visibleWhen'             => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
						),
					),
				),
				array(
					'type'  => 'note',
					'label' => 'Honesty',
					'text'  => 'These raise the effort, not a wall. A watermark is the only one that survives a screenshot.',
				),
			),
		),
		array(
			'name'        => 'advanced',
			'title'       => 'Advanced',
			'description' => 'EXIF, performance, integrations and technical options.',
			'visibleWhen' => array(
				'path' => 'general.type',
				'neq'  => 'video',
			),
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'label' => 'Image data',
					'items' =>
					array(
						array(
							'type'                    => 'drill',
							'label'                   => 'Shooting data',
							'icon'                    => 'capturePhoto',
							'summaryKind'             => 'shootingData',
							'nestedUpsellGroupedPath' => 'exif.enableExif',
							'groupedPaths'            =>
							array(
								0  => 'exif.enableExif',
								1  => 'exif.enableExifOffHint',
								2  => 'exif.exifCamera',
								3  => 'exif.exifLens',
								4  => 'exif.exifShutterSpeed',
								5  => 'exif.exifAperture',
								6  => 'exif.exifFocalLength',
								7  => 'exif.exifIso',
								8  => 'exif.exifDate',
								9  => 'exif.sectionResult',
								10 => 'exif.exifResultPreview',
							),
						),
						array(
							'type'                    => 'drill',
							'label'                   => 'Link to one image',
							'icon'                    => 'link',
							'summaryKind'             => 'deeplink',
							'nestedUpsellGroupedPath' => 'deeplink.modulaDeeplink',
							'groupedPaths'            =>
							array(
								0 => 'deeplink.modulaDeeplink',
								1 => 'deeplink.modulaDeeplinkOffHint',
								2 => 'deeplink.customLinkName',
								3 => 'deeplink.urlPreview',
							),
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'Integrations',
					'items' =>
					array(
						array(
							'type'                    => 'drill',
							'label'                   => 'Instagram',
							'icon'                    => 'atSymbol',
							'summaryKind'             => 'instagram',
							'nestedUpsellGroupedPath' => 'instagram.syncWithInstagram',
							'groupedPaths'            =>
							array(
								0 => 'instagram.accountPanel',
								1 => 'instagram.syncWithInstagram',
								2 => 'instagram.managePhotos',
								3 => 'instagram.cronNote',
							),
						),
					),
				),
				array(
					'type'        => 'submenu',
					'label'       => 'Client review',
					'visibleWhen' => array(
						'path' => 'general.type',
						'neq'  => 'template',
					),
					'items'       =>
					array(
						array(
							'type'                    => 'drill',
							'group'                   => 'proofing',
							'icon'                    => 'people',
							'nestedUpsellGroupedPath' => 'proofing.imageProofing',
							'groupedPaths'            =>
							array(
								0 => 'proofing.imageProofing',
								1 => 'proofing.minSelection',
								2 => 'proofing.maxSelection',
								3 => 'proofing.notificationEmail',
								4 => 'proofing.showLoginLink',
								5 => 'proofing.loginRejectionNotice',
								6 => 'proofing.expireLinkToPage',
								7 => 'proofing.expireLinkToPageUrl',
								8 => 'proofing.expireRejectionNotice',
							),
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'Delivery',
					'items' =>
					array(
						array(
							'type'         => 'drill',
							'label'        => 'Performance',
							'icon'         => 'chartBar',
							'summaryKind'  => 'performance',
							'groupedPaths' =>
							array(
								0 => 'performance.sectionLoading',
								1 => 'performance.lazyLoad',
								2 => 'performance.sectionFiles',
								3 => 'performance.enableOptimization',
								4 => 'performance.thumbnailOptimization',
								5 => 'performance.lightboxOptimization',
								6 => 'performance.modulaSpeedHelp',
								7 => 'performance.speedupGlobalNote',
							),
						),
						array(
							'type'                    => 'drill',
							'label'                   => 'Presets',
							'icon'                    => 'download',
							'summaryKind'             => 'exportImport',
							'nestedUpsellGroupedPath' => 'exportImport.galleryDefaultsPanel',
							'groupedPaths'            =>
							array(
								0 => 'exportImport.galleryDefaultsPanel',
							),
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'Elsewhere',
					'items' =>
					array(
						array(
							'type'           => 'exit',
							'label'          => 'Zoom on hover',
							'targetCategory' => 'interaction',
							'targetLabel'    => 'Interaction',
						),
					),
				),
			),
		),
		array(
			'name'        => 'video',
			'title'       => 'Video',
			'description' => 'Video playback, play badges, lightbox autoplay, and hover preview for Video galleries and mixed image galleries that include videos.',
			'visibleWhen' => array(
				'all' => array(
					array(
						'path' => 'general.type',
						'neq'  => 'story',
					),
					array(
						'path' => 'general.type',
						'neq'  => 'showcase',
					),
					array(
						'path' => 'general.type',
						'neq'  => 'slider',
					),
					array(
						'path' => 'general.type',
						'neq'  => 'template',
					),
				),
			),
			'hubSections' =>
			array(
				array(
					'type'  => 'submenu',
					'label' => 'In the lightbox',
					'items' =>
					array(
						array(
							'type'              => 'field',
							'groupedPath'       => 'video.playlistPosition',
							'fieldPresentation' => 'embedded',
							'visibleWhen'       => array(
								'path' => 'general.type',
								'eq'   => 'video',
							),
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'video.autoplayVideos',
							'icon'        => 'next',
							'visibleWhen' => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
						),
						array(
							'type'        => 'field',
							'groupedPath' => 'video.loopVideos',
							'icon'        => 'shuffle',
							'visibleWhen' => array(
								'path' => 'general.type',
								'neq'  => 'video',
							),
						),
					),
				),
				array(
					'type'  => 'submenu',
					'label' => 'In the grid',
					'items' =>
					array(
						array(
							'type'         => 'drill',
							'label'        => 'Play badge',
							'icon'         => 'image',
							'summaryKind'  => 'playBadge',
							'groupedPaths' =>
							array(
								0 => 'video.showVideoIcon',
								1 => 'video.videoIconIcon',
								2 => 'video.customVideoIcon',
								3 => 'video.videoIconColor',
								4 => 'video.playIconSize',
							),
						),
						array(
							'type'         => 'drill',
							'label'        => 'Hover preview',
							'icon'         => 'search',
							'summaryKind'  => 'hoverPreview',
							'groupedPaths' =>
							array(
								0 => 'video.previewVideo',
								1 => 'video.autoplayThumbnail',
								2 => 'video.previewVideoDuration',
								3 => 'video.previewVideoOffHint',
							),
						),
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
