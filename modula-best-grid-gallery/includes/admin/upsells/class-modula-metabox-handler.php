<?php
/**
 * Handles upsells for metaboxes in the gallery editor
 *
 * @since 2.13.0
 */
class Modula_Metabox_Handler extends Modula_Upsell_Base {

	/**
	 * Constructor
	 */
	public function __construct() {
		parent::__construct();
		$this->register_metaboxes();
	}

	/**
	 * Register metabox hooks
	 */
	private function register_metaboxes() {
		if ( $this->extensions->is_upgradable_addon( 'modula-albums' ) ) {
			add_filter( 'modula_cpt_metaboxes', array( $this, 'albums_upsell_meta' ) );
		}

		/* Fire our meta box setup function on the post editor screen. */
		add_action( 'load-post.php', array( $this, 'meta_boxes_setup' ) );
		add_action( 'load-post-new.php', array( $this, 'meta_boxes_setup' ) );
	}

	/**
	 * Setup meta boxes
	 */
	public function meta_boxes_setup() {
		/* Add meta boxes on the 'add_meta_boxes' hook. */
		add_action( 'add_meta_boxes', array( $this, 'add_meta_boxes' ), 10 );
	}

	/**
	 * Add meta boxes
	 */
	public function add_meta_boxes() {
		if ( ! $this->extensions->is_upgradable_addon( 'modula' ) ) {
			return;
		}

		add_meta_box(
			'modula-sorting-upsell',                                        // Unique ID
			esc_html__( 'Gallery sorting', 'modula-best-grid-gallery' ),    // Title
			array( $this, 'output_sorting_upsell' ),                        // Callback function
			'modula-gallery',                                               // Admin page (or post type)
			'side',                                                         // Context
			'default'         // Priority
		);
	}

	/**
	 * Output sorting upsell metabox
	 */
	public function output_sorting_upsell() {
		?>
		<div class="modula-upsells-carousel-wrapper">
			<div class="modula-upsells-carousel">
				<div class="modula-upsell modula-upsell-item">
					<p class="modula-upsell-description"><?php esc_html_e( 'Upgrade to Modula Premium today to get access to 7 sorting options.', 'modula-best-grid-gallery' ); ?></p>
					<ul class="modula-upsells-list">
						<li>Date created - newest first</li>
						<li>Date created - oldest first</li>
						<li>Date modified - most recent first</li>
						<li>Date modified - most recent last</li>
						<li>Title alphabetically</li>
						<li>Title reverse</li>
						<li>Random</li>
					</ul>
					<p>
						<?php

						$buttons  = '<a target="_blank" href="' . esc_url( $this->free_vs_pro_link ) . '" class="button">' . esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ) . '</a>';
						$buttons .= '<a target="_blank" href="https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=sorting-metabox&utm_campaign=modula-sorting" style="margin-top:10px;" class="button-primary button">' . esc_html__( 'Get Premium!', 'modula-best-grid-gallery' ) . '</a>';

						echo apply_filters( 'modula_upsell_buttons', $buttons, 'modula-pro' );

						?>
					</p>
				</div>
			</div>
		</div>
		<?php
	}

	/**
	 * Add Albums Upsell Metabox
	 *
	 * @param array $met Metaboxes array.
	 * @return array Modified metaboxes array.
	 * @since 2.2.7
	 */
	public function albums_upsell_meta( $met ) {
		if ( ! $this->extensions->is_upgradable_addon( 'modula-albums' ) ) {
			return $met;
		}

		$met['modula-albums-upsell'] = array(
			'title'    => esc_html__( 'Modula Albums', 'modula-best-grid-gallery' ),
			'callback' => 'output_upsell_albums',
			'context'  => 'normal',
			'priority' => 5,
		);

		return $met;
	}
}
