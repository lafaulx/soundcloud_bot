'use strict';

const bunyan = require('bunyan');
const TelegramBaseController = require('telegram-node-bot').TelegramBaseController;

const LOG_LEVEL = require('../../local_config').LOG_LEVEL;

const log = bunyan.createLogger({
  name: 'sndcld_t_watch',
  level: LOG_LEVEL
});

class WatchController extends TelegramBaseController {
  constructor(ops) {
    super();
    this.ops = ops;
  }

  handle($) {
    log.info('Watch user command started: ', $);

    $.waitForRequest.then($ => {
      const username = $.message.text;

      this.ops.searchUsers(username).then(users => {
        log.info('Fetched possible users: ', users);

        if (users instanceof Array && users.length > 0) {
          this.sendFoundedUsersList($, users);
        } else {
          $.sendMessage('I haven\'t found anyone – try running the command again with another username');
        }
      });
    });

    $.sendMessage('Please tell me your SoundCloud username', {
      parse_mode: 'Markdown'
    });
  }

  sendFoundedUsersList($, soundCloudUsers) {
    $.waitForRequest.then($ => {
      const replyIdx = this.parseNumberReply($.message.text);

      log.info('Received reply index: ', replyIdx);

      if (replyIdx > 0 && replyIdx <= soundCloudUsers.length) {
        this.subscribeToUsersStream($, soundCloudUsers[replyIdx - 1]);
      } else {
        this.sendCommandAbortedMessage($, replyIdx === 0);
      }
    });

    $.sendMessage(this.constructUserSelectionList(soundCloudUsers), {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  }

  subscribeToUsersStream($, soundCloudUser) {
    const telegramUserId = $.userId;

    soundCloudUser.isRoot = true;

    this.ops.getSoundCloudUserFollowings(soundCloudUser.id).then(followings => {
      Promise.all(
        followings.concat(soundCloudUser)
        .map(u => this.ops.subscribeToUser(u, telegramUserId))
      )
      .then(() => this.ops.connectPrimarySoundCloudUserToTelegramUser(telegramUserId, soundCloudUser.id))
      .then(() => this.sendWatchSuccessMessage($));
    });
  }

  sendCommandAbortedMessage($, isCancel) {
    $.sendMessage(`${isCancel ? 'C' : 'Invalid reply – c'}ommand aborted`);
  }

  sendWatchSuccessMessage($) {
    $.sendMessage('Done! Now you\'ll start receiving user\'s stream');
  }

  constructUserSelectionList(users) {
    let response = users.reduce((prev, cur, i) => {
      return prev + `   *${i + 1}*. [${cur.permalink}](${cur.permalink_url})\n`;
    }, 'Here are the users I\'ve got – find yourself in the list and send back the number:\n\n');

    response += '\nSend *0* to cancel';

    return response;
  }

  parseNumberReply(reply) {
    return reply && !isNaN(reply) ? parseInt(reply, 10) : -1;
  }
}

module.exports = WatchController;
