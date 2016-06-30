const _ = require('lodash');
const bunyan = require('bunyan');

const log = bunyan.createLogger({
  name: 'sndcld_ops'
});

module.exports = function(sc, db, tg) {
  function fetchTracksForUser(soundCloudUser) {
    return Promise.all([
      sc.getUserTracks(soundCloudUser.id)
        .then(scTracks =>
          scTracks.filter(scTrack =>
            Date.now() - (new Date(scTrack.created_at)).getTime() <= 432000000)),
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

        return new Promise(resolve => {
          if (usersToSend.length) {
            sc.fixAudioFileUrl(scTrack).then((t) => resolve({
              telegramUsersToSend: usersToSend,
              scTrack: t
            }));
          } else {
            resolve({
              telegramUsersToSend: usersToSend,
              scTrack: scTrack
            });
          }
        });
    }));
  }

  function sendTracksToUsers(usersAndTracks) {
    return Promise.all(usersAndTracks
      .filter(usersAndTrack => usersAndTrack.telegramUsersToSend.length > 0)
      .map(usersAndTrack => {
        const users = usersAndTrack.telegramUsersToSend;
        const track = usersAndTrack.scTrack;

        return sc.getTrackStream(track.stream_url).then(streamObj =>
          Promise
            .all(users.map(user => sendAudioFile(user, track, streamObj.stream)))
            .then(() => sc.deleteTrack(streamObj.path))
        );
      }));
  }

  function sendAudioFile(user, track, stream) {
    return new Promise((resolve, reject) => {
      tg.sendAudio(user.chatId, stream, {
        title: track.title
      }, function(result, err) {
        if (err) {
          reject(err);
          return;
        }

        db.upsertSoundCloudTrack(track, user.id).then(resolve);
      });
    });
  }

  return {
    createTelegramUser: user => db.createTelegramUser(user),
    suspendTelegramUser: userId => db.suspendTelegramUser(userId),
    searchUsers: query => sc.searchUsers(query),
    getSoundCloudUserFollowings: soundCloudUserId => sc.getUserFollowings(soundCloudUserId),
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

    subscribeToUser: (soundCloudUser, telegramUserId) =>
      db.createSoundCloudUser(soundCloudUser, telegramUserId)
  };
};
