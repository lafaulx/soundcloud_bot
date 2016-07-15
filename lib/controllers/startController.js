'use strict';

const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'sndcld_t_start'
});

function startController(tg, ops) {
  function onStart($) {
    const user = $.user;

    user.chatId = $.message.chat.id;

    log.info('Start command: ', user);

    ops.createTelegramUser(user).then(() => {
      $.sendMessage(`Hello, ${user.first_name}! ` +
        'I\'m here to help you if you like SoundCloud but constantly keep forgetting to check it for new tracks. ' +
        'Just type /watch and I\'ll send you notifications on new tracks in this chat!', {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
    });
  }

  return () => {
    tg.for('/start', ($) => onStart($));
  };
};

module.exports = startController;
