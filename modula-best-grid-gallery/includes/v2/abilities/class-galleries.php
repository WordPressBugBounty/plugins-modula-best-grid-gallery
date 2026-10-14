<?php
/** Lite-owned free gallery operations contributed through the v1 provider protocol. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Galleries {
	public const PROVIDER = 'modula-lite-galleries';

	public static function names(): array {
		return array_merge(
			array( Integration::DISCOVER, Integration::LIST_GALLERIES, Integration::READ_GALLERY, Creation::OPERATION, Requests::RECOVER, Update::OPERATION, Composition::OPERATION, Embedded::OPERATION, Batch::OPERATION ),
			Lifecycle::operations()
		);
	}

	public static function boot(): void {
		$map = Integration::callback_map();
		$ops = array();
		foreach ( self::names() as $name ) {
			$ops[ $name ] = array( 'execute' => $map[ $name ] );
		}
		Providers::contribute(
			array(
				'provider'   => self::PROVIDER,
				'protocol'   => Providers::PROTOCOL,
				'operations' => $ops,
			)
		);
		Outcomes::register_recovery(
			Creation::OPERATION,
			static function ( array $record ) {
				return Creation::can_create( $record['publication'] ) && ( ! $record['target'] || Integration::can_read_post( (int) $record['target'] ) ) && Creation::can_use_attachments( $record['attachment_ids'] );
			}
		);
		foreach ( array( Update::OPERATION, Composition::OPERATION, Embedded::OPERATION, Batch::OPERATION ) as $name ) {
			Outcomes::register_recovery( $name, array( Requests::class, 'can_recover_record' ) );
		}
		foreach ( Lifecycle::operations() as $name ) {
			Outcomes::register_recovery( $name, array( Lifecycle::class, 'can_recover' ) );
		}
	}
}
