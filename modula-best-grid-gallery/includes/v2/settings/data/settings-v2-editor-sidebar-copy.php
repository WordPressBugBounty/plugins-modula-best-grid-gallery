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
		'interaction' =>
		array(
			'navHelp'          => 'Hover, click, and load effects',
			'panelDescription' => 'Hover, click and the effects that play as the gallery loads.',
		),
		'protection'  =>
		array(
			'navHelp'          => 'Keeping your photos yours',
			'panelDescription' => 'How hard it is to take an image out of this gallery.',
		),
		'advanced'    =>
		array(
			'navHelp'          => 'Speed, camera data, extras',
			'panelDescription' => 'EXIF, performance, integrations and technical options.',
		),
		'video'       =>
		array(
			'navHelp'          => 'If the gallery holds videos',
			'panelDescription' => 'Applies to the video items in this gallery.',
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
		'zoom.enableZoom'             => 'A magnified view that follows the pointer across the image',
		'deeplink.modulaDeeplink'     => 'Link directly to a specific image',
	),
	'hubHelpByDrillLabel'  =>
	array(
		'Slideshow options'      => 'Auto-play and timing settings',
		'Click and motion'       => 'Double-click open, close on click, and how the lightbox moves',
		'Buttons in the viewer'  => 'Which toolbar buttons appear in the lightbox',
		'Filters'                => 'Names visitors can use to narrow the gallery',
		'Page size & navigation' => 'Images per page, scroll or load more, and control styling',
		'Hover effect'           => 'Presets, motion, and overlay for image hover',
		'Zoom'                   => 'Magnify images on hover',
		'Zoom options'           => 'Kind, window, and tint for hover zoom',
		'Loading effect'         => 'Scale, rotate, and slide when images load',
		'Download'               => 'Let visitors save images from your gallery',
		'Download options'       => 'What visitors can take, the gallery button, and zip name',
		'Sharing'                => 'Buttons that hand the image to somewhere else.',
		'Comments'               => 'Discussion under gallery images',
		'Comments options'       => 'Show or hide the comments panel on the gallery',
		'Password'               => 'Password, username, and message on the lock screen',
		'Image Guardian'         => 'Modula’s name for the anti-saving tools. They make casual saving harder. None of them stops a screenshot.',
		'Watermark'              => 'Burned into the delivered image, so it survives a screenshot.',
		'License'                => 'States what people may do with these images',
		'Play badge'             => 'The mark that tells a visitor a tile is a video, not a photo.',
		'Hover preview'          => 'A short silent clip that plays in the tile while the pointer is on it.',
		'Shooting data'          => 'Read from the file and shown under the image in the lightbox.',
		'Link to one image'      => 'Share a URL that opens one image in this gallery.',
		'Instagram'              => 'Connect an account and keep this gallery in sync.',
		'Performance'            => 'Lazy load and image compression for faster pages.',
		'Presets'                => 'Save these settings and reuse them on new galleries.',
	),
);
