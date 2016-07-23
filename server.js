const MongoClient = require('mongodb').MongoClient;
const bunyan = require('bunyan');
const Telegram = require('telegram-node-bot').Telegram;
const CronJob = require('cron').CronJob;

const config = require('./local_config');
const scFn = require('./lib/sc');
const dbFn = require('./lib/db');
const opsFn = require('./lib/ops');
const t = require('./lib/t');

const MONGODB_ADDR = config.MONGODB_ADDR;
const MONGODB_PORT = config.MONGODB_PORT;
const MONGODB_DB = config.MONGODB_DB;
const TELEGRAM_AUTH_TOKEN = config.TELEGRAM_AUTH_TOKEN;
const SOUNDCLOUD_CLIENT_ID = config.SOUNDCLOUD_CLIENT_ID;
const LOG_LEVEL = config.LOG_LEVEL;

const mongodbUrl = `mongodb://${MONGODB_ADDR}:${MONGODB_PORT}/${MONGODB_DB}`;

const log = bunyan.createLogger({
  name: 'sndcld_bot',
  level: LOG_LEVEL
});

MongoClient.connect(mongodbUrl, function(err, dbConn) {
  log.info('Connected to MongoDB');

  const sc = scFn(SOUNDCLOUD_CLIENT_ID);
  const db = dbFn(dbConn);
  const tg = new Telegram(TELEGRAM_AUTH_TOKEN);
  const ops = opsFn(sc, db, tg);

  t(tg, ops);

  new CronJob({
    cronTime: '00 00 */12 * * *',
    onTick: function() {
      ops.updateTracks();
    },
    start: true
  });

  new CronJob({
    cronTime: '00 00 * * * *',
    onTick: function() {
      ops.updateUsers();
    },
    start: true
  });

  log.info('SoundCloud Bot started');
});
