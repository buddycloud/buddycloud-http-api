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

var xml = require('libxmljs'); 
var atom = require('../lib/atom');
var tutil = require('./support/testutil');

// See xmpp_mockserver.js
var mockConfig = {
    users: {
        'alice': 'alice'
    },
    stanzas: {
        '<iq type="get">\
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
             </items>\
           </pubsub>\
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
                path: '/channels/alice@localhost/posts',
                auth: 'alice@localhost:alice'
            };
            tutil.get(options, function(res, body) {
                var feed = xml.parseXmlString(body);
                
                feed.root().name().should.equal('feed');
                feed.root().namespace().href().should.equal(atom.ns);
                
                var entries = feed.find('/a:feed/a:entry', {a: atom.ns});
                var e1 = entries[0];
                e1.get('a:id', {a: atom.ns}).text().should.equal('1');
                e1.get('a:content', {a: atom.ns}).text().should.equal('one');
                var e2 = entries[1];
                e2.get('a:id', {a: atom.ns}).text().should.equal('2');
                e2.get('a:content', {a: atom.ns}).text().should.equal('two');
                
                done();
            }).on('error', done);
        });

        it('should respond to wrong credentials with 401', function(done) {
            var options = {
                path: '/channels/alice@localhost/posts',
                auth: 'alice@localhost:bob'
            };
            tutil.get(options, function(res, body) {
                res.statusCode.should.equal(401);
                done();
            }).on('error', done);
        });
    
    });

    after(function() {
        tutil.end();
    });

});

