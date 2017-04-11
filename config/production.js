'use strict';

module.exports = {

	log: 'error',

	server: {
		host: '0.0.0.0',
		port: process.env.PORT,
		wsPort: process.env.WS_PORT,
		cors: {
			origin: ['*'],
			credentials: true
		},

		debug : false,
		log: 'debug'
	},

	database: 'mongodb://localhost/api-production',

	crypto: {
		saltRounds: 10,
		hash: 'sha256',
		digest: 'base64',
		algorithm: 'aes-256-ctr',
		password: 'd6F3Efeq'
	}
};
