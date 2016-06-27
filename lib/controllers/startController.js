'use strict';

const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'sndcld_t_start'
});

function startController(tg, ops) {
  function onStart($) {
    const user = $.user;

    user.chatId = $.chat.id;

    log.info('Start command: ', user);

    ops.createTelegramUser(user).then(() => {
      $.sendMessage(`Hello, ${user.first_name}`);
    }).catch(() => {
      $.sendMessage('Crap occured – dunno what to do');
    });
  }

  return () => {
    tg.for('/start', ($) => onStart($));
  };
};

module.exports = startController;
