<?php

/**
 * Single source of truth for “modern v2 stack” detection and server-catalog rules.
 *
 * @package Modula
 */

namespace Modula\V2;

defined('ABSPATH') || exit;

/**
 * Modern gallery output: shortcode v2 + React modula-gallery.
 */
final class Modern_Gallery
{

	public const OUTPUT_SCHEMA_VERSION = 2;

	/**
	 * Whether this gallery is a Beta gallery (visitor gallery / chunked storage).
	 *
	 * @param int $post_id Gallery post ID.
	 */
	public static function is_modern_stack_enabled(int $post_id = 0): bool
	{
		if ($post_id < 1) {
			return false;
		}
		return (bool) apply_filters('modula_use_modern_shortcode', false, $post_id);
	}

	/**
	 * Minimum row count to persist images as manifest + chunk metas (filter to override).
	 *
	 * @param int $post_id Gallery post ID.
	 */
	public static function chunked_storage_threshold(int $post_id): int
	{
		$t = (int) apply_filters('modula_v2_chunked_images_threshold', 200, $post_id);

		return max(0, $t);
	}

	/**
	 * Whether sync should write chunked storage instead of a single modula_images_v2 blob.
	 */
	public static function should_use_chunked_storage(int $post_id, int $row_count): bool
	{
		if (! self::is_modern_stack_enabled($post_id)) {
			return false;
		}
		if (true !== apply_filters('modula_v2_use_chunked_image_storage', true, $post_id, $row_count)) {
			return false;
		}
		$threshold = self::chunked_storage_threshold($post_id);

		return $threshold > 0 && $row_count >= $threshold;
	}

	/**
	 * Numeric gallery ID from flat settings gallery_id (modula-123).
	 */
	public static function gallery_post_id_from_flat(array $flat): int
	{
		$gid = isset($flat['gallery_id']) ? (string) $flat['gallery_id'] : '';
		if (preg_match('/modula-(\d+)/', $gid, $m)) {
			return absint($m[1]);
		}
		return 0;
	}

	/**
	 * Pagination max for current device (flat modula-settings shape).
	 */
	public static function resolve_per_page_from_flat(array $flat): int
	{
		if (wp_is_mobile() && ! empty($flat['maxImagesCount_mobile']) && absint($flat['maxImagesCount_mobile']) > 0) {
			return absint($flat['maxImagesCount_mobile']);
		}
		if (! empty($flat['maxImagesCount']) && absint($flat['maxImagesCount']) > 0) {
			return absint($flat['maxImagesCount']);
		}
		return 0;
	}

	/**
	 * Master Pagination hub toggle only (flat `enable_pagination`).
	 * Nested infinite scroll / load-more are ignored when this is off — matches settings-editor drill-in.
	 * Does not treat maxImagesCount alone as enabled — matches React bootstrap / visitor UX.
	 */
	public static function is_pagination_mode_enabled(array $flat): bool
	{
		if (empty($flat['enable_pagination'])) {
			return false;
		}
		if ((int) $flat['enable_pagination'] === 0 || '0' === $flat['enable_pagination'] || false === $flat['enable_pagination']) {
			return false;
		}
		return true;
	}

	/**
	 * Any Pro/UI pagination mode that limits the grid.
	 * Max-images-per-page alone counts: Pro slices on maxImagesCount even when numbered pagination is off.
	 */
	public static function is_any_pagination_enabled(array $flat): bool
	{
		if (self::resolve_per_page_from_flat($flat) > 0) {
			return true;
		}
		return self::is_pagination_mode_enabled($flat);
	}

