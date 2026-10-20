<?php
/**
 * Projects the Modula Settings tabs into settings groups, sections and cards.
 *
 * The tabs that Modula_Settings::get_tabs() builds (and that Pro extends
 * through `modula_admin_page_subtabs` and `modula_admin_page_main_tabs`)
 * stay unchanged; this class only regroups them for the redesigned page.
 *
 * @package Modula
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class Modula_Settings_Sections
 */
class Modula_Settings_Sections {

	/**
	 * The group Lite emits. Other groups come from `modula_settings_groups`.
	 */
	const GENERAL_GROUP = 'general';

	/**
	 * Known subtabs: settings section, order inside it, and owner. The keys
	 * are the subtab keys inside the main tabs (`imageseo` is Modula AI).
	 *
	 * The owner is the plugin that defines the subtab: Lite also defines the
	 * locked Pro features it shows (Standalone, Watermark…), Pro defines the
	 * subtabs it adds through the settings filters.
	 */
	const SUBTABS = array(
		'standalone'      => array(
			'section' => 'galleries',
			'order'   => 10,
			'owner'   => 'lite',
		),
		'shortcodes'      => array(
			'section' => 'galleries',
			'order'   => 20,
			'owner'   => 'lite',
		),
		'image_licensing' => array(
			'section' => 'galleries',
			'order'   => 30,
			'owner'   => 'lite',
		),
		'new_galleries'   => array(
			'section' => 'galleries',
			'order'   => 40,
			'owner'   => 'pro',
		),
		'compression'     => array(
			'section' => 'performance',
			'order'   => 10,
			'owner'   => 'lite',
		),
		'watermark'       => array(
			'section' => 'protection',
			'order'   => 10,
			'owner'   => 'lite',
		),
		'image_guardian'  => array(
			'section' => 'protection',
			'order'   => 20,
			'owner'   => 'pro',
		),
		'imageseo'        => array(
			'section' => 'ai',
			'order'   => 10,
			'owner'   => 'lite',
		),
		'mcp_connections' => array(
			'section' => 'ai',
			'order'   => 20,
			'owner'   => 'lite',
		),
		'roles'           => array(
			'section' => 'roles',
			'order'   => 10,
			'owner'   => 'lite',
		),
		'social_media'    => array(
			'section' => 'connections',
			'order'   => 10,
			'owner'   => 'lite',
		),
		'image_proofing'  => array(
			'section' => 'email',
			'order'   => 10,
			'owner'   => 'pro',
		),
		'migrate'         => array(
			'section' => 'migrate',
			'order'   => 10,
			'owner'   => 'lite',
		),
		'diagnostics'     => array(
			'section' => 'diagnostics',
			'order'   => 10,
			'owner'   => 'lite',
		),
	);

	/**
	 * Section of each known main tab, for subtabs the table above does not
	 * know.
	 */
	const MAIN_TABS = array(
		'display'        => 'galleries',
		'optimization'   => 'performance',
		'protection'     => 'protection',
		'ai'             => 'ai',
		'social_media'   => 'connections',
		'image_proofing' => 'email',
		'migrate'        => 'migrate',
		'diagnostics'    => 'diagnostics',
	);

	/**
	 * Unknown subtabs follow the known ones, in the order they were added.
	 */
	const UNKNOWN_ORDER = 1000;

	/**
	 * Owner of subtabs the table does not know: Lite's are all in the table,
	 * so an unknown one comes from Pro (or an extension using its filters).
	 */
	const UNKNOWN_OWNER = 'pro';

	/**
	 * Kind of a card drawn from settings fields; any subtab that does not ask
	 * for another kind.
	 */
	const SETTINGS_KIND = 'settings';

	/**
	 * Kind of the license card (ADR 0049): Lite draws it, Pro registers it
	 * with a subtab `'kind' => 'license'`. It saves through its own actions.
	 */
	const LICENSE_KIND = 'license';

	/**
	 * Settings sections in display order, with their labels. The ids are
	 * stable: the page address (`?section=`) and the search index use them.
	 *
	 * @return array<string, string> Label by section id.
	 */
	private static function section_labels() {
		return array(
			'galleries'   => esc_html__( 'Galleries', 'modula-best-grid-gallery' ),
			'performance' => esc_html__( 'Performance', 'modula-best-grid-gallery' ),
			'protection'  => esc_html__( 'Protection', 'modula-best-grid-gallery' ),
			'ai'          => esc_html__( 'AI', 'modula-best-grid-gallery' ),
			'roles'       => esc_html__( 'Roles', 'modula-best-grid-gallery' ),
			'connections' => esc_html__( 'Connections', 'modula-best-grid-gallery' ),
			'email'       => esc_html__( 'Email', 'modula-best-grid-gallery' ),
			'migrate'     => esc_html__( 'Migrate', 'modula-best-grid-gallery' ),
			'diagnostics' => esc_html__( 'Debug', 'modula-best-grid-gallery' ),
		);
	}

