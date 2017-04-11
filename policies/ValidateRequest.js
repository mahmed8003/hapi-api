'use strict';

const Boom = require('boom');
const Promise = require('bluebird');
const User = require('../models/User');


const validate = function (decoded, request, callback) {

	User.findById(decoded.uid)
		.select('name loginActions')
		.then(function(user) {
			if(!user) {
				return Promise.reject(Boom.unauthorized('User not found, token contain invalid user id'));
			}


			const token = request.auth.token;
			let found = false;

			for (let i = 0; i < user.loginActions.length; i++) {
				const t = user.loginActions[i].authToken;
				if (token == t) {
					found = true;
					break;
				}
			}

			if (!found) {
				callback(Boom.unauthorized('Access has been revoked'), false);
			} else {
				request.type = 'user';
				request.user = user;
				//request.role = user.role;

				callback(null, true);
			}
		})
		.catch(function(err){
			callback(err, false);
		});
};


module.exports = validate;