	/**
	 * Full image list must reach React/REST for filtering + server pagination (skip Pro grid slice).
	 *
	 * @param int   $post_id     Gallery post ID.
	 * @param int   $image_count Image count after load, before maxImagesCount slice.
	 * @param array $flat        Flat gallery settings.
	 */
	public static function gallery_needs_server_item_catalog(int $post_id, int $image_count, array $flat): bool
	{
		if (! self::is_modern_stack_enabled($post_id) || $image_count < 1) {
			return false;
		}
		if (Images\Chunked_Storage::has_manifest($post_id)) {
			return true;
		}
		if (! self::is_pagination_mode_enabled($flat)) {
			return false;
		}
		$per = self::resolve_per_page_from_flat($flat);
		if ($per <= 0) {
			return false;
		}
		return $image_count > $per;
	}

	/**
	 * Let Pro / extensions skip slicing the grid to maxImagesCount when modern catalog handles pages.
	 *
	 * @param bool  $skip      Incoming (unused).
	 * @param array $images    Images list.
	 * @param array $settings  Flat settings.
	 */
	public static function filter_skip_pro_max_slice($skip, $images, $settings): bool
	{
		if (! is_array($images) || ! is_array($settings)) {
			return (bool) $skip;
		}
		$post_id = self::gallery_post_id_from_flat($settings);
		if (! $post_id || ! self::is_modern_stack_enabled($post_id)) {
			return (bool) $skip;
		}
		if (! self::is_pagination_mode_enabled($settings)) {
			return true;
		}
		if (self::gallery_needs_server_item_catalog($post_id, count($images), $settings)) {
			return true;
		}
		return (bool) $skip;
	}

	/**
	 * Inline shell styles printed on the gallery container before modula-gallery.css loads.
	 *
	 * @param string $extra_declarations Optional declarations (e.g. hover CSS variables).
	 */
	public static function gallery_shell_inline_style(string $extra_declarations = ''): string
	{
		$shell = 'opacity:0;visibility:hidden';
		$extra = trim($extra_declarations, " \t\n\r\0\x0B;");
		if ('' === $extra) {
			return $shell;
		}
		return $shell . ';' . $extra;
	}

	/**
	 * Critical CSS for filter/pagination chrome (inline in <head>, not blocked by async chunks).
	 */
	public static function gallery_chrome_inline_css(): string
	{
		return self::gallery_shell_critical_inline_css()
			. '.modula .filters{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem;align-items:center}'
			. '.modula .filters--align-center{justify-content:center}'
			. '.modula .filters--align-right{justify-content:flex-end}'
			. '.modula .filters button{border:1px solid rgba(0,0,0,.12);background:transparent;padding:.35rem .75rem;border-radius:8px;cursor:pointer;font:inherit;color:inherit}'
			. '.modula .filters button.active{font-weight:600}'
			. '.modula .filters--dropdown{position:relative}'
			. '.modula .filters__select{appearance:auto;border:1px solid rgba(0,0,0,.12);background:#fff;padding:.35rem .75rem;border-radius:8px;cursor:pointer;font:inherit;color:inherit;max-width:100%;min-width:10rem}'
			. '.modula .modula-pagination{display:flex;flex-wrap:wrap;gap:.35rem;justify-content:center;margin-top:1rem}'
			. '.modula .modula-pagination.modula-pagination--left{justify-content:flex-start}'
			. '.modula .modula-pagination.modula-pagination--center{justify-content:center}'
			. '.modula .modula-pagination.modula-pagination--right{justify-content:flex-end}'
			. '.modula .modula-pagination button,.modula .modula-pagination__load-more{border:1px solid rgba(0,0,0,.15);background:#fff;padding:.4rem .75rem;border-radius:8px;cursor:pointer;font:inherit;color:inherit}'
			. '.modula .modula-pagination button.active{font-weight:700}'
			. '.modula .modula-pagination__ellipsis{display:inline-flex;align-items:center;justify-content:center;min-width:2rem;padding:.4rem .35rem;opacity:.65;user-select:none}';
	}

