<?php
/**
 * Handles upsells for gallery editor tab content
 *
 * @since 2.13.0
 */
class Modula_Tab_Content_Handler extends Modula_Upsell_Base {

	/**
	 * Constructor
	 */
	public function __construct() {
		parent::__construct();
		$this->register_tab_filters();
	}

	/**
	 * Register all filter hooks for tab content upsells
	 */
	private function register_tab_filters() {
		add_filter( 'modula_hover-effect_tab_content', array( $this, 'hovereffects_tab_upsell' ), 15, 1 );
		add_filter( 'modula_image-loaded-effects_tab_content', array( $this, 'loadingeffects_tab_upsell' ), 15, 1 );
		add_filter( 'modula_video_tab_content', array( $this, 'video_tab_upsell' ) );
		add_filter( 'modula_speedup_tab_content', array( $this, 'speedup_tab_upsell' ) );
		add_filter( 'modula_filters_tab_content', array( $this, 'filters_tab_upsell' ) );
		add_filter( 'modula_lightboxes_tab_content', array( $this, 'lightboxes_tab_upsell' ) );
		add_filter( 'modula_misc_tab_content', array( $this, 'misc_tab_upsell' ) );
		add_filter( 'modula_password_protect_tab_content', array( $this, 'password_protect_tab_upsell' ) );
		add_filter( 'modula_watermark_tab_content', array( $this, 'watermark_tab_upsell' ) );
		add_filter( 'modula_slideshow_tab_content', array( $this, 'slideshow_tab_upsell' ) );
		add_filter( 'modula_download_tab_content', array( $this, 'download_tab_upsell' ) );
		add_filter( 'modula_exif_tab_content', array( $this, 'exif_tab_upsell' ) );
		add_filter( 'modula_zoom_tab_content', array( $this, 'zoom_tab_upsell' ) );
		add_filter( 'modula_image_licensing_tab_content', array( $this, 'image_licensing_tab_upsell' ) );
		add_filter( 'modula_comments_tab_content', array( $this, 'comments_tab_upsell' ) );
	}

	/**
	 * Generate upsell buttons HTML
	 *
	 * @param string $tab         The tab identifier.
	 * @param string $utm_campaign The UTM campaign parameter.
	 * @return string The buttons HTML.
	 */
	private function generate_upsell_buttons( $tab, $utm_campaign ) {
		$buttons  = '<a target="_blank" href="' . esc_url( $this->free_vs_pro_link ) . '" class="button">' . esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ) . '</a>';
		$buttons .= '<a target="_blank" href="https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=' . esc_attr( $tab ) . '_tab_upsell-tab&utm_campaign=' . esc_attr( $utm_campaign ) . '" class="button-primary button">' . esc_html__( 'Get Premium!', 'modula-best-grid-gallery' ) . '</a>';

