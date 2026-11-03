<?php
/**
 * Takeover sidebar V2 copy — single source of truth for nav helpers, panel intros, and hub/drill help.
 *
 * Merged into `editorNavigation` categories at codegen
 * (`Settings_Schema_Exporter` → `modula-settings-editor-structure.js`).
 *
 * Keys:
 * - categories[name].navHelp           — left-rail one-liner under the category title
 * - categories[name].panelDescription  — settings-column intro under “Editing / {Category}”
 * - hubHelpByGroupedPath[path]         — hub field row helper (`type: field`)
 * - hubHelpByDrillLabel[label]         — hub drill row helper + nested drill panel description
 *
 * Inline `navHelp` / `panelDescription` / `hubHelp` on navigation PHP items win over this file.
 *
 * @package Modula
 */

return array(
	'categories'           =>
	array(
		'layout'      =>
		array(
			'navHelp'          => 'Arrangement and spacing',
			'panelDescription' => 'Structure, spacing, captions and responsive behaviour.',
		),
		'lightbox'    =>
		array(
			'navHelp'          => 'The big view after a click',
			'panelDescription' => 'What happens after someone clicks an image.',
		),
		'filters'     =>
		array(
			'navHelp'          => "Narrowing down what's shown",
			'panelDescription' => 'The bar visitors use to narrow the gallery down.',
		),
		'motion'      =>
		array(
			'navHelp'          => 'Hover and load effects',
			'panelDescription' => 'Hover and the effects that play as the gallery loads.',
		),
		'interaction' =>
		array(
			'navHelp'          => 'Download, comments, sharing',
			'panelDescription' => 'What visitors can do with the images.',
		),
		'protection'  =>
		array(
			'navHelp'          => 'Keeping your photos yours',
			'panelDescription' => 'How hard it is to take an image out of this gallery.',
		),
		'instagram'   =>
		array(
			'navHelp'          => 'Photos from an Instagram account',
			'panelDescription' => 'Bring the photos from an Instagram account into this gallery.',
		),
		'proofing'    =>
		array(
			'navHelp'          => 'Clients pick their favourites',
			'panelDescription' => 'Let clients pick their favourite images.',
		),
		'video'       =>
		array(
			'navHelp'          => 'If the gallery holds videos',
			'panelDescription' => 'Applies to the video items in this gallery.',
		),
		'css'         =>
		array(
			'navHelp'          => 'Custom CSS',
			'panelDescription' => 'Custom CSS for this gallery.',
		),
	),
	'hubHelpByGroupedPath' =>
	array(
		'lightbox.lightbox'           => 'Choose what happens when an image is clicked.',
		'lightbox.toolbar'            => 'Show or hide the top bar',
		'slideshow.enableSlideshow'   => 'Turns the lightbox into a slideshow so images advance in place.',
		'pagination.enablePagination' => 'Split large galleries into pages',
		'download.enableDownload'     => 'Allow visitors to download images',
		'comments.commentStatus'      => 'Enable comments on gallery images',
		'hover.changeCursor'          => 'Use a special cursor over gallery images',
		'exif.enableExif'             => 'Display camera metadata on images',
		'zoom.enableZoom'             => 'Magnify images inside the lightbox (Modula ZOOM)',
		'deeplink.modulaDeeplink'     => 'Link directly to a specific image',
	),
	'hubHelpByDrillLabel'  =>
	array(
		'Lightbox'               => 'Opening, navigation, text, zoom and slideshow in the lightbox',
		'Lightbox & Links'       => 'Animation, toolbar buttons, and click behaviour in the lightbox',
		'Filter bar'             => 'Where the bar sits, how it looks, and how it behaves on phones',
		'Page size & navigation' => 'Images per page, scroll or load more, and control styling',
		'Captions'               => 'Titles, captions, and where they sit on the image',
		'Hover effects'          => 'Presets and motion for image hover',
		'Loading effects'        => 'Scale, rotate, and slide when images load',
		'Download'               => 'What visitors can take, the gallery button, and zip name',
		'Sharing'                => 'Buttons that hand the image to somewhere else.',
		'Comments'               => 'Show or hide the comments panel on the gallery',
		'Pass Protect'           => 'Password, username, and message on the lock screen',
		'Image Guardian'         => 'Modula’s name for the anti-saving tools. They make casual saving harder. None of them stops a screenshot.',
		'Watermark'              => 'Burned into the delivered image, so it survives a screenshot.',
		'Image licensing'        => 'States what people may do with these images',
		'EXIF'                   => 'Read from the file and shown under the image in the lightbox.',
		'Photo links'            => 'Share a URL that opens one image in this gallery.',
		'Proofing'               => 'Selection limits, notifications, and the messages clients see',
		'Play icon'              => 'The mark that tells a visitor a tile is a video, not a photo.',
		'Speed Up'               => 'Lazy load and image compression for faster pages.',
		'Presets'                => 'Save these settings and reuse them on new galleries.',
	),
);
