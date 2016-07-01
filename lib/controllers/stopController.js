'use strict';

const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'sndcld_t_stop'
});

function stopController(tg, ops) {
  function onStop($) {
    const userId = $.user.id;

    log.info('Stop command: ', userId);

    ops.suspendTelegramUser(userId);
  }

  return () => {
    tg.for('/stop', ($) => onStop($));
  };
};

module.exports = stopController;
