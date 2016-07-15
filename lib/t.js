'use strict';

const bunyan = require('bunyan');

const startController = require('./controllers/startController');
const watchController = require('./controllers/watchController');

const log = bunyan.createLogger({
  name: 'sndcld_t'
});

module.exports = function(tg, ops) {
  tg.router.
  when(['/start'], 'StartController').
  when(['/watch :username'], 'WatchController');

  tg.controller('StartController', startController(tg, ops));
  tg.controller('WatchController', watchController(tg, ops));

  log.info('T initialized');
};
