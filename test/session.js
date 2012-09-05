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

// test/session.js:
// Tests session management.

var should = require('should');
var xml = require('libxmljs');
var atom = require('../src/util/atom');
var config = require('../src/util/config');
var tutil = require('./support/testutil');

// See xmpp_mockserver.js
var mockConfig = {
    users: {
        'alice': 'alice',
        'bob': 'bob'
    },
    stanzas: {
        '<iq type="get">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub">\
             <items node="/user/public@localhost/posts"/>\
           </pubsub>\
         </iq>':
        '<iq type="result">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub">\
             <items node="/user/alice@localhost/posts">\
               <item id="foo">\
                 <entry xmlns="http://www.w3.org/2005/Atom">\
                   <id>foo</id>\
                   <content>bar</content>\
                 </entry>\
               </item>\
             </items>\
           </pubsub>\
         </iq>',

         '<iq from="alice@localhost/http" type="get">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub">\
             <items node="/user/private@localhost/posts"/>\
           </pubsub>\
         </iq>':
        '<iq type="result">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub">\
             <items node="/user/alice@localhost/posts">\
               <item id="bar">\
                 <entry xmlns="http://www.w3.org/2005/Atom">\
                   <id>bar</id>\
                   <content>baz</content>\
                 </entry>\
               </item>\
             </items>\
           </pubsub>\
         </iq>'
    }
};

describe('Session ID', function() {

    before(function(done) {
        tutil.startHttpServer(function() {
            tutil.mockXmppServer(mockConfig, done);
        });
    });

    it('should be returned on authenicated requests', function(done) {
        var options = {
            path: '/public@localhost/content/posts',
            auth: 'alice@localhost:alice'
        };
        tutil.get(options, function(res, body) {
            res.statusCode.should.equal(200);
            should.exist(res.headers['x-session-id']);
            done();
        }).on('error', done);
    });

    it('should also be returned when username is unqualified', function(done) {
        var options = {
            path: '/public@localhost/content/posts',
            auth: 'alice:alice'
        };
        tutil.get(options, function(res, body) {
            res.statusCode.should.equal(200);
            should.exist(res.headers['x-session-id']);
            done();
        }).on('error', done);
    });

    it('should not be returned on anonymous requests', function(done) {
        var options = {
            path: '/public@localhost/content/posts',
        };
        tutil.get(options, function(res) {
            res.statusCode.should.equal(200);
            should.not.exist(res.headers['x-session-id']);
            done();
        }).on('error', done);
    });

    it('should allow second request without re-authenication', function(done) {
        var options = {
            path: '/private@localhost/content/posts',
            auth: 'alice@localhost/http:alice'
        };
        tutil.get(options, function(res) {
            delete options.auth;
            options.headers = {'x-session-id': res.headers['x-session-id']};
            tutil.get(options, function(res2) {
                res2.statusCode.should.equal(200);
                done();
            }).on('error', done);
        }).on('error', done);
    });

    it('should remain the same after the first request', function(done) {
        var options = {
            path: '/private@localhost/content/posts',
            auth: 'alice@localhost/http:alice'
        };
        tutil.get(options, function(res) {
            var sessionId = res.headers['x-session-id'];
            options.headers = {'x-session-id': sessionId};
            tutil.get(options, function(res2) {
                res2.headers['x-session-id'].should.equal(sessionId);
                done();
            }).on('error', done);;
        }).on('error', done);
    });

    it('should differ between users', function(done) {
        var aliceOptions = {
            path: '/public@localhost/content/posts',
            auth: 'alice@localhost:alice'
        };
        tutil.get(aliceOptions, function(res) {
            var bobOptions = {
                path: '/public@localhost/content/posts',
                auth: 'bob@localhost:bob'
            };
            tutil.get(bobOptions, function(res2) {
                var aliceSessionId = res.headers['x-session-id']
                var bobSessionId = res2.headers['x-session-id'];
                aliceSessionId.should.not.equal(bobSessionId);
                done();
            }).on('error', done);;
        }).on('error', done);
    });

   it('should expire', function(done) {
       this.timeout(0);
        var options = {
            path: '/private@localhost/content/posts',
            auth: 'alice@localhost/http:alice'
        };
        tutil.get(options, function(res) {
            setTimeout(function() {
                delete options.auth;
                options.headers = {
                    'x-session-id': res.headers['x-session-id']
                };
                tutil.get(options, function(res2) {
                    res2.statusCode.should.equal(401);
                    done();
                }).on('error', done);
            }, config.sessionExpirationTime * 1000 + 100);
        }).on('error', done);
    });

    it('should be renewed on each request', function(done) {
       this.timeout(0);
        var options = {
            path: '/private@localhost/content/posts',
            auth: 'alice@localhost/http:alice'
        };
        tutil.get(options, function(res) {
            var sessionId = res.headers['x-session-id'];
            delete options.auth;
            options.headers = {'x-session-id': sessionId};
            setTimeout(function() {
                tutil.get(options, function(res2) {
                    res2.statusCode.should.equal(200);
                    res2.headers['x-session-id'].should.equal(sessionId);
                    setTimeout(function() {
                        tutil.get(options, function(res3) {
                            res3.statusCode.should.equal(200);
                            res3.headers['x-session-id'].should.equal(sessionId);
                            done();
                        }).on('error', done);
                    }, config.sessionExpirationTime * 1000 * 0.75);
                }).on('error', done);
            }, config.sessionExpirationTime * 1000 * 0.75);
        }).on('error', done);
    });

    after(function() {
        tutil.end();
    });

});


