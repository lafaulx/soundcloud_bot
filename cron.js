'use strict';

const MongoClient = require('mongodb').MongoClient;
const CronJob = require('cron').CronJob;
const bunyan = require('bunyan');
const telegramNodeBot = require('telegram-node-bot');

const config = require('./local_config');
const scFn = require('./lib/sc');
const dbFn = require('./lib/db');
const opsFn = require('./lib/ops');

const MONGODB_ADDR = config.MONGODB_ADDR;
const MONGODB_PORT = config.MONGODB_PORT;
const MONGODB_DB = config.MONGODB_DB;
const TELEGRAM_AUTH_TOKEN = config.TELEGRAM_AUTH_TOKEN;
const SOUNDCLOUD_CLIENT_ID = config.SOUNDCLOUD_CLIENT_ID;

const sc = scFn(SOUNDCLOUD_CLIENT_ID);
const tg = telegramNodeBot(TELEGRAM_AUTH_TOKEN);

const mongodbUrl = `mongodb://${MONGODB_ADDR}:${MONGODB_PORT}/${MONGODB_DB}`;

const log = bunyan.createLogger({
  name: 'sndcld_bot_create_db'
});

// new CronJob({
//   cronTime: '00 00 */2 * * *',
//   onTick: function() {
    MongoClient.connect(mongodbUrl, function(err, dbConn) {
      log.info('Connected to MongoDB');

      const db = dbFn(dbConn);
      const ops = opsFn(sc, db, tg);

      ops.updateTracks().then(() => dbConn.close());
    });
//   },
//   start: true
// });