		return apply_filters( 'modula_upsell_buttons', $buttons, $tab );
	}

	/**
	 * Render tab upsell content
	 *
	 * @param string $tab_content     The existing tab content.
	 * @param string $title           The upsell title.
	 * @param string $description    The upsell description.
	 * @param string $tab             The tab identifier.
	 * @param string $utm_campaign    The UTM campaign parameter.
	 * @param array  $features        Optional features array.
	 * @return string The modified tab content.
	 */
	private function render_tab_upsell( $tab_content, $title, $description, $tab, $utm_campaign, $features = array() ) {
		$tab_content .= '<div class="modula-upsell">';
		$tab_content .= $this->generate_upsell_box( $title, $description, $tab, $features );
		$tab_content .= '<p>';
		$tab_content .= $this->generate_upsell_buttons( $tab, $utm_campaign );
		$tab_content .= '</p>';
		$tab_content .= '</div>';

		return $tab_content;
	}

	public function loadingeffects_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula' ) ) {
			return $tab_content;
		}

		$upsell_title       = esc_html__( 'Not enough control?', 'modula-best-grid-gallery' );
		$upsell_description = esc_html__( 'Upgrade to Modula Premium today to unlock the ability to scale an image, and add horizontal/vertical slides...', 'modula-best-grid-gallery' );

		return $this->render_tab_upsell( $tab_content, $upsell_title, $upsell_description, 'loadingeffects', 'loadingeffects' );
	}

	public function hovereffects_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula' ) ) {
			return $tab_content;
		}

		$upsell_title       = esc_html__( 'Need new hover effects and cursors ?', 'modula-best-grid-gallery' );
		$upsell_description = esc_html__( 'Upgrade to Modula Premium today to unlock 41 more hover effects and custom cursors...', 'modula-best-grid-gallery' );

		return $this->render_tab_upsell( $tab_content, $upsell_title, $upsell_description, 'hovereffects', 'hovereffects' );
	}

	public function video_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-video' ) ) {
			return $tab_content;
		}

		$upsell_title       = esc_html__( 'Trying to add a video to your gallery?', 'modula-best-grid-gallery' );
		$upsell_description = esc_html__( 'Adding a video gallery with self-hosted videos or videos from sources like YouTube and Vimeo to your website has never been easier.', 'modula-best-grid-gallery' );

		return $this->render_tab_upsell( $tab_content, $upsell_title, $upsell_description, 'modula-video', 'modula-video' );
	}

	public function speedup_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-speedup' ) ) {
			return $tab_content;
		}

		$upsell_title       = esc_html__( 'Looking to make your gallery load faster ?', 'modula-best-grid-gallery' );
		$upsell_description = esc_html__( 'Allow Modula to automatically optimize your images to load as fast as possible by reducing their file sizes, resizing them and serving them from StackPath\'s content delivery network.', 'modula-best-grid-gallery' );

		return $this->render_tab_upsell( $tab_content, $upsell_title, $upsell_description, 'modula-speedup', 'modula-speedup' );
	}

	public function filters_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula' ) ) {
			return $tab_content;
		}

		$upsell_title       = esc_html__( 'Looking to add filters to your gallery?', 'modula-best-grid-gallery' );
		$upsell_description = esc_html__( 'Ugrade to Modula Premium today and get access to filters and separate the images in your gallery.', 'modula-best-grid-gallery' );

		return $this->render_tab_upsell( $tab_content, $upsell_title, $upsell_description, 'filters', 'filters' );
	}

	public function lightboxes_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula' ) ) {
			return $tab_content;
		}

		$title       = esc_html__( 'Looking to add more functionality to your lightbox?', 'modula-best-grid-gallery' );
		$description = esc_html__( 'Ugrade to Modula Premium today and get access to a impressive number of options and settings for your lightbox, everything from toolbar buttons to animations and transitions.', 'modula-best-grid-gallery' );

		$features = array(
			array(
				'tooltip' => esc_html__( 'Enable this to allow loop navigation inside lightbox', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Loop Navigation', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Toggle on to show the image title in the lightbox above the caption.', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Show Image Title', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Toggle on to show the image caption in the lightbox.', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Show Image Caption', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Select the position of the caption and title inside the lightbox.', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Title and Caption Position', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Enable or disable keyboard navigation inside lightbox', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Keyboard Navigation', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Enable or disable mousewheel navigation inside lightbox', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Mousewheel Navigation', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Display the toolbar which contains the action buttons on top right corner.', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Toolbar', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Close the slide if user clicks/double clicks on slide( not image ).', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Close on slide click', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Display the counter at the top left corner.', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Infobar', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Open the lightbox automatically in Full Screen mode.', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Auto start in Fullscreen', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Place the thumbnails at the bottom of the lightbox. This will automatically put `y` axis for thumbnails.', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Thumbnails at bottom ', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Select vertical or horizontal scrolling for thumbnails', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Thumb axis', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Display thumbnails on lightbox opening.', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Auto start thumbnail ', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Choose the lightbox transition effect between slides.', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Transition Effect ', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Allow panning/swiping', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Allow Swiping ', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Toggle ON to show all images', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Show all images ', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Choose the open/close animation effect of the lightbox', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Open/Close animation', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Set the lightbox background color', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Lightbox background color', 'modula-best-grid-gallery' ),
			),
			array(
				'tooltip' => esc_html__( 'Allow your visitors to share their favorite images from inside the lightbox', 'modula-best-grid-gallery' ),
				'feature' => esc_html__( 'Lightbox social share', 'modula-best-grid-gallery' ),
			),
		);

		return $this->render_tab_upsell( $tab_content, $title, $description, 'lightboxes', 'lightboxes', $features );
	}

	public function misc_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-deeplink' ) && ! $this->extensions->is_upgradable_addon( 'modula-image-guardian' ) ) {
			return $tab_content;
		}

		if ( $this->extensions->is_upgradable_addon( 'modula-deeplink' ) && $this->extensions->is_upgradable_addon( 'modula-image-guardian' ) ) {
			$upsell_title       = esc_html__( 'Looking to add deeplink functionality to your lightbox or protect your images from stealing?', 'modula-best-grid-gallery' );
			$upsell_description = esc_html__( 'Ugrade to Modula Premium today and get access to Modula Protection and Modula Deeplink add-ons and increase the functionality and copyright your images.', 'modula-best-grid-gallery' );
		} elseif ( $this->extensions->is_upgradable_addon( 'modula-deeplink' ) && ! $this->extensions->is_upgradable_addon( 'modula-image-guardian' ) ) {
			$upsell_title       = esc_html__( 'Looking to add deeplink functionality to your lightbox?', 'modula-best-grid-gallery' );
			$upsell_description = esc_html__( 'Ugrade to Modula Premium today and get access to Modula Deeplink add-ons and increase the functionality of your images.', 'modula-best-grid-gallery' );
		} else {
			$upsell_title       = esc_html__( 'Looking to  protect your images from stealing?', 'modula-best-grid-gallery' );
			$upsell_description = esc_html__( 'Ugrade to Modula Premium today and get access to Modula Protection and copyright your images.', 'modula-best-grid-gallery' );
		}

		return $this->render_tab_upsell( $tab_content, $upsell_title, $upsell_description, 'misc', 'misc' );
	}

	public function password_protect_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-password-protect' ) ) {
			return $tab_content;
		}

		$upsell_title       = esc_html__( 'Looking to protect your galleries with a password ?', 'modula-best-grid-gallery' );
		$upsell_description = esc_html__( 'Ugrade to Modula Premium today and get access to Modula Password Protect add-on and protect your galleries with a password.', 'modula-best-grid-gallery' );

		return $this->render_tab_upsell( $tab_content, $upsell_title, $upsell_description, 'modula-password', 'modula-password-protect' );
	}

	public function watermark_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-watermark' ) ) {
			return $tab_content;
		}

		$upsell_title       = esc_html__( 'Looking to watermark your galleries?', 'modula-best-grid-gallery' );
		$upsell_description = esc_html__( 'Ugrade to Modula Premium today and get access to Modula Watermark add-on and add a watermark to your gallery images.', 'modula-best-grid-gallery' );

		return $this->render_tab_upsell( $tab_content, $upsell_title, $upsell_description, 'modula-watermark', 'modula-watermark' );
	}

	public function slideshow_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-slideshow' ) ) {
			return $tab_content;
		}

		$upsell_title       = esc_html__( 'Want to make slideshows from your gallery?', 'modula-best-grid-gallery' );
		$upsell_description = esc_html__( 'Ugrade to Modula Premium today and get access to Modula Slidfeshow add-on allows you to turn your gallery\'s lightbox into a stunning slideshow.', 'modula-best-grid-gallery' );

		return $this->render_tab_upsell( $tab_content, $upsell_title, $upsell_description, 'modula-slideshow', 'modula-slideshow' );
	}

	public function zoom_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-zoom' ) ) {
			return $tab_content;
		}

		$upsell_title       = esc_html__( 'Looking to add zoom functionality to your lightbox?', 'modula-best-grid-gallery' );
		$upsell_description = esc_html__( "With the Modula ZOOM extension you'll be able to allow your users to zoom in on your photos, using different zoom effects, making sure every little detail of your photo doesn't go unnoticed.", 'modula-best-grid-gallery' );

		$features = array(
			array(
				'feature' => 'Zoom in effect on images, inside the lightbox',
			),
			array(
				'feature' => 'Multiple zooming effects, such as: basic, lens and inner',
			),
			array(
				'feature' => "Control the zoom effect's shape, size, tint and opacity",
			),
			array(
				'feature' => "Impress your potential clients with detail rich images that don't go unnoticed",
			),
		);

		return $this->render_tab_upsell( $tab_content, $upsell_title, $upsell_description, 'modula-zoom', 'modula-zoom', $features );
	}

	public function exif_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-exif' ) ) {
			return $tab_content;
		}

		$upsell_title       = esc_html__( 'Looking to add EXIF image info functionality to your lightbox?', 'modula-best-grid-gallery' );
		$upsell_description = esc_html__( "With the Modula EXIF extension you'll be able to enrich your photos with the following metadata: camera model, lens, shutter speed, aperture, ISO and the date the photography was taken. More so, by using this extension, you can edit your EXIF metadata on the go, or add it to images that are missing it. ", 'modula-best-grid-gallery' );
		$features           = array(
			array(
				'feature' => 'EXIF data is automatically read and displayed',
			),
			array(
				'feature' => 'Manually add EXIF data on images that are missing it',
			),
			array(
				'feature' => 'Control how you display your EXIF data in lighboxes',
			),
			array(
				'feature' => 'On-the go editing for EXIF metadata',
			),
		);

		return $this->render_tab_upsell( $tab_content, $upsell_title, $upsell_description, 'modula-exif', 'modula-exif', $features );
	}

	public function download_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-download' ) ) {
			return $tab_content;
		}

		$upsell_title       = esc_html__( 'Looking to add download functionality to your lightbox?', 'modula-best-grid-gallery' );
		$upsell_description = esc_html__( 'Give your users the ability to download your images, galleries or albums with an easy to use shortcode.', 'modula-best-grid-gallery' );

		$features = array(
			array(
				'feature' => 'Download entire galleries, albums or a single photo',
			),
			array(
				'feature' => 'Select the image sizes the user can download (thumbnail, full size, or custom)',
			),
			array(
				'feature' => 'Comes with a powerful shortcode that you can use to render the button anywhere',
			),
		);

		return $this->render_tab_upsell( $tab_content, $upsell_title, $upsell_description, 'modula-download', 'modula-download', $features );
	}

	public function image_licensing_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-image-licensing' ) ) {
			return $tab_content;
		}

		$upsell_title       = esc_html__( 'Trying to add image licenses to your gallery?', 'modula-best-grid-gallery' );
		$upsell_description = esc_html__( 'Streamline licensing, protect your work, and monetize effortlessly with our extension.', 'modula-best-grid-gallery' );
		$features           = array(
			array(
				'feature' => 'You simplify your image licensing process, saving time and effort, perfect for your regular licensing needs.',
			),
			array(
				'feature' => 'You ensure proper attribution for all your images, protecting against copyright infringement and upholding your rights.',
			),
			array(
				'feature' => 'You enjoy the flexibility to set different licensing terms for your images, catering to your unique needs and scenarios.',
			),
			array(
				'feature' => 'You add a layer of professionalism to your portfolio, demonstrating your serious approach to copyright and image management.',
			),
			array(
				'feature' => 'You open new revenue streams by monetizing your work directly through your portfolio, enhancing your earning potential',
			),
		);

		return $this->render_tab_upsell( $tab_content, $upsell_title, false, 'image-licensing', 'modula-image-licensing', $features );
	}

	public function comments_tab_upsell( $tab_content ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-comments' ) ) {
			return $tab_content;
		}

		$upsell_title = esc_html__( 'Want to allow users to add comments for your images?', 'modula-best-grid-gallery' );
		$features     = array(
			array(
				'feature' => 'Increase engagement on your website',
			),
			array(
				'feature' => 'Interact with your site users',
			),
			array(
				'feature' => 'Receive feedback on your work',
			),
			array(
				'feature' => 'Allow users to discuss amongst themselves',
			),
		);

		return $this->render_tab_upsell( $tab_content, $upsell_title, false, 'image-licensing', 'modula-image-licensing', $features );
	}
}
