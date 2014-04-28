/*jslint node: true, nomen: true, unparam: true, white: true */
(function() {

	'use strict';

	var redisToGo,
	redis,
	redisClient,
	storeMessage,
	express = require( 'express' ),
	app = express(),
	http = require( 'http' ),
	server = http.createServer( app ),
	io = require( 'socket.io' ).listen( server ),
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

	if ( process.env.REDISTOGO_URL ) {
		redisToGo = require( 'url' ).parse( process.env.REDISTOGO_URL );
		redis = require( 'redis' );
		redisClient = redis.createClient( redisToGo.port, redisToGo.hostname );
		redisClient.auth( redisToGo.auth.split( ':' )[1] );
	} else {
		redis = require( 'redis' );
		redisClient = redis.createClient();
	}

	redisClient.ping( function( reply ) {
		if ( reply !== null && reply.indexOf( 'ECONNREFUSED' ) > -1 ) {
			console.log( 'error: cannot connect with the redis server' );
			process.exit( 'error: cannot connect with the redis server' );
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
					client.emit( 'messages', message.name + ' : ' + message.data );
				});
			});
		});

		client.on( 'messages', function( message ) {
			client.get( 'nickname', function( error, name ) {
				if ( message.indexOf( 'udacity' ) > -1 ) {
					client.broadcast.emit( 'messages', name + ' : ' + '<p>Education is no longer a one-time event but a lifelong experience. Education should be less passive listening (no long lectures) and more active doing. Education should empower students to succeed not just in school but in life.</p><p>We are reinventing education for the 21st century by bridging the gap between real-world skills, relevant education, and employment. Our students will be fluent in new technology, modern mathematics, science, and critical thinking. They will marry skills with creativity and humanity to learn, think, and do. Udacians are curious and engaged world citizens.</p><p>Interested in working with us? View our openings.</p>' );
				} else {
					storeMessage( name, message );
					client.broadcast.emit( 'messages', name + ' : ' + message );
				}
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
