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

// test/contact_matching.js:
// Tests requests related to the contact matching endpoint.

var should = require('should');
var tutil = require('../support/testutil');

var mockConfig = {
  users: {
    'alice': 'alice'
  },
  stanzas: {
    // Get friend jid by hash and report mine
    '<iq from="alice@localhost/http" type="get">\
       <query xmlns="http://buddycloud.com/friend_finder/match">\
         <item item-hash="hash123" me="true"/>\
         <item item-hash="hash234"/>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/friend_finder/match">\
          <item matched-hash="hash234" jid="friend@localhost"/>\
       </query>\
     </iq>',

    // Get friend jid by hash but don't report mine
    '<iq from="alice@localhost/http" type="get">\
       <query xmlns="http://buddycloud.com/friend_finder/match">\
         <item item-hash="hash234"/>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/friend_finder/match">\
          <item matched-hash="hash234" jid="friend@localhost"/>\
       </query>\
     </iq>',
     
     // Get friend jid by hash but don't receive anything back
    '<iq from="alice@localhost/http" type="get">\
       <query xmlns="http://buddycloud.com/friend_finder/match">\
         <item item-hash="hash-unknown"/>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/friend_finder/match">\
       </query>\
     </iq>',
     
     // Get more than one friend jids by hash and report mine
    '<iq from="alice@localhost/http" type="get">\
       <query xmlns="http://buddycloud.com/friend_finder/match">\
         <item item-hash="hash123" me="true"/>\
         <item item-hash="hash321" me="true"/>\
         <item item-hash="hash234"/>\
         <item item-hash="hash432"/>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/friend_finder/match">\
          <item matched-hash="hash234" jid="friend@localhost"/>\
          <item matched-hash="hash432" jid="friend@localhost"/>\
       </query>\
     </iq>'
  }
};

describe('Contact matching', function() {

  before(function(done) {
    tutil.startHttpServer(function() {
      tutil.mockXmppServer(mockConfig, done);
    });
  });

  describe('POST', function() {

    it('should not allow unauthorized access', function(done) {
      var options = {
        path: '/match_contacts',
        body: JSON.stringify({
          'mine': ['hash123'],
          'others': ['hash234']
        })
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });

    it('should return one matched jid', function(done) {
      var options = {
        path: '/match_contacts',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({
          'mine': ['hash123'],
          'others': ['hash234']
        })
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(200);
        var response = JSON.parse(body);
        response.should.eql({
          'items': [{jid: 'friend@localhost', 'matched-hash': 'hash234'}]
        });
        done();
      }).on('error', done);
    });
    
    it('should return one matched jid and not report mine', function(done) {
      var options = {
        path: '/match_contacts',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({
          'others': ['hash234']
        })
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(200);
        var response = JSON.parse(body);
        response.should.eql({
          'items': [{jid: 'friend@localhost', 'matched-hash': 'hash234'}]
        });
        done();
      }).on('error', done);
    });
    
    it('should return no matched jids', function(done) {
      var options = {
        path: '/match_contacts',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({
          'others': ['hash-unknown']
        })
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(200);
        var response = JSON.parse(body);
        response.should.eql({
          'items': []
        });
        done();
      }).on('error', done);
    });
    
    it('should match more than one matched jids', function(done) {
      var options = {
        path: '/match_contacts',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({
          'mine': ['hash123', 'hash321'],
          'others': ['hash234', 'hash432']
        })
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(200);
        var response = JSON.parse(body);
        response.should.eql({
          'items': [{jid: 'friend@localhost', 'matched-hash': 'hash234'}, 
                    {jid: 'friend@localhost', 'matched-hash': 'hash432'}]
        });
        done();
      }).on('error', done);
    });

  });

  after(function() {
    tutil.end();
  });

});