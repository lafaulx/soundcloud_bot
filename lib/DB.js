'use strict';

const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'sndcld_db'
});

module.exports = class DB {
  constructor(db) {
    this.db = db;

    log.info('DB initialized');
  }
};
