'use strict';

const axios = require('axios');
const bunyan = require('bunyan');
const request = axios.create({
  baseURL: 'http://api.soundcloud.com/',
});

const log = bunyan.createLogger({
  name: 'sndcld_sc_api'
});

module.exports = class SCApi {
  constructor(clientId) {
    this.clientId = clientId;
  }

  searchUser(username) {
    log.info('Search user:', username);

    return request.get('/users', {
      params: {
        client_id: this.clientId,
        q: username
      }
    }).then(function(response) {
      return response.data;
    });
  }
};
