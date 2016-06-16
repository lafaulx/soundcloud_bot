const MongoClient = require('mongodb').MongoClient;
const bunyan = require('bunyan');
const async = require('async');
const _ = require('lodash');

const config = require('./local_config');
const DB_COLLECTIONS = require('./lib/consts/dbCollections');

const MONGODB_ADDR = config.MONGODB_ADDR;
const MONGODB_PORT = config.MONGODB_PORT;
const MONGODB_DB = config.MONGODB_DB;

const mongodbUrl = `mongodb://${MONGODB_ADDR}:${MONGODB_PORT}/${MONGODB_DB}`;

const log = bunyan.createLogger({
  name: 'sndcld_bot_create_db'
});

MongoClient.connect(mongodbUrl, function(err, db) {
  log.info('Connected to MongoDB');

  async.series([
    function(cb) {
      db.collection(DB_COLLECTIONS.TELEGRAM_USERS).ensureIndex('id', {
        unique: true
      }, cb);
    },
    function(cb) {
      db.collection(DB_COLLECTIONS.SOUNDCLOUD_USERS).ensureIndex('id', {
        unique: true
      }, cb);
    },
    function(cb) {
      db.collection(DB_COLLECTIONS.SOUNDCLOUD_TRACKS).ensureIndex('id', {
        unique: true
      }, cb);
    }
  ], function(err, results) {
    if (err) {
      log.error(err);
    } else {
      log.info('DB tasks successfully completed: ', results);
    }

    db.close();
  });
});
