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

// test/app_node.js:
// Tests requests related to the creation of application nodes.

var should = require('should');
var tutil = require('./support/testutil');

var mockConfig = {
  users: {
    'alice': 'alice'
  },
  stanzas: {
    // Get metadata with no type
    '<iq from="alice@localhost/http" type="get">\
       <query xmlns="http://buddycloud.com/pusher/metadata">\
         <type />\
       </query>\
     </iq>':
    '<iq type="error">\
       <error type="modify">\
         <bad-request xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',

    // Type does not exist
    '<iq from="alice@localhost/http" type="get">\
       <query xmlns="http://buddycloud.com/pusher/metadata">\
         <type>unexistent_type</type>\
       </query>\
     </iq>':
    '<iq type="error">\
       <error type="cancel">\
         <item-not-found xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',

    // Type has no metadata
    '<iq from="alice@localhost/http" type="get">\
       <query xmlns="http://buddycloud.com/pusher/metadata">\
         <type>no_metadata_type</type>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/pusher/metadata">\
       </query>\
     </iq>',

    // Type has metadata
    '<iq from="alice@localhost/http" type="get">\
       <query xmlns="http://buddycloud.com/pusher/metadata">\
         <type>metadata_type</type>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/pusher/metadata">\
         <key1>value1</key1>\
         <key2>value2</key2>\
       </query>\
     </iq>',

  }
};

describe('Notification settings', function() {

  before(function(done) {
    tutil.startHttpServer(function() {
      tutil.mockXmppServer(mockConfig, done);
    });
  });

  describe('GET', function() {

    it('should not allow unauthorized access', function(done) {
      var options = {
        path: '/notification_metadata'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });

    it('should not allow a request with no type', function(done) {
      var options = {
        path: '/notification_metadata',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(400);
        done();
      }).on('error', done);
    });

    it('should return a 404 if type does not exist', function(done) {
      var options = {
        path: '/notification_metadata?type=unexistent_type',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(404);
        done();
      }).on('error', done);
    });
    
    it('should return empty metadata', function(done) {
      var options = {
        path: '/notification_metadata?type=no_metadata_type',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var response = JSON.parse(body);
        response.should.eql({});
        done();
      }).on('error', done);
    });

    it('should return metadata', function(done) {
      var options = {
        path: '/notification_metadata?type=metadata_type',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var response = JSON.parse(body);
        response.should.eql({'key1': 'value1', 'key2': 'value2'});
        done();
      }).on('error', done);
    });

  });
  
  after(function() {
    tutil.end();
  });

});