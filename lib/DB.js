'use strict';

const bunyan = require('bunyan');

const DB_COLLECTIONS = require('./consts/dbCollections');

const log = bunyan.createLogger({
  name: 'sndcld_db'
});

module.exports = class DB {
  constructor(db) {
    this.db = db;

    log.info('DB initialized');
  }

  createTelegramUser(user) {
    const collection = this.db.collection(DB_COLLECTIONS.TELEGRAM_USERS);

    user.suspended = false;

    log.info('Create Telegram user: ', user);

    return collection.findOneAndUpdate({
      id: user.id
    }, user, {
      returnOriginal: true,
      upsert: true
    }).then((doc) => {
      return doc;
    }).catch((err) => {
      log.error('Create telegram user: ', err, user);

      return err;
    });
  }

  suspendTelegramUser(id) {
    const collection = this.db.collection(DB_COLLECTIONS.TELEGRAM_USERS);

    log.info('Suspend Telegram user: ', id);

    return collection.findOneAndUpdate({
      id: id
    }, {
      $set: {
        suspended: true
      }
    }, {
      returnOriginal: true
    }).then((doc) => {
      return doc;
    }).catch((err) => {
      log.error('Suspend Telegram user: ', err, id);

      return err;
    });
  }

  createSoundCloudUser(user, telegramUserId) {
    const collection = this.db.collection(DB_COLLECTIONS.SOUNDCLOUD_USERS);

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
        }).catch((err) => {
          log.error('Create SoundCloud user: ', err, user);
        });
      } else {
        user.subscribedUsers = [telegramUserId];

        return collection.insertOne(user).catch((err) => {
          log.error('Create SoundCloud user: ', err, user);
        });
      }
    }).catch((err) => {
      log.error('Create SoundCloud user: ', err, user);

      return err;
    });
  }

  createSoundCloudUsers(users, telegramUserId) {
    return Promise.all(users.map((u) => this.createSoundCloudUser(u, telegramUserId))).catch((error) => {
      log.error(error);

      return error;
    });
  }
};
