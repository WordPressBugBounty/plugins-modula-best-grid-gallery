<?php

/**
 * Modula Settings Adapter (legacy alias).
 * Delegates to \Modula\V2\Settings\Adapter. Converts between flat modula-settings and grouped v2 (modula_settings_v2 JSON).
 *
 * @package Modula
 */

defined('ABSPATH') || exit;

/**
 * Class Modula_Settings_Adapter
 */
class Modula_Settings_Adapter
{

	/**
	 * Convert flat modula-settings to grouped (schema v2).
	 *
	 * @param array<string, mixed> $flat Flat settings as stored in post meta modula-settings.
	 * @return array<string, array<string, mixed>> Grouped by group name, keys in camelCase.
	 */
	public static function to_grouped(array $flat, array $options = array())
	{
		return \Modula\V2\Settings\Adapter::to_grouped($flat, $options);
	}

	/**
	 * Convert grouped settings (schema v2) back to flat for legacy save/read.
	 *
	 * @param array<string, array<string, mixed>> $grouped Grouped settings.
	 * @return array<string, mixed> Flat settings compatible with modula-settings meta.
	 */
	public static function to_flat(array $grouped)
	{
		return \Modula\V2\Settings\Adapter::to_flat($grouped);
	}

	/**
	 * Get the flat → grouped mapping (for export or debugging).
	 *
	 * @return array<string, array{group: string, key: string}>
	 */
	public static function get_flat_to_grouped_mapping()
	{
		return \Modula\V2\Settings\Adapter::get_flat_to_grouped_mapping();
	}
}
