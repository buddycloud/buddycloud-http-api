/*
 * Copyright 2014 Abmar Barros <abmar@buddycloud.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// test/password.js:
// Tests requests related to the password endpoint.

var should = require('should');
var tutil = require('./support/testutil');

var mockConfig = {
  users: {
    'alice': 'alice'
  },
  stanzas: {
    // Successful password change
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="jabber:iq:register">\
         <username>username</username>\
         <password>password</password>\
       </query>\
     </iq>':
    '<iq type="result"/>',

    // Password change - bad request
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="jabber:iq:register">\
         <username>username</username>\
       </query>\
     </iq>':
    '<iq type="error">\
       <error type="modify">\
         <bad-request xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',
     
    // Password change - not authorized
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="jabber:iq:register">\
         <username>username-not-auth</username>\
         <password>password</password>\
       </query>\
     </iq>':
    '<iq type="error">\
       <error type="modify">\
         <not-authorized xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',
     
    // Password change - not allowed
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="jabber:iq:register">\
         <username>username-not-allowed</username>\
         <password>password</password>\
       </query>\
     </iq>':
    '<iq type="error">\
       <error type="modify">\
         <not-allowed xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',
     
    // Password reset - bad request
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="http://buddycloud.com/pusher/password-reset">\
       </query>\
     </iq>':
    '<iq type="error">\
       <error type="modify">\
         <bad-request xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',
     
     // successtul password reset
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="http://buddycloud.com/pusher/password-reset">\
         <username>username@localhost</username>\
       </query>\
     </iq>':
    '<iq type="result"/>'
  }
};

describe('Password change/reset', function() {

  before(function(done) {
    tutil.startHttpServer(function() {
      tutil.mockXmppServer(mockConfig, done);
    });
  });

  describe('POST', function() {

    it('should not allow an unauthenticated user to change its password', function(done) {
      var options = {
        path: '/account/pw/change',
        body: JSON.stringify({
          'username': 'username',
          'password': 'password'
        })
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });

    it('should not allow a bad request', function(done) {
      var options = {
        path: '/account/pw/change',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({
          'username': 'username'
        })
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(400);
        done();
      }).on('error', done);
    });

    it('should return 403 for a not authorized', function(done) {
      var options = {
        path: '/account/pw/change',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({
          'username': 'username-not-auth',
          'password': 'password'
        })
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(403);
        done();
      }).on('error', done);
    });
    
    it('should return 403 for a not allowed', function(done) {
      var options = {
        path: '/account/pw/change',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({
          'username': 'username-not-allowed',
          'password': 'password'
        })
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(403);
        done();
      }).on('error', done);
    });
    
    it('should change the users password', function(done) {
      var options = {
        path: '/account/pw/change',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({
          'username': 'username',
          'password': 'password'
        })
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(200);
        done();
      }).on('error', done);
    });

  });

  describe('POST', function() {

    it('should not allow a bad request', function(done) {
      var options = {
        path: '/account/pw/reset',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({})
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(400);
        done();
      }).on('error', done);
    });

    it('should reset the users password', function(done) {
      var options = {
        path: '/account/pw/reset',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({
          'username': 'username',
        })
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(200);
        done();
      }).on('error', done);
    });

  });

  after(function() {
    tutil.end();
  });

});