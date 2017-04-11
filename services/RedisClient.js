'use strict';

const Redis = require('ioredis');

/**
 *
 */
class RedisClient {

	/**
	 *
	 */
	constructor() {
		this.options = null;
		this.client = null;
	}


	/**
	 * Start connection to mongo database server
	 * @param options
	 */
	connect(options) {
		this.options = options;
		let redis = new Redis(options);
		redis.on('ready', () => {
			console.log('Connection with redis succeeded');
		});
		redis.on('error', console.error.bind(console, 'Redis connection error'));


		this.client = redis;
		return redis;
	}

	/**
	 * close client connection
	 */
	disconnect() {
		if(this.client != null) {
			this.client.disconnect();
			this.client = null;
		}
	}

	/**
	 *
	 * @returns {*|null}
	 */
	getClient() {
		return this.client;
	}

	/**
	 * Return publisher
	 * @returns {null|*}
	 */
	getPublisher() {
		return this.client;
	}

	getSubscriber() {
		let redis = new Redis(this.options);
		redis.on('ready', () => {
			console.log('Connection with redis succeeded');
		});
		redis.on('error', console.error.bind(console, 'Redis connection error'));


		return redis;
	}
}


const redisClient = new RedisClient();

module.exports = redisClient;
