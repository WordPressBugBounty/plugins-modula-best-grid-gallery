<?php

/**
 * Modula gallery settings v2 document — PHP source of truth for types, defaults, items, and docs.
 * Generated JSON for the React app: apps/gallery-editor/generated/modula-settings-schema-v2.json.
 *
 * @package Modula
 */

return array(
	'$schema'                      => 'https://json-schema.org/draft/2020-12/schema',
	'$id'                          => 'modula-gallery-settings-v2',
	'title'                        => 'Modula gallery settings – grouped & typed (target for adapter)',
	'description'                  => 'Target grouped structure. Adapter maps flat modula-settings → these groups; canonical post meta for JSON is modula_settings_v2.',
	'version'                      => '2.0',
	'settings'                     =>
	array(
		'general'         =>
		array(
			'type'           =>
			array(
				'type'                    => 'string',
				'enum'                    =>
				array(
					0  => 'grid',
					1  => 'uniform-grid',
					2  => 'creative-gallery',
					3  => 'custom-grid',
					4  => 'polaroid',
					5  => 'slider',
					6  => 'video',
					7  => 'bnb',
					8  => 'justified-grid',
					9  => 'parallax-masonry',
					10 => 'story',
					11 => 'fit-grid',
					12 => 'showcase',
					13 => 'template',
				),
				'default'                 => 'grid',
				'editorLabel'             => 'How the gallery is arranged',
				'enumOptionLabels'        =>
				array(
					'grid'             => 'Masonry',
					'uniform-grid'     => 'Uniform grid',
					'fit-grid'         => 'Fit grid',
					'creative-gallery' => 'Creative',
					'custom-grid'      => 'Custom grid',
					'polaroid'         => 'Polaroid',
					'slider'           => 'Slider',
					'showcase'         => 'Showcase',
					'template'         => 'Template',
					'video'            => 'Video gallery',
					'bnb'              => 'BnB (hero + grid)',
					'justified-grid'   => 'Justified grid',
					'parallax-masonry' => 'Parallax',
					'story'            => 'Story',
				),
				/**
				 * MenuSelect section order for general.type (source of truth — not hardcoded in React).
				 * Values not listed here still appear after grouped options.
				 */
				'editorOptionGroups'      =>
				array(
					array(
						'id'     => 'grids',
						'label'  => 'Grid layouts',
						'values' =>
						array(
							0 => 'grid',
							1 => 'uniform-grid',
							2 => 'fit-grid',
							3 => 'justified-grid',
							4 => 'custom-grid',
						),
					),
					array(
						'id'     => 'creative',
						'label'  => 'Creative layouts',
						'values' =>
						array(
							0 => 'creative-gallery',
							1 => 'polaroid',
							2 => 'parallax-masonry',
							3 => 'bnb',
							4 => 'template',
						),
					),
					array(
						'id'     => 'motion',
						'label'  => 'Slides & video',
						'values' =>
						array(
							0 => 'slider',
							1 => 'showcase',
							2 => 'story',
							3 => 'video',
						),
					),
				),
				'proEnhancements'         =>
				array(
					'base'           =>
					array(
						0 => 'bnb',
						1 => 'parallax-masonry',
						2 => 'story',
						3 => 'showcase',
					),
					'extensionBased' =>
					array(
						'modula-slider' =>
						array(
							0 => 'slider',
						),
						'modula-video'  =>
						array(
							0 => 'video',
						),
					),
				),
				'editorGalleryTypeUpsell' =>
				array(
					'needsProMessage'         => 'Modula Pro unlocks additional gallery types—including Showcase, Story, Parallax masonry, BnB, Slider, and Video—so you can match layout to your content instead of staying on grid-only layouts.',
					'needsPlanUpgradeMessage' => 'Your current subscription does not include every gallery type. Upgrading unlocks Slider and Video (add-ons), and full Pro coverage for Showcase, Story, Parallax masonry, BnB, and the rest of the premium layouts.',
				),
			),
			'uploadPosition' =>
			array(
				'type'                          => 'string',
				'enum'                          =>
				array(
					0 => 'start',
					1 => 'end',
				),
				'default'                       => 'end',
				'editorLabel'                   => 'New uploads',
				'editorDescription'             => 'Add new images at the beginning or end of the gallery list.',
				'enumOptionLabels'              =>
				array(
					'start' => 'Start of list',
					'end'   => 'End of list',
				),
				// Shown in gallery preview chrome only (not duplicated in settings sidebar).
				'editorOmitFromSettingsSidebar' => true,
			),
			'width'          =>
			array(
				'type'              => 'string',
				'default'           => '100%',
				'editorLabel'       => 'How wide the gallery is',
				'editorDescription' => 'How wide the gallery is on the page. Common values are 100% (full width of the content area) or a fixed width such as 1200px.',
			),
			'height'         =>
			array(
				'type'              => 'array',
				'items'             =>
				array(
					'type'    => 'integer',
					'minimum' => 100,
					'maximum' => 2000,
				),
				'minItems'          => 3,
				'maxItems'          => 3,
				'default'           =>
				array(
					0 => 800,
					1 => 800,
					2 => 800,
				),
				'editorLabel'       => 'Minimum height',
				'editorDescription' => 'Minimum gallery height in pixels: desktop, tablet, then mobile.',
				'description'       => '[desktop, tablet, mobile] px',
			),
			'randomFactor'   =>
			array(
				'type'              => 'integer',
				'minimum'           => 0,
				'maximum'           => 100,
				'default'           => 50,
				'editorLabel'       => 'Randomness',
				'editorDescription' => 'How much creative-gallery tile splits vary from a strict half split (0 = none).',
			),
			'shuffle'        =>
			array(
				'type'              => 'boolean',
				'default'           => false,
				'editorLabel'       => 'Different order on every visit',
				'editorDescription' => 'Shows images in a random order every time someone loads the page.',
			),
		),
		'layout'          =>
		array(
			'gridType'                    =>
			array(
				'type'              => 'string',
				'enum'              =>
				array(
					0  => '1',
					1  => '2',
					2  => '3',
					3  => '4',
					4  => '5',
					5  => '6',
					6  => '7',
					7  => '8',
					8  => '9',
					9  => '10',
					10 => '11',
					11 => '12',
				),
				'default'           => '3',
				'description'       => 'Column count for grid, uniform-grid, fit-grid, and parallax-masonry. Legacy “automatic” is represented as gallery type justified-grid, not stored here.',
				'editorLabel'       => 'Columns',
				'editorDescription' => 'How many columns of images appear side by side.',
				'enumOptionLabels'  =>
				array(
					1  => '1 column',
					2  => '2 columns',
					3  => '3 columns',
					4  => '4 columns',
					5  => '5 columns',
					6  => '6 columns',
					7  => '7 columns',
					8  => '8 columns',
					9  => '9 columns',
					10 => '10 columns',
					11 => '11 columns',
					12 => '12 columns',
				),
			),
			'uniformGridTileAspect'       =>
			array(
				'type'              => 'string',
				'enum'              =>
				array(
					0 => 'square',
					1 => 'portrait',
					2 => 'landscape',
					3 => 'custom',
				),
				'default'           => 'square',
				'editorLabel'       => 'Shape of each image',
				'editorDescription' => 'Preset shape or custom width:height ratio. Applies to uniform grid and fit grid.',
				'description'       => 'Shape of each equal-cell grid tile; images fill the tile (uniform grid crops; fit grid shows the full photo).',
				'enumOptionLabels'  =>
				array(
					'square'    => 'Square',
					'portrait'  => 'Portrait',
					'landscape' => 'Landscape',
					'custom'    => 'Custom',
				),
			),
			'uniformGridTileAspectCustom' =>
			array(
				'type'              => 'object',
				'properties'        =>
				array(
					'width'  =>
					array(
						'type'    => 'integer',
						'minimum' => 1,
						'maximum' => 20,
					),
					'height' =>
					array(
						'type'    => 'integer',
						'minimum' => 1,
						'maximum' => 20,
					),
				),
				'default'           =>
				array(
					'width'  => 16,
					'height' => 9,
				),
				'editorLabel'       => 'Custom tile ratio',
				'editorDescription' => 'Two integers from 1 to 20 (ratio width : height).',
				'description'       => 'Width:height for CSS aspect-ratio; each part is clamped 1–20 (e.g. 16 and 9 → 16:9).',
				'editorControl'     =>
				array(
					'fieldMin' => 1,
					'fieldMax' => 20,
				),
			),
			'fitGridImageAlign'           =>
			array(
				'type'              => 'string',
				'enum'              =>
				array(
					0 => 'center',
					1 => 'top',
					2 => 'bottom',
					3 => 'left',
					4 => 'right',
				),
				'default'           => 'center',
				'editorLabel'       => 'Image alignment',
				'editorDescription' => 'Positions the full photo within the letterboxed cell.',
				'description'       => 'Where each photo sits inside its fit-grid tile.',
				'enumOptionLabels'  =>
				array(
					'center' => 'Center',
					'top'    => 'Top',
					'bottom' => 'Bottom',
					'left'   => 'Left',
					'right'  => 'Right',
				),
			),
			'gridRowHeight'               =>
			array(
				'type'              => 'integer',
				'minimum'           => 150,
				'maximum'           => 350,
				'default'           => 250,
				'editorLabel'       => 'Row height',
				'editorDescription' => 'Target row height in pixels for justified and similar layouts.',
			),
			'gridJustifyLastRow'          =>
			array(
				'type'              => 'string',
				'enum'              =>
				array(
					0 => 'justify',
					1 => 'nojustify',
					2 => 'center',
					3 => 'right',
				),
				'default'           => 'justify',
				'editorLabel'       => 'Last row',
				'editorDescription' => 'How to align the last row when it is not full.',
				'enumOptionLabels'  =>
				array(
					'justify'   => 'Stretch to fill',
					'nojustify' => 'Do not stretch',
					'center'    => 'Center',
					'right'     => 'Right align',
				),
			),
			'gridImageSize'               =>
			array(
				'type'              => 'string',
				'default'           => 'medium',
				'editorLabel'       => 'Image file size',
				'editorDescription' => 'WordPress image size for thumbnails. Pick custom to set width and height below.',
				'description'       => 'Registered WP image size slug (or custom/default). Options come from PHP wp_localize_script.',
			),
			'gridImageDimensions'         =>
			array(
				'type'              => 'object',
				'properties'        =>
				array(
					'width'  =>
					array(
						'type' => 'integer',
					),
					'height' =>
					array(
						'type' => 'integer',
					),
				),
				'default'           =>
				array(
					'width'  => 600,
					'height' => 0,
				),
				'editorLabel'       => 'Custom dimensions',
				'editorDescription' => 'Controls polaroid packery tile splits and how strongly prints tilt and scatter (0 = aligned, no tilt).',
				'description'       => 'Used when gridImageSize is custom (or default in some layouts): exact width/height for srcset/thumbs.',
			),
			'imgSize'                     =>
			array(
				'type'                          => 'integer',
				'minimum'                       => 50,
				'maximum'                       => 250,
				'default'                       => 200,
				'editorLabel'                   => 'Tile size',
				'description'                   => 'Legacy thumbnail tile edge (px) for custom-grid when gridImageSize is custom; not used by v2 React layout.',
				'editorOmitFromSettingsSidebar' => true,
			),
			'imgCrop'                     =>
			array(
				'type'                          => 'boolean',
				'default'                       => true,
				'editorLabel'                   => 'Crop tiles to fit',
				'description'                   => 'Legacy hard-crop flag for custom-grid thumbnails; not used by v2 React layout.',
				'editorOmitFromSettingsSidebar' => true,
			),
			'gridImageCrop'               =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Crop images to fit',
				'description' => 'Crop when using a registered size vs custom gridImageSize + gridImageDimensions (see classic Gallery Images Size flow).',
			),
			'gutter'                      =>
			array(
				'type'        => 'integer',
				'minimum'     => 0,
				'maximum'     => 100,
				'default'     => 10,
				'editorLabel' => 'Desktop',

			),
			'tabletGutter'                =>
			array(
				'type'        => 'integer',
				'minimum'     => 0,
				'maximum'     => 100,
				'default'     => 10,
				'editorLabel' => 'Tablet',
			),
			'mobileGutter'                =>
			array(
				'type'        => 'integer',
				'minimum'     => 0,
				'maximum'     => 100,
				'default'     => 10,
				'editorLabel' => 'Mobile',
			),
			'parallaxOverlayEnabled'      =>
			array(
				'type'              => 'boolean',
				'default'           => true,
				'editorLabel'       => 'Dim images with overlay',
				'editorDescription' => 'Show a dimmed overlay on top of parallax masonry columns.',
			),
			'parallaxOverlayBackground'   =>
			array(
				'type'              => 'string',
				'default'           => 'linear-gradient(180deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.15) 72%, rgba(0,0,0,0) 100%)',
				'editorLabel'       => 'Dim color',
				'editorDescription' => 'CSS color or gradient used by the parallax overlay.',
				'editorControl'     =>
				array(
					'kind' => 'parallaxOverlayColor',
				),
			),
			'parallaxCaption'             =>
			array(
				'type'              => 'string',
				'default'           => '',
				'editorLabel'       => 'Caption on the overlay',
				'editorDescription' => 'Optional center caption shown above the parallax masonry overlay.',
			),
			'parallaxMotionPreset'        =>
			array(
				'type'              => 'string',
				'enum'              =>
				array(
					0 => 'calm',
					1 => 'balanced',
					2 => 'dynamic',
				),
				'default'           => 'balanced',
				'editorLabel'       => 'How strong the scroll effect is',
				'editorDescription' => 'Controls drift intensity and speed profile for parallax columns.',
				'enumOptionLabels'  =>
				array(
					'calm'     => 'Calm',
					'balanced' => 'Balanced',
					'dynamic'  => 'Dynamic',
				),
			),
		),
		'lightbox'        =>
		array(
			'lightbox'             =>
			array(
				'editorShowInLite'         => true,
				'type'                     => 'string',
				'enum'                     =>
				array(
					0 => 'no-link',
					1 => 'direct',
					2 => 'external-url',
					3 => 'fancybox',
				),
				'default'                  => 'fancybox',
				'editorLabel'              => 'What happens when an image is clicked',
				'editorDescription'        => 'Per-image links in the editor can still open a URL instead of the lightbox.',
				'description'              => 'Further lightbox options apply when click behavior opens the lightbox.',
				'enumOptionLabels'         =>
				array(
					'no-link'      => 'No link',
					'direct'       => 'Direct link to image file',
					'external-url' => 'External URL',
					'fancybox'     => 'Open in lightbox',
				),
				'editorLightboxLiteUpsell' =>
				array(
					'needsProMessage'    => 'Modula Pro unlocks the rest of the lightbox—open rules, titles and captions, toolbar controls, transitions and animations, thumbnails, fullscreen, appearance, social sharing, and more. Lite still includes basic prev/next arrows and touch navigation.',
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor-lightbox&utm_campaign=upsell&utm_term=lite-vs-pro',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
				),
			),
			'clickNotLightboxHint' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Click behavior hint',
				'editorDescription'       => 'Opening and lightbox controls only apply when click opens the lightbox. For Direct link or External URL, set each photo’s link with Edit on that image.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorShowInLite'        => true,
				'editorSidebarNestedOnly' => true,
			),
			'showNavigation'       =>
			array(
				'editorShowInLite' => true,
				'type'             => 'boolean',
				'default'          => true,
				'editorLabel'      => 'Prev and next arrows',
			),
			'openOn'               =>
			array(
				'editorShowInLite' => false,
				'type'             => 'string',
				'enum'             =>
				array(
					0 => 'both',
					1 => 'desktop',
					2 => 'mobile',
				),
				'default'          => 'both',
				'editorLabel'      => 'Open lightbox on',
				'enumOptionLabels' =>
				array(
					'both'    => 'Desktop and mobile',
					'desktop' => 'Desktop only',
					'mobile'  => 'Mobile only',
				),
			),
			'sectionClick'         =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Click',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'doubleClick'          =>
			array(
				'editorShowInLite' => false,
				'type'             => 'boolean',
				'default'          => false,
				'description'      => 'On desktop, use a double-click to open the lightbox; on phones and tablets, use a double-tap. Helps prevent accidental opens.',
				'editorLabel'      => 'Open on double-click or double-tap',
			),
			'loop'                 =>
			array(
				'editorShowInLite' => false,
				'type'             => 'boolean',
				'default'          => false,
				'editorLabel'      => 'After the last image, go back to the first',
			),
			'showTitle'            =>
			array(
				'editorShowInLite' => false,
				'type'             => 'boolean',
				'default'          => false,
				'editorLabel'      => 'Show title',
			),
			'showCaption'          =>
			array(
				'editorShowInLite' => false,
				'type'             => 'boolean',
				'default'          => true,
				'editorLabel'      => 'Show caption',
			),
			'captionPosition'      =>
			array(
				'editorShowInLite' => false,
				'type'             => 'string',
				'enum'             =>
				array(
					0 => 'left',
					1 => 'right',
					2 => 'center',
				),
				'default'          => 'left',
				'description'      => 'Applies when the lightbox shows the title, the caption, or both.',
				'editorLabel'      => 'Where title and caption sit',
				'enumOptionLabels' =>
				array(
					'left'   => 'Left',
					'right'  => 'Right',
					'center' => 'Center',
				),
			),
			'keyboard'             =>
			array(
				'editorShowInLite'              => true,
				'type'                          => 'boolean',
				'default'                       => true,
				'editorLabel'                   => 'Keyboard navigation',
				// Always on in Fancybox; kept in schema for BC / saved meta only.
				'editorOmitFromSettingsSidebar' => true,
			),
			'wheel'                =>
			array(
				'editorShowInLite'              => false,
				'type'                          => 'boolean',
				'default'                       => true,
				'description'                   => 'Scroll wheel moves to the previous or next image while the lightbox is open (legacy mousewheel navigation).',
				'editorLabel'                   => 'Mouse wheel navigation',
				// Always on in Fancybox; kept in schema for BC / saved meta only.
				'editorOmitFromSettingsSidebar' => true,
			),
			'sectionToolbar'       =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Toolbar',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'toolbar'              =>
			array(
				'editorShowInLite'  => false,
				'type'              => 'boolean',
				'default'           => true,
				'editorLabel'       => 'Show toolbar',
				'editorDescription' => 'When off, the lightbox hides the top bar and its buttons.',
			),
			'toolbarOffHint'       =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Toolbar off hint',
				'editorDescription'       => 'Show toolbar is off, so these buttons do not appear in the lightbox.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorShowInLite'        => false,
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'sectionButtons'       =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Buttons',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'close'                =>
			array(
				'editorShowInLite'        => false,
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Show close button',
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'lightbox.toolbar',
					'eq'   => false,
				),
			),
			'thumbs'               =>
			array(
				'editorShowInLite'        => false,
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Thumbnails button',
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'lightbox.toolbar',
					'eq'   => false,
				),
			),
			'download'             =>
			array(
				'editorShowInLite'        => false,
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Download button',
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'lightbox.toolbar',
					'eq'   => false,
				),
			),
			'zoom'                 =>
			array(
				'editorShowInLite'        => false,
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Zoom button',
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'lightbox.toolbar',
					'eq'   => false,
				),
			),
			'share'                =>
			array(
				'editorShowInLite'        => false,
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Share button',
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'lightbox.toolbar',
					'eq'   => false,
				),
			),
			'clickSlide'           =>
			array(
				'editorShowInLite' => false,
				'type'             => 'boolean',
				'default'          => false,
				'description'      => 'Closes the lightbox when clicking the image or the dark area around it. When off, clicking the image zooms instead.',
				'editorLabel'      => 'Close when the image is clicked',
			),
			'infobar'              =>
			array(
				'editorShowInLite'        => false,
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Image counter',
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'lightbox.toolbar',
					'eq'   => false,
				),
			),
			'sectionMotion'        =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Motion',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'animationEffect'      =>
			array(
				'editorShowInLite' => false,
				'type'             => 'string',
				'enum'             =>
				array(
					0 => 'false',
					1 => 'fade',
					2 => 'zoom',
					3 => 'zoom-in-out',
				),
				'default'          => 'false',
				'editorLabel'      => 'Open and close motion',
				'enumOptionLabels' =>
				array(
					'false'       => 'None',
					'fade'        => 'Fade',
					'zoom'        => 'Zoom',
					'zoom-in-out' => 'Zoom in and out',
				),
			),
			'sectionDisplay'       =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Display',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'transitionEffect'     =>
			array(
				'editorShowInLite' => false,
				'type'             => 'string',
				'enum'             =>
				array(
					0 => 'fade',
					1 => 'crossfade',
					2 => 'slide',
					3 => 'classic',
				),
				'default'          => 'fade',
				'editorLabel'      => 'How one image becomes the next',
				'enumOptionLabels' =>
				array(
					'fade'      => 'Fade',
					'crossfade' => 'Crossfade',
					'slide'     => 'Slide',
					'classic'   => 'Classic',
				),
				'editorControl'    =>
				array(
					'kind' => 'segmentedEnum',
				),
			),
			'showAll'              =>
			array(
				'editorShowInLite'  => false,
				'type'              => 'boolean',
				'default'           => false,
				'editorLabel'       => 'Show all images in lightbox',
				'editorDescription' => 'Include every gallery image in the lightbox even when pagination limits the grid.',
			),
			'touch'                =>
			array(
				'type'                          => 'boolean',
				'default'                       => true,
				'description'                   => 'Swipe and pinch-zoom on the lightbox image (Fancybox Panzoom). Always enabled in v2; not exposed in the settings UI.',
				'editorOmitFromSettingsSidebar' => true,
			),
			'showThumbnails'       =>
			array(
				'editorShowInLite' => false,
				'type'             => 'boolean',
				'default'          => false,
				'description'      => 'Show the thumbnail strip when the lightbox opens (legacy key: thumbsAutoStart).',
				'editorLabel'      => 'Show thumbnail strip',
			),
			'backgroundColor'      =>
			array(
				'editorShowInLite'  => false,
				'type'              => 'string',
				'default'           => 'rgba(30,30,30,.9)',
				'editorLabel'       => 'Color behind the image',
				'editorDescription' => 'Solid color behind the image in the lightbox. Use transparency to control how much of the page shows through.',
			),
			'thumbsPosition'       =>
			array(
				'editorShowInLite' => false,
				'type'             => 'string',
				'enum'             =>
				array(
					0 => 'left',
					1 => 'bottom',
					2 => 'right',
				),
				'default'          => 'bottom',
				'description'      => 'Thumbnail strip position when thumbnails are visible.',
				'editorLabel'      => 'Where thumbnails sit',
				'enumOptionLabels' =>
				array(
					'left'   => 'Left',
					'bottom' => 'Bottom',
					'right'  => 'Right',
				),
			),
			'downloadAllButton'    =>
			array(
				'editorShowInLite'               => false,
				'editorRequiresExtensionEnabled' => 'modula-download',
				'type'                           => 'boolean',
				'default'                        => false,
				'editorLabel'                    => 'Download all button',
				'editorSidebarNestedOnly'        => true,
				'editorDisabledWhen'             =>
				array(
					'path' => 'lightbox.toolbar',
					'eq'   => false,
				),
			),
			'enableFullscreen'     =>
			array(
				'editorShowInLite'        => false,
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Fullscreen button',
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'lightbox.toolbar',
					'eq'   => false,
				),
			),
			'openFullscreen'       =>
			array(
				'editorShowInLite' => false,
				'type'             => 'boolean',
				'default'          => false,
				'editorLabel'      => 'Start in fullscreen',
			),
		),
		'captions'        =>
		array(
			'sectionWhatShows'      =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'What shows',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'hideGalleryTitle'      =>
			array(
				'type'          => 'boolean',
				'default'       => true,
				'editorLabel'   => 'Show gallery title',
				'editorControl' =>
				array(
					'kind'          => 'toggle',
					'invertBoolean' => true,
				),
			),
			'galleryTitleType'      =>
			array(
				'type'             => 'string',
				'enum'             =>
				array(
					0 => 'p',
					1 => 'h1',
					2 => 'h2',
					3 => 'h3',
					4 => 'h4',
					5 => 'h5',
					6 => 'h6',
				),
				'default'          => 'p',
				'editorLabel'      => 'Gallery title tag',
				'enumOptionLabels' =>
				array(
					'p'  => 'Paragraph',
					'h1' => 'Heading 1',
					'h2' => 'Heading 2',
					'h3' => 'Heading 3',
					'h4' => 'Heading 4',
					'h5' => 'Heading 5',
					'h6' => 'Heading 6',
				),
			),
			'hideTitle'             =>
			array(
				'type'          => 'boolean',
				'default'       => true,
				'editorLabel'   => 'Show image title',
				'editorControl' =>
				array(
					'kind'          => 'toggle',
					'invertBoolean' => true,
				),
			),
			'hideDescription'       =>
			array(
				'type'          => 'boolean',
				'default'       => false,
				'editorLabel'   => 'Show image caption',
				'editorControl' =>
				array(
					'kind'          => 'toggle',
					'invertBoolean' => true,
				),
			),
			'sectionPlacement'      =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Placement',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'contentPlacement'      =>
			array(
				'type'              => 'string',
				'enum'              =>
				array(
					0 => 'inside-image',
					1 => 'below-image',
				),
				'default'           => 'inside-image',
				'editorLabel'       => 'Where it sits',
				'editorDescription' => 'Inside the image, the caption sits on top of the photo. Below, it sits under it.',
				'enumOptionLabels'  =>
				array(
					'inside-image' => 'On the image',
					'below-image'  => 'Under the image',
				),
				'editorControl'     =>
				array(
					'kind'               => 'segmentedEnum',
					'optionDescriptions' =>
					array(
						'inside-image' => 'Inside the image, the caption sits on top of the photo.',
						'below-image'  => 'Below, it sits under the photo.',
					),
				),
			),
			'compactCaptionPopover' =>
			array(
				'type'        => 'boolean',
				'default'     => true,
				'editorLabel' => 'Bubble on small images',
			),
			'compactCaptionMinSize' =>
			array(
				'type'          => 'integer',
				'minimum'       => 80,
				'maximum'       => 480,
				'default'       => 240,
				'editorLabel'   => 'Use bubble when smaller than',
				'editorControl' =>
				array(
					'kind' => 'range',
					'min'  => 80,
					'max'  => 480,
					'step' => 1,
				),
			),
			'belowImageAlignment'   =>
			array(
				'type'             => 'string',
				'enum'             =>
				array(
					0 => 'left',
					1 => 'center',
					2 => 'right',
				),
				'default'          => 'left',
				'editorLabel'      => 'Text alignment',
				'enumOptionLabels' =>
				array(
					'left'   => 'Left',
					'center' => 'Center',
					'right'  => 'Right',
				),
			),
			'belowImageSpacing'     =>
			array(
				'type'        => 'integer',
				'minimum'     => 0,
				'maximum'     => 48,
				'default'     => 8,
				'editorLabel' => 'Space under the image',
			),
			'belowImagePadding'     =>
			array(
				'type'        => 'integer',
				'minimum'     => 0,
				'maximum'     => 48,
				'default'     => 0,
				'editorLabel' => 'Padding around text',
			),
			'sectionTitleStyle'     =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Title style',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'titleColor'            =>
			array(
				'type'        => 'string',
				'default'     => '#ffffff',
				'editorLabel' => 'Color',
			),
			'titleFontSize'         =>
			array(
				'type'        => 'integer',
				'minimum'     => 8,
				'maximum'     => 72,
				'default'     => 16,
				'editorLabel' => 'Desktop',
			),
			'mobileTitleFontSize'   =>
			array(
				'type'        => 'integer',
				'minimum'     => 8,
				'maximum'     => 48,
				'default'     => 12,
				'editorLabel' => 'Mobile',
			),
			'titleFontWeight'       =>
			array(
				'type'             => 'string',
				'enum'             =>
				array(
					0 => 'default',
					1 => '300',
					2 => '400',
					3 => '700',
				),
				'default'          => 'default',
				'editorLabel'      => 'Boldness',
				'enumOptionLabels' =>
				array(
					'default' => 'Inherit from theme',
					300       => 'Light (300)',
					400       => 'Regular (400)',
					700       => 'Bold (700)',
				),
			),
			'sectionCaptionStyle'   =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Caption style',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'captionColor'          =>
			array(
				'type'        => 'string',
				'default'     => '#ffffff',
				'editorLabel' => 'Color',
			),
			'captionFontSize'       =>
			array(
				'type'        => 'integer',
				'minimum'     => 8,
				'maximum'     => 72,
				'default'     => 14,
				'editorLabel' => 'Desktop',
			),
			'mobileCaptionFontSize' =>
			array(
				'type'        => 'integer',
				'minimum'     => 8,
				'maximum'     => 48,
				'default'     => 10,
				'editorLabel' => 'Mobile',
			),
			'captionFontWeight'     =>
			array(
				'type'             => 'string',
				'enum'             =>
				array(
					0 => 'normal',
					1 => '300',
					2 => '400',
					3 => '700',
				),
				'default'          => 'normal',
				'editorLabel'      => 'Boldness',
				'enumOptionLabels' =>
				array(
					'normal' => 'Inherit from theme',
					300      => 'Light (300)',
					400      => 'Regular (400)',
					700      => 'Bold (700)',
				),
			),
			'sectionOnMobile'       =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'On mobile',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'mobileCaptionCopy'     =>
			array(
				'type'        => 'boolean',
				'default'     => true,
				'editorLabel' => 'Copy caption on double-tap',
				'description' => 'When the lightbox shows the image caption, visitors on phones and tablets can copy it with a double-tap.',
			),
		),
		'social'          =>
		array(
			'enableSocial'             =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Enable sharing',
			),
			'sectionWhereTheyCanShare' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Where they can share',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'enableTwitter'            =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'X',
				'editorSidebarNestedOnly' => true,
			),
			'enableFacebook'           =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Facebook',
				'editorSidebarNestedOnly' => true,
			),
			'enableWhatsapp'           =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'WhatsApp',
				'editorDescription'       => 'The one people actually use on a phone.',
				'editorSidebarNestedOnly' => true,
			),
			'enableLinkedin'           =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'LinkedIn',
				'editorSidebarNestedOnly' => true,
			),
			'enablePinterest'          =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Pinterest',
				'editorSidebarNestedOnly' => true,
			),
			'enableEmail'              =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Email',
				'editorSidebarNestedOnly' => true,
			),
			'emailSubject'             =>
			array(
				'type'                    => 'string',
				'default'                 => 'Check out this awesome image !!',
				'editorLabel'             => 'Email subject',
				'editorSidebarNestedOnly' => true,
			),
			'emailMessage'             =>
			array(
				'type'                    => 'string',
				'editorLabel'             => 'Email message',
				'editorSidebarNestedOnly' => true,
			),
			'sectionHowButtonsLook'    =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'How the buttons look',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'noNetworkStyleHint'       =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Sharing style',
				'editorDescription'       => 'No network is on, so there is no bar to style.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'socialIconColor'          =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Color',
				'editorSidebarNestedOnly' => true,
				'editorControl'           =>
				array(
					'kind'        => 'color',
					'acceptAlpha' => true,
					'clearable'   => true,
				),
				'editorDisabledWhen'      =>
				array(
					'all' =>
					array(
						array(
							'path' => 'social.enableTwitter',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableFacebook',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableWhatsapp',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableLinkedin',
							'eq'   => false,
						),
						array(
							'path' => 'social.enablePinterest',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableEmail',
							'eq'   => false,
						),
					),
				),
			),
			'socialIconSize'           =>
			array(
				'type'                    => 'integer',
				'minimum'                 => 8,
				'maximum'                 => 64,
				'default'                 => 16,
				'editorLabel'             => 'Icon size',
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'all' =>
					array(
						array(
							'path' => 'social.enableTwitter',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableFacebook',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableWhatsapp',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableLinkedin',
							'eq'   => false,
						),
						array(
							'path' => 'social.enablePinterest',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableEmail',
							'eq'   => false,
						),
					),
				),
			),
			'socialIconPadding'        =>
			array(
				'type'                    => 'integer',
				'minimum'                 => 0,
				'maximum'                 => 40,
				'default'                 => 10,
				'editorLabel'             => 'Space around each icon',
				'editorDescription'       => 'Adds to the tappable area. Below 8px the buttons get hard to hit on a phone.',
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'all' =>
					array(
						array(
							'path' => 'social.enableTwitter',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableFacebook',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableWhatsapp',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableLinkedin',
							'eq'   => false,
						),
						array(
							'path' => 'social.enablePinterest',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableEmail',
							'eq'   => false,
						),
					),
				),
			),
			'socialDesktopCollapsed'   =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Keep the bar folded until hover',
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'all' =>
					array(
						array(
							'path' => 'social.enableTwitter',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableFacebook',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableWhatsapp',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableLinkedin',
							'eq'   => false,
						),
						array(
							'path' => 'social.enablePinterest',
							'eq'   => false,
						),
						array(
							'path' => 'social.enableEmail',
							'eq'   => false,
						),
					),
				),
			),
		),
		'loadingEffects'  =>
		array(
			'sectionMotion' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Motion',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'enableScale'   =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Scale',
				'editorShowInLite'        => true,
				'editorSidebarNestedOnly' => true,
			),
			'loadedScale'   =>
			array(
				'type'                    => 'integer',
				'minimum'                 => 0,
				'maximum'                 => 200,
				'default'                 => 100,
				'editorLabel'             => 'Amount',
				'editorDescription'       => 'How large the tile starts before settling to full size. 100% is no scale.',
				'editorShowInLite'        => true,
				'editorSidebarNestedOnly' => true,
				'editorControl'           =>
				array(
					'kind' => 'range',
					'min'  => 0,
					'max'  => 200,
					'step' => 1,
				),
			),
			'enableRotate'  =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Rotate',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'loadedRotate'  =>
			array(
				'type'                    => 'integer',
				'minimum'                 => -100,
				'maximum'                 => 100,
				'default'                 => 0,
				'editorLabel'             => 'Degrees',
				'editorDescription'       => 'How far the tile twists before settling. 0 is no rotation.',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorControl'           =>
				array(
					'kind' => 'range',
					'min'  => -100,
					'max'  => 100,
					'step' => 1,
				),
			),
			'enableSlide'   =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Slide',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'loadedHSlide'  =>
			array(
				'type'                    => 'integer',
				'minimum'                 => -100,
				'maximum'                 => 100,
				'default'                 => 0,
				'editorLabel'             => 'Horizontal',
				'editorDescription'       => 'Offset in pixels before the tile settles.',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorControl'           =>
				array(
					'kind' => 'range',
					'min'  => -100,
					'max'  => 100,
					'step' => 1,
				),
			),
			'loadedVSlide'  =>
			array(
				'type'                    => 'integer',
				'minimum'                 => -100,
				'maximum'                 => 100,
				'default'                 => 0,
				'editorLabel'             => 'Vertical',
				'editorDescription'       => 'Offset in pixels before the tile settles.',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorControl'           =>
				array(
					'kind' => 'range',
					'min'  => -100,
					'max'  => 100,
					'step' => 1,
				),
			),
			'inView'        =>
			array(
				'type'                     => 'boolean',
				'default'                  => false,
				'editorLabel'              => 'Reveal tiles as they scroll in',
				'editorShowInLite'         => true,
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Unlock horizontal & vertical slide (Premium)',
					'needsProMessage'    => 'Upgrade to Modula Premium to unlock horizontal and vertical slide offsets for the load-in animation, plus rotation. Scale and in-view animation stay available in Modula Lite.',
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-loading-effects&utm_campaign=loading_effects',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
				),
			),
		),
		'hover'           =>
		array(
			'effectBuilder'  =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Hover effect',
				'editorControl'           =>
				array(
					'kind' => 'hoverEffectBuilder',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'sectionPresets' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Presets',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'sectionCursor'  =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Cursor',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'sectionOverlay' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Overlay',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'builder'        =>
			array(
				'type'                          => 'object',
				'editorLabel'                   => 'Hover layout and motion',
				'editorOmitFromSettingsSidebar' => true,
				'description'                   => 'Composable hover: card treatment and per-slot entrance animations. Use the Hover section preview and inspector.',
				'properties'                    =>
				array(
					'cardTreatment'          =>
					array(
						'type'    => 'string',
						'enum'    =>
						array(
							0 => 'none',
							1 => 'zoom',
							2 => 'grayscale',
							3 => 'lift',
						),
						'default' => 'zoom',
					),
					'graphicElement'         =>
					array(
						'type'    => 'string',
						'enum'    =>
						array(
							0 => 'none',
							1 => 'frame',
							2 => 'diamond',
						),
						'default' => 'none',
					),
					'graphicVisibility'      =>
					array(
						'type'    => 'string',
						'enum'    =>
						array(
							0 => 'on-hover',
							1 => 'always',
						),
						'default' => 'on-hover',
					),
					'titleEnter'             =>
					array(
						'type'    => 'string',
						'enum'    =>
						array(
							0 => 'none',
							1 => 'fade',
							2 => 'slide-up',
							3 => 'slide-down',
							4 => 'slide-left',
							5 => 'slide-right',
							6 => 'blur-in',
							7 => 'scale',
						),
						'default' => 'fade',
					),
					'captionEnter'           =>
					array(
						'type'    => 'string',
						'enum'    =>
						array(
							0 => 'none',
							1 => 'fade',
							2 => 'slide-up',
							3 => 'slide-down',
							4 => 'slide-left',
							5 => 'slide-right',
							6 => 'blur-in',
							7 => 'scale',
						),
						'default' => 'fade',
					),
					'socialEnter'            =>
					array(
						'type'    => 'string',
						'enum'    =>
						array(
							0 => 'none',
							1 => 'fade',
							2 => 'slide-up',
							3 => 'slide-down',
							4 => 'slide-left',
							5 => 'slide-right',
							6 => 'blur-in',
							7 => 'scale',
						),
						'default' => 'fade',
					),
					'titleVisibility'        =>
					array(
						'type'    => 'string',
						'enum'    =>
						array(
							0 => 'on-hover',
							1 => 'always',
							2 => 'hide-on-hover',
							3 => 'hidden',
						),
						'default' => 'on-hover',
					),
					'captionVisibility'      =>
					array(
						'type'    => 'string',
						'enum'    =>
						array(
							0 => 'on-hover',
							1 => 'always',
							2 => 'hide-on-hover',
							3 => 'hidden',
						),
						'default' => 'on-hover',
					),
					'socialVisibility'       =>
					array(
						'type'    => 'string',
						'enum'    =>
						array(
							0 => 'on-hover',
							1 => 'always',
							2 => 'hide-on-hover',
							3 => 'hidden',
						),
						'default' => 'on-hover',
					),
					'cardEnterDurationMs'    =>
					array(
						'type'        => 'integer',
						'minimum'     => 120,
						'maximum'     => 1200,
						'default'     => 280,
						'editorLabel' => 'Image/tile animation duration (ms)',
					),
					'cardEnterDelayMs'       =>
					array(
						'type'        => 'integer',
						'minimum'     => 0,
						'maximum'     => 600,
						'default'     => 0,
						'editorLabel' => 'Image/tile animation delay (ms)',
					),
					'titleEnterDurationMs'   =>
					array(
						'type'        => 'integer',
						'minimum'     => 120,
						'maximum'     => 1200,
						'default'     => 280,
						'editorLabel' => 'Title entrance duration (ms)',
					),
					'captionEnterDurationMs' =>
					array(
						'type'        => 'integer',
						'minimum'     => 120,
						'maximum'     => 1200,
						'default'     => 280,
						'editorLabel' => 'Caption entrance duration (ms)',
					),
					'socialEnterDurationMs'  =>
					array(
						'type'        => 'integer',
						'minimum'     => 120,
						'maximum'     => 1200,
						'default'     => 280,
						'editorLabel' => 'Social entrance duration (ms)',
					),
					'titleEnterDelayMs'      =>
					array(
						'type'        => 'integer',
						'minimum'     => 0,
						'maximum'     => 600,
						'default'     => 0,
						'editorLabel' => 'Title entrance base delay (ms)',
					),
					'captionEnterDelayMs'    =>
					array(
						'type'        => 'integer',
						'minimum'     => 0,
						'maximum'     => 600,
						'default'     => 0,
						'editorLabel' => 'Caption entrance base delay (ms)',
					),
					'socialEnterDelayMs'     =>
					array(
						'type'        => 'integer',
						'minimum'     => 0,
						'maximum'     => 600,
						'default'     => 0,
						'editorLabel' => 'Social entrance base delay (ms)',
					),
					'titleEnterStaggerMs'    =>
					array(
						'type'        => 'integer',
						'minimum'     => 0,
						'maximum'     => 300,
						'default'     => 45,
						'editorLabel' => 'Title entrance stagger (ms)',
					),
					'captionEnterStaggerMs'  =>
					array(
						'type'        => 'integer',
						'minimum'     => 0,
						'maximum'     => 300,
						'default'     => 45,
						'editorLabel' => 'Caption entrance stagger (ms)',
					),
					'socialEnterStaggerMs'   =>
					array(
						'type'        => 'integer',
						'minimum'     => 0,
						'maximum'     => 300,
						'default'     => 45,
						'editorLabel' => 'Social entrance stagger (ms)',
					),
					'sourcePresetId'         =>
					array(
						'type'        => 'string',
						'default'     => '',
						'description' => 'Last applied hover preset id (for “— customized” labels when builder no longer matches exactly).',
					),
					'slotPositions'          =>
					array(
						'type'        => 'object',
						'description' => 'Per-slot anchor on the image (percent of media box, 0–100).',
						'properties'  =>
						array(
							'title'   =>
							array(
								'type'       => 'object',
								'properties' =>
								array(
									'x' =>
									array(
										'type'    => 'integer',
										'minimum' => 0,
										'maximum' => 100,
										'default' => 50,
									),
									'y' =>
									array(
										'type'    => 'integer',
										'minimum' => 0,
										'maximum' => 100,
										'default' => 18,
									),
								),
							),
							'caption' =>
							array(
								'type'       => 'object',
								'properties' =>
								array(
									'x' =>
									array(
										'type'    => 'integer',
										'minimum' => 0,
										'maximum' => 100,
										'default' => 50,
									),
									'y' =>
									array(
										'type'    => 'integer',
										'minimum' => 0,
										'maximum' => 100,
										'default' => 50,
									),
								),
							),
							'social'  =>
							array(
								'type'       => 'object',
								'properties' =>
								array(
									'x' =>
									array(
										'type'    => 'integer',
										'minimum' => 0,
										'maximum' => 100,
										'default' => 50,
									),
									'y' =>
									array(
										'type'    => 'integer',
										'minimum' => 0,
										'maximum' => 100,
										'default' => 82,
									),
								),
							),
						),
						'default'     =>
						array(
							'title'   => array(
								'x' => 50,
								'y' => 18,
							),
							'caption' => array(
								'x' => 50,
								'y' => 50,
							),
							'social'  => array(
								'x' => 50,
								'y' => 82,
							),
						),
					),
				),
				'default'                       =>
				array(
					'cardTreatment'          => 'zoom',
					'graphicElement'         => 'none',
					'graphicVisibility'      => 'on-hover',
					'dimOverlay'             => false,
					'titleEnter'             => 'fade',
					'captionEnter'           => 'fade',
					'socialEnter'            => 'fade',
					'titleVisibility'        => 'on-hover',
					'captionVisibility'      => 'on-hover',
					'socialVisibility'       => 'on-hover',
					'cardEnterDurationMs'    => 280,
					'cardEnterDelayMs'       => 0,
					'titleEnterDurationMs'   => 280,
					'captionEnterDurationMs' => 280,
					'socialEnterDurationMs'  => 280,
					'titleEnterDelayMs'      => 0,
					'captionEnterDelayMs'    => 0,
					'socialEnterDelayMs'     => 0,
					'titleEnterStaggerMs'    => 45,
					'captionEnterStaggerMs'  => 45,
					'socialEnterStaggerMs'   => 45,
					'slotPositions'          =>
					array(
						'title'   => array(
							'x' => 50,
							'y' => 18,
						),
						'caption' => array(
							'x' => 50,
							'y' => 50,
						),
						'social'  => array(
							'x' => 50,
							'y' => 82,
						),
					),
				),
			),
			'cursor'         =>
			array(
				'type'             => 'string',
				'enum'             =>
				array(
					0 => 'pointer',
					1 => 'zoom-in',
					2 => 'wait',
					3 => 'cell',
					4 => 'crosshair',
					5 => 'nesw-resize',
					6 => 'nwse-resize',
					7 => 'custom',
				),
				'default'          => 'zoom-in',
				'editorLabel'      => 'Cursor icon',
				'enumOptionLabels' =>
				array(
					'pointer'     => 'Pointer',
					'zoom-in'     => 'Magnifying glass',
					'wait'        => 'Loading',
					'cell'        => 'Cell',
					'crosshair'   => 'Crosshair',
					'nesw-resize' => 'Diagonal resize (NESW)',
					'nwse-resize' => 'Diagonal resize (NWSE)',
					'custom'      => 'Custom',
				),
			),
			'changeCursor'   =>
			array(
				'type'        => 'boolean',
				'default'     => true,
				'editorLabel' => 'Change the cursor',
			),
			'uploadCursor'   =>
			array(
				'type'          => 'integer',
				'default'       => 0,
				'editorLabel'   => 'Upload cursor',
				'editorControl' =>
				array(
					'kind'               => 'mediaAttachment',
					'libraryType'        => 'image',
					'mediaFrameTitle'    => 'Choose custom cursor image',
					'selectButtonLabel'  => 'Upload cursor',
					'replaceButtonLabel' => 'Replace cursor',
					'removeButtonLabel'  => 'Remove',
				),
			),
			'dimOverlay'     =>
			array(
				'type'              => 'boolean',
				'default'           => false,
				'editorLabel'       => 'Apply overlay',
				'editorDescription' => 'When enabled, darkens the image on hover using the dim color below.',
			),
			'hoverColor'     =>
			array(
				'type'              => 'string',
				'default'           => 'rgba(0,0,0,.5)',
				'editorLabel'       => 'Dim color',
				'editorDescription' => 'Tint and strength (alpha) used when Apply overlay is on.',
				'editorControl'     =>
				array(
					'kind'        => 'color',
					'acceptAlpha' => true,
				),
			),
			'hoverOpacity'   =>
			array(
				'type'                          => 'integer',
				'minimum'                       => 0,
				'maximum'                       => 100,
				'default'                       => 50,
				'editorLabel'                   => 'How strong the dim is',
				'editorOmitFromSettingsSidebar' => true,
			),
		),
		'interaction'     =>
		array(
			'respectReducedMotion' =>
			array(
				'type'              => 'boolean',
				'default'           => true,
				'editorLabel'       => 'No animation for people who ask for less',
				'editorDescription' => 'Visitors who ask their system for less motion get no effects.',
			),
		),
		'style'           =>
		array(
			'sectionFrame'     =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Frame',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'borderRadius'     =>
			array(
				'type'              => 'integer',
				'minimum'           => 0,
				'maximum'           => 100,
				'default'           => 0,
				'editorLabel'       => 'Rounded corners',
				'editorDescription' => 'Applies evenly to all four corners of each tile.',
			),
			'borderSize'       =>
			array(
				'type'              => 'integer',
				'minimum'           => 0,
				'maximum'           => 10,
				'default'           => 0,
				'editorLabel'       => 'Border thickness',
				'editorDescription' => 'Width of the frame around each tile.',
			),
			'borderColor'      =>
			array(
				'type'          => 'string',
				'default'       => '#ffffff',
				'editorLabel'   => 'Border color',
				'editorControl' =>
				array(
					'kind' => 'color',
				),
			),
			'shadowSize'       =>
			array(
				'type'              => 'integer',
				'minimum'           => 0,
				'maximum'           => 20,
				'default'           => 0,
				'editorLabel'       => 'Shadow size',
				'editorDescription' => 'How far the shadow spreads under each tile.',
			),
			'shadowColor'      =>
			array(
				'type'          => 'string',
				'default'       => '#ffffff',
				'editorLabel'   => 'Shadow color',
				'editorControl' =>
				array(
					'kind' => 'color',
				),
			),
			'sectionCustomCss' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Custom CSS',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'customCss'        =>
			array(
				'type'              => 'string',
				'default'           => '',
				'editorLabel'       => 'Custom CSS',
				'editorDescription' => 'Only for people who write CSS. Everything here affects this gallery alone.',
				'editorControl'     =>
				array(
					'kind' => 'customCssTextarea',
				),
			),
		),
		'performance'     =>
		array(
			'sectionLoading'        =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Loading',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'lazyLoad'              =>
			array(
				'type'                     => 'boolean',
				'default'                  => true,
				'editorLabel'              => 'Load images as people scroll',
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Looking to make your gallery load faster?',
					'needsProMessage'    => 'Allow Modula to automatically optimize your images to load as fast as possible by reducing their file sizes, resizing them and serving them from StackPath\'s content delivery network.',
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-performance&utm_campaign=speedup',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-speedup',
				),
			),
			'sectionFiles'          =>
			array(
				'type'                           => 'string',
				'default'                        => '',
				'editorLabel'                    => 'Files',
				'editorControl'                  =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'         => true,
				'editorSidebarNestedOnly'        => true,
				'editorShowInLite'               => false,
				'editorRequiresExtensionEnabled' => 'modula-speedup',
			),
			'enableOptimization'    =>
			array(
				'type'                           => 'string',
				'enum'                           =>
				array(
					0 => 'default',
					1 => 'enabled',
					2 => 'disabled',
				),
				'default'                        => 'default',
				'enumOptionLabels'               =>
				array(
					'default'  => 'Site default',
					'enabled'  => 'On',
					'disabled' => 'Off',
				),
				'editorLabel'                    => 'Use smaller modern image files',
				'editorShowInLite'               => false,
				'editorRequiresExtensionEnabled' => 'modula-speedup',
			),
			'thumbnailOptimization' =>
			array(
				'type'                           => 'string',
				'enum'                           =>
				array(
					0 => 'default',
					1 => 'lossless',
					2 => 'lossy',
					3 => 'glossy',
					4 => 'disabled',
				),
				'default'                        => 'default',
				'enumOptionLabels'               =>
				array(
					'default'  => 'Site default',
					'lossless' => 'Lossless',
					'lossy'    => 'Lossy',
					'glossy'   => 'Glossy',
					'disabled' => 'Off',
				),
				'editorLabel'                    => 'Thumbnail compression',
				'editorShowInLite'               => false,
				'editorRequiresExtensionEnabled' => 'modula-speedup',
			),
			'lightboxOptimization'  =>
			array(
				'type'                           => 'string',
				'enum'                           =>
				array(
					0 => 'default',
					1 => 'lossless',
					2 => 'lossy',
					3 => 'glossy',
					4 => 'disabled',
				),
				'default'                        => 'default',
				'enumOptionLabels'               =>
				array(
					'default'  => 'Site default',
					'lossless' => 'Lossless',
					'lossy'    => 'Lossy',
					'glossy'   => 'Glossy',
					'disabled' => 'Off',
				),
				'editorLabel'                    => 'Lightbox compression',
				'editorShowInLite'               => false,
				'editorRequiresExtensionEnabled' => 'modula-speedup',
			),
			'modulaSpeedHelp'       =>
			array(
				'type'                           => 'string',
				'default'                        => '',
				'description'                    => 'Placeholder key; UI shows help text only in editor.',
				'editorControl'                  =>
				array(
					'kind' => 'speedupHelp',
				),
				'editorShowInLite'               => false,
				'editorRequiresExtensionEnabled' => 'modula-speedup',
			),
			'speedupGlobalNote'     =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Speedup global note',
				'editorDescription'       => 'Site-wide Speedup options live under Modula → Settings. There is no per-gallery cache rebuild here.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
		),
		'responsive'      =>
		array(
			'enableResponsive'   =>
			array(
				'type'                     => 'boolean',
				'default'                  => true,
				'editorLabel'              => 'Adapt to screen size',
				'description'              => 'Different column counts on smaller screens for grids, or slide counts for sliders.',
				'editorSidebarNestedPanel' =>
				array(
					'title'        => 'On phones and tablets',
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
				),
			),
			'tabletColumns'      =>
			array(
				'type'                    => 'integer',
				'minimum'                 => 1,
				'maximum'                 => 6,
				'default'                 => 2,
				'editorLabel'             => 'Tablet',
				'editorSidebarNestedOnly' => true,
			),
			'mobileColumns'      =>
			array(
				'type'                    => 'integer',
				'minimum'                 => 1,
				'maximum'                 => 6,
				'default'                 => 1,
				'editorLabel'             => 'Mobile',
				'editorSidebarNestedOnly' => true,
			),
			'treatAsTabletUnder' =>
			array(
				'type'                    => 'integer',
				'minimum'                 => 768,
				'maximum'                 => 1400,
				'default'                 => 1024,
				'editorLabel'             => 'Treat as a tablet under',
				'editorDescription'       => 'Screens narrower than this width (in pixels) use tablet layout. A typical tablet breakpoint is about 1024.',
				'editorControl'           =>
				array(
					'kind' => 'range',
					'min'  => 768,
					'max'  => 1400,
					'step' => 1,
				),
				'editorSidebarNestedOnly' => true,
			),
			'treatAsPhoneUnder'  =>
			array(
				'type'                    => 'integer',
				'minimum'                 => 320,
				'maximum'                 => 900,
				'default'                 => 600,
				'editorLabel'             => 'Treat as a phone under',
				'editorDescription'       => 'Screens narrower than this width (in pixels) use phone layout. A typical phone breakpoint is about 600.',
				'editorControl'           =>
				array(
					'kind' => 'range',
					'min'  => 320,
					'max'  => 900,
					'step' => 1,
				),
				'editorSidebarNestedOnly' => true,
			),
		),
		'polaroid'        =>
		array(
			'randomFactor'   =>
			array(
				'type'        => 'integer',
				'minimum'     => 0,
				'maximum'     => 100,
				'default'     => 50,
				'editorLabel' => 'How messy it looks',
			),
			'rotationMax'    =>
			array(
				'type'              => 'integer',
				'minimum'           => 0,
				'maximum'           => 14,
				'default'           => 7,
				'editorLabel'       => 'How much prints can tilt',
				'editorDescription' => 'Each print tilts left or right up to this amount (stable per image, not random on every refresh).',
			),
			'scatterMax'     =>
			array(
				'type'              => 'integer',
				'minimum'           => 0,
				'maximum'           => 28,
				'default'           => 12,
				'editorLabel'       => 'How far prints shift',
				'editorDescription' => 'Small horizontal and vertical nudge so tiles feel less grid-like.',
			),
			'showPin'        =>
			array(
				'type'              => 'boolean',
				'default'           => true,
				'editorLabel'       => 'Show pin',
				'editorDescription' => 'Decorative pin at the top of each print.',
			),
			'framePadding'   =>
			array(
				'type'              => 'integer',
				'minimum'           => 4,
				'maximum'           => 28,
				'default'           => 12,
				'editorLabel'       => 'White frame around the photo',
				'editorDescription' => 'White margin around the photo (sides and top).',
			),
			'chinHeight'     =>
			array(
				'type'              => 'integer',
				'minimum'           => 12,
				'maximum'           => 80,
				'default'           => 36,
				'editorLabel'       => 'Space under the photo',
				'editorDescription' => 'Extra white area under the image (classic Polaroid “chin”).',
			),
			'uniformSize'    =>
			array(
				'type'              => 'boolean',
				'default'           => true,
				'editorLabel'       => 'Same size for every print',
				'editorDescription' => 'Use equal portrait slots in a simple grid instead of variable packery tiles (same print size for every image).',
			),
			'uniformColumns' =>
			array(
				'type'              => 'integer',
				'minimum'           => 0,
				'maximum'           => 12,
				'default'           => 3,
				'editorLabel'       => 'Prints per row',
				'editorDescription' => 'Prints per row when Uniform size is on. Use 0 for Auto (fits by container width).',
			),
		),
		'slider'          =>
		array(
			'sectionSize'                     =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Size',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'sectionImage'                    =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Image',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'lightbox'                        =>
			array(
				'type'                          => 'string',
				'default'                       => 'no-link',
				'editorLabel'                   => 'What happens when a slide is clicked',
				'editorOmitFromSettingsSidebar' => true,
			),
			'imageSize'                       =>
			array(
				'type'          => 'string',
				'default'       => 'large',
				'description'   => 'WordPress size used for the slide image file (quality). The slider still spans the gallery width — pick Large or Full for full-width carousels. Thumbnail is only suitable for small previews; Custom sets a display box below.',
				'editorLabel'   => 'Image file size',
				'editorControl' =>
				array(
					'allowsCustomImageSize' => true,
				),
			),
			'imageDimensions'                 =>
			array(
				'type'        => 'object',
				'properties'  =>
				array(
					'width'  =>
					array(
						'type' => 'integer',
					),
					'height' =>
					array(
						'type' => 'integer',
					),
				),
				'description' => 'Used when Slider image size is Custom. “Crop to dimensions” controls hard crop vs preserving aspect ratio.',
				'editorLabel' => 'Width and height',
			),
			'imageCrop'                       =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'description' => 'When on, images are cropped to the exact width and height. When off, proportions are preserved within that box.',
				'editorLabel' => 'Crop images to fit',
			),
			'adaptiveHeight'                  =>
			array(
				'type'              => 'boolean',
				'default'           => true,
				'editorLabel'       => 'Height follows slide',
				'editorDescription' => 'Slider height grows or shrinks with the current slide.',
			),
			'sectionSlides'                   =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Slides',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'sectionNavigation'               =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Navigation',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'sectionAutoplay'                 =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Autoplay',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'sectionThumbnails'               =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Thumbnails',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'syncing'                         =>
			array(
				'type'              => 'boolean',
				'default'           => true,
				'editorLabel'       => 'Show thumbnails',
				'editorDescription' => 'Show a synced strip of thumbnails with the main slider.',
			),
			'syncingNavSize'                  =>
			array(
				'type'        => 'string',
				'default'     => 'auto',
				'description' => 'Size of thumbnails in the strip. Choose Custom to set width and height below.',
				'editorLabel' => 'Thumbnail file size',
			),
			'syncingNavImageDimensions'       =>
			array(
				'type'        => 'object',
				'properties'  =>
				array(
					'width'  =>
					array(
						'type' => 'integer',
					),
					'height' =>
					array(
						'type' => 'integer',
					),
				),
				'description' => 'Used when Thumbnail image size is Custom. “Crop to dimensions” applies to the thumbnail strip.',
				'editorLabel' => 'Width and height',
			),
			'syncingNavImageCrop'             =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'description' => 'When on, thumbnails are cropped to the exact width and height above.',
				'editorLabel' => 'Crop thumbnails to fit',
			),
			'syncingNavThumbnailsNumber'      =>
			array(
				'type'              => 'integer',
				'minimum'           => 0,
				'maximum'           => 20,
				'default'           => 0,
				'editorLabel'       => 'Visible thumbnails',
				'editorDescription' => 'How many thumbnails show at once (0 uses default).',
			),
			'syncingNavThumbnailsGutter'      =>
			array(
				'type'        => 'integer',
				'minimum'     => 0,
				'maximum'     => 50,
				'default'     => 10,
				'editorLabel' => 'Space between thumbnails',
			),
			'syncingNavThumbnailsBorderColor' =>
			array(
				'type'        => 'string',
				'default'     => '#000000',
				'editorLabel' => 'Border color',
			),
			'autoplay'                        =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Autoplay',
			),
			'pauseOnHover'                    =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Pause when hovering',
			),
			'autoplaySpeed'                   =>
			array(
				'type'          => 'integer',
				'minimum'       => 1000,
				'maximum'       => 15000,
				'default'       => 3000,
				'editorLabel'   => 'Time between slides',
				'editorControl' =>
				array(
					'kind' => 'range',
					'min'  => 1000,
					'max'  => 15000,
					'step' => 100,
				),
			),
			'arrows'                          =>
			array(
				'type'        => 'boolean',
				'default'     => true,
				'editorLabel' => 'Show arrows',
			),
			'arrowsInside'                    =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Arrows over the image',
			),
			'dots'                            =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Show page dots',
			),
			'draggable'                       =>
			array(
				'type'        => 'boolean',
				'default'     => true,
				'editorLabel' => 'Drag to move',
			),
			'centerMode'                      =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Peek side slides',
			),
			'centerPadding'                   =>
			array(
				'type'          => 'string',
				'default'       => '50px',
				'editorLabel'   => 'Side peek size',
				'editorControl' =>
				array(
					'kind'        => 'range',
					'min'         => 0,
					'max'         => 200,
					'step'        => 1,
					'valueFormat' => 'px',
				),
			),
			'fade'                            =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Fade between slides',
			),
			'infinite'                        =>
			array(
				'type'        => 'boolean',
				'default'     => true,
				'editorLabel' => 'Loop endlessly',
			),
			'slidesToShow'                    =>
			array(
				'type'        => 'integer',
				'minimum'     => 1,
				'maximum'     => 12,
				'default'     => 1,
				'editorLabel' => 'Visible at once',
			),
			'slidesToScroll'                  =>
			array(
				'type'        => 'integer',
				'minimum'     => 1,
				'maximum'     => 12,
				'default'     => 1,
				'editorLabel' => 'Advance by',
			),
			'speed'                           =>
			array(
				'type'        => 'integer',
				'minimum'     => 150,
				'maximum'     => 350,
				'default'     => 300,
				'editorLabel' => 'How fast slides change',
			),
			'rtl'                             =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Right-to-left',
			),
			'initialSlide'                    =>
			array(
				'type'        => 'integer',
				'default'     => 0,
				'editorLabel' => 'Start on slide',
			),
			'imageInfo'                       =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Show title and caption',
			),
			'imageInfoPosition'               =>
			array(
				'type'             => 'string',
				'enum'             =>
				array(
					0 => 'top_outside',
					1 => 'top_inside',
					2 => 'bot_outside',
					3 => 'bot_inside',
				),
				'default'          => 'bot_outside',
				'editorLabel'      => 'Caption placement',
				'enumOptionLabels' =>
				array(
					'top_outside' => 'Above the slide',
					'top_inside'  => 'Top of the slide',
					'bot_outside' => 'Below the slide',
					'bot_inside'  => 'Bottom of the slide',
				),
			),
			'tabletSlides'                    =>
			array(
				'type'                    => 'integer',
				'minimum'                 => 1,
				'maximum'                 => 6,
				'default'                 => 1,
				'editorLabel'             => 'Visible at once',
				'editorSidebarNestedOnly' => true,
			),
			'tabletScrolls'                   =>
			array(
				'type'                    => 'integer',
				'minimum'                 => 1,
				'maximum'                 => 6,
				'default'                 => 1,
				'editorLabel'             => 'Advance by',
				'editorSidebarNestedOnly' => true,
			),
			'mobileSlides'                    =>
			array(
				'type'                    => 'integer',
				'minimum'                 => 1,
				'maximum'                 => 6,
				'default'                 => 1,
				'editorLabel'             => 'Visible at once',
				'editorSidebarNestedOnly' => true,
			),
			'mobileScrolls'                   =>
			array(
				'type'                    => 'integer',
				'minimum'                 => 1,
				'maximum'                 => 6,
				'default'                 => 1,
				'editorLabel'             => 'Advance by',
				'editorSidebarNestedOnly' => true,
			),
		),
		'story'           =>
		array(
			'sectionSize' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Size',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'infinite'    =>
			array(
				'type'              => 'boolean',
				'default'           => false,
				'editorLabel'       => 'Loop stories',
				'editorDescription' => 'After the last story, continue from the first (like Instagram).',
			),
		),
		'showcase'        =>
		array(
			'sectionLayout'    =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Layout',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'visibleCount'     =>
			array(
				'type'              => 'integer',
				'minimum'           => 2,
				'maximum'           => 5,
				'default'           => 3,
				'editorLabel'       => 'How many photos show at once',
				'editorDescription' => 'Approximate number of photos visible in the viewport on desktop. Neighbors always peek past the edges.',
			),
			'gap'              =>
			array(
				'type'              => 'integer',
				'minimum'           => 0,
				'maximum'           => 160,
				'default'           => 32,
				'editorLabel'       => 'Space between photos',
				'editorDescription' => 'White space between photos, in pixels. Lower values pull photos closer together.',
				'editorControl'     =>
				array(
					'kind' => 'range',
					'min'  => 0,
					'max'  => 160,
					'step' => 4,
				),
			),
			'centerScale'      =>
			array(
				'type'              => 'number',
				'minimum'           => 1.1,
				'maximum'           => 1.75,
				'default'           => 1.4,
				'editorLabel'       => 'How much the center photo grows',
				'editorDescription' => 'Scale of the active (center) photo compared with its neighbors.',
				'editorControl'     =>
				array(
					'kind' => 'range',
					'min'  => 1.1,
					'max'  => 1.75,
					'step' => 0.05,
				),
			),
			'centerBias'       =>
			array(
				'type'              => 'string',
				'enum'              =>
				array(
					0 => 'center',
					1 => 'left',
				),
				'default'           => 'center',
				'editorLabel'       => 'Where the active photo sits',
				'editorDescription' => 'Infinite showcase always keeps the focus centered. This applies only when a single photo is shown.',
				'enumOptionLabels'  =>
				array(
					'center' => 'Dead center',
					'left'   => 'Slightly left',
				),
			),
			'arrowPosition'    =>
			array(
				'type'             => 'string',
				'enum'             =>
				array(
					0 => 'bottom-right',
					1 => 'bottom-left',
					2 => 'sides',
				),
				'default'          => 'bottom-right',
				'editorLabel'      => 'Arrow placement',
				'enumOptionLabels' =>
				array(
					'bottom-right' => 'Bottom right',
					'bottom-left'  => 'Bottom left',
					'sides'        => 'Left and right sides',
				),
			),
			'autoplay'         =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Autoplay',
			),
			'autoplayInterval' =>
			array(
				'type'              => 'integer',
				'minimum'           => 1500,
				'maximum'           => 15000,
				'default'           => 4000,
				'editorLabel'       => 'Autoplay interval',
				'editorDescription' => 'Milliseconds between advances when autoplay is on.',
				'editorControl'     =>
				array(
					'kind' => 'range',
					'min'  => 1500,
					'max'  => 15000,
					'step' => 500,
				),
				'visibleWhen'       =>
				array(
					'path' => 'showcase.autoplay',
					'eq'   => true,
				),
			),
			'clickBehavior'    =>
			array(
				'type'              => 'string',
				'enum'              =>
				array(
					0 => 'item-link',
					1 => 'lightbox',
					2 => 'none',
				),
				'default'           => 'item-link',
				'editorLabel'       => 'When a photo is clicked',
				'enumOptionLabels'  =>
				array(
					'item-link' => 'Open its link',
					'lightbox'  => 'Open lightbox',
					'none'      => 'Do nothing',
				),
				/*
				 * Retired from the Showcase layout UI — Lightbox hub owns click
				 * mode. Keep the field for legacy JSON / settings→config fallback.
				 */
				'editorVisibleWhen' => array(
					'path' => 'general.type',
					'eq'   => '__never__',
				),
			),
			'mobileSimplify'   =>
			array(
				'type'              => 'boolean',
				'default'           => true,
				'editorLabel'       => 'Simplify on phones',
				'editorDescription' => 'On small screens, focus one photo with light peeks and skip the large center scale.',
			),
		),
		'template'        =>
		array(
			'sectionLayout'  =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Layout',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'templateLayout' =>
			array(
				'type'              => 'string',
				'enum'              =>
				array(
					0 => 'split-stack',
					1 => 'asymmetric-trio',
					2 => 'offset-duo',
					3 => 'minimal-feature',
					4 => 'editorial-hero',
					5 => 'magazine-spread',
					6 => 'lookbook-ladder',
					7 => 'corner-collage',
					8 => 'portfolio-statement',
					9 => 'editorial-cluster',
				),
				'default'           => 'split-stack',
				'editorLabel'       => 'Template layout',
				'editorDescription' => 'Handcrafted editorial layouts. Only the first images that fit the template are shown; extra images are hidden on the front end.',
				'enumOptionLabels'  =>
				array(
					'split-stack'         => 'Split Stack',
					'asymmetric-trio'     => 'Asymmetric Trio',
					'offset-duo'          => 'Offset Duo',
					'minimal-feature'     => 'Minimal Feature',
					'editorial-hero'      => 'Editorial Hero',
					'magazine-spread'     => 'Magazine Spread',
					'lookbook-ladder'     => 'Lookbook Ladder',
					'corner-collage'      => 'Corner Collage',
					'portfolio-statement' => 'Portfolio Statement',
					'editorial-cluster'   => 'Editorial Cluster',
				),
				'proEnhancements'   =>
				array(
					'base' =>
					array(
						0 => 'editorial-hero',
						1 => 'magazine-spread',
						2 => 'lookbook-ladder',
						3 => 'corner-collage',
						4 => 'portfolio-statement',
						5 => 'editorial-cluster',
					),
				),
			),
		),
		'pagination'      =>
		array(
			'maxImagesCount'        =>
			array(
				'type'                    => 'integer',
				'default'                 => 0,
				'editorLabel'             => 'Desktop',
				'editorDescription'       => 'How many images show on each page on desktop (0 = no limit). Lightbox scope is controlled separately.',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'maxImagesCountMobile'  =>
			array(
				'type'                    => 'integer',
				'default'                 => 0,
				'editorLabel'             => 'Mobile',
				'editorDescription'       => 'Optional lower count on phones so pages stay lighter (0 = use the desktop value).',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'enablePagination'      =>
			array(
				'type'                     => 'boolean',
				'default'                  => false,
				'editorLabel'              => 'Split into pages',
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				// Nested options open via hub drill (see settings-v2-editor-navigation.php),
				// same pattern as responsive.enableResponsive → “On phones and tablets”.
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Looking to paginate your gallery?',
					'needsProMessage'    => 'Upgrade to Modula Premium to split large galleries into pages—with numbered navigation, infinite scroll, and load more—for better performance on image-heavy collections.',
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-pagination&utm_campaign=pagination-extension',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-pagination',
				),
			),
			'enableInfiniteScroll'  =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Load more as you scroll',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'enableLoadMore'        =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Show a Load more button',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			// Minimum 5 matches JS MIN_PAGINATION_PAGE_LINKS (first + last + active ± 1 sibling).
			'paginationNumber'      =>
			array(
				'type'                    => 'integer',
				'minimum'                 => 5,
				'maximum'                 => 20,
				'default'                 => 5,
				'editorLabel'             => 'How many page links to show',
				'editorDescription'       => 'How many numbered page buttons appear in the pagination bar (not images per page).',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'paginationColor'       =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Default',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'activePaginationColor' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Active',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'paginationPosition'    =>
			array(
				'type'                    => 'string',
				'default'                 => 'left',
				'enum'                    =>
				array(
					0 => 'left',
					1 => 'center',
					2 => 'right',
				),
				'editorLabel'             => 'Where the controls sit',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'enumOptionLabels'        =>
				array(
					'left'   => 'Left',
					'center' => 'Center',
					'right'  => 'Right',
				),
			),
		),
		'filters'         =>
		array(
			'showFilterBar'               =>
			array(
				'editorShowInLite' => false,
				'type'             => 'boolean',
				'default'          => true,
				'editorLabel'      => 'Show the filter bar',
			),
			'sectionFiltersList'          =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Filters in this gallery',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'filters'                     =>
			array(
				'type'                     => 'array',
				'items'                    =>
				array(
					'type' => 'string',
				),
				'default'                  =>
				array(
					0 => '',
				),
				'editorControl'            =>
				array(
					'kind'         => 'filterNameList',
					'hideRowLabel' => true,
				),
				'editorLabel'              => 'Filters',
				'editorDescription'        => 'The number is how many images carry that filter. Empty filters will not show up in the bar.',
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Looking to add filters to your gallery?',
					'needsProMessage'    => 'Upgrade to Modula Premium today and get access to filters and separate the images in your gallery.',
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=link&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=filters_tab_upsell-tab&utm_campaign=filters',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
				),
			),
			'sectionAllLabel'             =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Label for the “show everything” filter',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'dropdownFilters'             =>
			array(
				'editorShowInLite' => false,
				'type'             => 'boolean',
				'default'          => false,
				'editorLabel'      => 'Show as a dropdown',
			),
			'filterClick'                 =>
			array(
				'editorShowInLite'              => false,
				'type'                          => 'boolean',
				'default'                       => false,
				'editorLabel'                   => 'Reload the page when a filter is clicked',
				'editorOmitFromSettingsSidebar' => true,
			),
			'hideAllFilter'               =>
			array(
				'editorShowInLite' => false,
				'type'             => 'boolean',
				'default'          => false,
				'editorLabel'      => 'Hide the All option',
			),
			'showFilterCount'             =>
			array(
				'editorShowInLite'  => false,
				'type'              => 'boolean',
				'default'           => true,
				'editorLabel'       => 'Show image count on each filter',
				'editorDescription' => 'Shows how many images carry that filter, next to the filter name.',
			),
			'allFilterLabel'              =>
			array(
				'editorShowInLite' => false,
				'type'             => 'string',
				'default'          => 'All',
				'editorLabel'      => 'Label for “show everything”',
				'editorControl'    =>
				array(
					'kind'         => 'text',
					'hideRowLabel' => true,
				),
			),
			'filterLinkColor'             =>
			array(
				'editorShowInLite' => false,
				'type'             => 'string',
				'default'          => '',
				'editorLabel'      => 'Color',
			),
			'filterLinkHoverColor'        =>
			array(
				'editorShowInLite' => false,
				'type'             => 'string',
				'default'          => '',
				'editorLabel'      => 'Color on hover',
			),
			'defaultActiveFilter'         =>
			array(
				'editorShowInLite' => false,
				'type'             => 'string',
				'default'          => 'All',
				'editorLabel'      => 'Selected by default',
				'editorControl'    =>
				array(
					'kind' => 'defaultActiveFilterSelect',
				),
			),
			'filterPositioning'           =>
			array(
				'editorShowInLite' => false,
				'type'             => 'string',
				'default'          => 'top',
				'enum'             =>
				array(
					0 => 'top',
					1 => 'bottom',
					2 => 'left',
					3 => 'right',
					4 => 'top_bottom',
					5 => 'left_right',
				),
				'editorLabel'      => 'Where the bar sits',
				'enumOptionLabels' =>
				array(
					'top'        => 'Top',
					'bottom'     => 'Bottom',
					'left'       => 'Left',
					'right'      => 'Right',
					'top_bottom' => 'Top and bottom',
					'left_right' => 'Left and right',
				),
				'editorControl'    =>
				array(
					'kind'      => 'positionGrid',
					'ariaLabel' => 'Where the filter bar sits',
				),
			),
			'filterTextAlignment'         =>
			array(
				'editorShowInLite' => false,
				'type'             => 'string',
				'default'          => 'none',
				'enum'             =>
				array(
					0 => 'none',
					1 => 'left',
					2 => 'center',
					3 => 'right',
				),
				'editorLabel'      => 'Alignment',
				'enumOptionLabels' =>
				array(
					'none'   => 'Inherit',
					'left'   => 'Left',
					'center' => 'Center',
					'right'  => 'Right',
				),
				'editorControl'    =>
				array(
					'kind' => 'segmentedEnum',
				),
			),
			'enableCollapsibleFilters'    =>
			array(
				'editorShowInLite'  => false,
				'type'              => 'boolean',
				'default'           => false,
				'editorLabel'       => 'Collapse on phones',
				'editorDescription' => 'On phones, the filter list hides behind a button so it doesn’t fill the screen. Visitors tap it to expand. Switch the canvas to Phone to preview.',
				'editorTooltip'     => 'On phones, the filter list hides behind a button so it doesn’t fill the screen. Visitors tap it to expand. Switch the canvas to Phone to preview.',
			),
			'collapsibleActionText'       =>
			array(
				'editorShowInLite' => false,
				'type'             => 'string',
				'default'          => 'Filter by',
				'editorLabel'      => 'Collapse button text',
			),
			'enableMobileDropdownFilters' =>
			array(
				'editorShowInLite' => false,
				'type'             => 'boolean',
				'default'          => false,
				'editorLabel'      => 'Dropdown on phones',
			),
		),
		'deeplink'        =>
		array(
			'modulaDeeplink'        =>
			array(
				'type'                     => 'boolean',
				'default'                  => false,
				'editorLabel'              => 'Link to one image',
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Looking to add deeplink functionality to your lightbox?',
					'needsProMessage'    => 'Upgrade to Modula Premium and enable the Modula Deeplink add-on for stable, shareable gallery URLs when using filters.',
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-deeplink&utm_campaign=deeplink-addons',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-deeplink',
				),
			),
			'modulaDeeplinkOffHint' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Deeplink off hint',
				'editorDescription'       => 'Link to one image is off, so deep links are not generated.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'customLinkName'        =>
			array(
				'type'                    => 'string',
				'default'                 => 'modulagallery',
				'editorLabel'             => 'Name used in the address',
				'editorDescription'       => 'Lowercase letters, digits and dashes. Changing it breaks links you have already shared.',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'deeplink.modulaDeeplink',
					'eq'   => false,
				),
			),
			'urlPreview'            =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'URL preview',
				'editorControl'           =>
				array(
					'kind' => 'deeplinkUrlPreview',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'deeplink.modulaDeeplink',
					'eq'   => false,
				),
			),
		),
		'passwordProtect' =>
		array(
			'enablePassword'          =>
			array(
				'type'                     => 'boolean',
				'default'                  => false,
				'editorLabel'              => 'Password protect',
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Password-protect this gallery?',
					'needsProMessage'    => 'Upgrade to Modula Premium to use the Password Protect add-on: visitors enter a password before they can view the gallery—ideal for client proofing, private deliveries, and members-only collections.',
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-password-protect&utm_campaign=password-protect-addon',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-password-protect',
				),
			),
			'sectionPasswordForm'     =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Password form',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'password'                =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Set password',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorControl'           => array(
					'kind' => 'passwordWithStrength',
				),
			),
			'passwordProtectUsername' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Username',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'passwordProtectText'     =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Protect text',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorControl'           => array(
					'kind' => 'textarea',
				),
			),
		),
		'slideshow'       =>
		array(
			'sectionSlideshow' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Slideshow',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'enableSlideshow'  =>
			array(
				'type'                     => 'boolean',
				'default'                  => false,
				'editorLabel'              => 'Enable slideshow',
				'editorDescription'        => 'Turns the lightbox into a slideshow so images advance in place.',
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Turn your lightbox into a slideshow?',
					'needsProMessage'    => 'Upgrade to Modula Premium today and get access to the Modula Slideshow add-on, which allows you to turn your gallery’s lightbox into a stunning slideshow.',
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-slideshow&utm_campaign=slideshow-addon',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-slideshow',
				),
			),
			'sectionPlayback'  =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Playback',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'enableAutoplay'   =>
			array(
				'type'                           => 'boolean',
				'default'                        => false,
				'editorLabel'                    => 'Autoplay',
				'editorShowInLite'               => false,
				'editorRequiresExtensionEnabled' => 'modula-slideshow',
				'editorSidebarNestedOnly'        => true,
			),
			'pauseOnHover'     =>
			array(
				'type'                           => 'boolean',
				'default'                        => false,
				'editorLabel'                    => 'Pause when hovering',
				'editorShowInLite'               => false,
				'editorRequiresExtensionEnabled' => 'modula-slideshow',
				'editorSidebarNestedOnly'        => true,
			),
			'slideshowSpeed'   =>
			array(
				'type'                           => 'integer',
				'minimum'                        => 1000,
				'maximum'                        => 15000,
				'default'                        => 5000,
				'editorLabel'                    => 'Time between slides',
				'editorControl'                  =>
				array(
					'kind' => 'range',
					'min'  => 1000,
					'max'  => 15000,
					'step' => 100,
				),
				'editorShowInLite'               => false,
				'editorRequiresExtensionEnabled' => 'modula-slideshow',
				'editorSidebarNestedOnly'        => true,
			),
		),
		'video'           =>
		array(
			'playlistPosition'     =>
			array(
				'type'             => 'string',
				'default'          => 'right',
				'enum'             =>
				array(
					0 => 'right',
					1 => 'bottom',
				),
				'editorLabel'      => 'Playlist position',
				'enumOptionLabels' =>
				array(
					'right'  => 'Right',
					'bottom' => 'Bottom',
				),
			),
			'autoplayVideos'       =>
			array(
				'type'          => 'boolean',
				'default'       => false,
				'editorLabel'   => 'Start playing on open',
				'editorTooltip' => 'On iOS, autoplay is limited: self-hosted video and muted playback per Apple/Web policy.',
			),
			'loopVideos'           =>
			array(
				'type'          => 'boolean',
				'default'       => false,
				'editorLabel'   => 'Repeat when it ends',
				'editorTooltip' => 'Restarts each video from the beginning when it ends.',
			),
			'showVideoIcon'        =>
			array(
				'type'        => 'boolean',
				'default'     => true,
				'editorLabel' => 'Show the play badge',
			),
			'useCustomIcon'        =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Use a custom image',
			),
			'videoIconIcon'        =>
			array(
				'type'             => 'string',
				'default'          => 'default',
				'enum'             =>
				array(
					0  => 'default',
					1  => 'play',
					2  => 'google_play_1',
					3  => 'google_play_2',
					4  => 'google_play_3',
					5  => 'google_play_4',
					6  => 'google_play_5',
					7  => 'simple_solid',
					8  => 'solid_circle_break',
					9  => 'solid_circle',
					10 => 'solid_circle_fill',
					11 => 'simple_solid_reverse',
				),
				'editorLabel'      => 'Badge',
				'enumOptionLabels' =>
				array(
					'default'              => 'Default',
					'play'                 => 'Play',
					'google_play_1'        => 'Google Play 1',
					'google_play_2'        => 'Google Play 2',
					'google_play_3'        => 'Google Play 3',
					'google_play_4'        => 'Google Play 4',
					'google_play_5'        => 'Google Play 5',
					'simple_solid'         => 'Simple Solid',
					'solid_circle_break'   => 'Solid Circle Break',
					'solid_circle'         => 'Solid Circle',
					'solid_circle_fill'    => 'Solid Circle Fill',
					'simple_solid_reverse' => 'Simple Solid Reverse',
				),
				'editorControl'    =>
				array(
					'kind' => 'select',
				),
			),
			'customVideoIcon'      =>
			array(
				'type'              => 'integer',
				'default'           => 0,
				'editorLabel'       => 'Image file',
				'editorDescription' => 'A square PNG with transparency works best.',
				'editorControl'     =>
				array(
					'kind'               => 'mediaAttachment',
					'libraryType'        => 'image',
					'mediaFrameTitle'    => 'Choose play badge image',
					'selectButtonLabel'  => 'Choose from the media library',
					'replaceButtonLabel' => 'Replace image',
					'removeButtonLabel'  => 'Remove',
				),
			),
			'videoIconColor'       =>
			array(
				'type'        => 'string',
				'default'     => '#FFF',
				'editorLabel' => 'Colour',
			),
			'playIconSize'         =>
			array(
				'type'              => 'array',
				'items'             =>
				array(
					'type'    => 'integer',
					'minimum' => 0,
					'maximum' => 200,
				),
				'minItems'          => 3,
				'maxItems'          => 3,
				'default'           =>
				array(
					0 => 48,
					1 => 40,
					2 => 32,
				),
				'editorLabel'       => 'Size',
				'editorDescription' => '0 scales the badge with the tile. Anything else pins it to that many pixels.',
			),
			'previewVideo'         =>
			array(
				'type'        => 'boolean',
				'default'     => false,
				'editorLabel' => 'Preview on hover',
			),
			'autoplayThumbnail'    =>
			array(
				'type'               => 'boolean',
				'default'            => false,
				'editorLabel'        => 'Start playing by itself',
				'editorDisabledWhen' =>
				array(
					'path' => 'video.previewVideo',
					'eq'   => false,
				),
			),
			'previewVideoDuration' =>
			array(
				'type'               => 'integer',
				'minimum'            => 1,
				'maximum'            => 30,
				'default'            => 3,
				'editorLabel'        => 'Stop after',
				'editorDescription'  => 'Seconds. The tile goes back to its poster image afterwards.',
				'editorControl'      =>
				array(
					'kind' => 'range',
					'min'  => 1,
					'max'  => 30,
					'step' => 1,
				),
				'editorDisabledWhen' =>
				array(
					'path' => 'video.previewVideo',
					'eq'   => false,
				),
			),
			'previewVideoOffHint'  =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Hover preview off hint',
				'editorDescription'       => 'Preview on hover is off, so nothing here runs.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
		),
		'protection'      =>
		array(
			'sectionBasics'         =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Basics',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'protection'            =>
			array(
				'type'                           => 'boolean',
				'default'                        => false,
				'editorLabel'                    => 'Block right-click on images',
				'editorShowInLite'               => true,
				'editorOmitControlInLite'        => true,
				'editorRequiresExtensionEnabled' => 'modula-image-guardian',
				'editorLightboxLiteUpsell'       =>
				array(
					'title'              => 'Lock down how visitors can grab your images?',
					'needsProMessage'    => 'Upgrade to Modula Premium for Image Guardian–style protection: cut down casual right-click saving, tighten exposed image URLs, and optionally blur the grid when the tab loses focus—handy for proofs, client reviews, and portfolio work you don’t want scraped in one click.',
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-protection&utm_campaign=image-guardian-protection',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-image-guardian',
				),
			),
			'rightClickMessage'     =>
			array(
				'type'                           => 'string',
				'default'                        => '',
				'editorLabel'                    => 'Message shown instead',
				'editorDescription'              => 'Small notice when someone tries to right-click. Leave empty for the default: “This content is protected.”',
				'editorShowInLite'               => false,
				'editorSidebarNestedOnly'        => true,
				'editorRequiresExtensionEnabled' => 'modula-image-guardian',
				'editorVisibleWhen'              => array(
					'path'   => 'protection.protection',
					'truthy' => true,
				),
			),
			'blockDragging'         =>
			array(
				'type'                           => 'boolean',
				'default'                        => false,
				'editorLabel'                    => 'Block dragging images out',
				'editorShowInLite'               => false,
				'editorSidebarNestedOnly'        => true,
				'editorRequiresExtensionEnabled' => 'modula-image-guardian',
			),
			'sectionHarderMeasures' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Harder measures',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'blurProtection'        =>
			array(
				'type'                           => 'boolean',
				'default'                        => false,
				'editorLabel'                    => 'Blur images when leaving the tab',
				'editorShowInLite'               => false,
				'editorSidebarNestedOnly'        => true,
				'editorRequiresExtensionEnabled' => 'modula-image-guardian',
			),
			'urlProtection'         =>
			array(
				'type'                           => 'boolean',
				'default'                        => false,
				'editorLabel'                    => 'Hide the real file address',
				'editorShowInLite'               => false,
				'editorSidebarNestedOnly'        => true,
				'editorRequiresExtensionEnabled' => 'modula-image-guardian',
			),
			'urlProtectionCostHint' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'URL protection cost',
				'editorDescription'       => 'Hiding the address serves every image through PHP, which is slower and skips your CDN.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
		),
		'download'        =>
		array(
			'enableDownload'               =>
			array(
				'type'                     => 'boolean',
				'default'                  => false,
				'editorLabel'              => 'Enable download',
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Looking to add download functionality to your lightbox?',
					'needsProMessage'    => "Download entire galleries, albums or a single photo.\n\nSelect the image sizes the user can download (thumbnail, full size, or custom).\n\nComes with a powerful shortcode that you can use to render the button anywhere.\n\nGive your users the ability to download your images, galleries or albums with an easy to use shortcode.",
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-download&utm_campaign=download-extension',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-download',
				),
			),
			'sectionWhatTheyCanTake'       =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'What they can take',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'downloadGalleryButton'        =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Download one image',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'downloadAllGalleryButton'     =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Download the whole gallery',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'downloadImageSizes'           =>
			array(
				'type'                    => 'string',
				'default'                 => 'thumbnail',
				'editorLabel'             => 'How big the download is',
				'editorControl'           =>
				array(
					'allowsCustomImageSize' => false,
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'sectionGalleryButton'         =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'The gallery button',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'downloadAllLabel'             =>
			array(
				'type'                    => 'string',
				'default'                 => 'Download All Images',
				'editorLabel'             => 'Label',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'downloadAllPosition'          =>
			array(
				'type'                    => 'string',
				'default'                 => 'below_gallery',
				'enum'                    =>
				array(
					0 => 'above_gallery',
					1 => 'below_gallery',
					2 => 'above_below_gallery',
				),
				'editorLabel'             => 'Where it sits',
				'enumOptionLabels'        =>
				array(
					'above_gallery'       => 'Above gallery',
					'below_gallery'       => 'Below gallery',
					'above_below_gallery' => 'Above & below gallery',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'downloadAllHposition'         =>
			array(
				'type'                    => 'string',
				'default'                 => 'center',
				'enum'                    =>
				array(
					0 => 'left',
					1 => 'right',
					2 => 'center',
				),
				'editorLabel'             => 'Alignment',
				'enumOptionLabels'        =>
				array(
					'left'   => 'Left',
					'right'  => 'Right',
					'center' => 'Center',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorControl'           =>
				array(
					'kind' => 'segmentedEnum',
				),
			),
			'sectionHowItLooks'            =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'How it looks',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'downloadAllColor'             =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Text',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'downloadAllBackgroundColor'   =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Background',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'downloadAllGalleryButtonIcon' =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Icon before the label',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'downloadAllGalleryIconColor'  =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Icon color',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'sectionZipName'               =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Name of the download',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'customZipName'                =>
			array(
				'type'                    => 'string',
				'default'                 => '%%gallery_title%%',
				'editorLabel'             => 'Built from',
				'editorDescription'       => 'Type anything you like between the tokens — dashes, underscores, plain words.',
				'editorControl'           =>
				array(
					'kind'   => 'placeholderPattern',
					'tokens' =>
					array(
						array(
							'token' => '%%gallery_title%%',
							'label' => 'gallery_title',
						),
						array(
							'token' => '%%gallery_date%%',
							'label' => 'date',
						),
						array(
							'token' => '%%gallery_id%%',
							'label' => 'id',
						),
					),
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
		),
		'zoom'            =>
		array(
			'enableZoom'             =>
			array(
				'type'                     => 'boolean',
				'default'                  => false,
				'editorLabel'              => 'Zoom on hover',
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Want zoom inside the lightbox?',
					'needsProMessage'    => "Let visitors magnify images without leaving your gallery—zoom happens right in the lightbox.\n\nPick the style that fits: classic window zoom, a follow-along lens, or inner zoom—then fine-tune motion, window size, lens shape, tint, and opacity.\n\nThe Modula ZOOM add-on is built for portfolios, products, and any shot where the details should stand out.",
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-zoom&utm_campaign=zoom-extension',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-zoom',
				),
			),
			'sectionStyle'           =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Style',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'zoomOnHover'            =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Zoom on hover',
				'editorDescription'       => 'Magnifies when the pointer rests on the image. When off, zoom still needs enable, but hover does not trigger it.',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'zoomType'               =>
			array(
				'type'                    => 'string',
				'default'                 => 'window',
				'enum'                    =>
				array(
					0 => 'window',
					1 => 'inner',
					2 => 'lens',
				),
				'editorLabel'             => 'Kind',
				'editorDescription'       => 'In place, the image itself magnifies. The other two put the magnified view in a separate window.',
				'enumOptionLabels'        =>
				array(
					'window' => 'Magnify in place',
					'inner'  => 'Inner',
					'lens'   => 'Lens',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'zoomEffect'             =>
			array(
				'type'                    => 'string',
				'default'                 => 'fade_in',
				'enum'                    =>
				array(
					0 => 'none',
					1 => 'fade_in',
					2 => 'fade_out',
					3 => 'fade_in_out',
					4 => 'easing',
				),
				'editorLabel'             => 'How it appears',
				'enumOptionLabels'        =>
				array(
					'none'        => 'No effect',
					'fade_in'     => 'Fade in',
					'fade_out'    => 'Fade out',
					'fade_in_out' => 'Fade in/out',
					'easing'      => 'Easing',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'sectionMagnifiedWindow' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Magnified window',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'magnifiedWindowHint'    =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Magnified window',
				'editorDescription'       => 'Magnify in place uses no separate window, so these do nothing.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'zoomWindowPosition'     =>
			array(
				'type'                    => 'string',
				'default'                 => 'upper_left',
				'enum'                    =>
				array(
					0 => 'upper_left',
					1 => 'upper_right',
					2 => 'lower_left',
					3 => 'lower_right',
				),
				'editorLabel'             => 'Window position',
				'enumOptionLabels'        =>
				array(
					'upper_left'  => 'Upper left',
					'upper_right' => 'Upper right',
					'lower_left'  => 'Lower left',
					'lower_right' => 'Lower right',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'zoom.zoomType',
					'eq'   => 'window',
				),
			),
			'zoomWindowSize'         =>
			array(
				'type'                    => 'string',
				'default'                 => 'medium',
				'enum'                    =>
				array(
					0 => 'small',
					1 => 'medium',
					2 => 'large',
					3 => 'xlarge',
				),
				'editorLabel'             => 'Window size',
				'enumOptionLabels'        =>
				array(
					'small'  => 'S',
					'medium' => 'M',
					'large'  => 'L',
					'xlarge' => 'XL',
				),
				'editorControl'           =>
				array(
					'kind' => 'segmentedEnum',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'zoom.zoomType',
					'eq'   => 'window',
				),
			),
			'zoomLensSize'           =>
			array(
				'type'                    => 'string',
				'default'                 => 'medium',
				'enum'                    =>
				array(
					0 => 'small',
					1 => 'medium',
					2 => 'large',
					3 => 'xlarge',
				),
				'editorLabel'             => 'Lens size',
				'enumOptionLabels'        =>
				array(
					'small'  => 'S',
					'medium' => 'M',
					'large'  => 'L',
					'xlarge' => 'XL',
				),
				'editorControl'           =>
				array(
					'kind' => 'segmentedEnum',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'zoom.zoomType',
					'eq'   => 'window',
				),
			),
			'zoomLensShape'          =>
			array(
				'type'                    => 'string',
				'default'                 => 'round',
				'enum'                    =>
				array(
					0 => 'round',
					1 => 'square',
				),
				'editorLabel'             => 'Lens shape',
				'enumOptionLabels'        =>
				array(
					'round'  => 'Round',
					'square' => 'Square',
				),
				'editorControl'           =>
				array(
					'kind' => 'segmentedEnum',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'zoom.zoomType',
					'eq'   => 'window',
				),
			),
			'sectionTint'            =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Tint',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'zoomTintOpacity'        =>
			array(
				'type'                    => 'integer',
				'default'                 => 0,
				'minimum'                 => 0,
				'maximum'                 => 100,
				'editorLabel'             => 'Strength',
				'editorDescription'       => 'Dims the rest of the image while the lens is over it. 0 leaves it untouched.',
				'editorControl'           =>
				array(
					'kind' => 'range',
					'min'  => 0,
					'max'  => 100,
					'step' => 1,
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'zoom.zoomType',
					'eq'   => 'window',
				),
			),
			'zoomTintColor'          =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Color',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'zoom.zoomType',
					'eq'   => 'window',
				),
			),
		),
		'watermark'       =>
		array(
			'enableWatermark'                =>
			array(
				'type'                     => 'boolean',
				'default'                  => false,
				'editorLabel'              => 'Watermark',
				'editorDescription'        => 'Technical flag set when watermarking is applied. Not shown as a toggle in the takeover editor.',
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Watermark your gallery images?',
					'needsProMessage'    => 'Upgrade to Modula Premium to unlock the Watermark add-on: add your logo or mark to gallery images so shared work stays on-brand and clearly yours.',
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-watermark&utm_campaign=watermark-addon',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-watermark',
				),
			),
			'watermarkType'                  =>
			array(
				'type'                    => 'string',
				'default'                 => 'none',
				'enum'                    =>
				array(
					0 => 'none',
					1 => 'text',
					2 => 'image',
				),
				'editorLabel'             => 'Type',
				'enumOptionLabels'        =>
				array(
					'none'  => 'None',
					'text'  => 'Text',
					'image' => 'Image',
				),
				'editorControl'           =>
				array(
					'kind' => 'segmentedEnum',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'customSettingsWatermark'        =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Override global watermark',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'sectionText'                    =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Text',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'watermarkText'                  =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Words',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'watermark.watermarkType',
					'neq'  => 'text',
				),
			),
			'watermarkTextSize'              =>
			array(
				'type'                    => 'integer',
				'default'                 => 18,
				'minimum'                 => 8,
				'maximum'                 => 120,
				'editorLabel'             => 'Size',
				'editorControl'           =>
				array(
					'kind' => 'range',
					'min'  => 8,
					'max'  => 120,
					'step' => 1,
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'watermark.watermarkType',
					'neq'  => 'text',
				),
			),
			'watermarkTextColor'             =>
			array(
				'type'                    => 'string',
				'default'                 => '#FFFFFF',
				'editorLabel'             => 'Colour',
				'editorControl'           =>
				array(
					'kind' => 'color',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'watermark.watermarkType',
					'neq'  => 'text',
				),
			),
			'watermarkTextTypeHint'          =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Text type hint',
				'editorDescription'       => 'Switch the type to Text to use these.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'sectionImage'                   =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Image',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'watermarkImage'                 =>
			array(
				'type'                    => 'integer',
				'default'                 => 0,
				'editorLabel'             => 'File',
				'description'             => 'Media attachment ID for the watermark graphic.',
				'editorControl'           =>
				array(
					'kind'               => 'mediaAttachment',
					'libraryType'        => 'image',
					'mediaFrameTitle'    => 'Choose watermark image',
					'selectButtonLabel'  => 'Choose from the media library',
					'replaceButtonLabel' => 'Replace image',
					'removeButtonLabel'  => 'Remove',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'watermark.watermarkType',
					'neq'  => 'image',
				),
			),
			'watermarkImageDimensionWidth'   =>
			array(
				'type'                    => 'integer',
				'default'                 => 100,
				'minimum'                 => 0,
				'maximum'                 => 2000,
				'editorLabel'             => 'Width',
				'description'             => 'Max width in pixels (0 = automatic).',
				'editorControl'           =>
				array(
					'kind' => 'range',
					'min'  => 0,
					'max'  => 500,
					'step' => 1,
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'watermark.watermarkType',
					'neq'  => 'image',
				),
			),
			'watermarkImageTypeHint'         =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Image type hint',
				'editorDescription'       => 'Switch the type to Image to use these.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'watermarkImageDimensionHeight'  =>
			array(
				'type'                    => 'integer',
				'default'                 => 0,
				'editorLabel'             => 'Height',
				'description'             => 'Max height in pixels (0 = automatic). Classic metabox only; takeover uses width with auto height.',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => false,
			),
			'sectionPlacement'               =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Placement',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'watermarkPosition'              =>
			array(
				'type'                    => 'string',
				'default'                 => 'bottom_left',
				'enum'                    =>
				array(
					0 => 'top_left',
					1 => 'top_center',
					2 => 'top_right',
					3 => 'middle_left',
					4 => 'center',
					5 => 'middle_right',
					6 => 'bottom_left',
					7 => 'bottom_center',
					8 => 'bottom_right',
				),
				'editorLabel'             => 'Position',
				'enumOptionLabels'        =>
				array(
					'top_left'      => 'Top left',
					'top_center'    => 'Top center',
					'top_right'     => 'Top right',
					'middle_left'   => 'Middle left',
					'center'        => 'Center',
					'middle_right'  => 'Middle right',
					'bottom_left'   => 'Bottom left',
					'bottom_center' => 'Bottom center',
					'bottom_right'  => 'Bottom right',
				),
				'editorControl'           =>
				array(
					'kind' => 'positionGrid',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'watermark.watermarkType',
					'eq'   => 'none',
				),
			),
			'watermarkMargin'                =>
			array(
				'type'                    => 'integer',
				'default'                 => 10,
				'minimum'                 => 0,
				'maximum'                 => 100,
				'editorLabel'             => 'Distance from the edge',
				'description'             => 'Space from the edge of the image (px).',
				'editorControl'           =>
				array(
					'kind' => 'range',
					'min'  => 0,
					'max'  => 100,
					'step' => 1,
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'watermark.watermarkType',
					'eq'   => 'none',
				),
			),
			'watermarkOpacity'               =>
			array(
				'type'                    => 'integer',
				'default'                 => 60,
				'minimum'                 => 0,
				'maximum'                 => 100,
				'editorLabel'             => 'Opacity',
				'editorControl'           =>
				array(
					'kind' => 'range',
					'min'  => 0,
					'max'  => 100,
					'step' => 1,
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'watermark.watermarkType',
					'eq'   => 'none',
				),
			),
			'sectionAppliesTo'               =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Applies to',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'watermarkApplyScope'            =>
			array(
				'type'                    => 'string',
				'default'                 => 'all',
				'enum'                    =>
				array(
					0 => 'all',
					1 => 'selected',
				),
				'editorLabel'             => 'Applies to',
				'enumOptionLabels'        =>
				array(
					'all'      => 'All images',
					'selected' => 'Selected only',
				),
				'editorControl'           =>
				array(
					'kind' => 'watermarkApplyScope',
				),
				'editorDescription'       => 'When Selected only, uses the images selected on the preview canvas (Select multiple).',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'watermark.watermarkType',
					'eq'   => 'none',
				),
			),
			'watermarkEnableBackup'          =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Keep originals without watermark',
				'editorDescription'       => 'Keeps unwatermarked files so you can restore them later.',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'watermarkBurnInHint'            =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Watermark burn-in',
				'editorDescription'       => 'Watermark writes into the image files. Changing settings and clicking Watermark images again restores originals from backup (when enabled) and applies the new watermark. Remove watermark also needs backups.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'watermarkApplyToExistingImages' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'description'             => 'UI-only placeholder; Pro applies watermark via AJAX (save gallery first).',
				'editorLabel'             => 'Watermark images',
				'editorControl'           =>
				array(
					'kind'        => 'actionButton',
					'action'      => 'apply_watermark',
					'buttonLabel' => 'Watermark images',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'watermark.watermarkType',
					'eq'   => 'none',
				),
			),
			'watermarkRemoveWatermark'       =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'description'             => 'UI-only placeholder; Pro removes watermark via AJAX (save gallery first).',
				'editorLabel'             => 'Remove watermark',
				'editorControl'           =>
				array(
					'kind'        => 'actionButton',
					'action'      => 'remove_watermark',
					'buttonLabel' => 'Remove watermark',
				),
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
		),
		'exif'            =>
		array(
			'enableExif'        =>
			array(
				'type'                     => 'boolean',
				'default'                  => false,
				'editorLabel'              => 'Show shooting data',
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Looking to add EXIF image info functionality to your lightbox?',
					'needsProMessage'    => "EXIF data is automatically read and displayed.\n\nManually add EXIF data on images that are missing it.\n\nControl how you display your EXIF data in lightboxes.\n\nOn-the-go editing for EXIF metadata.\n\nWith the Modula EXIF extension you'll be able to enrich your photos with camera model, lens, shutter speed, aperture, ISO, and the date the photo was taken. What's more, you can edit EXIF metadata on the go, or add it to images that are missing it.",
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-exif&utm_campaign=exif-extension',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-exif',
				),
			),
			'enableExifOffHint' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Shooting data off hint',
				'editorDescription'       => 'Show shooting data is off, so nothing here is shown in the lightbox.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'exifCamera'        =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Camera',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'exif.enableExif',
					'eq'   => false,
				),
			),
			'exifLens'          =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Lens',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'exif.enableExif',
					'eq'   => false,
				),
			),
			'exifShutterSpeed'  =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Shutter speed',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'exif.enableExif',
					'eq'   => false,
				),
			),
			'exifAperture'      =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Aperture',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'exif.enableExif',
					'eq'   => false,
				),
			),
			'exifFocalLength'   =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Focal length',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'exif.enableExif',
					'eq'   => false,
				),
			),
			'exifIso'           =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'ISO',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'exif.enableExif',
					'eq'   => false,
				),
			),
			'exifDate'          =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Date & time',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'exif.enableExif',
					'eq'   => false,
				),
			),
			'sectionResult'     =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Result',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'exif.enableExif',
					'eq'   => false,
				),
			),
			'exifResultPreview' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Result preview',
				'editorControl'           =>
				array(
					'kind' => 'exifResultPreview',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'exif.enableExif',
					'eq'   => false,
				),
			),
			'exifResultHint'    =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Result hint',
				'editorDescription'       => 'Images shot without this data simply skip the missing parts.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
				'editorDisabledWhen'      =>
				array(
					'path' => 'exif.enableExif',
					'eq'   => false,
				),
			),
		),
		'licensing'       =>
		array(
			'sectionLicense'         =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'License & credit',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'imageLicensing'         =>
			array(
				'type'                     => 'string',
				'default'                  => 'none',
				'enum'                     =>
				array(
					0 => 'none',
					1 => 'by',
					2 => 'by-sa',
					3 => 'by-nc',
					4 => 'by-nc-sa',
					5 => 'by-nc-nd',
					6 => 'by-nd',
					7 => 'cc0',
				),
				'editorLabel'              => 'License',
				'enumOptionLabels'         =>
				array(
					'none'     => 'All rights reserved',
					'by'       => 'CC BY 4.0',
					'by-sa'    => 'CC BY-SA 4.0',
					'by-nc'    => 'CC BY-NC 4.0',
					'by-nc-sa' => 'CC BY-NC-SA 4.0',
					'by-nc-nd' => 'CC BY-NC-ND 4.0',
					'by-nd'    => 'CC BY-ND 4.0',
					'cc0'      => 'CC0',
				),
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				'editorSidebarNestedOnly'  => true,
				'editorControl'            =>
				array(
					'kind'         => 'licenseImageSelect',
					'optionImages' =>
					array(
						'none'     => '',
						'by'       => 'assets/images/licensing/by.png',
						'by-sa'    => 'assets/images/licensing/by-sa.png',
						'by-nc'    => 'assets/images/licensing/by-nc.png',
						'by-nc-sa' => 'assets/images/licensing/by-nc-sa.png',
						'by-nc-nd' => 'assets/images/licensing/by-nc-nd.png',
						'by-nd'    => 'assets/images/licensing/by-nd.png',
						'cc0'      => 'assets/images/licensing/zero.png',
					),
				),
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Trying to add image licenses to your gallery?',
					'needsProMessage'    => "You simplify your image licensing process, saving time and effort—perfect for regular licensing needs.\n\nYou ensure proper attribution for all your images, protecting against copyright infringement and upholding your rights.\n\nYou enjoy the flexibility to set different licensing terms for your images, for unique needs and scenarios.\n\nYou add a layer of professionalism to your portfolio, showing a serious approach to copyright and image management.\n\nYou open new revenue streams by monetizing your work directly through your portfolio, enhancing your earning potential.",
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-licensing&utm_campaign=licensing-extension',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-image-licensing',
				),
			),
			'author'                 =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Credit line',
				'editorDescription'       => 'Author name for attribution on this gallery.',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'company'                =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Company',
				'editorDescription'       => 'Company or copyright notice for this gallery.',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'sectionWhereItShows'    =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Where it shows',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'displayWithDescription' =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Under the gallery',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'showOnLightbox'         =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'In the lightbox',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
		),
		'comments'        =>
		array(
			'commentStatus'  =>
			array(
				'type'                     => 'boolean',
				'default'                  => false,
				'editorLabel'              => 'Enable comments',
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Want visitors to discuss images right on your gallery?',
					'needsProMessage'    => "Upgrade to Modula Premium and unlock the Comments add-on: threaded feedback under each gallery, optional show/hide controls, and a collapsed-by-default mode so long threads don't overwhelm the grid.\n\nKeep the conversation on your site—no need to push every visitor to social media just to leave a note.",
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-comments&utm_campaign=comments-extension',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-comments',
				),
			),
			'sectionDisplay' =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Display',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'toggleComments' =>
			array(
				'type'                    => 'boolean',
				'default'                 => true,
				'editorLabel'             => 'Show comments toggle',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
			'startCollapsed' =>
			array(
				'type'                    => 'boolean',
				'default'                 => false,
				'editorLabel'             => 'Start comments collapsed',
				'editorShowInLite'        => false,
				'editorSidebarNestedOnly' => true,
			),
		),
		'proofing'        =>
		array(
			'imageProofing'         =>
			array(
				'type'                     => 'boolean',
				'default'                  => false,
				'editorLabel'              => 'Client proofing',
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Let clients pick favorites without endless email chains?',
					'needsProMessage'    => "Upgrade to Modula Premium and enable client proofing: visitors sign in (or hit your custom login notice), select a minimum or maximum number of images, and you keep a clear record of what was approved.\n\nSet friendly copy when a gallery is closed or expired, optionally show a login link, and redirect people to a page or URL when time’s up—so bookings and revisions stay organized.",
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-proofing&utm_campaign=proofing-extension',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-image-proofing',
				),
			),
			'minSelection'          =>
			array(
				'type'             => 'integer',
				'minimum'          => 0,
				'maximum'          => 100,
				'default'          => 0,
				'editorLabel'      => 'Minimum selection',
				'editorShowInLite' => false,
			),
			'maxSelection'          =>
			array(
				'type'             => 'integer',
				'minimum'          => 0,
				'maximum'          => 100,
				'default'          => 0,
				'editorLabel'      => 'Maximum selection',
				'editorShowInLite' => false,
			),
			'notificationEmail'     =>
			array(
				'type'              => 'string',
				'default'           => '',
				'editorLabel'       => 'Photographer notification email',
				'editorDescription' => 'Where to send the email when a client submits their final selection. Defaults to the gallery owner email.',
				'editorShowInLite'  => false,
				'editorControl'     =>
				array(
					'kind' => 'text',
					'type' => 'email',
				),
			),
			'loginRejectionNotice'  =>
			array(
				'type'             => 'string',
				'default'          => '',
				'editorLabel'      => 'Login required message',
				'editorShowInLite' => false,
			),
			'showLoginLink'         =>
			array(
				'type'             => 'boolean',
				'default'          => true,
				'editorLabel'      => 'Show login link',
				'editorShowInLite' => false,
			),
			'expireRejectionNotice' =>
			array(
				'type'             => 'string',
				'default'          => '',
				'editorLabel'      => 'Gallery closed message',
				'editorShowInLite' => false,
			),
			'expireLinkToPage'      =>
			array(
				'type'             => 'string',
				'default'          => '0',
				'editorLabel'      => 'Redirect page (ID)',
				'editorShowInLite' => false,
			),
			'expireLinkToPageUrl'   =>
			array(
				'type'             => 'string',
				'default'          => '',
				'editorLabel'      => 'Redirect URL',
				'editorShowInLite' => false,
			),
		),
		'instagram'       =>
		array(
			'accountPanel'      =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Account',
				'editorControl'           =>
				array(
					'kind' => 'instagramAccount',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
				'editorShowInLite'        => false,
			),
			'syncWithInstagram' =>
			array(
				'type'                     => 'boolean',
				'default'                  => false,
				'editorLabel'              => 'Auto-update from Instagram',
				'editorDescription'        => 'When connected, Modula refreshes this gallery about every 6 hours.',
				'editorShowInLite'         => true,
				'editorOmitControlInLite'  => true,
				'editorLightboxLiteUpsell' =>
				array(
					'title'              => 'Turn your Instagram feed into a WordPress gallery?',
					'needsProMessage'    => "Upgrade to Modula Premium and add the Instagram extension: pull posts into the same layouts you use for Modula—grids, sliders, and lightboxes—without manually re-uploading every image.\n\nLink your profile under Modula → Social media, choose what to sync, and refresh on your schedule so the site stays current while you post on Instagram.",
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-instagram&utm_campaign=instagram-extension',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-instagram',
				),
			),
			'managePhotos'      =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Manage photos',
				'editorControl'           =>
				array(
					'kind'        => 'actionButton',
					'action'      => 'instagram_manage_photos',
					'buttonLabel' => 'Manage photos',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
				'editorShowInLite'        => false,
			),
			'cronNote'          =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Sync schedule note',
				'editorDescription'       => 'Connect an account to use these. Auto-update runs about every 6 hours when enabled.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
		),
		'exportImport'    =>
		array(
			'sectionPresets'       =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Presets',
				'editorControl'           =>
				array(
					'kind' => 'heading',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
			'galleryDefaultsPanel' =>
			array(
				'type'                           => 'string',
				'default'                        => '',
				'editorShowInLite'               => true,
				'editorOmitControlInLite'        => true,
				'editorRequiresExtensionEnabled' => 'modula-defaults',
				'editorLabel'                    => 'Presets',
				'editorControl'                  =>
				array(
					'kind' => 'galleryDefaultsShell',
				),
				'editorPresentationOnly'         => true,
				'editorSidebarNestedOnly'        => true,
				'editorLightboxLiteUpsell'       =>
				array(
					'title'              => 'Reuse gallery settings as presets?',
					'needsProMessage'    => "Save this gallery’s settings as a preset, then apply that preset to new galleries so you do not rebuild the same layout, lightbox, and captions each time.\n\nPresets copy settings only — images stay in this gallery. To move a whole gallery (images included), use WordPress Tools → Export and Modula’s importer.",
					'compareUrl'         => 'https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=settings-editor&utm_campaign=upsell&utm_term=lite-vs-pro',
					'pricingUrl'         => 'https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=settings-editor-defaults&utm_campaign=defaults-addon',
					'freeVsPremiumLabel' => 'Free vs Premium',
					'getPremiumLabel'    => 'Get Premium!',
					'extensionSlug'      => 'modula-defaults',
				),
			),
			'toolsNote'            =>
			array(
				'type'                    => 'string',
				'default'                 => '',
				'editorLabel'             => 'Full export note',
				'editorDescription'       => 'To copy a whole gallery including images, use WordPress Tools → Export and Modula’s importer. This panel saves settings presets only.',
				'editorControl'           =>
				array(
					'kind' => 'infoCallout',
				),
				'editorPresentationOnly'  => true,
				'editorSidebarNestedOnly' => true,
			),
		),
	),
	'items'                        =>
	array(
		'description'        => 'Per-item catalog: modula-images rows (attachment id) plus optional modula_images_v2-only rows with itemKind content_block or shortcode (embeddedId, anchors, block/shortcode fields).',
		'id'                 =>
		array(
			'type' => 'integer',
		),
		'title'              =>
		array(
			'type'        => 'string',
			'default'     => '',
			'editorLabel' => 'Title',
		),
		'alt'                =>
		array(
			'type'        => 'string',
			'default'     => '',
			'editorLabel' => 'Alt text',
		),
		'caption'            =>
		array(
			'type'           => 'string',
			'default'        => '',
			'editorLabel'    => 'Caption',
			'editorControl'  =>
			array(
				'kind' => 'textarea',
			),
			'editorStateKey' => 'description',
		),
		'halign'             =>
		array(
			'type'             => 'string',
			'enum'             =>
			array(
				0 => 'left',
				1 => 'center',
				2 => 'right',
			),
			'default'          => 'center',
			'editorLabel'      => 'Horizontal align',
			'enumOptionLabels' =>
			array(
				'left'   => 'Left',
				'center' => 'Center',
				'right'  => 'Right',
			),
		),
		'valign'             =>
		array(
			'type'             => 'string',
			'enum'             =>
			array(
				0 => 'top',
				1 => 'middle',
				2 => 'bottom',
			),
			'default'          => 'middle',
			'editorLabel'      => 'Vertical align',
			'enumOptionLabels' =>
			array(
				'top'    => 'Top',
				'middle' => 'Middle',
				'bottom' => 'Bottom',
			),
		),
		'focal_x'            =>
		array(
			'type'        => 'number',
			'minimum'     => 0,
			'maximum'     => 1,
			'editorLabel' => 'Focal X',
		),
		'focal_y'            =>
		array(
			'type'        => 'number',
			'minimum'     => 0,
			'maximum'     => 1,
			'editorLabel' => 'Focal Y',
		),
		'focal_crop_x'       =>
		array(
			'type'        => 'number',
			'minimum'     => 0,
			'maximum'     => 1,
			'editorLabel' => 'Focal crop X',
		),
		'focal_crop_y'       =>
		array(
			'type'        => 'number',
			'minimum'     => 0,
			'maximum'     => 1,
			'editorLabel' => 'Focal crop Y',
		),
		'focal_crop_w'       =>
		array(
			'type'        => 'number',
			'minimum'     => 0,
			'maximum'     => 1,
			'editorLabel' => 'Focal crop width',
		),
		'focal_crop_h'       =>
		array(
			'type'        => 'number',
			'minimum'     => 0,
			'maximum'     => 1,
			'editorLabel' => 'Focal crop height',
		),
		'tile_image_fit'     =>
		array(
			'type'        => 'string',
			'enum'        =>
			array(
				'',
				'cover',
				'contain',
			),
			'default'     => '',
			'editorLabel' => 'Tile image fit',
			'description' => 'Custom grid only: contain shows the full photo inside the tile (letterbox); cover fills the tile and may crop.',
		),
		'link'               =>
		array(
			'type'        => 'string',
			'format'      => 'uri',
			'default'     => '',
			'editorLabel' => 'Link URL',
		),
		'target'             =>
		array(
			'type'          => 'integer',
			'enum'          =>
			array(
				0 => 0,
				1 => 1,
			),
			'default'       => 0,
			'editorLabel'   => 'Open link in',
			'editorControl' =>
			array(
				'kind'         => 'select',
				'options'      => array( '0', '1' ),
				'optionLabels' =>
				array(
					'0' => 'Same tab',
					'1' => 'New tab',
				),
			),
		),
		'width'              =>
		array(
			'type'    => 'integer',
			'default' => 2,
		),
		'height'             =>
		array(
			'type'    => 'integer',
			'default' => 2,
		),
		'togglelightbox'     =>
		array(
			'type'          => 'integer',
			'enum'          =>
			array(
				0 => 0,
				1 => 1,
			),
			'default'       => 0,
			'editorLabel'   => 'Hide image from lightbox',
			'editorControl' =>
			array(
				'kind'      => 'toggle',
				'stringOn'  => '1',
				'stringOff' => '0',
			),
		),
		'hide_title'         =>
		array(
			'type'          => 'integer',
			'enum'          =>
			array(
				0 => 0,
				1 => 1,
			),
			'default'       => 0,
			'editorLabel'   => 'Hide title',
			'editorControl' =>
			array(
				'kind'      => 'toggle',
				'stringOn'  => '1',
				'stringOff' => '0',
			),
		),
		'filters'            =>
		array(
			'type'          => 'string',
			'default'       => '',
			'editorLabel'   => 'Filters',
			'editorControl' =>
			array(
				'kind' => 'metadataFiltersAutocomplete',
			),
		),
		'video_url'          =>
		array(
			'type'          => 'string',
			'default'       => '',
			'editorLabel'   => 'Video URL',
			'editorControl' =>
			array(
				'kind' => 'text',
			),
		),
		'video_title'        =>
		array(
			'type'    => 'string',
			'default' => '',
		),
		'video_alt'          =>
		array(
			'type'    => 'string',
			'default' => '',
		),
		'video_description'  =>
		array(
			'type'    => 'string',
			'default' => '',
		),
		'video_thumbnail'    =>
		array(
			'type'          => 'string',
			'default'       => '',
			'editorLabel'   => 'Video thumbnail URL',
			'editorControl' =>
			array(
				'kind'              => 'mediaUrl',
				'libraryType'       => 'image',
				'mediaFrameTitle'   => 'Select a thumbnail image',
				'selectButtonLabel' => 'Media Library',
			),
		),
		'video_template'     =>
		array(
			'type'    => 'string',
			'default' => '',
		),
		'video_width'        =>
		array(
			'type'    => 'string',
			'default' => '',
		),
		'video_height'       =>
		array(
			'type'    => 'string',
			'default' => '',
		),
		'autoplay_thumbnail' =>
		array(
			'type'             => 'string',
			'default'          => 'inherit',
			'enum'             => array( 'inherit', 'on', 'off' ),
			'editorLabel'      => 'Autoplay thumbnail',
			'enumOptionLabels' =>
			array(
				'inherit' => 'Inherit',
				'on'      => 'On',
				'off'     => 'Off',
			),
		),
		'autoplay_lightbox'  =>
		array(
			'type'             => 'string',
			'default'          => 'inherit',
			'enum'             => array( 'inherit', 'on', 'off' ),
			'editorLabel'      => 'Autoplay in lightbox',
			'enumOptionLabels' =>
			array(
				'inherit' => 'Inherit',
				'on'      => 'On',
				'off'     => 'Off',
			),
		),
		'loop_video'         =>
		array(
			'type'             => 'string',
			'default'          => 'inherit',
			'enum'             => array( 'inherit', 'on', 'off' ),
			'editorLabel'      => 'Loop video',
			'enumOptionLabels' =>
			array(
				'inherit' => 'Inherit',
				'on'      => 'On',
				'off'     => 'Off',
			),
		),
		'exif_camera'        =>
		array(
			'type'               => 'string',
			'default'            => '',
			'editorLabel'        => 'Camera model',
			'editorMetadataIcon' => 'capturePhoto',
		),
		'exif_lens'          =>
		array(
			'type'               => 'string',
			'default'            => '',
			'editorLabel'        => 'Lens',
			'editorMetadataIcon' => 'aspectRatio',
		),
		'exif_focal_length'  =>
		array(
			'type'               => 'string',
			'default'            => '',
			'editorLabel'        => 'Focal length',
			'editorMetadataIcon' => 'lineDashed',
		),
		'exif_shutter_speed' =>
		array(
			'type'               => 'string',
			'default'            => '',
			'editorLabel'        => 'Shutter speed',
			'editorMetadataIcon' => 'seen',
		),
		'exif_aperture'      =>
		array(
			'type'               => 'string',
			'default'            => '',
			'editorLabel'        => 'Aperture',
			'editorMetadataIcon' => 'plusCircle',
		),
		'exif_iso'           =>
		array(
			'type'               => 'string',
			'default'            => '',
			'editorLabel'        => 'ISO',
			'editorMetadataIcon' => 'chartBar',
		),
		'exif_date'          =>
		array(
			'type'               => 'string',
			'default'            => '',
			'editorLabel'        => 'Date taken',
			'editorMetadataIcon' => 'postDate',
		),
		'exif'               =>
		array(
			'type'           => 'string',
			'default'        => '',
			'editorLabel'    => 'EXIF / extra',
			'editorControl'  =>
			array(
				'kind' => 'textarea',
			),
			'editorStateKey' => 'exifString',
		),
		'image_licensing'    =>
		array(
			'type'    => 'string',
			'default' => 'none',
		),
	),
	'imageMetadataModal'           =>
	array(
		'description' => 'Tabs and field order for per-image edit UI in the settings editor (Image sidebar panel; content-block modal still consumes the same field catalog). Field definitions live under `items`.',
		'tabs'        =>
		array(
			array(
				'name'      => 'content',
				'title'     => 'Text',
				'fieldKeys' => array( 'title', 'alt', 'caption' ),
			),
			array(
				'name'      => 'link',
				'title'     => 'Link',
				'fieldKeys' => array(
					'link',
				),
			),
			array(
				'name'      => 'display',
				'title'     => 'Focus point',
				'fieldKeys' => array(
					'halign',
					'valign',
					'togglelightbox',
					'hide_title',
				),
			),
			array(
				'name'      => 'filters',
				'title'     => 'Filters',
				'fieldKeys' => array(
					'filters',
				),
			),
			array(
				'name'      => 'video',
				'title'     => 'Video',
				'fieldKeys' => array(
					'video_url',
					'video_thumbnail',
					'autoplay_thumbnail',
					'autoplay_lightbox',
					'loop_video',
				),
			),
			array(
				'name'      => 'exif',
				'title'     => 'EXIF',
				'fieldKeys' => array(
					'exif_camera',
					'exif_lens',
					'exif_focal_length',
					'exif_shutter_speed',
					'exif_aperture',
					'exif_iso',
					'exif_date',
				),
			),
		),
	),
	'editorNavigation'             => require __DIR__ . '/settings-v2-editor-navigation.php',
	'flatToGroupedMappingNote'     => 'Full mapping: Modula\\\\V2\\\\Settings\\\\Field_Registry::get_flat_to_grouped_mapping(). Adapter delegates to Field_Registry.',
	'flatToGroupedMappingExamples' =>
	array(
		'grid_type'                       =>
		array(
			'group' => 'layout',
			'key'   => 'gridType',
			'type'  => 'string',
		),
		'uniform_grid_tile_aspect'        =>
		array(
			'group' => 'layout',
			'key'   => 'uniformGridTileAspect',
			'type'  => 'string',
		),
		'uniform_grid_tile_aspect_custom' =>
		array(
			'group' => 'layout',
			'key'   => 'uniformGridTileAspectCustom',
			'type'  => 'object',
		),
		'fit_grid_image_align'            =>
		array(
			'group' => 'layout',
			'key'   => 'fitGridImageAlign',
			'type'  => 'string',
		),
		'grid_row_height'                 =>
		array(
			'group' => 'layout',
			'key'   => 'gridRowHeight',
			'type'  => 'number',
		),
		'grid_justify_last_row'           =>
		array(
			'group' => 'layout',
			'key'   => 'gridJustifyLastRow',
			'type'  => 'string',
		),
		'grid_image_dimensions'           =>
		array(
			'group' => 'layout',
			'key'   => 'gridImageDimensions',
			'type'  => 'object',
		),
		'grid_image_crop'                 =>
		array(
			'group' => 'layout',
			'key'   => 'gridImageCrop',
			'type'  => 'boolean',
		),
		'gutter'                          =>
		array(
			'group' => 'layout',
			'key'   => 'gutter',
			'type'  => 'number',
		),
		'tablet_gutter'                   =>
		array(
			'group' => 'layout',
			'key'   => 'tabletGutter',
			'type'  => 'number',
		),
		'mobile_gutter'                   =>
		array(
			'group' => 'layout',
			'key'   => 'mobileGutter',
			'type'  => 'number',
		),
		'height'                          =>
		array(
			'group' => 'general',
			'key'   => 'height',
			'type'  => 'array',
		),
		'show_navigation'                 =>
		array(
			'group' => 'lightbox',
			'key'   => 'showNavigation',
			'type'  => 'boolean',
		),
		'upload_position'                 =>
		array(
			'group' => 'general',
			'key'   => 'uploadPosition',
			'type'  => 'string',
		),
		'hide_title'                      =>
		array(
			'group' => 'captions',
			'key'   => 'hideTitle',
			'type'  => 'boolean',
		),
		'titleColor'                      =>
		array(
			'group' => 'captions',
			'key'   => 'titleColor',
			'type'  => 'string',
		),
		'enableSocial'                    =>
		array(
			'group' => 'social',
			'key'   => 'enableSocial',
			'type'  => 'boolean',
		),
	),
);
