'use strict';

const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'sndcld_t_start'
});

function onStart($, db) {
  const user = $.user;

  log.info('Start command: ', user);

  db.createTelegramUser(user).then(() => {
    $.sendMessage(`Hello, ${user.first_name}`);
  }).catch(() => {
    $.sendMessage('Crap occured – dunno what to do');
  });
}

function startController(tg, db) {
  return () => {
    tg.for('/start', ($) => onStart($, db));
  };
};

module.exports = startController;
