'use strict';

module.exports = {

	jwt: {
		algorithm: 'HS512',
		secret: 'eL9zeUaU7DN208LSWhFtTO0PX0KhZ0LB',
		duration: 5184000 // in seconds, in 60 days
	},

	server: {
		host: '0.0.0.0',
		port: 3006,
		wsPort: 3001,
		cors: {
			origin: ['*'],
			credentials: true
		},

		debug : true,
		log: 'verbose'
	},

	database: 'mongodb://localhost/api-development',

	crypto: {
		saltRounds: 10,
		hash: 'sha256',
		digest: 'base64',
		algorithm: 'aes-256-ctr',
		password: 'd6F3Efeq'
	},

	/**
	 * https://github.com/luin/ioredis/blob/master/API.md#new_Redis_new
	 */
	redis: {
		port: 6379,          // Redis port
		host: '127.0.0.1',   // Redis host
		family: 4,           // 4 (IPv4) or 6 (IPv6)
		//password: 'auth',
		db: 0
	}
};
