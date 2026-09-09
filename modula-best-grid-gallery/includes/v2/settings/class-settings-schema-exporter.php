<?php

/**
 * Build committed artifacts from Field_Registry + PHP v2 document (data/settings-v2-document.php):
 * types as JSON; form schema as JS wrapping user-facing strings with wp.i18n-compatible __().
 * Used by scripts/generate-modula-settings-schemas.php (PHP CLI; WordPress optional).
 *
 * @package Modula
 */

namespace Modula\V2\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Class Settings_Schema_Exporter
 */
class Settings_Schema_Exporter {


	/**
	 * Relative path (no leading/trailing slash) to generated JSON consumed by the React settings-editor app.
	 *
	 * @var string
	 */
	public const SETTINGS_EDITOR_GENERATED_RELATIVE = 'apps/gallery-editor/generated';

	/**
	 * Infer editor control from v2 field definition (parity with generate-modula-settings-form-schema.mjs).
	 *
	 * @param array<string, mixed>|null $schema_field
	 * @param string                    $flat_key
	 * @param string                    $g_key
	 * @return array<string, mixed>
	 */
	public static function infer_control( $schema_field, $flat_key, $g_key ) {
		if ( ! is_array( $schema_field ) ) {
			return array( 'kind' => 'text' );
		}
		$t   = isset( $schema_field['type'] ) ? $schema_field['type'] : '';
		$low = strtolower( $flat_key . ' ' . $g_key );
		if ( 'boolean' === $t ) {
			return array( 'kind' => 'toggle' );
		}
		if ( 'integer' === $t ) {
			$c = array( 'kind' => 'number' );
			if ( isset( $schema_field['minimum'] ) ) {
				$c['min'] = $schema_field['minimum'];
			}
			if ( isset( $schema_field['maximum'] ) ) {
				$c['max'] = $schema_field['maximum'];
			}
			if ( isset( $c['min'], $c['max'] ) && ( (int) $c['max'] - (int) $c['min'] <= 200 ) ) {
				$c['kind'] = 'range';
			}
			return $c;
		}
		if ( 'array' === $t ) {
			$items = isset( $schema_field['items'] ) ? $schema_field['items'] : null;
			if (
				is_array( $items ) && isset( $items['type'] ) && 'integer' === $items['type']
				&& isset( $schema_field['minItems'], $schema_field['maxItems'] )
				&& 3 === (int) $schema_field['minItems'] && 3 === (int) $schema_field['maxItems']
			) {
				$control = array(
					'kind'     => 'tuple3',
					'itemType' => 'integer',
					'labels'   => array( 'desktop', 'tablet', 'mobile' ),
				);
				if ( isset( $items['minimum'] ) && is_numeric( $items['minimum'] ) ) {
					$control['min'] = (int) $items['minimum'];
				}
				if ( isset( $items['maximum'] ) && is_numeric( $items['maximum'] ) ) {
					$control['max'] = (int) $items['maximum'];
				}
				if ( isset( $schema_field['default'] ) && is_array( $schema_field['default'] ) ) {
					$defaults = array();
					foreach ( array_slice( $schema_field['default'], 0, 3 ) as $d ) {
						$defaults[] = is_numeric( $d ) ? (int) $d : 0;
					}
					while ( count( $defaults ) < 3 ) {
						$defaults[] = 0;
					}
					$control['defaults'] = $defaults;
				}
				return $control;
			}
			return array(
				'kind' => 'stringList',
				'note' => 'array field — implement as repeater or tags',
			);
		}
		if ( 'object' === $t ) {
			$props = isset( $schema_field['properties'] ) && is_array( $schema_field['properties'] ) ? $schema_field['properties'] : array();
			if ( ! empty( $props['width'] ) && ! empty( $props['height'] ) ) {
				return array(
					'kind'   => 'dimensions',
					'fields' => array( 'width', 'height' ),
				);
			}
			return array(
				'kind' => 'object',
				'note' => 'nested object',
			);
		}
		if ( 'string' === $t ) {
			if ( ! empty( $schema_field['enum'] ) && is_array( $schema_field['enum'] ) ) {
				return array(
					'kind'    => 'select',
					'options' => $schema_field['enum'],
				);
			}
			$ends_colour = strlen( $low ) >= 6 && 'colour' === substr( $low, -6 );
			if ( false !== strpos( $low, 'color' ) || $ends_colour ) {
				return array(
					'kind'        => 'color',
					'acceptAlpha' => true,
				);
			}
			if ( 'style' === $flat_key || 'style' === $g_key ) {
				return array( 'kind' => 'textarea' );
			}
			if ( 'emailMessage' === $flat_key || 'password' === $flat_key ) {
				return array( 'kind' => 'textarea' );
			}
			return array( 'kind' => 'text' );
		}
		return array( 'kind' => 'text' );
	}

	/**
	 * @param string $id
	 * @return string
	 */
	public static function title_case_group( $id ) {
		return ucfirst( trim( preg_replace( '/([A-Z])/', ' $1', $id ) ) );
	}

