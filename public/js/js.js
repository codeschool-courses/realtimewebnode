/*global console, io, prompt */
/*jslint browser: true, white: true */
(function() {

	'use strict';


	if ( window.io === undefined ) {
		console.log( 'oops ... socket.io did’t load' );
		return;
	}


	var chattr = {

		nickname: undefined,
		server: io.connect(
			'//' +
			window.location.hostname +
			( window.location.port ? ':' + window.location.port : '' )
		),
		chatters: document.getElementById( 'chatters' ),
		chat_form: document.getElementById( 'chat-form' ),
		chat_input: document.getElementById( 'chat-input' ),
		chat_console: document.getElementById( 'chat-console' ),


		handleFormSubmit: function( evt ) {
			evt.preventDefault();
			chattr.server.emit( 'messages', chattr.chat_input.value );
			chattr.insertMessage( chattr.nickname + ' : ' + chattr.chat_input.value );

			if ( chattr.chat_input.value === 'flushall' ) {
				chattr.server.emit( 'flushall' );
			}

			chattr.chat_input.value = null;
		},

		handleServerConnect: function() {
			chattr.chat_console.innerHTML = '<span class="connected">connected to the chat server</span><br/>';
			chattr.nickname = prompt( 'what is your nickanme?' );
			chattr.server.emit( 'join', chattr.nickname );
		},

		init: function() {
			chattr.chat_form.addEventListener( 'submit', chattr.handleFormSubmit, false );
			chattr.server.on( 'messages', chattr.insertMessage );
			chattr.server.on( 'connect', chattr.handleServerConnect );
			chattr.server.on( 'add chatter', chattr.insertChatter );
			chattr.server.on( 'remove chatter', chattr.removeChatter );
		},

		insertChatter: function( name ) {
			var new_chatter = document.createElement('li');
			new_chatter.setAttribute( 'data-name', name );
			new_chatter.setAttribute( 'class', 'connected' );
			new_chatter.innerHTML = name;
			chattr.chatters.appendChild( new_chatter );
		},

		insertMessage: function( message ) {
			var new_message = document.createElement('span');
			new_message.innerHTML = message + '<br/>';
			chattr.chat_console.appendChild( new_message );
			chattr.chat_console.scrollTop = chattr.chat_console.scrollHeight;
		},

		removeChatter: function( name ) {
			var i,
			current_chatters = document.querySelectorAll( '[data-name]' ),
			ii = current_chatters.length;

			for ( i = 0; i < ii; i += 1 ) {
				if ( name === current_chatters[i].getAttribute( 'data-name' ) ) {
					current_chatters[i].parentNode.removeChild( current_chatters[i] );
					break;
				}
			}
		}

	};

	chattr.init();

}());
