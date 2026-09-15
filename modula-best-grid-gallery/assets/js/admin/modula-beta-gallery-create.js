( function () {
	'use strict';

	var data = window.modulaBetaGalleryCreate || {};
	var modal = document.getElementById( 'modula-beta-create-modal' );
	var pendingHref = '';

	document.addEventListener( 'click', function ( event ) {
		var convertLink = event.target.closest
			? event.target.closest( 'a[data-modula-convert-beta]' )
			: null;
		if ( ! convertLink ) {
			return;
		}
		var message = data.convertConfirm || '';
		if ( message && ! window.confirm( message ) ) {
			event.preventDefault();
		}
	} );

	if ( ! modal ) {
		return;
	}

	function isAbortedViewTransitionError( error ) {
		if ( ! error ) {
			return false;
		}
		var name = error.name || '';
		var message = error.message || '';
		if ( 'AbortError' === name && /transition/i.test( message ) ) {
			return true;
		}
		return (
			'InvalidStateError' === name &&
			/transition was aborted/i.test( message )
		);
	}

	function skipActiveViewTransition() {
		var active = document.activeViewTransition;
		if ( ! active ) {
			return;
		}
		try {
			if ( typeof active.skipTransition === 'function' ) {
				active.skipTransition();
			}
		} catch ( error ) {
			if ( ! isAbortedViewTransitionError( error ) ) {
				throw error;
			}
		}
		var swallow = function () {};
		if ( active.ready && typeof active.ready.catch === 'function' ) {
			active.ready.catch( swallow );
		}
		if ( active.finished && typeof active.finished.catch === 'function' ) {
			active.finished.catch( swallow );
		}
		if (
			active.updateCallbackDone &&
			typeof active.updateCallbackDone.catch === 'function'
		) {
			active.updateCallbackDone.catch( swallow );
		}
	}

	function navigateAdminHref( href ) {
		if ( ! href ) {
			return;
		}
		skipActiveViewTransition();
		try {
			window.location.assign( href );
		} catch ( error ) {
			if ( ! isAbortedViewTransitionError( error ) ) {
				throw error;
			}
			try {
				window.location.replace( href );
			} catch ( retryError ) {
				if ( ! isAbortedViewTransitionError( retryError ) ) {
					throw retryError;
				}
				window.setTimeout( function () {
					window.location.href = href;
				}, 0 );
			}
		}
	}

	function isCreateUrl( href ) {
		if ( ! href ) {
			return false;
		}
		return (
			href.indexOf( 'post-new.php' ) !== -1 &&
			href.indexOf( 'modula-gallery' ) !== -1
		);
	}

	function withChoice( href, choice ) {
		try {
			var url = new URL( href, window.location.origin );
			url.searchParams.set( data.queryArg || 'modula_editor', choice );
			if ( data.createNonce ) {
				url.searchParams.set( '_wpnonce', data.createNonce );
			}
			return url.toString();
		} catch ( e ) {
			return href;
		}
	}

	function openModal( href ) {
		skipActiveViewTransition();
		pendingHref = href || '';
		modal.hidden = false;
		modal.classList.add( 'is-open' );
		var primary = modal.querySelector( '[data-modula-beta-choice="beta"]' );
		if ( primary ) {
			primary.focus();
		}
	}

	function closeModal() {
		skipActiveViewTransition();
		modal.hidden = true;
		modal.classList.remove( 'is-open' );
		pendingHref = '';
	}

	function goChoice( choice ) {
		skipActiveViewTransition();
		var href = pendingHref || data.postNewBase;
		closeModal();
		if ( data.awaitingChoice && data.choiceUrl ) {
			var dest = data.choiceUrl;
			dest +=
				( dest.indexOf( '?' ) === -1 ? '?' : '&' ) +
				'choice=' +
				encodeURIComponent( choice );
			navigateAdminHref( dest );
			return;
		}
		if ( ! href ) {
			return;
		}
		navigateAdminHref( withChoice( href, choice ) );
	}

	function dismissModal() {
		skipActiveViewTransition();
		var listUrl = data.awaitingChoice ? data.listUrl : '';
		closeModal();
		if ( listUrl ) {
			navigateAdminHref( listUrl );
		}
	}

	document.addEventListener( 'click', function ( event ) {
		var link = event.target.closest
			? event.target.closest( 'a' )
			: null;
		if ( ! link || data.awaitingChoice ) {
			return;
		}
		if ( ! isCreateUrl( link.href ) ) {
			return;
		}
		event.preventDefault();
		openModal( link.href );
	} );

	modal.addEventListener( 'click', function ( event ) {
		var dismiss = event.target.closest
			? event.target.closest( '[data-modula-beta-dismiss]' )
			: null;
		if ( dismiss ) {
			dismissModal();
			return;
		}
		var choiceBtn = event.target.closest
			? event.target.closest( '[data-modula-beta-choice]' )
			: null;
		if ( choiceBtn ) {
			goChoice( choiceBtn.getAttribute( 'data-modula-beta-choice' ) );
		}
	} );

	document.addEventListener( 'keydown', function ( event ) {
		if ( 'Escape' !== event.key ) {
			return;
		}
		if ( modal.hidden ) {
			return;
		}
		dismissModal();
	} );

	if ( data.awaitingChoice ) {
		openModal( '' );
	}
} )();
