<?php
// Exit if accessed directly.
if (! defined('ABSPATH')) {
	exit;
}
/**
 * Class Modula_Gallery_Upload
 *
 * Handles the fast gallery creation from uploaded .zip file
 * or from a choosen folder with images that reside on the server
 *
 * @since 2.11.0
 */

class Modula_Gallery_Upload
{


	/**
	 * Holds the class object.
	 *
	 * @var Modula_Gallery_Upload
	 *
	 * @since 2.11.0
	 */
	public static $instance = null;

	/**
	 * Defines the default directory for the media browser.
	 *
	 * @var string
	 */
	public $default_dir = null;

	/**
	 * Holds the uploaded error files.
	 *
	 * @var array
	 *
	 * @since 2.11.0
	 */
	public $uploaded_error_files = array();

	/**
	 * Holds the uploaded files meta key.
	 *
	 * @var string
	 *
	 * @since 2.11.0
	 */
	public $uploaded_error_files_meta = 'modula_uploaded_error_files';

	/**
	 * Class constructor.
	 *
	 * @since 2.11.0
	 */
	private function __construct()
	{
		// Set the default directory for the media browser.
		add_action('admin_init', array($this, 'set_default_browser_dir'), 15);
		// Add the Browser button.
		add_action('modula_gallery_media_select_option', array($this, 'add_folder_browser_button'), 20);
		// Create the media browser.
		add_action('media_upload_modula_file_browser', array($this, 'media_browser'));
		// Folder/ZIP import API: Modula\V2\Rest\Gallery_Upload_Controller (REST only).
		add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
		add_action('modula_gallery_media_select_option', array($this, 'add_upload_zip_button'), 40);
		add_filter('upload_dir', array($this, 'zip_upload_dir'));
	}

	/**
	 * Create an instance of the class
	 *
	 * @return Modula_Gallery_Upload
	 *
	 * @since 2.11.0
	 */
	public static function get_instance()
	{

		if (! isset(self::$instance) && ! (self::$instance instanceof Modula_Gallery_Upload)) {
			self::$instance = new Modula_Gallery_Upload();
		}

		return self::$instance;
	}

	/**
	 * Check if the user has the rights to upload files.
	 *
	 * @return bool
	 *
	 * @since 2.11.0
	 */
	public function check_user_upload_rights()
	{
		// Include the pluggable file if it's not already included. Seems to be a problem
		// when checking the current user capabilities.
		if (! function_exists('wp_get_current_user')) {
			include_once ABSPATH . 'wp-includes/pluggable.php';
		}
		// Check if the user has the rights to upload files and edit posts.
		if (! current_user_can('upload_files') || ! current_user_can('edit_posts')) {
			return false;
		}

		return true;
	}

	/**
	 * Normalize paths parameter from JSON POST / REST (string, JSON array string, or array).
	 *
	 * @param mixed $paths Raw paths.
	 * @return array
	 */
	private function normalize_paths_input($paths)
	{
		if (is_array($paths)) {
			return array_map('sanitize_text_field', wp_unslash($paths));
		}
		if (is_string($paths)) {
			$decoded = json_decode(wp_unslash($paths), true);
			if (is_array($decoded)) {
				return array_map('sanitize_text_field', $decoded);
			}
			$one = sanitize_text_field(wp_unslash($paths));
			return '' !== $one ? array($one) : array();
		}
		return array();
	}

