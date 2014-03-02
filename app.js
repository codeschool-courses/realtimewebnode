var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var redisClient = require('./lib/redisClient.js');

var port = process.env.PORT || 8000;
server.listen(port);
console.log('Server listening on port %d', port);

/**
 *	Serve static files from `public`
 */

app.use(express.static(__dirname + '/public'));

/**
 *	Handle all routes to the webserver
 */

app.get('/*', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

/**
 *	Store a message in redis
 *
 *	@function storeMessage
 *	@param {String} name
 *	@param {Object} data
 */

function storeMessage (name, data) {
	var message = JSON.stringify({name:name, data:data});

	// store up to 10 messages
	redisClient.lpush('messages', message, function(error) {
		if (error) throw error;
		redisClient.ltrim('messages', 0, 10);
	});
};

/**
 *	Handle connnection Websockets
 */

io.sockets.on('connection', function (client) {


	/**
	 *	When users join, set their nickname and broadcast they are here
	 *	Add the user to redis set `chatters`
	 */

	client.on('join', function(name) {
		client.set('nickname', name);
		client.broadcast.emit('add chatter', name); 
		redisClient.sadd('chatters', name);

		/**
		 *	Add all current chatters to the current client’s chatters list
		 */

		redisClient.smembers('chatters', function(error, names) {
			names.forEach(function(name) {
				client.emit('add chatter', name);
			});
		});

		/**
		 *	Add latest chat messages to current client
		 */
		
		redisClient.lrange('messages', 0, -1, function( error, messages) {
			messages = messages.reverse();

			messages.forEach(function(message) {
				message = JSON.parse(message);
				client.emit('messages',message.name + ' : ' + message.data);
			});
		});
	});

	/**
	 *	When a message comes through, get the name and broadcast the messsage
	 *	Store the message after we get the nicname
	 */

	client.on('messages', function(message) {
		client.get('nickname',function(error, name) {
			storeMessage(name, message);
			client.broadcast.emit('messages', name + ' : ' + message);
		});
	});

	/**
	 *	When a user disconnects, get their name and broadcast they left
	 */

	client.on('disconnect', function(name) {
		client.get('nickname', function(error, name) {
			client.broadcast.emit('remove chatter', name);
			redisClient.srem('chatters', name);
		});
	});
});
