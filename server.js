const MongoClient = require('mongodb').MongoClient;
const bunyan = require('bunyan');

const config = require('./local_config');
const SC = require('./lib/SC');
const DB = require('./lib/DB');
const T = require('./lib/T');

const MONGODB_ADDR = config.MONGODB_ADDR;
const MONGODB_PORT = config.MONGODB_PORT;
const MONGODB_DB = config.MONGODB_DB;
const TELEGRAM_AUTH_TOKEN = config.TELEGRAM_AUTH_TOKEN;
const SOUNDCLOUD_CLIENT_ID = config.SOUNDCLOUD_CLIENT_ID;

const mongodbUrl = `mongodb://${MONGODB_ADDR}:${MONGODB_PORT}/${MONGODB_DB}`;

const log = bunyan.createLogger({
  name: 'sndcld_bot'
});

MongoClient.connect(mongodbUrl, function(err, dbConn) {
  log.info('Connected to MongoDB');

  const sc = new SC(SOUNDCLOUD_CLIENT_ID);
  const db = new DB(dbConn);
  new T(TELEGRAM_AUTH_TOKEN, sc, db);

  log.info('SoundCloud Bot started');
});
