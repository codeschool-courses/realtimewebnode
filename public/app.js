;(function(){

	var socket = io.connect();
	var chatters = document.getElementById('chatters');
	var chat_input = document.getElementById('chat-input');
	var chat_console = document.getElementById('chat-console');
	var nickname;

	function removeChatter(name) {
		var current_chatters = document.querySelectorAll('[data-name]'),
			i;

		for (var i = 0; i < current_chatters.length; i += 1) {
			if (name === current_chatters[i].getAttribute('data-name')) {
				current_chatters[i].parentNode.removeChild(current_chatters[i]);
				break;
			};
		};
	};

	function insertChatter(name) {
		var new_chatter = document.createElement('li');
		new_chatter.setAttribute('data-name', name);
		new_chatter.setAttribute('class', 'connected');
		new_chatter.innerHTML = name;
		chatters.appendChild(new_chatter);
	};

	function insertMessage(message) {
		var new_message = document.createElement('span');
		new_message.innerHTML = message + '<br/>';
		chat_console.appendChild(new_message);
	};

	document.getElementById('chat-form').onsubmit = function(e) {
		e.preventDefault();
		socket.emit('messages', chat_input.value);
		insertMessage(nickname + ' : ' + chat_input.value);
		chat_input.value = null;
	};

	socket.on('messages', function(data) {
		insertMessage(data);
	});

	socket.on('connect', function(data) {
		chat_console.innerHTML = '<span class="connected">connected to the chat socket</span><br/>';
		nickname = prompt('what is your nickanme?');
		socket.emit('join', nickname);
	});

	socket.on('add chatter', insertChatter);
	socket.on('remove chatter', removeChatter);

}());

