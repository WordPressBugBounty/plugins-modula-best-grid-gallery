<?php
$settings = array(
	'classes'     => '',
	'dismissible' => true,
	'id'          => 'modula-modal-bound-gallery-upgrade',
);
?>
<div class='modula-modal__overlay bound-gallery'>
	<div class="modula-modal__frame <?php echo esc_attr( $settings['classes'] ); ?>" 
												<?php
												if ( $settings['dismissible'] ) :
													?>
		data-modula-modal-dismissible data-modula-modal-id="<?php echo esc_attr( $settings['id'] ); ?>"<?php endif; ?>>
		<div class="modula-modal__header">
			<button class="modula-modal__dismiss">
				<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
					<path d="M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.5 6.7 1 1 6.5-6.6 6.5 6.6 1-1z"></path>
				</svg>
			</button>
		</div>
		<div class="modula-modal__body">
			<div class="modula-upsells-carousel-wrapper-modal">
				<div class="modula-upsells-carousel-modal">
					<div class="modula-upsell-modal modula-upsell-item-modal">
						<h2>
							<?php
							esc_html_e( 'Bound gallery', 'modula-best-grid-gallery' );
							?>
						</h2>
						<h4 class="modula-upsell-description-modal">
							<?php
							esc_html_e( 'Upgrade to Modula Pro to create a Beta gallery bound to a media folder or a remote prefix. Start from those files and edit the gallery with Modula’s settings and layout tools.', 'modula-best-grid-gallery' );
							?>
						</h4>
						<ul class="modula-upsells-list-modal">
							<li>
								<?php
								esc_html_e( 'Create a gallery from a media folder or a remote prefix in one click.', 'modula-best-grid-gallery' );
								?>
							</li>
							<li>
								<?php
								esc_html_e( 'Open the gallery editor with the folder’s images ready to arrange.', 'modula-best-grid-gallery' );
								?>
							</li>
							<li>
								<?php
								esc_html_e( 'Premium support.', 'modula-best-grid-gallery' );
								?>
							</li>
						</ul>
						<div class="modula-upsell-modal-buttons-wrap">
							<?php
							$buttons  = '<a target="_blank" href="https://wp-modula.com/free-vs-pro/?utm_source=modula-lite&utm_medium=link&utm_campaign=upsell&utm_term=lite-vs-pro"  class="button">' . esc_html__( 'Free vs Premium', 'modula-best-grid-gallery' ) . '</a>';
							$buttons .= '<a target="_blank" href="https://wp-modula.com/pricing/?utm_source=upsell&utm_medium=popup&utm_campaign=bound-gallery" class="button-primary button">' . esc_html__( 'Get Premium!', 'modula-best-grid-gallery' ) . '</a>';

							echo wp_kses_post( apply_filters( 'modula_upsell_buttons', $buttons, 'bound_gallery' ) );
							?>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
