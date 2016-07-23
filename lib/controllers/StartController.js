'use strict';

const bunyan = require('bunyan');
const TelegramBaseController = require('telegram-node-bot').TelegramBaseController;
const LOG_LEVEL = require('../../local_config').LOG_LEVEL;

const log = bunyan.createLogger({
  name: 'sndcld_t_start',
  level: LOG_LEVEL
});

class StartController extends TelegramBaseController {
  constructor(ops) {
    super();
    this.ops = ops;
  }

  handle($) {
    const user = $.message.from.serialize();

    user.chatId = $.chatId;

    log.info('Start command: ', user);

    this.ops.createTelegramUser(user).then(() => {
      $.sendMessage(`Hello, ${user.first_name}! ` +
        'I\'m here to help you if you like SoundCloud but constantly keep forgetting to check it for new tracks. ' +
        'Just type /watch and I\'ll send you notifications on new tracks in this chat!', {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
    });
  }
}

module.exports = StartController;
