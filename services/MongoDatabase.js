'use strict';


const Mongoose = require('mongoose');
const Bluebird = require('bluebird');


/**
 *
 */
class MongoDatabase {

	/**
	 *
	 */
	constructor() {
		this.db = null;
	}


	/**
	 * Start connection to mongo database server
	 * @param options
	 */
	connect(options) {
		Mongoose.Promise = Bluebird;
		let dbOptions = { promiseLibrary: Bluebird };
		Mongoose.connect(options.uri, dbOptions);
		let db = Mongoose.connection;
		db.on('error', console.error.bind(console, 'connection error'));
		db.once('open', function () {
			console.log("Connection with database succeeded");
		});

		this.db = db;

	}

	/**
	 * close client connection
	 */
	disconnect() {
		if(this.db != null) {
			Mongoose.disconnect();
			this.db = null;
		}
	}
}


const mongoDatabase = new MongoDatabase();

module.exports = mongoDatabase;
