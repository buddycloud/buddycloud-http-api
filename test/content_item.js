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

// test/content_item.js:
// Tests requests on node items.

var should = require('should')
  , atom = require('../src/util/atom')
  , ltx = require('ltx')
  , tutil = require('./support/testutil');

// See xmpp_mockserver.js
var mockConfig = {
  users: {
    'alice': 'alice',
    'bob': 'bob'
  },
  stanzas: {
    // Get node item
    '<iq from="alice@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts">\
           <item id="foo"/>\
         </items>\
       </pubsub>\
     </iq>':
    '<iq type="result">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts">\
           <item id="foo">\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <id>foo</id>\
               <author>\
                 <name>alice@localhost</name>\
               </author>\
               <content>bar</content>\
             </entry>\
           </item>\
         </items>\
       </pubsub>\
     </iq>',

    // Get node item without permission
    '<iq from="bob@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts">\
           <item id="foo"/>\
         </items>\
       </pubsub>\
     </iq>':
    '<iq type="error">\
       <error type="cancel">\
         <not-allowed xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
         <closed-node xmlns="http://jabber.org/protocol/pubsub#errors"/>\
       </error>\
     </iq>',

    // Get node item that doesn't exist
    '<iq from="alice@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts">\
           <item id="bar"/>\
         </items>\
       </pubsub>\
     </iq>':
    '<iq type="result">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts"/>\
       </pubsub>\
     </iq>'
  }
};

describe('Node Item', function() {

  before(function(done) {
    tutil.startHttpServer(function() {
      tutil.mockXmppServer(mockConfig, done);
    });
  });

  describe('GET', function() {

    it('should return the item as Atom entry', function(done) {
      var options = {
        path: '/alice@localhost/content/posts/foo',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var entry = ltx.parse(body);

        entry.is('entry').should.be.true;
        entry.attrs.xmlns.should.equal(atom.ns);
        entry.getChildText('id').should.equal('foo');
        entry.getChild('author').getChildText('name')
            .should.equal('alice@localhost');
        entry.getChildText('content').should.equal('bar');
        entry.getChild('title').should.exist;

        done();
      }).on('error', done);
    });

    it('should allow retrieval in JSON format', function(done) {
      var options = {
        path: '/alice@localhost/content/posts/foo',
        auth: 'alice@localhost/http:alice',
        headers: {'Accept': 'application/json'}
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);

        var entry = JSON.parse(body);
        entry.id.should.equal('foo');
        entry.content.should.equal('bar');

        done();
      }).on('error', done);
    });

    it('should be 401 if credentials are wrong', function(done) {
      var options = {
        path: '/alice@localhost/content/posts/foo',
        auth: 'alice@localhost:bob'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });

    it('should be 403 if user doesn\'t have permissions', function(done) {
      var options = {
        path: '/alice@localhost/content/posts/foo',
        auth: 'bob@localhost/http:bob'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(403);
        done();
      }).on('error', done);
    });

    it('should be 404 if item doesn\'t exist', function(done) {
      var options = {
        path: '/alice@localhost/content/posts/bar',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(404);
        done();
      }).on('error', done);
    });

  });

  after(function() {
    tutil.end();
  });

});


