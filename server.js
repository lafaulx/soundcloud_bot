const MongoClient = require('mongodb').MongoClient;
const bunyan = require('bunyan');
const telegramNodeBot = require('telegram-node-bot');

const config = require('./local_config');
const SCApi = require('./SCApi');

const MONGODB_ADDR = config.MONGODB_ADDR;
const MONGODB_PORT = config.MONGODB_PORT;
const MONGODB_DB = config.MONGODB_DB;
const TELEGRAM_AUTH_TOKEN = config.TELEGRAM_AUTH_TOKEN;
const SOUNDCLOUD_CLIENT_ID = config.SOUNDCLOUD_CLIENT_ID;

const mongodbUrl = `mongodb://${MONGODB_ADDR}:${MONGODB_PORT}/${MONGODB_DB}`;

const log = bunyan.createLogger({
  name: 'sndcld_bot'
});
const tg = telegramNodeBot(TELEGRAM_AUTH_TOKEN);
const api = new SCApi(SOUNDCLOUD_CLIENT_ID);

MongoClient.connect(mongodbUrl, function(err, db) {
  log.info('Connected to MongoDB');

  tg.router.when(['/peek :username'], 'PeekController');

  tg.controller('PeekController', ($) => {
    tg.for('/peek :username', ($) => {
      const username = $.query.username;

      log.info('Watch user started: ', $);

      api.searchUser(username).then(function(users) {
        log.info('Sending reply: ', users);

        const response = users.reduce(function(prev, cur, i) {
          return prev + `*${i}.* [${cur.permalink}](${cur.permalink_url})\n`;
        }, '*Choose the user:*\n');

        $.sendMessage(response, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });

        $.waitForRequest(($) => {
          $.sendMessage('Hi ' + $.message.text + '!');
        });
      }, function(error) {
        log.error(error);
      });
    });
  });
});