	/**
	 * REST: child folders for the folder browser (replaces ajax_list_folders).
	 *
	 * @param string $path Server path.
	 * @param bool   $input_checked Checkbox state for new rows.
	 * @return array|\WP_Error List of item arrays or error.
	 */
	public function rest_list_folder_items($path, $input_checked)
	{
		if (! $this->check_user_upload_rights()) {
			return new \WP_Error(
				'modula_forbidden',
				__('You do not have the rights to upload files.', 'modula-best-grid-gallery'),
				array('status' => 403)
			);
		}
		$path = is_string($path) ? sanitize_text_field(wp_unslash($path)) : '';
		if ('' === $path) {
			return new \WP_Error(
				'modula_no_path',
				__('No path was provided.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}
		$files = $this->list_folders($path);
		if (false === $files || ! is_array($files)) {
			return array();
		}
		$items = array();
		foreach ($files as $found_file) {
			$file      = $this->mb_pathinfo($found_file['path']);
			$value     = trailingslashit($file['dirname']) . $file['basename'];
			$items[]   = array(
				'value'     => $value,
				'basename'  => $file['basename'],
				'data_path' => $value,
				'checked'   => (bool) $input_checked,
			);
		}
		return $items;
	}

	/**
	 * REST: validate folder paths (replaces ajax_check_paths).
	 *
	 * @param int   $gallery_id Gallery post ID.
	 * @param mixed $paths Raw paths.
	 * @return array|\WP_Error Valid folder paths.
	 */
	public function rest_check_paths($gallery_id, $paths)
	{
		if (! $this->check_user_upload_rights()) {
			return new \WP_Error(
				'modula_forbidden',
				__('You do not have the rights to upload files.', 'modula-best-grid-gallery'),
				array('status' => 403)
			);
		}
		$gallery_id = absint($gallery_id);
		$this->uploaded_error_files = $this->get_uploaded_error_files($gallery_id);
		$path_list                   = $this->normalize_paths_input($paths);
		$folders                     = array();
		foreach ($path_list as $path) {
			if ($this->check_folder($path)) {
				$folders[] = $path;
			} else {
				$this->uploaded_error_files['folders'][] = $path;
			}
		}
		$prev_uploaded_files = $this->get_uploaded_error_files($gallery_id);
		$uploaded_files      = array_merge($prev_uploaded_files, $this->uploaded_error_files);
		$this->update_uploaded_error_files($gallery_id, $uploaded_files);
		if (empty($folders)) {
			return new \WP_Error(
				'modula_no_valid_paths',
				__('No valid paths were provided.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}
		return $folders;
	}

	/**
	 * REST: list image files under paths (replaces ajax_check_files).
	 *
	 * @param mixed $paths Raw paths.
	 * @return array|\WP_Error File paths.
	 */
	public function rest_check_files($paths)
	{
		if (! $this->check_user_upload_rights()) {
			return new \WP_Error(
				'modula_forbidden',
				__('You do not have the rights to upload files.', 'modula-best-grid-gallery'),
				array('status' => 403)
			);
		}
		$path_list = $this->normalize_paths_input($paths);
		if (empty($path_list)) {
			return new \WP_Error(
				'modula_no_paths',
				__('No paths were provided.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}
		$files = array();
		foreach ($path_list as $path) {
			$files = array_merge($files, $this->get_files($path));
		}
		if (empty($files)) {
			return new \WP_Error(
				'modula_no_files',
				__('No valid files were provided.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}
		return $files;
	}

	/**
	 * REST: import one file into the media library (replaces ajax_import_file).
	 *
	 * @param int    $gallery_id Gallery ID (for error meta).
	 * @param string $file Server file path.
	 * @param bool   $delete_file Sideload behavior.
	 * @return int|\WP_Error Attachment ID.
	 */
	public function rest_import_file($gallery_id, $file, $delete_file)
	{
		if (! $this->check_user_upload_rights()) {
			return new \WP_Error(
				'modula_forbidden',
				__('You do not have the rights to upload files.', 'modula-best-grid-gallery'),
				array('status' => 403)
			);
		}
		$file = is_string($file) ? wp_unslash($file) : '';
		if ('' === $file) {
			return new \WP_Error(
				'modula_no_file',
				__('No files were provided.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}
		$real_path    = realpath($file);
		$uploads_dir  = wp_upload_dir();
		$allowed_base = realpath($uploads_dir['basedir']);

		if (false === $real_path || false === $allowed_base || 0 !== strpos($real_path, $allowed_base)) {
			return new \WP_Error(
				'modula_invalid_path',
				__('Invalid file path.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}

		if (! file_exists($real_path) || ! is_readable($real_path)) {
			return new \WP_Error(
				'modula_unreadable',
				__('File does not exist or is not readable.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}

		$gallery_id    = absint($gallery_id);
		$attachment_id = $this->upload_image($real_path, (bool) $delete_file);
		if (! $attachment_id) {
			if ($gallery_id > 0) {
				$prev_uploaded_files       = $this->get_uploaded_error_files($gallery_id);
				$uploaded_files['files'][] = $file;
				$this->update_uploaded_error_files($gallery_id, array_merge($prev_uploaded_files, $uploaded_files));
			}
			return new \WP_Error(
				'modula_import_failed',
				__('The file could not be uploaded.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}

		return (int) $attachment_id;
	}

	/**
	 * Gallery layout type string (e.g. custom-grid) from v2 grouped settings or flat modula-settings.
	 *
	 * @param int $gallery_id Gallery post ID.
	 * @return string
	 */
	private function get_gallery_layout_type_string($gallery_id)
	{
		$gallery_id = absint($gallery_id);
		if (! $gallery_id) {
			return '';
		}
		if (class_exists('\Modula\V2\Meta_Sync', false)) {
			$v2 = \Modula\V2\Meta_Sync::get_settings_v2($gallery_id);
			if (is_array($v2) && isset($v2['general']['type']) && is_string($v2['general']['type'])) {
				return $v2['general']['type'];
			}
		}
		$flat = get_post_meta($gallery_id, 'modula-settings', true);
		if (is_array($flat) && isset($flat['type'])) {
			return (string) $flat['type'];
		}
		return '';
	}

	/**
	 * Column count (1–12) for grid-like layouts: v2 layout.gridType or flat columns.
	 *
	 * @param int $gallery_id Gallery post ID.
	 * @return int
	 */
	private function get_gallery_grid_column_count($gallery_id)
	{
		$gallery_id = absint($gallery_id);
		if (! $gallery_id) {
			return 12;
		}
		if (class_exists('\Modula\V2\Meta_Sync', false)) {
			$v2 = \Modula\V2\Meta_Sync::get_settings_v2($gallery_id);
			if (is_array($v2) && isset($v2['layout']['gridType'])) {
				$c = absint($v2['layout']['gridType']);
				if ($c >= 1 && $c <= 12) {
					return $c;
				}
			}
		}
		$flat = get_post_meta($gallery_id, 'modula-settings', true);
		if (is_array($flat) && isset($flat['columns'])) {
			$c = absint($flat['columns']);
			if ($c >= 1 && $c <= 12) {
				return $c;
			}
		}
		return 12;
	}

	/**
	 * Enlarge custom-grid spans (preserving w:h) so the smaller side is at least $min_side units, within column/row caps.
	 *
	 * @param int $w         Width in grid units.
	 * @param int $h         Height in grid units.
	 * @param int $columns   Max tile width.
	 * @param int $min_side  Minimum span on the shorter side (default 3 — readable on canvas).
	 * @param int $max_h     Max tile height in rows.
	 * @return int[] { width, height }.
	 */
	private function scale_custom_grid_spans_to_minimum_floor($w, $h, $columns, $min_side = 3, $max_h = 8)
	{
		$columns  = max(1, min(12, absint($columns)));
		$min_side = max(1, absint($min_side));
		$max_h    = max(1, absint($max_h));
		$w        = max(1, absint($w));
		$h        = max(1, absint($h));

		if (min($w, $h) >= $min_side) {
			return array(
				min($columns, $w),
				min($max_h, $h),
			);
		}

		$k_max = min(
			$w > 0 ? (int) floor($columns / $w) : 1,
			$h > 0 ? (int) floor($max_h / $h) : 1
		);
		$k_max = max(1, $k_max);
		$k     = 1;
		for ($try = 1; $try <= $k_max; $try++) {
			if (min($w * $try, $h * $try) >= $min_side) {
				$k = $try;
				break;
			}
		}
		$w = min($columns, $w * $k);
		$h = min($max_h, $h * $k);

		// e.g. full-width strip with h=2 cannot scale horizontally; grow height until readable.
		while ($h < $max_h && min($w, $h) < $min_side) {
			++$h;
		}
		if (min($w, $h) < $min_side && $w < $columns) {
			$w = min($columns, max($w, $min_side));
		}

		return array(
			max(1, min($columns, $w)),
			max(1, min($max_h, $h)),
		);
	}

	/**
	 * Map image pixel aspect ratio to custom-grid spans (w × h), assuming ~square cells in the editor.
	 *
	 * @param int $img_w     Attachment width in px.
	 * @param int $img_h     Attachment height in px.
	 * @param int $columns   Max tile width in grid units.
	 * @return int[] { width, height }.
	 */
	private function custom_grid_tile_spans_from_pixel_ratio($img_w, $img_h, $columns)
	{
		$columns = max(1, min(12, absint($columns)));
		$img_w   = absint($img_w);
		$img_h   = absint($img_h);
		if ($img_w < 1 || $img_h < 1) {
			return array(3, 3);
		}
		$r        = $img_w / $img_h;
		$best_w   = 3;
		$best_h   = 3;
		$best_err = abs(($best_w / $best_h) - $r) / $r;
		// Start at h=2: h=1 yields one-row slivers that read tiny in the editor preview.
		for ($h = 2; $h <= 8; $h++) {
			$w = (int) round($r * $h);
			$w = max(1, min($columns, $w));
			$got = $w / $h;
			$err = abs($got - $r) / $r;
			if ($err < $best_err) {
				$best_err = $err;
				$best_w   = $w;
				$best_h   = $h;
			}
		}
		$w = max(1, min($columns, $best_w));
		$h = max(1, $best_h);

		return $this->scale_custom_grid_spans_to_minimum_floor($w, $h, $columns, 3, 8);
	}

	/**
	 * Default data-width / data-height grid units for a new image when the gallery is custom-grid.
	 *
	 * @param int $gallery_id Gallery post ID.
	 * @param int $image_id   Attachment ID.
	 * @return int[] { width, height }.
	 */
	private function get_default_tile_spans_for_new_image($gallery_id, $image_id)
	{
		if ('custom-grid' !== $this->get_gallery_layout_type_string($gallery_id)) {
			return array(2, 2);
		}
		$meta = wp_get_attachment_metadata($image_id);
		if (! is_array($meta) || empty($meta['width']) || empty($meta['height'])) {
			return array(3, 3);
		}
		$columns = $this->get_gallery_grid_column_count($gallery_id);
		list($w, $h) = $this->custom_grid_tile_spans_from_pixel_ratio(
			(int) $meta['width'],
			(int) $meta['height'],
			$columns
		);
		/**
		 * Filter spans [w,h] in grid units for newly added images in custom-grid galleries.
		 *
		 * @param int[] $spans      { width, height }.
		 * @param int   $gallery_id Gallery ID.
		 * @param int   $image_id   Attachment ID.
		 * @param array $meta       Attachment metadata.
		 */
		return apply_filters(
			'modula_custom_grid_new_image_tile_spans',
			array($w, $h),
			$gallery_id,
			$image_id,
			$meta
		);
	}

	/**
	 * REST: build Modula image payloads for the editor (replaces ajax_modula_add_images_ids).
	 *
	 * @param int   $gallery_id Gallery ID.
	 * @param mixed $ids Attachment IDs (array or comma-separated string).
	 * @return array|\WP_Error Map of id => image data.
	 */
	public function rest_add_images_payload($gallery_id, $ids)
	{
		if (! $this->check_user_upload_rights()) {
			return new \WP_Error(
				'modula_forbidden',
				__('You do not have the rights to upload files.', 'modula-best-grid-gallery'),
				array('status' => 403)
			);
		}
		$gallery_id = absint($gallery_id);
		if (! $gallery_id) {
			return new \WP_Error(
				'modula_no_gallery',
				__('No gallery ID was provided.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}
		if (is_string($ids)) {
			$ids = explode(',', $ids);
		}
		if (! is_array($ids) || empty($ids)) {
			return new \WP_Error(
				'modula_no_images',
				__('No images were provided.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}
		$modula_images = array();
		foreach ($ids as $image_id) {
			$image_id   = absint($image_id);
			$attachment = get_post($image_id);
			if (! $attachment) {
				continue;
			}
			list($def_w, $def_h) = $this->get_default_tile_spans_for_new_image($gallery_id, $image_id);
			$image                      = array(
				'id'          => $image_id,
				'alt'         => sanitize_text_field(get_post_meta($image_id, '_wp_attachment_image_alt', true)),
				'title'       => sanitize_text_field($attachment->post_title),
				'description' => wp_filter_post_kses($attachment->post_content),
				'halign'      => 'center',
				'valign'      => 'middle',
				'link'        => '',
				'target'      => '',
				'width'       => $def_w,
				'height'      => $def_h,
				'filters'     => '',
				'url'         => wp_get_attachment_image_url($image_id, 'full'),
			);
			$modula_images[$image_id] = $this->sanitize_image($image);
		}
		if (empty($modula_images)) {
			return new \WP_Error(
				'modula_no_images',
				__('No images were provided.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}
		$this->notify_upload_errors($gallery_id);
		$notice = array(
			'title'   => esc_html__('Import process completed.', 'modula-best-grid-gallery'),
			'message' => sprintf(
				_n(
					'Finished importing %d image.',
					'Finished importing %d images.',
					count($modula_images),
					'modula-best-grid-gallery'
				),
				count($modula_images)
			),
			'status'  => 'success',
			'source'  => array(
				'slug' => 'modula',
				'name' => 'Modula',
			),
			'timed'   => 5000,
		);
		if (class_exists('WPChill_Notifications')) {
			WPChill_Notifications::add_notification('zip-import', $notice);
		}
		return $modula_images;
	}

	/**
	 * Build one sanitized modula-images row for an attachment (no notifications). Used by REST replace/patch.
	 *
	 * @param int $gallery_id Gallery post ID (for permission check parity with rest_add_images_payload).
	 * @param int $image_id   Attachment ID.
	 * @return array|\WP_Error Row shaped like modula-images entries.
	 */
	public function rest_build_single_image_row($gallery_id, $image_id)
	{
		if (! $this->check_user_upload_rights()) {
			return new \WP_Error(
				'modula_forbidden',
				__('You do not have the rights to upload files.', 'modula-best-grid-gallery'),
				array('status' => 403)
			);
		}
		$gallery_id = absint($gallery_id);
		$image_id   = absint($image_id);
		if (! $gallery_id || ! $image_id) {
			return new \WP_Error(
				'modula_no_images',
				__('No images were provided.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}
		$attachment = get_post($image_id);
		if (! $attachment) {
			return new \WP_Error(
				'modula_no_images',
				__('No images were provided.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}
		list($def_w, $def_h) = $this->get_default_tile_spans_for_new_image($gallery_id, $image_id);
		$image = array(
			'id'          => $image_id,
			'alt'         => sanitize_text_field(get_post_meta($image_id, '_wp_attachment_image_alt', true)),
			'title'       => sanitize_text_field($attachment->post_title),
			'description' => wp_filter_post_kses($attachment->post_content),
			'halign'      => 'center',
			'valign'      => 'middle',
			'link'        => '',
			'target'      => '',
			'width'       => $def_w,
			'height'      => $def_h,
			'filters'     => '',
			'url'         => wp_get_attachment_image_url($image_id, 'full'),
		);
		return $this->sanitize_image($image);
	}

	/**
	 * Write Modula “title”, “alt”, and “description” onto the media attachment (canonical store).
	 * “description” maps to attachment post_content, matching {@see rest_build_single_image_row()}.
	 *
	 * @param int   $attachment_id Attachment post ID.
	 * @param array $fields          Partial fields: optional keys title, alt, description (HTML allowed for description).
	 * @return true|\WP_Error
	 */
	public function apply_modula_media_fields_to_attachment($attachment_id, $fields)
	{
		$attachment_id = absint($attachment_id);
		if (! $attachment_id || ! is_array($fields)) {
			return new \WP_Error(
				'modula_bad_attachment',
				__('Invalid attachment.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}
		if (! current_user_can('edit_post', $attachment_id)) {
			return new \WP_Error(
				'modula_forbidden',
				__('You cannot edit this attachment.', 'modula-best-grid-gallery'),
				array('status' => 403)
			);
		}
		$attachment = get_post($attachment_id);
		if (! $attachment || 'attachment' !== $attachment->post_type) {
			return new \WP_Error(
				'modula_bad_attachment',
				__('Invalid attachment.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}

		$post_data = array('ID' => $attachment_id);

		if (array_key_exists('title', $fields)) {
			$post_data['post_title'] = sanitize_text_field(wp_unslash($fields['title']));
		}
		if (array_key_exists('description', $fields)) {
			$post_data['post_content'] = wp_slash(wp_filter_post_kses(wp_unslash($fields['description'])));
		}

		if (count($post_data) > 1) {
			$result = wp_update_post($post_data, true);
			if (is_wp_error($result)) {
				return $result;
			}
		}

		if (array_key_exists('alt', $fields)) {
			update_post_meta(
				$attachment_id,
				'_wp_attachment_image_alt',
				sanitize_text_field(wp_unslash($fields['alt']))
			);
		}

		return true;
	}

	/**
	 * Overwrite title / alt / description on a modula-images row from attachment post data (after attachment updates).
	 *
	 * @param array $row            Row being saved.
	 * @param int   $attachment_id Attachment ID.
	 * @return array
	 */
	public function overlay_modula_row_attachment_text_from_post($row, $attachment_id)
	{
		if (! is_array($row)) {
			return $row;
		}
		$attachment_id = absint($attachment_id);
		if (! $attachment_id) {
			return $row;
		}
		$attachment = get_post($attachment_id);
		if (! $attachment || 'attachment' !== $attachment->post_type) {
			return $row;
		}
		$row['title']       = $attachment->post_title;
		$row['alt']         = get_post_meta($attachment_id, '_wp_attachment_image_alt', true);
		$row['description'] = $attachment->post_content;
		return $row;
	}

	/**
	 * Sanitize a full modula-images list (same rules as per-row save).
	 *
	 * @param array $images Rows.
	 * @return array
	 */
	public function sanitize_modula_images_list($images)
	{
		if (! is_array($images)) {
			return array();
		}
		$out = array();
		foreach ($images as $image) {
			if (is_array($image)) {
				$out[] = $this->sanitize_image($image);
			}
		}
		return $out;
	}

	/**
	 * Sanitize one modula-images row.
	 *
	 * @param array $image Row.
	 * @return array
	 */
	public function sanitize_modula_image_row($image)
	{
		if (! is_array($image)) {
			return array();
		}
		return $this->sanitize_image($image);
	}

	/**
	 * REST: unzip an uploaded ZIP attachment to temp folders under uploads; returns folder paths.
	 *
	 * @param int $file_id Attachment ID.
	 * @return array|\WP_Error
	 */
	public function rest_unzip_to_paths($file_id)
	{
		if (! $this->check_user_upload_rights()) {
			return new \WP_Error(
				'modula_forbidden',
				__('You do not have the rights to upload files.', 'modula-best-grid-gallery'),
				array('status' => 403)
			);
		}
		$file_id = absint($file_id);
		if (! $file_id) {
			return new \WP_Error(
				'modula_no_file',
				__('No file was provided.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}

		$file = get_attached_file($file_id);
		if (! class_exists('ZipArchive')) {
			$this->delete_atachment($file_id, true);
			return new \WP_Error(
				'modula_no_zip',
				__('ZIP extension is not installed on the server.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}

		$zip        = new ZipArchive();
		$zip_opened = $zip->open($file);
		if (true !== $zip_opened) {
			$this->delete_atachment($file_id, true);
			return new \WP_Error(
				'modula_zip_open',
				__('Could not open ZIP file.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}

		$allowed_mime_types = $this->define_allowed_mime_types();
		$base               = pathinfo($file, PATHINFO_DIRNAME);
		$file_name          = pathinfo($file, PATHINFO_FILENAME);
		$timestamp          = time();
		$unzip_path         = $base . '/' . $file_name . $timestamp;

		require_once ABSPATH . '/wp-admin/includes/file.php';
		WP_Filesystem();
		global $wp_filesystem;

		if (! $wp_filesystem->mkdir($unzip_path, FS_CHMOD_DIR)) {
			$zip->close();
			$this->delete_atachment($file_id, true);
			return new \WP_Error(
				'modula_mkdir',
				__('Could not create extraction directory.', 'modula-best-grid-gallery'),
				array('status' => 500)
			);
		}

		$unzip_path = realpath($unzip_path);
		if (false === $unzip_path) {
			$zip->close();
			$this->delete_atachment($file_id, true);
			return new \WP_Error(
				'modula_path',
				__('Invalid extraction path.', 'modula-best-grid-gallery'),
				array('status' => 500)
			);
		}

		$has_valid_files = false;
		$valid_files     = array();

		for ($i = 0; $i < $zip->numFiles; $i++) {
			$stat      = $zip->statIndex($i);
			$full_path = $stat['name'];

			if (substr($full_path, -1) === '/') {
				continue;
			}

			$file_name_zip = basename($full_path);
			if (empty($file_name_zip)) {
				continue;
			}

			if (substr($file_name_zip, 0, 2) === '._') {
				continue;
			}

			if (strpos($full_path, '__MACOSX/') === 0) {
				continue;
			}

			$file_type = wp_check_filetype($file_name_zip, $allowed_mime_types);
			if (empty($file_type['type'])) {
				continue;
			}

			$sanitized_path = $this->sanitize_zip_path($full_path, $unzip_path);
			if (false === $sanitized_path) {
				continue;
			}

			$has_valid_files = true;
			$valid_files[]   = array(
				'index' => $i,
				'path'  => $sanitized_path,
			);
		}

		if (! $has_valid_files) {
			$zip->close();
			$wp_filesystem->rmdir($unzip_path, true);
			$this->delete_atachment($file_id, true);
			return new \WP_Error(
				'modula_zip_empty',
				__('ZIP file does not contain any valid image files. Only image files are permitted.', 'modula-best-grid-gallery'),
				array('status' => 400)
			);
		}

		foreach ($valid_files as $file_data) {
			$content = $zip->getFromIndex($file_data['index']);
			if (false === $content) {
				continue;
			}

			$target_file = $file_data['path'];
			$target_dir  = dirname($target_file);

			if (! $wp_filesystem->is_dir($target_dir)) {
				if (! $wp_filesystem->mkdir($target_dir, FS_CHMOD_DIR, true)) {
					continue;
				}
			}

			if (! $wp_filesystem->put_contents($target_file, $content, FS_CHMOD_FILE)) {
				continue;
			}
		}

		$zip->close();

		$this->delete_atachment($file_id, true);
		$this->remove_empty_folders($unzip_path, $unzip_path);

		$folders    = array($unzip_path);
		$subfolders = $this->list_folders($unzip_path, true);
		if (! empty($subfolders)) {
			foreach ($subfolders as $subfolder) {
				$folders[] = $subfolder['path'];
			}
		}

		return $folders;
	}

	/**
	 * Clear recorded upload errors for a gallery (admin notice).
	 *
	 * @param int $gallery_id Gallery ID.
	 * @return void
	 */
	public function rest_dismiss_upload_errors($gallery_id)
	{
		$gallery_id = absint($gallery_id);
		if (! $gallery_id || ! current_user_can('edit_post', $gallery_id)) {
			return;
		}
		delete_post_meta($gallery_id, $this->uploaded_error_files_meta);
	}

	/**
	 * Set the default directory for the media browser. By default, it's the uploads directory.
	 *
	 * @return void
	 *
	 * @since 2.11.0
	 */
	public function set_default_browser_dir()
	{
		$uploads           = wp_upload_dir();
		$this->default_dir = apply_filters('modula_gallery_upload_default_dir', $uploads['basedir']);
	}

	/**
	 * Output the Upload from folder button.
	 *
	 * @return void
	 *
	 * @since 2.11.0
	 */
	public function add_folder_browser_button()
	{
?>
		<li id="modula-uploader-folder-browser">
			<?php esc_html_e('From Folder', 'modula-best-grid-gallery'); ?>
		</li>
		<?php
	}

	/**
	 * Returns a listing of all folders in the specified folder.
	 *
	 * @access public
	 *
	 * @param  string  $folder  (default: '')
	 * @param  boolean $recursive  (default: false)
	 *
	 * @return array|bool

	 * @since 2.11.0
	 */
	public function list_folders($folder = '', $recursive = false)
	{
		// If no folder is specified, return false
		if (! $this->check_folder($folder)) {
			return false;
		}

		// A listing of all files and dirs in $folder, excepting . and ..
		// By default, the sorted order is alphabetical in ascending order
		$files = array_diff(scandir($folder), array('..', '.'));

		$modula_folders = array();

		foreach ($files as $file) {
			if (! is_dir($folder . '/' . $file)) {
				continue;
			}
			$modula_folders[] = array(
				'path' => $folder . '/' . $file,
			);
			if ($recursive) {
				$subfolders = $this->list_folders($folder . '/' . $file);
				if (! empty($subfolders)) {
					$modula_folders = array_merge($modula_folders, $subfolders);
				}
			}
		}

		return $modula_folders;
	}

	/**
	 * Multi-byte-safe pathinfo replacement.
	 *
	 * @param $filepath
	 *
	 * @return mixed
	 *
	 * @since 2.11.0
	 */
	public function mb_pathinfo($filepath)
	{
		$ret = array();
		preg_match(
			'%^(.*?)[\\\\/]*(([^/\\\\]*?)(\.([^\.\\\\/]+?)|))[\\\\/\.]*$%im',
			$filepath,
			$m
		);
		if (isset($m[1])) {
			$ret['dirname'] = $m[1];
		}
		if (isset($m[2])) {
			$ret['basename'] = $m[2];
		}
		if (isset($m[5])) {
			$ret['extension'] = $m[5];
		}
		if (isset($m[3])) {
			$ret['filename'] = $m[3];
		}

		return $ret;
	}

	/**
	 * Media browser, for the folder upload functionality
	 *
	 * @access public
	 * @return void
	 *
	 * @since 2.11.0
	 */
	public function media_browser()
	{
		// If we have paths, show them in the file browser
		if (! empty($this->default_dir)) {
			$this->enqueue_browser_scripts();
			echo '<!DOCTYPE html><html lang="en">';
			echo '<head><title>' . esc_html__('Modula folder browser', 'modula-best-grid-gallery') . '</title>';
			echo '<meta charset="utf-8" />';
			// print_emoji_styles is deprecated and triggers a PHP warning.
			remove_action('admin_print_styles', 'print_emoji_styles');
			do_action('admin_print_styles'); // phpcs:ignore
			do_action('admin_print_scripts'); // phpcs:ignore
			do_action('admin_head'); // phpcs:ignore
			// re-add print_emoji_styles.
			add_action('admin_print_styles', 'print_emoji_styles');
			echo '</head><body class="wp-core-ui" id="modula_browser">';
			echo '<input type="hidden" value="' . absint($_GET['post_id']) . '" name="post_ID" id="post_ID">'; // phpcs:ignore 
			echo '<p>' . esc_html__('Select a folder to upload images from', 'modula-best-grid-gallery') . '</p>';
			echo '<ul class="modula_file_browser">';
			// Cycle through paths and list files.
			// Get folders based on path.
			$files = $this->list_folders($this->default_dir);
			if (! empty($files)) {
				// Cycle through files.
				foreach ($files as $found_file) {
					$file = pathinfo($found_file['path']);
					echo '<li><input type="checkbox" value="' . esc_attr(trailingslashit($file['dirname'])) . esc_attr($file['basename']) . '"><a href="#" class="folder" data-path="' . esc_attr(trailingslashit($file['dirname'])) . esc_attr($file['basename']) . '">' . esc_html($file['basename']) . '</a></li>';
				}
			}
			echo '</ul>';
			echo '<div class="modula-browser-footer">';
			echo '<div class="modula-browser-footer__actions">';
			// Add input checkbox to keep or delete the files from the folders.
			echo '<div class="modula-browser-footer__column text-left">';
			echo '<label for="keep_files"><input type="checkbox" id="delete_files" value="true">' . esc_html__('Delete files from folder after upload', 'modula-best-grid-gallery') . '</label>';
			echo '</div>';
			echo '<div class="modula-browser-footer__column text-right">';
			echo '<a href="#" class="button button-primary disabled" id="modula_create_gallery">' . esc_html__('Import images from selected folder', 'modula-best-grid-gallery') . '</a>';
			echo '</div>';
			echo '</div>';
			echo '<div class="modula-browser-footer__progress">';
			echo '<div id="modula-progress"><div id="modula-progress-text">' . esc_html__('Import files from a folder', 'modula-best-grid-gallery') . '</div></div>';
			echo '</div>';
			do_action('admin_print_footer_styles'); // phpcs:ignore 
			do_action('admin_print_footer_scripts'); // phpcs:ignore
			do_action('admin_footer'); // phpcs:ignore
			echo '<script>const modulaBrowser = new ModulaGalleryUpload();modulaBrowser.fileBrowser(); modulaBrowser.progressMode = new ModulaProgress("modula-progress", true); modulaBrowser.progressMode.display();</script>';
			echo '</body></html>';
		}
	}

	/**
	 * Enqueue required admin scripts
	 *
	 * @param string $hook The current admin page
	 * @return void
	 */
	public function enqueue_scripts($hook)
	{
		if ('post.php' !== $hook && 'post-new.php' !== $hook) {
			return;
		}
		$current_screen = get_current_screen();
		if ('modula-gallery' !== $current_screen->post_type) {
			return;
		}
		if (class_exists('\Modula\V2\Admin\Gallery_Takeover_Admin') && \Modula\V2\Admin\Gallery_Takeover_Admin::should_use_takeover()) {
			return;
		}
		$this->required_scripts();
		wp_enqueue_style('media-upload');
		wp_enqueue_style('thickbox');
	}

	/**
	 * Enqueue browser scripts
	 *
	 * @return void
	 *
	 * @since 2.11.0
	 */
	public function enqueue_browser_scripts()
	{
		wp_enqueue_style('common');
		// Enqueue Dashicons.
		wp_enqueue_style('dashicons');
		// Enqueue buttons styles.
		wp_enqueue_style('buttons');
		// Enqueue the Modula Gallery Upload script.
		$this->required_scripts();
	}

	/**
	 * Check for empty or non folders
	 *
	 * @param string $folder
	 * @return void
	 */
	public function check_folder($folder)
	{
		if (empty($folder)) {
			return false;
		}

		$real_path  = realpath($folder);
		$upload_dir = wp_upload_dir();
		$base_path  = realpath($upload_dir['basedir']);

		if (! $real_path || ! $base_path || 0 !== strpos($real_path, $base_path)) {
			return false;
		}

		if (! is_dir($real_path)) {
			return false;
		}

		$files_folders = scandir($real_path);
		if (! $files_folders) {
			return false;
		}
		return true;
	}

	/**
	 * Returns a listing of all files in the specified folder.
	 *
	 * @param string $folder
	 * @return array|bool
	 *
	 * @since 2.11.0
	 */
	public function get_files($folder)
	{

		// A listing of all files and dirs in $folder, excepting . and ..
		// By default, the sorted order is alphabetical in ascending order
		$files = array_diff(scandir($folder), array('..', '.'));

		$modula_files = array();
		foreach ($files as $file) {
			if (is_dir($folder . '/' . $file)) {
				continue;
			}
			$file_path = $folder . '/' . $file;
			if (! $this->check_file($file_path)) {
				continue;
			}
			$modula_files[] = $file_path;
		}

		return $modula_files;
	}

	/**
	 * Define allowed mime types for the gallery upload
	 *
	 * @return array
	 *
	 * @since 2.11.0
	 */
	public function define_allowed_mime_types()
	{
		// Define the allowed mime types.
		$allowed_mime_types = array(
			'jpg|jpeg|jpe' => 'image/jpeg',
			'png'          => 'image/png',
			'gif'          => 'image/gif',
			'bmp'          => 'image/bmp',
			'tiff'         => 'image/tiff',
			'tif'          => 'image/tiff',
			'webp'         => 'image/webp',
		);

		// Get WP's default allowed mime types.
		$wp_allowed_mime_types = get_allowed_mime_types();
		// Get mime types that are present in the default allowed mime types and the ones we defined.
		$allowed_mime_types = array_intersect_key($allowed_mime_types, $wp_allowed_mime_types);

		return apply_filters('modula_gallery_upload_allowed_mime_types', $allowed_mime_types);
	}

	/**
	 * File validation
	 *
	 * @param string $file
	 * @return bool
	 *
	 * @since 2.11.0
	 */
	public function check_file($file)
	{
		// Check if the file exists
		if (! file_exists($file)) {
			return false;
		}
		// Check file mime type
		$allowed_mime_types = $this->define_allowed_mime_types();
		$file_info          = wp_check_filetype($file, $allowed_mime_types);
		if (! $file_info || ! $file_info['ext'] || ! $file_info['type']) {
			return false;
		}
		return true;
	}

	/**
	 * Upload image to the media library
	 *
	 * @param string $file_path The path to the file
	 * @return int The attachment ID
	 *
	 * @since 2.11.0
	 */
	public function upload_image($file_path, $delete_file)
	{
		// Include the media functions file.
		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		$attachment_id = false;
		if ($delete_file) {
			// Add the file to the media library.
			$attachment_id = media_handle_sideload(
				array(
					'name'     => basename($file_path),
					'tmp_name' => $file_path,
				),
				0
			);
			// If the file was added successfully, return the attachment ID.
			if (is_wp_error($attachment_id)) {
				$this->uploaded_error_files['files'][] = $file_path;
				return false;
			}
		} else {
			$attachment_id = $this->handle_sideload_without_deleting(
				array(
					'name'     => basename($file_path),
					'tmp_name' => $file_path,
				)
			);
			if (is_wp_error($attachment_id)) {
				$this->uploaded_error_files['files'][] = $file_path;
				return false;
			}
		}
		// Return the attachment ID.
		return $attachment_id;
	}

	/**
	 * Image sanitization function
	 *
	 * @param array $image
	 * @return array
	 *
	 * @since 2.11.0
	 */
	private function sanitize_image($image)
	{

		$new_image = array();

		// This list will not contain id because we save our images based on image id.
		$image_attributes = apply_filters(
			'modula_gallery_image_attributes',
			array(
				'id',
				'alt',
				'title',
				'description',
				'halign',
				'valign',
				'link',
				'target',
				'width',
				'height',
				'gridX',
				'gridY',
				'gridLocked',
				'togglelightbox',
				'hide_title',
				'url',
				'focal_x',
				'focal_y',
				'focal_crop_x',
				'focal_crop_y',
				'focal_crop_w',
				'focal_crop_h',
				'tile_image_fit',
			)
		);

		foreach ($image_attributes as $attribute) {
			if (isset($image[$attribute])) {
				switch ($attribute) {
					case 'alt':
						$new_image[$attribute] = sanitize_text_field($image[$attribute]);
						break;
					case 'width':
					case 'height':
						$new_image[$attribute] = absint($image[$attribute]);
						break;
					case 'gridX':
					case 'gridY':
						// Empty string is "no cell assigned" for custom grid; absint( '' ) === 0 would collide with tile at (0,0).
						if ('' === $image[$attribute] || null === $image[$attribute]) {
							$new_image[$attribute] = '';
							break;
						}
						$new_image[$attribute] = absint($image[$attribute]);
						break;
					case 'gridLocked':
						$new_image[$attribute] = absint($image[$attribute]) ? 1 : 0;
						break;
					case 'title':
					case 'description':
						$new_image[$attribute] = wp_filter_post_kses($image[$attribute]);
						break;
					case 'link':
						$new_image[$attribute] = esc_url_raw($image[$attribute]);
						break;
					case 'target':
						if (isset($image[$attribute])) {
							$new_image[$attribute] = absint($image[$attribute]);
						} else {
							$new_image[$attribute] = 0;
						}
						break;
					case 'togglelightbox':
					case 'hide_title':
						if (isset($image[$attribute])) {
							$new_image[$attribute] = absint($image[$attribute]);
						} else {
							$new_image[$attribute] = 0;
						}
						break;
					case 'halign':
						if (in_array($image[$attribute], array('left', 'right', 'center'), true)) {
							$new_image[$attribute] = $image[$attribute];
						} else {
							$new_image[$attribute] = 'center';
						}
						break;
					case 'valign':
						if (in_array($image[$attribute], array('top', 'bottom', 'middle'), true)) {
							$new_image[$attribute] = $image[$attribute];
						} else {
							$new_image[$attribute] = 'middle';
						}
						break;
					case 'focal_x':
					case 'focal_y':
						if ('' === $image[$attribute] || null === $image[$attribute]) {
							$new_image[$attribute] = '';
							break;
						}
						$v = floatval($image[$attribute]);
						if (! is_finite($v)) {
							$new_image[$attribute] = '';
							break;
						}
						$new_image[$attribute] = min(1, max(0, $v));
						break;
					case 'focal_crop_x':
					case 'focal_crop_y':
						if ('' === $image[$attribute] || null === $image[$attribute]) {
							$new_image[$attribute] = '';
							break;
						}
						$v = floatval($image[$attribute]);
						if (! is_finite($v)) {
							$new_image[$attribute] = '';
							break;
						}
						$new_image[$attribute] = min(1, max(0, $v));
						break;
					case 'focal_crop_w':
					case 'focal_crop_h':
						if ('' === $image[$attribute] || null === $image[$attribute]) {
							$new_image[$attribute] = '';
							break;
						}
						$v = floatval($image[$attribute]);
						if (! is_finite($v) || $v <= 0) {
							$new_image[$attribute] = '';
							break;
						}
						$new_image[$attribute] = min(1, max(1e-6, $v));
						break;
					case 'tile_image_fit':
						if ('' === $image[$attribute] || null === $image[$attribute]) {
							$new_image[$attribute] = '';
							break;
						}
						$fit = sanitize_text_field($image[$attribute]);
						if (in_array($fit, array('contain', 'cover'), true)) {
							$new_image[$attribute] = $fit;
						} else {
							$new_image[$attribute] = '';
						}
						break;
					default:
						$new_image[$attribute] = apply_filters('modula_image_field_sanitization', sanitize_text_field($image[$attribute]), $image[$attribute], $attribute);
						break;
				}
			} else {
				$new_image[$attribute] = '';
			}
		}

		return $new_image;
	}

	/**
	 * Enqueue modula browser specific required scripts
	 *
	 * @return void
	 *
	 * @since 2.11.0
	 */
	public function required_scripts()
	{
		$suffix = (defined('SCRIPT_DEBUG') && SCRIPT_DEBUG) ? '' : '.min';
		// Enqueue Modula browser styles.
		wp_enqueue_style('modula-browser', MODULA_URL . 'assets/css/admin/modula-browser.css', array(), MODULA_LITE_VERSION);
		// Load the wp.i18n script.
		wp_enqueue_script('wp-i18n');
		// Enqueue the progress class script.
		wp_enqueue_script('modula-progress', MODULA_URL . 'assets/js/admin/modula-progress' . $suffix . '.js', array('jquery'), MODULA_LITE_VERSION, true);
		// Enqueue the gallery upload script
		wp_enqueue_script('modula-gallery-upload', MODULA_URL . 'assets/js/admin/modula-gallery-upload' . $suffix . '.js', array('jquery', 'media-upload', 'backbone'), MODULA_LITE_VERSION, true);
		// Localize the script
		wp_localize_script(
			'modula-gallery-upload',
			'modulaGalleryUpload',
			array(
				'browseFolder'          => __('Browse for a folder', 'modula-best-grid-gallery'),
				'noSubfolders'          => __('No subfolders found', 'modula-best-grid-gallery'),
				'restUrl'               => trailingslashit(rest_url('modula/v2/')),
				'restNonce'             => wp_create_nonce('wp_rest'),
				'security'              => wp_create_nonce('wp_rest'),
				'noFoldersSelected'     => __('No folder(s) selected', 'modula-best-grid-gallery'),
				'updatingGallery'       => __('Updating gallery. Please wait...', 'modula-best-grid-gallery'),
				'galleryUpdated'        => __('Gallery updated. Syncronizing gallery view...', 'modula-best-grid-gallery'),
				'startFolderValidation' => __('Validating folder(s). Please wait...', 'modula-best-grid-gallery'),
			)
		);
	}

	/**
	 * Get the uploaded files for a gallery
	 *
	 * @param int $post_id The gallery ID
	 * @return array
	 *
	 * @since 2.11.0
	 */
	public function get_uploaded_error_files($post_id)
	{
		$fiels = get_post_meta($post_id, $this->uploaded_error_files_meta, true);
		if (! $fiels) {
			return array(
				'folders' => array(),
				'files'   => array(),
			);
		}
		return get_post_meta($post_id, $this->uploaded_error_files_meta, true);
	}

	/**
	 * Update the uploaded files for a gallery
	 *
	 * @param int $post_id The gallery ID
	 * @param array $files The uploaded files
	 * @return void
	 *
	 * @since 2.11.0
	 */
	public function update_uploaded_error_files($post_id, $files)
	{
		update_post_meta($post_id, $this->uploaded_error_files_meta, $files);
	}

	/**
	 * Add the required scripts for the media browser
	 *
	 * @return void
	 *
	 * @since 2.11.0
	 */
	public function upload_error_notice()
	{
		$screen = get_current_screen();
		if ('modula-gallery' !== $screen->post_type) {
			return;
		}
		$uploaded_files = $this->get_uploaded_error_files(get_the_ID());
		if (! empty($uploaded_files)) {
		?>
			<div class="modula-notice notice notice-error is-dismissible" target-type="post_meta" notice-target="<?php echo esc_attr($this->uploaded_error_files_meta); ?>">
				<p><?php esc_html_e('Some files could not be uploaded. Please check the following paths:', 'modula-best-grid-gallery'); ?></p>
				<ul>
					<?php
					if (! empty($uploaded_files['folders'])) {
						foreach ($uploaded_files['folders'] as $folder) {
							echo '<li>' . esc_html($folder) . '</li>';
						}
					}
					if (! empty($uploaded_files['files'])) {
						foreach ($uploaded_files['files'] as $file) {
							echo '<li>' . esc_html($file) . '</li>';
						}
					}
					?>
				</ul>
			</div>
		<?php
		}
	}

	/**
	 * Handle sideload without deleting the original file
	 *
	 * @param array $file_array The file array
	 * @return int|WP_Error The attachment ID or a WP_Error object
	 *
	 * @since 2.11.0
	 */
	public function handle_sideload_without_deleting($file_array)
	{
		// Step 1: Copy the original file to a temporary location
		$temp_file = wp_tempnam($file_array['name']);
		if (! $temp_file) {
			return new WP_Error('temp_file_creation_failed', __('Could not create temporary file.', 'modula-best-grid-gallery'));
		}

		if (! copy($file_array['tmp_name'], $temp_file)) {
			return new WP_Error('file_copy_failed', __('Could not copy file to temporary location.', 'modula-best-grid-gallery'));
		}

		// Step 2: Update the file array to point to the temporary file
		$file_array['tmp_name'] = $temp_file;

		// Step 3: Use media_handle_sideload to handle the copied file
		$attachment_id = media_handle_sideload($file_array, 0);

		// Step 4: Ensure the original file remains intact
		if (is_wp_error($attachment_id)) {
			@unlink($temp_file); // Clean up the temporary file if there was an error
		}

		return $attachment_id;
	}

	/**
	 * Output the Upload from folder button.
	 *
	 * @return void
	 *
	 * @since 2.11.0
	 */
	public function add_upload_zip_button()
	{
		?>
		<li id="modula-upload-zip-browser">
			<?php esc_html_e('From ZIP', 'modula-best-grid-gallery'); ?>
		</li>
	<?php
	}

	/**
	 * upload_dir function.
	 *
	 * @access public
	 *
	 * @param mixed $pathdata
	 *
	 * @return array
	 */
	public function zip_upload_dir($pathdata)
	{
		// We don't process form we just modify the upload path for our custom post type.
		// phpcs:ignore
		if (! isset($_POST['type']) || ! isset($_POST['action']) || 'modula-gallery' !== $_POST['type'] || 'modula_upload_zip' !== $_POST['action']) {
			return $pathdata;
		}
		// Check if the user has the rights to upload files.
		if (! $this->check_user_upload_rights()) {
			// Send an error response
			echo json_encode(
				array(
					'error'   => true,
					'message' => __('You do not have the rights to upload files or edit galleries.', 'modula-best-grid-gallery'),
				)
			);
			http_response_code(403); // Set HTTP status code to 403 (Forbidden)
			exit;
		}

		// Check if the file was provided.
		if (empty($_POST['name'])) {
			// Send an error response
			echo json_encode(
				array(
					'error'   => true,
					'message' => __('No file was provided.', 'modula-best-grid-gallery'),
				)
			);
			http_response_code(400); // Set HTTP status code to 400 (Bad Request)
			exit;
		}
		$file_type = wp_check_filetype($_POST['name']);
		// Check if the file is a zip file.
		if (empty($file_type['type']) || 'application/zip' !== $file_type['type']) {
			// Send an error response
			echo json_encode(
				array(
					'error'   => true,
					'message' => __('The file is not a zip file.', 'modula-best-grid-gallery'),
				)
			);
			http_response_code(400); // Set HTTP status code to 400 (Bad Request)
			exit;
		}
		// Now, let's modify the path.
		if (empty($pathdata['subdir'])) {
			$pathdata['path']   = $pathdata['path'] . '/modula_zip_upload';
			$pathdata['url']    = $pathdata['url'] . '/modula_zip_upload';
			$pathdata['subdir'] = '/modula_zip_upload';
		} else {
			$new_subdir = '/modula_zip_upload' . $pathdata['subdir'];

			$pathdata['path']   = str_replace($pathdata['subdir'], $new_subdir, $pathdata['path']);
			$pathdata['url']    = str_replace($pathdata['subdir'], $new_subdir, $pathdata['url']);
			$pathdata['subdir'] = str_replace($pathdata['subdir'], $new_subdir, $pathdata['subdir']);
		}

		return $pathdata;
	}

	/**
	 * Sanitize ZIP file path to prevent path traversal attacks
	 *
	 * @param string $zip_path The path from the ZIP archive
	 * @param string $base_path The base extraction directory
	 * @return string|false The sanitized absolute path, or false if path traversal detected
	 *
	 * @since 2.11.0
	 */
	private function sanitize_zip_path($zip_path, $base_path)
	{
		$zip_path = str_replace("\0", '', $zip_path);
		$zip_path = str_replace('\\', '/', $zip_path);
		$zip_path = ltrim($zip_path, './');
		$parts    = explode('/', $zip_path);

		$sanitized_parts = array();
		foreach ($parts as $part) {
			if ('' === $part) {
				continue;
			}

			if ('.' === $part) {
				continue;
			}

			if ('..' === $part) {
				return false;
			}

			if (preg_match('/^[a-zA-Z]:$/', $part)) {
				return false;
			}

			$sanitized_parts[] = $part;
		}

		$sanitized_relative = implode('/', $sanitized_parts);
		$full_path          = $base_path . '/' . $sanitized_relative;

		$normalized = realpath(dirname($full_path));
		if (false === $normalized) {
			return false;
		}

		$final_path = $normalized . '/' . basename($full_path);
		$base_real  = realpath($base_path);
		if (false === $base_real) {
			return false;
		}

		if (0 !== strpos($final_path, $base_real . '/') && $final_path !== $base_real) {
			return false;
		}

		return $final_path;
	}

	/**
	 * Error notification for upload errors during the upload process
	 *
	 * @param int $gallery_id The ID of the gallery
	 * @return void
	 *
	 * @since 2.11.0
	 */
	public function notify_upload_errors($gallery_id)
	{
		if (! class_exists('Modula_Notifications')) {
			return;
		}
		$uploaded_files = $this->get_uploaded_error_files($gallery_id);

		// Return if there are no errors
		if (! $uploaded_files || (empty($uploaded_files['folders']) && empty($uploaded_files['files']))) {
			return;
		}
		ob_start();
	?>
		<p><?php echo wp_kses_post(sprintf(__('Some files could not be uploaded in <a href="%1$s" target="_blank">gallery ID %2$s</a>. Please check the following paths:', 'modula-best-grid-gallery'), esc_url(admin_url('post.php?post=' . absint($gallery_id) . '&action=edit#!layout')), $gallery_id)); ?></p>
		<ul>
			<?php
			if (! empty($uploaded_files['folders'])) {
				foreach ($uploaded_files['folders'] as $folder) {
					echo '<li>' . esc_html($folder) . '</li>';
				}
			}
			if (! empty($uploaded_files['files'])) {
				foreach ($uploaded_files['files'] as $file) {
					echo '<li>' . esc_html($file) . '</li>';
				}
			}
			?>
		</ul>
<?php
		$message = ob_get_clean();
		$notice  = array(
			'title'   => esc_html__('Error importing images', 'modula-best-grid-gallery'),
			'message' => $message,
			'status'  => 'error',
			'source'  => array(
				'slug' => 'modula',
				'name' => 'Modula',
			),
		);

		WPChill_Notifications::add_notification('error-uploading-images-' . get_the_ID(), $notice);
		// Clear the uploaded files, since the notification was added.
		$this->update_uploaded_error_files($gallery_id, array());
	}

	/**
	 * Recursively remove empty folders
	 *
	 * @param string $dir Directory path to clean
	 * @param string $root_dir Root directory to preserve (don't delete)
	 * @return void
	 *
	 * @since 2.11.0
	 */
	private function remove_empty_folders($dir, $root_dir)
	{
		global $wp_filesystem;

		if (! $wp_filesystem->is_dir($dir)) {
			return;
		}

		$items = $wp_filesystem->dirlist($dir, false, false);
		if (empty($items)) {
			if ($dir === $root_dir) {
				return;
			}
			$wp_filesystem->rmdir($dir, false);
			return;
		}

		foreach ($items as $item) {
			if (isset($item['type']) && 'd' === $item['type']) {
				$subdir = trailingslashit($dir) . $item['name'];
				$this->remove_empty_folders($subdir, $root_dir);
			}
		}

		$items = $wp_filesystem->dirlist($dir, false, false);
		if (empty($items)) {
			if ($dir === $root_dir) {
				return;
			}

			$wp_filesystem->rmdir($dir, false);
		}
	}

	private function delete_atachment($file_id, $force)
	{
		if (! current_user_can('delete_post', $file_id)) {
			return false;
		}
		return wp_delete_attachment($file_id, $force);
	}
}

Modula_Gallery_Upload::get_instance();
