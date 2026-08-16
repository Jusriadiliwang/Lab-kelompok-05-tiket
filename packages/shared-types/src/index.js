/**
 * shared-types — src/index.js
 * Entry point package shared-types
 */
const enums  = require('./enums');
const events = require('./events');
const dto    = require('./dto');

module.exports = { ...enums, ...events, ...dto };
