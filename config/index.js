'use strict';

const _ = require('lodash');
const defaults = require('./default.js');
const env = process.env.NODE_ENV || 'development';
const config = require("./" + env + '.js');
module.exports = _.merge({env : env}, defaults, config);
