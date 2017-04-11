'use strict';

const _ = require('lodash');
const Jwt = require('jsonwebtoken');
const Bcrypt = require('bcrypt');
const RandomString = require('randomstring');
const Moment = require('moment');
const Joi = require('joi');
const Boom = require('boom');
const Promise = require('bluebird');

const config = require('../config');
const AppConstants = require('../AppConstants');

const User = require('../models/User');


const controller = {};

/**
 * Route for creating user
 */
controller.createUser = {
	tags: ['api'],
	description: 'Create User',
	notes: ['Creates a new user'],
	auth: false,
	validate: {
		payload: {
			name: Joi.string().min(3).max(30).required(),
			mobile: Joi.string().regex(AppConstants.Validator.MOBILE_NUMBER).required(),
			password: Joi.string().min(5).max(40).required()
		}
	},

	handler: function (request, reply) {
		const payload = request.payload;

		const now = Date.now();

		let salt = Bcrypt.genSaltSync(config.crypto.saltRounds);
		payload.password = Bcrypt.hashSync(payload.password, salt);
		payload.status = 'PENDING';
		payload.verification = {
			code : RandomString.generate({ length: 6, charset: 'numeric'}),
			expiry: Moment().add(10, 'minutes').valueOf()
		};

		User.create(payload)
			.then(function (user) {

				let userObj = user.toObject({getters: true, virtuals: false});
				delete userObj.password;
				delete userObj.resetInfo;
				delete userObj.loginActions;

				// send sms before deleting ref
				delete userObj.verification;

				reply({data: userObj});
			})
			.catch(function (err) {
				if (11000 === err.code || 11001 === err.code) {
					// https://github.com/Automattic/mongoose/issues/2129
					const regex = /index\:\ (?:.*\.)?\$?(?:([_a-z0-9]*)(?:_\d*)|([_a-z0-9]*))\s*dup key/i;
					const match = err.message.match(regex);
					const indexName = match[1] || match[2];
					reply(Boom.badRequest('User already exist with same ' + indexName));
				} else {
					reply(Boom.badImplementation(err));
				}
			});
	}

};


/**
 * Verify User Account
 */
controller.verifyUserAccount = {
	tags: ['api'],
	description: 'Verify User Account',
	notes: ['Verify user account'],
	auth: false,
	validate: {
		params: {
			mobile: Joi.string().regex(AppConstants.Validator.MOBILE_NUMBER).required(),
			code: Joi.string().required()
		}
	},

	handler: function (request, reply) {
		const mobile = request.params.mobile;
		const code = request.params.code;


		User.findOne({mobile: mobile})
			.select('status verification')
			.exec()
			.then(function (user) {
				if (!user) {
					return Promise.reject(Boom.unauthorized('User not found'));
				}

				const now = Date.now();

				if(user.status != 'PENDING') {
					return Promise.reject(Boom.unauthorized('Account already approved'));
				}

				if (!user.verification) {
					console.log('inside');
					return Promise.reject(Boom.unauthorized('Verification code needs to be regenerated'));
				}

				if (now > user.verification.expiry) {
					return Promise.reject(Boom.unauthorized('Verification code has been expired'));
				}

				if (user.verification.code != code) {

					user.verification = null;
					return user.save().then(function (user) {
						return Promise.reject(Boom.unauthorized('Verification code is not incorrect'));
					});
				}

				user.verification = null;
				user.status = 'ACTIVE';
				return user.save();
			})
			.then(function (user) {

				reply({data: {message: 'Account has been activated'}});
			})
			.catch(function (err) {
				if (err.isBoom) {
					reply(err);
				} else {
					reply(Boom.badImplementation(err));
				}
			});
	}
};



/**
 * Send verification code
 */
