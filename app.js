var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var redis = require('redis');
var redisClient = redis.createClient();

server.listen(8080);

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

redisClient.on('error', function(err) { console.log( 'error : ' + err ); });

var storeMessage = function( name, data ) {

	var message = JSON.stringify({name:name, data:data});

	// store up to 10 messages
	redisClient.lpush('messages', message, function(error, response){
		redisClient.ltrim('messages', 0, 10);
	});

};

io.sockets.on( 'connection', function ( client ) {

	client.on( 'join', function( name ) {

		client.set( 'nickname', name );
		client.broadcast.emit( 'add chatter', name ); // tell other chatters about this new chatter
		redisClient.sadd( 'chatters', name ); // add the new chatter to the redis chatter set

		// add all current chatters to the current client’s chatters list
		redisClient.smembers( 'chatters', function( error, names ) {
			names.forEach( function( name ) {
				client.emit( 'add chatter', name );
			});
		});

		// add latest chat messages to current client
		redisClient.lrange( 'messages', 0, -1, function( error, messages ) {

			messages = messages.reverse();

			messages.forEach( function( message ) {
				message = JSON.parse( message );
				client.emit( 'messages',message.name + ' : ' + message.data );
			});

		});

	});


	client.on( 'messages', function( message ) {

		client.get('nickname',function( error, name ) {
			storeMessage( name, message );
			client.broadcast.emit( 'messages', name + ' : ' + message );
		});

	});


	client.on( 'disconnect', function( name ) {

		client.get( 'nickname', function( error, name ) {
			client.broadcast.emit( 'remove chatter', name );
			redisClient.srem( 'chatters', name );
		});

	});

});