	/**
	 * Editor-only: sidebar nested panel opened from a toggle row (settings v2 document → form schema).
	 *
	 * @param array<string, mixed> $panel Raw `editorSidebarNestedPanel` from the v2 settings document.
	 * @return array{title: string, groupedPaths: string[]}|null
	 */
	private static function normalize_sidebar_nested_panel_export( array $panel ) {
		$title = isset( $panel['title'] ) && is_string( $panel['title'] ) ? trim( $panel['title'] ) : '';
		$paths = isset( $panel['groupedPaths'] ) && is_array( $panel['groupedPaths'] ) ? $panel['groupedPaths'] : array();
		$out   = array();
		foreach ( $paths as $p ) {
			if ( is_string( $p ) && '' !== trim( $p ) ) {
				$out[] = trim( $p );
			}
		}
		if ( '' === $title || array() === $out ) {
			return null;
		}
		return array(
			'title'        => $title,
			'groupedPaths' => $out,
		);
	}

	/**
	 * Normalize editorOptionGroups for MenuSelect (id, label, values).
	 *
	 * @param array<int, mixed> $groups
	 * @param array<int, mixed> $allowed_options Enum values from control.options.
	 * @return array<int, array{id: string, label: string, values: string[]}>
	 */
	private static function normalize_editor_option_groups_export( array $groups, array $allowed_options ) {
		$allowed = array();
		foreach ( $allowed_options as $opt ) {
			if ( is_scalar( $opt ) ) {
				$key = (string) $opt;
				if ( '' !== $key ) {
					$allowed[ $key ] = true;
				}
			}
		}
		$out = array();
		foreach ( $groups as $index => $group ) {
			if ( ! is_array( $group ) ) {
				continue;
			}
			$raw_values = isset( $group['values'] ) && is_array( $group['values'] )
				? $group['values']
				: ( isset( $group['options'] ) && is_array( $group['options'] ) ? $group['options'] : array() );
			$values     = array();
			foreach ( $raw_values as $value ) {
				if ( ! is_scalar( $value ) ) {
					continue;
				}
				$key = (string) $value;
				if ( '' === $key ) {
					continue;
				}
				if ( ! empty( $allowed ) && ! isset( $allowed[ $key ] ) ) {
					continue;
				}
				$values[] = $key;
			}
			if ( array() === $values ) {
				continue;
			}
			$id    = isset( $group['id'] ) && is_string( $group['id'] ) && '' !== trim( $group['id'] )
				? trim( $group['id'] )
				: 'group-' . (string) $index;
			$label = isset( $group['label'] ) && is_string( $group['label'] ) ? $group['label'] : '';
			$out[] = array(
				'id'     => $id,
				'label'  => $label,
				'values' => $values,
			);
		}
		return $out;
	}

	/**
	 * @param array<string, mixed>|null $schema_field
	 * @return array<string, mixed>|null
	 */
	public static function schema_for_form_export( $schema_field ) {
		if ( ! is_array( $schema_field ) ) {
			return $schema_field;
		}
		$rest = $schema_field;
		unset(
			$rest['editorControl'],
			$rest['editorLabel'],
			$rest['enumOptionLabels'],
			$rest['editorDescription'],
			$rest['editorTooltip'],
			$rest['editorPresentationOnly'],
			$rest['editorStateKey'],
			$rest['editorMetadataModalGate'],
			$rest['editorMetadataIcon'],
			$rest['editorAdvancedOnly'],
			$rest['editorSidebarNestedPanel'],
			$rest['editorSidebarNestedOnly']
		);
		return $rest;
	}

	/**
	 * @param array<string, mixed>      $control
	 * @param array<string, mixed>|null $schema_field
	 * @param array<string, mixed>      $field Field mutated when hideRowLabel is set.
	 * @return array<string, mixed>
	 */
	public static function apply_editor_control( array $control, $schema_field, array &$field ) {
		if ( ! is_array( $schema_field ) || empty( $schema_field['editorControl'] ) || ! is_array( $schema_field['editorControl'] ) ) {
			return $control;
		}
		$ec = $schema_field['editorControl'];
		if ( ! empty( $ec['hideRowLabel'] ) ) {
			$field['editorHideRowLabel'] = true;
			unset( $ec['hideRowLabel'] );
		}
		$merged = array_merge( $control, $ec );
		if ( isset( $ec['kind'], $control['kind'] ) && $ec['kind'] !== $control['kind'] ) {
			unset( $merged['note'] );
		}
		return $merged;
	}

	/**
	 * Form-schema-only editorUi for collapsible groups (consumed by enrichField + insertCollapsibleGroups).
	 *
	 * @param string $grouped_path e.g. lightbox.toolbar or lightbox.close
	 * @return array<string, mixed>
	 */
	private static function collapsible_editor_ui_for_grouped_path( $grouped_path ) {
		static $children_by_parent = null;
		static $child_to_parent    = null;
		if ( null === $children_by_parent ) {
			// Toolbar children use `editorSidebarNestedPanel` on `lightbox.toolbar` (nested stack), not collapsible rows.
			$children_by_parent = array();
			$child_to_parent    = array();
			foreach ( $children_by_parent as $parent_path => $kids ) {
				$dot = strpos( $parent_path, '.' );
				if ( false === $dot ) {
					continue;
				}
				$group = substr( $parent_path, 0, $dot );
				foreach ( $kids as $ck ) {
					$child_to_parent[ $group . '.' . $ck ] = $parent_path;
				}
			}
		}
		if ( ! is_string( $grouped_path ) || '' === $grouped_path ) {
			return array();
		}
		if ( isset( $children_by_parent[ $grouped_path ] ) ) {
			return array(
				'collapsibleChildKeys' => $children_by_parent[ $grouped_path ],
			);
		}
		if ( isset( $child_to_parent[ $grouped_path ] ) ) {
			return array( 'collapsibleChildOf' => $child_to_parent[ $grouped_path ] );
		}
		return array();
	}

