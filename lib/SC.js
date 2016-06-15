'use strict';

const axios = require('axios');
const bunyan = require('bunyan');
const request = axios.create({
  baseURL: 'http://api.soundcloud.com/',
});

const log = bunyan.createLogger({
  name: 'sndcld_sc'
});

module.exports = class SC {
  constructor(clientId) {
    this.clientId = clientId;

    log.info('SC initialized');
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
    }).catch(function(error) {
      log.error(error);

      return error;
    });
  }

  getUserFollowings(userId) {
    log.info('Get user followings:', userId);

    return request.get(`/users/${userId}/followings`, {
      params: {
        client_id: this.clientId
      }
    }).then((response) => {
      return response.data.collection;
    }).catch((error) => {
      log.error(error);

      return error;
    });
  }

  getUserTracks(userId) {
    log.info('Get user tracks:', userId);

    return request.get(`/users/${userId}/tracks`, {
      params: {
        client_id: this.clientId
      }
    }).then((response) => {
      return response.data;
    }).catch((error) => {
      log.error(error);

      return error;
    });
  }

  getUserTracksBatch(userIds) {
    return Promise.all(userIds.map(this.getUserTracks)).catch((error) => {
      log.error(error);

      return error;
    });
  }

  getAudioFileUrl(url) {
    return request.get(url, {
      maxRedirects: 0,
      validateStatus: function (status) {
        return status === 302;
      },
    }).then((res) => {
      return res.data.location;
    });
  }
};
