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
    // Create node that already exists
    '<iq from="alice@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <create node="/user/alice@localhost/existing_princely_musings"/>\
       </pubsub>\
     </iq>':
    '<iq type="error">\
       <error type="cancel">\
         <conflict xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',

    // Requesting entity is prohibited from creating nodes
    '<iq from="alice@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <create node="/user/alice@localhost/forbidden_princely_musings"/>\
       </pubsub>\
     </iq>':
    '<iq type="error">\
       <error type="auth">\
         <forbidden xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',
     
    // Service requires registration
    '<iq from="alice@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <create node="/user/alice@localhost/unregistered_princely_musings"/>\
       </pubsub>\
     </iq>':
    '<iq type="error">\
       <error type="auth">\
         <registration-required xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',
     
    // Successful node creation
    '<iq from="alice@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <create node="/user/alice@localhost/princely_musings"/>\
       </pubsub>\
     </iq>':
    '<iq type="result"/>',
    
    // Successful node deletion
    '<iq from="alice@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
         <delete node="/user/alice@localhost/princely_musings"/>\
       </pubsub>\
     </iq>':
    '<iq type="result"/>',
    
    // Insufficient Privileges
    '<iq from="alice@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
         <delete node="/user/alice@localhost/forbidden_princely_musings"/>\
       </pubsub>\
     </iq>':
    '<iq type="error">\
       <error type="auth">\
         <forbidden xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',
     
     // Node not found
    '<iq from="alice@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
         <delete node="/user/alice@localhost/not_found_princely_musings"/>\
       </pubsub>\
     </iq>':
    '<iq type="error">\
       <error type="auth">\
         <item-not-found xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>'
  }
};

describe('Application node', function() {

  before(function(done) {
    tutil.startHttpServer(function() {
      tutil.mockXmppServer(mockConfig, done);
    });
  });

  describe('POST', function() {

    it('should not allow unauthorized access', function(done) {
      var options = {
        path: '/alice@localhost/princely_musings'
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });

    it('should not create a node that already exists', function(done) {
      var options = {
        path: '/alice@localhost/existing_princely_musings',
        auth: 'alice@localhost/http:alice'
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(500);
        done();
      }).on('error', done);
    });
    
    it('requesting entity is prohibited from creating nodes', function(done) {
      var options = {
        path: '/alice@localhost/forbidden_princely_musings',
        auth: 'alice@localhost/http:alice'
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(403);
        done();
      }).on('error', done);
    });

    it('requires registration', function(done) {
      var options = {
        path: '/alice@localhost/unregistered_princely_musings',
        auth: 'alice@localhost/http:alice'
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(403);
        done();
      }).on('error', done);
    });
    
    it('should create an app node', function(done) {
      var options = {
        path: '/alice@localhost/princely_musings',
        auth: 'alice@localhost/http:alice'
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(200);
        done();
      }).on('error', done);
    });

  });
  
  describe('DELETE', function() {

    it('should not allow unauthorized access', function(done) {
      var options = {
        path: '/alice@localhost/princely_musings'
      };
      tutil.delete(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });

    it('should not delete a node with insufficient privileges', function(done) {
      var options = {
        path: '/alice@localhost/forbidden_princely_musings',
        auth: 'alice@localhost/http:alice'
      };
      tutil.delete(options, function(res, body) {
        res.statusCode.should.equal(403);
        done();
      }).on('error', done);
    });
    
    it('should not delete an inexistent node', function(done) {
      var options = {
        path: '/alice@localhost/not_found_princely_musings',
        auth: 'alice@localhost/http:alice'
      };
      tutil.delete(options, function(res, body) {
        res.statusCode.should.equal(404);
        done();
      }).on('error', done);
    });
    
    it('should delete an app node', function(done) {
      var options = {
        path: '/alice@localhost/princely_musings',
        auth: 'alice@localhost/http:alice'
      };
      tutil.delete(options, function(res, body) {
        res.statusCode.should.equal(200);
        done();
      }).on('error', done);
    });

  });

  after(function() {
    tutil.end();
  });

});