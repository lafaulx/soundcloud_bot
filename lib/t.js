'use strict';

const bunyan = require('bunyan');

const StartController = require('./controllers/StartController');
const WatchController = require('./controllers/WatchController');

const log = bunyan.createLogger({
  name: 'sndcld_t'
});

module.exports = function(tg, ops) {
  tg.router.
  when(['/start'], new StartController(ops)).
  when(['/watch'], new WatchController(ops));

  log.info('T initialized');
};