	/**
	 * @param string $root Plugin root.
	 * @return array<string, mixed>
	 */
	public static function load_v2_document( $root ) {
		unset( $root );
		$doc = Settings_Schema_Document::get_document();
		if ( ! is_array( $doc ) || empty( $doc['settings'] ) || ! is_array( $doc['settings'] ) ) {
			throw new \RuntimeException(
				'Missing or invalid v2 settings document: includes/v2/settings/data/settings-v2-document.php'
			);
		}
		return $doc;
	}

	/**
	 * Apply export-time filters when WordPress is loaded.
	 *
	 * @param array<string, mixed> $doc
	 * @return array<string, mixed>
	 */
	public static function normalize_v2_for_output( array $doc ) {
		if ( isset( $doc['settings'] ) && is_array( $doc['settings'] ) && function_exists( 'apply_filters' ) ) {
			$doc['settings'] = apply_filters( 'modula_v2_settings_schema', $doc['settings'] );
		}
		if ( function_exists( 'apply_filters' ) ) {
			$doc = apply_filters( 'modula_settings_schema_export_document', $doc );
		}
		return $doc;
	}

	/**
	 * @param mixed  $data
	 * @param string $path
	 * @return bool
	 */
	public static function write_json_file( $data, $path ) {
		$flags = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;
		// json_encode (not wp_json_encode) so the generator runs under plain PHP CLI without WordPress.
		$encoded = json_encode( $data, $flags );
		if ( false === $encoded ) {
			throw new \RuntimeException( 'json_encode failed for ' . $path );
		}
		return false !== file_put_contents( $path, $encoded . "\n" );
	}

