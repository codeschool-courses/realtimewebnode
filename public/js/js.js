/*global io, prompt */
/*jslint browser: true, white: true */
(function() {

	'use strict';

	var nickname,
	server = io.connect('http://localhost:8080'),
	chatters = document.getElementById('chatters'),
	chat_input = document.getElementById('chat-input'),
	chat_console = document.getElementById('chat-console');

	function removeChatter( name ) {
		var current_chatters = document.querySelectorAll('[data-name]'),
			i,
			ii = current_chatters.length;

		for ( i = 0; i < ii; i += 1 ) {
			if ( name === current_chatters[i].getAttribute('data-name') ) {
				current_chatters[i].parentNode.removeChild( current_chatters[i] );
				break;
			}
		}
	}

	function insertChatter( name ) {
		var new_chatter = document.createElement('li');
		new_chatter.setAttribute( 'data-name', name );
		new_chatter.setAttribute( 'class', 'connected' );
		new_chatter.innerHTML = name;
		chatters.appendChild( new_chatter );
	}

	function insertMessage( message ) {
		var new_message = document.createElement('span');
		new_message.innerHTML = message + '<br/>';
		chat_console.appendChild( new_message );
		chat_console.scrollTop = chat_console.scrollHeight;
	}

	document.getElementById('chat-form').onsubmit = function( evt ) {
		evt.preventDefault();
		server.emit( 'messages', chat_input.value );
		insertMessage( nickname + ' : ' + chat_input.value );

		if ( chat_input.value === 'flushall' ) {
			server.emit( 'flushall' );
		}

		chat_input.value = null;
	};

	server.on( 'messages', function( data ) {
		insertMessage( data );
	});

	server.on( 'connect', function() {
		chat_console.innerHTML = '<span class="connected">connected to the chat server</span><br/>';
		nickname = prompt( 'what is your nickanme?' );
		server.emit( 'join', nickname );
	});

	server.on( 'add chatter', insertChatter );
	server.on( 'remove chatter', removeChatter );

}());
