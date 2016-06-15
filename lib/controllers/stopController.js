'use strict';

const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'sndcld_t_stop'
});

function onStop($, db) {
  const userId = $.user.id;

  log.info('Stop command: ', userId);

  db.suspendTelegramUser(userId).then(() => {
    $.sendMessage('We will never be friends again');
  }).catch(() => {
    $.sendMessage('Crap occured – dunno what to do');
  });
}

function stopController(tg, db) {
  return () => {
    tg.for('/stop', ($) => onStop($, db));
  };
};

module.exports = stopController;
