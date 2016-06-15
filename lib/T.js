'use strict';

const telegramNodeBot = require('telegram-node-bot');
const bunyan = require('bunyan');

const startController = require('./controllers/startController');
const stopController = require('./controllers/stopController');
const watchController = require('./controllers/watchController');

const log = bunyan.createLogger({
  name: 'sndcld_t'
});

module.exports = class T {
  constructor(authToken, sc, db) {
    this.tg = telegramNodeBot(authToken);
    this.sc = sc;
    this.db = db;

    this.tg.router.
    when(['/start'], 'StartController').
    when(['/stop'], 'StopController').
    when(['/watch :username'], 'WatchController');

    this.tg.controller('StartController', startController(this.tg, this.db));
    this.tg.controller('StopController', stopController(this.tg, this.db));
    this.tg.controller('WatchController', watchController(this.tg, this.sc, this.db));

    log.info('T initialized');
  }
};
