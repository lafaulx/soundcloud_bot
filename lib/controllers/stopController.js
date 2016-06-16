'use strict';

const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'sndcld_t_stop'
});

function stopController(tg, ops) {
  function onStop($) {
    const userId = $.user.id;

    log.info('Stop command: ', userId);

    ops.suspendTelegramUser(userId).then(() => {
      $.sendMessage('We will never be friends again');
    }).catch(() => {
      $.sendMessage('Crap occured – dunno what to do');
    });
  }

  return () => {
    tg.for('/stop', ($) => onStop($));
  };
};

module.exports = stopController;
