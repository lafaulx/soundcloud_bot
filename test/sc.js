const assert = require('chai').assert;

const scFn = require('../lib/sc');
const config = require('../local_config');

const SOUNDCLOUD_CLIENT_ID = config.SOUNDCLOUD_CLIENT_ID;
const TEST_USERNAME = 'megagrave';

function validateUser(user) {
  assert.isObject(user, 'user is an object');
  assert.property(user, 'id', 'id property is present');
  assert.property(user, 'username', 'username property is present');
  assert.property(user, 'permalink_url', 'user permalink_url property is present');
  assert.isNumber(user.id, 'id is a number');
  assert.isString(user.username, 'username is a string');
  assert.isString(user.permalink_url, 'user permalink_url is a string');
}

function validateTrack(track) {
  assert.isObject(track, 'track is an object');

  assert.property(track, 'id', 'id property is present');
  assert.property(track, 'title', 'title property is present');
  assert.property(track, 'permalink_url', 'permalink_url property is present');
  assert.isNumber(track.id, 'id is a number');
  assert.isString(track.title, 'title is a string');
  assert.isString(track.permalink_url, 'permalink_url is a string');

  assert.property(track, 'user', 'id property is present');
  validateUser(track.user);
}

describe('SoundCloud API', function() {
  const sc = scFn(SOUNDCLOUD_CLIENT_ID);

  describe('#searchUsers()', function() {
    it('should return valid users list', function(done) {
      sc
      .searchUsers(TEST_USERNAME)
      .then((users) => {
        assert.isArray(users, 'got array');
        assert.isAbove(users.length, 0, 'array is not empty');

        users.forEach(validateUser);
      })
      .then(done)
      .catch(done);
    });
  });

  describe('SoundCloud User', function() {
    let user;

    before(function(done) {
      sc
      .searchUsers(TEST_USERNAME)
      .then((users) => {
        if (users.length === 0) {
          throw new Error(`user '${TEST_USERNAME}' wasn't found`);
        }

        user = users[0];
      })
      .then(done)
      .catch(done);
    });

    describe('User', function() {
      it('should have all necessary fields', function(done) {
        validateUser(user);

        done();
      });
    });

    describe('#getUserFollowings()', function() {
      it('should return user followings array', function(done) {
        sc
        .getUserFollowings(user.id)
        .then((followings) => {
          assert.isArray(followings, 'got array');
          assert.isAbove(followings.length, 0, 'array is not empty');

          followings.forEach(validateUser);
        })
        .then(done)
        .catch(done);
      });
    });

    describe('#getUserTracks()', function() {
      it('should return user\'s tracks array', function(done) {
        sc
        .getUserTracks(user.id, new Date(1970))
        .then((tracks) => {
          assert.isArray(tracks, 'got array');
          assert.isAbove(tracks.length, 0, 'array is not empty');

          tracks.forEach(validateTrack);
        })
        .then(done)
        .catch(done);
      });
    });
  });
});
