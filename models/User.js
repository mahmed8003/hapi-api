'use strict';

const Mongoose = require('mongoose');
const LastModified = require('../plugins/mongoose/LastModified');
const Schema = Mongoose.Schema;

const AppConstants = require('../AppConstants');


const LoginActionSchema = new Schema({
	os: {type: String, default: 'UNKNOWN', enum: ['ANDROID', 'IOS', 'CHROME', 'FIREFOX', 'WINDOWS', 'UNKNOWN']},
	hardware: {type: String, default: 'UNKNOWN'},
	regId: {type: String, default: null},
	notification: {type: Boolean, default: true},
	loginAt: {type: Date, required: true},
	ip: {type: String, required: true},
	authToken: {type: String, required: true},
	location: {type: String, default: null}
});

const UserSchema = new Schema({
	name: {type: String, trim: true, required: true},
	email: {type: String, trim: true, unique: true, sparse: true},
	mobile: {type: String, trim: true, unique: true, sparse: true},
	password: {type: String, required: true},
	verification: {
		code: {type: String, trim: true, default: null},
		expiry: {type: Date, trim: true, default: null}
	},
	resetInfo: {
		code: {type: String, trim: true, default: null},
		expiry: {type: Date, trim: true, default: null}
	},
	loginActions: [LoginActionSchema],
	status: {type: String, required: true, enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'ARCHIVED']}
});



// Plugin to add last modified automatically
UserSchema.plugin(LastModified);

const user = Mongoose.model('users', UserSchema);

/** export model */
module.exports = user;