	/**
	 * Groups → sections → cards for the given main tabs.
	 *
	 * Each card is `{ id, label, tab, owner, kind, locked, badge, saves, config }`:
	 * - `id` is the subtab key and `tab` its main tab slug;
	 * - `owner` is `lite` or `pro` (see SUBTABS);
	 * - `kind` is `license` for a subtab that sets `'kind' => 'license'`,
	 *   else `settings`;
	 * - `badge` is the required plan (`starter`, `trio`, `business`; the
	 *   extensions code replaces get_tabs()' `PRO` placeholder) or null;
	 * - `saves` is false for main tabs that set `'save' => false` (Migrate)
	 *   and for license cards, which are left out without Compatible Pro;
	 * - `config` is the subtab config unchanged.
	 * Sections without cards are left out.
	 *
	 * @param array $tabs Main tabs, as Modula_Settings::get_tabs() returns them.
	 * @return array[] Groups: `{ id, label, sections: { id, label, cards }[] }`.
	 */
	public static function project( $tabs ) {
		$entries  = self::subtab_entries( $tabs );
		$sections = self::sections_for( $entries );

		foreach ( $entries as $sequence => $entry ) {
			list( $key, $subtab, $tab ) = $entry;

			$card = self::card( $key, $subtab, $tab );
			if ( self::LICENSE_KIND === $card['kind'] && ! self::has_license_card() ) {
				continue;
			}

			$section_id = self::section_for( $key, $tab, $sections );

			$sections[ $section_id ]['cards'][] = array(
				'order' => self::SUBTABS[ $key ]['order'] ?? ( self::UNKNOWN_ORDER + $sequence ),
				'card'  => $card,
			);
		}

		$groups = array(
			array(
				'id'       => self::GENERAL_GROUP,
				'label'    => esc_html__( 'General', 'modula-best-grid-gallery' ),
				'sections' => self::ordered_sections( $sections ),
			),
		);

		/**
		 * Filters the settings groups of the Modula Settings page.
		 *
		 * @param array[] $groups Groups with their sections and cards.
		 * @param array   $tabs   The main tabs they were projected from.
		 */
		return apply_filters( 'modula_settings_groups', $groups, $tabs );
	}

	/**
	 * Every subtab with its key and main tab, in tab order. Main tabs without
	 * a slug or a subtab list are skipped, and so are subtabs that are not
	 * arrays or are empty (MCP connections for a user who cannot manage it).
	 *
	 * @param mixed $tabs Main tabs.
	 * @return array[] `[ string $key, array $subtab, array $tab ]` entries.
	 */
	private static function subtab_entries( $tabs ) {
		$entries = array();
		foreach ( is_array( $tabs ) ? $tabs : array() as $tab ) {
			if ( ! self::is_valid_tab( $tab ) ) {
				continue;
			}
			$subtabs = array_filter(
				$tab['subtabs'],
				function ( $subtab ) {
					return is_array( $subtab ) && array() !== $subtab;
				}
			);
			foreach ( $subtabs as $key => $subtab ) {
				$entries[] = array( (string) $key, $subtab, $tab );
			}
		}

		return $entries;
	}

	/**
	 * Whether license cards can show: only with Compatible Pro, as on the
	 * Extensions page. Otherwise the license route refuses every action, so
	 * a card registered by an older Pro or another plugin is left out.
	 *
	 * @return bool
	 */
	private static function has_license_card() {
		return class_exists( 'Modula_License_Card' ) && Modula_License_Card::is_available();
	}

	/**
	 * @param mixed $tab Main tab.
	 * @return bool
	 */
	private static function is_valid_tab( $tab ) {
		return is_array( $tab )
			&& isset( $tab['slug'], $tab['subtabs'] )
			&& is_string( $tab['slug'] )
			&& is_array( $tab['subtabs'] );
	}