	/**
	 * Whether a dot-path in the exported form schema points to a user-facing string for the settings editor.
	 *
	 * @param string $path e.g. groups.0.fields.3.editorLabel
	 * @return bool
	 */
	private static function form_schema_path_is_translatable( $path ) {
		if ( ! is_string( $path ) || '' === $path ) {
			return false;
		}
		$patterns = array(
			'/^groups\.\d+\.label$/',
			'/^groups\.\d+\.fields\.\d+\.editorLabel$/',
			'/^groups\.\d+\.fields\.\d+\.editorDescription$/',
			'/^groups\.\d+\.fields\.\d+\.editorTooltip$/',
			'/^groups\.\d+\.fields\.\d+\.schema\.description$/',
			'/^groups\.\d+\.fields\.\d+\.schema\.editorGalleryTypeUpsell\.needsProMessage$/',
			'/^groups\.\d+\.fields\.\d+\.schema\.editorGalleryTypeUpsell\.needsPlanUpgradeMessage$/',
			'/^groups\.\d+\.fields\.\d+\.schema\.editorLightboxLiteUpsell\.title$/',
			'/^groups\.\d+\.fields\.\d+\.schema\.editorLightboxLiteUpsell\.needsProMessage$/',
			'/^groups\.\d+\.fields\.\d+\.schema\.editorLightboxLiteUpsell\.freeVsPremiumLabel$/',
			'/^groups\.\d+\.fields\.\d+\.schema\.editorLightboxLiteUpsell\.getPremiumLabel$/',
			'/^groups\.\d+\.fields\.\d+\.schema\.editorLightboxLiteUpsell\.activateExtensionLabel$/',
			'/^groups\.\d+\.fields\.\d+\.schema\.editorLightboxLiteUpsell\.upgradeSubscriptionLabel$/',
			'/^groups\.\d+\.fields\.\d+\.control\.toggleLabel$/',
			'/^groups\.\d+\.fields\.\d+\.control\.buttonLabel$/',
			'/^groups\.\d+\.fields\.\d+\.control\.mediaFrameTitle$/',
			'/^groups\.\d+\.fields\.\d+\.control\.selectButtonLabel$/',
			'/^groups\.\d+\.fields\.\d+\.control\.replaceButtonLabel$/',
			'/^groups\.\d+\.fields\.\d+\.control\.removeButtonLabel$/',
			'/^groups\.\d+\.fields\.\d+\.control\.saveFirstMessage$/',
			'/^groups\.\d+\.fields\.\d+\.control\.optionLabels\.[^.]+$/',
			'/^groups\.\d+\.fields\.\d+\.control\.optionGroups\.\d+\.label$/',
			'/^groups\.\d+\.fields\.\d+\.schema\.editorOptionGroups\.\d+\.label$/',
			'/^groups\.\d+\.fields\.\d+\.control\.ariaLabel$/',
			'/^groups\.\d+\.fields\.\d+\.control\.sidebarNestedPanel\.title$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.(title|description|navHelp|panelDescription)$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.auxiliaryPanel\.(title|description)$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.hubSections\.\d+\.label$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.hubSections\.\d+\.text$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.hubSections\.\d+\.hubHelp$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.hubSections\.\d+\.items\.\d+\.label$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.hubSections\.\d+\.items\.\d+\.text$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.hubSections\.\d+\.items\.\d+\.hubHelp$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.hubSections\.\d+\.items\.\d+\.items\.\d+\.label$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.hubSections\.\d+\.items\.\d+\.items\.\d+\.text$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.hubSections\.\d+\.items\.\d+\.items\.\d+\.hubHelp$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.hubSections\.\d+\.items\.\d+\.summaryParts\.\d+\.template$/',
			'/^SETTINGS_EDITOR_CATEGORIES\.\d+\.hubSections\.\d+\.items\.\d+\.summaryParts\.\d+\.zeroLabel$/',
			'/^GROUP_LABELS\.[a-zA-Z0-9_-]+$/',
			'/^imageMetadataModal\.tabs\.\d+\.title$/',
			'/^imageMetadataModal\.tabs\.\d+\.fields\.\d+\.editorLabel$/',
			'/^imageMetadataModal\.tabs\.\d+\.fields\.\d+\.editorDescription$/',
			'/^imageMetadataModal\.tabs\.\d+\.fields\.\d+\.control\.optionLabels\.[^.]+$/',
			'/^imageMetadataModal\.tabs\.\d+\.fields\.\d+\.control\.toggleLabel$/',
			'/^imageMetadataModal\.tabs\.\d+\.fields\.\d+\.control\.buttonLabel$/',
			'/^imageMetadataModal\.tabs\.\d+\.fields\.\d+\.control\.mediaFrameTitle$/',
			'/^imageMetadataModal\.tabs\.\d+\.fields\.\d+\.control\.selectButtonLabel$/',
		);
		foreach ( $patterns as $pattern ) {
			if ( 1 === preg_match( $pattern, $path ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param array<int|string, mixed> $arr
	 * @return bool
	 */
	private static function is_list_array( array $arr ) {
		if ( array() === $arr ) {
			return true;
		}
		$keys = array_keys( $arr );
		return $keys === range( 0, count( $arr ) - 1 );
	}

	/**
	 * JavaScript literal or __() call for form schema export.
	 *
	 * @param mixed  $val
	 * @param string $path Dot-path for translatability rules.
	 * @param int    $depth Indentation depth (tabs).
	 * @return string
	 */
	private static function form_value_to_js_expr( $val, $path, $depth = 0 ) {
		$tab = str_repeat( "\t", $depth );

		if ( is_string( $val ) ) {
			if ( self::form_schema_path_is_translatable( $path ) ) {
				$enc = json_encode( $val, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
				if ( false === $enc ) {
					$enc = '""';
				}
				return '__( ' . $enc . ", 'modula-best-grid-gallery' )";
			}
			$enc = json_encode( $val, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
			return false !== $enc ? $enc : '""';
		}

		if ( is_int( $val ) || is_float( $val ) ) {
			$enc = json_encode( $val );
			return false !== $enc ? $enc : '0';
		}

		if ( is_bool( $val ) ) {
			return $val ? 'true' : 'false';
		}

		if ( null === $val ) {
			return 'null';
		}

		if ( is_array( $val ) ) {
			if ( array() === $val ) {
				return '[]';
			}

			$tab_next = str_repeat( "\t", $depth + 1 );

			if ( self::is_list_array( $val ) ) {
				$parts = array();
				foreach ( $val as $i => $item ) {
					$sub     = ( '' === $path ? '' : $path . '.' ) . (string) $i;
					$parts[] = $tab_next . self::form_value_to_js_expr( $item, $sub, $depth + 1 );
				}
				return "[\n" . implode( ",\n", $parts ) . "\n" . $tab . ']';
			}

			$parts = array();
			foreach ( $val as $k => $v ) {
				$key_str = is_string( $k ) ? $k : (string) $k;
				$sub     = '' === $path ? $key_str : $path . '.' . $key_str;
				$js_key  = self::js_object_property_name( $key_str );
				$parts[] = $tab_next . $js_key . ': ' . self::form_value_to_js_expr( $v, $sub, $depth + 1 );
			}
			return "{\n" . implode( ",\n", $parts ) . "\n" . $tab . '}';
		}

		return 'null';
	}

	/**
	 * Valid JS property name or quoted string for object literal keys.
	 *
	 * @param string $key
	 * @return string
	 */
	private static function js_object_property_name( $key ) {
		if ( ! is_string( $key ) ) {
			$key = (string) $key;
		}
		if ( preg_match( '/^[a-zA-Z_$][a-zA-Z0-9_$]*$/', $key ) ) {
			return $key;
		}
		// phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- schema codegen runs outside wp_json_encode context.
		$enc = json_encode( $key, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		return false !== $enc ? $enc : "'\"'";
	}

	/**
	 * Write form schema as ES module: user-facing strings use import { __ } from '@wordpress/i18n'.
	 *
	 * @param array<string, mixed> $form Form schema array from build_form_schema().
	 * @param string               $path Absolute filesystem path for .js file.
	 * @return bool
	 */
	public static function write_form_schema_js( $form, $path ) {
		$body   = self::form_value_to_js_expr( $form, '', 0 );
		$header = "/* eslint-disable */\n" .
			"/**\n * Generated by scripts/generate-modula-settings-schemas.php — do not hand-edit.\n" .
			" * User-facing strings use @wordpress/i18n.__ so script translations (wp_set_script_translations) apply.\n" .
			" * Consumed by the settings-editor webpack bundle (import from apps/gallery-editor/data/formSchema.js).\n */\n" .
			"import { __ } from '@wordpress/i18n';\n\n" .
			'export default ';
		$footer = ";\n";
		return false !== file_put_contents( $path, $header . $body . $footer );
	}

	/**
	 * Write tab categories + group labels for the settings editor (from v2 document `editorNavigation`).
	 *
	 * @param array<string, mixed> $pack Keys: SETTINGS_EDITOR_CATEGORIES (list), GROUP_LABELS (map).
	 * @param string                                                         $path Absolute path to .js file.
	 * @return bool
	 */
	public static function write_editor_structure_js( array $pack, $path ) {
		$body   = self::form_value_to_js_expr( $pack, '', 0 );
		$header = "/* eslint-disable */\n" .
			"/**\n * Generated by scripts/generate-modula-settings-schemas.php — do not hand-edit.\n" .
			" * Source: includes/v2/settings/data/settings-v2-editor-navigation.php (`editorNavigation` on the v2 document).\n" .
			" * User-facing strings use @wordpress/i18n.__ for wp_set_script_translations.\n" .
			" * Imported via apps/gallery-editor/constants/editorStructure.js.\n" .
			" */\n" .
			"import { __ } from '@wordpress/i18n';\n\n" .
			'export default ';
		$footer = ";\n";
		return false !== file_put_contents( $path, $header . $body . $footer );
	}

	/**
	 * @param array<string, array> $mapping
	 * @param array<string, mixed> $settings_schema
	 * @return array<string, mixed>
	 */
	public static function build_form_schema( array $mapping, array $settings_schema ) {
		$deprecated_flat_keys = array(
			'slider_slidesToScroll' => true,
			'slider_tablet_scrolls' => true,
			'slider_mobile_scrolls' => true,
		);

		$group_labels = Settings_Editor_Presenter::get_group_labels_for_export();

		$groups = array();
		foreach ( $mapping as $flat_key => $entry ) {
			$group = $entry['group'];
			$key   = $entry['key'];
			if ( ! isset( $groups[ $group ] ) ) {
				$label            = isset( $group_labels[ $group ] ) ? $group_labels[ $group ] : self::title_case_group( $group );
				$groups[ $group ] = array(
					'id'     => $group,
					'label'  => $label,
					'fields' => array(),
				);
			}
			$schema_field = isset( $settings_schema[ $group ][ $key ] ) && is_array( $settings_schema[ $group ][ $key ] )
				? $settings_schema[ $group ][ $key ]
				: null;

			$schema_export = self::schema_for_form_export( $schema_field );
			if ( null === $schema_export ) {
				$schema_export = array(
					'type' => 'unknown',
					'note' => 'missing from v2 settings document (PHP)',
				);
			}

			$field            = array(
				'flatKey'     => $flat_key,
				'groupedPath' => $group . '.' . $key,
				'groupedKey'  => $key,
				'schema'      => $schema_export,
				'control'     => self::infer_control( $schema_field, $flat_key, $key ),
			);
			$field['control'] = self::apply_editor_control( $field['control'], $schema_field, $field );

			$collapsible_ui = self::collapsible_editor_ui_for_grouped_path( $field['groupedPath'] );
			if ( ! empty( $collapsible_ui ) ) {
				$field['editorUi'] = $collapsible_ui;
			}

			if ( is_array( $schema_field ) && ! empty( $schema_field['editorSidebarNestedOnly'] ) ) {
				$field['sidebarNestedOnly'] = true;
			}
			if ( is_array( $schema_field ) && ! empty( $schema_field['editorSidebarNestedPanel'] ) && is_array( $schema_field['editorSidebarNestedPanel'] ) ) {
				$nested = self::normalize_sidebar_nested_panel_export( $schema_field['editorSidebarNestedPanel'] );
				if ( null !== $nested && isset( $field['control']['kind'] ) && 'toggle' === $field['control']['kind'] ) {
					$field['control']['kind']               = 'toggleWithNested';
					$field['control']['sidebarNestedPanel'] = $nested;
				}
			}

			if ( is_array( $schema_field ) && ! empty( $schema_field['editorLabel'] ) && is_string( $schema_field['editorLabel'] ) ) {
				$field['editorLabel'] = $schema_field['editorLabel'];
			}
			if ( is_array( $schema_field ) && ! empty( $schema_field['editorDescription'] ) && is_string( $schema_field['editorDescription'] ) ) {
				$field['editorDescription'] = $schema_field['editorDescription'];
			}
			if ( is_array( $schema_field ) && ! empty( $schema_field['editorTooltip'] ) && is_string( $schema_field['editorTooltip'] ) ) {
				$field['editorTooltip'] = $schema_field['editorTooltip'];
			}
			if (
				is_array( $schema_field ) && ! empty( $schema_field['enumOptionLabels'] ) && is_array( $schema_field['enumOptionLabels'] )
				&& isset( $field['control']['kind'] ) && in_array( $field['control']['kind'], array( 'select', 'segmentedEnum', 'licenseImageSelect', 'positionGrid', 'watermarkApplyScope' ), true )
				&& ! empty( $field['control']['options'] ) && is_array( $field['control']['options'] )
			) {
				$map    = $schema_field['enumOptionLabels'];
				$merged = isset( $field['control']['optionLabels'] ) && is_array( $field['control']['optionLabels'] )
					? $field['control']['optionLabels']
					: array();
				foreach ( $field['control']['options'] as $opt_val ) {
					$opt_key = is_scalar( $opt_val ) ? (string) $opt_val : '';
					if ( '' === $opt_key ) {
						continue;
					}
					if ( isset( $map[ $opt_key ] ) && is_string( $map[ $opt_key ] ) ) {
						$merged[ $opt_key ] = $map[ $opt_key ];
					}
				}
				if ( ! empty( $merged ) ) {
					$field['control']['optionLabels'] = $merged;
				}
			}

			if (
				is_array( $schema_field )
				&& ! empty( $schema_field['editorOptionGroups'] )
				&& is_array( $schema_field['editorOptionGroups'] )
				&& isset( $field['control']['kind'] )
				&& 'select' === $field['control']['kind']
			) {
				$option_groups = self::normalize_editor_option_groups_export(
					$schema_field['editorOptionGroups'],
					isset( $field['control']['options'] ) && is_array( $field['control']['options'] )
						? $field['control']['options']
						: array()
				);
				if ( ! empty( $option_groups ) ) {
					$field['control']['optionGroups'] = $option_groups;
				}
			}

			if ( isset( $deprecated_flat_keys[ $flat_key ] ) ) {
				$field['deprecated']     = true;
				$field['deprecatedNote'] = 'Kept for legacy Slick/admin; v2 React carousel may ignore.';
			}

			$groups[ $group ]['fields'][] = $field;
		}

		foreach ( array_keys( $groups ) as $g ) {
			usort(
				$groups[ $g ]['fields'],
				function ( $a, $b ) {
					return strcmp( $a['flatKey'], $b['flatKey'] );
				}
			);
		}

		$ordered_group_ids = array_keys( $settings_schema );
		$groups_array      = array();
		foreach ( $ordered_group_ids as $id ) {
			if ( isset( $groups[ $id ] ) ) {
				$groups_array[] = $groups[ $id ];
			}
		}
		$orphan_ids = array_diff( array_keys( $groups ), $ordered_group_ids );
		sort( $orphan_ids, SORT_STRING );
		foreach ( $orphan_ids as $id ) {
			$groups_array[] = $groups[ $id ];
		}

		$out = array(
			'$comment'    => 'Generated by scripts/generate-modula-settings-schemas.php — do not hand-edit; regen after Field Registry / schema changes.',
			'version'     => '1.0',
			'generatedAt' => gmdate( 'c' ),
			'sources'     => array(
				'fieldRegistry'    => 'includes/v2/settings/class-field-registry.php',
				'typesSchema'      => self::SETTINGS_EDITOR_GENERATED_RELATIVE . '/modula-settings-schema-v2.json',
				'formSchemaModule' => self::SETTINGS_EDITOR_GENERATED_RELATIVE . '/modula-settings-form-schema.js',
				'typesSourcePhp'   => 'includes/v2/settings/data/settings-v2-document.php',
			),
			'stats'       => array(
				'mappedFields' => count( $mapping ),
				'groups'       => count( $groups_array ),
			),
			'groups'      => $groups_array,
		);

		if ( function_exists( 'apply_filters' ) ) {
			$out = apply_filters( 'modula_settings_form_schema_export', $out );
		}

		return $out;
	}

	/**
	 * Ensure select `optionLabels` is a string-keyed map (JS object), not a 0..n list, so FieldControl resolves labels by option value.
	 *
	 * @param array<string, mixed> $control Control array (mutated).
	 * @return array<string, mixed>
	 */
	private static function normalize_select_option_labels_to_map( array $control ) {
		if ( empty( $control['kind'] ) || 'select' !== $control['kind'] || empty( $control['options'] ) || ! is_array( $control['options'] ) || empty( $control['optionLabels'] ) || ! is_array( $control['optionLabels'] ) ) {
			return $control;
		}
		$opts = $control['options'];
		$labs = $control['optionLabels'];
		$out  = array();
		foreach ( $opts as $i => $opt ) {
			$key = is_scalar( $opt ) ? (string) $opt : '';
			if ( '' === $key ) {
				continue;
			}
			if ( isset( $labs[ $key ] ) && is_string( $labs[ $key ] ) ) {
				$out[ $key ] = $labs[ $key ];
			} elseif ( is_scalar( $opt ) && isset( $labs[ $opt ] ) && is_string( $labs[ $opt ] ) ) {
				$out[ $key ] = $labs[ $opt ];
			} elseif ( isset( $labs[ $i ] ) && is_string( $labs[ $i ] ) ) {
				$out[ $key ] = $labs[ $i ];
			}
		}
		if ( ! empty( $out ) ) {
			$control['optionLabels'] = $out;
		}
		return $control;
	}

	/**
	 * Build image “Edit metadata” modal field descriptors from v2 `items` + `imageMetadataModal` (PHP document).
	 *
	 * @param array<string, mixed> $doc Full v2 document (post-normalize).
	 * @return array<string, mixed> { tabs: { name, title, fields: field[] }[] }
	 */
	public static function build_image_metadata_modal_schema( array $doc ) {
		$items = isset( $doc['items'] ) && is_array( $doc['items'] ) ? $doc['items'] : array();
		$nav   = isset( $doc['imageMetadataModal'] ) && is_array( $doc['imageMetadataModal'] ) ? $doc['imageMetadataModal'] : array();
		$tabs  = isset( $nav['tabs'] ) && is_array( $nav['tabs'] ) ? $nav['tabs'] : array();

		$tabs_out = array();
		foreach ( $tabs as $tab ) {
			if ( ! is_array( $tab ) || empty( $tab['name'] ) || empty( $tab['fieldKeys'] ) || ! is_array( $tab['fieldKeys'] ) ) {
				continue;
			}
			$tab_name = (string) $tab['name'];
			$title    = isset( $tab['title'] ) && is_string( $tab['title'] ) ? $tab['title'] : $tab_name;
			$fields   = array();
			foreach ( $tab['fieldKeys'] as $item_key ) {
				if ( ! is_string( $item_key ) || ! isset( $items[ $item_key ] ) || ! is_array( $items[ $item_key ] ) ) {
					continue;
				}
				if ( ! isset( $items[ $item_key ]['type'] ) ) {
					continue;
				}
				$schema_field     = $items[ $item_key ];
				$schema_export    = self::schema_for_form_export( $schema_field );
				$flat_key         = 'item_' . $item_key;
				$field            = array(
					'groupedPath' => 'items.' . $item_key,
					'groupedKey'  => $item_key,
					'flatKey'     => $flat_key,
					'schema'      => $schema_export,
					'control'     => self::infer_control( $schema_field, $flat_key, $item_key ),
				);
				$field['control'] = self::apply_editor_control( $field['control'], $schema_field, $field );

				if ( is_array( $schema_field ) && ! empty( $schema_field['editorLabel'] ) && is_string( $schema_field['editorLabel'] ) ) {
					$field['editorLabel'] = $schema_field['editorLabel'];
				}
				if ( is_array( $schema_field ) && ! empty( $schema_field['editorDescription'] ) && is_string( $schema_field['editorDescription'] ) ) {
					$field['editorDescription'] = $schema_field['editorDescription'];
				}
				if ( is_array( $schema_field ) && ! empty( $schema_field['editorTooltip'] ) && is_string( $schema_field['editorTooltip'] ) ) {
					$field['editorTooltip'] = $schema_field['editorTooltip'];
				}
				if (
					is_array( $schema_field ) && ! empty( $schema_field['enumOptionLabels'] ) && is_array( $schema_field['enumOptionLabels'] )
					&& isset( $field['control']['kind'] ) && in_array( $field['control']['kind'], array( 'select', 'segmentedEnum', 'licenseImageSelect', 'positionGrid', 'watermarkApplyScope' ), true )
					&& ! empty( $field['control']['options'] ) && is_array( $field['control']['options'] )
				) {
					$map    = $schema_field['enumOptionLabels'];
					$merged = isset( $field['control']['optionLabels'] ) && is_array( $field['control']['optionLabels'] )
						? $field['control']['optionLabels']
						: array();
					foreach ( $field['control']['options'] as $opt_val ) {
						$opt_key = is_scalar( $opt_val ) ? (string) $opt_val : '';
						if ( '' === $opt_key ) {
							continue;
						}
						if ( isset( $map[ $opt_key ] ) && is_string( $map[ $opt_key ] ) ) {
							$merged[ $opt_key ] = $map[ $opt_key ];
							continue;
						}
						if ( isset( $map[ $opt_val ] ) && is_string( $map[ $opt_val ] ) ) {
							$merged[ (string) $opt_val ] = $map[ $opt_val ];
						}
					}
					if ( ! empty( $merged ) ) {
						$field['control']['optionLabels'] = $merged;
					}
				}
				if ( is_array( $schema_field ) && ! empty( $schema_field['editorStateKey'] ) && is_string( $schema_field['editorStateKey'] ) ) {
					$field['localStateKey'] = $schema_field['editorStateKey'];
				}
				if ( is_array( $schema_field ) && ! empty( $schema_field['editorMetadataModalGate'] ) && is_string( $schema_field['editorMetadataModalGate'] ) ) {
					$field['metadataModalGate'] = $schema_field['editorMetadataModalGate'];
				}
				if ( is_array( $schema_field ) && ! empty( $schema_field['editorMetadataIcon'] ) && is_string( $schema_field['editorMetadataIcon'] ) ) {
					$field['editorMetadataIcon'] = $schema_field['editorMetadataIcon'];
				}
				// Caption uses WP classic editor (TinyMCE) in the image metadata modal (matches Pro bulk editor).
				if ( 'caption' === $item_key ) {
					$field['control'] = array(
						'kind' => 'wpClassicEditor',
					);
				}
				$field['control'] = self::normalize_select_option_labels_to_map( $field['control'] );
				$collapsible_ui   = self::collapsible_editor_ui_for_grouped_path( $field['groupedPath'] );
				if ( ! empty( $collapsible_ui ) ) {
					$field['editorUi'] = $collapsible_ui;
				}
				$fields[] = $field;
			}
			$tabs_out[] = array(
				'name'   => $tab_name,
				'title'  => $title,
				'fields' => $fields,
			);
		}

		return array( 'tabs' => $tabs_out );
	}

	/**
	 * Regenerate JSON artifacts under apps/gallery-editor/generated/ (React app consumes them; not under docs/).
	 *
	 * @param string $root Plugin root directory (trailing slash optional).
	 * @return void
	 */
	public static function run( $root ) {
		$root    = rtrim( $root, '/' );
		$out_dir = $root . '/' . self::SETTINGS_EDITOR_GENERATED_RELATIVE;
		if ( ! is_dir( $out_dir ) && ! mkdir( $out_dir, 0755, true ) && ! is_dir( $out_dir ) ) {
			throw new \RuntimeException( 'Could not create directory: ' . $out_dir );
		}

		$doc = self::load_v2_document( $root );
		// Deep copy so export-time filters never mutate Settings_Schema_Document's cached array.
		$encoded = json_encode( $doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		if ( false === $encoded ) {
			throw new \RuntimeException( 'Could not encode v2 document for export (json_encode failed).' );
		}
		$doc = json_decode( $encoded, true );
		if ( ! is_array( $doc ) ) {
			throw new \RuntimeException( 'Could not copy v2 document for export.' );
		}
		$doc       = self::normalize_v2_for_output( $doc );
		$types_doc = $doc;
		if ( isset( $types_doc['settings'] ) && is_array( $types_doc['settings'] ) ) {
			$types_doc['settings'] = Settings_Schema_Document::strip_editor_presentation_keys_from_settings( $types_doc['settings'] );
		}
		unset( $types_doc['editorNavigation'], $types_doc['imageMetadataModal'] );
		self::write_json_file( $types_doc, $out_dir . '/modula-settings-schema-v2.json' );

		$settings_schema            = isset( $doc['settings'] ) && is_array( $doc['settings'] ) ? $doc['settings'] : array();
		$mapping                    = Field_Registry::get_flat_to_grouped_mapping();
		$form                       = self::build_form_schema( $mapping, $settings_schema );
		$form['imageMetadataModal'] = self::build_image_metadata_modal_schema( $doc );
		self::write_form_schema_js( $form, $out_dir . '/modula-settings-form-schema.js' );

		$nav  = isset( $doc['editorNavigation'] ) && is_array( $doc['editorNavigation'] ) ? $doc['editorNavigation'] : array();
		$cats = isset( $nav['categories'] ) && is_array( $nav['categories'] ) ? $nav['categories'] : array();
		$gls  = isset( $nav['groupLabels'] ) && is_array( $nav['groupLabels'] ) ? $nav['groupLabels'] : array();
		$cats = self::merge_sidebar_v2_copy_into_categories( $cats );
		self::write_editor_structure_js(
			array(
				'SETTINGS_EDITOR_CATEGORIES' => $cats,
				'GROUP_LABELS'               => $gls,
			),
			$out_dir . '/modula-settings-editor-structure.js'
		);
	}

	/**
	 * Attach navHelp / panelDescription / hubHelp from settings-v2-editor-sidebar-copy.php.
	 * Inline keys already on navigation items are preserved (win over the copy file).
	 *
	 * @param array<int, array<string, mixed>> $categories
	 * @return array<int, array<string, mixed>>
	 */
	public static function merge_sidebar_v2_copy_into_categories( array $categories ) {
		$path = __DIR__ . '/data/settings-v2-editor-sidebar-copy.php';
		if ( ! is_readable( $path ) ) {
			return $categories;
		}
		$copy = require $path;
		if ( ! is_array( $copy ) ) {
			return $categories;
		}
		$by_cat   = isset( $copy['categories'] ) && is_array( $copy['categories'] ) ? $copy['categories'] : array();
		$by_path  = isset( $copy['hubHelpByGroupedPath'] ) && is_array( $copy['hubHelpByGroupedPath'] ) ? $copy['hubHelpByGroupedPath'] : array();
		$by_label = isset( $copy['hubHelpByDrillLabel'] ) && is_array( $copy['hubHelpByDrillLabel'] ) ? $copy['hubHelpByDrillLabel'] : array();

		foreach ( $categories as $i => $cat ) {
			if ( ! is_array( $cat ) ) {
				continue;
			}
			$name = isset( $cat['name'] ) && is_string( $cat['name'] ) ? $cat['name'] : '';
			if ( '' !== $name && isset( $by_cat[ $name ] ) && is_array( $by_cat[ $name ] ) ) {
				foreach ( array( 'navHelp', 'panelDescription' ) as $key ) {
					if ( empty( $cat[ $key ] ) && ! empty( $by_cat[ $name ][ $key ] ) && is_string( $by_cat[ $name ][ $key ] ) ) {
						$categories[ $i ][ $key ] = $by_cat[ $name ][ $key ];
					}
				}
			}
			if ( isset( $cat['hubSections'] ) && is_array( $cat['hubSections'] ) ) {
				$categories[ $i ]['hubSections'] = self::merge_sidebar_v2_hub_help_into_sections(
					$cat['hubSections'],
					$by_path,
					$by_label
				);
			}
		}
		return $categories;
	}

	/**
	 * @param array<int, array<string, mixed>> $sections
	 * @param array<string, string>            $by_path
	 * @param array<string, string>            $by_label
	 * @return array<int, array<string, mixed>>
	 */
	private static function merge_sidebar_v2_hub_help_into_sections( array $sections, array $by_path, array $by_label ) {
		foreach ( $sections as $i => $section ) {
			if ( ! is_array( $section ) ) {
				continue;
			}
			$type = isset( $section['type'] ) && is_string( $section['type'] ) ? $section['type'] : '';
			if ( 'submenu' === $type && isset( $section['items'] ) && is_array( $section['items'] ) ) {
				$sections[ $i ]['items'] = self::merge_sidebar_v2_hub_help_into_sections(
					$section['items'],
					$by_path,
					$by_label
				);
				continue;
			}
			if ( ! empty( $section['hubHelp'] ) && is_string( $section['hubHelp'] ) ) {
				continue;
			}
			if ( 'field' === $type ) {
				$path = isset( $section['groupedPath'] ) && is_string( $section['groupedPath'] )
					? trim( $section['groupedPath'] )
					: '';
				if ( '' !== $path && ! empty( $by_path[ $path ] ) && is_string( $by_path[ $path ] ) ) {
					$sections[ $i ]['hubHelp'] = $by_path[ $path ];
				}
				continue;
			}
			if ( 'drill' === $type ) {
				$label = isset( $section['label'] ) && is_string( $section['label'] )
					? trim( $section['label'] )
					: '';
				if ( '' !== $label && ! empty( $by_label[ $label ] ) && is_string( $by_label[ $label ] ) ) {
					$sections[ $i ]['hubHelp'] = $by_label[ $label ];
				}
			}
		}
		return $sections;
	}
}
