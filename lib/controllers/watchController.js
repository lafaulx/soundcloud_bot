'use strict';

const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'sndcld_t_watch'
});

function constructUserSelectionList(users) {
  let response = users.reduce((prev, cur, i) => {
    return prev + `   *${i + 1}*. [${cur.permalink}](${cur.permalink_url})\n`;
  }, 'Here are the users I\'ve got – find yourself in the list and send back the number:\n\n');

  response += '\nSend *0* to cancel';

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
        subscribeToUsersStream($, soundCloudUsers[replyIdx - 1]);
      } else {
        sendCommandAbortedMessage($, replyIdx === 0);
      }
    });
  }

  function subscribeToUsersStream($, soundCloudUser) {
    const telegramUserId = $.user.id;

    soundCloudUser.isRoot = true;

    ops.getSoundCloudUserFollowings(soundCloudUser.id).then((followings) => {
      Promise.all(
        followings.concat(soundCloudUser)
        .map((u) => ops.subscribeToUser(u, telegramUserId))
      )
      .then(() => ops.connectPrimarySoundCloudUserToTelegramUser(telegramUserId, soundCloudUser.id))
      .then(() => sendWatchSuccessMessage($));
    });
  }

  function sendCommandAbortedMessage($, isCancel) {
    $.sendMessage(`${isCancel ? 'C' : 'Invalid reply – c'}ommand aborted`);
  }

  function sendWatchSuccessMessage($) {
    $.sendMessage('Done! Now you\'ll start receiving user\'s stream');
  }

  function searchUsers($) {
    const username = $.query.username;

    log.info('Watch user command started: ', $);

    ops.searchUsers(username).then((users) => {
      log.info('Fetched possible users: ', users);

      if (users instanceof Array && users.length > 0) {
        sendFoundedUsersList($, users);
      } else {
        $.sendMessage('I haven\'t found anyone – try running the command again with another username');
      }
    });
  }

  return () => {
    tg.for('/watch :username', ($) => searchUsers($));
  };
};

module.exports = watchController;
