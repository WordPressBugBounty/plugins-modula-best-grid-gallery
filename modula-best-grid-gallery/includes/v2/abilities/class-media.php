<?php
/** Lite-owned free media, attachment and favorite operations. */
namespace Modula\V2\Abilities;

defined( 'ABSPATH' ) || exit;

final class Media {
	public const PROVIDER = 'modula-lite-media';

	/** @return array<int,string> */
	public static function names(): array {
		return array_merge(
			array_keys( Media_Folders::callbacks() ),
			array_keys( Attachments::callbacks() ),
			array_keys( Attachment_Image::callbacks() ),
			array_keys( Attachment_Lifecycle::callbacks() ),
			array_keys( Replacement::callbacks() ),
			Collections::free_names(),
			array( Batch::MEDIA )
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
		foreach ( Media_Folders::mutations() as $name ) {
			Outcomes::register_recovery( $name, array( Media_Folders::class, 'can_recover' ) );
		}
		Outcomes::register_recovery(
			Attachments::UPDATE,
			static function ( array $record ) {
				return Attachments::can_read( (int) $record['target'] );
			}
		);
		foreach ( Attachment_Lifecycle::operations() as $name ) {
			Outcomes::register_recovery( $name, array( Attachment_Lifecycle::class, 'can_recover' ) );
		}
		Outcomes::register_recovery( Replacement::WRITE, array( Replacement::class, 'can_recover' ) );
		foreach ( Collections::free_names() as $name ) {
			if ( ! Contract::is_mutation( $name ) ) {
				continue;
			}
			Outcomes::register_recovery( $name, array( Collections::class, 'can_recover' ) );
		}
		Outcomes::register_recovery( Batch::MEDIA, array( Requests::class, 'can_recover_record' ) );
	}
}
