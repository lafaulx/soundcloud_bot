'use strict';

const bunyan = require('bunyan');
const TelegramBaseController = require('telegram-node-bot').TelegramBaseController;
const LOG_LEVEL = require('../../local_config').LOG_LEVEL;

const log = bunyan.createLogger({
  name: 'sndcld_t_start',
  level: LOG_LEVEL
});

class OtherwiseController extends TelegramBaseController {
  constructor(ops) {
    super();
    this.ops = ops;
  }

  handle($) {
    log.info('Command not recognized: ', $.message);

    $.sendMessage('Sorry, I couldn\'t recognize your command – here are the supported ones:\n\n' +
      '   /watch – subscribe to user\'s SoundCloud stream', {
      parse_mode: 'Markdown'
    });
  }
}

module.exports = OtherwiseController;
