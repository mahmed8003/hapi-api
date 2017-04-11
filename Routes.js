'use strict';

const UserController = require('./controllers/UserController');

// API Server Endpoints
module.exports.endpoints = [

	/**
	 * Users routes
	 */
	{method: 'GET', path: '/', config: UserController.health},
	{method: 'GET', path: '/users', config: UserController.getUsers},
	{method: 'POST', path: '/users/create', config: UserController.createUser},
	{method: 'POST', path: '/users/{mobile}/verification/{code}', config: UserController.verifyUserAccount},
	{method: 'POST', path: '/users/{mobile}/send_verification', config: UserController.sendVerificationCode},
	{method: 'POST', path: '/users/login', config: UserController.loginUser},
	{method: 'POST', path: '/users/change_password', config: UserController.changePassword},
	{method: 'POST', path: '/users/logout', config: UserController.logoutUser},
	{method: 'POST', path: '/users/request_reset_password/{mobile}', config: UserController.requestResetPassword},
	{method: 'POST', path: '/users/reset_password/{mobile}', config: UserController.resetPassword},
	{method: 'POST', path: '/users/{id}/revoke_access', config: UserController.revokeAccessToken}

];
