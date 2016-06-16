'use strict';

const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'sndcld_t_watch'
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

function watchController(tg, ops) {
  function sendFoundedUsersList($, soundCloudUsers) {
    $.sendMessage(constructUserSelectionList(soundCloudUsers), {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });

    $.waitForRequest(($) => {
      const replyIdx = parseNumberReply($.message.text);

      if (replyIdx > 0 && replyIdx <= soundCloudUsers.length) {
        const soundCloudUser = soundCloudUsers[replyIdx - 1];

        sendUserWatchTypeQuestion($, ops, soundCloudUser);
      } else {
        sendCommandAbortedMessage($, replyIdx === 0);
      }
    });
  }

  function sendUserWatchTypeQuestion($, soundCloudUser) {
    const telegramUserId = $.user.id;
    const soundCloudUserId = soundCloudUser.id;
    const chatId = $.chat.id;

    $.sendMessage(`
      User *${soundCloudUser.permalink}* is chosen! Do you also want to watch his feed?\n
      *0*. No\n
      *1*. Yes
    `, {
      parse_mode: 'Markdown'
    });

    $.waitForRequest(($) => {
      const shouldWatch = parseNumberReply($.message.text);

      if (shouldWatch === -1) {
        sendCommandAbortedMessage($);
      } else {
        if (shouldWatch === 0) {
          ops.subscribeToUserAndFetchTracks(chatId, soundCloudUser, telegramUserId)
          .then(sendWatchSuccessMessage);
        } else {
          ops.getSoundCloudUserFollowings(soundCloudUserId).then((followings) => {
            followings.concat(user).forEach((soundCloudUser) => {
              ops.subscribeToUserAndFetchTracks(chatId, soundCloudUser, telegramUserId)
              .then(sendWatchSuccessMessage);
            });
          });
        }
      }
    });
  }

  function sendCommandAbortedMessage($, isCancel) {
    $.sendMessage(`${isCancel ? 'C' : 'Invalid reply – c'}ommand aborted`);
  }

  function sendWatchSuccessMessage($, permalink, withFeed) {
    $.sendMessage(`Done! Now you'll start receiving user\'s updates${withFeed ? ' with feed' : ''}`);
  }

  function searchForUsers($) {
    const username = $.query.username;

    log.info('Watch user command started: ', $);

    ops.searchUser(username).then((users) => {
      log.info('Fetched possible users: ', users);

      if (users instanceof Array && users.length > 0) {
        sendFoundedUsersList($, ops, users);
      } else {
        $.sendMessage('Found no one – you try running the command again with another name');
      }
    });
  }

  return () => {
    tg.for('/watch :username', ($) => searchForUsers($));
  };
};

module.exports = watchController;
