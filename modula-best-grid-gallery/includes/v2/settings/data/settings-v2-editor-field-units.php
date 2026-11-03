<?php

/**
 * Unit shown after a slider's value in the gallery editor ("10 px"), as the
 * editor redesign canvas draws it. Display only: settings store the number
 * without a unit, so nothing here changes a stored value or the REST schema.
 * Merged into `editorControl.unit` in Settings_Schema_Document::get_document()
 * when the field does not name a unit itself.
 *
 * @package Modula
 */

return array(
	'layout.gridRowHeight'           => 'px',
	'layout.gutter'                  => 'px',
	'layout.tabletGutter'            => 'px',
	'layout.mobileGutter'            => 'px',
	'general.height'                 => 'px',
	'polaroid.rotationMax'           => '°',
	'polaroid.scatterMax'            => 'px',
	'slider.autoplaySpeed'           => 'ms',
	'slider.speed'                   => 'ms',
	'showcase.autoplayInterval'      => 'ms',
	'showcase.gap'                   => 'px',
	'style.borderRadius'             => 'px',
	'style.borderSize'               => 'px',
	'responsive.treatAsTabletUnder'  => 'px',
	'responsive.treatAsPhoneUnder'   => 'px',
	'captions.titleFontSize'         => 'px',
	'captions.mobileTitleFontSize'   => 'px',
	'captions.captionFontSize'       => 'px',
	'captions.mobileCaptionFontSize' => 'px',
	'captions.compactCaptionMinSize' => 'px',
	'captions.belowImageSpacing'     => 'px',
	'captions.belowImagePadding'     => 'px',
	'slideshow.slideshowSpeed'       => 'ms',
	'social.socialIconSize'          => 'px',
	'video.playIconSize'             => 'px',
	'video.previewVideoDuration'     => 's',
);
