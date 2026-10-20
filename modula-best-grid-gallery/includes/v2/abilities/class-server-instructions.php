<?php
/** Initialize instructions for the default MCP server, built from the tools it lists. */
namespace Modula\V2\Abilities;

use WP\MCP\Domain\Utils\McpNameSanitizer;

defined( 'ABSPATH' ) || exit;

final class Server_Instructions {
	/**
	 * Instructions for a model working with Modula through the default server.
	 *
	 * Sentences that name a tool appear only when that tool is listed, so the text never
	 * names a tool the site does not have in its Lite or Compatible Pro mode. The server is
	 * built once per request, not per connection, so read-only and agent limits are stated
	 * conditionally; administrators also use this server directly.
	 *
	 * @param string[] $tools Ability names the default server lists as tools.
	 */
	public static function text( array $tools ): string {
		$lines    = array( 'Modula manages image and video galleries on this WordPress site.' );
		$discover = self::listed_tool( $tools, Integration::DISCOVER );
		if ( null !== $discover ) {
			$lines[] = sprintf( 'Start with %s: page through it to see every Modula operation, whether it is available here, its input schema and the gallery settings it accepts.', $discover );
		}
		$lines[] = 'Gallery tools work on Beta galleries only; classic galleries are outside this integration.';
		if ( self::lists_any( $tools, array( Contract::class, 'is_mutation' ) ) ) {
			$lines[] = self::request_line( self::listed_tool( $tools, Requests::RECOVER ) );
		}
		if ( self::lists_any( $tools, array( Catalog::class, 'requires_compatible_pro' ) ) ) {
			$lines[] = 'Some tools need Modula Pro or a plan feature. A locked tool returns an explanation of what is missing instead of running; pass it on to the user rather than working around it.';
		}
		$lines[] = self::agent_line( in_array( Site_Settings::EXTENSION, $tools, true ) );
		return implode( "\n", $lines );
	}

	/**
	 * What the Modula agent may and may not change (ADR 0045).
	 *
	 * @param bool $extensions Whether the extension toggle is listed.
	 */
	private static function agent_line( bool $extensions ): string {
		$scope = 'you work only with Modula galleries, albums, presets, media and Modula settings';
		if ( $extensions ) {
			$scope .= ', and you can turn on or off the Modula extensions included in the site\'s license';
		}
		return 'When you are connected as the Modula agent, ' . $scope . ': changes to WordPress settings, plugins, users, posts or pages are refused, and a read-only connection lists no tools that make changes.';
	}

	/**
	 * How to identify a change, and how to recover a lost one when the recovery tool is listed.
	 *
	 * @param string|null $recover Client name of the recovery tool, or null when it is not listed.
	 */
	private static function request_line( ?string $recover ): string {
		$line = 'Every tool that makes a change takes a request_id you choose; keep it until the change is confirmed.';
		if ( null === $recover ) {
			return $line;
		}
		return $line . sprintf( ' If a response is lost or uncertain, call %s with the same request_id instead of repeating the change with a new one.', $recover );
	}

	/**
	 * Whether any listed ability satisfies the predicate.
	 *
	 * @param string[] $tools     Ability names; another filter may have added other values.
	 * @param callable $predicate Receives an ability name.
	 */
	private static function lists_any( array $tools, callable $predicate ): bool {
		foreach ( $tools as $name ) {
			if ( is_string( $name ) && $predicate( $name ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * The tool name a client sees for a listed ability, as the adapter derives it when it
	 * creates the server. Null when the ability is not listed or has no valid tool name, so
	 * the sentence naming it is left out.
	 *
	 * @param string[] $tools   Ability names the default server lists as tools.
	 * @param string   $ability Ability name.
	 */
	private static function listed_tool( array $tools, string $ability ): ?string {
		if ( ! in_array( $ability, $tools, true ) ) {
			return null;
		}
		$name = McpNameSanitizer::sanitize_name( $ability );
		return is_string( $name ) ? $name : null;
	}
}
