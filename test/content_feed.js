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

// test/content_feed.js:
// Tests node feed related requests.

var should = require('should')
  , atom = require('../src/util/atom')
  , tutil = require('./support/testutil')
  , ltx = require('ltx')

// See xmpp_mockserver.js
var mockConfig = {
  users: {
    'alice': 'alice',
    'bob': 'bob'
  },
  stanzas: {
    // Get node items
    '<iq from="alice@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts"/>\
       </pubsub>\
     </iq>':
    '<iq type="result">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts">\
           <item id="1">\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <id>1</id>\
               <author>\
                 <name>alice@localhost</name>\
               </author>\
               <content>one</content>\
               <updated>2012-10-16</updated>\
             </entry>\
           </item>\
           <item id="2">\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <id>2</id>\
               <author>\
                 <name>alice@localhost</name>\
               </author>\
               <content>two</content>\
               <updated>2012-08-21</updated>\
             </entry>\
           </item>\
           <item id="3">\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <id>3</id>\
               <author>\
                 <name>ron@localhost</name>\
               </author>\
               <content>three</content>\
               <updated>2012-03-03</updated>\
             </entry>\
           </item>\
         </items>\
       </pubsub>\
     </iq>',

    // Get node items with RSM <max>
    '<iq from="alice@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts"/>\
         <set xmlns="http://jabber.org/protocol/rsm">\
           <max>2</max>\
         </set>\
       </pubsub>\
     </iq>':
    '<iq type="result">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts">\
           <item id="1">\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <id>1</id>\
               <author>\
                 <name>alice@localhost</name>\
               </author>\
               <content>one</content>\
             </entry>\
           </item>\
           <item id="2">\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <id>2</id>\
               <author>\
                 <name>alice@localhost</name>\
               </author>\
               <content>two</content>\
             </entry>\
           </item>\
         </items>\
         <set xmlns="http://jabber.org/protocol/rsm">\
           <first>1</first>\
           <last>2</last>\
           <count>3</count>\
         </set>\
       </pubsub>\
     </iq>',

    // Get node items with RSM <after>
    '<iq from="alice@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts"/>\
         <set xmlns="http://jabber.org/protocol/rsm">\
           <after>1</after>\
         </set>\
       </pubsub>\
     </iq>':
    '<iq type="result">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts">\
           <item id="2">\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <id>2</id>\
               <author>\
                 <name>alice@localhost</name>\
               </author>\
               <content>two</content>\
             </entry>\
           </item>\
           <item id="3">\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <id>3</id>\
               <author>\
                 <name>ron@localhost</name>\
               </author>\
               <content>three</content>\
             </entry>\
           </item>\
         </items>\
         <set xmlns="http://jabber.org/protocol/rsm">\
           <first>2</first>\
           <last>3</last>\
           <count>3</count>\
         </set>\
       </pubsub>\
     </iq>',

    // Get node items without permission
    '<iq from="bob@localhost/http" type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/alice@localhost/posts"/>\
       </pubsub>\
     </iq>':
    '<iq type="error">\
       <error type="cancel">\
         <not-allowed xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
         <closed-node xmlns="http://jabber.org/protocol/pubsub#errors"/>\
       </error>\
     </iq>',

    // Get public node items anonymously
    '<iq type="get">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/public@localhost/posts"/>\
       </pubsub>\
     </iq>':
    '<iq type="result">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <items node="/user/public@localhost/posts">\
           <item id="foo">\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <id>bar</id>\
               <author>\
                 <name>bob@localhost</name>\
               </author>\
               <content>one</content>\
             </entry>\
           </item>\
         </items>\
       </pubsub>\
     </iq>',

     // Post new item to node
    '<iq from="alice@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <publish node="/user/alice@localhost/posts">\
           <item>\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <content>TEST</content>\
             </entry>\
           </item>\
         </publish>\
       </pubsub>\
     </iq>':
    {
        '':
        '<iq type="result">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub">\
             <publish node="/user/alice@localhost/posts">\
               <item id="newid"/>\
             </publish>\
           </pubsub>\
         </iq>',
         '<iq from="alice@localhost/http" type="get">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub">\
             <items node="/user/alice@localhost/posts"/>\
           </pubsub>\
         </iq>':
        '<iq type="result">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub">\
             <items node="/user/alice@localhost/posts">\
               <item id="newid">\
                 <entry xmlns="http://www.w3.org/2005/Atom">\
                   <id>newid</id>\
                   <author>\
                     <name>alice@localhost</name>\
                   </author>\
                   <content>TEST</content>\
                   <updated>2012-10-17</updated>\
                 </entry>\
               </item>\
               <item id="1">\
                 <entry xmlns="http://www.w3.org/2005/Atom">\
                   <id>1</id>\
                   <author>\
                     <name>alice@localhost</name>\
                   </author>\
                   <content>one</content>\
                   <updated>2012-10-16</updated>\
                 </entry>\
               </item>\
               <item id="2">\
                 <entry xmlns="http://www.w3.org/2005/Atom">\
                   <id>2</id>\
                   <author>\
                     <name>alice@localhost</name>\
                   </author>\
                   <content>two</content>\
                   <updated>2012-08-21</updated>\
                 </entry>\
               </item>\
               <item id="3">\
                 <entry xmlns="http://www.w3.org/2005/Atom">\
                   <id>3</id>\
                   <author>\
                     <name>ron@localhost</name>\
                   </author>\
                   <content>three</content>\
                   <updated>2012-03-03</updated>\
                 </entry>\
               </item>\
             </items>\
           </pubsub>\
         </iq>'
    },

     // Post new item to node (JSON)
    '<iq from="alice@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <publish node="/user/alice@localhost/posts">\
           <item>\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <content>JSON TEST</content>\
             </entry>\
           </item>\
         </publish>\
       </pubsub>\
     </iq>':
    {
      '':
      '<iq type="result">\
         <pubsub xmlns="http://jabber.org/protocol/pubsub">\
           <publish node="/user/alice@localhost/posts">\
             <item id="newid-json"/>\
           </publish>\
         </pubsub>\
       </iq>',

      '<iq from="alice@localhost/http" type="get">\
         <pubsub xmlns="http://jabber.org/protocol/pubsub">\
           <items node="/user/alice@localhost/posts"/>\
         </pubsub>\
       </iq>':
      '<iq type="result">\
         <pubsub xmlns="http://jabber.org/protocol/pubsub">\
           <items node="/user/alice@localhost/posts">\
             <item id="newid-json">\
               <entry xmlns="http://www.w3.org/2005/Atom">\
                 <id>newid-json</id>\
                 <author>\
                   <name>alice@localhost</name>\
                 </author>\
                 <content>JSON TEST</content>\
                 <updated>2012-10-18</updated>\
               </entry>\
             </item>\
             <item id="1">\
               <entry xmlns="http://www.w3.org/2005/Atom">\
                 <id>1</id>\
                 <author>\
                   <name>alice@localhost</name>\
                 </author>\
                 <content>one</content>\
                 <updated>2012-10-16</updated>\
               </entry>\
             </item>\
             <item id="2">\
               <entry xmlns="http://www.w3.org/2005/Atom">\
                 <id>2</id>\
                 <author>\
                   <name>alice@localhost</name>\
                 </author>\
                 <content>two</content>\
                 <updated>2012-08-21</updated>\
               </entry>\
             </item>\
             <item id="3">\
               <entry xmlns="http://www.w3.org/2005/Atom">\
                 <id>3</id>\
                 <author>\
                   <name>ron@localhost</name>\
                 </author>\
                 <content>three</content>\
                 <updated>2012-03-03</updated>\
               </entry>\
             </item>\
           </items>\
         </pubsub>\
       </iq>'
    },

     // Post new item to node (JSON + Escaping)
    '<iq from="alice@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <publish node="/user/alice@localhost/posts">\
           <item>\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <content>ESCAPING &amp; TEST</content>\
             </entry>\
           </item>\
         </publish>\
       </pubsub>\
     </iq>':
    {
      '':
      '<iq type="result">\
         <pubsub xmlns="http://jabber.org/protocol/pubsub">\
           <publish node="/user/alice@localhost/posts">\
             <item id="newid-escaping"/>\
           </publish>\
         </pubsub>\
       </iq>',

      '<iq from="alice@localhost/http" type="get">\
         <pubsub xmlns="http://jabber.org/protocol/pubsub">\
           <items node="/user/alice@localhost/posts"/>\
         </pubsub>\
       </iq>':
      '<iq type="result">\
         <pubsub xmlns="http://jabber.org/protocol/pubsub">\
           <items node="/user/alice@localhost/posts">\
             <item id="newid-escaping">\
               <entry xmlns="http://www.w3.org/2005/Atom">\
                 <id>newid-json</id>\
                 <author>\
                   <name>alice@localhost</name>\
                 </author>\
                 <content>ESCAPING &amp; TEST</content>\
                 <updated>2012-10-18</updated>\
               </entry>\
             </item>\
             <item id="1">\
               <entry xmlns="http://www.w3.org/2005/Atom">\
                 <id>1</id>\
                 <author>\
                   <name>alice@localhost</name>\
                 </author>\
                 <content>one</content>\
                 <updated>2012-10-16</updated>\
               </entry>\
             </item>\
             <item id="2">\
               <entry xmlns="http://www.w3.org/2005/Atom">\
                 <id>2</id>\
                 <author>\
                   <name>alice@localhost</name>\
                 </author>\
                 <content>two</content>\
                 <updated>2012-08-21</updated>\
               </entry>\
             </item>\
             <item id="3">\
               <entry xmlns="http://www.w3.org/2005/Atom">\
                 <id>3</id>\
                 <author>\
                   <name>ron@localhost</name>\
                 </author>\
                 <content>three</content>\
                 <updated>2012-03-03</updated>\
               </entry>\
             </item>\
           </items>\
         </pubsub>\
       </iq>'
    },

     // Post new item anonymously (although not allowed)
    '<iq type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <publish node="/user/alice@localhost/posts">\
           <item>\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <content>ANONYMOUS TEST</content>\
             </entry>\
           </item>\
         </publish>\
       </pubsub>\
     </iq>':
    '<iq type="error">\
       <error type="cancel">\
         <not-allowed xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
         <closed-node xmlns="http://jabber.org/protocol/pubsub#errors"/>\
       </error>\
     </iq>',

     // Post new item without permission
    '<iq from="bob@localhost/http" type="set">\
       <pubsub xmlns="http://jabber.org/protocol/pubsub">\
         <publish node="/user/alice@localhost/posts">\
           <item>\
             <entry xmlns="http://www.w3.org/2005/Atom">\
               <content>ANOTHER TEST</content>\
             </entry>\
           </item>\
         </publish>\
       </pubsub>\
     </iq>':
    '<iq type="error">\
       <error type="cancel">\
         <not-allowed xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
         <closed-node xmlns="http://jabber.org/protocol/pubsub#errors"/>\
       </error>\
     </iq>'
  }
};

