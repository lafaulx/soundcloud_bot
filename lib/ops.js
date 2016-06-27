module.exports = function(sc, db, tg) {
  function subscribeToUser(soundCloudUser, telegramUserId) {
    return db.createSoundCloudUser(soundCloudUser, telegramUserId);
  }

  function sendTracks(chatId, tracks, telegramUserId) {
    return Promise.all(tracks.map((t) => sendAudioFile(chatId, t, telegramUserId)));
  }

  function filterNewTracks(userTracks, shownTracks) {
    const now = Date.now();

    return tracksToShow = userTracks.filter((t) => {
      const lessThanFiveDays = now - (new Date(t.created_at)).getTime() <= 432000000;
      const wasShown = shownTracks.filter(st => st.id === t.id);

      return lessThanFiveDays && wasShown.length === 0;
    });
  }


  function fetchNewSoundCloudTracks(soundCloudUserId, telegramUserId) {
    return Promise.all([
      sc.getUserTracks(soundCloudUserId),
      db.findShownSoundCloudTracks(telegramUserId)
    ]).then((res) => {
      const userTracks = res[0];
      const shownTracks = res[1];

      return Promise
        .all(filterNewTracks(userTracks, shownTracks)
          .map((t) => sc.fixAudioFileUrl(t)));
    });
  }

  function sendAudioFile(chatId, track, telegramUserId) {
    return new Promise((resolve, reject) => {
      tg.sendAudioFromUrl(chatId, track.stream_url, {
        title: track.title
      }, function(result, err) {
        if (err) {
          reject(err);
          return;
        }

        db.createSoundCloudTrack(track, telegramUserId).then(resolve);
      });
    });
  }

  return {
    createTelegramUser: (user) => db.createTelegramUser(user),
    suspendTelegramUser: (userId) => db.suspendTelegramUser(userId),
    searchUsers: (query) => sc.searchUsers(query),
    getSoundCloudUserFollowings: (soundCloudUserId) => sc.getUserFollowings(soundCloudUserId),
    updateTracks: () => {
      return db.getAllSoundCloudUsers()
        .then((soundCloudUsers) =>
          Promise.all(soundCloudUsers.map((soundCloudUser) =>
            Promise.all(soundCloudUser.subscribedUsers.map((subscribedUser) =>
              fetchNewSoundCloudTracks(soundCloudUser.id, subscribedUser.id)
                .then(tracks => sendTracks(subscribedUser.chatId, tracks, subscribedUser.id))
            ))
          )));
    },
    subscribeToUserAndFetchTracks: (chatId, soundCloudUser, telegramUserId) => {
      const soundCloudUserId = soundCloudUser.id;

      return subscribeToUser(soundCloudUser, telegramUserId)
        .then(() => fetchNewSoundCloudTracks(soundCloudUserId, telegramUserId))
        .then(tracks => sendTracks(chatId, tracks, telegramUserId));
    }
  };
};
