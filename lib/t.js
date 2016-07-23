'use strict';

const bunyan = require('bunyan');

const StartController = require('./controllers/StartController');
const WatchController = require('./controllers/WatchController');
const OtherwiseController = require('./controllers/OtherwiseController');
const LOG_LEVEL = require('../local_config').LOG_LEVEL;

const log = bunyan.createLogger({
  name: 'sndcld_t',
  level: LOG_LEVEL
});

module.exports = function(tg, ops) {
  tg.router
  .when(['/start'], new StartController(ops))
  .when(['/watch'], new WatchController(ops))
  .otherwise(new OtherwiseController(ops));

  log.info('T initialized');
};
