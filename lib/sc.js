'use strict';

const axios = require('axios');
const bunyan = require('bunyan');
const fs = require('fs');
const request = axios.create({
  baseURL: 'http://api.soundcloud.com/',
});
const moment = require('moment');

const log = bunyan.createLogger({
  name: 'sndcld_sc'
});

const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

module.exports = function(clientId) {
  return {
    searchUsers: (username) => {
      log.info('Search user:', username);

      return request.get('/users', {
        params: {
          client_id: clientId,
          q: username
        }
      }).then(res => res.data);
    },

    getUserFollowings: (userId) => {
      log.info('Get user followings:', userId);

      return request.get(`/users/${userId}/followings`, {
        params: {
          client_id: clientId
        }
      }).then(res => res.data.collection);
    },

    getUserTracks: (userId, from) => {
      log.info('Get user tracks:', userId);

      return request.get(`/users/${userId}/tracks`, {
        params: {
          client_id: clientId,
          'created_at[from]': moment(from).format(DATE_FORMAT)
        }
      }).then(res => res.data);
    }
  };
};
