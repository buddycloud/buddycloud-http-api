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
     
     // Settings - bad request
    '<iq from="alice@localhost/http" type="get">\
       <query xmlns="http://buddycloud.com/pusher/notification-settings">\
         <type />\
       </query>\
     </iq>':
    '<iq type="error">\
       <error type="modify">\
         <bad-request xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',
     
    // Settings - only type
    '<iq from="alice@localhost/http" type="get">\
       <query xmlns="http://buddycloud.com/pusher/notification-settings">\
         <type>settings_type</type>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/pusher/notification-settings">\
         <notificationSettings>\
           <target>target1</target>\
           <postAfterMe>true</postAfterMe>\
           <postMentionedMe>true</postMentionedMe>\
           <postOnMyChannel>true</postOnMyChannel>\
           <postOnSubscribedChannel>true</postOnSubscribedChannel>\
           <followMyChannel>true</followMyChannel>\
           <followRequest>true</followRequest>\
         </notificationSettings>\
         <notificationSettings>\
           <target>target2</target>\
           <postAfterMe>false</postAfterMe>\
           <postMentionedMe>false</postMentionedMe>\
           <postOnMyChannel>false</postOnMyChannel>\
           <postOnSubscribedChannel>false</postOnSubscribedChannel>\
           <followMyChannel>false</followMyChannel>\
           <followRequest>false</followRequest>\
         </notificationSettings>\
       </query>\
     </iq>',
     
    // Settings - type and target
    '<iq from="alice@localhost/http" type="get">\
       <query xmlns="http://buddycloud.com/pusher/notification-settings">\
         <type>settings_type</type>\
         <target>target1</target>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/pusher/notification-settings">\
         <notificationSettings>\
           <target>target1</target>\
           <postAfterMe>true</postAfterMe>\
           <postMentionedMe>true</postMentionedMe>\
           <postOnMyChannel>true</postOnMyChannel>\
           <postOnSubscribedChannel>true</postOnSubscribedChannel>\
           <followMyChannel>true</followMyChannel>\
           <followRequest>true</followRequest>\
         </notificationSettings>\
       </query>\
     </iq>',

    // Update settings - bad request
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="http://buddycloud.com/pusher/notification-settings">\
         <notificationSettings />\
       </query>\
     </iq>':
    '<iq type="error">\
       <error type="modify">\
         <bad-request xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',
     
    // Update settings - update all fields
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="http://buddycloud.com/pusher/notification-settings">\
         <notificationSettings>\
           <target>target1</target>\
           <postAfterMe>true</postAfterMe>\
           <postMentionedMe>true</postMentionedMe>\
           <postOnMyChannel>true</postOnMyChannel>\
           <postOnSubscribedChannel>true</postOnSubscribedChannel>\
           <followMyChannel>true</followMyChannel>\
           <followRequest>true</followRequest>\
         </notificationSettings>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/pusher/notification-settings">\
         <notificationSettings>\
           <target>target1</target>\
           <postAfterMe>true</postAfterMe>\
           <postMentionedMe>true</postMentionedMe>\
           <postOnMyChannel>true</postOnMyChannel>\
           <postOnSubscribedChannel>true</postOnSubscribedChannel>\
           <followMyChannel>true</followMyChannel>\
           <followRequest>true</followRequest>\
         </notificationSettings>\
       </query>\
     </iq>',
     
    // Update settings - update some fields
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="http://buddycloud.com/pusher/notification-settings">\
         <notificationSettings>\
           <target>target1</target>\
           <postAfterMe>true</postAfterMe>\
           <postMentionedMe>true</postMentionedMe>\
         </notificationSettings>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="http://buddycloud.com/pusher/notification-settings">\
         <notificationSettings>\
           <target>target1</target>\
           <postAfterMe>true</postAfterMe>\
           <postMentionedMe>true</postMentionedMe>\
           <postOnMyChannel>false</postOnMyChannel>\
           <postOnSubscribedChannel>false</postOnSubscribedChannel>\
           <followMyChannel>false</followMyChannel>\
           <followRequest>false</followRequest>\
         </notificationSettings>\
       </query>\
     </iq>',
    
    // Delete settings - type not found
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="jabber:iq:register">\
         <remove>\
           <type>type-not-found</type>\
         </remove>\
       </query>\
     </iq>':
    '<iq type="error">\
       <error type="cancel">\
         <item-not-found xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>\
       </error>\
     </iq>',
     
    // Delete settings - no type or target
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="jabber:iq:register">\
         <remove />\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="jabber:iq:register" />\
     </iq>',
     
    // Delete settings - only type, no target
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="jabber:iq:register">\
         <remove>\
           <type>type</type>\
         </remove>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="jabber:iq:register" />\
     </iq>',

    // Delete settings - type and target
    '<iq from="alice@localhost/http" type="set">\
       <query xmlns="jabber:iq:register">\
         <remove>\
           <type>type</type>\
           <target>target</target>\
         </remove>\
       </query>\
     </iq>':
    '<iq type="result">\
       <query xmlns="jabber:iq:register" />\
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

    it('should not allow unauthorized access for notification metadata', function(done) {
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

    it('should not allow unauthorized access for notification settings', function(done) {
      var options = {
        path: '/notification_settings'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });

    it('should not allow a request with no type for notification settings', function(done) {
      var options = {
        path: '/notification_settings',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(400);
        done();
      }).on('error', done);
    });
    
    it('should return all targets for a given type', function(done) {
      var options = {
        path: '/notification_settings?type=settings_type',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var response = JSON.parse(body);
        response.should.eql([{
          target : 'target1',
          postAfterMe : 'true',
          postMentionedMe : 'true',
          postOnMyChannel : 'true',
          postOnSubscribedChannel : 'true',
          followMyChannel : 'true',
          followRequest : 'true'}, {
          target : 'target2',
          postAfterMe : 'false',
          postMentionedMe : 'false',
          postOnMyChannel : 'false',
          postOnSubscribedChannel : 'false',
          followMyChannel : 'false',
          followRequest : 'false'}
        ]);
        done();
      }).on('error', done);
    });  
    
    it('should return the settings for a given type and target', function(done) {
      var options = {
        path: '/notification_settings?type=settings_type&target=target1',
        auth: 'alice@localhost/http:alice'
      };
      tutil.get(options, function(res, body) {
        res.statusCode.should.equal(200);
        var response = JSON.parse(body);
        response.should.eql([{
          target : 'target1',
          postAfterMe : 'true',
          postMentionedMe : 'true',
          postOnMyChannel : 'true',
          postOnSubscribedChannel : 'true',
          followMyChannel : 'true',
          followRequest : 'true'}
        ]);
        done();
      }).on('error', done);
    });
    
  });
  
  describe('POST', function() {

    it('should not allow unauthorized access for notification settings update', function(done) {
      var options = {
        path: '/notification_settings'
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });
  
    it('should not allow a request with no type or target for notification settings update', function(done) {
      var options = {
        path: '/notification_settings',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({})
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(400);
        done();
      }).on('error', done);
    });
    
    it('should update all fields', function(done) {
      var options = {
        path: '/notification_settings',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({
          target : 'target1',
          postAfterMe : 'true',
          postMentionedMe : 'true',
          postOnMyChannel : 'true',
          postOnSubscribedChannel : 'true',
          followMyChannel : 'true',
          followRequest : 'true'})
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(200);
        var response = JSON.parse(body);
        response.should.eql([{
          target : 'target1',
          postAfterMe : 'true',
          postMentionedMe : 'true',
          postOnMyChannel : 'true',
          postOnSubscribedChannel : 'true',
          followMyChannel : 'true',
          followRequest : 'true'}
        ]);
        done();
      }).on('error', done);
    });
    
    it('should update some fields', function(done) {
      var options = {
        path: '/notification_settings',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({
          target : 'target1',
          postAfterMe : 'true',
          postMentionedMe : 'true'})
      };
      tutil.post(options, function(res, body) {
        res.statusCode.should.equal(200);
        var response = JSON.parse(body);
        response.should.eql([{
          target : 'target1',
          postAfterMe : 'true',
          postMentionedMe : 'true',
          postOnMyChannel : 'false',
          postOnSubscribedChannel : 'false',
          followMyChannel : 'false',
          followRequest : 'false'}
        ]);
        done();
      }).on('error', done);
    });
    
  });
  
  describe('DELETE', function() {

    it('should not allow unauthorized access for notification settings deletion', function(done) {
      var options = {
        path: '/notification_settings'
      };
      tutil.delete(options, function(res, body) {
        res.statusCode.should.equal(401);
        done();
      }).on('error', done);
    });
    
    it('should not allow a request with an unexistent type', function(done) {
      var options = {
        path: '/notification_settings',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({'type': 'type-not-found'})
      };
      tutil.delete(options, function(res, body) {
        res.statusCode.should.equal(404);
        done();
      }).on('error', done);
    });
    
    it('should allow a request with no type and target for notification settings deletion', function(done) {
      var options = {
        path: '/notification_settings',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({})
      };
      tutil.delete(options, function(res, body) {
        res.statusCode.should.equal(200);
        done();
      }).on('error', done);
    });
    
    it('should allow a request with only type for notification settings deletion', function(done) {
      var options = {
        path: '/notification_settings',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({'type': 'type'})
      };
      tutil.delete(options, function(res, body) {
        res.statusCode.should.equal(200);
        done();
      }).on('error', done);
    });
    
    it('should allow a request with type and target for notification settings deletion', function(done) {
      var options = {
        path: '/notification_settings',
        auth: 'alice@localhost/http:alice',
        body: JSON.stringify({'type': 'type', 'target': 'target'})
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