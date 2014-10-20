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

// test/replies.js:
// Tests requests on replies of given topics.

var should = require('should')
  , atom = require('../../src/util/atom')
  , ltx = require('ltx')
  , tutil = require('../support/testutil');

// See xmpp_mockserver.js
var mockConfig = {
  users: {
    'alice': 'alice',
    'bob': 'bob'
  },
  stanzas: {
    // Get single reply
    '<iq from="alice@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <replies xmlns="http://buddycloud.org/v1" \
           node="/user/alice@localhost/posts" item_id="foo" />\
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
     
    // Get some replies
    '<iq from="alice@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <replies xmlns="http://buddycloud.org/v1" \
           node="/user/alice@localhost/posts" item_id="foobar" />\
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
           <item id="bar">\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <id>bar</id>\
               <author>\
                 <name>alice@localhost</name>\
               </author>\
               <content>foo</content>\
             </entry>\
           </item>\
         </items>\
       </pubsub>\
     </iq>',

    // Get no reply
    '<iq from="alice@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <replies xmlns="http://buddycloud.org/v1" \
           node="/user/alice@localhost/posts" item_id="nofoo" />\
       </pubsub>\
     </iq>':
    '<iq type="result">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts" />\
       </pubsub>\
     </iq>',
     
    // Get node item replies without permission
    '<iq from="bob@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <replies xmlns="http://buddycloud.org/v1" \
           node="/user/alice@localhost/posts" item_id="foo" />\
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
         <replies xmlns="http://buddycloud.org/v1" \
           node="/user/alice@localhost/posts" item_id="bar" />\
       </pubsub>\
     </iq>':
    '<iq type="error">\
       <error type="cancel">\
         <item-not-found xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>'
  }
};

describe('Replies', function() {

  before(function(done) {
    tutil.startHttpServer(function() {
      tutil.mockXmppServer(mockConfig, done);
    });
  });

  describe('GET', function() {

    it('should be 401 if credentials are wrong', function(done) {
      var options = {
        path: '/alice@localhost/content/posts/foo/replyto',
        auth: 'alice@localhost/http:bob'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });
    
    it('should be 403 if user doesn\'t have permissions', function(done) {
      var options = {
        path: '/alice@localhost/content/posts/foo/replyto',
        auth: 'bob@localhost/http:bob'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(403);
        done();
      }).on('error', done);
    });

    it('should be 404 if item doesn\'t exist', function(done) {
      var options = {
        path: '/alice@localhost/content/posts/bar/replyto',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(404);
        done();
      }).on('error', done);
    });

    it('should allow retrieval of a single reply', function(done) {
      var options = {
        path: '/alice@localhost/content/posts/foo/replyto',
        auth: 'alice@localhost/http:alice',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);

        var response = JSON.parse(body);
        response.length.should.equal(1);
        response[0].id.should.equal('foo');
        response[0].content.should.equal('bar');

        done();
      }).on('error', done);
    });

    it('should allow retrieval of more than one reply', function(done) {
      var options = {
        path: '/alice@localhost/content/posts/foobar/replyto',
        auth: 'alice@localhost/http:alice',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);

        var response = JSON.parse(body);
        response.length.should.equal(2);
        response[0].id.should.equal('foo');
        response[0].content.should.equal('bar');
        response[1].id.should.equal('bar');
        response[1].content.should.equal('foo');
    
        done();
      }).on('error', done);
    });
    
    it('should allow retrieval of no replies', function(done) {
      var options = {
        path: '/alice@localhost/content/posts/nofoo/replyto',
        auth: 'alice@localhost/http:alice',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var response = JSON.parse(body);
        response.length.should.equal(0);
        done();
      }).on('error', done);
    });
    
  });

  after(function() {
    tutil.end();
  });

});