	/**
	 * Section a subtab falls into without the filter: the table's, else its
	 * main tab's, else a section of its own main tab.
	 *
	 * @param string $key Subtab key.
	 * @param array  $tab Its main tab.
	 * @return string Section id.
	 */
	private static function default_section( $key, $tab ) {
		return self::SUBTABS[ $key ]['section'] ?? self::MAIN_TABS[ $tab['slug'] ] ?? $tab['slug'];
	}

	/**
	 * The known sections in order, then one per main tab that has no section
	 * of its own, labelled like that tab. All exist before any subtab is
	 * placed, so the filter can move a subtab into any of them.
	 *
	 * @param array[] $entries Subtab entries.
	 * @return array Sections by id.
	 */
	private static function sections_for( $entries ) {
		$sections = array();
		foreach ( self::section_labels() as $id => $label ) {
			$sections[ $id ] = self::section( $id, $label );
		}
		foreach ( $entries as $entry ) {
			$section_id = self::default_section( $entry[0], $entry[2] );
			if ( ! isset( $sections[ $section_id ] ) ) {
				$sections[ $section_id ] = self::section( $section_id, self::tab_label( $entry[2] ) );
			}
		}

		return $sections;
	}

	/**
	 * Section of a subtab: its default, or the one
	 * `modula_settings_section_for_subtab` returns when that section exists;
	 * other filter values are ignored.
	 *
	 * @param string $key      Subtab key.
	 * @param array  $tab      Its main tab.
	 * @param array  $sections All sections, by id.
	 * @return string Section id.
	 */
	private static function section_for( $key, $tab, $sections ) {
		$default = self::default_section( $key, $tab );

		/**
		 * Filters the settings section a settings subtab is shown in.
		 *
		 * @param string $section_id Section id.
		 * @param string $key        Subtab key.
		 * @param string $tab_slug   Slug of its main tab.
		 */
		$section_id = apply_filters( 'modula_settings_section_for_subtab', $default, $key, $tab['slug'] );

		return is_string( $section_id ) && isset( $sections[ $section_id ] ) ? $section_id : $default;
	}

	/**
	 * @param string $id    Section id.
	 * @param string $label Section label.
	 * @return array
	 */
	private static function section( $id, $label ) {
		return array(
			'id'    => $id,
			'label' => $label,
			'cards' => array(),
		);
	}

	/**
	 * @param array $tab Main tab.
	 * @return string
	 */
	private static function tab_label( $tab ) {
		return isset( $tab['label'] ) && is_string( $tab['label'] ) ? $tab['label'] : $tab['slug'];
	}

	/**
	 * @param string $key    Subtab key.
	 * @param array  $subtab Subtab, as get_tabs() builds it.
	 * @param array  $tab    Its main tab.
	 * @return array Card.
	 */
	private static function card( $key, $subtab, $tab ) {
		$label  = $subtab['label'] ?? null;
		$badge  = $subtab['badge'] ?? null;
		$config = $subtab['config'] ?? null;
		$kind   = self::LICENSE_KIND === ( $subtab['kind'] ?? null ) ? self::LICENSE_KIND : self::SETTINGS_KIND;

		return array(
			'id'     => $key,
			'label'  => is_string( $label ) ? $label : $key,
			'tab'    => $tab['slug'],
			'owner'  => self::SUBTABS[ $key ]['owner'] ?? self::UNKNOWN_OWNER,
			'kind'   => $kind,
			'locked' => true === ( $subtab['locked'] ?? false ),
			'badge'  => is_string( $badge ) && '' !== $badge ? $badge : null,
			'saves'  => self::SETTINGS_KIND === $kind && false !== ( $tab['save'] ?? true ),
			'config' => is_array( $config ) ? $config : array(),
		);
	}

	/**
	 * Sections with cards, each card list sorted by order (ties keep the
	 * order they were added in).
	 *
	 * @param array $sections Sections by id, cards wrapped with their order.
	 * @return array[]
	 */
	private static function ordered_sections( $sections ) {
		$ordered = array();
		foreach ( $sections as $section ) {
			if ( empty( $section['cards'] ) ) {
				continue;
			}
			// Positions break ties: sort() is not stable before PHP 8.
			$positions = array_keys( $section['cards'] );
			$orders    = array_column( $section['cards'], 'order' );
			array_multisort( $orders, SORT_NUMERIC, $positions, SORT_NUMERIC, $section['cards'] );
			$section['cards'] = array_column( $section['cards'], 'card' );
			$ordered[]        = $section;
		}

		return $ordered;
	}
}
