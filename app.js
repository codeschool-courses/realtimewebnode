/*jslint node: true, nomen: true, unparam: true, white: true */
(function() {

	'use strict';

	var storeMessage,
	express = require( 'express' ),
	app = express(),
	http = require( 'http' ),
	server = http.createServer(app),
	io = require( 'socket.io' ).listen(server),
	redis = require( 'redis' ),
	redisClient = redis.createClient(),
	path = require( 'path' ),
	port = Number( process.env.PORT || 8080 ),
	max_messages = 100;

	server.listen( port, function() {
		console.log( "Listening on " + port );
	});

	app.use( express.static( path.join( __dirname, 'public' ) ) );

	app.get('/', function ( req, res ) {
		res.sendfile( __dirname + '/index.html' );
	});

	redisClient.ping( function( reply ) {
		if ( reply !== null && reply.indexOf( 'ECONNREFUSED' ) > -1 ) {
			console.log( 'error: cannot connect with the redis server' );
			process.exit(1);
		}
	});

	redisClient.on( 'error', function( err ) {
		console.log( 'error : ' + err );
	});

	storeMessage = function( name, data ) {
		var message = JSON.stringify({
			name:name,
			data:data
		});

		// store up to max_messages
		redisClient.lpush( 'messages', message, function( error, response ) {
			redisClient.ltrim( 'messages', 0, max_messages );
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

		client.on( 'flushall', function() {
			redisClient.flushall();
		});
	});
}());