	/**
	 * Shell visibility rules inlined in <head> so they apply before modula-gallery.css finishes loading.
	 */
	public static function gallery_shell_critical_inline_css(): string
	{
		$hidden
			= '.modula.modula-gallery:not(.modula-gallery-initialized) .modula-items,'
			. '.modula.modula-gallery:not(.modula-gallery-initialized) .filters,'
			. '.modula.modula-gallery:not(.modula-gallery-initialized) .modula-pagination,'
			. '.modula.modula-gallery:not(.modula-gallery-initialized) a.post-edit-link'
			. '{visibility:hidden;position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;pointer-events:none}';

		$pending
			= '.modula.modula-gallery.modula-gallery--bootstrap-pending{opacity:1!important;visibility:visible!important;min-height:120px;position:relative}';

		$initialized
			= '.modula.modula-gallery.modula-gallery-initialized{opacity:1!important;visibility:visible!important}';

		$chrome_pending
			= '.modula.modula-gallery.modula-gallery-initialized:not(.modula-gallery-chrome-ready) .filters,'
			. '.modula.modula-gallery.modula-gallery-initialized:not(.modula-gallery-chrome-ready) .modula-pagination'
			. '{visibility:hidden!important}';

		return $hidden . $pending . $initialized . $chrome_pending;
	}

	/**
	 * Attach critical chrome CSS to an enqueued Modula gallery stylesheet handle.
	 *
	 * @param string $handle Registered style handle.
	 */
	public static function attach_gallery_chrome_inline_style(string $handle): void
	{
		if (! wp_style_is($handle, 'enqueued') && ! wp_style_is($handle, 'registered')) {
			return;
		}
		wp_add_inline_style($handle, self::gallery_chrome_inline_css());
	}

	/**
	 * Absolute path to the async bootstrap stylesheet (full gallery layout CSS).
	 */
	public static function bootstrap_stylesheet_path(): string
	{
		$stable = MODULA_PATH . 'assets/css/front/modula-gallery-bootstrap.modula-gallery.css';
		if (file_exists($stable)) {
			return $stable;
		}

		$dir   = MODULA_PATH . 'assets/css/front/';
		$files = glob($dir . '*.modula-gallery.css');
		if (! is_array($files)) {
			return '';
		}

		$best      = '';
		$best_size = 0;
		foreach ($files as $file) {
			if ('modula-gallery.css' === basename($file)) {
				continue;
			}
			$size = (int) filesize($file);
			if ($size > $best_size) {
				$best_size = $size;
				$best      = $file;
			}
		}

		return $best;
	}

	/**
	 * Enqueue the async bootstrap layout stylesheet in <head> so it is not raced by JS on slow links.
	 */
	public static function enqueue_bootstrap_stylesheet(): void
	{
		$css_file = self::bootstrap_stylesheet_path();
		if ('' === $css_file || ! file_exists($css_file)) {
			return;
		}

		$handle = 'modula-gallery-bootstrap';
		if (wp_style_is($handle, 'enqueued')) {
			return;
		}

		wp_enqueue_style(
			$handle,
			MODULA_URL . 'assets/css/front/' . basename($css_file),
			array('modula-gallery'),
			MODULA_LITE_VERSION
		);
	}

	/**
	 * Hint the browser to fetch the bootstrap CSS chunk early (still loaded by JS import).
	 */
	public static function preload_bootstrap_stylesheet(): void
	{
		static $hooked = false;
		if ($hooked) {
			return;
		}
		$hooked = true;

		$css_file = self::bootstrap_stylesheet_path();
		if ('' === $css_file || ! file_exists($css_file)) {
			return;
		}

		$css_url = MODULA_URL . 'assets/css/front/' . basename($css_file);
		add_action(
			'wp_head',
			static function () use ($css_url): void {
				printf(
					'<link rel="preload" href="%s" as="style" />' . "\n",
					esc_url($css_url)
				);
			},
			1
		);
	}

	/**
	 * Register hooks that cooperate with Pro (Phase §12.6).
	 */
	public static function init(): void
	{
		add_filter('modula_v2_skip_frontend_max_images_slice', array(__CLASS__, 'filter_skip_pro_max_slice'), 5, 3);
	}
}
