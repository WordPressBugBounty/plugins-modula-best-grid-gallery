<?php
/**
 * The extension catalog: every extension's name, description, plan and
 * order. Lite owns it, so a site without Compatible Pro still lists every
 * extension; Compatible Pro only reports each extension's state on this site
 * (Modula_Extension_States). See ADR 0048.
 *
 * @package Modula
 */

defined( 'ABSPATH' ) || exit;

/**
 * Extension catalog.
 */
class Modula_Extension_Catalog {

	/**
	 * Extensions by the cheapest plan that includes them, plans from the
	 * cheapest, extensions in display order. Each extension appears once.
	 *
	 * @var array<string,string[]>
	 */
	const PLANS = array(
		'starter'  => array(
			'modula-video',
			'modula-slideshow',
		),
		'trio'     => array(
			'modula-speedup',
			'modula-standalone',
			'modula-advanced-shortcodes',
			'modula-image-guardian',
			'modula-password-protect',
			'modula-albums',
			'modula-slider',
			'modula-fullscreen',
			'modula-image-licensing',
			'modula-instagram',
			'modula-content-galleries',
		),
		'business' => array(
			'modula-defaults',
			'modula-roles',
			'modula-zoom',
			'modula-exif',
			'modula-watermark',
			'modula-deeplink',
			'modula-pagination',
			'modula-whitelabel',
			'modula-image-proofing',
			'modula-comments',
			'modula-download',
		),
	);

	/**
	 * Extensions each plan includes: its own and every cheaper plan's.
	 *
	 * @return array<string,string[]> Plan => extension slugs, in display order.
	 */
	public static function plan_map() {
		$map      = array();
		$included = array();
		foreach ( self::PLANS as $plan => $slugs ) {
			$included     = array_merge( $included, $slugs );
			$map[ $plan ] = $included;
		}
		return $map;
	}

	/**
	 * The catalog grouped by plan, each extension with its state on this site.
	 *
	 * A plan is covered when the site has any of its extensions available:
	 * a license covers whole plans, so the others are then extensions this
	 * Pro version does not provide.
	 *
	 * @param array<string,array{available:bool,active:bool,settings:?string}> $states Slug => state
	 *        (Modula_Extension_States::for_site()); a missing slug is unavailable.
	 * @param string $license_state This site's license state (Modula_License_Card::current_state()).
	 * @return array[] Groups: { plan, label, covered, upgrade_url, extensions: [ { slug, name,
	 *         description, available, active, settings } ] }. `upgrade_url` is null when the
	 *         plan offers no upgrade (see offers_upgrade()).
	 */
	public static function groups( array $states, $license_state ) {
		$copy   = self::copy();
		$labels = self::plan_labels();
		$groups = array();

		foreach ( self::PLANS as $plan => $slugs ) {
			$extensions = array();
			foreach ( $slugs as $slug ) {
				$extensions[] = array_merge(
					array( 'slug' => $slug ),
					$copy[ $slug ],
					$states[ $slug ] ?? Modula_Extension_States::UNAVAILABLE
				);
			}

			$covered  = in_array( true, array_column( $extensions, 'available' ), true );
			$groups[] = array(
				'plan'        => $plan,
				'label'       => $labels[ $plan ],
				'covered'     => $covered,
				'upgrade_url' => self::offers_upgrade( $covered, $license_state ) ? self::upgrade_url( $plan ) : null,
				'extensions'  => $extensions,
			);
		}

		return $groups;
	}

	/**
	 * Whether a plan links to its pricing page: only a plan the site does not
	 * cover, and not once the license is expired past renewal grace. Pro then
	 * reports no plan, so the plan the customer bought reads as uncovered too;
	 * Renew on the license card is the way back.
	 *
	 * @param bool   $covered       The site has the plan's extensions.
	 * @param string $license_state This site's license state.
	 * @return bool
	 */
	private static function offers_upgrade( $covered, $license_state ) {
		return ! $covered && 'expired' !== $license_state;
	}

	/**
	 * Pricing page for a plan, tagged with it.
	 *
	 * @param string $plan Plan slug.
	 * @return string
	 */
	public static function upgrade_url( $plan ) {
		return MODULA_PRO_STORE_UPGRADE_URL . '?utm_source=modula-pro&utm_medium=extensions&utm_campaign=upgrade-to-' . $plan;
	}

	/**
	 * Plan names.
	 *
	 * @return array<string,string>
	 */
	private static function plan_labels() {
		return array(
			'starter'  => __( 'Starter', 'modula-best-grid-gallery' ),
			'trio'     => __( 'Trio', 'modula-best-grid-gallery' ),
			'business' => __( 'Business', 'modula-best-grid-gallery' ),
		);
	}