describe('Node Feed', function() {

  before(function(done) {
    tutil.startHttpServer(function() {
      tutil.mockXmppServer(mockConfig, done);
    });
  });

  describe('GET', function() {

    it('should return items as Atom feed', function(done) {
      var options = {
        path: '/alice@localhost/content/posts',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var feed = ltx.parse(body);

        var feedElem = feed.root();
        feedElem.is('feed').should.be.true;
        feedElem.attrs.xmlns.should.equal(atom.ns);
        feedElem.getChild('title').should.exist;
        feedElem.getChild('id').should.exist;
        feedElem.getChild('updated').should.exist;

        var entries = feedElem.getChildren('entry', atom.ns)
        var e1 = entries[0];
        e1.getChildText('id').should.equal('1');
        e1.getChild('author').getChildText('name')
            .should.equal('alice@localhost');
        e1.getChildText('content').should.equal('one');
        e1.getChild('title').should.exist

        var e2 = entries[1];
        e2.getChildText('id').should.equal('2');
        e2.getChild('author').getChildText('name')
            .should.equal('alice@localhost');
        e2.getChildText('content').should.equal('two');
        e2.getChild('title').should.exist

        var e3 = entries[2];
        e3.getChildText('id').should.equal('3');
        e3.getChild('author').getChildText('name')
            .should.equal('ron@localhost');
        e3.getChildText('content').should.equal('three');
        e3.getChild('title').should.exist
        done();
      }).on('error', done);
    });

    it('should allow retrieval in JSON format', function(done) {
      var options = {
        path: '/alice@localhost/content/posts',
        auth: 'alice@localhost/http:alice',
        headers: {'Accept': 'application/json'}
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);

        var feed = JSON.parse(body);
        feed[0].id.should.equal('1');
        feed[0].author.should.equal('alice@localhost');
        feed[0].content.should.equal('one')
        feed[1].id.should.equal('2');
        feed[1].author.should.equal('alice@localhost');
        feed[1].content.should.equal('two')
        feed[2].id.should.equal('3');
        feed[2].author.should.equal('ron@localhost');
        feed[2].content.should.equal('three')

        done();
      }).on('error', done);
    });

    it('should allow limiting the number of returned items', function(done) {
      var options = {
        path: '/alice@localhost/content/posts?max=2',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var feed = ltx.parse(body);
        var entries = feed.getChildren('entry', atom.ns)
        entries.length.should.equal(2);
        entries[0].getChildText('id').should.equal('1');
        entries[1].getChildText('id').should.equal('2');
        done();
      }).on('error', done);
    });

    it('should allow specifying the first returned item', function(done) {
      var options = {
        path: '/alice@localhost/content/posts?after=1',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var feed = ltx.parse(body);
        feed.is('feed').should.be.true
        var entries = feed.getChildren('entry', atom.ns);
        entries.length.should.equal(2);
        entries[0].getChildText('id').should.equal('2');
        entries[1].getChildText('id').should.equal('3');
        done();
      }).on('error', done);
    });

    it('should be 401 if credentials are wrong', function(done) {
      var options = {
        path: '/alice@localhost/content/posts',
        auth: 'alice@localhost:bob'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });

    it('should be 403 if user doesn\'t have permissions', function(done) {
      var options = {
        path: '/alice@localhost/content/posts',
        auth: 'bob@localhost/http:bob'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(403);
        done();
      }).on('error', done);
    });

    it('should allow anonymous access', function(done) {
      var options = {
        path: '/public@localhost/content/posts',
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        done();
      }).on('error', done);
    });

  });

  describe('POST', function() {

    it('should create a new node item', function(done) {
      var options = {
        path: '/alice@localhost/content/posts',
        auth: 'alice@localhost/http:alice',
        body: '<entry xmlns="http://www.w3.org/2005/Atom">\
                 <content>TEST</content>\
               </entry>'
      };
      tutil.post(options, function(res) {
        res.statusCode.should.equal(201);
        res.headers['location'].should.equal(
          '/alice@localhost/content/posts/newid');

        var options2 = {
          path: '/alice@localhost/content/posts',
          auth: 'alice@localhost/http:alice',
        };
        tutil.get(options2, function(res2, body2) {
          var feed = ltx.parse(body2);
          feed.is('feed').should.be.true;
          var entries = feed.getChildren('entry', atom.ns);
          entries.length.should.equal(4);

          var newest = entries[0];
          newest.getChildText('id').should.equal('newid');
          newest.getChild('author').getChildText('name')
              .should.equal('alice@localhost');
          newest.getChildText('content').should.equal('TEST');

          done();
        }).on('error', done);
      }).on('error', done);
    });

    it('should accept entries in JSON format', function(done) {
      var options = {
        path: '/alice@localhost/content/posts',
        auth: 'alice@localhost/http:alice',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          content: 'JSON TEST'
        })
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(201);
        res.headers['location'].should.equal(
          '/alice@localhost/content/posts/newid-json');

        body = JSON.parse(body);
        body.id.should.equal('newid-json');
        body.author.should.equal('alice@localhost');
        body.content.should.equal('JSON TEST');

        var options2 = {
          path: '/alice@localhost/content/posts',
          auth: 'alice@localhost/http:alice',
        };
        tutil.get(options2, function(res2, body2) {
          var feed = ltx.parse(body2);

          feed.is('feed').should.be.true;
          var newest = feed.getChild('entry', atom.ns);
          newest.getChildText('id').should.equal('newid-json');
          newest.getChild('author').getChildText('name')
              .should.equal('alice@localhost');
          newest.getChildText('content').should.equal('JSON TEST');

          done();
        }).on('error', done);
      }).on('error', done);
    });

    it('should escape "&" in JSON bodies (Issue #6)', function(done) {
      var options = {
        path: '/alice@localhost/content/posts',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({
          content: 'ESCAPING & TEST'
        })
      };
      tutil.post(options, function(res) {
        res.statusCode.should.equal(201);

        var options2 = {
          path: '/alice@localhost/content/posts',
          auth: 'alice@localhost/http:alice',
        };
        tutil.get(options2, function(res2, body2) {
          var feed = ltx.parse(body2);
          feed.is('feed').should.be.true
          var newest = feed.getChild('entry', atom.ns);
          newest.getChildText('content')
              .should.equal('ESCAPING & TEST');
          done();
        }).on('error', done);
      }).on('error', done);
    });

    it('should be 401 on anonymous posting if not allowed', function(done) {
      var options = {
        path: '/alice@localhost/content/posts',
        body: '<entry xmlns="http://www.w3.org/2005/Atom">\
                 <content>ANONYMOUS TEST</content>\
               </entry>'
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });

    it('should be 403 if user is not allowed to post', function(done) {
      var options = {
        path: '/alice@localhost/content/posts',
        auth: 'bob@localhost/http:bob',
        body: '<entry xmlns="http://www.w3.org/2005/Atom">\
                 <content>ANOTHER TEST</content>\
               </entry>'
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(403);
        done();
      }).on('error', done);
    });

  });

  after(function() {
    tutil.end();
  });

});

