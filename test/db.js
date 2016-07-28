const assert = require('chai').assert;
const async = require('async');
const MongoClient = require('mongodb').MongoClient;

const dbFn = require('../lib/db');
const config = require('../local_config');
const mockTelegramUsers = require('./data/telegram_users');
const mockSoundCloudUsers = require('./data/soundcloud_users');
const mockSoundCloudTracks = require('./data/soundcloud_tracks');
const DB_COLLECTIONS = require('../lib/consts/dbCollections');

const MONGODB_ADDR = config.MONGODB_ADDR;
const MONGODB_PORT = config.MONGODB_PORT;
const MONGODB_DB = config.MONGODB_DB;

const mongodbUrl = `mongodb://${MONGODB_ADDR}:${MONGODB_PORT}/${MONGODB_DB}_test`;

describe('DB', function() {
  let dbConn;
  let db;

  before(function(done) {
    MongoClient.connect(mongodbUrl, function(err, connection) {
      if (err) {
        done(err);

        return;
      }

      dbConn = connection;

      async.series([
        function(cb) {
          dbConn.collection(DB_COLLECTIONS.TELEGRAM_USERS).ensureIndex('id', {
            unique: true
          }, cb);
        },
        function(cb) {
          dbConn.collection(DB_COLLECTIONS.SOUNDCLOUD_USERS).ensureIndex('id', {
            unique: true
          }, cb);
        },
        function(cb) {
          dbConn.collection(DB_COLLECTIONS.SOUNDCLOUD_TRACKS).ensureIndex('id', {
            unique: true
          }, cb);
        }
      ], function(err) {
        if (err) {
          done(err);

          return;
        }

        db = dbFn(dbConn);

        done();
      });
    });
  });

  after(function(done) {
    dbConn
    .dropDatabase()
    .then(() => done())
    .catch(done);
  });

  describe('#createTelegramUser()', function() {
    const freshTelegramUser = Object.assign(mockTelegramUsers.find(el => el.username === 'octahedron'));
    const suspendedTelegramUser = Object.assign(mockTelegramUsers.find(el => el.username === 'dulyahackana'));

    delete freshTelegramUser.watchedUsers;
    delete suspendedTelegramUser.watchedUsers;

    suspendedTelegramUser.suspended = false;

    before(function(done) {
      dbConn
      .collection(DB_COLLECTIONS.TELEGRAM_USERS)
      .insertOne(suspendedTelegramUser)
      .then(() => done())
      .catch(done);
    });

    it('should insert user if not in db', function(done) {
      db
      .createTelegramUser(freshTelegramUser)
      .then(() =>
        dbConn
        .collection(DB_COLLECTIONS.TELEGRAM_USERS)
        .findOne({id: freshTelegramUser.id})
      )
      .then(user => {
        assert.equal(user.id, freshTelegramUser.id);
        assert.equal(user.first_name, freshTelegramUser.first_name);
        assert.equal(user.last_name, freshTelegramUser.last_name);
        assert.equal(user.username, freshTelegramUser.username);
        assert.equal(user.chatId, freshTelegramUser.chatId);
        assert.equal(user.suspended, false);
      })
      .then(done)
      .catch(done);
    });

    it('should revive suspended user', function(done) {
      db
      .createTelegramUser(suspendedTelegramUser)
      .then(() =>
        dbConn
        .collection(DB_COLLECTIONS.TELEGRAM_USERS)
        .findOne({id: suspendedTelegramUser.id})
      )
      .then(user => {
        assert.equal(user.id, suspendedTelegramUser.id);
        assert.equal(user.first_name, suspendedTelegramUser.first_name);
        assert.equal(user.last_name, suspendedTelegramUser.last_name);
        assert.equal(user.username, suspendedTelegramUser.username);
        assert.equal(user.chatId, suspendedTelegramUser.chatId);
        assert.equal(user.suspended, false);
      })
      .then(done)
      .catch(done);
    });

    after(function(done) {
      dbConn
      .collection(DB_COLLECTIONS.TELEGRAM_USERS)
      .removeMany()
      .then(() => done())
      .catch(done);
    });
  });
});
