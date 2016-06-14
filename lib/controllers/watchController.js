'use strict';

const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'sndcld_t'
});

function constructUserSelectionList(users) {
  let response = users.reduce((prev, cur, i) => {
    return prev + ` *${i + 1}*. [${cur.permalink}](${cur.permalink_url})\n`;
  }, 'Here are the users I\'ve found – reply with the number of the user you want to watch:\n\n');

  response += '\nPress *0* to cancel';

  return response;
}

function parseNumberReply(reply) {
  return reply && !isNaN(reply) ? parseInt(reply, 10) : -1;
}

function sendUserWatchTypeQuestion($, user) {
  $.sendMessage(`
    User *${user.permalink}* is chosen! Do you also want to watch his feed?\n
    *0*. No\n
    *1*. Yes
  `, {
    parse_mode: 'Markdown'
  });
}

function sendFoundedUsersList($, users) {
  $.sendMessage(constructUserSelectionList(users), {
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  });
}

function sendCommandAbortedMessage($, isCancel) {
  $.sendMessage(`${isCancel ? 'C' : 'Invalid reply – c'}ommand aborted`);
}

function send500Error($) {
  $.sendMessage('An error has occured – excuse me for that and try again later');
}

function onWatch($, sc, db) {
  const username = $.query.username;

  log.info('Watch user command started: ', $);

  sc.searchUser(username).then((users) => {
    log.info('Fetched possible users: ', users);

    if (users instanceof Array) {
      if (users.length > 0) {
        sendFoundedUsersList($, users);

        $.waitForRequest(($) => {
          const replyIdx = parseNumberReply($.message.text);

          if (replyIdx > 0 && replyIdx <= users.length) {
            sendUserWatchTypeQuestion($, users[replyIdx - 1]);

            $.waitForRequest(($) => {
              const shouldWatch = parseNumberReply($.message.text);

              if (shouldWatch === -1) {
                sendCommandAbortedMessage($);
              } else {
                $.sendMessage(`Done! Now you'll start receiving user's updates${shouldWatch ? ' with feed' : ''}`);
              }
            });
          } else {
            log.info('Command aborted: ', $);
            sendCommandAbortedMessage($, replyIdx === 0);
          }
        });
      } else {
        $.sendMessage('Found no one – you try running the command again with another name');
      }
    } else {
      log.error('Unexpected response from SC: ', users);
      send500Error($);
    }
  }, () => {
    send500Error($);
  });
}

function watchController(tg, sc, db) {
  return () => {
    tg.for('/watch :username', ($) => onWatch($, sc, db));
  };
};

module.exports = watchController;
