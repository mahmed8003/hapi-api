'use strict';

const Path = require('path');
const Hapi = require('hapi');
const HapiApiVersion = require('hapi-api-version');
const Bluebird = require('bluebird');
const HapiAuthJwt = require('hapi-auth-jwt2');


const HapiPino = require('./plugins/HapiPino');

const MongoDatabase = require('./services/MongoDatabase');
const RedisClient = require('./services/RedisClient');

const Routes = require('./Routes');

const config = require('./config');
const ValidateRequest = require('./policies/ValidateRequest');

MongoDatabase.connect({uri: config.database});
//RedisClient.connect(config.redis);


/*
 Server setup
 */
const serverOptions = {
	debug: config.server.debug,
	connections: {
		routes: {
			cors: config.server.cors
		}
	}
};
if (config.env !== 'production') {
	serverOptions.debug = {request: ['error']};
}
/*

 */
const server = new Hapi.Server(serverOptions);
server.connection({
	port: config.server.port
});

/*

 */
server.app.redis = RedisClient.getClient();
server.decorate('request', 'redis', RedisClient.getClient());


//
const plugins = [];

// Logger
plugins.push({
	register: HapiPino,
	options: {
		prettyPrint: config.env !== 'production'
	}
});

plugins.push({
	register: HapiAuthJwt,
	options: {
		prettyPrint: config.env !== 'production'
	}
});

/*

 plugins.push({
 register: HapiApiVersion,
 options: {
 validVersions: [1],
 defaultVersion: 1,
 vendorName: 'mysuperapi'
 }
 });

 */


if (config.env !== 'production') {
	const Inert = require('inert');
	const Blipp = require('blipp');
	const Vision = require('vision');
	const HapiSwagger = require('hapi-swagger');
	const Pack = require('./package');

	plugins.push(Inert);
	plugins.push(Blipp);
	plugins.push(Vision);
	plugins.push({
		'register': HapiSwagger,
		'options': {
			basePath: '/',
			pathPrefixSize: 1,
			info: {
				'title': 'Hapi API Documentation',
				'version': Pack.version
			}
		}
	});
}


//

/**
 * Transforming error json
 */
server.ext('onPreResponse', function (request, reply) {
	const response = request.response;
	if (!response.isBoom) {
		return reply.continue();
	} else {
		response.output.payload = {
			error: response.output.payload
		};
		return reply.continue();
	}
});



//
server.register(plugins, function (err) {
	if (err) {
		throw err;
	}

	server.auth.strategy('jwt', 'jwt', true,
		{
			key: config.jwt.secret, // Never Share your secret key
			validateFunc: ValidateRequest,      // validate function defined above
			verifyOptions: {
				//algorithms: [config.jwt.algorithm]    // specify your secure algorithm
			}
		});

	/**
	 * setting routes
	 */
	server.route(Routes.endpoints);


	server.start(function (err) {
		if (err) {
			throw err;
		}
		console.log(`Server started at: ${server.info.uri} with [${Object.keys(server.plugins).join(', ')}] enabled, ENV = ${config.env}`)
	});
});
