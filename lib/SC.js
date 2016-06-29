'use strict';

const axios = require('axios');
const bunyan = require('bunyan');
const _ = require('lodash');
const fs = require('fs');
const request = axios.create({
  baseURL: 'http://api.soundcloud.com/',
});

const log = bunyan.createLogger({
  name: 'sndcld_sc'
});

module.exports = function(clientId, tempDir) {
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

    getUserTracks: (userId) => {
      log.info('Get user tracks:', userId);

      return request.get(`/users/${userId}/tracks`, {
        params: {
          client_id: clientId
        }
      }).then(res => res.data);
    },

    getUserTracksBatch: (userIds) => {
      return Promise
        .all(userIds.map(this.getUserTracks))
        .then(tracks => _.flatten(tracks));
    },

    fixAudioFileUrl: (track) => {
      log.info('Fix audio file url:', track);

      return axios.get(track.stream_url, {
        params: {
          client_id: clientId
        },
        maxRedirects: 0,
        validateStatus: function (status) {
          return status === 302;
        },
      }).then(res => {
        track.stream_url = res.data.location;

        return track;
      });
    },

    getTrackStream: (url) => {
      const fileName = Math.random().toString(16) + '.mp3';
      const path = tempDir + fileName;
      const wstream = fs.createWriteStream(path);

      return new Promise((resolve) => {
        wstream.on('finish', () => {
          resolve({
            path: path,
            stream: fs.createReadStream(path)
          });
        });

        axios.get(url, {
          responseType: 'stream',
        }).then(res => res.data.pipe(wstream));
      });
    },

    deleteTrack: (path) => new Promise((resolve, reject) => {
      fs.unlink(path, (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    })
  };
};