controller.sendVerificationCode = {
	tags: ['api'],
	description: 'Send Verification Code',
	notes: ['Send Verification Code'],
	auth: false,
	validate: {
		params: {
			mobile: Joi.string().regex(AppConstants.Validator.MOBILE_NUMBER).required(),
		}
	},

	handler: function (request, reply) {
		const mobile = request.params.mobile;


		User.findOne({mobile: mobile})
			.select('status verification')
			.exec()
			.then(function (user) {
				if (!user) {
					return Promise.reject(Boom.unauthorized('User not found'));
				}

				const now = Date.now();

				if(user.status != 'PENDING') {
					return Promise.reject(Boom.unauthorized('Account already approved'));
				}

				user.verification = {
					code : RandomString.generate({ length: 6, charset: 'numeric'}),
					expiry: Moment().add(10, 'minutes').valueOf()
				};

				return user.save();
			})
			.then(function (user) {

				reply({data: {message: 'New verification code has been sent'}});
			})
			.catch(function (err) {
				if (err.isBoom) {
					reply(err);
				} else {
					reply(Boom.badImplementation(err));
				}
			});
	}
};


/**
 * Route for login user
 */
controller.loginUser = {
	tags: ['api'],
	description: 'Login User',
	notes: ['Login user request'],
	auth: false,
	validate: {
		payload: {
			mobile: Joi.string().regex(AppConstants.Validator.MOBILE_NUMBER).required(),
			password: Joi.string().min(5).max(40).required(),
			os: Joi.string().valid('ANDROID', 'IOS', 'CHROME', 'FIREFOX', 'WINDOWS', 'UNKNOWN').optional(),
			hardware: Joi.string().max(30).optional(),
			regId: Joi.string().min(5).max(50).optional(),
			notification: Joi.boolean().optional()
		}
	},

	handler: function (request, reply) {
		const payload = request.payload;


		const query = {
			mobile : payload.mobile
		};


		let loginData = null;
		User.findOne(query)
			.select('name status mobile email password loginActions')
			.exec()
			.then(function (user) {
				if (!user) {
					return Promise.reject(Boom.unauthorized('User not found'));
				} else if(user.status == 'PENDING') {
					return Promise.reject(Boom.unauthorized('Account not verified'));
				} else if (!Bcrypt.compareSync(payload.password, user.password.toString())) {
					return Promise.reject(Boom.unauthorized('Password is invalid'));
				} else {

					const now = Date.now();
					const ip = request.headers['x-forwarded-for'] || request.info.remoteAddress;

					const expires = Moment().add(config.jwt.duration, 'seconds').valueOf();
					const payload = {
						uid: user.id,
						exp: expires,
						iat: now
						//roles: [user.role]
					};
					let appSecret = config.jwt.secret;
					let token = Jwt.sign(payload, appSecret);

					loginData = Object.assign({}, payload, {
						loginAt : now,
						ip: ip,
						authToken: token
					});

					if (user.loginActions.length > 10) {
						user.loginActions.shift();
					}
					user.loginActions.push(loginData);
					user.resetInfo = null;

					return user.save();
				}

			})
			.then(function (user) {
				const userObj = user.toObject({getters: true, virtuals: false});
				delete userObj.password;
				delete userObj.resetInfo;
				delete userObj.loginActions;

				const data = {
					user: userObj,
					loginAction: loginData
				};

				reply({data: data});
			})
			.catch(function (err) {
				if (err.isBoom) {
					reply(err);
				} else {
					reply(Boom.badImplementation(err));
				}
			});
	}
};


/**
 * Change user account password
 */
