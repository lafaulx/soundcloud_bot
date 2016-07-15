const _ = require('lodash');
const moment = require('moment');

module.exports = function(sc, db, tg) {
  function fetchTracksForUser(soundCloudUser) {
    return Promise.all([
      sc.getUserTracks(soundCloudUser.id, moment(new Date()).subtract(1, 'days')),
      db.findSoundCloudUserTracks(soundCloudUser.id)
    ]);
  }

  function composeTracksToUsersArray(subscribedUsers, scTracks, dbTracks) {
    return Promise.all(
      scTracks.map(scTrack => {
        const usersToSend = _.differenceBy(
          subscribedUsers,
          _.flatten(dbTracks
            .filter(dbTrack => dbTrack.id === scTrack.id)
            .map(dbTrack => dbTrack.shownToUsers)), 'id');

        return new Promise(resolve =>resolve({
          telegramUsersToSend: usersToSend,
          scTrack: scTrack
        }));
    }));
  }

  function sendTracksToUsers(usersAndTracks) {
    return Promise.all(usersAndTracks
      .filter(usersAndTrack => usersAndTrack.telegramUsersToSend.length > 0)
      .map(usersAndTrack => {
        const users = usersAndTrack.telegramUsersToSend;
        const track = usersAndTrack.scTrack;

        return Promise.all(users.map(user => sendAudioLink(user, track)));
      }));
  }

  function sendAudioLink(user, track) {
    return new Promise((resolve, reject) => {
      tg.sendMessage(user.chatId, `[${track.user.username}](${track.user.permalink_url}) – `
        + `[${track.title}](${track.permalink_url})`, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }, (result, err) => {
        if (err) {
          reject(err);
          return;
        }

        db.createSoundCloudTrack(track, user.id).then(resolve);
      });
    });
  }

  function getSoundCloudUserIdToRemoteFollowingsMap(soundCloudUserIds) {
    return Promise.all(
      soundCloudUserIds
      .map((soundCloudUserId) =>
        new Promise((resolve) =>
          sc
          .getUserFollowings(soundCloudUserId)
          .then((followings) => resolve([soundCloudUserId, followings]))
        )
      )
    ).then(array => _.fromPairs(array));
  }

  function getTelegramUserIdToLocalSecondaryFollowingsMap(telegramUsers) {
    return Promise.all(
      telegramUsers.map((telegramUser) =>
        new Promise((resolve) =>
          db.findSecondarySoundCloudSubscriptions(telegramUser.id, telegramUser.watchedUsers)
          .then((secondarySubscriptions) => resolve([telegramUser.id, secondarySubscriptions]))
        )
      )
    ).then(array => _.fromPairs(array));
  }

  function getSoundCloudUsersUpdateMap(telegramUsers) {
    return Promise.all([
      getSoundCloudUserIdToRemoteFollowingsMap(telegramUsers.reduce((prev, cur) =>
        _.union(prev, cur.watchedUsers), [])),
      getTelegramUserIdToLocalSecondaryFollowingsMap(telegramUsers)
    ]).then((results) => {
      const soundCloudUserIdToRemoteFollowingsMap = results[0];
      const telegramUserIdToLocalSecondaryFollowingsMap = results[1];

      return _.flatten(
        telegramUsers.map((telegramUser) =>
          telegramUser.watchedUsers.map((soundCloudUserId) => {
            const telegramUserId = telegramUser.id;
            const remoteFollowings = soundCloudUserIdToRemoteFollowingsMap[soundCloudUserId];
            const localFollowings = telegramUserIdToLocalSecondaryFollowingsMap[telegramUserId];

            const usersToAdd = _.differenceBy(remoteFollowings, localFollowings, 'id');
            const usersToRemove = _.differenceBy(localFollowings, remoteFollowings, 'id');

            return [telegramUser.id, usersToAdd, usersToRemove];
          })
        )
      );
    });
  }

  function batchSubscribeAndUnsubscribe(telegramUserId, usersToAdd, usersToRemove) {
    return Promise.all([
      Promise.all(usersToAdd.map((userToAdd) =>
        db.createSoundCloudUser(userToAdd, telegramUserId))),
      Promise.all(usersToRemove.map((userToRemove) =>
        db.unsubscribeFromSoundCloudUser(userToRemove.id, telegramUserId)))
    ]);
  }

  return {
    createTelegramUser: user => db.createTelegramUser(user),
    suspendTelegramUser: userId => db.suspendTelegramUser(userId),
    searchUsers: query => sc.searchUsers(query),
    getSoundCloudUserFollowings: soundCloudUserId => sc.getUserFollowings(soundCloudUserId),
    connectPrimarySoundCloudUserToTelegramUser: (telegramUserId, soundCloudUserId) =>
      db.connectPrimarySoundCloudUserToTelegramUser(telegramUserId, soundCloudUserId),
    updateTracks: () =>
      db
      .getAllSoundCloudUsers()
      .then(soundCloudUsers =>
        Promise.all(soundCloudUsers.map(soundCloudUser =>
          fetchTracksForUser(soundCloudUser)
          .then(trackPairs => {
            const scTracks = trackPairs[0];
            const dbTracks = trackPairs[1];

            return composeTracksToUsersArray(
              soundCloudUser.subscribedUsers,
              scTracks,
              dbTracks
            );
          })
          .then(sendTracksToUsers))
        )
      ),
    updateUsers: () =>
      db
      .getAllTelegramUsersWithSubscriptions()
      .then(getSoundCloudUsersUpdateMap)
      .then((soundCloudUsersUpdateMaps) => {
        return Promise.all(
          soundCloudUsersUpdateMaps.map((soundCloudUsersUpdateMap) =>
            batchSubscribeAndUnsubscribe.apply(this, soundCloudUsersUpdateMap)
          )
        );
      }),
    subscribeToUser: (soundCloudUser, telegramUserId) =>
      db.createSoundCloudUser(soundCloudUser, telegramUserId)
  };
};
