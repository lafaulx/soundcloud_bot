'use strict';

const bunyan = require('bunyan');

const DB_COLLECTIONS = require('./consts/dbCollections');
const LOG_LEVEL = require('../local_config').LOG_LEVEL;

const log = bunyan.createLogger({
  name: 'sndcld_db',
  level: LOG_LEVEL
});

module.exports = function(db) {
  return {
    createTelegramUser: (user) => {
      const collection = db.collection(DB_COLLECTIONS.TELEGRAM_USERS);

      return collection.findOne({
        id: user.id
      }).then((doc) => {
        if (doc) {
          return collection.update({
            id: user.id
          }, {
            $set: {
              suspended: false
            }
          });
        } else {
          user.suspended = false;

          return collection.insertOne(user);
        }
      });
    },

    suspendTelegramUser: (telegramUserId) => {
      const collection = db.collection(DB_COLLECTIONS.TELEGRAM_USERS);

      log.info('Suspend telegram user: ', telegramUserId);

      return collection.findOneAndUpdate({
        id: telegramUserId
      }, {
        $set: {
          suspended: true
        }
      });
    },

    connectPrimarySoundCloudUserToTelegramUser: (telegramUserId, soundCloudUserId) => {
      const collection = db.collection(DB_COLLECTIONS.TELEGRAM_USERS);

      log.info('Connect primary SoundCloud user to Telegram user: ', telegramUserId, soundCloudUserId);

      return collection.findOneAndUpdate({
        id: telegramUserId
      }, {
        $addToSet: {
          watchedUsers: soundCloudUserId
        }
      });
    },

    getAllTelegramUsersWithSubscriptions: () => {
      const collection = db.collection(DB_COLLECTIONS.TELEGRAM_USERS);

      log.info('Get all Telegram users');

      return collection.find({
        watchedUsers: {
          $exists: true
        }
      }).toArray();
    },

    suspendTelegramUser: (id) => {
      const collection = db.collection(DB_COLLECTIONS.TELEGRAM_USERS);

      log.info('Suspend Telegram user: ', id);

      return collection.findOneAndUpdate({
        id: id
      }, {
        $set: {
          suspended: true
        }
      }, {
        returnOriginal: true
      });
    },

    createSoundCloudUser: (user, telegramUserId) => {
      const collection = db.collection(DB_COLLECTIONS.SOUNDCLOUD_USERS);

      log.info('Create SoundCloud user: ', user, telegramUserId);

      return collection.findOne({
        id: user.id
      }).then((doc) => {
        if (doc) {
          return collection.update({
            id: user.id
          }, {
            $addToSet: {
              subscribedUsers: telegramUserId
            }
          });
        } else {
          user.subscribedUsers = [telegramUserId];

          return collection.insertOne(user);
        }
      });
    },

    unsubscribeFromSoundCloudUser: (soundCloudUserId, telegramUserId) => {
      const collection = db.collection(DB_COLLECTIONS.SOUNDCLOUD_USERS);

      log.info('Unsubscribe from SoundCloud user: ', soundCloudUserId, telegramUserId);

      return collection.findOneAndUpdate({
        id: soundCloudUserId
      }, {
        $pull: {
          subscribedUsers: telegramUserId
        }
      });
    },

    createSoundCloudUsers: (users, telegramUserId) => {
      log.info('Create SoundCloud users: ', users, telegramUserId);

      return Promise.all(users.map(u => this.createSoundCloudUser(u, telegramUserId)));
    },

    getAllSoundCloudUsers: () => {
      const collection = db.collection(DB_COLLECTIONS.SOUNDCLOUD_USERS);

      log.info('Get all SoundCloud users');

      return collection.aggregate([{
        $unwind: '$subscribedUsers'
      }, {
        $lookup: {
          from: DB_COLLECTIONS.TELEGRAM_USERS,
          localField: 'subscribedUsers',
          foreignField: 'id',
          as: 'subscribedUsers'
        }
      }, {
        $match: {
          subscribedUsers: {
            $elemMatch: {
              suspended: false
            }
          }
        }
      }]).toArray();
    },

    findSecondarySoundCloudSubscriptions: (telegramUserId, primarySubscriptions) => {
      const collection = db.collection(DB_COLLECTIONS.SOUNDCLOUD_USERS);

      log.info('Find secondary SoundCloud subscriptions: ', telegramUserId, primarySubscriptions);

      return collection.find({
        id: {
          $nin: primarySubscriptions
        },
        subscribedUsers: {
          $elemMatch: {
            $eq: telegramUserId
          }
        }
      }).toArray();
    },

    findSoundCloudUserTracks: (soundCloudUserId) => {
      const collection = db.collection(DB_COLLECTIONS.SOUNDCLOUD_TRACKS);

      log.info('Find SoundCloud user tracks', soundCloudUserId);

      return collection.aggregate([{
        $unwind: '$shownToUsers'
      }, {
        $match: {
          user_id: {
            $eq: soundCloudUserId
          }
        }
      }, {
        $lookup: {
          from: DB_COLLECTIONS.TELEGRAM_USERS,
          localField: 'shownToUsers',
          foreignField: 'id',
          as: 'shownToUsers'
        }
      }, {
        $match: {
          shownToUsers: {
            $elemMatch: {
              suspended: false
            }
          }
        }
      }]).toArray();
    },

    createSoundCloudTrack: (track, telegramUserId) => {
      const collection = db.collection(DB_COLLECTIONS.SOUNDCLOUD_TRACKS);

      log.info('Upsert SoundCloud track: ', track, telegramUserId);

      return collection.findOne({
        id: track.id
      }).then((doc) => {
        if (doc) {
          return collection.update({
            id: track.id
          }, {
            $addToSet: {
              shownToUsers: telegramUserId
            }
          });
        } else {
          track.shownToUsers = [telegramUserId];

          return collection.insertOne(track);
        }
      });
    }
  };
};