controller.changePassword = {
	tags: ['api'],
	description: 'Reset User Password',
	notes: ['Update password if token is correct'],
	validate: {
		payload: {
			password: Joi.string().min(5).max(30).required(),
			newPassword: Joi.string().min(5).max(30).required()
		}
	},

	handler: function (request, reply) {
		const user = request.user;
		const payload = request.payload;

		User.findById(user._id)
			.select('password status')
			.exec()
			.then(function (user) {
				if (!user) {
					return Promise.reject(Boom.unauthorized('User not found'));
				} else if(user.status == 'PENDING') {
					return Promise.reject(Boom.unauthorized('Account not verified'));
				} else if (!Bcrypt.compareSync(payload.password, user.password.toString())) {
					return Promise.reject(Boom.unauthorized('Old password is invalid'));
				}

				user.resetInfo = null;
				user.loginActions = [];


				let salt = Bcrypt.genSaltSync(config.crypto.saltRounds);
				let hash = Bcrypt.hashSync(payload.newPassword, salt);
				user.password = hash;

				return user.save();
			})
			.then(function (user) {

				reply({data: {message: 'Password has been updated'}});
			})
			.catch(function (err) {
				if (err.isBoom) {
					reply(err);
				} else {
					reply(Boom.badImplementation(err));
				}
			});
	}
};


/**
 * logout user
 */
controller.logoutUser = {
	tags: ['api'],
	description: 'Logout User',
	notes: ['Logout user'],
	handler: function (request, reply) {

		const user = request.user;
		const token = request.auth.token;

		for (let i = 0; i < user.loginActions.length; i++) {
			const t = user.loginActions[i].authToken;
			if (token == t) {
				user.loginActions[i].remove();
				break;
			}
		}

		user.save()
			.then(function (user) {
				reply({data: {message: 'You have been logout'}});
			})
			.catch(function (e) {
				reply(Boom.badImplementation(e));
			});
	}
};


/**
 *
 */
controller.requestResetPassword = {
	tags: ['api'],
	description: 'Request Reset Password',
	notes: ['Request server for resetting user password'],
	auth: false,
	validate: {
		params: {
			mobile: Joi.string().regex(AppConstants.Validator.MOBILE_NUMBER).required()
		}
	},

	handler: function (request, reply) {
		const mobile = request.params.mobile;


		User.findOne({mobile: mobile})
			.select('name email mobile password resetInfo')
			.exec()
			.then(function (user) {
				if (!user) {
					return Promise.reject(Boom.unauthorized('User not found'));
				}

				const now = Date.now();

				user.resetInfo = {
					code: RandomString.generate({length: 6, charset: 'numeric'}),
					expiry: Moment().add(10, 'minutes').valueOf()
				};

				return user.save();
			})
			.then(function (user) {

				console.log(user.resetInfo);
				reply({data: {message: 'Message has been sent containing secret code'}});
			})
			.catch(function (err) {
				if (err.isBoom) {
					reply(err);
				} else {
					reply(Boom.badImplementation(err));
				}
			});
	}
};


controller.resetPassword = {
	tags: ['api'],
	description: 'Reset User Password',
	notes: ['Update password if token is correct'],
	auth: false,
	validate: {
		params: {
			mobile: Joi.string().regex(AppConstants.Validator.MOBILE_NUMBER).required()
		},
		payload: {
			code: Joi.string().required(),
			password: Joi.string().min(5).max(30).required()
		}
	},

	handler: function (request, reply) {
		const mobile = request.params.mobile;
		const payload = request.payload;


		User.findOne({mobile: mobile})
			.select('name email mobile password resetInfo')
			.exec()
			.then(function (user) {
				if (!user) {
					return Promise.reject(Boom.unauthorized('User not found'));
				}

				const now = Date.now();

				if (!user.resetInfo) {
					return Promise.reject(Boom.unauthorized('Verification code needs to be regenerated'));
				}

				if (now > user.resetInfo.expiry) {
					return Promise.reject(Boom.unauthorized('Verification code has been expired'));
				}

				if (user.resetInfo.code != payload.code) {

					user.resetInfo = null;
					return user.save().then(function (user) {
						return Promise.reject(Boom.unauthorized('Invalid verification code'));
					});
				}

				user.resetInfo = null;
				user.loginActions = [];


				const salt = Bcrypt.genSaltSync(config.crypto.saltRounds);
				const hash = Bcrypt.hashSync(payload.password, salt);
				user.password = hash;

				return user.save();
			})
			.then(function (user) {

				reply({data: {message: 'Password has been updated'}});
			})
			.catch(function (err) {
				if (err.isBoom) {
					reply(err);
				} else {
					reply(Boom.badImplementation(err));
				}
			});
	}
};


