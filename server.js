const MongoClient = require('mongodb').MongoClient;
const bunyan = require('bunyan');
const telegramNodeBot = require('telegram-node-bot');
const bugsnag = require('bugsnag');

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
const BUGSNAG_TOKEN = config.BUGSNAG_TOKEN;
const TEMP_DIR = config.TEMP_DIR;

const mongodbUrl = `mongodb://${MONGODB_ADDR}:${MONGODB_PORT}/${MONGODB_DB}`;

const log = bunyan.createLogger({
  name: 'sndcld_bot'
});

bugsnag.register(BUGSNAG_TOKEN);

bugsnag.autoNotify(function() {
  MongoClient.connect(mongodbUrl, function(err, dbConn) {
    log.info('Connected to MongoDB');

    const sc = scFn(SOUNDCLOUD_CLIENT_ID, TEMP_DIR);
    const db = dbFn(dbConn);
    const tg = telegramNodeBot(TELEGRAM_AUTH_TOKEN);
    const ops = opsFn(sc, db, tg);

    t(tg, ops);

    log.info('SoundCloud Bot started');
  });
});
