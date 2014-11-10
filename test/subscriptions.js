/*
 * Copyright 2012 Denis Washington <denisw@online.de>
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

// test/subscriptions.js:
// Tests requests related to subscription lists.

var should = require('should');
var tutil = require('./support/testutil');

// See xmpp_mockserver.js
var mockConfig = {
  users: {
    'alice': 'alice',
    'bob': 'bob',
    'eve': 'eve'
  },
  stanzas: {
    // Get own subscriptions + affiliations
    '<iq from="alice@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <subscriptions/>\
       </pubsub>\
     </iq>':
    '<iq type="result">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <subscriptions>\
           <subscription node="/user/alice@localhost/posts" \
                        subscription="subscribed"/>\
           <subscription node="/user/public@localhost/posts" \
                        subscription="subscribed"/>\
         </subscriptions>\
       </pubsub>\
     </iq>',
    '<iq from="alice@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <affiliations/>\
       </pubsub>\
     </iq>':
    '<iq type="result">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
         <affiliations>\
           <affiliation node="/user/alice@localhost/posts" \
                        affiliation="owner"/>\
           <affiliation node="/user/public@localhost/posts" \
                        affiliation="subscriber"/>\
         </affiliations>\
       </pubsub>\
     </iq>',

    // Get node subscriptions + affiliations
    '<iq from="alice@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
         <affiliations node="/user/alice@localhost/posts"/>\
       </pubsub>\
     </iq>':
    '<iq type="result">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <affiliations node="/user/alice@localhost/posts">\
           <affiliation jid="alice@localhost" affiliation="owner"/>\
           <affiliation jid="bob@localhost" affiliation="subscriber"/>\
         </affiliations>\
       </pubsub>\
     </iq>',

    // Subscribe to a channel
    '<iq from="eve@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <subscribe node="/user/alice@localhost/posts" jid="eve@localhost"/>\
       </pubsub>\
     </iq>':
    {
      '':
      '<iq type="result">\
        <pubsub xmlns="http://jabber.org/protocol/pubsub">\
          <subscription node="/user/alice@localhost/posts" \
                        jid="eve@localhost" \
                        subid="foo" subscription="subscribed"/>\
        </pubsub>\
      </iq>',

      // Get node subscriptions after subscribing
      '<iq from="eve@localhost/http" type="get">\
         <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
           <affiliations node="/user/alice@localhost/posts"/>\
         </pubsub>\
       </iq>':
      '<iq type="result">\
         <pubsub xmlns="http://jabber.org/protocol/pubsub">\
           <affiliations node="/user/alice@localhost/posts">\
             <affiliation jid="alice@localhost" affiliation="owner"/>\
             <affiliation jid="bob@localhost" affiliation="subscriber"/>\
             <affiliation jid="eve@localhost" affiliation="subscriber"/>\
           </affiliations>\
         </pubsub>\
       </iq>'
    },

    // Unsubscribe from node
    '<iq from="eve@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <unsubscribe node="/user/alice@localhost/posts" jid="eve@localhost"/>\
       </pubsub>\
     </iq>':
    {
      '':
      '<iq type="result"/>',

      // Get node subscriptions after unsubscribing
      '<iq from="eve@localhost/http" type="get">\
         <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
           <affiliations node="/user/alice@localhost/posts"/>\
         </pubsub>\
       </iq>':
      '<iq type="result">\
         <pubsub xmlns="http://jabber.org/protocol/pubsub">\
           <affiliations node="/user/alice@localhost/posts">\
             <affiliation jid="alice@localhost" affiliation="owner"/>\
             <affiliation jid="bob@localhost" affiliation="subscriber"/>\
           </affiliations>\
         </pubsub>\
       </iq>'
    }
  }
};

describe('User Subscription List', function() {

  before(function(done) {
    tutil.startHttpServer(function() {
      tutil.mockXmppServer(mockConfig, done);
    });
  });

  describe('GET', function() {

    it('should return the nodes subscribed to', function(done) {
      var options = {
        path: '/subscribed',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var subscribers = JSON.parse(body);
        subscribers.should.eql({
          'alice@localhost/posts': 'owner',
          'public@localhost/posts': 'subscriber'
        });
        done();
      }).on('error', done);
    });

    it('should return 401 if not authenticated', function(done) {
      var options = {
        path: '/subscribed',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });

  });

  describe('POST', function() {

    it('should allow subscription', function(done) {
      var options = {
        path: '/subscribed',
        auth: 'eve@localhost/http:eve',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          'alice@localhost/posts': 'publisher'
        })
      };
      tutil.post(options, function(res) {
        res.statusCode.should.equal(200);

        var options2 = {
          path: '/alice@localhost/subscribers/posts',
          auth: 'eve@localhost/http:eve'
        };
        tutil.get(options2, function(res, body) {
          res.statusCode.should.equal(200);
          JSON.parse(body).should.eql({
            'alice@localhost': 'owner',
            'bob@localhost': 'subscriber',
            'eve@localhost': 'subscriber'
          });
          done();
        }).on('error', done);
      }).on('error', done);
    });

    it('should allow unsubscription', function(done) {
      var options = {
        path: '/subscribed',
        auth: 'eve@localhost/http:eve',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          'alice@localhost/posts': 'none'
        })
      };
      tutil.post(options, function(res) {
        res.statusCode.should.equal(200);

        var options2 = {
          path: '/alice@localhost/subscribers/posts',
          auth: 'eve@localhost/http:eve'
        };
        tutil.get(options2, function(res, body) {
          res.statusCode.should.equal(200);
          JSON.parse(body).should.eql({
            'alice@localhost': 'owner',
            'bob@localhost': 'subscriber',
          });
          done();
        }).on('error', done);
      }).on('error', done);
    });

  });

  after(function() {
    tutil.end();
  });

});

describe('Node Subscription List', function() {

  before(function(done) {
    tutil.startHttpServer(function() {
      tutil.mockXmppServer(mockConfig, done);
    });
  });

  describe('GET', function() {

    it('should return the node\'s subscribers', function(done) {
      var options = {
        path: '/alice@localhost/subscribers/posts',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var subscribers = JSON.parse(body);
        subscribers.should.eql({
          'alice@localhost': 'owner',
          'bob@localhost': 'subscriber'
        });
        done();
      }).on('error', done);
    });

  });

  after(function() {
    tutil.end();
  });

});


