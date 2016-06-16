'use strict';

const bunyan = require('bunyan');
const _ = require('underscore');

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

function sendWatchSuccessMessage($, permalink, withFeed) {
  $.sendMessage(`Done! Now you'll start receiving ${permalink}'s updates${withFeed ? ' with feed' : ''}`);
}

function send500Error($) {
  $.sendMessage('An error has occured – excuse me for that and try again later');
}

function onWatch($, sc, db) {
  const username = $.query.username;
  const telegramUserId = $.user.id;

  log.info('Watch user command started: ', $);

  sc.searchUser(username).then((users) => {
    log.info('Fetched possible users: ', users);

    if (users instanceof Array) {
      if (users.length > 0) {
        sendFoundedUsersList($, users);

        $.waitForRequest(($) => {
          const replyIdx = parseNumberReply($.message.text);

          if (replyIdx > 0 && replyIdx <= users.length) {
            const user = users[replyIdx - 1];
            sendUserWatchTypeQuestion($, user);

            $.waitForRequest(($) => {
              const shouldWatch = parseNumberReply($.message.text);

              if (shouldWatch === -1) {
                sendCommandAbortedMessage($);
              } else {
                if (shouldWatch === 0) {
                  db.createSoundCloudUser(user, telegramUserId).then(() => {
                    Promise.all([
                      sc.getUserTracks(user.id),
                      db.findShownSoundCloudTracks(telegramUserId)
                    ]).then((res) => {
                      const userTracks = res[0];
                      const shownTracks = res[1];

                      const tracksToShow = userTracks.filter((t) => {
                        const lessThanFiveDays = (new Date()).getTime() - (new Date(t.created_at)).getTime() <= 432000000;
                        const wasNotShown = shownTracks
                          .filter(st => st.id === t.id && st.shownToUsers.indexOf(telegramUserId) === -1);

                        return lessThanFiveDays && wasNotShown.length === 0;
                      });

                      tracksToShow.forEach((t) => {
                        sc.getAudioFileUrl(t.stream_url).then((u) => {
                          $.sendAudioFromUrl(u, {
                            title: t.title
                          }, function(result, err) {
                            if (err) {
                              log.error(err);
                              return;
                            }

                            //db.createSoundCloudTrack(t, telegramUserId);
                          });
                        });
                      });
                    });

                    sendWatchSuccessMessage($, user.permalink);
                  });
                } else {
                  sc.getUserFollowings(user.id).then((followings) => {
                    const scUsersToFollow = followings.concat(user);

                    scUsersToFollow.forEach((user) => {
                      db.createSoundCloudUser(user, telegramUserId).then(() => {
                        Promise.all([
                          sc.getUserTracks(user.id),
                          db.findShownSoundCloudTracks(telegramUserId)
                        ]).then((res) => {
                          const userTracks = res[0];
                          const shownTracks = res[1];

                          const tracksToShow = userTracks.filter((t) => {
                            const lessThanFiveDays = (new Date()).getTime() - (new Date(t.created_at)).getTime() <= 432000000;
                            const wasShown = shownTracks
                              .filter(st => st.id === t.id);

                            return lessThanFiveDays && wasShown.length === 0;
                          });

                          tracksToShow.forEach((t) => {
                            sc.getAudioFileUrl(t.stream_url).then((u) => {
                              $.sendAudioFromUrl(u, {
                                title: t.title
                              }, function(result, err) {
                                if (err) {
                                  log.error(err);
                                  return;
                                }

                                db.createSoundCloudTrack(t, telegramUserId);
                              });
                            });
                          });
                        });

                        sendWatchSuccessMessage($, user.permalink);
                      });
                    });
                  });
                }
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
