<?php
/**
 * Listing Try the beta + Add New editor choice.
 *
 * @package Modula
 */

namespace Modula\V2\Admin;

defined( 'ABSPATH' ) || exit;

/**
 * Class Beta_Gallery_Admin
 */
class Beta_Gallery_Admin {

	public const QUERY_ARG = 'modula_editor';

	/**
	 * @return void
	 */
	public static function init() {
		if ( ! is_admin() ) {
			return;
		}

		add_action( 'admin_action_modula_try_beta_gallery', array( __CLASS__, 'handle_try_beta' ) );
		add_action( 'admin_action_modula_convert_to_beta_gallery', array( __CLASS__, 'handle_convert_to_beta' ) );
		add_action( 'admin_action_modula_gallery_editor_choice', array( __CLASS__, 'handle_editor_choice' ) );
		add_action( 'wp_insert_post', array( __CLASS__, 'apply_create_choice_on_insert' ), 10, 3 );
		add_action( 'current_screen', array( __CLASS__, 'apply_create_choice' ), 5 );
		add_filter( 'post_row_actions', array( __CLASS__, 'filter_row_actions' ), 11, 2 );
		add_filter( 'display_post_states', array( __CLASS__, 'filter_post_states' ), 10, 2 );
		add_filter( 'admin_body_class', array( __CLASS__, 'filter_body_class' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
		add_action( 'admin_footer', array( __CLASS__, 'render_create_modal' ) );
	}

	/**
	 * Duplicate a classic gallery as a Beta gallery.
	 *
	 * @param int $post_id Source gallery post ID.
	 * @return int|\WP_Error New gallery post ID.
	 */
	public static function duplicate_as_beta_gallery( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 ) {
			return new \WP_Error(
				'modula_try_beta_invalid',
				__( 'No gallery to duplicate has been supplied!', 'modula-best-grid-gallery' )
			);
		}

		if ( ! current_user_can( 'edit_post', $post_id ) || 'modula-gallery' !== get_post_type( $post_id ) ) {
			return new \WP_Error(
				'modula_try_beta_forbidden',
				__( 'You are not allowed to duplicate this gallery.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		if ( \Modula\V2\Beta_Settings::is_beta_gallery( $post_id ) ) {
			return new \WP_Error(
				'modula_try_beta_already_beta',
				__( 'This gallery already uses the new editor.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		$post = get_post( $post_id );
		if ( ! $post ) {
			return new \WP_Error(
				'modula_try_beta_not_found',
				__( 'Copy creation failed, could not find original:', 'modula-best-grid-gallery' ) . ' ' . (string) $post_id,
				array( 'status' => 404 )
			);
		}

		if ( ! function_exists( 'modula_duplicate_gallery_create_duplicate' ) ) {
			$functions = MODULA_PATH . 'includes/features/duplicator/modula-duplicator-functions.php';
			if ( file_exists( $functions ) ) {
				require_once $functions;
			}
		}

		if ( ! function_exists( 'modula_duplicate_gallery_create_duplicate' ) ) {
			return new \WP_Error(
				'modula_try_beta_unavailable',
				__( 'Gallery duplicator is not available.', 'modula-best-grid-gallery' ),
				array( 'status' => 500 )
			);
		}

		// ADR 0023: Try the beta copy is always draft so the experiment stays off the public site.
		$new_id = modula_duplicate_gallery_create_duplicate( $post, 'draft' );
		if ( ! $new_id || is_wp_error( $new_id ) ) {
			return new \WP_Error(
				'modula_try_beta_failed',
				__( 'Copy creation failed, could not find original:', 'modula-best-grid-gallery' ) . ' ' . (string) $post_id,
				array( 'status' => 500 )
			);
		}

		\Modula\V2\Beta_Settings::mark_as_beta_gallery( (int) $new_id );

		return (int) $new_id;
	}

	/**
	 * Duplicate a classic album as a Beta album and return the new post ID.
	 *
	 * @param int $post_id Source album post ID.
	 * @return int|\WP_Error New album post ID.
	 */
	public static function duplicate_as_beta_album( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 ) {
			return new \WP_Error(
				'modula_try_beta_invalid',
				__( 'No album to duplicate has been supplied!', 'modula-best-grid-gallery' )
			);
		}

		if ( ! current_user_can( 'edit_post', $post_id ) || 'modula-album' !== get_post_type( $post_id ) ) {
			return new \WP_Error(
				'modula_try_beta_forbidden',
				__( 'You are not allowed to duplicate this album.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		if ( \Modula\V2\Beta_Settings::is_beta_album( $post_id ) ) {
			return new \WP_Error(
				'modula_try_beta_already_beta',
				__( 'This album already uses the new editor.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		$post = get_post( $post_id );
		if ( ! $post ) {
			return new \WP_Error(
				'modula_try_beta_not_found',
				__( 'Copy creation failed, could not find original:', 'modula-best-grid-gallery' ) . ' ' . (string) $post_id,
				array( 'status' => 404 )
			);
		}

		if ( ! function_exists( 'modula_duplicate_gallery_create_duplicate' ) ) {
			$functions = MODULA_PATH . 'includes/features/duplicator/modula-duplicator-functions.php';
			if ( file_exists( $functions ) ) {
				require_once $functions;
			}
		}

		if ( ! function_exists( 'modula_duplicate_gallery_create_duplicate' ) ) {
			return new \WP_Error(
				'modula_try_beta_unavailable',
				__( 'Album duplicator is not available.', 'modula-best-grid-gallery' ),
				array( 'status' => 500 )
			);
		}

		// ADR 0023: Try the beta copy is always draft so the experiment stays off the public site.
		$new_id = modula_duplicate_gallery_create_duplicate( $post, 'draft' );
		if ( ! $new_id || is_wp_error( $new_id ) ) {
			return new \WP_Error(
				'modula_try_beta_failed',
				__( 'Copy creation failed, could not find original:', 'modula-best-grid-gallery' ) . ' ' . (string) $post_id,
				array( 'status' => 500 )
			);
		}

		\Modula\V2\Beta_Settings::mark_as_beta_album( (int) $new_id );

		return (int) $new_id;
	}

	/**
	 * Duplicate a classic gallery as a Beta gallery and open the gallery editor.
	 *
	 * @return void
	 */
	public static function handle_try_beta() {
		$post_id = isset( $_GET['post'] ) ? absint( wp_unslash( $_GET['post'] ) ) : 0;
		if ( ! $post_id ) {
			wp_die( esc_html__( 'No gallery to duplicate has been supplied!', 'modula-best-grid-gallery' ) );
		}

		check_admin_referer( 'try-beta-gallery_' . $post_id );

		$result = self::duplicate_as_beta_gallery( $post_id );
		if ( is_wp_error( $result ) ) {
			if ( 'modula_try_beta_already_beta' === $result->get_error_code() ) {
				wp_safe_redirect( admin_url( 'post.php?action=edit&post=' . $post_id ) );
				exit;
			}
			wp_die( esc_html( $result->get_error_message() ) );
		}

		wp_safe_redirect( admin_url( 'post.php?action=edit&post=' . $result ) );
		exit;
	}

	/**
	 * Mark a classic gallery as Beta in place.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return int|\WP_Error Same gallery post ID on success.
	 */
	public static function convert_to_beta_gallery( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 ) {
			return new \WP_Error(
				'modula_convert_beta_invalid',
				__( 'No gallery to convert has been supplied!', 'modula-best-grid-gallery' )
			);
		}

		if ( ! current_user_can( 'edit_post', $post_id ) || 'modula-gallery' !== get_post_type( $post_id ) ) {
			return new \WP_Error(
				'modula_convert_beta_forbidden',
				__( 'You are not allowed to convert this gallery.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		if ( \Modula\V2\Beta_Settings::is_beta_gallery( $post_id ) ) {
			return new \WP_Error(
				'modula_convert_beta_already_beta',
				__( 'This gallery already uses the new editor.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		\Modula\V2\Beta_Settings::write_classic_settings_backup( $post_id );
		\Modula\V2\Beta_Settings::mark_as_beta_gallery( $post_id );

		return (int) $post_id;
	}

	/**
	 * Restore classic editor settings from the Convert backup and clear Beta.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return int|\WP_Error Same gallery post ID on success.
	 */
	public static function restore_classic_editor_gallery( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 ) {
			return new \WP_Error(
				'modula_restore_classic_invalid',
				__( 'No gallery to restore has been supplied!', 'modula-best-grid-gallery' )
			);
		}

		if ( ! current_user_can( 'edit_post', $post_id ) || 'modula-gallery' !== get_post_type( $post_id ) ) {
			return new \WP_Error(
				'modula_restore_classic_forbidden',
				__( 'You are not allowed to restore this gallery.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		if ( ! \Modula\V2\Beta_Settings::is_beta_gallery( $post_id ) ) {
			return new \WP_Error(
				'modula_restore_classic_not_beta',
				__( 'This gallery does not use the new editor.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		if ( ! \Modula\V2\Beta_Settings::has_classic_settings_backup( $post_id ) ) {
			return new \WP_Error(
				'modula_restore_classic_no_backup',
				__( 'No classic settings backup is available for this gallery.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		if ( ! \Modula\V2\Beta_Settings::restore_classic_settings_from_backup( $post_id ) ) {
			return new \WP_Error(
				'modula_restore_classic_failed',
				__( 'Could not restore classic editor settings.', 'modula-best-grid-gallery' ),
				array( 'status' => 500 )
			);
		}

		return (int) $post_id;
	}

	/**
	 * Mark a classic album as Beta in place.
	 *
	 * @param int $post_id Album post ID.
	 * @return int|\WP_Error Same album post ID on success.
	 */
	public static function convert_to_beta_album( $post_id ) {
		$post_id = absint( $post_id );
		if ( $post_id < 1 ) {
			return new \WP_Error(
				'modula_convert_beta_invalid',
				__( 'No album to convert has been supplied!', 'modula-best-grid-gallery' )
			);
		}

		if ( ! current_user_can( 'edit_post', $post_id ) || 'modula-album' !== get_post_type( $post_id ) ) {
			return new \WP_Error(
				'modula_convert_beta_forbidden',
				__( 'You are not allowed to convert this album.', 'modula-best-grid-gallery' ),
				array( 'status' => 403 )
			);
		}

		if ( \Modula\V2\Beta_Settings::is_beta_album( $post_id ) ) {
			return new \WP_Error(
				'modula_convert_beta_already_beta',
				__( 'This album already uses the new editor.', 'modula-best-grid-gallery' ),
				array( 'status' => 400 )
			);
		}

		\Modula\V2\Beta_Settings::mark_as_beta_album( $post_id );

		return (int) $post_id;
	}

	/**
	 * Mark a classic gallery as Beta in place and open the gallery editor.
	 *
	 * @return void
	 */
	public static function handle_convert_to_beta() {
		$post_id = isset( $_GET['post'] ) ? absint( wp_unslash( $_GET['post'] ) ) : 0;
		if ( ! $post_id ) {
			wp_die( esc_html__( 'No gallery to convert has been supplied!', 'modula-best-grid-gallery' ) );
		}

		check_admin_referer( 'convert-to-beta-gallery_' . $post_id );

		$result = self::convert_to_beta_gallery( $post_id );
		if ( is_wp_error( $result ) ) {
			if ( 'modula_convert_beta_already_beta' === $result->get_error_code() ) {
				wp_safe_redirect( admin_url( 'post.php?action=edit&post=' . $post_id ) );
				exit;
			}
			wp_die( esc_html( $result->get_error_message() ) );
		}

		wp_safe_redirect( admin_url( 'post.php?action=edit&post=' . $result ) );
		exit;
	}

	/**
	 * Bookmark / in-place Add New: apply choice to the auto-draft and open the right editor.
	 *
	 * @return void
	 */
	public static function handle_editor_choice() {
		$post_id = isset( $_GET['post'] ) ? absint( wp_unslash( $_GET['post'] ) ) : 0;
		$choice  = isset( $_GET['choice'] ) ? sanitize_key( wp_unslash( $_GET['choice'] ) ) : '';

		check_admin_referer( 'modula-gallery-editor-choice_' . $post_id );

		if ( ! $post_id || ! current_user_can( 'edit_post', $post_id ) ) {
			wp_die( esc_html__( 'You are not allowed to create this item.', 'modula-best-grid-gallery' ) );
		}

		$type = get_post_type( $post_id );
		if ( 'modula-album' === $type ) {
			if ( 'beta' === $choice ) {
				\Modula\V2\Beta_Settings::mark_as_beta_album( $post_id );
			}
		} elseif ( 'modula-gallery' === $type ) {
			if ( 'beta' === $choice ) {
				\Modula\V2\Beta_Settings::mark_as_beta_gallery( $post_id );
			}
		} else {
			wp_die( esc_html__( 'You are not allowed to create this item.', 'modula-best-grid-gallery' ) );
		}

		wp_safe_redirect( admin_url( 'post.php?action=edit&post=' . $post_id ) );
		exit;
	}

	/**
	 * Consume listing create-choice query args when post-new.php inserts the auto-draft.
	 *
	 * WordPress 7.1 fires `current_screen` in admin.php before `get_default_post_to_edit()`,
	 * and admin-header.php skips a second `set_current_screen()` when the screen is already set.
	 * The insert action is the first moment the auto-draft ID exists.
	 *
	 * @param int               $post_id Post ID.
	 * @param \WP_Post|object|null $post    Inserted post.
	 * @param bool              $update  Whether this is an existing post being updated.
	 * @return void
	 */
	public static function apply_create_choice_on_insert( $post_id, $post = null, $update = false ) {
		if ( $update ) {
			return;
		}
		self::apply_create_choice_to_post( $post );
	}

	/**
	 * Apply listing create-choice query args onto a gallery or album auto-draft.
	 *
	 * @param \WP_Post|object|null $post Post just created.
	 * @return void
	 */
	public static function apply_create_choice_to_post( $post ) {
		if ( ! $post || empty( $post->ID ) ) {
			return;
		}

		$post_id  = (int) $post->ID;
		$type     = isset( $post->post_type ) ? (string) $post->post_type : get_post_type( $post_id );
		$is_album = ( 'modula-album' === $type );
		if ( 'modula-gallery' !== $type && ! $is_album ) {
			return;
		}

		$nonce_action = $is_album ? 'modula-album-create-choice' : 'modula-gallery-create-choice';
		if ( ! isset( $_GET['_wpnonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ), $nonce_action ) ) {
			return;
		}

		$choice = isset( $_GET[ self::QUERY_ARG ] ) ? sanitize_key( wp_unslash( $_GET[ self::QUERY_ARG ] ) ) : '';
		if ( 'beta' !== $choice ) {
			return;
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		if ( $is_album ) {
			\Modula\V2\Beta_Settings::mark_as_beta_album( $post_id );
			return;
		}

		\Modula\V2\Beta_Settings::mark_as_beta_gallery( $post_id );
	}

	/**
	 * Consume one-shot query arg from the listing modal onto the auto-draft.
	 *
	 * On WordPress 7.1 this is a no-op: `$post` is not created yet. Kept for
	 * older admin.php / admin-header.php order where current_screen runs again
	 * after get_default_post_to_edit().
	 *
	 * @param \WP_Screen $screen Current screen.
	 * @return void
	 */
	public static function apply_create_choice( $screen ) {
		if ( ! $screen instanceof \WP_Screen ) {
			return;
		}
		if ( 'post' !== $screen->base || 'add' !== $screen->action ) {
			return;
		}
		if ( 'modula-gallery' !== $screen->post_type && 'modula-album' !== $screen->post_type ) {
			return;
		}

		global $post;
		if ( ! $post || empty( $post->ID ) || $screen->post_type !== $post->post_type ) {
			return;
		}

		self::apply_create_choice_to_post( $post );
	}

	/**
	 * @param string $classes Body classes.
	 * @return string
	 */
	public static function filter_body_class( $classes ) {
		if ( self::is_awaiting_editor_choice() ) {
			$classes .= ' modula-awaiting-editor-choice';
		}
		return $classes;
	}

	/**
	 * post-new.php without a choice: block both editors (gallery or album).
	 *
	 * @return bool
	 */
	public static function is_awaiting_editor_choice() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'post' !== $screen->base || 'add' !== $screen->action ) {
			return false;
		}
		if ( 'modula-gallery' !== $screen->post_type && 'modula-album' !== $screen->post_type ) {
			return false;
		}

		$is_album = ( 'modula-album' === $screen->post_type );
		if ( $is_album ) {
			if ( \Modula\V2\Beta_Settings::is_beta_album( \Modula\V2\Beta_Settings::current_album_id() ) ) {
				return false;
			}
			$nonce_action = 'modula-album-create-choice';
		} else {
			if ( \Modula\V2\Beta_Settings::is_beta_gallery( \Modula\V2\Beta_Settings::current_gallery_id() ) ) {
				return false;
			}
			$nonce_action = 'modula-gallery-create-choice';
		}

		$choice = isset( $_GET[ self::QUERY_ARG ] ) ? sanitize_key( wp_unslash( $_GET[ self::QUERY_ARG ] ) ) : '';
		$nonce  = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ) : '';
		if ( ! $nonce || ! wp_verify_nonce( $nonce, $nonce_action ) ) {
			return true;
		}
		return 'classic' !== $choice && 'beta' !== $choice;
	}

	/**
	 * @param string $hook_suffix Current admin hook.
	 * @return void
	 */
	public static function enqueue( $hook_suffix ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen ) {
			return;
		}
		if ( 'modula-gallery' !== $screen->post_type && 'modula-album' !== $screen->post_type ) {
			return;
		}

		$on_list = ( 'edit.php' === $hook_suffix && 'modula-gallery' === $screen->post_type );
		$on_new  = ( 'post-new.php' === $hook_suffix );
		if ( ! $on_list && ! $on_new ) {
			return;
		}

		wp_enqueue_style(
			'modula-beta-gallery',
			MODULA_URL . 'assets/css/admin/modula-beta-gallery.css',
			array(),
			MODULA_LITE_VERSION
		);

		wp_enqueue_script(
			'modula-beta-gallery-create',
			MODULA_URL . 'assets/js/admin/modula-beta-gallery-create.js',
			array(),
			MODULA_LITE_VERSION,
			true
		);

		$is_album   = ( 'modula-album' === $screen->post_type );
		$post_id    = $is_album
			? \Modula\V2\Beta_Settings::current_album_id()
			: \Modula\V2\Beta_Settings::current_gallery_id();
		$choice_url = '';
		if ( $post_id ) {
			$choice_url = add_query_arg(
				array(
					'action'   => 'modula_gallery_editor_choice',
					'post'     => $post_id,
					'_wpnonce' => wp_create_nonce( 'modula-gallery-editor-choice_' . $post_id ),
				),
				admin_url( 'admin.php' )
			);
		}
		wp_localize_script(
			'modula-beta-gallery-create',
			'modulaBetaGalleryCreate',
			array(
				'awaitingChoice' => self::is_awaiting_editor_choice(),
				'listUrl'        => \Modula\V2\Rest\Listing_Controller::admin_url(),
				'postNewBase'    => admin_url(
					$is_album
						? 'post-new.php?post_type=modula-album'
						: 'post-new.php?post_type=modula-gallery'
				),
				'queryArg'       => self::QUERY_ARG,
				'createNonce'    => wp_create_nonce(
					$is_album ? 'modula-album-create-choice' : 'modula-gallery-create-choice'
				),
				'choiceUrl'      => $choice_url,
				'convertConfirm' => $is_album
					? __( 'Convert this album to the new editor? Its shortcode and URL stay the same.', 'modula-best-grid-gallery' )
					: __( 'Convert this gallery to the new editor? Its shortcode and URL stay the same.', 'modula-best-grid-gallery' ),
			)
		);
	}

	/**
	 * @return void
	 */
	public static function render_create_modal() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'modula-gallery' !== $screen->post_type ) {
			return;
		}
		if ( 'edit' !== $screen->base && 'post' !== $screen->base ) {
			return;
		}
		?>
		<div id="modula-beta-create-modal" class="modula-beta-create-modal" hidden>
			<div class="modula-beta-create-modal__backdrop" data-modula-beta-dismiss></div>
			<div class="modula-beta-create-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="modula-beta-create-modal-title">
				<h2 id="modula-beta-create-modal-title"><?php esc_html_e( 'Choose an editor', 'modula-best-grid-gallery' ); ?></h2>
				<p><?php esc_html_e( 'Use the new editor for the modern gallery experience, or the classic editor.', 'modula-best-grid-gallery' ); ?></p>
				<p class="modula-beta-create-modal__actions">
					<button type="button" class="button button-primary" data-modula-beta-choice="beta"><?php esc_html_e( 'Use the new editor', 'modula-best-grid-gallery' ); ?></button>
					<button type="button" class="button" data-modula-beta-choice="classic"><?php esc_html_e( 'Use the classic editor', 'modula-best-grid-gallery' ); ?></button>
				</p>
			</div>
		</div>
		<?php
	}

	/**
	 * Always-visible control next to the gallery title (same place as Draft / Password protected).
	 *
	 * @param array<string, string> $post_states States after the title.
	 * @param \WP_Post              $post        Current post.
	 * @return array<string, string>
	 */
	public static function filter_post_states( $post_states, $post ) {
		if ( ! $post instanceof \WP_Post || 'modula-gallery' !== $post->post_type ) {
			return $post_states;
		}

		if ( \Modula\V2\Beta_Settings::is_beta_gallery( $post->ID ) ) {
			$post_states['modula_beta'] = '<span class="modula-beta-badge">' . esc_html__( 'Beta', 'modula-best-grid-gallery' ) . '</span>';
			return $post_states;
		}

		if ( current_user_can( 'edit_post', $post->ID ) ) {
			$post_states['try_beta_modula'] = self::try_beta_link_html( $post->ID, 'button button-small modula-try-beta' );
		}

		return $post_states;
	}

	/**
	 * Hover row action on classic galleries (same control as the Beta column).
	 *
	 * @param array<string, string> $actions Row actions.
	 * @param \WP_Post              $post    Current post.
	 * @return array<string, string>
	 */
	public static function filter_row_actions( $actions, $post ) {
		if ( ! $post instanceof \WP_Post || 'modula-gallery' !== $post->post_type ) {
			return $actions;
		}
		if ( ! current_user_can( 'edit_post', $post->ID ) ) {
			return $actions;
		}
		if ( \Modula\V2\Beta_Settings::is_beta_gallery( $post->ID ) ) {
			return $actions;
		}

		$link = self::try_beta_link_html( $post->ID );

		if ( isset( $actions['duplicate_modula'] ) ) {
			$out = array();
			foreach ( $actions as $key => $html ) {
				$out[ $key ] = $html;
				if ( 'duplicate_modula' === $key ) {
					$out['try_beta_modula'] = $link;
				}
			}
			return $out;
		}

		$actions['try_beta_modula'] = $link;
		return $actions;
	}

	/**
	 * Anchored Try the beta control.
	 *
	 * @param int    $post_id Gallery post ID.
	 * @param string $class   Optional extra class attribute.
	 * @return string
	 */
	private static function try_beta_link_html( $post_id, $class = '' ) {
		$class_attr = '' !== $class ? ' class="' . esc_attr( $class ) . '"' : '';
		return '<a href="' . esc_url( self::try_beta_url( $post_id ) ) . '"' . $class_attr . '>' . esc_html__( 'Try the beta', 'modula-best-grid-gallery' ) . '</a>';
	}

	/**
	 * Try the beta URL for a listing row.
	 *
	 * @param int $post_id Gallery post ID.
	 * @return string
	 */
	public static function try_beta_url( $post_id ) {
		$post_id = absint( $post_id );
		return wp_nonce_url(
			admin_url( 'admin.php?action=modula_try_beta_gallery&post=' . $post_id ),
			'try-beta-gallery_' . $post_id
		);
	}

	/**
	 * Convert to beta URL for a listing row (in-place, same post ID).
	 *
	 * @param int $post_id Gallery post ID.
	 * @return string
	 */
	public static function convert_to_beta_url( $post_id ) {
		$post_id = absint( $post_id );
		return wp_nonce_url(
			admin_url( 'admin.php?action=modula_convert_to_beta_gallery&post=' . $post_id ),
			'convert-to-beta-gallery_' . $post_id
		);
	}
}
