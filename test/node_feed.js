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

// test/node_feed.js:
// Tests node feed related requests.

var should = require('should');
var xml = require('libxmljs');
var atom = require('../lib/atom');
var tutil = require('./support/testutil');

// See xmpp_mockserver.js
var mockConfig = {
    users: {
        'alice': 'alice',
        'bob': 'bob'
    },
    stanzas: {
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
                   <content>one</content>\
                 </entry>\
               </item>\
               <item id="2">\
                 <entry xmlns="http://www.w3.org/2005/Atom">\
                   <id>2</id>\
                   <content>two</content>\
                 </entry>\
               </item>\
               <item id="3">\
                 <entry xmlns="http://www.w3.org/2005/Atom">\
                   <id>3</id>\
                   <content>three</content>\
                 </entry>\
               </item>\
             </items>\
           </pubsub>\
         </iq>',

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
                   <content>one</content>\
                 </entry>\
               </item>\
               <item id="2">\
                 <entry xmlns="http://www.w3.org/2005/Atom">\
                   <id>2</id>\
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
                   <content>two</content>\
                 </entry>\
               </item>\
               <item id="3">\
                 <entry xmlns="http://www.w3.org/2005/Atom">\
                   <id>3</id>\
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
                   <content>one</content>\
                 </entry>\
               </item>\
             </items>\
           </pubsub>\
         </iq>',
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
                path: '/channels/alice@localhost/posts',
                auth: 'alice@localhost/http:alice'
            };
            tutil.get(options, function(res, body) {
                res.statusCode.should.equal(200);
                var feed = xml.parseXmlString(body);

                feed.root().name().should.equal('feed');
                feed.root().namespace().href().should.equal(atom.ns);

                var entries = feed.find('/a:feed/a:entry', {a: atom.ns});
                var e1 = entries[0];
                atom.get(e1, 'atom:id').text().should.equal('1');
                atom.get(e1, 'atom:content').text().should.equal('one');
                should.exist(atom.get(e1, 'atom:title'));
                var e2 = entries[1];
                atom.get(e2, 'atom:id').text().should.equal('2');
                atom.get(e2, 'atom:content').text().should.equal('two');
                should.exist(atom.get(e2, 'atom:title'));
                var e3 = entries[2];
                atom.get(e3, 'atom:id').text().should.equal('3');
                atom.get(e3, 'atom:content').text().should.equal('three');
                should.exist(atom.get(e3, 'atom:title'));

                done();
            }).on('error', done);
        });

        it('should allow limiting the number of returned items', function(done) {
            var options = {
                path: '/channels/alice@localhost/posts?max=2',
                auth: 'alice@localhost/http:alice'
            };
            tutil.get(options, function(res, body) {
                res.statusCode.should.equal(200);
                var feed = xml.parseXmlString(body);
                var entries = feed.find('/a:feed/a:entry', {a: atom.ns});
                entries.length.should.equal(2);
                atom.get(entries[0], 'atom:id').text().should.equal('1');
                atom.get(entries[1], 'atom:id').text().should.equal('2');
                done();
            }).on('error', done);
        });

        it('should allow specifying the first returned item', function(done) {
            var options = {
                path: '/channels/alice@localhost/posts?after=1',
                auth: 'alice@localhost/http:alice'
            };
            tutil.get(options, function(res, body) {
                res.statusCode.should.equal(200);
                var feed = xml.parseXmlString(body);
                var entries = feed.find('/a:feed/a:entry', {a: atom.ns});
                entries.length.should.equal(2);
                atom.get(entries[0], 'atom:id').text().should.equal('2');
                atom.get(entries[1], 'atom:id').text().should.equal('3');
                done();
            }).on('error', done);
        });

        it('should be 401 if credentials are wrong', function(done) {
            var options = {
                path: '/channels/alice@localhost/posts',
                auth: 'alice@localhost:bob'
            };
            tutil.get(options, function(res, body) {
                res.statusCode.should.equal(401);
                done();
            }).on('error', done);
        });

        it('should be 403 if user doesn\'t have permissions', function(done) {
            var options = {
                path: '/channels/alice@localhost/posts',
                auth: 'bob@localhost/http:bob'
            };
            tutil.get(options, function(res, body) {
                res.statusCode.should.equal(403);
                done();
            }).on('error', done);
        });

        it('should allow anonymous access', function(done) {
            var options = {
                path: '/channels/public@localhost/posts',
            };
            tutil.get(options, function(res, body) {
                res.statusCode.should.equal(200);
                done();
            }).on('error', done);
        });

    });

    after(function() {
        tutil.end();
    });

});