/**
 * revoke Access Token Route
 */
controller.revokeAccessToken = {
	tags: ['api'],
	description: 'Revoke User Access',
	notes: ['Revoke user access for a particular access token'],
	validate: {
		params: {
			id: Joi.string().required()
		}
	},

	handler: function (request, reply) {
		const user = request.user;
		const id = request.params.id;

		const loginSubDoc = user.loginActions.id(id);
		if (loginSubDoc) {
			loginSubDoc.remove();
			user.save()
				.then(function (user) {

					reply({data: user});
				}).catch(function (e) {
				reply(Boom.badRequest(e));
			});
		} else {
			reply(Boom.badRequest('Invalid id'));
		}
	}
};


controller.updateStatus = {
	tags: ['api'],
	description: 'Update User Status',
	notes: ['Admin can update user status'],
	auth: false,
	validate: {
		params: {
			id: Joi.string().regex(AppConstants.Validator.OBJECT_ID).required()
		},
		payload: {
			status: Joi.string().valid('PENDING', 'ACTIVE', 'INACTIVE', 'ARCHIVED').required()
		}
	},

	handler: function (request, reply) {
		const id = request.params.id;
		const status = request.payload.status;

		User.findById(id)
			.select('status')
			.exec()
			.then(function (user) {

				if (!user) {
					return Promise.reject(Boom.unauthorized('User not found'));
				}

				user.status = status;
				return user.save();

			})
			.then(function (user) {
				reply({data: user});
			})
			.catch(function (err) {
				if (err.isBoom) {
					reply(err);
				} else {
					reply(Boom.badImplementation(err));
				}
			});
	}
};



controller.getUsers = {
	tags: ['api'],
	description: 'Get user list',
	notes: ['Get user list'],
	auth: false,
	validate: {
		query: {
			status: Joi.string().valid('PENDING', 'ACTIVE', 'INACTIVE', 'ARCHIVED').optional().default(null),
			lod: Joi.number().min(1).max(2).optional().default(1)
		}
	},

	handler: function (request, reply) {
		const status = request.query.status;
		const lod = request.query.lod;

		const query = {};
		if(status) {
			query.status = status;
		}

		let select = 'name email mobile status';
		if(lod == 1) {
			select = 'name email mobile status';
		} else if(lod == 2) {
			select = '-password -verification -resetInfo';
		}


		User.find(query)
			.select(select)
			.sort({createdAt: -1})
			.exec()
			.then(function(users) {
				reply({data: users});
			})
			.catch(function(err){
				reply(Boom.badImplementation(err));
			});
	}
};



controller.getUser = {
	tags: ['api'],
	description: 'Get Single User by ID',
	notes: ['Get Single User by ID'],
	validate: {
		params: {
			id: Joi.string().regex(AppConstants.Validator.OBJECT_ID),
		},
		query: {
			lod: Joi.number().min(1).max(2).optional().default(1)
		}
	},
	handler: function (request, reply) {

		const id = request.params.id;
		const lod = request.query.lod;


		let select = 'name email mobile status';
		if(lod == 1) {
			select = 'name email mobile status';
		} else if(lod == 2) {
			select = '-password -verification -resetInfo';
		}

		User.findById(id)
			.select(select)
			.then(function(user) {
				if(!user) {
					return Promise.reject(Boom.badRequest('User not found'));
				}

				reply({data: user});
			})
			.catch(function(err){
				if (err.isBoom) {
					reply(err);
				} else {
					reply(Boom.badImplementation(err));
				}
			});

	}
};



controller.health = {
	tags: ['api'],
	description: 'Check health',
	notes: ['Check health of the user'],
	auth: false,
	handler: function (request, reply) {
		const health = {
			status: 'success'
		};

		reply(health);
	}

};


module.exports = controller;
