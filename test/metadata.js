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

// test/metadata.js:
// Tests requests related to node metadata.

var should = require('should');
var tutil = require('./support/testutil');

// See xmpp_mockserver.js
var mockConfig = {
    users: {
        'alice': 'alice'
    },
    stanzas: {
        // Get node metadata
        '<iq from="alice@localhost/http" type="get">\
           <query xmlns="http://jabber.org/protocol/disco#info" \
                  node="/user/alice@localhost/posts"/>\
         </iq>':
        '<iq type="result">\
           <query xmlns="http://jabber.org/protocol/disco#info" \
                  node="/users/alice@localhost/posts">\
             <identity category="pubsub" type="leaf"/>\
             <identity category="pubsub" type="channel"/>\
             <x xmlns="jabber:x:data" type="result">\
               <field var="FORM_TYPE" type="hidden">\
                 <value>http://jabber.org/protocol/pubsub#meta-data</value>\
               </field>\
               <field var="pubsub#title" type="text-single">\
                 <value>Alice</value>\
               </field>\
               <field var="pubsub#description" type="text-single">\
                 <value>The posts of Alice</value>\
               </field>\
               <field var="pubsub#access_model" type="text-single">\
                 <value>whitelist</value>\
               </field>\
               <field var="pubsub#creation_date" type="text-single">\
                 <value>1989-08-21T12:00:00</value>\
               </field>\
               <field var="buddycloud#channel_type" type="text-single">\
                 <value>personal</value>\
               </field>\
               <field var="buddycloud#default_affiliation" type="text-single">\
                 <value>member</value>\
               </field>\
             </x>\
           </query>\
         </iq>',

        // Try to get metadata of non-existing node
        '<iq from="alice@localhost/http" type="get">\
           <query xmlns="http://jabber.org/protocol/disco#info" \
                  node="/user/ron@localhost/posts"/>\
         </iq>':
         '<iq type="error">\
           <error type="cancel">\
             <item-not-found xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
           </error>\
         </iq>',

        // Set node metadata
        '<iq type="set">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
             <configure node="/user/alice@localhost/posts">\
               <x xmlns="jabber:x:data" type="submit">\
                 <field var="FORM_TYPE" type="hidden">\
                   <value>http://jabber.org/protocol/pubsub#node_config</value>\
                 </field>\
                 <field var="pubsub#description" type="text-single">\
                   <value>The posts of Alice (now public!)</value>\
                 </field>\
                 <field var="pubsub#access_model" type="text-single">\
                   <value>open</value>\
                 </field>\
               </x>\
             </configure>\
           </pubsub>\
         </iq>':
         {
            '':
            '<iq type="result"/>',

            // Get node metadata after changes
            '<iq from="alice@localhost/http" type="get">\
               <query xmlns="http://jabber.org/protocol/disco#info" \
                      node="/user/alice@localhost/posts"/>\
             </iq>':
            '<iq type="result">\
               <query xmlns="http://jabber.org/protocol/disco#info" \
                      node="/users/alice@localhost/posts">\
                 <identity category="pubsub" type="leaf"/>\
                 <identity category="pubsub" type="channel"/>\
                 <x xmlns="jabber:x:data" type="result">\
                   <field var="FORM_TYPE" type="hidden">\
                     <value>http://jabber.org/protocol/pubsub#meta-data</value>\
                   </field>\
                   <field var="pubsub#title" type="text-single">\
                     <value>Alice</value>\
                   </field>\
                   <field var="pubsub#description" type="text-single">\
                     <value>The posts of Alice (now public!)</value>\
                   </field>\
                   <field var="pubsub#access_model" type="text-single">\
                     <value>open</value>\
                   </field>\
                   <field var="pubsub#creation_date" type="text-single">\
                     <value>1989-08-21T12:00:00</value>\
                   </field>\
                   <field var="buddycloud#channel_type" type="text-single">\
                     <value>personal</value>\
                   </field>\
                   <field var="buddycloud#default_affiliation" type="text-single">\
                     <value>member</value>\
                   </field>\
                 </x>\
               </query>\
             </iq>',
         },

        // Try to set metadata of non-existing node
        '<iq type="set">\
           <pubsub xmlns="http://jabber.org/protocol/pubsub#owner">\
             <configure node="/user/ron@localhost/posts">\
               <x xmlns="jabber:x:data" type="submit">\
                 <field var="FORM_TYPE" type="hidden">\
                   <value>http://jabber.org/protocol/pubsub#node_config</value>\
                 </field>\
                 <field var="pubsub#description" type="text-single">\
                   <value>Dunno</value>\
                 </field>\
               </x>\
             </configure>\
           </pubsub>\
         </iq>':
         '<iq type="error">\
           <error type="cancel">\
             <item-not-found xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
           </error>\
         </iq>',

    }
};

describe('Node Metadata', function() {

    before(function(done) {
        tutil.startHttpServer(function() {
            tutil.mockXmppServer(mockConfig, done);
        });
    });

    describe('GET', function() {

        it('should return the metadata as JSON object', function(done) {
            var options = {
                path: '/alice@localhost/metadata/posts',
                auth: 'alice@localhost/http:alice'
            };
            tutil.get(options, function(res, body) {
                res.statusCode.should.equal(200);
                var metadata = JSON.parse(body);
                metadata.should.eql({
                    'title': 'Alice',
                    'description': 'The posts of Alice',
                    'access_model': 'whitelist',
                    'creation_date': '1989-08-21T12:00:00',
                    'channel_type': 'personal',
                    'default_affiliation': 'member'
                });
                done();
            }).on('error', done);
        });

        it('should be 404 if the node does not exist', function(done) {
            var options = {
                path: '/ron@localhost/metadata/posts',
                auth: 'alice@localhost/http:alice'
            };
            tutil.get(options, function(res, body) {
                res.statusCode.should.equal(404);
                done();
            }).on('error', done);
        });

    });

    describe('POST', function() {

        it('should alter the node\'s metadata', function(done) {
            var options = {
                path: '/alice@localhost/metadata/posts',
                auth: 'alice@localhost/http:alice',
                body: JSON.stringify({
                    'description': 'The posts of Alice (now public!)',
                    'access_model': 'open'
                })
            };
            tutil.post(options, function(res, body) {
                res.statusCode.should.equal(200);

                delete options.body;
                tutil.get(options, function(res, body) {
                    res.statusCode.should.equal(200);
                    var metadata = JSON.parse(body);
                    metadata.should.eql({
                        'title': 'Alice',
                        'description': 'The posts of Alice (now public!)',
                        'access_model': 'open',
                        'creation_date': '1989-08-21T12:00:00',
                        'channel_type': 'personal',
                        'default_affiliation': 'member'
                    });
                    done();
                });
            }).on('error', done);
        });

        it('should be 404 if the node does not exist', function(done) {
            var options = {
                path: '/ron@localhost/metadata/posts',
                auth: 'alice@localhost/http:alice',
                body: JSON.stringify({'description': 'Dunno'})
            };
            tutil.post(options, function(res, body) {
                res.statusCode.should.equal(404);
                done();
            }).on('error', done);
        });

    });

    after(function() {
        tutil.end();
    });

});


