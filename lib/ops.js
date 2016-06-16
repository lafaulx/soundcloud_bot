module.exports = function(sc, db, tg) {
  function subscribeToUser(soundCloudUser, telegramUserId) {
    return db.createSoundCloudUser(soundCloudUser, telegramUserId);
  }

  function fetchNewSoundCloudTracks(soundCloudUserId, telegramUserId) {
    return Promise.all([
      sc.getUserTracks(soundCloudUserId),
      db.findShownSoundCloudTracks(telegramUserId)
    ]).then((res) => {
      const userTracks = res[0];
      const shownTracks = res[1];

      const now = Date.now();

      const tracksToShow = userTracks.filter((t) => {
        const lessThanFiveDays = now - (new Date(t.created_at)).getTime() <= 432000000;
        const wasShown = shownTracks.filter(st => st.id === t.id);

        return lessThanFiveDays && wasShown.length === 0;
      });

      return Promise.all(tracksToShow.map((t) => sc.fixAudioFileUrl(t)));
    });
  }

  function sendAudioFile(chatId, url, title) {
    return new Promise((resolve, reject) => {
      tg.sendAudioFromUrl(chatId, url, {
        title: title
      }, function(result, err) {
        if (err) {
          reject(err);
          return;
        }

        db.createSoundCloudTrack(t, telegramUserId).then(resolve);
      });
    });
  }

  return {
    createTelegramUser: (user) => db.createTelegramUser(user),
    suspendTelegramUser: (userId) => db.suspendTelegramUser(userId),
    searchUsers: (query) => sc.searchUsers(query),
    getSoundCloudUserFollowings: (soundCloudUserId) => sc.getUserFollowings(soundCloudUserId),
    subscribeToUserAndFetchTracks: (chatId, soundCloudUser, telegramUserId) => {
      const soundCloudUserId = soundCloudUser.id;

      return subscribeToUser(soundCloudUser, telegramUserId)
        .then(() => fetchNewSoundCloudTracks(soundCloudUserId, telegramUserId))
        .then(tracks => Promise.all(tracks.map((t) => sendAudioFile(chatId, t.stream_url, t.title))));
    }
  };
};