	/**
	 * Name and description of every extension in PLANS. Translated, so call
	 * it after `init`.
	 *
	 * @return array<string,array{name:string,description:string}>
	 */
	public static function copy() {
		return array(
			'modula-video'               => array(
				'name'        => __( 'Video', 'modula-best-grid-gallery' ),
				'description' => __( 'Add video galleries with self-hosted videos or external sources like YouTube and Vimeo to your website.', 'modula-best-grid-gallery' ),
			),
			'modula-slideshow'           => array(
				'name'        => __( 'Slideshow', 'modula-best-grid-gallery' ),
				'description' => __( 'Enhance your gallery with beautiful lightbox effects and advanced image viewing options.', 'modula-best-grid-gallery' ),
			),
			'modula-speedup'             => array(
				'name'        => __( 'Speed Up', 'modula-best-grid-gallery' ),
				'description' => __( 'Automatically optimize your images to load fast by reducing file sizes and using a CDN.', 'modula-best-grid-gallery' ),
			),
			'modula-standalone'          => array(
				'name'        => __( 'Standalone', 'modula-best-grid-gallery' ),
				'description' => __( 'Create standalone galleries and albums that can be used on any page or post.', 'modula-best-grid-gallery' ),
			),
			'modula-advanced-shortcodes' => array(
				'name'        => __( 'Advanced Shortcodes', 'modula-best-grid-gallery' ),
				'description' => __( 'Link dynamically to specific galleries using URLs with query strings, without creating pages.', 'modula-best-grid-gallery' ),
			),
			'modula-image-guardian'      => array(
				'name'        => __( 'Image Guardian', 'modula-best-grid-gallery' ),
				'description' => __( 'Protect your galleries from right-click, hide image URLs, blur images when the tab loses focus, and optionally protect the whole site.', 'modula-best-grid-gallery' ),
			),
			'modula-password-protect'    => array(
				'name'        => __( 'Password Protect', 'modula-best-grid-gallery' ),
				'description' => __( 'Password protect your galleries for exclusive or client access.', 'modula-best-grid-gallery' ),
			),
			'modula-albums'              => array(
				'name'        => __( 'Albums', 'modula-best-grid-gallery' ),
				'description' => __( 'Organize your galleries into beautiful albums and collections for better content management.', 'modula-best-grid-gallery' ),
			),
			'modula-slider'              => array(
				'name'        => __( 'Slider', 'modula-best-grid-gallery' ),
				'description' => __( 'Transform your galleries into stunning sliders with smooth transitions and effects.', 'modula-best-grid-gallery' ),
			),
			'modula-fullscreen'          => array(
				'name'        => __( 'Fullscreen', 'modula-best-grid-gallery' ),
				'description' => __( 'Display your galleries in fullscreen mode for an immersive viewing experience.', 'modula-best-grid-gallery' ),
			),
			'modula-image-licensing'     => array(
				'name'        => __( 'Image Licensing', 'modula-best-grid-gallery' ),
				'description' => __( 'Manage image licensing and copyright information directly within your galleries.', 'modula-best-grid-gallery' ),
			),
			'modula-instagram'           => array(
				'name'        => __( 'Instagram', 'modula-best-grid-gallery' ),
				'description' => __( 'Import and display Instagram photos directly in your Modula galleries.', 'modula-best-grid-gallery' ),
			),
			'modula-content-galleries'   => array(
				'name'        => __( 'Content Galleries', 'modula-best-grid-gallery' ),
				'description' => __( 'Create galleries directly from your WordPress content with automatic image extraction.', 'modula-best-grid-gallery' ),
			),
			'modula-defaults'            => array(
				'name'        => __( 'Presets', 'modula-best-grid-gallery' ),
				'description' => __( 'Set preset settings for all your galleries to save time and maintain consistency.', 'modula-best-grid-gallery' ),
			),
			'modula-roles'               => array(
				'name'        => __( 'Roles', 'modula-best-grid-gallery' ),
				'description' => __( 'Granular control over user roles and permissions for your Modula galleries.', 'modula-best-grid-gallery' ),
			),
			'modula-zoom'                => array(
				'name'        => __( 'Zoom', 'modula-best-grid-gallery' ),
				'description' => __( 'Add zoom functionality to your gallery images for detailed viewing and better user experience.', 'modula-best-grid-gallery' ),
			),
			'modula-exif'                => array(
				'name'        => __( 'EXIF', 'modula-best-grid-gallery' ),
				'description' => __( 'Display EXIF data from your images including camera settings, location, and more.', 'modula-best-grid-gallery' ),
			),
			'modula-watermark'           => array(
				'name'        => __( 'Watermark', 'modula-best-grid-gallery' ),
				'description' => __( 'Easily protect your photos by adding custom watermarks to your WordPress image galleries.', 'modula-best-grid-gallery' ),
			),
			'modula-deeplink'            => array(
				'name'        => __( 'Deep Link', 'modula-best-grid-gallery' ),
				'description' => __( 'Full SEO control over your galleries. Create a unique and indexable URL for each Modula Gallery item.', 'modula-best-grid-gallery' ),
			),
			'modula-pagination'          => array(
				'name'        => __( 'Pagination', 'modula-best-grid-gallery' ),
				'description' => __( 'Add pagination to your galleries to improve performance and organize large collections.', 'modula-best-grid-gallery' ),
			),
			'modula-whitelabel'          => array(
				'name'        => __( 'Whitelabel', 'modula-best-grid-gallery' ),
				'description' => __( 'Customize the Modula branding and interface to match your brand identity.', 'modula-best-grid-gallery' ),
			),
			'modula-image-proofing'      => array(
				'name'        => __( 'Image Proofing', 'modula-best-grid-gallery' ),
				'description' => __( 'Create photo proofing galleries with ease in your WordPress website.', 'modula-best-grid-gallery' ),
			),
			'modula-comments'            => array(
				'name'        => __( 'Comments', 'modula-best-grid-gallery' ),
				'description' => __( 'Allow your site users to comment on your gallery images.', 'modula-best-grid-gallery' ),
			),
			'modula-download'            => array(
				'name'        => __( 'Download', 'modula-best-grid-gallery' ),
				'description' => __( 'Allow visitors to download images from your galleries with customizable download options.', 'modula-best-grid-gallery' ),
			),
		);
	}
}
